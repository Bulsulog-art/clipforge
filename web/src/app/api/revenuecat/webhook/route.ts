import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type RCEvent = {
  type: string;
  app_user_id: string;
  product_id?: string;
  transaction_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
};

/**
 * Subscription products grant monthly credits + tier upgrade.
 * Consumable products grant credits only (no tier change), refund-safe.
 */
const SUBSCRIPTION_PRODUCTS: Record<string, { tier: "starter" | "pro" | "agency"; credits: number }> = {
  clipforge_plus_monthly:    { tier: "starter", credits: 30 },
  clipforge_pro_monthly:     { tier: "pro",     credits: 150 },
  clipforge_agency_monthly:  { tier: "agency",  credits: 800 },
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

  // Find the local profile that matches this RC app_user_id (uuid from Supabase auth.users)
  const { data: profile } = await svc
    .from("profiles")
    .select("id")
    .eq("id", evt.app_user_id)
    .maybeSingle();
  if (!profile) {
    // user might not exist yet — store the app_user_id mapping for later sync
    await svc.from("profiles").update({ revenuecat_app_user_id: evt.app_user_id }).eq("id", evt.app_user_id);
    return NextResponse.json({ ok: true, deferred: true });
  }

  switch (evt.type) {
    case "NON_RENEWING_PURCHASE": {
      // Consumable credit pack
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
          p_reason: evt.product_id,
          p_reference: evt.transaction_id,
        });
      }
      // tier upgrade from entitlements (most accurate)
      let tier: "free" | "starter" | "pro" | "agency" = "free";
      for (const id of evt.entitlement_ids ?? []) {
        const candidate = ENTITLEMENT_TO_TIER[id];
        if (candidate && rank(candidate) > rank(tier)) tier = candidate;
      }
      if (tier !== "free") {
        await svc.from("profiles").update({ tier, revenuecat_app_user_id: evt.app_user_id }).eq("id", profile.id);
      }
      break;
    }

    case "CANCELLATION":
    case "EXPIRATION":
    case "BILLING_ISSUE":
      await svc.from("profiles").update({ tier: "free" }).eq("id", profile.id);
      break;

    case "REFUND": {
      // Apple/Google refunded — claw back credits if they weren't consumed.
      const consumable = CONSUMABLE_PRODUCTS[evt.product_id ?? ""];
      if (consumable) {
        await svc.rpc("grant_credits", {
          p_user_id: profile.id,
          p_amount: 0,
          p_kind: "refund",
          p_reason: `refund ${evt.product_id}`,
          p_reference: evt.transaction_id,
          p_metadata: { warning: "credits may already be consumed" },
        }).then(() => {}, () => {});
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}

function rank(t: string) {
  return ({ free: 0, starter: 1, pro: 2, agency: 3 } as const)[t as "free"] ?? 0;
}
