import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/encryption";

/**
 * DELETE /api/channels/:channelId
 *
 * Disconnects a social channel:
 *   1. (Best-effort) revokes the OAuth token with the upstream provider so a
 *      stolen DB row can't continue to publish on the user's behalf even
 *      before we delete it locally.
 *   2. Deletes the social_accounts row (cascades to publishes).
 *
 * Returns 204 on success. Token revoke failures are logged but don't block
 * the delete — local cleanup must always succeed.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: account, error: fetchErr } = await svc
    .from("social_accounts")
    .select("id, user_id, platform, access_token")
    .eq("id", channelId)
    .single();
  if (fetchErr || !account) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }
  if (account.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1) Best-effort upstream revoke (don't fail the delete on a 4xx)
  try {
    const plain = decryptToken(account.access_token);
    await revokeUpstream(account.platform, plain);
  } catch (e) {
    console.warn("upstream revoke failed", { platform: account.platform, error: (e as Error).message });
  }

  // 2) Local delete
  const { error: delErr } = await svc.from("social_accounts").delete().eq("id", channelId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}

async function revokeUpstream(platform: string, accessToken: string): Promise<void> {
  switch (platform) {
    case "tiktok":
      await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
          client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
          token: accessToken,
        }),
      });
      return;
    case "youtube":
      await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(accessToken), {
        method: "POST",
      });
      return;
    case "instagram":
      // Meta has no documented token-revoke endpoint for Page tokens. The
      // user has to disconnect the app from facebook.com/settings/?tab=business_tools
      // to fully revoke. Local delete is the most we can do.
      return;
    default:
      return;
  }
}
