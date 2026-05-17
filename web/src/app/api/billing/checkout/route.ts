import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// RevenueCat Web Billing routes the actual payment.
// This endpoint resolves the correct paywall URL and signs the user.

const PRODUCT_MAP: Record<string, string> = {
  starter: "clipforge_starter_monthly",
  pro: "clipforge_pro_monthly",
  agency: "clipforge_agency_monthly",
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const tier = new URL(req.url).searchParams.get("tier");
  if (!tier || !PRODUCT_MAP[tier]) {
    return NextResponse.json({ error: "invalid tier" }, { status: 400 });
  }

  const checkoutUrl = new URL("https://pay.rev.cat/" + process.env.REVENUECAT_PUBLIC_WEB_OFFERING_ID);
  checkoutUrl.searchParams.set("app_user_id", user.id);
  checkoutUrl.searchParams.set("product", PRODUCT_MAP[tier]);
  return NextResponse.redirect(checkoutUrl.toString());
}
