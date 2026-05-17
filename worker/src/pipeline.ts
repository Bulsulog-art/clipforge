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

async function setStatus(jobId: string, status: string, progress: number, extra: Record<string, unknown> = {}) {
  await supabase
    .from("video_jobs")
    .update({ status, progress, ...extra })
    .eq("id", jobId);
}

export async function runVideoPipeline(p: Payload) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `cf-${p.jobId}-`));
  logger.info({ jobId: p.jobId, work }, "pipeline start");

  try {
    await setStatus(p.jobId, "transcribing", 5);
    const local = await downloadSource(p, work);
    logger.info({ jobId: p.jobId, local: local.path, dur: local.durationSec }, "downloaded");

    await supabase
      .from("video_jobs")
      .update({ duration_seconds: Math.round(local.durationSec), title: local.title })
      .eq("id", p.jobId);

    await setStatus(p.jobId, "transcribing", 20);
    const transcript = await transcribe(local.path, p.language ?? "en");
    await supabase
      .from("video_jobs")
      .update({ transcript })
      .eq("id", p.jobId);

    await setStatus(p.jobId, "scoring", 40);
    const moments = await scoreMoments({
      transcript,
      niche: p.niche ?? "motivation",
      maxClips: 12,
      minSec: 25,
      maxSec: 70,
    });

    await setStatus(p.jobId, "rendering", 55);

    for (let i = 0; i < moments.length; i++) {
      const m = moments[i];
      const { storagePath, thumbnailPath, durationSec } = await renderClip({
        userId: p.userId,
        jobId: p.jobId,
        sourcePath: local.path,
        index: i,
        moment: m,
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

      await setStatus(p.jobId, "rendering", 55 + Math.round(((i + 1) / moments.length) * 40));
    }

    await setStatus(p.jobId, "ready", 100, { finished_at: new Date().toISOString() });

    await supabase.rpc("increment_usage", { p_user: p.userId, p_videos: 1, p_clips: moments.length }).then(
      () => null,
      () => null, // RPC opsiyonel; yoksa client-side increment
    );

    logger.info({ jobId: p.jobId, clips: moments.length }, "pipeline ready");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error({ jobId: p.jobId, err: message }, "pipeline failed");
    await setStatus(p.jobId, "failed", 0, { error_message: message });
    throw e;
  } finally {
    void fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
