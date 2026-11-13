import type { SupabaseClient } from "@supabase/supabase-js";
import { billingText } from "@/content/dentvideo-billing";
import { fill } from "@/content/dentvideo-lifecycle";
import { CONTACT_EMAIL } from "./lifecycle-email";
import { checkoutBlock, type DvCheckoutBlock, type DvSubRecord } from "./billing";
import { supabaseSubscriptionStore } from "./subscriptions";
import { dodoApiKey, dodoGetSubscription } from "./dodo-account";

/**
 * Server-side billing state for a clinic: may it open a new checkout, and
 * what should the app show instead of the plan picker? Reads the ledger with
 * the service role (dvAdmin) — owners cannot read it through RLS — and, with
 * DODO_API_KEY, Dodo's live status of the clinic's current subscription.
 * Every source is optional: without the ledger or the key the decision uses
 * the clinic row alone (billing.ts checkoutBlock).
 */

export type ClinicBillingRow = { id: string; plan: string; dodo_subscription_id?: string | null };

/** Service-role client, or null when the backend is not configured (tests, dev). */
export async function adminOrNull(): Promise<SupabaseClient | null> {
  try {
    const { dvAdmin } = await import("./supabase");
    return dvAdmin() as unknown as SupabaseClient;
  } catch {
    return null;
  }
}

async function liveStatus(subscriptionId: string | null | undefined): Promise<string | null> {
  const apiKey = dodoApiKey();
  if (!apiKey || !subscriptionId) return null;
  try {
    return (await dodoGetSubscription({ apiKey }, subscriptionId)).status ?? null;
  } catch (e) {
    console.warn("[dentvideo billing] could not read the subscription from Dodo", (e as Error).message);
    return null;
  }
}

export async function loadCheckoutBlock(clinic: ClinicBillingRow, admin: SupabaseClient | null, now = new Date()): Promise<DvCheckoutBlock | null> {
  if (clinic.plan === "active") return { code: "active" };
  const subs: DvSubRecord[] | null = admin ? await supabaseSubscriptionStore(admin).forClinic(clinic.id) : null;
  const dodoStatus = clinic.dodo_subscription_id ? await liveStatus(clinic.dodo_subscription_id) : null;
  return checkoutBlock({ clinic, subs, dodoStatus, now });
}

/** The sentence a refused checkout answers with, in the clinic's language. */
export function checkoutBlockMessage(block: DvCheckoutBlock, language: string | null | undefined, opts: { selfServe: boolean; alreadySubscribed: string }): string {
  const { lang, copy } = billingText(language);
  const r = copy.refuse;
  const vars = { email: CONTACT_EMAIL };
  switch (block.code) {
    case "active":
      return opts.alreadySubscribed;
    case "pending":
      return r.pending;
    case "payment_update":
      return fill(r.updatePayment, { how: fill(opts.selfServe ? r.updateHowPortal : r.updateHowEmail, vars) });
    case "cancelled_pending":
      return fill(r.cancelledPending, { ...vars, date: formatDate(block.until, lang) });
  }
}

export function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang, { dateStyle: "long", timeZone: "UTC" }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/** How long after a payment event the "being made" screen may show for a clinic that is not active yet. */
const PAYMENT_SEEN_MS = 2 * 3600_000;
/** How long a ?billing=success return alone (no payment event yet) keeps the "activating" screen up. */
const RETURN_GRACE_MS = 15 * 60_000;

/**
 * May ?billing=success show "your first week is being made" for a clinic
 * that is not active yet? Only with evidence of a payment: a recent ledger
 * row for one of its subscriptions or a payment_succeeded event — or within
 * a short grace after the clinic first came back from checkout (the webhook
 * is usually seconds behind the redirect). A bookmarked or shared
 * ?billing=success link alone does not.
 */
export async function paymentSeen(clinicId: string, admin: SupabaseClient | null, now = new Date()): Promise<boolean> {
  const since = now.getTime() - PAYMENT_SEEN_MS;
  if (admin) {
    const subs = await supabaseSubscriptionStore(admin).forClinic(clinicId);
    if (subs?.some((r) => (r.status === "pending" || r.status === "active") && Date.parse(r.updated_at ?? "") >= since)) return true;
    try {
      const { count } = await admin
        .from("dentvid_events")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("name", "payment_succeeded")
        .gte("created_at", new Date(since).toISOString());
      if ((count ?? 0) > 0) return true;
    } catch {
      // no events table: fall through to the grace window
    }
  }
  return successReturnFresh(clinicId, now);
}

/** True the first time a clinic lands on ?billing=success and for RETURN_GRACE_MS after; true when Redis is unavailable (old behaviour). */
async function successReturnFresh(clinicId: string, now: Date): Promise<boolean> {
  try {
    const { webOpsStore } = await import("./ops-server");
    const store = await webOpsStore();
    if (!store) return true;
    const key = `dv:billing-return:${clinicId}`;
    const first = await store.get(key);
    if (!first) {
      await store.set(key, now.toISOString(), 6 * 3600);
      return true;
    }
    return now.getTime() - Date.parse(first) < RETURN_GRACE_MS;
  } catch {
    return true;
  }
}

/** What the app shows where the plan picker would be. */
export type AppBillingPanel =
  | { kind: "plans" }
  | { kind: "update_payment"; selfServe: boolean }
  | { kind: "pending" }
  | { kind: "cancelled_pending"; until: string };

/** Paused on a card problem → "update your payment", not "choose a plan" (a new plan would charge twice). */
export async function loadAppBillingPanel(clinic: ClinicBillingRow, admin: SupabaseClient | null, now = new Date()): Promise<AppBillingPanel> {
  if (clinic.plan === "active") return { kind: "plans" };
  const block = await loadCheckoutBlock(clinic, admin, now);
  if (!block || block.code === "active") return { kind: "plans" };
  if (block.code === "payment_update") return { kind: "update_payment", selfServe: !!dodoApiKey() };
  if (block.code === "pending") return { kind: "pending" };
  return { kind: "cancelled_pending", until: block.until };
}
