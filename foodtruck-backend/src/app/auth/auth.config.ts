export interface AuthConfig {
  issuer: string;
  audience: string;
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
  };
};
