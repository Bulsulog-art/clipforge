import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { bearerEquals } from "@/lib/security";

type RCEvent = {
  type: string;
  app_user_id: string;
  product_id?: string;
  transaction_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  period_type?: "NORMAL" | "TRIAL" | "INTRO" | "PROMOTIONAL";
};

/**
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

export async function POST(req: Request) {
  if (!bearerEquals(req.headers.get("authorization"), process.env.REVENUECAT_WEBHOOK_AUTH)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as { event: RCEvent };
  const evt = payload.event;
  if (!evt) return NextResponse.json({ ok: true });

  const svc = createServiceClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("id")
    .eq("id", evt.app_user_id)
    .maybeSingle();
  if (!profile) {
    // The profile doesn't exist yet. The old code did a no-op update (filtered
    // on a non-existent id) and returned 200 — RevenueCat then marked the event
    // delivered and never retried, so a purchase that raced ahead of signup was
    // LOST (paid, no credits). Anonymous RC ids ($RCAnonymousID:…) never map to
    // a profile, so we acknowledge + drop those. For a real (UUID) app_user_id
    // we return 503 so RevenueCat retries with backoff until the profile is
    // created at signup, at which point the retry processes normally.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      evt.app_user_id ?? "",
    );
    if (!isUuid) return NextResponse.json({ ok: true, ignored: "anonymous" });
    return NextResponse.json(
      { error: "profile not ready — retry", app_user_id: evt.app_user_id },
      { status: 503 },
    );
  }

  switch (evt.type) {
    case "NON_RENEWING_PURCHASE": {
      const amount = CONSUMABLE_PRODUCTS[evt.product_id ?? ""];
      if (!amount) break;
      await svc.rpc("grant_credits", {
        p_user_id: profile.id,
        p_amount: amount,
        p_kind: "purchase",
        p_reason: evt.product_id,
        p_reference: evt.transaction_id,
        p_metadata: { rc_type: evt.type },
      });
      break;
    }

    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION": {
      const sub = SUBSCRIPTION_PRODUCTS[evt.product_id ?? ""];
      if (sub) {
        await svc.rpc("grant_credits", {
          p_user_id: profile.id,
          p_amount: sub.credits,
          p_kind: "subscription_grant",
          p_reason: `${evt.product_id} (${sub.period})`,
          p_reference: evt.transaction_id,
          p_metadata: { period: sub.period, type: evt.type },
        });
        await svc
          .from("profiles")
          .update({ tier: "starter", revenuecat_app_user_id: evt.app_user_id })
          .eq("id", profile.id);
      }
      break;
    }

    case "CANCELLATION":
    case "EXPIRATION":
    case "BILLING_ISSUE":
      await svc.from("profiles").update({ tier: "free" }).eq("id", profile.id);
      break;

    case "REFUND": {
      // Consumable pack refund → claw back credits up to the current balance
      // (already-spent credits can't be reclaimed). record_refund logs the
      // actual amount and is idempotent by transaction.
      const consumable = CONSUMABLE_PRODUCTS[evt.product_id ?? ""];
      if (consumable) {
        await svc.rpc("record_refund", {
          p_user_id: profile.id,
          p_amount: consumable,
          p_reason: `refund ${evt.product_id}`,
          p_reference: evt.transaction_id,
        });
      }
      // Subscription refund → revoke Plus access (same as an expiration).
      if (SUBSCRIPTION_PRODUCTS[evt.product_id ?? ""]) {
        await svc.from("profiles").update({ tier: "free" }).eq("id", profile.id);
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
