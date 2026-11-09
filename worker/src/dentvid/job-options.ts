/**
 * Options for every job on the BullMQ `dentvid` queue: who goes first, and
 * how failures are retried.
 *
 * Identical copies live in worker/src/dentvid/job-options.ts and
 * web/src/lib/dentvid/job-options.ts (web/src/lib/dentvid/ops.test.ts keeps
 * them byte-identical), so a week queued by the payment webhook and a week
 * queued by the worker's own dispatch or watchdog carry the same options.
 * No imports, so the one file compiles in both apps.
 *
 * One render runs at a time on the shared 2-core box (docs/CAPACITY.md), so
 * the order of the queue is the delivery promise:
 *
 *   1    a newly paid clinic's first week (and its watchdog re-queue), the
 *        "make this week" button, and a re-render after new photos —
 *        someone is waiting for these right now
 *   5    the dentist's own recording
 *   100+ the weekly batch, earliest Monday-07:00-local deadline first
 *        (100 + hours from the dispatch to that clinic's deadline)
 *
 * In BullMQ a lower number runs first and a job without a priority runs
 * before all of them, which is why every dentvid job carries one (the
 * scheduler's own "dispatch" job is the only exception — it just queues).
 */

export const DENTVID_PRIORITY = {
  firstWeek: 1,
  restyle: 1,
  recording: 5,
  batch: 100,
} as const;

/** Highest batch priority number used: a deadline more than ~6 weeks out still sorts last, never past BullMQ's limit (2^21). */
export const BATCH_PRIORITY_MAX = 1_099;

/** Priority of a weekly-batch week whose clinic's deadline is `hoursToDeadline` after the dispatch. */
export function batchPriority(hoursToDeadline: number): number {
  const h = Number.isFinite(hoursToDeadline) ? Math.max(0, Math.floor(hoursToDeadline)) : BATCH_PRIORITY_MAX - DENTVID_PRIORITY.batch;
  return Math.min(BATCH_PRIORITY_MAX, DENTVID_PRIORITY.batch + h);
}

/** Is this priority a weekly-batch job (lower urgency, runs niced)? */
export function isBatchPriority(priority: number | undefined): boolean {
  return typeof priority === "number" && priority >= DENTVID_PRIORITY.batch;
}

/** Retries for a week — the same numbers as worker/src/dentvid/retry.ts (WEEK_ATTEMPTS, WEEK_BACKOFF_MS). */
export const WEEK_RETRY = { attempts: 4, backoff: { type: "exponential" as const, delay: 120_000 } };

/** A week someone is waiting for: first week after payment, the app's button, the first-week watchdog. */
export const FIRST_WEEK_JOB_OPTS = { ...WEEK_RETRY, priority: DENTVID_PRIORITY.firstWeek };

/** A week from the weekly batch, ordered by its clinic's deadline. */
export function batchWeekJobOpts(hoursToDeadline: number) {
  return { ...WEEK_RETRY, priority: batchPriority(hoursToDeadline) };
}

export const RECORDING_JOB_OPTS = { attempts: 2, backoff: { type: "exponential" as const, delay: 60_000 }, priority: DENTVID_PRIORITY.recording };

export const RESTYLE_JOB_OPTS = { attempts: 2, backoff: { type: "exponential" as const, delay: 30_000 }, priority: DENTVID_PRIORITY.restyle };

/** The data of a "week" job. `week` is the Monday it is for (YYYY-MM-DD); older jobs without it mean the week they run in. */
export type WeekJobData = { clinicId: string; count: number; week?: string; batch?: boolean };
