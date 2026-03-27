import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { URL } from 'node:url';
import { AuthConfig, loadAuthConfig } from './auth.config';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private cfg: AuthConfig;

  constructor(private readonly reflector: Reflector) {
    this.cfg = loadAuthConfig();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'] as string | undefined;
    if (!header) throw new UnauthorizedException();
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      const jwk = createRemoteJWKSet(new URL(`${this.cfg.issuer}/.well-known/jwks.json`));
      const { payload } = await jwtVerify(token, jwk, {
        issuer: this.cfg.issuer,
        audience: this.cfg.audience,
      });
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
