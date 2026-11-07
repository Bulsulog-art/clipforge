import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { LIVE_SUBSCRIPTIONS, LIVE_TOPUP, webPurchaseUrl } from "@/lib/revenuecat-products";

// RevenueCat Web Purchase Links take the payment; this endpoint picks the
// package, identifies the user and sends them there.
//
// It used to build `pay.rev.cat/<offering id>?app_user_id=…&product=…` from
// REVENUECAT_PUBLIC_WEB_OFFERING_ID — a variable that was never set (the
// deployed one is NEXT_PUBLIC_…, and its value is the offering name
// "default", not a link token), with the user id and product in parameters
// the hosted checkout does not read. No web payment could ever complete.

const SELLABLE = new Set<string>([...LIVE_SUBSCRIPTIONS, LIVE_TOPUP]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appUrl("/login?redirect=/dashboard/billing", req));

  const product = new URL(req.url).searchParams.get("product");
  if (!product || !SELLABLE.has(product)) {
    return NextResponse.json({ error: "invalid product" }, { status: 400 });
  }

  // Top-ups are for members only: credits alone don't lift the watermark or
  // the source-length cap, so a pack bought without a plan is a dead end.
  if (product === LIVE_TOPUP) {
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

  const token = process.env.REVENUECAT_WEB_PURCHASE_LINK_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Web checkout is not available yet. Please try again shortly." },
      { status: 503 },
    );
  }

  return NextResponse.redirect(
    webPurchaseUrl({ token, appUserId: user.id, packageId: product, email: user.email }),
  );
}
