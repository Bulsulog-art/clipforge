import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";
import { downloadSource } from "./steps/download.js";
import { transcribe } from "./steps/transcribe.js";
import { scoreMoments } from "./steps/score.js";
import { renderClip } from "./steps/render.js";
import { generateThumbnail } from "./steps/thumbnail.js";
import { sendPush } from "./push.js";

type Payload = {
  jobId: string;
  userId: string;
  sourceType: "upload" | "youtube" | "tiktok_url";
  sourceUrl?: string;
  storagePath?: string;
  niche?: string;
  language?: string;
};

const STAGE_RANGES = {
  queued:        [0, 5],
  transcribing:  [5, 35],
  scoring:       [35, 50],
  rendering:     [50, 98],
  ready:         [100, 100],
} as const;

type Stage = keyof typeof STAGE_RANGES;

async function setProgress(jobId: string, stage: Stage, fraction = 0, extra: Record<string, unknown> = {}) {
  const [lo, hi] = STAGE_RANGES[stage];
  const pct = Math.min(hi, Math.max(lo, Math.round(lo + (hi - lo) * fraction)));
  await supabase.from("video_jobs").update({ status: stage, progress: pct, ...extra }).eq("id", jobId);
}

async function setFailed(jobId: string, message: string) {
  await supabase
    .from("video_jobs")
    .update({ status: "failed", progress: 0, error_message: message.slice(0, 1000) })
    .eq("id", jobId);
}

async function getProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("tier, credits_balance, watermark_enabled")
    .eq("id", userId)
    .single();
  return data as { tier: string; credits_balance: number; watermark_enabled: boolean } | null;
}

async function consumeCredits(userId: string, amount: number, reason: string, reference: string) {
  const { data, error } = await supabase.rpc("consume_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference: reference,
  });
  if (error) {
    if (error.code === "P0001") throw new Error("insufficient_credits");
    throw error;
  }
  return data as number;
}

export async function runVideoPipeline(p: Payload) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `cf-${p.jobId}-`));
  logger.info({ jobId: p.jobId, work, niche: p.niche }, "pipeline start");

  try {
    const profile = await getProfile(p.userId);
    if (!profile) throw new Error("profile not found");

    // Reserve 1 credit upfront so we don't burn API costs on an empty wallet.
    try {
      await consumeCredits(p.userId, 1, "video processing", p.jobId);
    } catch (e) {
      if ((e as Error).message === "insufficient_credits") {
        throw new Error("Not enough credits. Buy more or wait for next month's refill.");
      }
      throw e;
    }

    const watermark = profile.tier === "free" || profile.watermark_enabled !== false;
    const aiThumbnails = profile.tier === "pro" || profile.tier === "agency";

    await setProgress(p.jobId, "transcribing", 0);
    const local = await downloadSource(p, work);
    logger.info({ jobId: p.jobId, dur: local.durationSec, title: local.title }, "downloaded");
    await supabase
      .from("video_jobs")
      .update({ duration_seconds: Math.round(local.durationSec), title: local.title })
      .eq("id", p.jobId);

    await setProgress(p.jobId, "transcribing", 0.4);
    const transcript = await transcribe(local.path, p.language ?? "en");
    await supabase.from("video_jobs").update({ transcript }).eq("id", p.jobId);
    logger.info({ jobId: p.jobId, words: transcript.words.length }, "transcribed");

    await setProgress(p.jobId, "scoring", 0);
    const moments = await scoreMoments({
      transcript,
      niche: p.niche ?? "default",
      maxClips: 12,
      minSec: 25,
      maxSec: 70,
    });
    if (moments.length === 0) {
      throw new Error("No viral moments found. Try a longer or more dynamic source video.");
    }
    logger.info({ jobId: p.jobId, moments: moments.length }, "scored");

    await setProgress(p.jobId, "rendering", 0);

    for (let i = 0; i < moments.length; i++) {
      const m = moments[i];
      try {
        const render = await renderClip({
          userId: p.userId,
          jobId: p.jobId,
          sourcePath: local.path,
          index: i,
          moment: m,
          transcript,
          niche: p.niche ?? "default",
          workDir: work,
          watermark,
        });

        // Mr.Beast-style thumbnail (CPU only — free) — replaces basic peak-frame thumb
        let thumbnailPath = render.thumbnailPath;
        try {
          const thumb = await generateThumbnail({
            userId: p.userId,
            jobId: p.jobId,
            clipIndex: i,
            videoPath: render.renderedFilePath,
            hook: m.hook ?? "",
            niche: p.niche ?? "default",
            durationSec: render.durationSec,
            workDir: work,
            aiBackground: aiThumbnails,
          });
          thumbnailPath = thumb.storagePath;
        } catch (e) {
          logger.warn({ err: (e as Error).message, clip: i }, "thumbnail generation failed — keeping fallback");
        }

        // cleanup local mp4 only after thumbnail is built
        await fs.unlink(render.renderedFilePath).catch(() => {});

        await supabase.from("clips").insert({
          job_id: p.jobId,
          user_id: p.userId,
          index_in_job: i,
          start_seconds: m.start,
          end_seconds: m.end,
          viral_score: m.score,
          hook: m.hook,
          caption: m.caption,
          hashtags: m.hashtags,
          storage_path: render.storagePath,
          thumbnail_path: thumbnailPath,
          duration_seconds: render.durationSec,
          aspect_ratio: "9:16",
          status: "ready",
        });
        logger.info({ jobId: p.jobId, clip: i }, "clip rendered");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error({ jobId: p.jobId, clip: i, error: msg }, "clip render failed — skipping");
        await supabase.from("clips").insert({
          job_id: p.jobId,
          user_id: p.userId,
          index_in_job: i,
          start_seconds: m.start,
          end_seconds: m.end,
          viral_score: m.score,
          hook: m.hook,
          caption: m.caption,
          hashtags: m.hashtags,
          aspect_ratio: "9:16",
          status: "failed",
        });
      }
      await setProgress(p.jobId, "rendering", (i + 1) / moments.length);
    }

    await setProgress(p.jobId, "ready", 1, { finished_at: new Date().toISOString() });
    logger.info({ jobId: p.jobId, clips: moments.length }, "pipeline ready");

    // Push notification
    try {
      await sendPush(p.userId, {
        title: "Your clips are ready! 🎬",
        body: `${moments.length} viral clip${moments.length === 1 ? "" : "s"} just dropped. Tap to share.`,
        data: { jobId: p.jobId, kind: "job_ready" },
      });
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "push notify failed");
    }

    // Low-credit warning
    try {
      const { data: post } = await supabase
        .from("profiles")
        .select("credits_balance, tier")
        .eq("id", p.userId)
        .single();
      const balance = (post?.credits_balance as number) ?? 0;
      if (balance > 0 && balance <= 2) {
        await sendPush(p.userId, {
          title: "Only " + balance + " credit" + (balance === 1 ? "" : "s") + " left",
          body:
            post?.tier === "free"
              ? "Get Plus for 10 credits/week to keep clipping."
              : "Top up with a +10 or +20 pack any time.",
          data: { kind: "low_credits" },
        });
      }
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "low credit check failed");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error({ jobId: p.jobId, err: message }, "pipeline failed");
    await setFailed(p.jobId, message);

    // Refund the upfront credit on failure
    await supabase.rpc("grant_credits", {
      p_user_id: p.userId,
      p_amount: 1,
      p_kind: "admin_grant",
      p_reason: "pipeline failure refund",
      p_reference: p.jobId,
    }).then(() => {}, () => {});

    throw e;
  } finally {
    void fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
