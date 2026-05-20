// AES-256-GCM at-rest encryption for sensitive secrets that we must persist
// in the database but never want to read back in cleartext from a SQL dump,
// a Sentry breadcrumb, or a leaked Postgres logical-replication stream.
//
// Used by:  social_accounts.{access_token,refresh_token}
//
// Key derivation: SHA-256(SUPABASE_SERVICE_ROLE_KEY). That key already
// has the same trust boundary as "can read this column" and rotating it
// invalidates the ciphertext (good — forces re-OAuth).
//
// Ciphertext format:  v1:<iv-b64>:<tag-b64>:<ciphertext-b64>
// Anything that doesn't match that prefix is treated as legacy plaintext
// so we don't break existing rows on first deploy.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set — token encryption unusable");
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  if (!plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptToken(stored: string): string {
  if (!stored) return stored;
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    // Legacy plaintext row written before encryption was introduced.
    return stored;
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const enc = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
