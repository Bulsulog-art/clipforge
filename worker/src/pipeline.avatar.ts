import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "./supabase.js";
import { logger } from "./logger.js";
import { synthesizeSpeech } from "./steps/tts.js";
import { runLipsync } from "./steps/lipsync.js";
import { transcribe } from "./steps/transcribe.js";
import { renderClip } from "./steps/render.js";
import { generateThumbnail } from "./steps/thumbnail.js";
import { pickTrack, downloadTrack } from "./steps/bg-music.js";
import { sendPush } from "./push.js";

export type AvatarPayload = {
  avatarJobId: string;
  userId: string;
};

const AVATAR_COST = 5;

const STAGES = {
  queued:              { range: [0, 5],  label: "queued" },
  synthesizing_voice:  { range: [5, 25], label: "synthesizing_voice" },
  lipsyncing:          { range: [25, 80], label: "lipsyncing" },
  rendering:           { range: [80, 98], label: "rendering" },
  ready:               { range: [100, 100], label: "ready" },
} as const;
type Stage = keyof typeof STAGES;

async function updateProgress(jobId: string, stage: Stage, fraction = 0) {
  const [lo, hi] = STAGES[stage].range;
  const pct = Math.min(hi, Math.max(lo, Math.round(lo + (hi - lo) * fraction)));
  await supabase
    .from("avatar_jobs")
    .update({ status: STAGES[stage].label, progress: pct })
    .eq("id", jobId);
}

async function setFailed(jobId: string, message: string) {
  await supabase
    .from("avatar_jobs")
    .update({ status: "failed", error_message: message.slice(0, 1000) })
    .eq("id", jobId);
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

async function refund(userId: string, amount: number, reason: string, reference: string) {
  await supabase
    .rpc("grant_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_kind: "admin_grant",
      p_reason: reason,
      p_reference: reference,
    })
    .then(() => {}, () => {});
}

/**
 * Stitch a 9:16 letterbox/pillar onto the sadtalker output. SadTalker emits a
 * 512x512 square — we pad to 1080x1920 with a blurred copy of the original
 * frame behind for visual interest.
 */
async function squareTo916(inPath: string, outPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inPath)
      .complexFilter([
        // foreground: scaled square, centered
        "[0:v]scale=1080:1080,setsar=1[fg]",
        // background: same source scaled to fill 1080x1920 + heavy blur
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:1[bg]",
        // overlay foreground at vertical centre
        "[bg][fg]overlay=(W-w)/2:(H-h)/2[v]",
      ])
      .outputOptions(["-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "copy", "-pix_fmt", "yuv420p"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outPath);
  });
}

async function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format.duration ?? 0));
    });
  });
}

export async function runAvatarPipeline(p: AvatarPayload) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `cf-avatar-${p.avatarJobId}-`));
  logger.info({ avatarJobId: p.avatarJobId, work }, "avatar pipeline start");

  try {
    // 1) Load job + resolve portrait URL
    const { data: job, error: jobErr } = await supabase
      .from("avatar_jobs")
      .select("script, voice_id, avatar_id, custom_image_path, niche, bg_music_enabled")
      .eq("id", p.avatarJobId)
      .single();
    if (jobErr || !job) throw new Error(jobErr?.message ?? "avatar job not found");

    let portraitUrl: string | null = null;
    if (job.avatar_id) {
      const { data: av } = await supabase
        .from("avatars")
        .select("image_path")
        .eq("id", job.avatar_id)
        .single();
      if (!av) throw new Error("avatar row missing");
      const { data: signed } = await supabase
        .storage.from("clipforge-avatars")
        .createSignedUrl(av.image_path, 3600);
      portraitUrl = signed?.signedUrl ?? null;
    } else if (job.custom_image_path) {
      const { data: signed } = await supabase
        .storage.from("clipforge-uploads")
        .createSignedUrl(job.custom_image_path, 3600);
      portraitUrl = signed?.signedUrl ?? null;
    }
    if (!portraitUrl) throw new Error("portrait image could not be resolved");

    // 2) Reserve credits
    try {
      await consumeCredits(p.userId, AVATAR_COST, "ai avatar render", p.avatarJobId);
    } catch (e) {
      if ((e as Error).message === "insufficient_credits") {
        throw new Error("You need 5 credits to render an AI avatar. Buy a +10 pack or upgrade to Plus.");
      }
      throw e;
    }

    // 3) ElevenLabs TTS
    await updateProgress(p.avatarJobId, "synthesizing_voice", 0.2);
    const tts = await synthesizeSpeech({
      text: job.script,
      voiceId: job.voice_id,
      workDir: work,
      label: "avatar-voice",
    });
    await updateProgress(p.avatarJobId, "synthesizing_voice", 1.0);

    // Upload audio to temp signed-URL location so Replicate can pull it
    const audioRemote = `avatar-tmp/${randomUUID()}.mp3`;
    {
      const { error } = await supabase
        .storage.from("clipforge-uploads")
        .upload(audioRemote, createReadStream(tts.audioPath) as any, {
          contentType: "audio/mpeg",
          upsert: true,
          duplex: "half",
        } as any);
      if (error) throw error;
    }
    const { data: audioSigned } = await supabase
      .storage.from("clipforge-uploads")
      .createSignedUrl(audioRemote, 3600);
    if (!audioSigned) throw new Error("could not sign audio url");

    // 4) Lip-sync
    await updateProgress(p.avatarJobId, "lipsyncing", 0);
    const lip = await runLipsync({
      portraitUrl,
      audioUrl: audioSigned.signedUrl,
      workDir: work,
      onProgress: (pct) => updateProgress(p.avatarJobId, "lipsyncing", pct),
    });
    await updateProgress(p.avatarJobId, "lipsyncing", 1.0);

    // 5) Letterbox the square sadtalker output into 9:16
    const portrait916 = path.join(work, "lipsync-916.mp4");
    await squareTo916(lip.videoPath, portrait916);

    // 6) Transcribe synthesized audio for word-timed captions
    const transcript = await transcribe(tts.audioPath, "en");
    const totalDur = await probeDuration(portrait916);

    // 7) Optional BG music (matched to niche)
    let bgMusicPath: string | null = null;
    let bgTrackId: string | null = null;
    if (job.bg_music_enabled) {
      const t = await pickTrack({ niche: job.niche ?? "motivation", durationSec: totalDur });
      if (t) {
        const dl = await downloadTrack(t, work);
        if (dl) {
          bgMusicPath = dl.localPath;
          bgTrackId = t.id;
        }
      }
    }

    // 8) Render: reuse the standard render step. Avatar clips don't need
    //    cropping (we already letterboxed), so renderClip's scale+crop pass
    //    is a near-no-op on a 1080x1920 input. Captions + hook + music apply.
    await updateProgress(p.avatarJobId, "rendering", 0.2);
    const render = await renderClip({
      userId: p.userId,
      jobId: p.avatarJobId,
      sourcePath: portrait916,
      index: 0,
      moment: {
        start: 0,
        end: totalDur,
        score: 1.0,
        hook: firstSentence(job.script),
        caption: shorten(job.script, 100),
        hashtags: [],
      },
      transcript,
      niche: job.niche ?? "motivation",
      workDir: work,
      // Free tier still gets the watermark/outro for avatar clips
      watermark: false,
      bgMusicPath,
    });

    // 9) Mr.Beast thumbnail (uses generated mp4)
    let thumbnailPath = render.thumbnailPath;
    try {
      const thumb = await generateThumbnail({
        userId: p.userId,
        jobId: p.avatarJobId,
        clipIndex: 0,
        videoPath: render.renderedFilePath,
        hook: firstSentence(job.script),
        niche: job.niche ?? "motivation",
        durationSec: render.durationSec,
        workDir: work,
        aiBackground: false,
      });
      thumbnailPath = thumb.storagePath;
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "avatar thumbnail failed — keeping fallback");
    }

    await fs.unlink(render.renderedFilePath).catch(() => {});

    // 10) Insert as a regular clip with source_kind='avatar' so it shows up
    //     in the user's library alongside pipeline clips.
    const { data: clipRow, error: clipErr } = await supabase
      .from("clips")
      .insert({
        job_id: null,
        user_id: p.userId,
        index_in_job: 0,
        start_seconds: 0,
        end_seconds: totalDur,
        viral_score: 0.7,
        hook: firstSentence(job.script),
        caption: shorten(job.script, 220),
        hashtags: [],
        storage_path: render.storagePath,
        thumbnail_path: thumbnailPath,
        duration_seconds: render.durationSec,
        aspect_ratio: "9:16",
        status: "ready",
        source_kind: "avatar",
        bg_music_track_id: bgTrackId,
      })
      .select("id")
      .single();
    if (clipErr || !clipRow) throw new Error(`clip insert failed: ${clipErr?.message}`);

    // 11) Finish
    await supabase
      .from("avatar_jobs")
      .update({
        status: "ready",
        progress: 100,
        clip_id: clipRow.id,
        finished_at: new Date().toISOString(),
      })
      .eq("id", p.avatarJobId);

    // Clean up the temp audio upload
    await supabase.storage.from("clipforge-uploads").remove([audioRemote]).then(() => {}, () => {});

    logger.info({ avatarJobId: p.avatarJobId, clipId: clipRow.id }, "avatar pipeline ready");

    // 12) Push notification
    try {
      await sendPush(p.userId, {
        title: "Your AI avatar is ready! 🎙️",
        body: "Tap to watch your talking-head clip.",
        data: { kind: "avatar_ready", clipId: clipRow.id },
      });
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "avatar push failed");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error({ avatarJobId: p.avatarJobId, err: message }, "avatar pipeline failed");
    await setFailed(p.avatarJobId, message);
    await refund(p.userId, AVATAR_COST, "avatar pipeline failure refund", p.avatarJobId);
    throw e;
  } finally {
    void fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

function firstSentence(s: string): string {
  const m = s.match(/^(.{10,120}?[.!?])\s/);
  if (m) return m[1];
  return s.slice(0, 90).trim() + (s.length > 90 ? "…" : "");
}

function shorten(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}
