import type { SupabaseClient } from "@supabase/supabase-js";
import { deliveryWeek } from "./week";
import { FIRST_WEEK_JOB_OPTS, WEEK_RETRY, type WeekJobData } from "./job-options";

export type { WeekJobData };

/**
 * The "week" job on the BullMQ `dentvid` queue — one place for its id and
 * options, shared by the "make this week" button (api/dentvideo/week), the
 * payment webhook (first week right after payment) and, by the same scheme,
 * the worker's Monday dispatch (worker/src/dentvid/schedule.ts).
 *
 * The job id is the clinic and the Monday, so the same week is never queued
 * twice however many of those paths fire. The Monday also travels in the job
 * data, so a week queued on Saturday evening is stamped with the week it is for.
 *
 * Priorities (job-options.ts, identical in the worker): a first week and the
 * button run before the weekend batch — someone is waiting for them.
 */
export const WEEK_VIDEOS = 5;
/**
 * Same numbers as the worker's retry.ts (WEEK_JOB_OPTS): 4 attempts, 2 → 4 → 8
 * minutes apart. The worker decides which failures are worth a retry
 * (transient: rate limits, timeouts, 5xx) and stops early on permanent ones.
 */
export const WEEK_JOB_OPTS = WEEK_RETRY;

export function weekJobId(clinicId: string, week: string): string {
  return `week:${clinicId}:${week}`;
}

/** Item statuses that count as a delivered video (a rejected topic or a failed row is not one). */
export const USABLE_STATUSES = ["ready", "flagged"] as const;

/** Has this week delivered anything the clinic can use? */
export function weekDelivered(items: { kind: string; week_of: string; status: string }[], week: string): boolean {
  return items.some((i) => i.kind === "generated" && i.week_of === week && (USABLE_STATUSES as readonly string[]).includes(i.status));
}

/**
 * What the "make this week's videos" / "try again" button does, from the
 * state of the week's job (null: no job kept) and how many usable videos
 * the week has:
 *   queue    no job and nothing delivered → queue it
 *   requeue  the job failed (every attempt, or a permanent error such as the
 *            AI provider being out of credit), or it completed without one
 *            usable video → remove it and queue it again (the worker's spend
 *            guard still caps how many runs a clinic gets in a week)
 *   made     the week has usable videos → nothing new
 *   running  waiting or being made → nothing new
 */
export type WeekRun = "queue" | "requeue" | "made" | "running";
export function weekRunFor(state: string | null | undefined, usableThisWeek: number): WeekRun {
  if (usableThisWeek > 0 && (!state || state === "completed" || state === "failed")) return "made";
  if (!state) return "queue";
  if (state === "failed" || state === "completed") return "requeue";
  return "running";
}

/** The slice of a BullMQ Queue this needs, so tests can pass a mock. */
export type WeekQueue = {
  add(name: string, data: WeekJobData, opts: Record<string, unknown>): Promise<unknown>;
};

export type FirstWeekResult = "queued" | "made";

/**
 * Queue a newly paid clinic's first week now, instead of making it wait for
 * the weekend batch — at the front of the queue. Skipped when this week's videos already exist (a clinic that
 * resubscribes mid-week keeps the week it has); otherwise queued under the
 * shared job id, which BullMQ deduplicates while the job is kept.
 */
export async function enqueueFirstWeek(db: SupabaseClient, queue: WeekQueue, clinicId: string, now = new Date()): Promise<FirstWeekResult> {
  const week = deliveryWeek(now);
  const { count } = await db
    .from("dentvid_items")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("kind", "generated")
    .eq("week_of", week)
    .neq("status", "failed");
  if ((count ?? 0) > 0) return "made";
  await queue.add("week", { clinicId, count: WEEK_VIDEOS, week }, { jobId: weekJobId(clinicId, week), ...FIRST_WEEK_JOB_OPTS });
  return "queued";
}
