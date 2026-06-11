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
import { pickTrack, downloadTrack, type MusicTrack } from "./steps/bg-music.js";
import { sendPush } from "./push.js";

type Payload = {
  jobId: string;
  userId: string;
  sourceType: "upload" | "youtube" | "tiktok_url";
  sourceUrl?: string;
  storagePath?: string;
  niche?: string;
  language?: string;
  /**
   * Optional ClipAnything-style brief. When set, scoreMoments only keeps
   * clips matching the user's request ("every time I mention pricing").
   */
  clipPrompt?: string;
  /** Caption style id (bold-pop | clean | neon | hype | minimal). */
  captionStyle?: string;
  /**
   * User-picked thumbnail style. Switches the FFmpeg compose recipe in
   * `generateThumbnail`. Default `mrbeast` matches the prior behaviour.
   */
  thumbnailStyle?: "mrbeast" | "cinematic" | "minimal";
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
        throw new Error("You've used your free clip. Upgrade to Plus for 10 credits/week.");
      }
      throw e;
    }

    const watermark = profile.tier === "free" || profile.watermark_enabled !== false;
    const aiThumbnails = profile.tier === "starter" || profile.tier === "pro" || profile.tier === "agency";
    const maxSourceSec = profile.tier === "free" ? 300 : 5400; // 5 min free, 90 min paid

    // Resolve custom branding (Plus only). If the user set a logo, download
    // it once for the whole job and pass it to every renderClip call —
    // overlays as a corner watermark instead of the default outro.
    let brandingArgs: { localLogoPath: string; position: string; opacity: number } | undefined;
    if (profile.tier !== "free") {
      const { data: brandingRow } = await supabase
        .from("clip_branding")
        .select("logo_path, position, opacity")
        .eq("user_id", p.userId)
        .maybeSingle();
      if (brandingRow?.logo_path) {
        try {
          const { data: signed } = await supabase.storage
            .from("clipforge-faces")
            .createSignedUrl(brandingRow.logo_path as string, 60 * 60);
          if (signed?.signedUrl) {
            const ext = (brandingRow.logo_path as string).split(".").pop() ?? "png";
            const localLogoPath = path.join(work, `branding-logo.${ext}`);
            const dl = await fetch(signed.signedUrl);
            if (dl.ok) {
              await fs.writeFile(localLogoPath, Buffer.from(await dl.arrayBuffer()));
              brandingArgs = {
                localLogoPath,
                position: (brandingRow.position as string) ?? "bottom-right",
                opacity: Number(brandingRow.opacity ?? 0.85),
              };
              logger.info({ jobId: p.jobId, position: brandingArgs.position }, "custom branding loaded");
            }
          }
        } catch (e) {
          logger.warn({ jobId: p.jobId, err: (e as Error).message }, "branding load failed — rendering without logo");
        }
      }
    }

    await setProgress(p.jobId, "transcribing", 0);
    const local = await downloadSource(p, work);
    logger.info({ jobId: p.jobId, dur: local.durationSec, title: local.title }, "downloaded");

    if (local.durationSec > maxSourceSec) {
      throw new Error(
        profile.tier === "free"
          ? `Free tier supports videos up to 5 minutes. Upgrade to Plus for hour-long sources.`
          : `Source video is too long (${Math.round(local.durationSec / 60)} min). Max 90 min.`,
      );
    }

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
      userPrompt: p.clipPrompt,
    });
    if (moments.length === 0) {
      throw new Error("No viral moments found. Try a longer or more dynamic source video.");
    }
    logger.info({ jobId: p.jobId, moments: moments.length }, "scored");

    // Resolve a single BG music track for the whole job so all clips share the
    // same sonic identity. Free tier always gets music (brand recall); Plus
    // respects the per-job toggle.
    const { data: jobRow } = await supabase
      .from("video_jobs")
      .select("bg_music_enabled, bg_music_mood")
      .eq("id", p.jobId)
      .single();
    // Global kill switch — set BG_MUSIC_ENABLED_GLOBAL=false in Coolify worker
    // env until real CC0 tracks are uploaded. Default is OFF so the procedural
    // sine-pad seed catalog never reaches the reviewer's ears.
    const musicGlobalEnabled = process.env.BG_MUSIC_ENABLED_GLOBAL === "true";
    const jobMusicEnabled = profile.tier === "free"
      ? true
      : (jobRow?.bg_music_enabled as boolean | null) !== false;
    const musicEnabled = musicGlobalEnabled && jobMusicEnabled;
    let pickedTrack: MusicTrack | null = null;
    let pickedTrackPath: string | null = null;
    if (musicEnabled) {
      try {
        // Average clip length is bounded by score.ts (25–70s). Use the longest
        // moment as the target so the track is long enough to never need a loop.
        const target = Math.max(...moments.map((m) => m.end - m.start));
        pickedTrack = await pickTrack({
          niche: p.niche ?? "default",
          durationSec: target,
          mood: (jobRow?.bg_music_mood as string | null) ?? null,
        });
        if (pickedTrack) {
          const dl = await downloadTrack(pickedTrack, work);
          pickedTrackPath = dl?.localPath ?? null;
          logger.info(
            { jobId: p.jobId, track: pickedTrack.name, mood: pickedTrack.mood, file: !!pickedTrackPath },
            pickedTrackPath ? "bg music ready" : "bg music track row found but file missing — skipping",
          );
        } else {
          logger.info({ jobId: p.jobId, niche: p.niche }, "no bg music track matched — skipping");
        }
      } catch (e) {
        logger.warn({ jobId: p.jobId, err: (e as Error).message }, "bg music selection failed — rendering without music");
      }
    }

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
          captionStyle: p.captionStyle,
          workDir: work,
          // When custom branding is set, suppress the default outro/wordmark
          // so the user's logo isn't fighting our own.
          watermark: watermark && !brandingArgs,
          branding: brandingArgs,
          bgMusicPath: pickedTrackPath,
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
            style: p.thumbnailStyle ?? "mrbeast",
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
          bg_music_track_id: pickedTrackPath ? pickedTrack?.id ?? null : null,
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

    // Push notification — include the top clip's thumbnail so the alert
    // renders as a rich notification (image inline + larger expansion).
    try {
      const thumbnailUrl = await pickThumbnailForJob(p.jobId);
      await sendPush(p.userId, {
        title: "Your clips are ready! 🎬",
        body: `${moments.length} viral clip${moments.length === 1 ? "" : "s"} just dropped. Tap to share.`,
        data: { jobId: p.jobId, kind: "job_ready" },
        attachmentUrl: thumbnailUrl,
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

/**
 * Pick a thumbnail to embed in the "your clips are ready" push notification.
 * Prefer the highest viral_score clip with a thumbnail_path; sign that path
 * for 24h. Returns undefined if no thumb is available — sendPush will then
 * fall back to a plain text alert.
 */
async function pickThumbnailForJob(jobId: string): Promise<string | undefined> {
  const { data: clip } = await supabase
    .from("clips")
    .select("thumbnail_path")
    .eq("job_id", jobId)
    .eq("status", "ready")
    .not("thumbnail_path", "is", null)
    .order("viral_score", { ascending: false })
    .limit(1)
    .maybeSingle();
  const thumbPath = clip?.thumbnail_path as string | undefined;
  if (!thumbPath) return undefined;

  const { data: signed } = await supabase.storage
    .from("clipforge-videos-rendered")
    .createSignedUrl(thumbPath, 24 * 60 * 60);
  return signed?.signedUrl;
}
