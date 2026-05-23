import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/account/export
 *
 * Returns the calling user's personal data as a downloadable JSON file —
 * GDPR Article 20 (right to data portability) + App Store Review Guideline
 * 5.1.1(v) "data export". The user can save it to Files / iCloud Drive,
 * forward to support, or import elsewhere.
 *
 * Scope: account-level metadata + job / clip / publish / feedback /
 * referral rows + recent analytics events. Media files (rendered MP4s)
 * are NOT bundled inline — they're saved individually via "Save to
 * Photos" inside the app. The export includes storage_path references
 * so the user knows where their media lives.
 *
 * Tokens (social_accounts.access_token) are explicitly excluded so a
 * leaked export can't be replayed to publish on the user's behalf.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();

  // Run reads in parallel — each returns a small list, the heaviest is
  // app_events (capped at 90 days below).
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profile },
    { data: jobs },
    { data: clips },
    { data: derivatives },
    { data: publishes },
    { data: feedback },
    { data: referrals },
    { data: codes },
    { data: channels },
    { data: events },
  ] = await Promise.all([
    svc.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    svc.from("video_jobs").select("*").eq("user_id", user.id),
    svc.from("clips").select("*").eq("user_id", user.id),
    svc.from("clip_derivatives").select("*").eq("user_id", user.id),
    svc.from("publishes").select("*").eq("user_id", user.id),
    svc.from("feedback").select("*").eq("user_id", user.id),
    svc.from("referrals").select("*").or(`inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id}`),
    svc.from("referral_codes").select("*").eq("user_id", user.id),
    svc.from("social_accounts")
      .select("id, platform, username, display_name, expires_at, scope, created_at")
      .eq("user_id", user.id),
    svc.from("app_events").select("event, props, app_version, os_version, created_at")
      .eq("user_id", user.id)
      .gte("created_at", ninetyDaysAgo)
      .order("created_at", { ascending: false }),
  ]);

  const exportDoc = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    user_id: user.id,
    user_email: user.email ?? null,
    media_note:
      "Rendered MP4 files are not bundled inline. Open any clip in the app and tap Save to Photos to download it individually.",
    privacy_note:
      "OAuth tokens for connected channels are intentionally excluded from this export to prevent replay if the file is shared.",
    profile,
    referral_code: codes?.[0] ?? null,
    jobs: jobs ?? [],
    clips: clips ?? [],
    clip_derivatives: derivatives ?? [],
    publishes: publishes ?? [],
    feedback: feedback ?? [],
    referrals: referrals ?? [],
    channels: channels ?? [],
    recent_events: events ?? [],
  };

  const filename = `clipforge-export-${dateStamp()}.json`;
  return new NextResponse(JSON.stringify(exportDoc, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function dateStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}
