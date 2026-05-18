import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { buildKaraokeASS, buildHookASS } from "./captions.js";
import type { Moment } from "./score.js";
import type { Transcript } from "./transcribe.js";

type Args = {
  userId: string;
  jobId: string;
  sourcePath: string;
  index: number;
  moment: Moment;
  transcript: Transcript;
  niche: string;
  workDir: string;
  /** Free tier renders include the ClipForge watermark in the corner. */
  watermark?: boolean;
  /** Optional background music file (already downloaded to local disk). */
  bgMusicPath?: string | null;
  /** Music level (0..1). Defaults to 0.16 for plenty of headroom under voice. */
  bgMusicVolume?: number;
};

export type RenderResult = {
  storagePath: string;
  thumbnailPath: string;
  durationSec: number;
  /** Local path to the rendered MP4 (so a later step can build an AI thumbnail). */
  renderedFilePath: string;
};

export async function renderClip(a: Args): Promise<RenderResult> {
  const out = path.join(a.workDir, `clip-${a.index}.mp4`);
  const thumb = path.join(a.workDir, `clip-${a.index}.jpg`);
  const captionFile = path.join(a.workDir, `clip-${a.index}.ass`);
  const hookFile = path.join(a.workDir, `clip-${a.index}-hook.ass`);

  const duration = a.moment.end - a.moment.start;

  // 1) Generate ASS subtitles (karaoke word-by-word + hook overlay)
  await Promise.all([
    fs.writeFile(
      captionFile,
      buildKaraokeASS(a.transcript.words, a.niche, a.moment.start, a.moment.end),
    ),
    fs.writeFile(hookFile, buildHookASS(a.moment.hook ?? "", duration, a.niche)),
  ]);

  // 2) FFmpeg render: cut → scale → crop 9:16 → burn captions + hook → loudnorm
  // Free tier gets a bottom-right wordmark AND a forced 1.4s 'Made with ClipForge'
  // outro overlay that fades in over the last 2 seconds.
  const watermarkFilter = a.watermark
    ? [
        `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
          `text='Made with ClipForge':fontcolor=white:fontsize=42:` +
          `borderw=3:bordercolor=black@0.9:` +
          `x=(w-text_w)/2:y=h-text_h-90:` +
          `alpha='if(lt(t,${(duration - 2).toFixed(2)}),0,if(lt(t,${(duration - 1.4).toFixed(2)}),(t-${(duration - 2).toFixed(2)})/0.6,1))'`,
        `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
          `text='clipforge.bulsulabs.xyz':fontcolor=white@0.85:fontsize=26:` +
          `borderw=2:bordercolor=black@0.7:` +
          `x=(w-text_w)/2:y=h-text_h-50:` +
          `alpha='if(lt(t,${(duration - 2).toFixed(2)}),0,if(lt(t,${(duration - 1.4).toFixed(2)}),(t-${(duration - 2).toFixed(2)})/0.6,0.85))'`,
      ].join(",")
    : null;

  // Build complex filter chain. Single-input variant for voice-only;
  // two-input variant when bg music is mixed in.
  const videoChain = [
    "scale=-2:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    `ass=${escapePath(captionFile)}`,
    `ass=${escapePath(hookFile)}`,
    ...(watermarkFilter ? [watermarkFilter] : []),
  ].join(",");

  const voiceChain = "loudnorm=I=-16:LRA=11:TP=-1.5,highpass=f=80,lowpass=f=12000";

  const musicVolume = Math.max(0.05, Math.min(0.4, a.bgMusicVolume ?? 0.16));
  const hasMusic = Boolean(a.bgMusicPath);

  // afade out across the last 1s so music doesn't snap to silence.
  const fadeOutStart = Math.max(0, duration - 1.0).toFixed(2);

  const complexFilter = hasMusic
    ? [
        `[0:v]${videoChain}[v]`,
        `[0:a]${voiceChain}[voice]`,
        `[1:a]aloop=loop=-1:size=2e+09,atrim=duration=${duration.toFixed(2)},` +
          `volume=${musicVolume.toFixed(2)},` +
          `afade=t=in:st=0:d=0.6,` +
          `afade=t=out:st=${fadeOutStart}:d=1.0[bg]`,
        `[voice][bg]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
      ].join(";")
    : [`[0:v]${videoChain}[v]`, `[0:a]${voiceChain}[aout]`].join(";");

  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg(a.sourcePath).setStartTime(a.moment.start).duration(duration);
    if (hasMusic && a.bgMusicPath) cmd.input(a.bgMusicPath);

    cmd
      .complexFilter(complexFilter)
      .outputOptions([
        "-map", "[v]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-profile:v", "high",
        "-level", "4.0",
      ])
      .on("start", (line) => logger.debug({ jobId: a.jobId, clip: a.index, line }, "ffmpeg start"))
      .on("stderr", (line) => {
        if (line.includes("[Parsed_ass") && line.includes("font")) {
          logger.warn({ line }, "ass font notice");
        }
      })
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });

  // 3) Quick fallback thumbnail (peak frame). Real Mr.Beast-style thumb is generated by thumbnail.ts.
  await new Promise<void>((resolve, reject) => {
    ffmpeg(out)
      .seekInput(Math.min(0.4 + duration * 0.12, duration - 0.1))
      .frames(1)
      .size("540x960")
      .on("end", () => resolve())
      .on("error", reject)
      .save(thumb);
  });

  // 4) Upload both to Supabase Storage
  const storagePath = `${a.userId}/${a.jobId}/clip-${a.index}.mp4`;
  const thumbPath = `${a.userId}/${a.jobId}/clip-${a.index}.jpg`;

  const [vRes, tRes] = await Promise.all([
    supabase.storage.from("clipforge-videos-rendered").upload(storagePath, createReadStream(out) as any, {
      contentType: "video/mp4",
      upsert: true,
      duplex: "half",
    } as any),
    supabase.storage.from("clipforge-thumbnails").upload(thumbPath, createReadStream(thumb) as any, {
      contentType: "image/jpeg",
      upsert: true,
      duplex: "half",
    } as any),
  ]);
  if (vRes.error) throw vRes.error;
  if (tRes.error) throw tRes.error;

  await Promise.all([
    fs.unlink(thumb).catch(() => {}),
    fs.unlink(captionFile).catch(() => {}),
    fs.unlink(hookFile).catch(() => {}),
  ]);

  return { storagePath, thumbnailPath: thumbPath, durationSec: duration, renderedFilePath: out };
}

function escapePath(p: string) {
  // FFmpeg filter strings need colons escaped on the ass= filename
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
