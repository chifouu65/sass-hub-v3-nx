import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { randomUUID } from 'node:crypto';
import { OAuthService } from './auth/oauth.service';
import { cookieOptions } from './auth/cookies';
import { Public } from './auth/public.decorator';

interface LoginDto {
  email: string;
  password: string;
  redirect_uri: string;
  client_id: string;
  code_challenge: string;
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
  constructor(private readonly oauth: OAuthService) {}

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
