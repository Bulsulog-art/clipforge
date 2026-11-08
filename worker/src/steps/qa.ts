import { spawn } from "node:child_process";
import ffmpeg from "fluent-ffmpeg";

/**
 * The QA agent: measures a rendered video before anyone sees it.
 *
 * Every defect found by eye in this project's first renders would have
 * been caught by a measurement: a 0.5-second narration over a 24-second
 * video, captions that were silent because the audio never played, a clip
 * cut from nothing. So nothing is handed to a clinic without passing here;
 * a failing video is marked with the reasons rather than shipped.
 */

export type QaExpect = {
  width: number;
  height: number;
  minSec?: number;
  maxSec?: number;
  /** The video must carry audible sound (narration or speech). */
  expectAudio: boolean;
  /** Longest acceptable stretch of silence, in seconds. */
  maxSilenceSec?: number;
};

export type QaReport = {
  ok: boolean;
  issues: string[];
  stats: {
    durationSec: number;
    width: number;
    height: number;
    hasAudio: boolean;
    meanVolumeDb: number | null;
    longestSilenceSec: number;
    blackSec: number;
  };
};

/** Parse ffmpeg `silencedetect` stderr into silence intervals. */
export function parseSilences(stderr: string, durationSec: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let open: number | null = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) open = Math.max(0, Number(s[1]));
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (e && open !== null) {
      out.push({ start: open, end: Number(e[1]) });
      open = null;
    }
  }
  // Silence that runs to the end has no silence_end line.
  if (open !== null) out.push({ start: open, end: durationSec });
  return out;
}

/** Parse ffmpeg `blackdetect` stderr into total seconds of black. */
export function parseBlackSeconds(stderr: string): number {
  let total = 0;
  for (const m of stderr.matchAll(/black_duration:\s*([\d.]+)/g)) total += Number(m[1]);
  return total;
}

export function parseMeanVolume(stderr: string): number | null {
  const m = stderr.match(/mean_volume:\s*(-?[\d.]+|-inf)\s*dB/);
  if (!m) return null;
  return m[1] === "-inf" ? -Infinity : Number(m[1]);
}

/** Pure judgement over the measurements — tested directly. */
export function judge(stats: QaReport["stats"], e: QaExpect): string[] {
  const issues: string[] = [];
  if (stats.width !== e.width || stats.height !== e.height)
    issues.push(`resolution ${stats.width}x${stats.height}, expected ${e.width}x${e.height}`);
  if (e.minSec !== undefined && stats.durationSec < e.minSec - 0.5)
    issues.push(`too short: ${stats.durationSec.toFixed(1)}s (min ${e.minSec}s)`);
  if (e.maxSec !== undefined && stats.durationSec > e.maxSec + 0.5)
    issues.push(`too long: ${stats.durationSec.toFixed(1)}s (max ${e.maxSec}s)`);
  if (e.expectAudio) {
    if (!stats.hasAudio) issues.push("no audio track");
    else if (stats.meanVolumeDb === null || stats.meanVolumeDb < -45)
      issues.push(`audio is effectively silent (mean ${stats.meanVolumeDb?.toFixed(1) ?? "?"} dB)`);
    const maxSilence = e.maxSilenceSec ?? 3;
    if (stats.longestSilenceSec > maxSilence)
      issues.push(`${stats.longestSilenceSec.toFixed(1)}s of silence (max ${maxSilence}s)`);
  }
  if (stats.blackSec > 0.5) issues.push(`${stats.blackSec.toFixed(1)}s of black frames`);
  return issues;
}

function ffmpegStderr(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-hide_banner", "-nostats", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", () => resolve(err));
  });
}

export async function inspectVideo(file: string, e: QaExpect): Promise<QaReport> {
  const probe = await new Promise<ffmpeg.FfprobeData>((res, rej) =>
    ffmpeg.ffprobe(file, (err, data) => (err ? rej(err) : res(data))),
  );
  const v = probe.streams.find((s) => s.codec_type === "video");
  const hasAudio = probe.streams.some((s) => s.codec_type === "audio");
  const durationSec = Number(probe.format.duration ?? 0);

  let meanVolumeDb: number | null = null;
  let longestSilenceSec = 0;
  if (hasAudio) {
    const audio = await ffmpegStderr(["-i", file, "-vn", "-af", "volumedetect,silencedetect=noise=-40dB:d=1", "-f", "null", "-"]);
    meanVolumeDb = parseMeanVolume(audio);
    longestSilenceSec = Math.max(0, ...parseSilences(audio, durationSec).map((s) => s.end - s.start));
  }
  const video = await ffmpegStderr(["-i", file, "-an", "-vf", "blackdetect=d=0.3:pix_th=0.05", "-f", "null", "-"]);

  const stats = {
    durationSec,
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    hasAudio,
    meanVolumeDb,
    longestSilenceSec,
    blackSec: parseBlackSeconds(video),
  };
  const issues = judge(stats, e);
  return { ok: issues.length === 0, issues, stats };
}
