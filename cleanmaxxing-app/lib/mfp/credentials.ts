import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

// AES-256-GCM helpers for MyFitnessPal password storage.
//
// MFP_ENCRYPTION_KEY: 32 random bytes, base64-encoded. Generate with
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Then set in the deploy environment (Vercel dashboard) and locally
// in .env.local. Rotating the key is out of scope for slice 1 — the
// stored format does include the IV per message, so a key-swap pass
// would only need to decrypt-then-re-encrypt every row.
//
// Format on disk: base64("v1" || iv(12) || tag(16) || ciphertext).
// The "v1" prefix lets us migrate to a different algorithm later
// without making the column ambiguous.

const VERSION = Buffer.from('v1');
const IV_BYTES = 12;
const TAG_BYTES = 16;

function loadKey(): Buffer {
  const raw = process.env.MFP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'MFP_ENCRYPTION_KEY not set. Generate with `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"` and set in the environment.',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `MFP_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`,
    );
  }
  return key;
}

export function encryptPassword(plaintext: string): string {
  if (!plaintext) {
    throw new Error('encryptPassword called with empty plaintext');
  }
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([VERSION, iv, tag, ct]).toString('base64');
}

export function decryptPassword(blob: string): string {
  const buf = Buffer.from(blob, 'base64');
  if (buf.length < VERSION.length + IV_BYTES + TAG_BYTES + 1) {
    throw new Error('Encrypted blob is too short to be valid');
  }
  const versionField = buf.subarray(0, VERSION.length);
  if (!timingSafeEqual(versionField, VERSION)) {
    throw new Error('Unknown encrypted-blob version');
  }
  const iv = buf.subarray(VERSION.length, VERSION.length + IV_BYTES);
  const tag = buf.subarray(
    VERSION.length + IV_BYTES,
    VERSION.length + IV_BYTES + TAG_BYTES,
  );
  const ct = buf.subarray(VERSION.length + IV_BYTES + TAG_BYTES);

  const key = loadKey();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    'utf8',
  );
}

export function isMfpConfigured(): boolean {
  if (!process.env.MFP_ENCRYPTION_KEY) return false;
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}
