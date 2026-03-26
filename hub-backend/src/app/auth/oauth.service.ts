import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, exportJWK, jwtVerify, SignJWT } from 'jose';
import { createPrivateKey, randomUUID, createHash } from 'node:crypto';
import { URL } from 'node:url';
import { sha256, ensureRsaKeyPair, sha256Base64Url } from './crypto';
import { AuthConfig, loadAuthConfig } from './auth.config';
import { RefreshTokenRecord, TokenStore } from './token-store';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseTokenStore } from './token-store-supabase';

export interface UserRecord {
  id: string;
  email: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface ValidateAuthCodeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}

/** Hash SHA-256 d'un mot de passe — à remplacer par bcrypt en production */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

@Injectable()
export class OAuthService {
  private readonly store: TokenStore;
  private readonly kid = 'hub-backend-rs256-1';
  private readonly cfg: AuthConfig;
  private readonly privPem: string;
  private readonly publicKey: ReturnType<typeof ensureRsaKeyPair>['publicKey'];

  constructor(private readonly supabase: SupabaseService) {
    this.cfg = loadAuthConfig();
    const { privatePem, publicKey } = ensureRsaKeyPair(
      this.cfg.privateKeyPath,
      this.cfg.publicKeyPath,
    );
    this.privPem = privatePem;
    this.publicKey = publicKey;
    // Toujours utiliser Supabase comme store de tokens
    this.store = new SupabaseTokenStore(supabase);
  }

  // ── Token issuance ────────────────────────────────────────────────────────

  async issueTokens(user: UserRecord, payload: { sub: string; email: string }) {
    const now = Math.floor(Date.now() / 1000);
    const accessExp = this.parseDurationSeconds(this.cfg.accessTtl);
    const refreshExp = this.parseDurationSeconds(this.cfg.refreshTtl);

    const access = await new SignJWT({ ...payload, aud: this.cfg.audience })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: this.kid })
      .setIssuedAt()
      .setIssuer(this.cfg.issuer)
      .setExpirationTime(now + accessExp)
      .sign(createPrivateKey(this.privPem));

    const refreshId = randomUUID();
    const refreshToken = randomUUID();
    const refreshHash = sha256(refreshToken);
    const refreshRec: RefreshTokenRecord = {
      id: refreshId,
      userId: user.id,
      tokenHash: refreshHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + refreshExp * 1000),
      rotatedFromId: null,
      revokedAt: null,
      reuseDetected: false,
    };
    await this.store.save(refreshRec);

    return {
      access_token: access,
      refresh_token: `${refreshId}:${refreshToken}`,
      expires_in: accessExp,
      token_type: 'Bearer' as const,
    } satisfies OAuthTokens;
  }

  // ── User validation ───────────────────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<UserRecord> {
    const dbUser = await this.supabase.findUserByEmail(email);
    if (!dbUser) throw new UnauthorizedException('Invalid credentials');

    const hash = hashPassword(password);
    if (hash !== dbUser.password_hash) throw new UnauthorizedException('Invalid credentials');

    return { id: dbUser.id, email: dbUser.email };
  }

  // ── Auth code exchange (PKCE) ─────────────────────────────────────────────

  async exchangeAuthCode({ code, codeVerifier, redirectUri, clientId }: ValidateAuthCodeInput) {
    let decoded: string;
    try {
      decoded = Buffer.from(code, 'base64url').toString('utf-8');
    } catch {
      throw new UnauthorizedException('invalid_code_encoding');
    }

    let parsed: {
      userId: string;
      email: string;
      challenge: string;
      redirectUri: string;
      clientId: string;
    };
    try {
      parsed = JSON.parse(decoded);
    } catch {
      throw new UnauthorizedException('invalid_code_format');
    }

    if (parsed.redirectUri !== redirectUri || parsed.clientId !== clientId) {
      throw new UnauthorizedException('invalid_redirect_or_client');
    }

    const challenge = sha256Base64Url(codeVerifier);
    if (challenge !== parsed.challenge) {
      throw new UnauthorizedException('invalid_pkce');
    }

    const dbUser = await this.supabase.findUserById(parsed.userId);
    if (!dbUser) throw new UnauthorizedException('user_not_found');

    return this.issueTokens(
      { id: dbUser.id, email: dbUser.email },
      { sub: dbUser.id, email: dbUser.email },
    );
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    const [id, token] = refreshToken.split(':');
    if (!id || !token) throw new UnauthorizedException('invalid_refresh');

    const rec = await this.store.findById(id);
    if (!rec || rec.revokedAt) throw new UnauthorizedException('revoked');
    if (rec.expiresAt.getTime() < Date.now()) {
      await this.store.revoke(rec.id);
      throw new UnauthorizedException('expired');
    }

    const hash = sha256(token);
    const reuse = hash !== rec.tokenHash;
    if (reuse) {
      await this.store.revoke(rec.id, { reuse: true });
      throw new UnauthorizedException('reuse_detected');
    }

    const dbUser = await this.supabase.findUserById(rec.userId);
    if (!dbUser) throw new UnauthorizedException('user_not_found');

    const nextId = randomUUID();
    const nextToken = randomUUID();
    const nextHash = sha256(nextToken);
    const refreshExp = this.parseDurationSeconds(this.cfg.refreshTtl);
    const nextRec: RefreshTokenRecord = {
      id: nextId,
      userId: dbUser.id,
      tokenHash: nextHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + refreshExp * 1000),
      rotatedFromId: rec.id,
      revokedAt: null,
      reuseDetected: false,
    };
    await this.store.rotate(rec, nextRec);

    const tokens = await this.issueTokens(
      { id: dbUser.id, email: dbUser.email },
      { sub: dbUser.id, email: dbUser.email },
    );
    tokens.refresh_token = `${nextId}:${nextToken}`;
    return tokens;
  }

  // ── JWKS & verification ───────────────────────────────────────────────────

  async verifyAccess(accessToken: string) {
    const jwk = createRemoteJWKSet(new URL(`${this.cfg.issuer}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(accessToken, jwk, {
      issuer: this.cfg.issuer,
      audience: this.cfg.audience,
    });
    return payload;
  }

  async getJwks() {
    const jwk = await exportJWK(this.publicKey);
    return {
      keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: this.kid }],
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private parseDurationSeconds(text: string): number {
    const num = Number(text);
    if (!Number.isNaN(num)) return num;
    const match = /^([0-9]+)([smhd])$/.exec(text);
    if (!match) throw new Error(`Invalid duration: ${text}`);
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: throw new Error(`Invalid duration unit: ${unit}`);
    }
  }
}
