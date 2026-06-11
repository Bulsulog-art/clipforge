import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Kick off the X (Twitter) OAuth 2.0 flow with PKCE. Mirrors the TikTok flow.
 * Needs X_CLIENT_ID / X_CLIENT_SECRET from an X developer app with the
 * tweet.read, tweet.write, users.read, media.write + offline.access scopes.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "X_CLIENT_ID missing" }, { status: 500 });

  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/auth/x/callback", process.env.NEXT_PUBLIC_APP_URL!).toString();

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "";
  const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : "";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read media.write offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const url = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

  const res = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("x_pkce", verifier, { httpOnly: true, secure, sameSite: "lax", maxAge: 600 });
  res.cookies.set("x_state", state, { httpOnly: true, secure, sameSite: "lax", maxAge: 600 });
  if (safeReturnTo) {
    res.cookies.set("oauth_return_to", safeReturnTo, { httpOnly: true, secure, sameSite: "lax", maxAge: 600 });
  }
  return res;
}

/** Open-redirect guard: only clipforge:// deep links or same-origin paths. */
function isSafeReturnTo(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("clipforge://")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  return false;
}
