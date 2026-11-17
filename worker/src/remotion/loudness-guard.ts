import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { SOCIAL_TARGET, measureLoudness, type LoudnessTarget } from "../dental/audio-master.js";

/**
 * The last word on loudness: the rendered mp4 itself is measured, and its
 * audio corrected if it is off target.
 *
 * Mastering (dental/audio-master.ts) puts the narration on -14 LUFS / -1 dBTP
 * before the render, but nothing checked what came out of the render. The
 * published samples show why that matters: five of the eight sample languages
 * measured -25 to -27.5 LUFS (unmastered TTS) and the other three -16.3 to
 * -17.7 (the old single-pass loudnorm) — 3 to 13 LU under what Reels, TikTok
 * and Shorts normalise to, so they play noticeably quieter than the next
 * video in the feed. Any path that skips mastering (its ffmpeg failing and
 * falling back to the raw voice, a caller passing its own audio, a music bed
 * through the composition's own <Audio>) lands there again.
 *
 * So after every render with sound: measure (EBU R128 integrated loudness and
 * true peak), and when the result is more than TOLERANCE_LU off target or
 * peaks over the ceiling, re-encode only the audio — one linear gain, then a
 * 4x-oversampled true-peak limiter — and copy the video stream untouched.
 * A well-mastered render (the normal case) is measured and left alone.
 */

/** How far off the target integrated loudness a render may be before it is corrected. */
export const TOLERANCE_LU = 1;

export type Loudness = { I: number; TP: number; LRA?: number };

export type Correction = { gainDb: number };

/**
 * What to do with a render measured at `m`: nothing (null) when it is within
 * TOLERANCE_LU of the target and its true peak is under the ceiling, or the
 * gain that puts it on target (the limiter after it takes care of the peaks).
 * A silent or near-silent track (no narration, a failed measurement) is
 * never "corrected": raising silence only raises noise.
 */
export function loudnessCorrection(m: Loudness, target: LoudnessTarget = SOCIAL_TARGET): Correction | null {
  if (!Number.isFinite(m.I) || m.I < -50) return null;
  const off = target.I - m.I;
  const peaksOver = Number.isFinite(m.TP) && m.TP > target.TP;
  if (Math.abs(off) <= TOLERANCE_LU && !peaksOver) return null;
  return { gainDb: Math.round(off * 100) / 100 };
}

/** The audio chain of a correction: gain, then a true-peak limiter 0.5 dB under the ceiling (room for AAC). */
export function correctionFilter(c: Correction, target: LoudnessTarget = SOCIAL_TARGET): string {
  const ceiling = Math.pow(10, (target.TP - 0.5) / 20).toFixed(4);
  return [
    `volume=${c.gainDb}dB`,
    "aresample=192000",
    `alimiter=limit=${ceiling}:attack=1:release=60:level=false:latency=true`,
    "aresample=48000",
  ].join(",");
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) =>
    execFile("ffmpeg", ["-hide_banner", "-nostats", "-v", "error", ...args], (err, _out, stderr) =>
      err ? reject(new Error(`ffmpeg: ${String(stderr).trim().split("\n").slice(-2).join(" | ") || err.message}`)) : resolve(),
    ),
  );
}

export type LoudnessGuardResult = { before: Loudness; after: Loudness; corrected: boolean };

/**
 * Measure `file` and, if needed, correct its audio in place (video copied).
 * Throws on ffmpeg failure; renderPlan treats that as a warning and keeps the
 * render as it came out.
 */
export async function enforceLoudness(file: string, target: LoudnessTarget = SOCIAL_TARGET): Promise<LoudnessGuardResult> {
  const before = await measureLoudness(file);
  const c = loudnessCorrection(before, target);
  if (!c) return { before, after: before, corrected: false };
  const tmp = file.replace(/(\.mp4)?$/i, ".loud.mp4");
  try {
    await run([
      "-y", "-i", file,
      "-map", "0:v:0", "-map", "0:a:0",
      "-c:v", "copy",
      "-af", correctionFilter(c, target),
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-movflags", "+faststart",
      tmp,
    ]);
    await fs.rename(tmp, file);
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
  return { before, after: await measureLoudness(file), corrected: true };
}
