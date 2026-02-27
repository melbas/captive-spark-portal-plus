import crypto from 'crypto';

// ============================================================
// Service de chiffrement AES-256-GCM
// Pour les credentials hardware (mots de passe contrôleurs)
// ============================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY ?? '';
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY doit être une chaîne hex de 64 caractères (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Chiffrer une valeur sensible (mot de passe, clé API)
 * Format de sortie : iv:tag:ciphertext (base64)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Déchiffrer une valeur chiffrée
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = ciphertext.split(':');

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Format de ciphertext invalide');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(data) + decipher.final('utf8');
}
