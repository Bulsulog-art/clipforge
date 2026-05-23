import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Kick off the TikTok OAuth flow with PKCE.
 * Stores code_verifier in a short-lived signed cookie.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return NextResponse.json({ error: "TIKTOK_CLIENT_KEY missing" }, { status: 500 });

  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/auth/tiktok/callback", process.env.NEXT_PUBLIC_APP_URL!).toString();

  // `returnTo` lets the iOS app pass clipforge://oauth/tiktok so the callback
  // can redirect back into the app via ASWebAuthenticationSession. Whitelist
  // to prevent open-redirect attacks: only clipforge:// or same-origin paths.
  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "";
  const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : "";

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic,video.publish,video.upload",
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  const res = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("tiktok_pkce", verifier, { httpOnly: true, secure, sameSite: "lax", maxAge: 600 });
  res.cookies.set("tiktok_state", state, { httpOnly: true, secure, sameSite: "lax", maxAge: 600 });
  if (safeReturnTo) {
    res.cookies.set("oauth_return_to", safeReturnTo, {
      httpOnly: true, secure, sameSite: "lax", maxAge: 600,
    });
  }
  return res;
}

/**
 * Whitelist allowed return-URL forms so a third party can't trick our callback
 * into open-redirecting to an attacker domain. Permitted:
 *   • `clipforge://...`         — iOS deep link
 *   • `/path` (relative)        — same-origin web page
 */
function isSafeReturnTo(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("clipforge://")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  return false;
}
