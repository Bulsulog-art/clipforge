import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Email ownership check for DentVideo accounts: a 6-digit code sent to the
 * address after sign-up, entered on the plan step before checkout.
 *
 * Liman creates accounts already "confirmed" (public sign-up is off there,
 * so /api/dentvideo/signup uses the admin API), which means Supabase's own
 * email_confirmed_at proves nothing. Ownership is recorded separately in the
 * user's app_metadata (server-only): `email_verified_at` plus `email_verified_for`, the address
 * it was proven for — change the address and the account is unverified again.
 * A successful password-reset link exchange proves ownership too.
 *
 * Only an HMAC of the code is stored, in Redis with a TTL (no migration):
 *   dv:verify:<userId> → { h, email, exp, sentAt, attempts }
 * It is bound to the user and the address, expires after 15 minutes, allows
 * five wrong tries and then has to be re-sent; a new code at most every 60 s.
 *
 * Pure apart from node:crypto: the store is passed in, the clock too.
 */

export const VERIFY_RULES = {
  digits: 6,
  ttlSec: 15 * 60,
  maxAttempts: 5,
  resendAfterSec: 60,
} as const;

/** Key/value store with expiry (Redis in production, a Map in tests and local dev). */
export interface VerifyKv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
}

export type CodeRecord = {
  /** HMAC-SHA256 of user, address and code. */
  h: string;
  email: string;
  /** Epoch ms after which the code no longer works. */
  exp: number;
  /** Epoch ms the code was sent (resend cooldown). */
  sentAt: number;
  /** Wrong tries so far. */
  attempts: number;
};

export const verifyKey = (userId: string) => `dv:verify:${userId}`;

/** Six digits, uniformly from a CSPRNG, leading zeros kept. */
export function generateCode(rand: (max: number) => number = randomInt): string {
  return String(rand(10 ** VERIFY_RULES.digits)).padStart(VERIFY_RULES.digits, "0");
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The stored form of a code: keyed by a server secret and bound to this user and address. */
export function hashCode(args: { userId: string; email: string; code: string; secret: string }): string {
  return createHmac("sha256", args.secret).update(`${args.userId}\n${normalizeEmail(args.email)}\n${args.code}`).digest("hex");
}

/** What the user typed, reduced to digits ("123 456", Arabic-Indic or full-width digits from a phone keyboard). */
export function cleanCode(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10))
    .replace(/\D/g, "");
}

function parse(raw: string | null): CodeRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as CodeRecord;
    return typeof r.h === "string" && typeof r.exp === "number" ? r : null;
  } catch {
    return null;
  }
}

/** A live code for this address is waiting: seconds until a new one may be sent (0 = now), else null. */
export async function pendingCode(kv: VerifyKv, args: { userId: string; email: string; now?: number }): Promise<{ resendInSec: number } | null> {
  const now = args.now ?? Date.now();
  const rec = parse(await kv.get(verifyKey(args.userId)));
  if (!rec || rec.exp <= now || rec.email !== normalizeEmail(args.email) || rec.attempts >= VERIFY_RULES.maxAttempts) return null;
  return { resendInSec: Math.max(0, Math.ceil((rec.sentAt + VERIFY_RULES.resendAfterSec * 1000 - now) / 1000)) };
}

export type IssueResult = { ok: true; code: string } | { ok: false; reason: "cooldown"; retryAfterSec: number } | { ok: false; reason: "pending" };

/**
 * Make and store a new code for this user and address. Refused within 60 s
 * of the last one. With `onlyIfNone`, a live code for the same address is
 * left alone (the plan step asks for one on load, for accounts that never
 * got a code).
 */
export async function issueCode(
  kv: VerifyKv,
  args: {
    userId: string;
    email: string;
    secret: string;
    now?: number;
    onlyIfNone?: boolean;
    /** Right after the address was corrected: the old code is void, send at once (the change route has its own limit). */
    ignoreCooldown?: boolean;
    rand?: (max: number) => number;
  },
): Promise<IssueResult> {
  const now = args.now ?? Date.now();
  const email = normalizeEmail(args.email);
  const prev = parse(await kv.get(verifyKey(args.userId)));
  if (prev && prev.exp > now) {
    if (args.onlyIfNone && prev.email === email) return { ok: false, reason: "pending" };
    const wait = Math.ceil((prev.sentAt + VERIFY_RULES.resendAfterSec * 1000 - now) / 1000);
    if (wait > 0 && !args.ignoreCooldown) return { ok: false, reason: "cooldown", retryAfterSec: wait };
  }
  const code = generateCode(args.rand);
  const rec: CodeRecord = { h: hashCode({ userId: args.userId, email, code, secret: args.secret }), email, exp: now + VERIFY_RULES.ttlSec * 1000, sentAt: now, attempts: 0 };
  await kv.set(verifyKey(args.userId), JSON.stringify(rec), VERIFY_RULES.ttlSec);
  return { ok: true, code };
}

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "none" | "expired" | "locked" | "malformed" };

/**
 * Compare a typed code with the stored one. A match deletes it (one use);
 * a miss counts, and the fifth miss deletes it, so a new one must be sent.
 * A code sent to an earlier address does not match after the address changed.
 */
export async function checkCode(kv: VerifyKv, args: { userId: string; email: string; code: string; secret: string; now?: number }): Promise<CheckResult> {
  const now = args.now ?? Date.now();
  const code = cleanCode(args.code);
  if (code.length !== VERIFY_RULES.digits) return { ok: false, reason: "malformed" };
  const key = verifyKey(args.userId);
  const rec = parse(await kv.get(key));
  if (!rec) return { ok: false, reason: "none" };
  if (rec.exp <= now) {
    await kv.del(key);
    return { ok: false, reason: "expired" };
  }
  if (rec.attempts >= VERIFY_RULES.maxAttempts) {
    await kv.del(key);
    return { ok: false, reason: "locked" };
  }
  const want = Buffer.from(rec.h, "hex");
  const got = Buffer.from(hashCode({ userId: args.userId, email: args.email, code, secret: args.secret }), "hex");
  if (rec.email === normalizeEmail(args.email) && want.length === got.length && timingSafeEqual(want, got)) {
    await kv.del(key);
    return { ok: true };
  }
  const attempts = rec.attempts + 1;
  if (attempts >= VERIFY_RULES.maxAttempts) {
    await kv.del(key);
    return { ok: false, reason: "locked" };
  }
  const ttl = Math.max(1, Math.ceil((rec.exp - now) / 1000));
  await kv.set(key, JSON.stringify({ ...rec, attempts }), ttl);
  return { ok: false, reason: "wrong", attemptsLeft: VERIFY_RULES.maxAttempts - attempts };
}

// ---------------------------------------------------------------------------
// The verified flag (auth app_metadata — server-only)
//
// It used to live in user_metadata, which the user can rewrite themselves
// (PUT /auth/v1/user), so anyone could mark their own address verified. Only
// app_metadata counts now; it is written with the service role (admin API).
// Legacy user_metadata flags are ignored.

export type VerifiableUser = { email?: string | null; app_metadata?: Record<string, unknown> | null } | null | undefined;

/** True once this account proved it receives mail at its current address. */
export function isEmailVerified(user: VerifiableUser): boolean {
  if (!user?.email) return false;
  const m = user.app_metadata ?? {};
  const at = m.email_verified_at;
  const forEmail = m.email_verified_for;
  return typeof at === "string" && at.length > 0 && typeof forEmail === "string" && normalizeEmail(forEmail) === normalizeEmail(user.email);
}

export type VerifyMethod = "code" | "reset";

/** The app_metadata keys to set once ownership is proven (GoTrue merges them into the rest). */
export function verifiedAppMetadata(email: string, method: VerifyMethod, now = new Date()) {
  return { email_verified_at: now.toISOString(), email_verified_for: normalizeEmail(email), email_verified_via: method };
}

let warnedFallback = false;

/**
 * The server secret the code HMAC is keyed with: DENTVIDEO_VERIFY_SECRET.
 * Production does not set it yet, so it falls back to the service-role key
 * (still secret, server-only) and says so once per process in the log; the
 * owner checklist (docs/SECURITY.md) asks for a dedicated value. Setting it
 * later only voids codes that are waiting (15-minute life).
 */
export function verifySecret(env: Record<string, string | undefined> = process.env, warn: (msg: string) => void = console.warn): string | null {
  const own = env.DENTVIDEO_VERIFY_SECRET?.trim();
  if (own) return own;
  const fallback = env.DENTVID_SERVICE_ROLE_KEY?.trim() || null;
  if (fallback && env.NODE_ENV === "production" && !warnedFallback) {
    warnedFallback = true;
    warn("[dentvideo verify] SECURITY: DENTVIDEO_VERIFY_SECRET is not set; email codes are keyed with the service-role key. Set a dedicated random secret (docs/SECURITY.md, owner checklist).");
  }
  return fallback;
}

/** An in-memory store: tests, and local dev without Redis (one process only). */
export class MemoryKv implements VerifyKv {
  private map = new Map<string, { v: string; exp: number }>();
  constructor(private now: () => number = Date.now) {}
  async get(key: string) {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.exp <= this.now()) {
      this.map.delete(key);
      return null;
    }
    return e.v;
  }
  async set(key: string, value: string, ttlSec: number) {
    if (this.map.size > 10_000) this.map.clear();
    this.map.set(key, { v: value, exp: this.now() + ttlSec * 1000 });
  }
  async del(key: string) {
    this.map.delete(key);
  }
}
