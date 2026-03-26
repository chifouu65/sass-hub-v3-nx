import { CookieOptions } from 'express';

export const cookieOptions = (): CookieOptions => ({
  // Browsers require Secure=true when SameSite=None.
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge: undefined,
  domain: process.env.COOKIE_DOMAIN,
});
