/**
 * Replay / duplicate protection for signed webhooks (Standard Webhooks: every
 * delivery carries a unique `webhook-id`, and retries of the same delivery
 * reuse it).
 *
 * The signature check already refuses anything older than 5 minutes; inside
 * that window a captured request could be sent again. Each id is processed
 * once:
 *
 *   claim   SET dodo:wh:<id> "processing" NX EX 120   → "new"
 *           already "done"                            → "duplicate" (answer 200, do nothing)
 *           still "processing"                        → "inflight"  (answer 409; the sender retries later)
 *   settle  success → "done" for 7 days (longer than any provider retry schedule)
 *           failure → key deleted, so the provider's retry is processed
 *
 * A failed delivery is never marked done — Dodo must be able to retry it.
 * If the store is unreachable the webhook is processed anyway: the handlers
 * are idempotent on their own (credit grants carry a reference, plan
 * transitions are state-based), and refusing would lose real payments.
 */

export interface ReplayStore {
  /** SET key value NX EX ttl — true when the key was created. */
  setNx(key: string, value: string, ttlSec: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
}

export const PROCESSING_TTL_SEC = 120;
export const DONE_TTL_SEC = 7 * 24 * 3600;

const keyOf = (id: string) => `dodo:wh:${id.slice(0, 200)}`;

export type Claim = "new" | "duplicate" | "inflight" | "unchecked";

export async function claimWebhook(store: ReplayStore | null, id: string): Promise<Claim> {
  if (!store) return "unchecked";
  try {
    if (await store.setNx(keyOf(id), "processing", PROCESSING_TTL_SEC)) return "new";
    const v = await store.get(keyOf(id));
    if (v === "done") return "duplicate";
    if (v === null) {
      // Expired between the two calls: try once more.
      return (await store.setNx(keyOf(id), "processing", PROCESSING_TTL_SEC)) ? "new" : "inflight";
    }
    return "inflight";
  } catch (e) {
    console.warn("[webhook] replay store unavailable, processing without dedupe", (e as Error).message);
    return "unchecked";
  }
}

export async function settleWebhook(store: ReplayStore | null, id: string, success: boolean): Promise<void> {
  if (!store) return;
  try {
    if (success) await store.set(keyOf(id), "done", DONE_TTL_SEC);
    else await store.del(keyOf(id));
  } catch (e) {
    console.warn("[webhook] could not record webhook outcome", (e as Error).message);
  }
}

export class MemoryReplayStore implements ReplayStore {
  m = new Map<string, { v: string; exp: number }>();
  constructor(private now: () => number = Date.now) {}
  private live(key: string) {
    const e = this.m.get(key);
    if (e && e.exp <= this.now()) {
      this.m.delete(key);
      return undefined;
    }
    return e;
  }
  async setNx(key: string, value: string, ttlSec: number) {
    if (this.live(key)) return false;
    this.m.set(key, { v: value, exp: this.now() + ttlSec * 1000 });
    return true;
  }
  async get(key: string) {
    return this.live(key)?.v ?? null;
  }
  async set(key: string, value: string, ttlSec: number) {
    this.m.set(key, { v: value, exp: this.now() + ttlSec * 1000 });
  }
  async del(key: string) {
    this.m.delete(key);
  }
}
