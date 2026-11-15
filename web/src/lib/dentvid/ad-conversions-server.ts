import type { SupabaseClient } from "@supabase/supabase-js";
import { CLICK_ID, CLICK_TYPES, type AdClick, type ClickConsent, type ClickType } from "./ad-click";
import { AD_CONVERSIONS, paidConversionValue, withinWindow, type AdConversionName, type AdConversionRow } from "./ad-conversions";
import { dvAdmin } from "./supabase";

/**
 * The database side of ad measurement (migration 0019): one click per
 * account (dentvid_ad_clicks) and at most one conversion of each kind per
 * account (dentvid_ad_conversions). Service role only — both tables have RLS
 * on, no policies and no grants to anon / authenticated.
 *
 * Every function is best effort: it never throws and never blocks a sign-up
 * or a payment. Before 0019 is applied the writes simply fail (logged once
 * per call site as "missing table") and /admin/ads says the tables are missing.
 */

export const CLICKS = "dentvid_ad_clicks";
export const CONVERSIONS = "dentvid_ad_conversions";

const missing = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|Could not find the table/i.test(e.message ?? ""));

function admin(db?: SupabaseClient): SupabaseClient | null {
  if (db) return db;
  try {
    return dvAdmin();
  } catch {
    return null;
  }
}

type StoredClick = { type: ClickType; id: string; consent: ClickConsent; clickedAt: string };

function storedClick(row: unknown): StoredClick | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (!(CLICK_TYPES as readonly unknown[]).includes(r.click_type) || typeof r.click_id !== "string" || !CLICK_ID.test(r.click_id)) return null;
  if (r.consent !== "granted" && r.consent !== "not_required") return null;
  if (typeof r.clicked_at !== "string" || !Number.isFinite(Date.parse(r.clicked_at))) return null;
  return { type: r.click_type as ClickType, id: r.click_id, consent: r.consent, clickedAt: r.clicked_at };
}

async function addConversion(c: SupabaseClient, ownerId: string, clinicId: string | null, name: AdConversionName, click: StoredClick, at: Date, value?: number): Promise<"recorded" | "outside window" | "failed"> {
  if (!withinWindow(click.clickedAt, at)) return "outside window";
  const conv = AD_CONVERSIONS[name];
  const { error } = await c.from(CONVERSIONS).upsert(
    {
      owner_id: ownerId,
      clinic_id: clinicId,
      conversion_name: name,
      conversion_time: at.toISOString(),
      value: value ?? conv.value,
      currency: conv.currency,
      click_type: click.type,
      click_id: click.id,
      consent: click.consent,
      clicked_at: click.clickedAt,
    },
    // One of each per account: a replay is a no-op, never a second conversion.
    { onConflict: "owner_id,conversion_name", ignoreDuplicates: true },
  );
  if (error) {
    console.warn(`[dentvideo ads] ${name} not recorded`, missing(error) ? "missing table (apply migration 0019)" : error.message);
    return "failed";
  }
  return "recorded";
}

/**
 * A new account from an ad click: keep the click against the account and
 * record the sign-up conversion. `click` was checked by acceptableClick.
 */
export async function recordSignupClick(ownerId: string, click: AdClick, now = new Date(), db?: SupabaseClient): Promise<"recorded" | "outside window" | "failed"> {
  const c = admin(db);
  if (!c) return "failed";
  try {
    const clickedAt = new Date(click.at).toISOString();
    const { error } = await c
      .from(CLICKS)
      .upsert({ owner_id: ownerId, click_type: click.type, click_id: click.id, consent: click.consent, clicked_at: clickedAt }, { onConflict: "owner_id", ignoreDuplicates: true });
    if (error) {
      console.warn("[dentvideo ads] click not stored", missing(error) ? "missing table (apply migration 0019)" : error.message);
      return "failed";
    }
    return await addConversion(c, ownerId, null, "dv_signup", { type: click.type, id: click.id, consent: click.consent, clickedAt }, now);
  } catch (e) {
    console.warn("[dentvideo ads] sign-up conversion failed", (e as Error).message);
    return "failed";
  }
}

/**
 * A clinic's first payment (billing-webhook, first activation): the paid
 * conversion, if its owner came from an ad click we still hold.
 */
export async function recordPaidConversion(db: SupabaseClient, clinic: { id: string; owner_id: string }, now = new Date()): Promise<"recorded" | "no click" | "outside window" | "failed"> {
  try {
    const { data, error } = await db.from(CLICKS).select("click_type, click_id, consent, clicked_at").eq("owner_id", clinic.owner_id).maybeSingle();
    if (error) {
      if (!missing(error)) console.warn("[dentvideo ads] click lookup failed", error.message);
      return "failed";
    }
    const click = storedClick(data);
    if (!click) return "no click";
    if (!withinWindow(click.clickedAt, now)) return "outside window";
    // The clinic's country sets the value (TR 150, elsewhere 250); unknown → 250.
    const { data: row } = await db.from("dentvid_clinics").select("profile").eq("id", clinic.id).maybeSingle();
    const country = (row as { profile?: { country?: string } } | null)?.profile?.country;
    return await addConversion(db, clinic.owner_id, clinic.id, "dv_paid", click, now, paidConversionValue(country));
  } catch (e) {
    console.warn("[dentvideo ads] paid conversion failed", (e as Error).message);
    return "failed";
  }
}

export type AdConversionList = { available: boolean; rows: AdConversionRow[]; error?: string };

/** The conversions for /admin/ads: pending first, then the most recent exported ones. */
export async function listAdConversions(db?: SupabaseClient): Promise<AdConversionList> {
  const c = admin(db);
  if (!c) return { available: false, rows: [], error: "DentVideo backend is not configured" };
  try {
    const { data, error } = await c.from(CONVERSIONS).select("*").order("conversion_time", { ascending: false }).limit(1000);
    if (error) return missing(error) ? { available: false, rows: [] } : { available: true, rows: [], error: error.message };
    return { available: true, rows: (data ?? []) as AdConversionRow[] };
  } catch (e) {
    return { available: false, rows: [], error: (e as Error).message };
  }
}

/** Mark these rows as exported (they were in a downloaded file). */
export async function markExported(ids: number[], now = new Date(), db?: SupabaseClient): Promise<boolean> {
  if (!ids.length) return true;
  const c = admin(db);
  if (!c) return false;
  const { error } = await c.from(CONVERSIONS).update({ exported_at: now.toISOString() }).in("id", ids).is("exported_at", null);
  if (error) console.warn("[dentvideo ads] could not mark rows exported", error.message);
  return !error;
}

/**
 * Delete click ids older than 90 days, in both tables (privacy policy:
 * retention 90 days). Runs the migration's SQL function; the worker's
 * nightly billing-reconcile job and every opening of /admin/ads call it.
 * Returns how many rows went, or null when it could not run.
 */
export async function purgeAdData(db?: SupabaseClient): Promise<number | null> {
  const c = admin(db);
  if (!c) return null;
  try {
    const { data, error } = await c.rpc("dentvid_purge_ad_data");
    if (error) return null;
    return typeof data === "number" ? data : Number(data) || 0;
  } catch {
    return null;
  }
}
