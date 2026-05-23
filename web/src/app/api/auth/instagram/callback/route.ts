import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/encryption";

/**
 * Instagram OAuth callback (via Facebook Login).
 *
 * Steps:
 *  1. Exchange `code` for a short-lived FB user access token
 *  2. Upgrade to a long-lived token (60 days) so we don't have to re-prompt soon
 *  3. List Pages the user manages
 *  4. Find the first Page that has a linked Instagram Business/Creator account
 *  5. Store the Page access token + IG-Business user id in social_accounts
 *
 * If the user has no Professional IG account linked to a Page we surface a
 * friendly error rather than persisting an unusable token row.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("ig_state")?.value;

  const returnTo = req.cookies.get("oauth_return_to")?.value ?? "";
  const failUrl = (reason: string) =>
    returnTo
      ? appendQuery(returnTo, { error: reason })
      : new URL(`/dashboard/social?error=${reason}`, url.origin).toString();

  if (!code || !state || state !== expectedState) {
    return clearAndRedirect(failUrl("instagram_oauth"));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    return clearAndRedirect(failUrl("ig_config_missing"));
  }

  const redirectUri = new URL("/api/auth/instagram/callback", process.env.NEXT_PUBLIC_APP_URL!).toString();

  // 1) Exchange code for a short-lived user token
  const tokenRes = await fetch(
    "https://graph.facebook.com/v20.0/oauth/access_token?" +
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
  );
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error("ig token exchange failed", tokenJson);
    return clearAndRedirect(failUrl("ig_token"));
  }

  // 2) Upgrade to long-lived (60d) — saves re-OAuth on the user
  const longRes = await fetch(
    "https://graph.facebook.com/v20.0/oauth/access_token?" +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: tokenJson.access_token,
      }).toString(),
  );
  const longJson = (await longRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const userAccessToken = longJson.access_token ?? tokenJson.access_token;
  const expiresIn = longJson.expires_in ?? tokenJson.expires_in ?? 3600;

  // 3) List the user's Pages
  const pagesRes = await fetch(
    "https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account",
    { headers: { Authorization: `Bearer ${userAccessToken}` } },
  );
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: { id: string };
    }>;
  };

  const pageWithIg = (pagesJson.data ?? []).find((p) => p.instagram_business_account?.id);
  if (!pageWithIg?.instagram_business_account || !pageWithIg.access_token) {
    return clearAndRedirect(failUrl("ig_no_business_account"));
  }

  // 4) Resolve username for display
  const igId = pageWithIg.instagram_business_account.id;
  const igInfoRes = await fetch(
    `https://graph.facebook.com/v20.0/${igId}?fields=username,name,profile_picture_url`,
    { headers: { Authorization: `Bearer ${pageWithIg.access_token}` } },
  );
  const igInfo = (await igInfoRes.json()) as { username?: string; name?: string };

  // 5) Persist — the *Page* token is what we'll use for IG Reels publish.
  // Page tokens issued from a long-lived user token are themselves long-lived.
  const svc = createServiceClient();
  await svc.from("social_accounts").upsert(
    {
      user_id: user.id,
      platform: "instagram",
      external_user_id: igId,
      username: igInfo.username ?? igId,
      display_name: igInfo.name ?? igInfo.username ?? igId,
      access_token: encryptToken(pageWithIg.access_token),
      refresh_token: null,  // Page tokens don't have a refresh — re-OAuth when they expire
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope: "instagram_basic,instagram_content_publish",
      meta: { page_id: pageWithIg.id, page_name: pageWithIg.name ?? null },
    },
    { onConflict: "user_id,platform,external_user_id" },
  );

  const successUrl = returnTo
    ? appendQuery(returnTo, { connected: "instagram" })
    : new URL("/dashboard/social?connected=instagram", url.origin).toString();
  return clearAndRedirect(successUrl);
}

function clearAndRedirect(target: string) {
  const res = NextResponse.redirect(target);
  res.cookies.delete("ig_state");
  res.cookies.delete("oauth_return_to");
  return res;
}

function appendQuery(target: string, extra: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  return target + (target.includes("?") ? "&" : "?") + params.toString();
}
