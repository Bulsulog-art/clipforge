import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  verifyDodoWebhook,
  planForDodoProduct,
  subscriptionCredits,
  topupCredits,
} from "@/lib/dodo";
import { isDentvideoEvent } from "@/lib/dentvid/billing";
import { handleDentvideoEvent } from "@/lib/dentvid/billing-webhook";
import { dvAdmin } from "@/lib/dentvid/supabase";

/**
 * POST /api/dodo/webhook — Dodo Payments events (Standard Webhooks).
 *
 *   subscription.active   → Plus on, first period's credits granted
 *   subscription.renewed  → next period's credits granted
 *   subscription.on_hold / cancelled / expired / failed → back to free
 *   payment.succeeded (no subscription) → top-up credits
 *
 * Credits are granted through grant_credits with a reference per billing
 * period (or per payment), which the RPC deduplicates — so Dodo retrying an
 * event, or sending both active and renewed for the same period, never
 * grants twice. Unknown events are acknowledged and ignored.
 *
 * Dodo allows one webhook URL per business, and DentVideo sells through the
 * same business: its events (metadata.app = "dentvideo", or its brand /
 * products) go to lib/dentvid/billing-webhook and never touch ClipForge's
 * profiles or credits.
 */

type DodoCustomer = { email?: string | null };
type DodoData = {
  subscription_id?: string | null;
  payment_id?: string | null;
  product_id?: string | null;
  brand_id?: string | null;
  next_billing_date?: string | null;
  previous_billing_date?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: DodoCustomer | null;
  product_cart?: { product_id: string; quantity?: number }[] | null;
};
type DodoEvent = { type: string; data: DodoData };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = await req.text();
  const ok = verifyDodoWebhook({
    secret: process.env.DODO_WEBHOOK_SECRET ?? "",
    id: req.headers.get("webhook-id"),
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
    body,
  });
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let evt: DodoEvent;
  try {
    evt = JSON.parse(body) as DodoEvent;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const d = evt.data ?? {};

  if (isDentvideoEvent(d)) {
    let db;
    try {
      db = dvAdmin();
    } catch (e) {
      console.error("[dodo:dentvideo] backend not configured", (e as Error).message);
      return NextResponse.json({ error: "dentvideo backend not configured" }, { status: 500 });
    }
    const result = await handleDentvideoEvent(db, evt);
    return NextResponse.json(result.body, { status: result.status });
  }

  const svc = createServiceClient();

  // Who is this? The checkout puts our user id in metadata; the customer's
  // email is the fallback when metadata did not travel with the object.
  const metaUser = typeof d.metadata?.user_id === "string" ? d.metadata.user_id : null;
  let userId: string | null = metaUser && UUID.test(metaUser) ? metaUser : null;
  if (!userId && d.customer?.email) {
    const { data: byEmail } = await svc
      .from("profiles")
      .select("id")
      .ilike("email", d.customer.email)
      .maybeSingle();
    userId = (byEmail?.id as string | undefined) ?? null;
  }
  if (!userId) {
    console.warn("[dodo] event with no matching user", evt.type, d.subscription_id ?? d.payment_id);
    // 200: retrying will not make an unknown customer known.
    return NextResponse.json({ ok: true, ignored: "no user" });
  }

  switch (evt.type) {
    case "subscription.active":
    case "subscription.renewed": {
      const plan = planForDodoProduct(d.product_id);
      const credits = plan ? subscriptionCredits(plan) : null;
      if (!plan || !credits || !d.subscription_id) break;
      // One grant per billing period: previous_billing_date is the start of
      // the period this event pays for.
      const reference = `dodo:sub:${d.subscription_id}:${d.previous_billing_date ?? "initial"}`;
      const { error } = await svc.rpc("grant_credits", {
        p_user_id: userId,
        p_amount: credits,
        p_kind: "subscription_grant",
        p_reason: `${plan} (dodo)`,
        p_reference: reference,
        p_metadata: { provider: "dodo", type: evt.type, subscription_id: d.subscription_id },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await svc.from("profiles").update({ tier: "starter" }).eq("id", userId);
      break;
    }

    case "subscription.on_hold":
    case "subscription.cancelled":
    case "subscription.expired":
    case "subscription.failed": {
      if (!planForDodoProduct(d.product_id)) break;
      await svc.from("profiles").update({ tier: "free" }).eq("id", userId);
      break;
    }

    case "payment.succeeded": {
      // Subscription charges are credited by subscription.active/renewed.
      if (d.subscription_id || !d.payment_id) break;
      let total = 0;
      for (const item of d.product_cart ?? []) {
        const plan = planForDodoProduct(item.product_id);
        const per = plan ? topupCredits(plan) : null;
        if (per) total += per * Math.max(1, item.quantity ?? 1);
      }
      if (total <= 0) break;
      const { error } = await svc.rpc("grant_credits", {
        p_user_id: userId,
        p_amount: total,
        p_kind: "purchase",
        p_reason: "credits top-up (dodo)",
        p_reference: `dodo:pay:${d.payment_id}`,
        p_metadata: { provider: "dodo", payment_id: d.payment_id },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
