import type { SupabaseClient } from "@supabase/supabase-js";
import { DV_FOUNDING, foundingState, type DvSubRecord, type FoundingState } from "./billing";

/**
 * The subscription ledger (dentvid_subscriptions) and payment index
 * (dentvid_payments), migration 0007. Service role only.
 *
 * Every call degrades gracefully: until 0007 is applied (or on any database
 * error) reads return `null` — "unknown" — and writes are skipped, so the
 * webhook, checkout and app keep their pre-0007 behaviour. Callers must treat
 * null as "no ledger", never as "no subscriptions".
 */

type PgError = { code?: string; message?: string } | null | undefined;

const missing = (e: PgError) =>
  !!e &&
  (e.code === "42P01" || e.code === "42703" || e.code === "PGRST204" || e.code === "PGRST205" || /relation .* does not exist|Could not find the .* (table|column)/i.test(e.message ?? ""));

const warned = new Set<string>();
function warnOnce(what: string, e: PgError | Error) {
  const key = `${what}:${missing(e as PgError) ? "missing" : "error"}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    missing(e as PgError)
      ? `[dentvideo] ${what}: table missing — apply supabase/liman/0007_dentvid_profile_guard.sql`
      : `[dentvideo] ${what}: ${(e as { message?: string })?.message ?? "error"}`,
  );
}

export interface SubscriptionStore {
  /** One subscription, null if unknown, undefined if the ledger is unavailable. */
  get(subscriptionId: string): Promise<DvSubRecord | null | undefined>;
  /** A clinic's subscriptions, newest first; null if the ledger is unavailable. */
  forClinic(clinicId: string): Promise<DvSubRecord[] | null>;
  /** Insert or update one row; false when it could not be written. */
  put(row: DvSubRecord & Record<string, unknown>): Promise<boolean>;
  recordPayment(paymentId: string, clinicId: string, subscriptionId: string | null): Promise<void>;
  /** The clinic a Dodo payment belongs to; null if unknown or the table is missing. */
  paymentClinic(paymentId: string): Promise<{ clinic_id: string; dodo_subscription_id: string | null } | null>;
  /** Distinct clinics that used the founding offer; null if the ledger is unavailable. */
  foundingClinics(): Promise<number | null>;
}

const COLS = "dodo_subscription_id, clinic_id, status, product, tier, interval, discount_id, founding, period_end, last_event_at, last_event_type, updated_at";

export function supabaseSubscriptionStore(db: SupabaseClient): SubscriptionStore {
  return {
    async get(id) {
      try {
        const { data, error } = await db.from("dentvid_subscriptions").select(COLS).eq("dodo_subscription_id", id).maybeSingle();
        if (error) {
          warnOnce("dentvid_subscriptions", error);
          return undefined;
        }
        return (data as DvSubRecord | null) ?? null;
      } catch (e) {
        warnOnce("dentvid_subscriptions", e as Error);
        return undefined;
      }
    },
    async forClinic(clinicId) {
      try {
        const { data, error } = await db.from("dentvid_subscriptions").select(COLS).eq("clinic_id", clinicId).order("updated_at", { ascending: false }).limit(20);
        if (error) {
          warnOnce("dentvid_subscriptions", error);
          return null;
        }
        return (data ?? []) as DvSubRecord[];
      } catch (e) {
        warnOnce("dentvid_subscriptions", e as Error);
        return null;
      }
    },
    async put(row) {
      try {
        const { error } = await db.from("dentvid_subscriptions").upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "dodo_subscription_id" });
        if (error) {
          warnOnce("dentvid_subscriptions", error);
          return false;
        }
        return true;
      } catch (e) {
        warnOnce("dentvid_subscriptions", e as Error);
        return false;
      }
    },
    async recordPayment(paymentId, clinicId, subscriptionId) {
      try {
        const { error } = await db
          .from("dentvid_payments")
          .upsert({ dodo_payment_id: paymentId, clinic_id: clinicId, dodo_subscription_id: subscriptionId }, { onConflict: "dodo_payment_id" });
        if (error) warnOnce("dentvid_payments", error);
      } catch (e) {
        warnOnce("dentvid_payments", e as Error);
      }
    },
    async paymentClinic(paymentId) {
      try {
        const { data, error } = await db.from("dentvid_payments").select("clinic_id, dodo_subscription_id").eq("dodo_payment_id", paymentId).maybeSingle();
        if (error) {
          warnOnce("dentvid_payments", error);
          return null;
        }
        return (data as { clinic_id: string; dodo_subscription_id: string | null } | null) ?? null;
      } catch (e) {
        warnOnce("dentvid_payments", e as Error);
        return null;
      }
    },
    async foundingClinics() {
      try {
        const { data, error } = await db.from("dentvid_subscriptions").select("clinic_id").eq("founding", true).limit(DV_FOUNDING.clinics * 3);
        if (error) {
          warnOnce("dentvid_subscriptions", error);
          return null;
        }
        return new Set((data ?? []).map((r) => (r as { clinic_id: string }).clinic_id)).size;
      } catch (e) {
        warnOnce("dentvid_subscriptions", e as Error);
        return null;
      }
    },
  };
}

/** Active Practice clinics: the founding estimate when nothing better is recorded. Throws on error. */
async function activePracticeClinics(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("dentvid_clinics")
    .select("id", { count: "exact", head: true })
    .eq("plan", "active")
    .eq("plan_tier", DV_FOUNDING.tier);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Set when Dodo refused the founding code at checkout: its uses are gone, whatever we counted. */
const FOUNDING_CLOSED_KEY = "dv:founding:closed";

async function foundingClosedFlag(): Promise<boolean> {
  try {
    const { webOpsStore } = await import("./ops-server");
    return !!(await (await webOpsStore())?.get(FOUNDING_CLOSED_KEY));
  } catch {
    return false;
  }
}

/** Dodo refused the founding code: close the offer everywhere (30 days, or until DENTVIDEO_FOUNDING_OFFER says otherwise) and tell the owner. */
export async function markFoundingClosed(): Promise<void> {
  cache = null;
  try {
    const { webOpsStore, raiseOwnerAlert } = await import("./ops-server");
    await (await webOpsStore())?.set(FOUNDING_CLOSED_KEY, new Date().toISOString(), 30 * 86_400);
    const { alerts } = await import("./ops-alert");
    await raiseOwnerAlert(alerts.foundingFull({ used: DV_FOUNDING.clinics, clinics: DV_FOUNDING.clinics }));
  } catch {
    // best effort
  }
}

let cache: { at: number; state: FoundingState } | null = null;
const CACHE_MS = 60_000;

/** For tests. */
export function _resetFoundingCache() {
  cache = null;
}

/**
 * The founding offer as checkout and the app should present it: closed once
 * 100 seats are used (or by DENTVIDEO_FOUNDING_OFFER). Cached for a minute.
 * If the clinics cannot even be counted, the offer stays as the env says but
 * is marked unreliable (no "N left" is shown).
 */
export async function loadFoundingState(db: SupabaseClient, env: Record<string, string | undefined> = process.env, now = Date.now()): Promise<FoundingState> {
  if (cache && now - cache.at < CACHE_MS) return cache.state;
  if (await foundingClosedFlag()) {
    const state = { ...foundingState(null, DV_FOUNDING.clinics, env), reliable: false };
    cache = { at: now, state };
    return state;
  }
  let estimate: number;
  try {
    estimate = await activePracticeClinics(db);
  } catch (e) {
    console.warn("[dentvideo] founding seats: could not count clinics", (e as Error).message);
    return { ...foundingState(null, 0, env), reliable: false };
  }
  const recorded = await supabaseSubscriptionStore(db).foundingClinics();
  const state = foundingState(recorded, estimate, env);
  cache = { at: now, state };
  return state;
}
