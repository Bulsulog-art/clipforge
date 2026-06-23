import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Start the Instagram OAuth flow via Facebook Login.
 *
 * Instagram Graph API for content publishing requires:
 *   • Meta Developer app with Instagram Graph API product enabled
 *   • App in Live mode (or test users added) for production
 *   • User's IG account must be Professional (Creator or Business),
 *     linked to a Facebook Page they manage
 *
 * Scopes:
 *   • instagram_basic              — read IG profile
 *   • instagram_content_publish    — publish Reels / posts on user's behalf
 *   • pages_show_list              — list FB pages user manages
 *   • pages_read_engagement        — read page info to resolve the IG-Business link
 *   • business_management          — required by IG Graph in 2024+
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/reels-api
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const clientId = process.env.META_APP_ID;
  if (!clientId) {
    const rt = req.nextUrl.searchParams.get("returnTo") ?? "";
    const safe = isSafeReturnTo(rt) ? rt : "";
    const dest = safe
      ? safe + (safe.includes("?") ? "&" : "?") + "error=instagram_not_configured"
      : new URL("/dashboard/social?error=instagram_not_configured", req.url).toString();
    return NextResponse.redirect(dest);
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/auth/instagram/callback", process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).toString();

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "";
  const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : "";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ].join(","),
  });
  const url = `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;

  const res = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("ig_state", state, { httpOnly: true, secure, sameSite: "lax", maxAge: 600 });
  if (safeReturnTo) {
    res.cookies.set("oauth_return_to", safeReturnTo, {
      httpOnly: true, secure, sameSite: "lax", maxAge: 600,
    });
  }
  return res;
}

function isSafeReturnTo(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("clipforge://")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  return false;
}
