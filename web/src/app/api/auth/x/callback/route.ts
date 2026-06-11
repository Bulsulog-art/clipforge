import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = req.cookies.get("x_pkce")?.value;
  const expectedState = req.cookies.get("x_state")?.value;

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(new URL("/dashboard/social?error=x_oauth", url.origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET!;
  const redirectUri = new URL("/api/auth/x/callback", process.env.NEXT_PUBLIC_APP_URL!).toString();

  // X uses HTTP Basic auth (client_id:client_secret) for confidential clients.
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      client_id: clientId,
    }),
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
  };
  if (!tokenRes.ok || !token.access_token) {
    console.error("x token error", token);
    return NextResponse.redirect(new URL("/dashboard/social?error=x_token", url.origin));
  }

  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = (await meRes.json()) as { data?: { id?: string; username?: string; name?: string } };
  const externalId = me.data?.id;
  if (!externalId) {
    return NextResponse.redirect(new URL("/dashboard/social?error=x_user", url.origin));
  }
  const username = me.data?.username ?? externalId;
  const displayName = me.data?.name ?? username;

  const svc = createServiceClient();
  await svc.from("social_accounts").upsert(
    {
      user_id: user.id,
      platform: "x",
      external_user_id: externalId,
      username,
      display_name: displayName,
      access_token: encryptToken(token.access_token),
      refresh_token: token.refresh_token ? encryptToken(token.refresh_token) : null,
      expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      scope: token.scope ?? null,
      meta: null,
    },
    { onConflict: "user_id,platform,external_user_id" },
  );

  const returnTo = req.cookies.get("oauth_return_to")?.value ?? "";
  const finalUrl = returnTo
    ? appendQuery(returnTo, { connected: "x" })
    : new URL("/dashboard/social?connected=x", url.origin).toString();

  const res = NextResponse.redirect(finalUrl);
  res.cookies.delete("x_pkce");
  res.cookies.delete("x_state");
  res.cookies.delete("oauth_return_to");
  return res;
}

/** Append query params to a returnTo URL (handles clipforge:// + web paths). */
function appendQuery(target: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return target.includes("?") ? `${target}&${qs}` : `${target}?${qs}`;
}
