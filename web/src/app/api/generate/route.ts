import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateQueue } from "@/lib/queue";

/**
 * POST /api/generate — describe a video, get a video.
 *
 * The counterpart to /api/jobs: that one takes a long video apart, this one
 * builds a short one from a sentence. Both land in video_jobs so the app has a
 * single place to poll, and both spend a credit.
 *
 * Nothing here decides what the video looks like. The prompt goes to the
 * worker, which plans it, validates the plan and renders it. This route's only
 * jobs are to check the person may do it, record the row, and enqueue.
 */

/** Enough to describe a video; past this people are pasting scripts. */
const MAX_PROMPT = 500;

/** More attachments than a short video can meaningfully use. */
const MAX_ASSETS = 8;

const Body = z.object({
  prompt: z.string().trim().min(3, "Say a little more about the video").max(MAX_PROMPT),
  /** Storage paths of already-uploaded clips, in the order they should be used. */
  assetPaths: z.array(z.string().min(1).max(400)).max(MAX_ASSETS).optional(),
  aspect: z.enum(["9:16", "1:1", "16:9"]).optional(),
  theme: z.enum(["midnight", "sunrise", "mono", "candy", "editorial"]).optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    // Surface the field message — "Say a little more about the video" is
    // actionable, "Invalid body" is not.
    const message =
      e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid request" : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const svc = createServiceClient();

  // Balance is checked here as well as in the worker. The worker's deduction is
  // the one that counts — it is atomic — but failing at submit time gives the
  // person the paywall immediately instead of a job that queues, starts and
  // dies a minute later.
  const { data: profile } = await svc
    .from("profiles")
    .select("tier, credits_balance")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Account not ready. Try again in a moment." }, { status: 409 });
  }
  if ((profile.credits_balance ?? 0) < 1) {
    return NextResponse.json(
      { error: "You're out of credits. Top up or start a plan to keep generating." },
      { status: 402 },
    );
  }

  // Attachments must belong to the person submitting. The path prefix is the
  // owner's id, so anything else is someone reaching into another account's
  // uploads.
  const assetPaths = body.assetPaths ?? [];
  const foreign = assetPaths.find((p) => !p.startsWith(`${user.id}/`));
  if (foreign) {
    return NextResponse.json({ error: "Attachment does not belong to you" }, { status: 403 });
  }

  const { data: job, error } = await svc
    .from("video_jobs")
    .insert({
      user_id: user.id,
      source_type: "generate",
      clip_prompt: body.prompt,
      aspect_ratio: body.aspect ?? "9:16",
      // Recorded so a retry can rebuild the same video. The queue payload is
      // gone by then, and a retry without these would quietly return a video
      // with the person's own clips missing.
      source_asset_paths: assetPaths.length ? assetPaths : null,
      status: "queued",
      progress: 0,
    })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message ?? "Could not start" }, { status: 500 });
  }

  try {
    await generateQueue.add(
      "generate",
      {
        jobId: job.id,
        userId: user.id,
        prompt: body.prompt,
        assetPaths,
        aspect: body.aspect,
        theme: body.theme,
      },
      {
        jobId: job.id,
        // Two attempts, not three. A render that failed once usually failed
        // for a reason retrying will not fix, and every attempt costs real
        // CPU — unlike a network fetch, this is not cheap to repeat.
        attempts: 2,
        backoff: { type: "exponential", delay: 8000 },
        priority: profile.tier === "free" ? 10 : 1,
      },
    );
  } catch {
    // Redis hiccup. Fail the row rather than leaving a permanently queued job
    // the app would poll forever.
    await svc
      .from("video_jobs")
      .update({ status: "failed", error_message: "Could not queue the job. Please try again." })
      .eq("id", job.id);
    return NextResponse.json({ error: "Could not queue the job. Please try again." }, { status: 503 });
  }

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
