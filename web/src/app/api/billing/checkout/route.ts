import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { SUBSCRIPTION_PRODUCTS, CONSUMABLE_PRODUCTS } from "@/lib/revenuecat-products";

// RevenueCat Web Billing routes the actual payment.
// This endpoint resolves the correct paywall URL and signs the user.
//
// CRITICAL: the product IDs here MUST match the ones the RevenueCat webhook
// recognises (web/src/app/api/revenuecat/webhook/route.ts). The old map sold
// `clipforge_{starter,pro,agency}_monthly` — products the webhook knows nothing
// about — so a successful payment granted ZERO credits and never set the tier
// ("paid money grants nothing"). Our real model is a single Plus subscription
// + consumable credit packs. Keep this allowlist in sync with the webhook.
// The two allowlists are derived from the webhook's product table rather than
// retyped here. They used to be separate literals, which is how
// `clipforge_plus_yearly` ended up sellable by the webhook but rejected at
// checkout: the plan we most want people on 400'd as an invalid product. One
// table, two views of it, no drift.
const SELLABLE_SUBSCRIPTIONS = new Set(Object.keys(SUBSCRIPTION_PRODUCTS));

// Credit packs. These are top-ups for existing members, never an entry point:
// credits alone don't lift the watermark or the source-length cap, so someone
// who bought a pack without a subscription would have paid for a dead end.
const SELLABLE_CONSUMABLES = new Set(Object.keys(CONSUMABLE_PRODUCTS));

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appUrl("/login", req));

  const product = new URL(req.url).searchParams.get("product");
  const isSubscription = product ? SELLABLE_SUBSCRIPTIONS.has(product) : false;
  const isConsumable = product ? SELLABLE_CONSUMABLES.has(product) : false;
  if (!product || (!isSubscription && !isConsumable)) {
    return NextResponse.json({ error: "invalid product" }, { status: 400 });
  }

  // Enforce the members-only rule here as well as in the client: the client
  // gate is a courtesy, this one is the actual rule.
  if (isConsumable) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.tier === "free") {
      return NextResponse.json(
        { error: "Credit packs are for Plus members. Start a plan first." },
        { status: 403 },
      );
    }
  }

  const checkoutUrl = new URL("https://pay.rev.cat/" + process.env.REVENUECAT_PUBLIC_WEB_OFFERING_ID);
  checkoutUrl.searchParams.set("app_user_id", user.id);
  checkoutUrl.searchParams.set("product", product);
  return NextResponse.redirect(checkoutUrl.toString());
}
