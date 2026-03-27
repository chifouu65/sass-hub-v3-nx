import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

interface SupabaseTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  private readonly supabaseUrl =
    process.env['SUPABASE_URL'] ?? 'https://ovofzfaqarofafckxykg.supabase.co';

  private readonly anonKey =
    process.env['SUPABASE_ANON_KEY'] ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b2Z6ZmFxYXJvZmFmY2t4eWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjI2ODcsImV4cCI6MjA5MDA5ODY4N30.aG1_wkz7Hy4tqNWwv5ap9dGOyw6ccoq8pNpOrAfc-8E';

  readonly callbackUrl =
    process.env['GOOGLE_CALLBACK_URL'] ?? 'http://localhost:4200/api/auth/google/callback';

  // ── PKCE helpers ───────────────────────────────────────────────────────────

  generateCodeVerifier(): string {
    return randomBytes(48).toString('base64url');
  }

  generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  // ── Auth URL ───────────────────────────────────────────────────────────────

  getAuthorizationUrl(codeChallenge: string): string {
    const url = new URL(`${this.supabaseUrl}/auth/v1/authorize`);
    url.searchParams.set('provider', 'google');
    url.searchParams.set('redirect_to', this.callbackUrl);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 's256');
    return url.toString();
  }

  // ── Code exchange ──────────────────────────────────────────────────────────

  async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<{ email: string; supabaseId: string }> {
    const res = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.anonKey,
      },
      body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Supabase token exchange failed: ${text}`);
      throw new UnauthorizedException('google_token_exchange_failed');
    }

    const data = (await res.json()) as SupabaseTokenResponse;

    if (!data.user?.email) {
      throw new UnauthorizedException('google_no_email');
    }

    return { email: data.user.email, supabaseId: data.user.id };
  }
}
