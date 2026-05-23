import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/publishes
 *
 * Returns the calling user's last 100 publish rows joined with the
 * source clip's hook so the iOS history view can show context without
 * a second round-trip. RLS already scopes to the user — supabase-js
 * filter is belt-and-braces.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .schema("clipforge")
    .from("publishes")
    .select(`
      id,
      platform,
      status,
      scheduled_for,
      published_at,
      external_url,
      error_message,
      caption,
      created_at,
      clip:clips ( hook, thumbnail_path )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten the nested clip relation so the iOS side has a flat row.
  const flat = (data ?? []).map((row) => {
    const clip = (row.clip as { hook?: string; thumbnail_path?: string } | null) ?? null;
    return {
      id: row.id,
      platform: row.platform,
      status: row.status,
      scheduledFor: row.scheduled_for,
      publishedAt: row.published_at,
      externalUrl: row.external_url,
      errorMessage: row.error_message,
      caption: row.caption,
      createdAt: row.created_at,
      clipHook: clip?.hook ?? null,
      clipThumbnailPath: clip?.thumbnail_path ?? null,
    };
  });
  return NextResponse.json({ publishes: flat });
}
