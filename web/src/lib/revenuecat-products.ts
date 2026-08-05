/**
 * What each RevenueCat product is worth, in credits.
 *
 * Lives here rather than beside the webhook because a Next.js `route.ts` may
 * only export request handlers — exporting anything else fails the build with
 * "does not match the required types of a Next.js Route", which `tsc` does not
 * catch. Both the webhook and /api/billing/checkout read from this file, so
 * there is exactly one place where a product's allowance is decided.
 *
 * Pricing model — two subscription terms, one top-up pack.
 *
 *   Plus weekly    $6.99/wk   →  30 credits, refilled weekly   ($0.233/cr)
 *   Plus yearly    $49.99/yr  →  1200 credits, granted on renewal ($0.042/cr)
 *   Top-up         $4.99      →  40 credits, never expire       ($0.125/cr)
 *
 * Monthly was dropped: three terms made the choice harder without adding a
 * reason to buy. Two terms read as "try it" and "commit", which is the only
 * distinction that matters here.
 *
 * WHY THESE NUMBERS
 *
 * One generated video costs us roughly $0.02 at the margin:
 *   GPT-4o-mini scene plan + hook   ~$0.005
 *   TTS narration (when used)       ~$0.010
 *   Whisper transcription            $0      (runs locally, see whisper-service)
 *   Remotion render                 ~$0.002  (our own CPU, amortised)
 *   Storage + egress                ~$0.002
 *
 * Every plan therefore stays profitable even if a subscriber burns their
 * entire allowance, which is the case that actually has to hold — plans sized
 * on "nobody uses it all" are how the top 5% of users bankrupt a product:
 *
 *   Weekly  1560 cr/yr → $31 cost on $363 revenue   → 91% margin
 *   Yearly  1200 cr/yr → $24 cost on $49.99 revenue → 52% margin
 *   Top-up    40 cr    → $0.80 cost on $4.99        → 84% margin
 *
 * Yearly is 5.6× better per credit than weekly. That gap is the point: it
 * pays cash upfront and it is the plan that survives churn.
 *
 * The top-up sits between the two rates. It has to be cheaper per credit than
 * weekly, or a yearly member who runs dry is better off switching to weekly —
 * and dearer than yearly, or it undercuts the plan we most want people on.
 *
 * Top-ups are sold to subscribers only. That is enforced server-side in
 * /api/billing/checkout as well as in the client, because a pack bought
 * without a subscription would be a dead end: the buyer would have credits
 * but still carry a watermark and be capped on source length.
 *
 * Consumables cannot be refunded once consumed, so packs carry no refund risk.
 */
export const SUBSCRIPTION_PRODUCTS: Record<
  string,
  { tier: "starter"; credits: number; period: "weekly" | "monthly" | "yearly" }
> = {
  clipforge_plus_weekly:            { tier: "starter", credits: 30,   period: "weekly"  },
  clipforge_plus_yearly:            { tier: "starter", credits: 1200, period: "yearly"  },
  // Retired terms. Anyone still on one keeps their old allowance until they
  // renew onto a current plan; dropping the entry would silently grant zero.
  clipforge_plus_monthly:           { tier: "starter", credits: 40,   period: "monthly" },
  clipforge_plus_monthly_retention: { tier: "starter", credits: 40,   period: "monthly" },
};

export const CONSUMABLE_PRODUCTS: Record<string, number> = {
  // The one top-up we sell: $4.99 → 40 credits, subscribers only.
  clipforge_credits_topup:   40,
  // Retired packs. Still honoured so a purchase already in flight, or a
  // sandbox transaction, never lands as a silent zero-credit grant.
  clipforge_credits_booster: 10,
  clipforge_credits_power:   30,
  clipforge_credits_pro:     80,
  clipforge_credits_10:      10,
  clipforge_credits_20:      20,
};