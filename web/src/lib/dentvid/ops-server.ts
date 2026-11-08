import type { SupabaseClient } from "@supabase/supabase-js";
import {
  alerts,
  cleanError,
  countSpike,
  deliverAlert,
  resendSender,
  thresholds,
  weekStateKey,
  type ClinicRef,
  type DeliverResult,
  type OpsStore,
  type OwnerAlert,
  type WeekDelay,
} from "./ops-alert";

/**
 * The web app's side of owner alerts (ops-alert.ts holds the shared rules,
 * byte-identical with the worker's copy): the Redis store on the limiter's
 * connection (REDIS_URL), the Resend transport, and the hooks routes call —
 * payment webhook, email sender, server errors, the library's delay note.
 *
 * Everything here is best effort and fast: a slow or missing Redis never
 * delays a request (commands time out in 500 ms) and never throws.
 */

let storeOverride: OpsStore | null | undefined;
let sendOverride: Parameters<typeof deliverAlert>[0]["send"] | undefined;

/** For tests: a memory store and a fake transport. */
export function _setOpsForTests(store: OpsStore | null | undefined, send?: Parameters<typeof deliverAlert>[0]["send"]) {
  storeOverride = store;
  sendOverride = send;
}

export async function webOpsStore(): Promise<OpsStore | null> {
  if (storeOverride !== undefined) return storeOverride;
  const { limiterRedis } = await import("../rate-limit-server");
  const r = limiterRedis();
  if (!r) return null;
  const ready = () => {
    if (r.status !== "ready") throw new Error(`redis ${r.status}`);
  };
  return {
    async setNx(key, ttlSec) {
      ready();
      return (await r.set(key, "1", "EX", ttlSec, "NX")) === "OK";
    },
    async incr(key, ttlSec) {
      ready();
      const res = await r.multi().incr(key).expire(key, ttlSec).exec();
      return Number(res?.[0]?.[1] ?? 0);
    },
    async push(key, value, ttlSec, max) {
      ready();
      await r.multi().rpush(key, value).ltrim(key, -max, -1).expire(key, ttlSec).exec();
    },
    async list(key) {
      ready();
      return r.lrange(key, 0, -1);
    },
    async get(key) {
      ready();
      return r.get(key);
    },
    async set(key, value, ttlSec) {
      ready();
      await r.set(key, value, "EX", ttlSec);
    },
    async del(key) {
      ready();
      await r.del(key);
    },
  };
}

const log = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) =>
  console[level === "info" ? "info" : level === "warn" ? "warn" : "error"](`[dentvideo ops] ${msg}`, extra ? JSON.stringify(extra) : "");

/** Raise an owner alert (one per incident key per day; see ops-alert.ts). Never throws. */
export async function raiseOwnerAlert(a: OwnerAlert): Promise<DeliverResult> {
  try {
    return await deliverAlert({ store: await webOpsStore(), send: sendOverride ?? resendSender(process.env), env: process.env, log }, a);
  } catch {
    return "failed";
  }
}

async function spike(metric: string, threshold: number, make: (count: number) => OwnerAlert): Promise<void> {
  try {
    const { count, tripped } = await countSpike(await webOpsStore(), metric, threshold);
    if (tripped) await raiseOwnerAlert(make(count));
  } catch {
    // best effort
  }
}

/** A clinic email went out (counted for the digest). */
export async function noteEmailSent(): Promise<void> {
  try {
    await countSpike(await webOpsStore(), "email_sent", Number.POSITIVE_INFINITY);
  } catch {
    // best effort
  }
}

/** A Resend send failed; past the hourly threshold the owner hears about it once. */
export function noteEmailFailure(err: unknown): Promise<void> {
  const t = thresholds(process.env).emailFailPerHour;
  return spike("email_fail", t, (count) => alerts.emailFailures({ count, threshold: t, lastError: cleanError(err) }));
}

/** A request ended in a server error (instrumentation onRequestError, webhook 5xx). */
export function noteServerError(route: string): Promise<void> {
  const t = thresholds(process.env).serverErrorPerHour;
  return spike("5xx", t, (count) => alerts.errorSpike({ kind: "5xx", count, threshold: t, sample: route.slice(0, 120) }));
}

/** A Dodo webhook call with a bad signature; a burst means a rotated secret or someone poking. */
export function noteWebhookSignatureFailure(): Promise<void> {
  const t = thresholds(process.env).webhookSigPerHour;
  return spike("webhook_sig", t, (count) => alerts.webhookSignatures({ count, threshold: t }));
}

/** Read by the worker's first-week watchdog next to the payment_succeeded event (either may be missing). */
export const PAID_LIST_KEY = "dv:ops:paid";
export async function markPaid(clinicId: string, at = new Date()): Promise<void> {
  try {
    await (await webOpsStore())?.push(PAID_LIST_KEY, JSON.stringify({ clinicId, paidAt: at.toISOString() }), 3 * 86_400, 500);
  } catch {
    // best effort
  }
}

/** What the library should say about this week's run (written by the worker). Null when all is normal. */
export async function readWeekDelay(clinicId: string, week: string): Promise<WeekDelay | null> {
  try {
    const v = await (await webOpsStore())?.get(weekStateKey(clinicId, week));
    return v === "retrying" || v === "delayed" ? v : null;
  } catch {
    return null;
  }
}

/** Name, country, tier and the account email, for an alert. Never throws: an id is enough. */
export async function clinicRefFor(db: SupabaseClient, clinicId: string): Promise<ClinicRef> {
  try {
    const { data } = await db.from("dentvid_clinics").select("id, owner_id, profile, plan_tier").eq("id", clinicId).maybeSingle();
    const row = data as { owner_id?: string; profile?: { name?: string; country?: string }; plan_tier?: string } | null;
    let email: string | null = null;
    if (row?.owner_id) {
      const auth = (db as unknown as { auth?: { admin?: { getUserById(id: string): Promise<{ data?: { user?: { email?: string } | null } }> } } }).auth;
      const u = await auth?.admin?.getUserById(row.owner_id).catch(() => null);
      email = u?.data?.user?.email ?? null;
    }
    return { id: clinicId, name: row?.profile?.name ?? null, country: row?.profile?.country ?? null, tier: row?.plan_tier ?? null, email };
  } catch {
    return { id: clinicId };
  }
}
