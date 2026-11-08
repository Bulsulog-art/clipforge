/**
 * DentVideo paid plans — Dodo Payments.
 *
 * Pure helpers (no I/O) so checkout building, webhook routing and plan
 * transitions are unit-tested: the routes only do auth, database and fetch.
 *
 * DentVideo and ClipForge share one Dodo business (one API key, one webhook
 * URL). DentVideo events are told apart by the metadata the checkout puts on
 * the subscription (app = "dentvideo"), with the DentVideo brand id and
 * product ids as fallbacks.
 */

export const DV_TIERS = ["starter", "practice", "group"] as const;
export type DvTier = (typeof DV_TIERS)[number];
export const DV_INTERVALS = ["month", "year"] as const;
export type DvInterval = (typeof DV_INTERVALS)[number];
export type DvPlanState = "trial" | "active" | "paused" | "cancelled";

/** Owner-approved list prices in whole USD (docs/POSITIONING.md §6). */
export const DV_PRICES_USD: Record<DvTier, Partial<Record<DvInterval, number>>> = {
  starter: { month: 39 },
  practice: { month: 69, year: 690 },
  group: { month: 219 },
};

/** Founding offer: Practice monthly at this price for 12 months, first 100 clinics. */
export const DV_FOUNDING = { tier: "practice" as DvTier, interval: "month" as DvInterval, priceUsd: 39, months: 12, clinics: 100 };

export const DV_BRAND_ID_DEFAULT = "brnd_0NrVafyQGNiKOz0caOKgm";

/** Env var per sellable product, with the live Dodo product id as default. */
export const DV_PRODUCTS: { tier: DvTier; interval: DvInterval; env: string; fallback: string | null }[] = [
  { tier: "starter", interval: "month", env: "DENTVIDEO_DODO_PRODUCT_STARTER_MONTHLY", fallback: "pdt_0NrVahwZsINvy3TNz2H35" },
  { tier: "practice", interval: "month", env: "DENTVIDEO_DODO_PRODUCT_PRACTICE_MONTHLY", fallback: "pdt_0NrVai0xqpQKU8H3Zj3QN" },
  { tier: "group", interval: "month", env: "DENTVIDEO_DODO_PRODUCT_GROUP_MONTHLY", fallback: "pdt_0NrVai5ZNwqFoSZbcfV8S" },
  { tier: "practice", interval: "year", env: "DENTVIDEO_DODO_PRODUCT_PRACTICE_YEARLY", fallback: "pdt_0NrVaiBrxhFhPrt8IbdSu" },
  // Not created in Dodo yet: offered only once their env var is set.
  { tier: "starter", interval: "year", env: "DENTVIDEO_DODO_PRODUCT_STARTER_YEARLY", fallback: null },
  { tier: "group", interval: "year", env: "DENTVIDEO_DODO_PRODUCT_GROUP_YEARLY", fallback: null },
];

type Env = Record<string, string | undefined>;

export function dvProductId(tier: DvTier, interval: DvInterval, env: Env = process.env): string | null {
  const p = DV_PRODUCTS.find((x) => x.tier === tier && x.interval === interval);
  if (!p) return null;
  return env[p.env]?.trim() || p.fallback;
}

/** Every DentVideo product id currently configured. */
export function dvProductIds(env: Env = process.env): string[] {
  return DV_PRODUCTS.map((p) => dvProductId(p.tier, p.interval, env)).filter((x): x is string => !!x);
}

/** Dodo product id → the tier and interval it sells. */
export function dvPlanForProduct(productId: string | null | undefined, env: Env = process.env): { tier: DvTier; interval: DvInterval } | null {
  if (!productId) return null;
  for (const p of DV_PRODUCTS) if (dvProductId(p.tier, p.interval, env) === productId) return { tier: p.tier, interval: p.interval };
  return null;
}

/** Which tier/interval pairs can be bought right now (a product id and a list price exist). */
export function dvAvailablePlans(env: Env = process.env): { tier: DvTier; interval: DvInterval; priceUsd: number }[] {
  const out: { tier: DvTier; interval: DvInterval; priceUsd: number }[] = [];
  for (const tier of DV_TIERS) {
    for (const interval of DV_INTERVALS) {
      const priceUsd = DV_PRICES_USD[tier][interval];
      if (priceUsd && dvProductId(tier, interval, env)) out.push({ tier, interval, priceUsd });
    }
  }
  return out;
}

/**
 * Whether the founding offer is applied by default. On unless
 * DENTVIDEO_FOUNDING_OFFER is "0"/"false"/"off" — flip it when the 100 are taken.
 */
export function foundingOfferOpen(env: Env = process.env): boolean {
  const v = env.DENTVIDEO_FOUNDING_OFFER?.trim().toLowerCase();
  return !(v === "0" || v === "false" || v === "off" || v === "closed");
}

export function foundingCode(env: Env = process.env): string {
  return env.DENTVIDEO_FOUNDING_CODE?.trim() || "KURUCU100";
}

export function dvBrandId(env: Env = process.env): string {
  return env.DENTVIDEO_DODO_BRAND_ID?.trim() || DV_BRAND_ID_DEFAULT;
}

/** Public base of the DentVideo site, no trailing slash. */
export function dvBaseUrl(env: Env = process.env): string {
  const explicit = env.NEXT_PUBLIC_DENTVIDEO_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return `${(env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "")}/dentvideo`;
}

const CODE = /^[A-Za-z0-9_-]{1,40}$/;

/** A discount code as typed by the clinic, normalised — or null if it is not a plausible code. */
export function normaliseCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toUpperCase();
  return CODE.test(c) ? c : null;
}

export type DvCheckoutInput = {
  tier: DvTier;
  interval: DvInterval;
  code?: string | null;
  clinicId: string;
  ownerId: string;
  email?: string | null;
  locale?: string | null;
};

export type DvCheckoutPlan =
  | { ok: true; body: Record<string, unknown>; productId: string; discount: string | null; autoDiscount: boolean }
  | { ok: false; reason: "unavailable" };

/**
 * The Dodo `POST /checkouts` body for a clinic's plan. Field names follow
 * https://docs.dodopayments.com/developer-resources/checkout-session:
 * product_cart, customer.email, discount_codes, metadata (copied onto the
 * subscription and every webhook about it), return_url, cancel_url,
 * customization.force_language.
 */
export function buildDvCheckout(input: DvCheckoutInput, env: Env = process.env): DvCheckoutPlan {
  const productId = dvProductId(input.tier, input.interval, env);
  if (!productId || !DV_PRICES_USD[input.tier][input.interval]) return { ok: false, reason: "unavailable" };

  const typed = normaliseCode(input.code);
  const founding = input.tier === DV_FOUNDING.tier && input.interval === DV_FOUNDING.interval && foundingOfferOpen(env);
  const discount = typed ?? (founding ? foundingCode(env) : null);
  const base = dvBaseUrl(env);
  const lang = input.locale && /^(en|de|es|tr|fr)$/.test(input.locale) ? input.locale : null;

  const body: Record<string, unknown> = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    ...(input.email ? { customer: { email: input.email } } : {}),
    ...(discount ? { discount_codes: [discount] } : {}),
    metadata: { app: "dentvideo", clinic_id: input.clinicId, owner_id: input.ownerId, plan: input.tier, interval: input.interval },
    return_url: `${base}/app?billing=success`,
    cancel_url: `${base}/app?billing=cancelled`,
    ...(lang ? { customization: { force_language: lang } } : {}),
  };
  return { ok: true, body, productId, discount, autoDiscount: !typed && !!discount };
}

/* ---------------------------------------------------------------- webhook */

export type DodoEventData = {
  subscription_id?: string | null;
  payment_id?: string | null;
  product_id?: string | null;
  brand_id?: string | null;
  status?: string | null;
  next_billing_date?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: { email?: string | null } | null;
  product_cart?: { product_id: string; quantity?: number }[] | null;
};

/** Is this Dodo event about DentVideo (and so not ClipForge's business)? */
export function isDentvideoEvent(d: DodoEventData | null | undefined, env: Env = process.env): boolean {
  if (!d) return false;
  if (d.metadata?.app === "dentvideo") return true;
  // Metadata is ours to set, so it is the primary signal; brand and product
  // ids catch an event whose object carries no metadata (e.g. made in the dashboard).
  if (d.metadata?.app && d.metadata.app !== "dentvideo") return false;
  if (d.brand_id && d.brand_id === dvBrandId(env)) return true;
  const ids = new Set(dvProductIds(env));
  if (d.product_id && ids.has(d.product_id)) return true;
  return (d.product_cart ?? []).some((i) => ids.has(i.product_id));
}

export type DvTransition = {
  plan: DvPlanState;
  /** Set on activation; null keeps whatever is stored. */
  tier: DvTier | null;
  subscriptionId: string;
  renewsAt: string | null;
  /** Deactivations apply only to the clinic's current subscription. */
  kind: "activate" | "deactivate";
};

const ACTIVATE = new Set(["subscription.active", "subscription.renewed", "subscription.unpaused"]);
const CANCEL = new Set(["subscription.cancelled", "subscription.expired"]);
const PAUSE = new Set(["subscription.on_hold", "subscription.failed", "subscription.paused"]);

/**
 * What a subscription event does to the clinic's plan, or null for events
 * that change nothing (payments, past_due — the clinic keeps access through
 * the grace period — updated, unknown).
 *
 * plan_changed carries the new product; it re-activates with the new tier
 * only while the subscription is active.
 */
export function dvTransition(type: string, d: DodoEventData, env: Env = process.env): DvTransition | null {
  const sub = d.subscription_id;
  if (!sub || !type.startsWith("subscription.")) return null;
  const tierFromProduct = dvPlanForProduct(d.product_id, env)?.tier ?? null;
  const metaTier = typeof d.metadata?.plan === "string" && (DV_TIERS as readonly string[]).includes(d.metadata.plan) ? (d.metadata.plan as DvTier) : null;
  const tier = tierFromProduct ?? metaTier;
  const renewsAt = d.next_billing_date ?? null;

  if (ACTIVATE.has(type) || (type === "subscription.plan_changed" && d.status === "active")) {
    return { plan: "active", tier, subscriptionId: sub, renewsAt, kind: "activate" };
  }
  if (CANCEL.has(type)) return { plan: "cancelled", tier: null, subscriptionId: sub, renewsAt: null, kind: "deactivate" };
  if (PAUSE.has(type)) return { plan: "paused", tier: null, subscriptionId: sub, renewsAt: null, kind: "deactivate" };
  return null;
}

export type ClinicBilling = {
  plan: DvPlanState;
  plan_tier?: DvTier | null;
  dodo_subscription_id?: string | null;
  plan_renews_at?: string | null;
};

/**
 * The row update a transition makes to a clinic, or null when it should be
 * left alone. Idempotent: applying the same event twice yields the same row.
 *
 * - An activation always wins and records the subscription it came from.
 * - A cancel/pause applies only when it is about the clinic's current
 *   subscription (or the clinic has none recorded), so a late "cancelled" for
 *   an old subscription never switches off a clinic that has resubscribed.
 */
export function applyTransition(current: ClinicBilling, t: DvTransition): Partial<ClinicBilling> | null {
  if (t.kind === "deactivate" && current.dodo_subscription_id && current.dodo_subscription_id !== t.subscriptionId) return null;
  if (t.kind === "deactivate" && current.plan === "trial" && !current.dodo_subscription_id && t.plan === "paused") {
    // A first payment that never went through: the clinic simply stays on trial.
    return null;
  }
  const next: Partial<ClinicBilling> = { plan: t.plan, dodo_subscription_id: t.subscriptionId };
  if (t.kind === "activate") {
    if (t.tier) next.plan_tier = t.tier;
    next.plan_renews_at = t.renewsAt;
  } else {
    next.plan_renews_at = null;
  }
  const same = (Object.keys(next) as (keyof ClinicBilling)[]).every((k) => (current[k] ?? null) === (next[k] ?? null));
  return same ? null : next;
}

/* ------------------------------------------------------------ access rule */

/**
 * Can this clinic have new videos made? Paying clinics yes; a trial clinic
 * until its free week is made; paused or cancelled clinics no.
 */
export function canMakeVideos(plan: DvPlanState | string | null | undefined, freeWeekUsed: boolean): boolean {
  if (plan === "active") return true;
  if (!plan || plan === "trial") return !freeWeekUsed;
  return false;
}

/** Should the app offer the plans? Trial with the free week made, or paused/cancelled. */
export function needsPlan(plan: DvPlanState | string | null | undefined, freeWeekUsed: boolean): boolean {
  return !canMakeVideos(plan, freeWeekUsed);
}
