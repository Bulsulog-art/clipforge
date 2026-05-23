import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/channels
 *
 * Returns the calling user's connected social channels, sanitized.
 * NEVER includes access_token / refresh_token — those stay server-side
 * and only get decrypted inside the publish worker.
 *
 * iOS calls this after the OAuth callback returns (or to refresh state).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, platform, username, display_name, expires_at, created_at, meta")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute a coarse health flag so the UI can warn before a token actually
  // fails. Anything within 24h of expiry → "needs_reconnect".
  const now = Date.now();
  const channels = (data ?? []).map((row) => {
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
    const needsReconnect = expiresAt !== null && expiresAt - now < 24 * 60 * 60 * 1000;
    return {
      id: row.id,
      platform: row.platform,
      username: row.username,
      displayName: row.display_name,
      connectedAt: row.created_at,
      expiresAt: row.expires_at,
      needsReconnect,
    };
  });

  return NextResponse.json({ channels });
}
