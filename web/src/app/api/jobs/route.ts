import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { videoQueue } from "@/lib/queue";
import { isAllowedSourceUrl } from "@/lib/security";

const SourceUrl = z
  .string()
  .url()
  .refine(isAllowedSourceUrl, "sourceUrl must be a YouTube or TikTok link");

const Body = z.object({
  sourceType: z.enum(["youtube", "tiktok_url"]),
  sourceUrl: SourceUrl,
  niche: z.string().min(2).max(40),
  language: z.string().min(2).max(8).default("en"),
  // ClipAnything-style brief: only clip moments matching this request.
  prompt: z.string().trim().max(280).optional(),
  captionStyle: z.enum(["bold-pop", "clean", "neon", "hype", "minimal"]).optional(),
  aspect: z.enum(["9:16", "1:1", "16:9"]).optional(),
  bgMusic: z.boolean().optional().default(true),
  bgMusicMood: z
    .enum(["hype", "chill", "motivational", "dramatic", "lofi", "cinematic", "comedic"])
    .optional(),
  thumbnailStyle: z.enum(["mrbeast", "cinematic", "minimal"]).optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: quota } = await svc
    .from("v_user_quota")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (quota && quota.videos_used >= quota.videos_limit) {
    return NextResponse.json(
      { error: "Monthly limit reached. Upgrade your plan to continue." },
      { status: 402 },
    );
  }

  // Pull tier explicitly so we can prioritise the BullMQ enqueue below
  // (v_user_quota may not surface the tier column reliably).
  const { data: profile } = await svc
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  const userTier = (profile?.tier as string | undefined) ?? "free";

  const { data: job, error } = await svc
    .from("video_jobs")
    .insert({
      user_id: user.id,
      source_type: body.sourceType,
      source_url: body.sourceUrl,
      niche: body.niche,
      language: body.language,
      clip_prompt: body.prompt || null,
      caption_style: body.captionStyle ?? null,
      aspect_ratio: body.aspect ?? null,
      status: "queued",
      bg_music_enabled: body.bgMusic,
      bg_music_mood: body.bgMusicMood ?? null,
    })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message ?? "DB error" }, { status: 500 });
  }

  // BullMQ priority — lower numbers run first. Plus tier jumps the queue
  // when there's contention; free tier waits behind them. Equal priority
  // among same-tier users (BullMQ falls back to FIFO).
  const priority = queuePriorityForTier(userTier);

  try {
    await videoQueue.add(
      "ingest",
      {
        jobId: job.id,
        userId: user.id,
        sourceType: body.sourceType,
        sourceUrl: body.sourceUrl,
        niche: body.niche,
        language: body.language,
        clipPrompt: body.prompt || undefined,
        captionStyle: body.captionStyle,
        aspect: body.aspect,
        thumbnailStyle: body.thumbnailStyle,
      },
      { jobId: job.id, attempts: 3, backoff: { type: "exponential", delay: 5000 }, priority },
    );
  } catch {
    // Redis/queue hiccup: don't leave a permanently-stuck "queued" row that the
    // app would poll forever. Mark it failed so the user sees a clear error +
    // retry instead of an endless spinner.
    await svc
      .from("video_jobs")
      .update({ status: "failed", error_message: "Could not start the job — please try again" })
      .eq("id", job.id);
    return NextResponse.json({ error: "Could not enqueue job, please try again" }, { status: 503 });
  }

  return NextResponse.json({ jobId: job.id });
}

/**
 * BullMQ priority bands. Lower numbers are serviced first. Spread by 10s
 * so future intermediate tiers (e.g. agency=5) fit between bands without
 * a renumbering migration.
 */
function queuePriorityForTier(tier: string | undefined): number {
  switch (tier) {
    case "agency": return 1;
    case "pro":    return 5;
    case "starter": return 10;   // current "Plus" tier
    case "free":
    default:       return 100;
  }
}
