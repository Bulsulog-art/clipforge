import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";
import { downloadSource } from "./steps/download.js";
import { transcribe } from "./steps/transcribe.js";
import { scoreMoments } from "./steps/score.js";
import { renderClip } from "./steps/render.js";

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
  await supabase
    .from("video_jobs")
    .update({ status: stage, progress: pct, ...extra })
    .eq("id", jobId);
}

async function setFailed(jobId: string, message: string) {
  await supabase
    .from("video_jobs")
    .update({ status: "failed", progress: 0, error_message: message.slice(0, 1000) })
    .eq("id", jobId);
}

export async function runVideoPipeline(p: Payload) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `cf-${p.jobId}-`));
  logger.info({ jobId: p.jobId, work, niche: p.niche }, "pipeline start");

  try {
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
    logger.info({ jobId: p.jobId, moments: moments.length }, "scored");
    if (moments.length === 0) {
      throw new Error("No viral moments found. Try a different video or longer source.");
    }

    await setProgress(p.jobId, "rendering", 0);

    for (let i = 0; i < moments.length; i++) {
      const m = moments[i];
      try {
        const { storagePath, thumbnailPath, durationSec } = await renderClip({
          userId: p.userId,
          jobId: p.jobId,
          sourcePath: local.path,
          index: i,
          moment: m,
          transcript,
          niche: p.niche ?? "default",
          workDir: work,
        });

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
          storage_path: storagePath,
          thumbnail_path: thumbnailPath,
          duration_seconds: durationSec,
          aspect_ratio: "9:16",
          status: "ready",
        });
        logger.info({ jobId: p.jobId, clip: i }, "clip rendered");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error({ jobId: p.jobId, clip: i, error: msg }, "clip render failed — skipping");
        // record failed clip so user knows
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

    // increment monthly usage quota
    await incrementUsage(p.userId, 1, moments.length).catch((e) =>
      logger.warn({ error: e }, "usage increment failed"),
    );

    await setProgress(p.jobId, "ready", 1, { finished_at: new Date().toISOString() });
    logger.info({ jobId: p.jobId, clips: moments.length }, "pipeline ready");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error({ jobId: p.jobId, err: message }, "pipeline failed");
    await setFailed(p.jobId, message);
    throw e;
  } finally {
    void fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

async function incrementUsage(userId: string, videos: number, clips: number) {
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const period = periodStart.toISOString().slice(0, 10);

  // upsert: insert or add
  const { data: existing } = await supabase
    .from("usage_quotas")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", period)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("usage_quotas")
      .update({
        videos_used: (existing.videos_used as number) + videos,
        clips_generated: (existing.clips_generated as number) + clips,
      })
      .eq("user_id", userId)
      .eq("period_start", period);
  } else {
    await supabase.from("usage_quotas").insert({
      user_id: userId,
      period_start: period,
      videos_used: videos,
      clips_generated: clips,
    });
  }
}
