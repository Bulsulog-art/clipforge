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
 * Pricing model — single Plus tier, no Pro:
 *
 *   Plus weekly      $5.99   → 10 credits / week
 *   Plus monthly     $14.99  → 40 credits / month
 *   Plus yearly      $59.99  → 500 credits / year   (aggressive loyalty price)
 *   Plus retention   $12.99  → 40 credits / month   (win-back offer)
 *
 *   Plus-only packs (consumable, gated client-side by entitlement):
 *     Booster        $9.99   → 10 credits   ($0.999/cr  — emergency top-up)
 *     Power          $19.99  → 30 credits   ($0.666/cr)
 *     Pro            $49.99  → 80 credits   ($0.624/cr  — best pack rate)
 *
 *   Legacy packs (still honored if any old transactions arrive):
 *     clipforge_credits_10 → 10 credits
 *     clipforge_credits_20 → 20 credits
 *
 * Pack pricing is deliberately above subscription per-credit rate so packs
 * never undercut subs — they're for "need credits RIGHT NOW, don't want a
 * recurring charge" moments. Yearly ($0.12/cr) is the absolute best deal,
 * rewarding upfront commitment.
 *
 * Apple iade-safe: consumable packs can't be refunded after consume.
 * Margins after economic stack (faster-whisper local, see worker/whisper-service):
 *   Weekly  81%+
 *   Monthly 75%+
 *   Yearly  66%+ (worst case: 250 face_swaps), 88% realistic mixed usage
 *   Booster pack 95%+ (10 credits × ~$0.05 cost = $0.50 COGS on $9.99 price)
 */
const SUBSCRIPTION_PRODUCTS: Record<
  string,
  { tier: "starter"; credits: number; period: "weekly" | "monthly" | "yearly" }
> = {
  clipforge_plus_weekly:            { tier: "starter", credits: 10,  period: "weekly"  },
  clipforge_plus_monthly:           { tier: "starter", credits: 40,  period: "monthly" },
  clipforge_plus_monthly_retention: { tier: "starter", credits: 40,  period: "monthly" },
  clipforge_plus_yearly:            { tier: "starter", credits: 500, period: "yearly"  },
};

const CONSUMABLE_PRODUCTS: Record<string, number> = {
  // New consumable packs (Apr 2026 pricing refresh)
  clipforge_credits_booster: 10,
  clipforge_credits_power:   30,
  clipforge_credits_pro:     80,
  // Legacy IDs — honored in case any test/sandbox transactions still reference them.
  // Safe to remove once ASC confirms no live products with these IDs exist.
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
    await svc
      .from("profiles")
      .update({ revenuecat_app_user_id: evt.app_user_id })
      .eq("id", evt.app_user_id);
    return NextResponse.json({ ok: true, deferred: true });
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
      const consumable = CONSUMABLE_PRODUCTS[evt.product_id ?? ""];
      if (consumable) {
        await svc
          .rpc("grant_credits", {
            p_user_id: profile.id,
            p_amount: 0,
            p_kind: "refund",
            p_reason: `refund ${evt.product_id}`,
            p_reference: evt.transaction_id,
            p_metadata: { note: "consumable credits may already be spent" },
          })
          .then(() => {}, () => {});
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
