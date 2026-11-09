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
