import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingSource } from "./apple-billing";

/**
 * The Apple subscription ledger (dentvid_apple_subscriptions) and the clinic's
 * billing source (dentvid_clinics.billing_source / apple_original_transaction_id),
 * migration supabase/liman/0026_dentvid_apple_billing.sql. Service role only.
 *
 * Like subscriptions.ts (the Dodo ledger) every call degrades: until 0026 is
 * applied reads return `undefined` / null ("unknown") and writes are skipped,
 * so the Dodo webhook, checkout and app keep their behaviour. Callers treat
 * unknown as "no ledger", never as "no Apple subscription".
 */

export type AppleSubRecord = {
  original_transaction_id: string;
  clinic_id: string;
  app_user_id: string;
  /** active | cancelled (auto-renew off) | billing_issue | expired | refunded | duplicate | transferred | pause_scheduled | refund_reversed */
  status: string;
  product?: string | null;
  tier?: string | null;
  /** The next tier Apple applies at renewal (a downgrade), when one is waiting. */
  pending_tier?: string | null;
  environment?: string | null;
  period_end?: string | null;
  last_event_id?: string | null;
  last_event_at?: string | null;
  last_event_type?: string | null;
  updated_at?: string | null;
};

type PgError = { code?: string; message?: string } | null | undefined;

export const missingSchema = (e: PgError) =>
  !!e &&
  (e.code === "42P01" ||
    e.code === "42703" ||
    e.code === "PGRST204" ||
    e.code === "PGRST205" ||
    /relation .* does not exist|column .* does not exist|Could not find the .* (table|column)/i.test(e.message ?? ""));

const warned = new Set<string>();
function warnOnce(what: string, e: PgError | Error) {
  const key = `${what}:${missingSchema(e as PgError) ? "missing" : "error"}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    missingSchema(e as PgError)
      ? `[dentvideo] ${what}: not there — apply supabase/liman/0026_dentvid_apple_billing.sql`
      : `[dentvideo] ${what}: ${(e as { message?: string })?.message ?? "error"}`,
  );
}

export interface AppleSubscriptionStore {
  /** One subscription; null if unknown, undefined if the ledger is unavailable. */
  get(originalTransactionId: string): Promise<AppleSubRecord | null | undefined>;
  /** A clinic's Apple subscriptions, newest first; null if the ledger is unavailable. */
  forClinic(clinicId: string): Promise<AppleSubRecord[] | null>;
  /** Insert or update one row; false when it could not be written. */
  put(row: AppleSubRecord): Promise<boolean>;
}

const COLS = "original_transaction_id, clinic_id, app_user_id, status, product, tier, pending_tier, environment, period_end, last_event_id, last_event_at, last_event_type, updated_at";

export function supabaseAppleStore(db: SupabaseClient): AppleSubscriptionStore {
  return {
    async get(id) {
      try {
        const { data, error } = await db.from("dentvid_apple_subscriptions").select(COLS).eq("original_transaction_id", id).maybeSingle();
        if (error) {
          warnOnce("dentvid_apple_subscriptions", error);
          return undefined;
        }
        return (data as AppleSubRecord | null) ?? null;
      } catch (e) {
        warnOnce("dentvid_apple_subscriptions", e as Error);
        return undefined;
      }
    },
    async forClinic(clinicId) {
      try {
        const { data, error } = await db.from("dentvid_apple_subscriptions").select(COLS).eq("clinic_id", clinicId).order("updated_at", { ascending: false }).limit(20);
        if (error) {
          warnOnce("dentvid_apple_subscriptions", error);
          return null;
        }
        return (data ?? []) as AppleSubRecord[];
      } catch (e) {
        warnOnce("dentvid_apple_subscriptions", e as Error);
        return null;
      }
    },
    async put(row) {
      try {
        const { error } = await db.from("dentvid_apple_subscriptions").upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "original_transaction_id" });
        if (error) {
          warnOnce("dentvid_apple_subscriptions", error);
          return false;
        }
        return true;
      } catch (e) {
        warnOnce("dentvid_apple_subscriptions", e as Error);
        return false;
      }
    },
  };
}

export type ClinicSource = { source: BillingSource | null; appleSubscription: string | null };

/**
 * The clinic's billing source and current Apple subscription. Read on its own
 * (never added to another select), so a database without 0026 only loses this
 * read: null = unknown (columns missing or the read failed).
 */
export async function readClinicSource(db: SupabaseClient, clinicId: string): Promise<ClinicSource | null> {
  try {
    const { data, error } = await db.from("dentvid_clinics").select("billing_source, apple_original_transaction_id").eq("id", clinicId).maybeSingle();
    if (error) {
      warnOnce("dentvid_clinics.billing_source", error);
      return null;
    }
    const row = (data ?? null) as { billing_source?: string | null; apple_original_transaction_id?: string | null } | null;
    if (!row) return null;
    const source = row.billing_source === "apple" || row.billing_source === "dodo" ? row.billing_source : null;
    return { source, appleSubscription: row.apple_original_transaction_id ?? null };
  } catch (e) {
    warnOnce("dentvid_clinics.billing_source", e as Error);
    return null;
  }
}

/** Is this clinic's live plan paid through the App Store? (Unknown → false: the Dodo paths behave as before 0026.) */
export async function isAppleManaged(db: SupabaseClient, clinic: { id: string; plan: string }): Promise<boolean> {
  if (clinic.plan !== "active" && clinic.plan !== "paused") return false;
  return (await readClinicSource(db, clinic.id))?.source === "apple";
}

/** Record that a clinic's plan now comes from `source` (best effort before 0026). */
export async function setBillingSource(db: SupabaseClient, clinicId: string, source: BillingSource): Promise<boolean> {
  try {
    const { error } = await db.from("dentvid_clinics").update({ billing_source: source }).eq("id", clinicId);
    if (error) {
      warnOnce("dentvid_clinics.billing_source", error);
      return false;
    }
    return true;
  } catch (e) {
    warnOnce("dentvid_clinics.billing_source", e as Error);
    return false;
  }
}
