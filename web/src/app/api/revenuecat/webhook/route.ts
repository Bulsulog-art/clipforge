import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { bearerEquals } from "@/lib/security";
import { SUBSCRIPTION_PRODUCTS, CONSUMABLE_PRODUCTS } from "@/lib/revenuecat-products";

type RCEvent = {
  type: string;
  app_user_id: string;
  product_id?: string;
  transaction_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  period_type?: "NORMAL" | "TRIAL" | "INTRO" | "PROMOTIONAL";
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
