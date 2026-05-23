import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/encryption";

/**
 * YouTube OAuth callback (Google OAuth 2.0).
 *
 * Steps:
 *  1. Exchange `code` for access_token + refresh_token
 *  2. Fetch the channel id + handle/title for display
 *  3. Persist encrypted tokens in social_accounts (platform="youtube")
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("yt_state")?.value;

  const returnTo = req.cookies.get("oauth_return_to")?.value ?? "";
  const failUrl = (reason: string) =>
    returnTo
      ? appendQuery(returnTo, { error: reason })
      : new URL(`/dashboard/social?error=${reason}`, url.origin).toString();

  if (!code || !state || state !== expectedState) {
    return clearAndRedirect(failUrl("youtube_oauth"));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  const clientId = process.env.YOUTUBE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return clearAndRedirect(failUrl("yt_config_missing"));
  }

  const redirectUri = new URL("/api/auth/youtube/callback", process.env.NEXT_PUBLIC_APP_URL!).toString();

  // 1) Exchange code → access + refresh tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error("youtube token exchange failed", tokenJson);
    return clearAndRedirect(failUrl("yt_token"));
  }

  // 2) Fetch channel info for display
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
  );
  const channelJson = (await channelRes.json()) as {
    items?: Array<{ id: string; snippet?: { title?: string; customUrl?: string } }>;
  };
  const channel = channelJson.items?.[0];
  if (!channel) return clearAndRedirect(failUrl("yt_no_channel"));

  const channelId = channel.id;
  const handle = channel.snippet?.customUrl ?? channelId;
  const title = channel.snippet?.title ?? handle;

  // 3) Persist
  const svc = createServiceClient();
  await svc.from("social_accounts").upsert(
    {
      user_id: user.id,
      platform: "youtube",
      external_user_id: channelId,
      username: handle,
      display_name: title,
      access_token: encryptToken(tokenJson.access_token),
      refresh_token: tokenJson.refresh_token ? encryptToken(tokenJson.refresh_token) : null,
      expires_at: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : null,
      scope: tokenJson.scope ?? null,
      meta: { channel_id: channelId },
    },
    { onConflict: "user_id,platform,external_user_id" },
  );

  const successUrl = returnTo
    ? appendQuery(returnTo, { connected: "youtube" })
    : new URL("/dashboard/social?connected=youtube", url.origin).toString();
  return clearAndRedirect(successUrl);
}

function clearAndRedirect(target: string) {
  const res = NextResponse.redirect(target);
  res.cookies.delete("yt_state");
  res.cookies.delete("oauth_return_to");
  return res;
}

function appendQuery(target: string, extra: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  return target + (target.includes("?") ? "&" : "?") + params.toString();
}
