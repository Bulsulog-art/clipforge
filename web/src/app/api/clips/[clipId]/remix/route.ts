import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { videoQueue } from "@/lib/queue";

/**
 * POST /api/clips/:clipId/remix
 *
 * "This clip worked — make me another like it." Reads the source clip's
 * parent job to grab the same source URL + niche + thumbnail style, then
 * enqueues a brand-new job_id with the same payload. Different score
 * temperature surfaces a different cut of the same source video so the
 * remix isn't a carbon copy.
 *
 * Costs 1 credit (charged inside runVideoPipeline like any other job).
 * No new credit is charged here — pipeline.ts handles consumeCredits +
 * refund-on-failure as usual.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();

  // 1. Find the source clip + ownership check.
  const { data: clip } = await svc
    .from("clips")
    .select("id, user_id, job_id")
    .eq("id", clipId)
    .maybeSingle();
  if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  if (clip.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Pull the original job's payload so we can re-enqueue with identical
  //    source + niche + audio prefs.
  const { data: srcJob } = await svc
    .from("video_jobs")
    .select("source_type, source_url, storage_path, niche, language, bg_music_enabled, bg_music_mood")
    .eq("id", clip.job_id as string)
    .maybeSingle();
  if (!srcJob) {
    return NextResponse.json({ error: "Source job missing" }, { status: 410 });
  }

  // 3. Insert a NEW job_id pointing at the same source. status='queued'
  //    so the user immediately sees a fresh row in Studio.
  const { data: newJob, error: insertErr } = await svc
    .from("video_jobs")
    .insert({
      user_id: user.id,
      source_type: srcJob.source_type,
      source_url: srcJob.source_url,
      storage_path: srcJob.storage_path,
      niche: srcJob.niche,
      language: srcJob.language,
      status: "queued",
      bg_music_enabled: srcJob.bg_music_enabled,
      bg_music_mood: srcJob.bg_music_mood,
    })
    .select("id")
    .single();
  if (insertErr || !newJob) {
    return NextResponse.json({ error: insertErr?.message ?? "DB error" }, { status: 500 });
  }

  // 4. Enqueue. Worker pipeline runs the full score → render flow; the
  //    score temperature variance + the new job_id means moments will be
  //    different from the original.
  try {
    await videoQueue.add(
      "ingest",
      {
        jobId: newJob.id,
        userId: user.id,
        sourceType: srcJob.source_type as "upload" | "youtube" | "tiktok_url",
        sourceUrl: (srcJob.source_url as string | null) ?? undefined,
        storagePath: (srcJob.storage_path as string | null) ?? undefined,
        niche: (srcJob.niche as string | null) ?? "motivation",
        language: (srcJob.language as string | null) ?? "en",
      },
      { jobId: newJob.id, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  } catch {
    await svc
      .from("video_jobs")
      .update({ status: "failed", error_message: "Could not start the remix — please try again" })
      .eq("id", newJob.id);
    return NextResponse.json({ error: "Could not enqueue remix, please try again" }, { status: 503 });
  }

  return NextResponse.json({ jobId: newJob.id });
}
