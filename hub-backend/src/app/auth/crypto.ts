import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

export const sha256 = (input: string) => createHash('sha256').update(input).digest('hex');
export const sha256Base64Url = (input: string) => createHash('sha256').update(input).digest('base64url');

export function ensureRsaKeyPair(privatePath: string, publicPath: string) {
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
