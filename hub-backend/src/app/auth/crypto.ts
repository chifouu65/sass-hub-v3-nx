import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

// ── Paramètres scrypt (OWASP recommended minimum) ──────────────────────────
const SCRYPT_N = 16384; // cost factor
const SCRYPT_R = 8;     // block size
const SCRYPT_P = 1;     // parallelization
const SCRYPT_KEYLEN = 32; // output length in bytes
const SALT_LEN = 16;

/**
 * Hache un mot de passe avec scrypt.
 * Format résultant : "scrypt:<salt_hex>:<hash_hex>"
 */
export function hashPasswordScrypt(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Vérifie un mot de passe contre un hash.
 * Supporte les deux formats :
 *   - "scrypt:<salt_hex>:<hash_hex>"  (nouveau format)
 *   - <64 char hex>                   (ancien SHA-256 — migration transparente)
 * Retourne `{ ok, legacy }` où `legacy` indique que l'ancien format était utilisé.
 */
export function verifyPassword(
  password: string,
  stored: string,
): { ok: boolean; legacy: boolean } {
  // Nouveau format scrypt
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return { ok: false, legacy: false };
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const derived = scryptSync(password, salt, expected.length, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
    const ok =
      derived.length === expected.length && timingSafeEqual(derived, expected);
    return { ok, legacy: false };
  }

  // Ancien format SHA-256 (64 char hex sans prefixe)
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const hash = createHash('sha256').update(password).digest('hex');
    return { ok: hash === stored, legacy: true };
  }

  return { ok: false, legacy: false };
}

export const sha256 = (input: string) => createHash('sha256').update(input).digest('hex');
export const sha256Base64Url = (input: string) => createHash('sha256').update(input).digest('base64url');

export function ensureRsaKeyPair(privatePath: string, publicPath: string) {
  // En production : lire les clés depuis les variables d'environnement si disponibles
  // Permet de persister les clés entre les redémarrages du conteneur (Railway, etc.)
  const envPriv = process.env['AUTH_PRIVATE_KEY'];
  const envPub = process.env['AUTH_PUBLIC_KEY'];
  if (envPriv && envPub) {
    // Les variables peuvent avoir des \n littéraux au lieu de vrais sauts de ligne
    const rawPriv = envPriv.replace(/\\n/g, '\n').trim();
    const rawPub = envPub.replace(/\\n/g, '\n').trim();

    // Si la clé n'a pas de header PEM (stockée en base64 brut), on ajoute les armures PEM
    const privPem = rawPriv.includes('-----BEGIN')
      ? rawPriv
      : `-----BEGIN PRIVATE KEY-----\n${rawPriv}\n-----END PRIVATE KEY-----`;
    const pubPem = rawPub.includes('-----BEGIN')
      ? rawPub
      : `-----BEGIN PUBLIC KEY-----\n${rawPub}\n-----END PUBLIC KEY-----`;

    return {
      privateKey: createPrivateKey(privPem),
      publicKey: createPublicKey(pubPem),
      privatePem: privPem,
      publicPem: pubPem,
    };
  }

  // Fallback : générer ou lire depuis le système de fichiers (dev local)
  if (!existsSync(privatePath) || !existsSync(publicPath)) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    mkdirSync(require('path').dirname(privatePath), { recursive: true });
    mkdirSync(require('path').dirname(publicPath), { recursive: true });
    writeFileSync(privatePath, privateKey, 'utf-8');
    writeFileSync(publicPath, publicKey, 'utf-8');
  }
  const privPem = readFileSync(privatePath, 'utf-8');
  const pubPem = readFileSync(publicPath, 'utf-8');
  return {
    privateKey: createPrivateKey(privPem),
    publicKey: createPublicKey(pubPem),
    privatePem: privPem,
    publicPem: pubPem,
  };
}
