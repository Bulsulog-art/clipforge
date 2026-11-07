import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { LIVE_SUBSCRIPTIONS, LIVE_TOPUP } from "@/lib/revenuecat-products";
import { createDodoCheckout, dodoProductId, type PlanKey } from "@/lib/dodo";

// Web payments go through Dodo Payments (hosted checkout). The iOS app keeps
// buying through the App Store / RevenueCat; both land in the same credit
// ledger, keyed by the same catalogue (lib/revenuecat-products).

const SELLABLE = new Set<string>([...LIVE_SUBSCRIPTIONS, LIVE_TOPUP]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appUrl("/login?redirect=/dashboard/billing", req));

  const product = new URL(req.url).searchParams.get("product");
  if (!product || !SELLABLE.has(product)) {
    return NextResponse.json({ error: "invalid product" }, { status: 400 });
  }
  const plan = product as PlanKey;

  // Top-ups are for members only: credits alone don't lift the watermark or
  // the source-length cap, so a pack bought without a plan is a dead end.
  if (plan === LIVE_TOPUP) {
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

  const apiKey = process.env.DODO_API_KEY?.trim();
  const productId = dodoProductId(plan);
  if (!apiKey || !productId) {
    return NextResponse.json(
      { error: "Web checkout is not available yet. Please try again shortly." },
      { status: 503 },
    );
  }

  try {
    const checkoutUrl = await createDodoCheckout({
      apiKey,
      productId,
      plan,
      userId: user.id,
      email: user.email,
      returnUrl: appUrl("/dashboard/billing?checkout=done", req).toString(),
    });
    return NextResponse.redirect(checkoutUrl);
  } catch (e) {
    console.error("[checkout] dodo checkout failed", (e as Error).message);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
