import type IORedis from "ioredis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { cleanError, countSpike, deliverAlert, resendSender, thresholds, weekStateKey, alerts, type ClinicRef, type DeliverResult, type MailSender, type OpsStore, type OwnerAlert, type WeekDelay } from "./ops-alert.js";

/**
 * The worker's side of owner alerts (ops-alert.ts holds the shared rules):
 * the Redis store, the configured transport, and the small helpers jobs use
 * — raise an alert, count a render failure, say in the library that a week
 * is delayed. index.ts calls configureOps with the worker's Redis; until
 * then (and in tests) alerts are only logged.
 */

export class RedisOpsStore implements OpsStore {
  constructor(private r: IORedis) {}
  private ready() {
    if (this.r.status !== "ready") throw new Error(`redis ${this.r.status}`);
  }
  async setNx(key: string, ttlSec: number) {
    this.ready();
    return (await this.r.set(key, "1", "EX", ttlSec, "NX")) === "OK";
  }
  async incr(key: string, ttlSec: number) {
    this.ready();
    const res = await this.r.multi().incr(key).expire(key, ttlSec).exec();
    return Number(res?.[0]?.[1] ?? 0);
  }
  async push(key: string, value: string, ttlSec: number, max: number) {
    this.ready();
    await this.r.multi().rpush(key, value).ltrim(key, -max, -1).expire(key, ttlSec).exec();
  }
  async list(key: string) {
    this.ready();
    return this.r.lrange(key, 0, -1);
  }
  async get(key: string) {
    this.ready();
    return this.r.get(key);
  }
  async set(key: string, value: string, ttlSec: number) {
    this.ready();
    await this.r.set(key, value, "EX", ttlSec);
  }
  async del(key: string) {
    this.ready();
    await this.r.del(key);
  }
}

type OpsDeps = { store: OpsStore | null; send: MailSender; env: Record<string, string | undefined>; now: () => Date };

let deps: OpsDeps = { store: null, send: async () => false, env: process.env, now: () => new Date() };

export function configureOps(d: Partial<OpsDeps>): void {
  deps = { store: null, send: resendSender(process.env), env: process.env, now: () => new Date(), ...d };
}

export function opsStore(): OpsStore | null {
  return deps.store;
}

const log = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => logger[level](extra ?? {}, `dentvid: ${msg}`);

export function ownerAlert(a: OwnerAlert): Promise<DeliverResult> {
  return deliverAlert({ store: deps.store, send: deps.send, env: deps.env, now: deps.now, log }, a);
}

/** One video failed to render; past the hourly threshold the owner hears about it once. */
export async function noteRenderFailure(err: unknown): Promise<void> {
  const t = thresholds(deps.env).renderFailPerHour;
  const { count, tripped } = await countSpike(deps.store, "render_fail", t, deps.now());
  if (tripped) await ownerAlert(alerts.errorSpike({ kind: "render", count, threshold: t, sample: cleanError(err) }));
}

/** What the clinic's library says about this week (read by the web app); null clears it. */
export async function setWeekDelay(clinicId: string, week: string, state: WeekDelay | null): Promise<void> {
  const s = deps.store;
  if (!s) return;
  try {
    if (state) await s.set(weekStateKey(clinicId, week), state, 8 * 86_400);
    else await s.del(weekStateKey(clinicId, week));
  } catch (e) {
    logger.warn({ clinicId, err: (e as Error).message }, "dentvid: week state not saved");
  }
}

/** Name, country, tier for an alert. Never throws: an id is enough. */
export async function clinicRef(db: SupabaseClient | null, clinicId: string): Promise<ClinicRef> {
  if (!db) return { id: clinicId };
  try {
    const { data } = await db.from("dentvid_clinics").select("id, profile, plan_tier").eq("id", clinicId).maybeSingle();
    const p = ((data as { profile?: { name?: string; country?: string } } | null)?.profile ?? {}) as { name?: string; country?: string };
    return { id: clinicId, name: p.name ?? null, country: p.country ?? null, tier: (data as { plan_tier?: string } | null)?.plan_tier ?? null };
  } catch {
    return { id: clinicId };
  }
}
