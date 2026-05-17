import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

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
 * Subscription products: grant credits + tier upgrade.
 * Consumable products: grant credits only, refund-safe.
 *
 * Pricing model (USD):
 *   Plus weekly      $4.99  → 10 credits
 *   Plus monthly     $12.99 → 35 credits
 *   Plus retention   $9.99  → 35 credits  (win-back offer)
 *   Pro weekly       $7.99  → 25 credits
 *   Pro monthly      $19.99 → 100 credits
 */
const SUBSCRIPTION_PRODUCTS: Record<
  string,
  { tier: "starter" | "pro" | "agency"; credits: number; period: "weekly" | "monthly" }
> = {
  // Plus tier (entitlement: starter)
  clipforge_plus_weekly:           { tier: "starter", credits: 10,  period: "weekly"  },
  clipforge_plus_monthly:          { tier: "starter", credits: 35,  period: "monthly" },
  clipforge_plus_monthly_retention:{ tier: "starter", credits: 35,  period: "monthly" },

  // Pro tier
  clipforge_pro_weekly:            { tier: "pro",     credits: 25,  period: "weekly"  },
  clipforge_pro_monthly:           { tier: "pro",     credits: 100, period: "monthly" },

  // Agency tier (future)
  clipforge_agency_monthly:        { tier: "agency",  credits: 600, period: "monthly" },
};

const CONSUMABLE_PRODUCTS: Record<string, number> = {
  clipforge_credits_10:  10,
  clipforge_credits_30:  30,
  clipforge_credits_100: 100,
  clipforge_credits_500: 500,
};

const ENTITLEMENT_TO_TIER: Record<string, "starter" | "pro" | "agency"> = {
  starter: "starter",
  plus: "starter",
  pro: "pro",
  agency: "agency",
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH}`) {
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
      }
      // tier upgrade from entitlements
      let tier: "free" | "starter" | "pro" | "agency" = "free";
      for (const id of evt.entitlement_ids ?? []) {
        const candidate = ENTITLEMENT_TO_TIER[id];
        if (candidate && rank(candidate) > rank(tier)) tier = candidate;
      }
      if (tier !== "free") {
        await svc
          .from("profiles")
          .update({ tier, revenuecat_app_user_id: evt.app_user_id })
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
            p_metadata: { warning: "credits may already be consumed" },
          })
          .then(() => {}, () => {});
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}

function rank(t: string) {
  return ({ free: 0, starter: 1, pro: 2, agency: 3 } as const)[t as "free"] ?? 0;
}
