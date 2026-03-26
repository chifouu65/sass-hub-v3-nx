export interface AuthConfig {
  issuer: string;
  audience: string;
  accessTtl: string; // e.g. "15m"
  refreshTtl: string; // e.g. "7d"
  privateKeyPath: string;
  publicKeyPath: string;
  redisUrl?: string;
  corsOrigins: string[];
}

export const loadAuthConfig = (): AuthConfig => {
  const required = (key: string, def?: string) => {
    const v = process.env[key] ?? def;
    if (!v) throw new Error(`Missing env ${key}`);
    return v;
  };

  return {
    issuer: required('AUTH_ISSUER', 'http://localhost:4301/api'),
    audience: required('AUTH_AUDIENCE', 'hub-audience'),
    accessTtl: required('AUTH_ACCESS_TTL', '15m'),
    refreshTtl: required('AUTH_REFRESH_TTL', '7d'),
    privateKeyPath: required('AUTH_PRIVATE_KEY_PATH', 'hub-backend/keys/private.pem'),
    publicKeyPath: required('AUTH_PUBLIC_KEY_PATH', 'hub-backend/keys/public.pem'),
    redisUrl: process.env.REDIS_URL,
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:4200,http://localhost:4300')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  };
};
