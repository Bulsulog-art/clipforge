import type { SupabaseClient } from "@supabase/supabase-js";
import { weekOf } from "./week";

/**
 * The "week" job on the BullMQ `dentvid` queue — one place for its id and
 * options, shared by the "make this week" button (api/dentvideo/week), the
 * payment webhook (first week right after payment) and, by the same scheme,
 * the worker's Monday dispatch (worker/src/dentvid/schedule.ts).
 *
 * The job id is the clinic and the Monday, so the same week is never queued
 * twice however many of those paths fire.
 */
export const WEEK_VIDEOS = 5;
export const WEEK_JOB_OPTS = { attempts: 2, backoff: { type: "exponential" as const, delay: 60_000 } };

export function weekJobId(clinicId: string, week: string): string {
  return `week:${clinicId}:${week}`;
}

/** The slice of a BullMQ Queue this needs, so tests can pass a mock. */
export type WeekQueue = {
  add(name: string, data: { clinicId: string; count: number }, opts: Record<string, unknown>): Promise<unknown>;
};

export type FirstWeekResult = "queued" | "made";

/**
 * Queue a newly paid clinic's first week now, instead of making it wait for
 * Monday. Skipped when this week's videos already exist (a clinic that
 * resubscribes mid-week keeps the week it has); otherwise queued under the
 * shared job id, which BullMQ deduplicates while the job is kept.
 */
export async function enqueueFirstWeek(db: SupabaseClient, queue: WeekQueue, clinicId: string, now = new Date()): Promise<FirstWeekResult> {
  const week = weekOf(now);
  const { count } = await db
    .from("dentvid_items")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("kind", "generated")
    .eq("week_of", week)
    .neq("status", "failed");
  if ((count ?? 0) > 0) return "made";
  await queue.add("week", { clinicId, count: WEEK_VIDEOS }, { jobId: weekJobId(clinicId, week), ...WEEK_JOB_OPTS });
  return "queued";
}
