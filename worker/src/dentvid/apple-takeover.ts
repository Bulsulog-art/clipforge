import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { alerts, type ClinicRef, type OwnerAlert } from "./ops-alert.js";

/**
 * A web (Dodo) plan the worker just ended (plan-end.ts at its paid date, or the nightly reconcile when
 * Dodo says cancelled/expired): an App Store subscription that was bought for the clinic while its web plan
 * was live waits on the Apple ledger as `ignored_web_active` (web apple-webhook.ts). The customer is paying
 * Apple for it, so the clinic moves onto it at once — billing_source apple, the Apple subscription's tier and
 * paid-through date — instead of sitting unserved until Apple's next renewal event.
 *
 * Same rule as the web's adoptWaitingApple (billing-webhook.ts, when Dodo ends the plan): only a real
 * (non-sandbox) subscription with a tier and paid time still ahead. No week is queued and no welcome is
 * sent: the clinic was active a moment ago and simply carries on. Without migration 0026 (the ledger cannot
 * be read) nothing is switched and the owner is alerted.
 */

export type AppleLedgerRow = {
  original_transaction_id: string;
  status: string;
  tier: string | null;
  environment: string | null;
  period_end: string | null;
};

export interface AppleTakeoverDb {
  /** The clinic's App Store ledger rows; null when the ledger cannot be read (0026 not applied). */
  appleRows(clinicId: string): Promise<AppleLedgerRow[] | null>;
  /** cancelled → active on this Apple subscription, only while the clinic is still cancelled; true when it moved. */
  moveToApple(clinicId: string, row: AppleLedgerRow & { period_end: string }, now: Date): Promise<boolean>;
  /** Name, country, tier of a clinic for an alert. */
  clinic(clinicId: string): Promise<ClinicRef>;
}

export type TakeoverDeps = { db: AppleTakeoverDb; alert: (a: OwnerAlert) => Promise<unknown> };

/** The waiting subscription that may take over, or null (same rule as the web's adoptWaitingApple). */
export function pickWaitingApple(rows: AppleLedgerRow[], now: Date): (AppleLedgerRow & { period_end: string }) | null {
  const r = rows.find(
    (x) =>
      x.status === "ignored_web_active" &&
      x.environment !== "SANDBOX" &&
      !!x.tier &&
      !!x.period_end &&
      Date.parse(x.period_end) > now.getTime(),
  );
  return r ? (r as AppleLedgerRow & { period_end: string }) : null;
}

/**
 * Call right after the worker set a web plan to cancelled. Returns the Apple subscription the clinic now
 * runs on, or null. Never throws (the plan end itself has already happened).
 */
export async function takeOverWithWaitingApple(deps: TakeoverDeps, clinicId: string, event: string, now = new Date()): Promise<string | null> {
  const ref = () => deps.db.clinic(clinicId).catch((): ClinicRef => ({ id: clinicId }));
  try {
    const rows = await deps.db.appleRows(clinicId);
    if (rows === null) {
      await deps.alert(alerts.appStoreBilling({ kind: "takeover_unchecked", event, subscription: "ledger", clinic: await ref() })).catch(() => {});
      return null;
    }
    const w = pickWaitingApple(rows, now);
    if (!w) return null;
    if (!(await deps.db.moveToApple(clinicId, w, now))) return null;
    logger.info({ clinicId, subscription: w.original_transaction_id }, "dentvid: web plan ended — clinic moved to its waiting App Store subscription");
    await deps
      .alert(
        alerts.appStoreBilling({
          kind: "web_active",
          event,
          subscription: w.original_transaction_id,
          clinic: await ref(),
          detail: "web plan ended: the clinic now runs on the App Store subscription",
        }),
      )
      .catch(() => {});
    return w.original_transaction_id;
  } catch (e) {
    logger.error({ clinicId, err: (e as Error).message }, "dentvid: App Store takeover after a web plan end failed");
    await deps.alert(alerts.appStoreBilling({ kind: "takeover_unchecked", event, subscription: "ledger", clinic: await ref(), detail: (e as Error).message })).catch(() => {});
    return null;
  }
}

export function supabaseAppleTakeoverDb(db: SupabaseClient): AppleTakeoverDb {
  return {
    async appleRows(clinicId) {
      const { data, error } = await db
        .from("dentvid_apple_subscriptions")
        .select("original_transaction_id, status, tier, environment, period_end")
        .eq("clinic_id", clinicId)
        .limit(20);
      if (error) {
        logger.warn({ err: error.message }, "dentvid: App Store ledger not readable (0026?)");
        return null;
      }
      return (data ?? []) as AppleLedgerRow[];
    },
    async moveToApple(clinicId, row, now) {
      const move = (patch: Record<string, unknown>) =>
        db.from("dentvid_clinics").update(patch).eq("id", clinicId).eq("plan", "cancelled").select("id");
      const base = {
        plan: "active",
        plan_tier: row.tier,
        plan_renews_at: row.period_end,
        dodo_subscription_id: null,
        billing_source: "apple",
        apple_original_transaction_id: row.original_transaction_id,
        updated_at: now.toISOString(),
      };
      // The library's retention clock (0025) counts from plan_ended_at: the plan did not end after all.
      let { data, error } = await move({ ...base, plan_ended_at: null });
      if (error && /plan_ended_at/.test(error.message)) ({ data, error } = await move(base));
      if (error) throw new Error(`apple takeover: ${error.message}`);
      if ((data ?? []).length === 0) return false;
      const led = await db
        .from("dentvid_apple_subscriptions")
        .update({ status: "active", updated_at: now.toISOString() })
        .eq("original_transaction_id", row.original_transaction_id);
      if (led.error) logger.warn({ err: led.error.message }, "dentvid: App Store ledger row not marked active after takeover");
      return true;
    },
    async clinic(clinicId) {
      const { data } = await db.from("dentvid_clinics").select("id, profile, plan_tier").eq("id", clinicId).maybeSingle();
      const p = ((data as { profile?: { name?: string; country?: string } } | null)?.profile ?? {}) as { name?: string; country?: string };
      return { id: clinicId, name: p.name ?? null, country: p.country ?? null, tier: (data as { plan_tier?: string } | null)?.plan_tier ?? null };
    },
  };
}
