/**
 * DentVideo plans bought inside the iPhone app: Apple in-app purchase through
 * RevenueCat (docs/DENTVIDEO_IAP_PLAN.md).
 *
 * Pure helpers (no I/O): product → tier, what a RevenueCat webhook event does
 * to a clinic, and what the app's billing screen should show. The webhook
 * handler (apple-webhook.ts) does the database work; these rules are unit-
 * tested on their own.
 *
 * The same plans as the web (pricing.ts): Starter and Practice, monthly. The
 * App Store sells them in one subscription group ("DentVideo"), so a clinic
 * can only ever hold one of them per Apple ID; Apple handles upgrades,
 * downgrades, billing retry and refunds, and tells us through RevenueCat.
 *
 * app_user_id is the Liman user id (the app calls Purchases.logIn(user.id)
 * after signing in), so an event maps to exactly one login → one clinic.
 */

import type { DvTier } from "./billing";

type Env = Record<string, string | undefined>;

/** App Store product ids (one subscription group "DentVideo"). Env overrides exist for a renamed product only. */
export const DV_IAP_PRODUCTS: { tier: Extract<DvTier, "starter" | "practice">; env: string; fallback: string }[] = [
  { tier: "starter", env: "DENTVID_IAP_PRODUCT_STARTER", fallback: "dentvideo_starter_monthly" },
  { tier: "practice", env: "DENTVID_IAP_PRODUCT_PRACTICE", fallback: "dentvideo_practice_monthly" },
];

/** RevenueCat entitlement per tier (the app checks these; the server trusts the product id, as Dodo's webhook does). */
export const DV_IAP_ENTITLEMENTS: Record<"starter" | "practice", string> = { starter: "starter", practice: "practice" };

/** Where an Apple subscriber changes or cancels their plan (Apple's own page; opens the Subscriptions sheet on iOS). */
export const APP_STORE_MANAGE_URL = "https://apps.apple.com/account/subscriptions";

/** Rank inside the subscription group: a higher number is the bigger plan (Apple applies an upgrade at once, a downgrade at renewal). */
const RANK: Record<string, number> = { starter: 1, practice: 2, group: 3 };

export function iapProductId(tier: "starter" | "practice", env: Env = process.env): string {
  const p = DV_IAP_PRODUCTS.find((x) => x.tier === tier)!;
  return env[p.env]?.trim() || p.fallback;
}

/** The App Store product ids the app offers, with their tier (never a price: StoreKit shows the storefront's own). */
export function iapProducts(env: Env = process.env): { tier: "starter" | "practice"; productId: string; entitlement: string }[] {
  return DV_IAP_PRODUCTS.map((p) => ({ tier: p.tier, productId: iapProductId(p.tier, env), entitlement: DV_IAP_ENTITLEMENTS[p.tier] }));
}

/** App Store product id → tier, or null for anything that is not a DentVideo plan. */
export function iapTierForProduct(productId: string | null | undefined, env: Env = process.env): "starter" | "practice" | null {
  if (!productId) return null;
  // RevenueCat may report a product as "<id>:<base plan>" for Play; App Store ids carry no suffix.
  for (const p of DV_IAP_PRODUCTS) if (iapProductId(p.tier, env) === productId) return p.tier;
  return null;
}

export function isUpgrade(from: string | null | undefined, to: string | null | undefined): boolean {
  return (RANK[to ?? ""] ?? 0) > (RANK[from ?? ""] ?? 0);
}

/* ------------------------------------------------------------------ events */

/**
 * The subset of a RevenueCat webhook event DentVideo reads
 * (https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).
 */
export type RcEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: string;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  environment?: "SANDBOX" | "PRODUCTION" | string;
  store?: string;
  transaction_id?: string | null;
  original_transaction_id?: string | null;
  is_family_share?: boolean | null;
  cancel_reason?: string | null;
  expiration_reason?: string | null;
  transferred_from?: string[];
  transferred_to?: string[];
  country_code?: string;
  currency?: string;
};

/** What an event does to the clinic it belongs to. */
export type AppleEffect =
  /** The subscription is paid (purchase, renewal, upgrade, auto-renew back on, extension): the clinic is active until `periodEnd`. */
  | { kind: "activate"; tier: "starter" | "practice"; periodEnd: string | null; status: "active" }
  /** Auto-renew switched off: active until `periodEnd`, then it ends (the F9 rule of the web). */
  | { kind: "ending"; periodEnd: string | null }
  /** Apple could not charge: kept on through Apple's billing grace period when there is one, otherwise paused. */
  | { kind: "billing_issue"; graceEnd: string | null }
  /** The subscription is over: expired, or refunded (ends now). */
  | { kind: "end"; reason: "expired" | "refunded" }
  /** A downgrade or crossgrade that Apple applies at the next renewal: remembered, nothing changes today. */
  | { kind: "scheduled_change"; tier: "starter" | "practice" | null }
  /** Recorded on the ledger only (a pause scheduled for the period's end, a reversed refund). */
  | { kind: "note"; status: string }
  | { kind: "transfer" }
  | { kind: "test" }
  | { kind: "ignore"; why: string };

const iso = (ms: number | null | undefined): string | null => (typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null);

/** The stores whose events may switch a DentVideo clinic on. Promotional grants from the dashboard never do (no free plans). */
const PAID_STORES = new Set(["APP_STORE", "MAC_APP_STORE"]);

/**
 * What a RevenueCat event does, from the event alone (the handler then checks
 * the clinic: whose subscription is current, cross-channel, ordering).
 *
 * Refunds: RevenueCat reports an App Store refund as CANCELLATION with
 * cancel_reason CUSTOMER_SUPPORT (and sends REFUND only for some stores); both
 * end the plan at once. A plain CANCELLATION (auto-renew off) keeps the plan
 * until the paid period ends, like a cancelled Dodo subscription (F9).
 */
export function appleEffect(e: RcEvent, env: Env = process.env): AppleEffect {
  const type = e.type ?? "";
  if (type === "TEST") return { kind: "test" };
  if (!PAID_STORES.has(e.store ?? "")) return { kind: "ignore", why: `store ${e.store ?? "none"}` };
  if (e.is_family_share) return { kind: "ignore", why: "family share" };
  const tier = iapTierForProduct(e.product_id, env);
  const periodEnd = iso(e.expiration_at_ms);
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
      if (!tier) return { kind: "ignore", why: "not a DentVideo product" };
      return { kind: "activate", tier, periodEnd, status: "active" };
    case "PRODUCT_CHANGE": {
      // product_id is the plan the customer had, new_product_id the one chosen. Apple moves an upgrade
      // at once (prorated) and a downgrade at the next renewal, whose RENEWAL event carries the new product.
      const next = iapTierForProduct(e.new_product_id, env);
      if (!next) return { kind: "ignore", why: "not a DentVideo product" };
      if (isUpgrade(tier, next)) return { kind: "activate", tier: next, periodEnd, status: "active" };
      return { kind: "scheduled_change", tier: next };
    }
    case "CANCELLATION":
      if (e.cancel_reason === "CUSTOMER_SUPPORT") return { kind: "end", reason: "refunded" };
      return { kind: "ending", periodEnd };
    case "REFUND":
      return { kind: "end", reason: "refunded" };
    case "EXPIRATION":
      return { kind: "end", reason: "expired" };
    case "BILLING_ISSUE":
      return { kind: "billing_issue", graceEnd: iso(e.grace_period_expiration_at_ms) };
    case "SUBSCRIPTION_PAUSED":
      // Apple has no pause; RevenueCat sends this for Play. Access lasts until EXPIRATION arrives.
      return { kind: "note", status: "pause_scheduled" };
    case "REFUND_REVERSED":
      return { kind: "note", status: "refund_reversed" };
    case "TRANSFER":
      return { kind: "transfer" };
    default:
      // NON_RENEWING_PURCHASE, TEMPORARY_ENTITLEMENT_GRANT, SUBSCRIBER_ALIAS, INVOICE_ISSUANCE…: never a plan.
      return { kind: "ignore", why: type || "no type" };
  }
}

/** When the event happened (RevenueCat's event_timestamp_ms), ISO, or null. */
export function appleEventTime(e: RcEvent): string | null {
  return iso(e.event_timestamp_ms);
}

/** The Apple subscription an event is about: the original transaction id stays the same across renewals and plan changes. */
export function appleSubscriptionKey(e: RcEvent): string | null {
  const id = (e.original_transaction_id ?? e.transaction_id ?? "").trim();
  return /^[A-Za-z0-9._:-]{1,120}$/.test(id) ? id : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Liman user ids an event may belong to, in order: app_user_id, then the
 * original id and aliases (a purchase made before Purchases.logIn ran is
 * aliased to the user afterwards). Anonymous RevenueCat ids ($RCAnonymousID:…)
 * are never a user.
 */
export function candidateUserIds(e: RcEvent): string[] {
  const all = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])].filter((x): x is string => typeof x === "string" && UUID.test(x));
  return [...new Set(all.map((x) => x.toLowerCase()))];
}

/** Sandbox purchases (TestFlight, App Review, Xcode) switch a clinic on only when DENTVID_IAP_SANDBOX allows it. */
export type SandboxPolicy = "allow" | "internal" | "off";
export function sandboxPolicy(env: Env = process.env): SandboxPolicy {
  const v = env.DENTVID_IAP_SANDBOX?.trim().toLowerCase();
  return v === "off" || v === "internal" ? v : "allow";
}

/* ------------------------------------------------------------ app billing */

/** Where a clinic's subscription lives (dentvid_clinics.billing_source, 0026; null before it or with no plan yet). */
export type BillingSource = "dodo" | "apple";

export type MobileBillingStatus =
  | "none" // never paid: the paywall
  | "active"
  | "ending" // auto-renew off / cancelled, paid until endsAt
  | "billing_issue" // Apple is retrying the charge
  | "paused" // a web subscription on hold
  | "pending" // a web payment being confirmed
  | "disputed"
  | "admin_paused"
  | "ended"; // a plan that ended: the paywall again

export type MobileBillingInput = {
  plan: string;
  tier: DvTier | null;
  source: BillingSource | null;
  renewsAt: string | null;
  endsAt: string | null;
  adminPaused: boolean;
  /** The web's checkout refusal (billing-state.ts loadCheckoutBlock) for a clinic that is not active. */
  webBlock: "pending" | "payment_update" | "disputed" | "cancelled_pending" | "active" | null;
  /** Apple's ledger row for the clinic's current Apple subscription, when known. */
  appleStatus: string | null;
};

/**
 * What the iPhone app's plan screen shows, and whether the paywall may open.
 *
 * The paywall opens only for a clinic with no live subscription in either
 * channel: a clinic paying on the web never sees it (and is told its plan is
 * managed on the web, with no link: guideline 3.1.1); a clinic paying through
 * Apple is sent to the App Store's subscription page to change or cancel.
 */
export function mobileBillingView(i: MobileBillingInput): { status: MobileBillingStatus; showPaywall: boolean; manage: "app_store" | "web" | null } {
  const manage = (src: BillingSource | null) => (src === "apple" ? ("app_store" as const) : ("web" as const));
  if (i.adminPaused) return { status: "admin_paused", showPaywall: false, manage: null };
  if (i.plan === "active") {
    const ending = !!i.endsAt || (i.source === "apple" && (i.appleStatus === "cancelled" || i.appleStatus === "expired"));
    const issue = i.source === "apple" && i.appleStatus === "billing_issue";
    return { status: issue ? "billing_issue" : ending ? "ending" : "active", showPaywall: false, manage: manage(i.source) };
  }
  if (i.plan === "paused") {
    if (i.source === "apple") return { status: "billing_issue", showPaywall: false, manage: "app_store" };
    if (i.webBlock === "disputed") return { status: "disputed", showPaywall: false, manage: null };
    return { status: "paused", showPaywall: false, manage: "web" };
  }
  // trial / cancelled: a web payment still being confirmed, or a cancelled web plan paid up, blocks a second subscription.
  if (i.webBlock === "pending") return { status: "pending", showPaywall: false, manage: null };
  if (i.webBlock === "disputed") return { status: "disputed", showPaywall: false, manage: null };
  if (i.webBlock === "payment_update") return { status: "paused", showPaywall: false, manage: "web" };
  if (i.webBlock === "cancelled_pending") return { status: "ending", showPaywall: false, manage: "web" };
  return { status: i.plan === "cancelled" ? "ended" : "none", showPaywall: true, manage: null };
}
