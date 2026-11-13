import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// 13 nov 2026 — chifreman AES-256-GCM pou refresh token Apple (User.
// appleRefreshTokenEncrypted). APPLE_REFRESH_TOKEN_ENCRYPTION_KEY ka yon
// nenpòt string (sha256 dedwi yon kle 32-byte egzat, evite egzije yon
// fòma hex/base64 presi nan env la). Fòma estoke: "<iv-hex>:<tag-hex>:
// <ciphertext-hex>" — yon sèl chan tèks, fasil pou Prisma String?.
const ALGORITHM = 'aes-256-gcm';

function deriveKey(): Buffer {
  const secret = process.env.APPLE_REFRESH_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('APPLE_REFRESH_TOKEN_ENCRYPTION_KEY pa konfigire — pa ka chifre/dechifre refresh token Apple.');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptAppleRefreshToken(rawRefreshToken: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(rawRefreshToken, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptAppleRefreshToken(encrypted: string): string {
  const key = deriveKey();
  const [ivHex, tagHex, dataHex] = encrypted.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Fòma refresh token chifre envalid.');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}

export function hasAppleRefreshTokenEncryptionKey(): boolean {
  return !!process.env.APPLE_REFRESH_TOKEN_ENCRYPTION_KEY;
}
