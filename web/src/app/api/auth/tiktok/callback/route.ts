import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = req.cookies.get("tiktok_pkce")?.value;
  const expectedState = req.cookies.get("tiktok_state")?.value;

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(new URL("/dashboard/social?error=tiktok_oauth", url.origin));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  const redirectUri = new URL("/api/auth/tiktok/callback", process.env.NEXT_PUBLIC_APP_URL!).toString();

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    scope?: string;
    error?: string;
  };
  if (!tokenRes.ok || !token.access_token || !token.open_id) {
    console.error("tiktok token error", token);
    return NextResponse.redirect(new URL("/dashboard/social?error=tiktok_token", url.origin));
  }

  // pull display name
  const userInfoRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
  const userInfo = (await userInfoRes.json()) as {
    data?: { user?: { display_name?: string; username?: string; avatar_url?: string } };
  };
  const username = userInfo.data?.user?.username ?? token.open_id;
  const displayName = userInfo.data?.user?.display_name ?? username;

  const svc = createServiceClient();
  await svc.from("social_accounts").upsert(
    {
      user_id: user.id,
      platform: "tiktok",
      external_user_id: token.open_id,
      username,
      display_name: displayName,
      access_token: encryptToken(token.access_token),
      refresh_token: token.refresh_token ? encryptToken(token.refresh_token) : null,
      expires_at: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
      scope: token.scope ?? null,
      meta: { open_id: token.open_id },
    },
    { onConflict: "user_id,platform,external_user_id" },
  );

  const res = NextResponse.redirect(new URL("/dashboard/social?connected=tiktok", url.origin));
  res.cookies.delete("tiktok_pkce");
  res.cookies.delete("tiktok_state");
  return res;
}
