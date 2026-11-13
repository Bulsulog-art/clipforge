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
/**
 * Billing intervals a subscription can have. Only "month" is sold
 * (DV_OFFERED_INTERVALS); "year" stays a known interval so a legacy Practice
 * yearly subscription still maps in the webhook and in admin revenue maths.
 */
export const DV_INTERVALS = ["month", "year"] as const;
export type DvInterval = (typeof DV_INTERVALS)[number];
/** The only interval offered: monthly. There is no yearly billing. */
export const DV_OFFERED_INTERVALS = ["month"] as const satisfies readonly DvInterval[];
export type DvPlanState = "trial" | "active" | "paused" | "cancelled";

/**
 * Tiers a clinic can buy itself. Group (groups, multi-location practices) is
 * "Contact us": multi-location does not exist in the product, so it has no
 * public price and no checkout (content/dentvideo-group.ts). "group" stays a
 * tier so a stray Group payment still maps in the webhook.
 */
export const DV_SELF_SERVE_TIERS = ["starter", "practice"] as const satisfies readonly DvTier[];
export function isSelfServeTier(tier: string | null | undefined): boolean {
  return (DV_SELF_SERVE_TIERS as readonly string[]).includes(tier ?? "");
}

/**
 * Owner-approved list prices in whole USD (docs/POSITIONING.md §6), monthly
 * only. Group has none: it is sold by contact.
 */
export const DV_PRICES_USD: Record<DvTier, Partial<Record<DvInterval, number>>> = {
  starter: { month: 29 },
  practice: { month: 49 },
  group: {},
};

/**
 * What the legacy yearly products charged, for internal revenue maths only
 * (admin MRR) should an old yearly subscription still exist. Never shown or sold.
 */
export const DV_LEGACY_YEARLY_USD: Partial<Record<DvTier, number>> = { practice: 990 };

/**
 * What the legacy Group product charges, for internal revenue maths only
 * (admin MRR) should a Group subscription ever exist. Never shown or sold.
 */
export const DV_LEGACY_GROUP_MONTHLY_USD = 279;

/**
 * The former founding offer (Practice monthly at $49 for 12 months, code
 * KURUCU100, first 100 clinics). It is closed: nothing offers or applies it.
 * Kept only so admin can still recognise historic founding subscriptions.
 */
export const DV_FOUNDING = { tier: "practice" as DvTier, interval: "month" as DvInterval, priceUsd: 49, months: 12, clinics: 100 };

export const DV_BRAND_ID_DEFAULT = "brnd_0NrVafyQGNiKOz0caOKgm";

/** Env var per sellable product, with the live Dodo product id as default. */
export const DV_PRODUCTS: { tier: DvTier; interval: DvInterval; env: string; fallback: string | null }[] = [
  { tier: "starter", interval: "month", env: "DENTVIDEO_DODO_PRODUCT_STARTER_MONTHLY", fallback: "pdt_0NrVahwZsINvy3TNz2H35" },
  { tier: "practice", interval: "month", env: "DENTVIDEO_DODO_PRODUCT_PRACTICE_MONTHLY", fallback: "pdt_0NrVai0xqpQKU8H3Zj3QN" },
  // Not sold (Group is Contact us; there is no yearly billing): these ids stay
  // only so a stray Group or old yearly payment still maps in the webhook.
  { tier: "group", interval: "month", env: "DENTVIDEO_DODO_PRODUCT_GROUP_MONTHLY", fallback: "pdt_0NrVai5ZNwqFoSZbcfV8S" },
  { tier: "practice", interval: "year", env: "DENTVIDEO_DODO_PRODUCT_PRACTICE_YEARLY", fallback: "pdt_0NrVaiBrxhFhPrt8IbdSu" },
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

/** Which tier/interval pairs can be bought right now (self-serve, monthly, a product id and a list price exist). */
export function dvAvailablePlans(env: Env = process.env): { tier: DvTier; interval: DvInterval; priceUsd: number }[] {
  const out: { tier: DvTier; interval: DvInterval; priceUsd: number }[] = [];
  for (const tier of DV_SELF_SERVE_TIERS) {
    for (const interval of DV_OFFERED_INTERVALS) {
      const priceUsd = DV_PRICES_USD[tier][interval];
      if (priceUsd && dvProductId(tier, interval, env)) out.push({ tier, interval, priceUsd });
    }
  }
  return out;
}

/** The former founding code — admin only, to count its historic uses at Dodo. Never applied at checkout. */
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

/** DentVideo's languages that Dodo's checkout can be forced into (customization.force_language). All eight are supported. */
export const DV_CHECKOUT_LANGUAGES = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"] as const;

export type DvCheckoutPlan =
  | { ok: true; body: Record<string, unknown>; productId: string; discount: string | null }
  | { ok: false; reason: "unavailable" | "contact_sales" };

/**
 * The Dodo `POST /checkouts` body for a clinic's plan. Field names follow
 * https://docs.dodopayments.com/developer-resources/checkout-session:
 * product_cart, customer.email, discount_codes, metadata (copied onto the
 * subscription and every webhook about it), return_url, cancel_url,
 * customization.force_language.
 *
 * Only monthly self-serve plans are sold. No discount code is ever applied by
 * default: discount_codes is sent only when the clinic typed a code itself.
 */
export function buildDvCheckout(input: DvCheckoutInput, env: Env = process.env): DvCheckoutPlan {
  if (!isSelfServeTier(input.tier)) return { ok: false, reason: "contact_sales" };
  const productId = dvProductId(input.tier, input.interval, env);
  const offered = (DV_OFFERED_INTERVALS as readonly string[]).includes(input.interval);
  if (!offered || !productId || !DV_PRICES_USD[input.tier][input.interval]) return { ok: false, reason: "unavailable" };

  const discount = normaliseCode(input.code);
  const base = dvBaseUrl(env);
  // Every DentVideo language is a Dodo checkout language (docs.dodopayments.com/features/checkout#supported-languages:
  // ar, de, en, es, fr, ja, pl, tr among them), so the checkout speaks the clinic's language, not the browser's.
  const lang = input.locale && (DV_CHECKOUT_LANGUAGES as readonly string[]).includes(input.locale) ? input.locale : null;

  const body: Record<string, unknown> = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    ...(input.email ? { customer: { email: input.email } } : {}),
    ...(discount ? { discount_codes: [discount] } : {}),
    metadata: { app: "dentvideo", clinic_id: input.clinicId, owner_id: input.ownerId, plan: input.tier, interval: input.interval },
    return_url: `${base}/app?billing=success`,
    cancel_url: `${base}/app?billing=cancelled`,
    ...(lang ? { customization: { force_language: lang } } : {}),
  };
  return { ok: true, body, productId, discount };
}

/**
 * A Dodo static payment link for the same checkout — no API key needed.
 * https://docs.dodopayments.com/developer-resources/integration-guide :
 * checkout.dodopayments.com/buy/{product_id}?quantity=1&email=…&disableEmail=true
 * &redirect_url=…&metadata_<key>=… (metadata lands on the subscription and its
 * webhooks exactly like the API checkout's). A discount code is typed by the
 * clinic in Dodo's checkout, if they have one.
 */
export function buildDvStaticLink(plan: Extract<DvCheckoutPlan, { ok: true }>, env: Env = process.env): string {
  const host = (env.DODO_ENVIRONMENT ?? "").trim() === "live" ? "https://checkout.dodopayments.com" : "https://test.checkout.dodopayments.com";
  const b = plan.body as { customer?: { email?: string }; metadata: Record<string, string>; return_url: string };
  const q = new URLSearchParams({ quantity: "1" });
  if (b.customer?.email) {
    q.set("email", b.customer.email);
    q.set("disableEmail", "true");
  }
  q.set("redirect_url", b.return_url);
  for (const [k, v] of Object.entries(b.metadata)) q.set(`metadata_${k}`, String(v));
  return `${host}/buy/${plan.productId}?${q.toString()}`;
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
  /** The discount applied to the subscription / payment, when any (Dodo puts the id, not the code). */
  discount_id?: string | null;
  /** Refunds and disputes. */
  dispute_id?: string | null;
  refund_id?: string | null;
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
  // The tier is what was actually bought: the product, which Dodo signs. Never
  // metadata.plan — checkout metadata is set by whoever opens the payment link
  // (a static link takes any metadata_<key> in its query string).
  const tier = dvPlanForProduct(d.product_id, env)?.tier ?? null;
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
  if (t.kind === "deactivate" && current.plan === "trial" && !current.dodo_subscription_id) {
    // A first payment that never went through (failed, on hold, or a checkout subscription
    // cancelled / expired before it activated): the clinic simply stays unpaid.
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
 * Can this clinic have videos made? Only a paying clinic.
 *
 * There is no free week: `trial` means "signed up, not paid yet". Such a
 * clinic sees a live preview of its branded videos (rendered in the browser,
 * no API spend) and chooses a plan; its first week is made right after the
 * payment webhook activates it. Paused or cancelled clinics wait for a plan.
 */
export function canMakeVideos(plan: DvPlanState | string | null | undefined): boolean {
  return plan === "active";
}

/** Should the app offer the plans? Every clinic that is not paying. */
export function needsPlan(plan: DvPlanState | string | null | undefined): boolean {
  return !canMakeVideos(plan);
}

/* ------------------------------------------------------ subscription ledger */

/**
 * A Dodo subscription's status as we last applied it (dentvid_subscriptions,
 * migration 0007). "pending" = a payment arrived before the activation;
 * "lapsed" = our nightly reconciliation found no renewal past the grace.
 * "disputed" = a chargeback paused the clinic (billing-webhook moneyBack); dispute.won lifts it.
 */
export type DvSubStatus = "pending" | "active" | "on_hold" | "paused" | "cancelled" | "expired" | "failed" | "lapsed" | "disputed";

/** Statuses after which Dodo will not charge again (a fresh checkout is safe). */
export const DV_SUB_ENDED: ReadonlySet<string> = new Set(["cancelled", "expired", "failed"]);

/** The subscription status a webhook event reports, or null for events that do not say. */
export function dvEventSubStatus(type: string, d: DodoEventData): DvSubStatus | null {
  switch (type) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.unpaused":
      return "active";
    case "subscription.plan_changed":
      return d.status === "active" ? "active" : null;
    case "subscription.on_hold":
      return "on_hold";
    case "subscription.paused":
      return "paused";
    case "subscription.cancelled":
      return "cancelled";
    case "subscription.expired":
      return "expired";
    case "subscription.failed":
      return "failed";
    default:
      return null;
  }
}

/** When the event happened (Dodo's top-level `timestamp`), as ISO, or null when it does not say. */
export function dvEventTime(evt: { timestamp?: unknown } | null | undefined): string | null {
  const t = typeof evt?.timestamp === "string" ? Date.parse(evt.timestamp) : Number.NaN;
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** An event older than the last one applied to its subscription: ignore it (webhooks arrive out of order). */
export function isStaleEvent(lastEventAt: string | null | undefined, eventAt: string | null | undefined): boolean {
  if (!lastEventAt || !eventAt) return false;
  const last = Date.parse(lastEventAt);
  const at = Date.parse(eventAt);
  return Number.isFinite(last) && Number.isFinite(at) && at < last;
}

export type DvSubRecord = {
  dodo_subscription_id: string;
  clinic_id: string;
  status: DvSubStatus | string;
  product?: string | null;
  tier?: DvTier | null;
  interval?: DvInterval | null;
  discount_id?: string | null;
  founding?: boolean | null;
  period_end?: string | null;
  last_event_at?: string | null;
  last_event_type?: string | null;
  updated_at?: string | null;
};

/**
 * Did this subscription use the (now closed) founding offer? Practice monthly with a
 * discount on it — the discount id must match DENTVIDEO_FOUNDING_DISCOUNT_ID
 * when that is set; without it any discount counts (seats are then counted
 * conservatively, never under-counted).
 */
export function usedFounding(tier: DvTier | null | undefined, interval: string | null | undefined, discountId: string | null | undefined, env: Env = process.env): boolean {
  if (tier !== DV_FOUNDING.tier || interval !== DV_FOUNDING.interval || !discountId) return false;
  // The founding offer has ended (2026-11-13): a discount counts as founding only when it is the
  // configured founding discount. Subscriptions already marked founding keep the flag (billing-webhook).
  const want = env.DENTVIDEO_FOUNDING_DISCOUNT_ID?.trim();
  return !!want && want === discountId;
}

/* ------------------------------------------------------- checkout refusal */

/** How long a paid-but-not-yet-active subscription blocks a second checkout. */
export const DV_PENDING_WINDOW_MS = 30 * 60_000;

export type DvCheckoutBlock =
  | { code: "active" }
  | { code: "pending" }
  | { code: "payment_update" }
  | { code: "disputed" }
  | { code: "cancelled_pending"; until: string };

/**
 * Should a new checkout be refused because the clinic already has a
 * subscription that has not ended? (A second checkout makes a second Dodo
 * subscription: the clinic would be charged twice.)
 *
 *   active               already paying
 *   pending              paid / activated at Dodo within the last 30 min,
 *                        our webhook not applied yet
 *   payment_update       on hold / paused: update the card, don't buy again
 *   disputed             a chargeback paused the clinic: write to us, don't buy again
 *   cancelled_pending    cancelled, but the paid period has not run out
 *
 * `subs` is null when the ledger table is missing (0007 not applied): then
 * only the clinic row is known, and a paused clinic with a subscription id is
 * sent to the "update your card" path. `dodoStatus` is Dodo's live status of
 * the clinic's current subscription when DODO_API_KEY is set; it wins over
 * what is stored.
 */
export function checkoutBlock(args: {
  clinic: { plan: string; dodo_subscription_id?: string | null };
  subs: DvSubRecord[] | null;
  dodoStatus?: string | null;
  now?: Date;
}): DvCheckoutBlock | null {
  const now = (args.now ?? new Date()).getTime();
  const { clinic, subs } = args;
  if (clinic.plan === "active") return { code: "active" };
  const currentId = clinic.dodo_subscription_id ?? null;
  const live = currentId ? args.dodoStatus ?? null : null;
  // A chargeback paused the clinic while its subscription stays live at Dodo (Dodo still says "active"):
  // a new plan would be a second subscription, and "we're confirming your payment" would not be true.
  const disputed = !!subs && !!currentId && subs.some((r) => r.dodo_subscription_id === currentId && r.status === "disputed");
  if (disputed && !(live && DV_SUB_ENDED.has(live))) return { code: "disputed" };
  if (live === "active") return { code: "pending" };
  if (live === "on_hold" || live === "paused") return { code: "payment_update" };
  const currentEnded = !!live && DV_SUB_ENDED.has(live);

  if (subs) {
    for (const r of subs) {
      const updated = Date.parse(r.updated_at ?? r.last_event_at ?? "");
      const recent = Number.isFinite(updated) && now - updated < DV_PENDING_WINDOW_MS;
      if ((r.status === "pending" || r.status === "active") && recent) return { code: "pending" };
    }
    const current = currentId ? subs.find((r) => r.dodo_subscription_id === currentId) : undefined;
    if (current && !currentEnded) {
      if (current.status === "on_hold" || current.status === "paused" || current.status === "lapsed") return { code: "payment_update" };
      if (current.status === "cancelled" && current.period_end && Date.parse(current.period_end) > now) {
        return { code: "cancelled_pending", until: current.period_end };
      }
    }
    return null;
  }

  // No ledger: the clinic row alone. A paused clinic still has a subscription Dodo may retry.
  if (clinic.plan === "paused" && currentId && !currentEnded) return { code: "payment_update" };
  return null;
}
