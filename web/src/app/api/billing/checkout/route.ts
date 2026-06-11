import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// RevenueCat Web Billing routes the actual payment.
// This endpoint resolves the correct paywall URL and signs the user.
//
// CRITICAL: the product IDs here MUST match the ones the RevenueCat webhook
// recognises (web/src/app/api/revenuecat/webhook/route.ts). The old map sold
// `clipforge_{starter,pro,agency}_monthly` — products the webhook knows nothing
// about — so a successful payment granted ZERO credits and never set the tier
// ("paid money grants nothing"). Our real model is a single Plus subscription
// + consumable credit packs. Keep this allowlist in sync with the webhook.
// Only products that actually exist in App Store Connect / RevenueCat.
const ALLOWED_PRODUCTS = new Set<string>([
  // Plus subscriptions (set tier=starter + grant period credits)
  "clipforge_plus_weekly",
  "clipforge_plus_monthly",
  "clipforge_plus_monthly_retention",
  // Consumable credit packs (grant credits, no tier change)
  "clipforge_credits_10",
  "clipforge_credits_20",
]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const product = new URL(req.url).searchParams.get("product");
  if (!product || !ALLOWED_PRODUCTS.has(product)) {
    return NextResponse.json({ error: "invalid product" }, { status: 400 });
  }

  const checkoutUrl = new URL("https://pay.rev.cat/" + process.env.REVENUECAT_PUBLIC_WEB_OFFERING_ID);
  checkoutUrl.searchParams.set("app_user_id", user.id);
  checkoutUrl.searchParams.set("product", product);
  return NextResponse.redirect(checkoutUrl.toString());
}
