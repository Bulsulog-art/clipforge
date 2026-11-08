/**
 * Rate limiting: a sliding-window counter over any counter store (Redis in
 * production, an in-memory map in tests and in the middleware).
 *
 * Sliding window counter (the Cloudflare/Figma approximation): the window is
 * split into fixed buckets; the estimate is this bucket's count plus the
 * previous bucket's count weighted by how much of it still overlaps the
 * window. Two keys per (subject, rule), O(1) per request, and no burst of 2×
 * the limit at a bucket edge as a plain fixed window allows.
 *
 * Requests that are refused still count, so a client hammering a limited
 * route keeps itself limited instead of getting a fresh allowance each
 * window edge.
 *
 * This module is pure (no Redis, no Next imports) so it runs in the Edge
 * middleware, the Node routes and vitest alike.
 */

export type Rule = {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
};

export interface CounterStore {
  /** Atomically add 1 to `key` (creating it at 0) and make it expire after `ttlSec`. Returns the new value. */
  incr(key: string, ttlSec: number): Promise<number>;
  /** The current value of `key`, 0 when missing. */
  get(key: string): Promise<number>;
}

export type LimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

export async function slidingWindow(store: CounterStore, key: string, rule: Rule, nowMs = Date.now()): Promise<LimitResult> {
  const win = rule.windowSec * 1000;
  const bucket = Math.floor(nowMs / win);
  const into = (nowMs % win) / win; // 0..1 through the current bucket
  const [curr, prev] = await Promise.all([
    store.incr(`${key}:${bucket}`, rule.windowSec * 2),
    store.get(`${key}:${bucket - 1}`),
  ]);
  const estimate = prev * (1 - into) + curr;
  if (estimate <= rule.limit) {
    return { ok: true, remaining: Math.max(0, Math.floor(rule.limit - estimate)), retryAfterSec: 0 };
  }
  // When does the estimate fall back under the limit? If this bucket alone
  // is over, not before the next bucket; otherwise as the previous bucket's
  // weight decays.
  let waitMs: number;
  if (curr > rule.limit || prev === 0) waitMs = win - (nowMs % win);
  else waitMs = Math.min(win - (nowMs % win), ((estimate - rule.limit) / prev) * win);
  return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)) };
}

export type Check = { key: string; rule: Rule };

/**
 * Run several limits for one request (per IP, per account, global). All are
 * counted; the request passes only if every one passes. The longest wait wins.
 */
export async function checkAll(store: CounterStore, checks: Check[], nowMs = Date.now()): Promise<LimitResult> {
  const results = await Promise.all(checks.map((c) => slidingWindow(store, c.key, c.rule, nowMs)));
  const failed = results.filter((r) => !r.ok);
  if (!failed.length) return { ok: true, remaining: Math.min(...results.map((r) => r.remaining)), retryAfterSec: 0 };
  return { ok: false, remaining: 0, retryAfterSec: Math.max(...failed.map((r) => r.retryAfterSec)) };
}

/** An in-memory store: tests, and the single-process middleware limiter. Bounded so it cannot grow without end. */
export class MemoryStore implements CounterStore {
  private map = new Map<string, { n: number; exp: number }>();
  constructor(private maxKeys = 50_000, private now: () => number = Date.now) {}

  async incr(key: string, ttlSec: number): Promise<number> {
    return this.incrSync(key, ttlSec);
  }

  incrSync(key: string, ttlSec: number): number {
    const t = this.now();
    const e = this.map.get(key);
    const n = e && e.exp > t ? e.n + 1 : 1;
    this.map.set(key, { n, exp: t + ttlSec * 1000 });
    if (this.map.size > this.maxKeys) this.prune(t);
    return n;
  }

  async get(key: string): Promise<number> {
    return this.getSync(key);
  }

  getSync(key: string): number {
    const e = this.map.get(key);
    return e && e.exp > this.now() ? e.n : 0;
  }

  get size(): number {
    return this.map.size;
  }

  private prune(t: number) {
    for (const [k, v] of this.map) if (v.exp <= t) this.map.delete(k);
    // Still too big (a flood of distinct keys): drop the oldest insertions.
    if (this.map.size > this.maxKeys) {
      let drop = this.map.size - Math.floor(this.maxKeys * 0.9);
      for (const k of this.map.keys()) {
        if (drop-- <= 0) break;
        this.map.delete(k);
      }
    }
  }
}

/**
 * The client's IP as seen by our reverse proxy.
 *
 * - `cf-connecting-ip` only when TRUST_CF_CONNECTING_IP=1, i.e. once the
 *   origin accepts traffic from Cloudflare only (otherwise anyone can send
 *   the header and pick their own bucket).
 * - `x-real-ip`: set by Coolify's Traefik to the connecting address — a
 *   client cannot forge it through Traefik.
 * - else the LAST x-forwarded-for hop (the one our proxy appended; the first
 *   entries are whatever the client sent).
 */
export function clientIp(h: { get(name: string): string | null }, env: Record<string, string | undefined> = process.env): string {
  if (env.TRUST_CF_CONNECTING_IP === "1") {
    const cf = h.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return "unknown";
}

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

/**
 * Every per-route limit in one place (see docs/SECURITY.md). Generous for a
 * real clinic, tight for a script. Keys: rl:<name>:<ip|user|clinic|global>:<id>.
 */
export const LIMITS = {
  // Creating accounts: no captcha, so this is the main brake on bot sign-ups.
  signupIp: { limit: 5, windowSec: 10 * MIN },
  signupIpDay: { limit: 20, windowSec: DAY },
  signupGlobal: { limit: 200, windowSec: HOUR },
  // Opens a Dodo checkout session (an outbound API call each).
  checkoutUser: { limit: 10, windowSec: 10 * MIN },
  checkoutIp: { limit: 30, windowSec: HOUR },
  // Queues a recording job (transcription + render). The worker's spend guard has the hard caps.
  recordingUser: { limit: 6, windowSec: HOUR },
  recordingUserDay: { limit: 5, windowSec: DAY },
  // Background photos → a re-render with TTS.
  restyleUser: { limit: 6, windowSec: 10 * MIN },
  restyleUserDay: { limit: 10, windowSec: DAY },
  // "Make this week" button.
  weekUser: { limit: 10, windowSec: HOUR },
  // Approve / reject an item (cheap DB write).
  itemsUser: { limit: 120, windowSec: 10 * MIN },
  // Save the clinic profile (DB write + storage).
  clinicUser: { limit: 30, windowSec: 10 * MIN },
  // Self-serve account (DentVideo settings): billing portal / plan change call Dodo;
  // an export signs a URL for every stored file; deletion is rare by nature.
  billingUser: { limit: 10, windowSec: 10 * MIN },
  accountExportUser: { limit: 3, windowSec: HOUR },
  accountExportUserDay: { limit: 10, windowSec: DAY },
  accountDeleteUser: { limit: 5, windowSec: HOUR },
  // Worker → "your week is ready" email. Even a leaked token cannot mail-bomb.
  notifyClinic: { limit: 6, windowSec: HOUR },
  notifyGlobal: { limit: 300, windowSec: HOUR },
  // Payment provider; a handful of IPs, retries included.
  dodoWebhookIp: { limit: 600, windowSec: MIN },
  // /api/health?deep=1 makes outbound calls (Supabase, Redis, OpenAI).
  healthDeepIp: { limit: 10, windowSec: MIN },
} satisfies Record<string, Rule>;

/** The cheap global limit the middleware applies to every /api/* request, per IP. */
export const API_GLOBAL_PER_IP: Rule = { limit: 300, windowSec: MIN };
