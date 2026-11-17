import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed unsubscribe tokens: "<clinic uuid>.<hmac>", no login needed.
 *
 * The HMAC (SHA-256, base64url, cut to 32 chars = 192 bits) covers a version
 * tag and the clinic id, so a token cannot be forged for another clinic or
 * reused for anything else. Tokens do not expire — an unsubscribe link in an
 * old email must keep working.
 *
 * Secret: DENTVIDEO_UNSUBSCRIBE_SECRET, else WORKER_INTERNAL_TOKEN (both
 * server-only). With neither set there is no token, and the caller sends no
 * reminder at all rather than one without a working unsubscribe link.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SIG_LEN = 32;

type Env = Record<string, string | undefined>;

export function unsubscribeSecret(env: Env = process.env): string | null {
  return env.DENTVIDEO_UNSUBSCRIBE_SECRET?.trim() || env.WORKER_INTERNAL_TOKEN?.trim() || null;
}

function sign(clinicId: string, secret: string): string {
  return createHmac("sha256", secret).update(`dv-unsub:v1:${clinicId}`).digest("base64url").slice(0, SIG_LEN);
}

export function unsubscribeToken(clinicId: string, secret: string): string {
  const id = clinicId.toLowerCase();
  if (!UUID.test(id)) throw new Error("unsubscribe token: clinic id must be a uuid");
  return `${id}.${sign(id, secret)}`;
}

/** The clinic id the token was made for, or null when it is malformed or not ours. */
export function verifyUnsubscribeToken(token: string | null | undefined, secret: string | null): string | null {
  if (!token || !secret) return null;
  const [id, sig, ...rest] = token.trim().split(".");
  if (rest.length || !id || !sig || !UUID.test(id) || sig.length !== SIG_LEN) return null;
  const want = Buffer.from(sign(id, secret));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want) ? id : null;
}
