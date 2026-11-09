import os from "node:os";

/**
 * How much of this machine a render is allowed to take.
 *
 * Remotion renders by opening Chromium tabs, one per concurrent frame, and
 * each one is a real browser holding a real 1080×1920 canvas. The old
 * defaults — 4 frames at a time, 2 jobs at a time — were written without
 * looking at the box they run on. On the production server (2 cores, 8GB,
 * already 3GB into swap) that is eight browsers on two cores: every render
 * slows every other render, and the machine swaps instead of working.
 *
 * So the defaults are derived rather than guessed, and an explicit env var
 * still wins for anyone who knows better than the arithmetic.
 */

/** Chromium needs roughly this much to hold a portrait frame plus its decode buffers. */
const MB_PER_RENDER_THREAD = 700;

/** Never take the whole machine: the queue, the API poller and ffmpeg all need a turn. */
const RESERVED_CORES = 1;

/** Below this, rendering is not viable at all — but refusing to start is worse. */
const MIN_CONCURRENCY = 1;

/** Past this, more threads stop buying speed and start buying contention. */
const MAX_CONCURRENCY = 8;

function clamp(n: number): number {
  return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, Math.floor(n)));
}

/**
 * Frames rendered in parallel within a single video.
 *
 * Bounded by cores and by free memory, whichever is stingier — a box with 16
 * cores and 2GB free cannot run 15 browsers any more than a 2-core box can.
 */
export function renderConcurrency(env = process.env): number {
  const override = Number(env.REMOTION_CONCURRENCY);
  if (Number.isFinite(override) && override > 0) return clamp(override);

  const byCores = os.cpus().length - RESERVED_CORES;
  const byMemory = os.freemem() / 1024 / 1024 / MB_PER_RENDER_THREAD;
  return clamp(Math.min(byCores, byMemory));
}

/**
 * Videos rendered at the same time.
 *
 * Deliberately one on a small machine. Two half-speed renders finish later
 * than two full-speed renders queued back to back, and the second person is
 * watching a progress bar either way.
 */
export function generateConcurrency(env = process.env): number {
  const override = Number(env.GENERATE_CONCURRENCY);
  if (Number.isFinite(override) && override > 0) return Math.max(1, Math.floor(override));

  return os.cpus().length >= 4 ? 2 : 1;
}

/**
 * DentVideo jobs (weeks, recordings, restyles) worked on at the same time by
 * one worker process: DENTVID_RENDER_CONCURRENCY, default 1.
 *
 * One, on purpose, while rendering shares the 2-core box with the website,
 * ClipForge and Liman: a second job halves the speed of the first and starves
 * the web app (docs/CAPACITY.md has the measurements). Raise it only on a box
 * that does nothing but render — the "separate render server" runbook in
 * docs/CAPACITY.md. 0 means this process takes no DentVideo renders at all
 * (the main box, once a render server does them). The old name
 * DENTVID_CONCURRENCY is still honoured.
 */
export function dentvidConcurrency(env: Record<string, string | undefined> = process.env): number {
  for (const raw of [env.DENTVID_RENDER_CONCURRENCY, env.DENTVID_CONCURRENCY]) {
    const n = Number(raw);
    if (raw && raw.trim() !== "" && Number.isFinite(n) && n >= 0) return Math.min(16, Math.floor(n));
  }
  return 1;
}

export type X264Preset = "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "slower" | "veryslow" | "placebo";
const X264_PRESETS: readonly X264Preset[] = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo"];

export type RenderTuning = {
  /** x264 speed/size trade-off for the final encode. */
  x264Preset: X264Preset;
  /** Decoded-frame cache for footage (OffthreadVideo). Remotion's default is half the free memory — on a shared box, the website's memory. */
  offthreadVideoCacheSizeInBytes: number;
  /** Threads the footage decoder may use. */
  offthreadVideoThreads: number;
};

const MB = 1024 * 1024;

/**
 * The flags a render runs with, sized to the box (measured: docs/CAPACITY.md).
 *
 * On the 2-core production server: "veryfast" x264 instead of the "medium"
 * default (at crf 23 and under a minute of mostly flat graphics the file is a
 * little larger and the picture is the same), a 256 MB footage-frame cache
 * instead of half the free memory, and one footage decoder thread. A bigger
 * box gets a larger cache and two decoder threads.
 *
 * Every value can be set explicitly: REMOTION_X264_PRESET,
 * REMOTION_OFFTHREAD_CACHE_MB, REMOTION_OFFTHREAD_THREADS.
 */
export function renderTuning(env: Record<string, string | undefined> = process.env, cores = os.cpus().length, totalBytes = os.totalmem()): RenderTuning {
  const small = cores <= 2;
  const preset = (env.REMOTION_X264_PRESET ?? "").toLowerCase() as X264Preset;
  const cacheMb = Number(env.REMOTION_OFFTHREAD_CACHE_MB);
  const threads = Number(env.REMOTION_OFFTHREAD_THREADS);
  return {
    x264Preset: X264_PRESETS.includes(preset) ? preset : small ? "veryfast" : "medium",
    offthreadVideoCacheSizeInBytes:
      Number.isFinite(cacheMb) && cacheMb >= 64 ? Math.floor(cacheMb) * MB : small ? 256 * MB : Math.min(2048 * MB, Math.floor(totalBytes / 8)),
    offthreadVideoThreads: Number.isFinite(threads) && threads >= 1 ? Math.min(8, Math.floor(threads)) : small ? 1 : 2,
  };
}
