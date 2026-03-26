import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, exportJWK, jwtVerify, SignJWT } from 'jose';
import { createPrivateKey, randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { sha256, ensureRsaKeyPair, sha256Base64Url } from './crypto';
import { AuthConfig, loadAuthConfig } from './auth.config';
import { InMemoryTokenStore } from './token-store-memory';
import { RefreshTokenRecord, TokenStore } from './token-store';
import { RedisTokenStore } from './token-store-redis';

export interface UserRecord {
  id: string;
  email: string;
  password: string;
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

@Injectable()
export class OAuthService {
  private store: TokenStore;
  private readonly kid = 'hub-backend-rs256-1';
  private readonly cfg: AuthConfig;
  private users: UserRecord[] = [
    {
      id: 'user-demo-1',
      email: 'demo@example.com',
      password: 'password123',
    },
  ];

  private readonly privPem: string;
  private readonly publicKey: ReturnType<typeof ensureRsaKeyPair>['publicKey'];
  constructor() {
    this.cfg = loadAuthConfig();
    const { privatePem, publicKey } = ensureRsaKeyPair(this.cfg.privateKeyPath, this.cfg.publicKeyPath);
    this.privPem = privatePem;
    this.publicKey = publicKey;
    this.store = this.cfg.redisUrl ? new RedisTokenStore(this.cfg.redisUrl) : new InMemoryTokenStore();
  }

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

  async validateUser(email: string, password: string): Promise<UserRecord> {
    const user = this.users.find((u) => u.email === email);
    if (!user || user.password !== password) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async exchangeAuthCode({ code, codeVerifier, redirectUri, clientId }: ValidateAuthCodeInput) {
    let decoded: string;
    try {
      decoded = Buffer.from(code, 'base64url').toString('utf-8');
    } catch {
      throw new UnauthorizedException('invalid_code_encoding');
    }

    let parsed: { userId: string; email: string; challenge: string; redirectUri: string; clientId: string };
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

    const user = this.users.find((u) => u.id === parsed.userId);
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }

    return this.issueTokens(user, { sub: user.id, email: user.email });
  }

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
    const user = this.users.find((u) => u.id === rec.userId);
    if (!user) throw new UnauthorizedException('user_not_found');

    // rotate
    const nextId = randomUUID();
    const nextToken = randomUUID();
    const nextHash = sha256(nextToken);
    const refreshExp = this.parseDurationSeconds(this.cfg.refreshTtl);
    const nextRec: RefreshTokenRecord = {
      id: nextId,
      userId: user.id,
      tokenHash: nextHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + refreshExp * 1000),
      rotatedFromId: rec.id,
      revokedAt: null,
      reuseDetected: false,
    };
    await this.store.rotate(rec, nextRec);
    const tokens = await this.issueTokens(user, { sub: user.id, email: user.email });
    tokens.refresh_token = `${nextId}:${nextToken}`;
    return tokens;
  }

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
      keys: [
        {
          ...jwk,
          use: 'sig',
          alg: 'RS256',
          kid: this.kid,
        },
      ],
    };
  }

  private parseDurationSeconds(text: string): number {
    // Supports simple formats like "15m", "7d", "3600"
    const num = Number(text);
    if (!Number.isNaN(num)) return num;
    const match = /^([0-9]+)([smhd])$/.exec(text);
    if (!match) throw new Error(`Invalid duration: ${text}`);
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        throw new Error(`Invalid duration unit: ${unit}`);
    }
  }
}
