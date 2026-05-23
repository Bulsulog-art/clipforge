import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { videoQueue } from "@/lib/queue";

/**
 * POST /api/jobs/:jobId/retry
 *
 * Re-queues a failed video job. Idempotency rules:
 *   • Only `failed` jobs are eligible (queued/processing/ready return 409).
 *   • Any clip rows the previous run partially inserted for this job are
 *     deleted before re-enqueue so the pipeline can rebuild cleanly.
 *   • Credits are NOT re-charged — the failed pipeline already issued a
 *     refund via `refund_credits` in worker/src/pipeline.ts catch block.
 *   • Live Activity for the original run was ended on failure, so a new
 *     Activity can be started by the client when it sees `status=queued`.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: job, error: fetchErr } = await svc
    .from("video_jobs")
    .select("id, user_id, status, source_type, source_url, storage_path, niche, language")
    .eq("id", jobId)
    .single();
  if (fetchErr || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (job.status !== "failed") {
    return NextResponse.json(
      { error: `Only failed jobs can be retried (current: ${job.status})` },
      { status: 409 },
    );
  }

  // Clean partial output. The previous run may have inserted up to N-1 clip
  // rows before failing; delete them so the pipeline starts from a fresh
  // grid. Storage objects are best-effort — clipforge-videos-rendered has
  // overwrite=true upserts in the worker, so leftover files get replaced.
  await svc.from("clips").delete().eq("job_id", jobId);

  // Reset the job state
  const { error: resetErr } = await svc
    .from("video_jobs")
    .update({
      status: "queued",
      progress: 0,
      error_message: null,
      finished_at: null,
    })
    .eq("id", jobId);
  if (resetErr) {
    return NextResponse.json({ error: resetErr.message }, { status: 500 });
  }

  await videoQueue.add(
    "ingest",
    {
      jobId,
      userId: user.id,
      sourceType: job.source_type,
      sourceUrl: job.source_url ?? undefined,
      storagePath: job.storage_path ?? undefined,
      niche: job.niche ?? "motivation",
      language: job.language ?? "en",
    },
    { jobId, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  );

  return NextResponse.json({ ok: true });
}
