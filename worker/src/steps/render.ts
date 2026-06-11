import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { buildKaraokeASS, buildHookASS } from "./captions.js";
import { planJumpCut, selectExpr } from "./jumpcut.js";
import { resolveAspect } from "../aspect.js";
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
  /** Caption style id (bold-pop | clean | neon | hype | minimal). */
  captionStyle?: string;
  /** Remove internal silences ("jump cuts"). Off by default; render-test gated. */
  jumpCut?: boolean;
  /** Output aspect: 9:16 (default) | 1:1 | 16:9. */
  aspect?: string;
  /** Face-tracking crop x-offset (px). Undefined = centre crop (default). */
  faceCropX?: number;
  workDir: string;
  /** Free tier renders include the ClipForge watermark in the corner. */
  watermark?: boolean;
  /** Optional background music file (already downloaded to local disk). */
  bgMusicPath?: string | null;
  /** Music level (0..1). Defaults to 0.16 for plenty of headroom under voice. */
  bgMusicVolume?: number;
  /** Plus-tier custom branding. Logo image is composited as a corner watermark. */
  branding?: {
    localLogoPath: string;
    position: string;   // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    opacity: number;    // 0.10..1.00
  };
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

  // Optional jump-cut: remove internal silences. plan===null → render unchanged.
  const plan = a.jumpCut ? planJumpCut(a.transcript.words, a.moment.start, a.moment.end) : null;
  const duration = plan ? plan.keptDuration : a.moment.end - a.moment.start;

  // 1) Generate ASS subtitles (karaoke word-by-word + hook overlay). With
  // jump-cut on, captions come from the remapped (compressed-timeline) words so
  // they stay perfectly in sync with the cut video.
  await Promise.all([
    fs.writeFile(
      captionFile,
      plan
        ? buildKaraokeASS(plan.words, a.niche, 0, plan.keptDuration, a.captionStyle, a.moment.keywords, a.aspect)
        : buildKaraokeASS(a.transcript.words, a.niche, a.moment.start, a.moment.end, a.captionStyle, a.moment.keywords, a.aspect),
    ),
    fs.writeFile(hookFile, buildHookASS(a.moment.hook ?? "", duration, a.niche, a.aspect)),
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
          `text='Make yours free at clipforge.bulsulabs.xyz':fontcolor=white@0.85:fontsize=26:` +
          `borderw=2:bordercolor=black@0.7:` +
          `x=(w-text_w)/2:y=h-text_h-50:` +
          `alpha='if(lt(t,${(duration - 2).toFixed(2)}),0,if(lt(t,${(duration - 1.4).toFixed(2)}),(t-${(duration - 2).toFixed(2)})/0.6,0.85))'`,
      ].join(",")
    : null;

  // Build complex filter chain. Single-input variant for voice-only;
  // two-input variant when bg music is mixed in.
  // When jump-cut is on, keep only the speech segments and renumber frame PTS
  // so they concatenate seamlessly — BEFORE scaling/captioning.
  const videoJump = plan ? [`select='${selectExpr(plan.segments)}'`, "setpts=N/FRAME_RATE/TB"] : [];
  const audioJump = plan ? `aselect='${selectExpr(plan.segments)}',asetpts=N/SR/TB,` : "";
  // scale + crop to the chosen aspect (default 9:16). With a face-track offset,
  // shift the crop window horizontally to keep the speaker framed.
  const baseScaleCrop = resolveAspect(a.aspect).scaleCrop;
  const scaleCrop = a.faceCropX != null
    ? baseScaleCrop.replace(/crop=(\d+):(\d+)/, `crop=$1:$2:${Math.max(0, Math.round(a.faceCropX))}:0`)
    : baseScaleCrop;
  const videoChain = [
    ...videoJump,
    scaleCrop,
    `ass=${escapePath(captionFile)}`,
    `ass=${escapePath(hookFile)}`,
    ...(watermarkFilter ? [watermarkFilter] : []),
  ].join(",");

  // afftdn = gentle FFT denoise (removes hiss/room tone) BEFORE loudness
  // normalization, so podcast/phone audio comes out clean — the "studio
  // enhance" we advertise. Conservative noise floor so we never chew voice.
  const voiceChain = "afftdn=nf=-25,loudnorm=I=-16:LRA=11:TP=-1.5,highpass=f=80,lowpass=f=12000";

  const musicVolume = Math.max(0.05, Math.min(0.4, a.bgMusicVolume ?? 0.16));
  const hasMusic = Boolean(a.bgMusicPath);
  const hasBranding = Boolean(a.branding);

  // afade out across the last 1s so music doesn't snap to silence.
  const fadeOutStart = Math.max(0, duration - 1.0).toFixed(2);

  // Input index for the branding logo. Music takes [1] when present, so
  // branding lands at [2] if both are set, otherwise [1].
  const brandingInputIdx = hasMusic ? 2 : 1;

  // When branding is set, we route the video through a 2-step filter:
  //   1) [0:v] -> videoChain -> [v_base]
  //   2) [v_base] + scaled logo -> overlay at corner -> [v]
  // Otherwise we keep the legacy single-step path so musicless / brandless
  // renders are unchanged.
  const baseVideoLabel = hasBranding ? "[v_base]" : "[v]";
  const videoBuild = `[0:v]${videoChain}${baseVideoLabel}`;

  const brandingChain = hasBranding && a.branding
    ? [
        // Scale the logo to a max of 216px wide (~20% of 1080) keeping aspect.
        // colorchannelmixer applies the user's opacity to the alpha channel.
        `[${brandingInputIdx}:v]format=rgba,scale=216:-1,` +
          `colorchannelmixer=aa=${Math.max(0.10, Math.min(1.00, a.branding.opacity)).toFixed(2)}[logo]`,
        `[v_base][logo]overlay=${overlayXY(a.branding.position)}[v]`,
      ].join(";")
    : null;

  const audioChain = hasMusic
    ? [
        `[0:a]${audioJump}${voiceChain}[voice]`,
        `[1:a]aloop=loop=-1:size=2e+09,atrim=duration=${duration.toFixed(2)},` +
          `volume=${musicVolume.toFixed(2)},` +
          `afade=t=in:st=0:d=0.6,` +
          `afade=t=out:st=${fadeOutStart}:d=1.0[bg]`,
        `[voice][bg]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
      ]
    : [`[0:a]${audioJump}${voiceChain}[aout]`];

  const complexFilter = [
    videoBuild,
    ...(brandingChain ? [brandingChain] : []),
    ...audioChain,
  ].join(";");

  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg(a.sourcePath).setStartTime(a.moment.start).duration(duration);
    if (hasMusic && a.bgMusicPath) cmd.input(a.bgMusicPath);
    if (hasBranding && a.branding) cmd.input(a.branding.localLogoPath);

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

/**
 * Map a stored position string to ffmpeg `overlay` x:y expressions. W/H
 * are the main video width/height; w/h are the overlay (logo) dims.
 * 24-pixel padding from the edges keeps the logo off the unsafe area.
 */
function overlayXY(position: string): string {
  switch (position) {
    case "top-left":     return "x=24:y=24";
    case "top-right":    return "x=W-w-24:y=24";
    case "bottom-left":  return "x=24:y=H-h-24";
    case "bottom-right": return "x=W-w-24:y=H-h-24";
    default:             return "x=W-w-24:y=H-h-24";
  }
}

function escapePath(p: string) {
  // FFmpeg filter strings need colons escaped on the ass= filename
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
