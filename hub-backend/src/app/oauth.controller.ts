import { Body, Controller, Get, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { randomUUID } from 'node:crypto';
import { OAuthService } from './auth/oauth.service';
import { GoogleOAuthService } from './auth/google-oauth.service';
import { SupabaseService } from './supabase/supabase.service';
import { cookieOptions } from './auth/cookies';
import { Public } from './auth/public.decorator';

interface LoginDto {
  email: string;
  password: string;
  redirect_uri: string;
  client_id: string;
  code_challenge: string;
}

interface RegisterDto {
  email: string;
  password: string;
  role?: string;
}

interface ForgotPasswordDto {
  email: string;
}

interface ResetPasswordDto {
  token: string;
  password: string;
}

interface TokenDto {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
  client_id: string;
}

@Controller()
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly supabase: SupabaseService,
  ) {}

  @Public()
  @Post('/oauth/authorize')
  async authorize(@Body() dto: LoginDto) {
    const user = await this.oauth.validateUser(dto.email, dto.password);
    const codePayload = {
      userId: user.id,
      email: user.email,
      challenge: dto.code_challenge,
      redirectUri: dto.redirect_uri,
      clientId: dto.client_id,
    };
    const code = Buffer.from(JSON.stringify(codePayload)).toString('base64url');
    return { code, redirect_uri: dto.redirect_uri, state: randomUUID() };
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  @Public()
  @Get('/auth/google')
  googleRedirect(@Res() res: Response) {
    const verifier = this.googleOAuth.generateCodeVerifier();
    const challenge = this.googleOAuth.generateCodeChallenge(verifier);
    const authUrl = this.googleOAuth.getAuthorizationUrl(challenge);

    res.cookie('google_pkce', verifier, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 min
    });
    res.redirect(authUrl);
  }

  @Public()
  @Get('/auth/google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontendBase =
      process.env['FRONTEND_URL'] ?? 'http://localhost:4200';

    if (error || !code) {
      return res.redirect(`${frontendBase}/login?error=google_cancelled`);
    }

    const verifier = req.cookies?.['google_pkce'] as string | undefined;
    if (!verifier) {
      return res.redirect(`${frontendBase}/login?error=google_state_missing`);
    }

    res.clearCookie('google_pkce');

    try {
      const { email } = await this.googleOAuth.exchangeCode(code, verifier);

      let user = await this.supabase.findUserByEmail(email);
      if (!user) {
        user = await this.supabase.createGoogleUser(email);
      }

      const tokens = await this.oauth.issueTokens(
        { id: user.id, email: user.email, role: (user as any).role ?? 'customer' },
        { sub: user.id, email: user.email, role: (user as any).role ?? 'customer' },
      );

      this.setRefreshCookie(res, tokens.refresh_token);
      return res.redirect(frontendBase);
    } catch {
      return res.redirect(`${frontendBase}/login?error=google_failed`);
    }
  }

  @Public()
  @Post('/auth/register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const validRoles = ['customer', 'manager'];
    const role = validRoles.includes(dto.role ?? '') ? dto.role! : 'customer';
    const user = await this.oauth.registerUser(dto.email, dto.password, role);
    const tokens = await this.oauth.issueTokens(
      { id: user.id, email: user.email, role: user.role ?? role },
      { sub: user.id, email: user.email, role: user.role ?? role },
    );
    this.setRefreshCookie(res, tokens.refresh_token);
    return tokens;
  }

  @Public()
  @Post('/auth/forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.oauth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('/auth/reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.oauth.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @Public()
  @Get('/.well-known/jwks.json')
  async jwks() {
    return this.oauth.getJwks();
  }

  @Public()
  @Post('/oauth/token')
  async token(@Body() dto: TokenDto, @Res({ passthrough: true }) res: Response) {
    if (dto.grant_type === 'authorization_code') {
      if (!dto.code || !dto.code_verifier || !dto.redirect_uri) throw new UnauthorizedException('invalid_request');
      const tokens = await this.oauth.exchangeAuthCode({
        code: dto.code,
        codeVerifier: dto.code_verifier,
        redirectUri: dto.redirect_uri,
        clientId: dto.client_id,
      });
      this.setRefreshCookie(res, tokens.refresh_token);
      return tokens;
    }

    if (dto.grant_type === 'refresh_token') {
      const refresh = dto.refresh_token ?? this.extractRefreshFromCookie(res.req);
      if (!refresh) throw new UnauthorizedException('no_refresh');
      const tokens = await this.oauth.refresh(refresh);
      this.setRefreshCookie(res, tokens.refresh_token);
      return tokens;
    }

    throw new UnauthorizedException('unsupported_grant');
  }

  @Get('/auth/me')
  async me(@Req() req: Request) {
    const auth = (req.headers['authorization'] as string | undefined) ?? '';
    const [, token] = auth.split(' ');
    if (!token) throw new UnauthorizedException();
    const payload = await this.oauth.verifyAccess(token);
    return payload;
  }

  @Public()
  @Post('/auth/logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
    return { ok: true };
  }

  private setRefreshCookie(res: Response, refresh: string) {
    const opts = cookieOptions();
    res.cookie('refresh_token', refresh, opts);
  }

  private extractRefreshFromCookie(req?: Request) {
    if (!req || !req.headers.cookie) return null;
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map((c) => {
        const [k, v] = c.trim().split('=');
        return [k, decodeURIComponent(v ?? '')];
      }),
    );
    return cookies['refresh_token'];
  }
}
