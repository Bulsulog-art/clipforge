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
