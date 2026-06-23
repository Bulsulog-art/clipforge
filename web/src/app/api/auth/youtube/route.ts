import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Start the YouTube OAuth flow (Google OAuth 2.0).
 *
 * YouTube Shorts publishing uses YouTube Data API v3 `videos.insert`.
 * Quota cost: 1600 units per upload. Default project quota = 10K/day →
 * ~6 uploads per app per day across all users. Production needs an audit
 * via the YouTube API Services Audit form for higher quotas.
 *
 * Scopes:
 *   • https://www.googleapis.com/auth/youtube.upload   — upload videos
 *   • https://www.googleapis.com/auth/youtube.readonly — read channel info
 *
 * Docs: https://developers.google.com/youtube/v3/guides/auth/installed-apps
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const clientId = process.env.YOUTUBE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // YouTube OAuth isn't configured on this deployment. Fail gracefully back
    // into the app/site with a clear error code instead of a raw 500 JSON that
    // breaks the in-app browser.
    const rt = req.nextUrl.searchParams.get("returnTo") ?? "";
    const safe = isSafeReturnTo(rt) ? rt : "";
    const dest = safe
      ? safe + (safe.includes("?") ? "&" : "?") + "error=youtube_not_configured"
      : new URL("/dashboard/social?error=youtube_not_configured", req.url).toString();
    return NextResponse.redirect(dest);
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/auth/youtube/callback", process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).toString();

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "";
  const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : "";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    // `offline` + `prompt=consent` so we always get back a refresh_token,
    // even on a returning user — Google only ships one on the first consent
    // unless we explicitly re-prompt.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" "),
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const res = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("yt_state", state, { httpOnly: true, secure, sameSite: "lax", maxAge: 600 });
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
