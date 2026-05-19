import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
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
 * Pricing model — single Plus tier, no Pro:
 *
 *   Plus weekly      $4.99   → 10 credits / week
 *   Plus monthly     $14.99  → 40 credits / month
 *   Plus retention   $12.99  → 40 credits / month  (win-back offer)
 *
 *   Plus-only packs (consumable, gated client-side by entitlement):
 *     Pack 10        $4.99   → 10 credits
 *     Pack 20        $7.99   → 20 credits
 *
 * Apple iade-safe: consumable packs can't be refunded after consume.
 * Margin floor: 71% retention / 75% monthly / 81% weekly (at 40% utilization).
 */
const SUBSCRIPTION_PRODUCTS: Record<
  string,
  { tier: "starter"; credits: number; period: "weekly" | "monthly" }
> = {
  clipforge_plus_weekly:            { tier: "starter", credits: 10, period: "weekly" },
  clipforge_plus_monthly:           { tier: "starter", credits: 40, period: "monthly" },
  clipforge_plus_monthly_retention: { tier: "starter", credits: 40, period: "monthly" },
};

const CONSUMABLE_PRODUCTS: Record<string, number> = {
  clipforge_credits_10: 10,
  clipforge_credits_20: 20,
};

function bearerOk(headerValue: string | null): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!secret || !headerValue) return false;
  const expected = `Bearer ${secret}`;
  // Constant-time compare — a plain !== leaks length & matched-prefix
  // timing information to a remote attacker probing the shared secret.
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!bearerOk(req.headers.get("authorization"))) {
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
