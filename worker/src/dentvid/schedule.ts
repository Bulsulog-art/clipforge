import type { Queue } from "bullmq";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { batchWeekJobOpts, type WeekJobData } from "./job-options.js";
import type { OpsStore } from "./ops-alert.js";
import { clinicTimeZone, mondayMorning } from "./timezone.js";

/**
 * Weekly delivery. The worker starts the coming week for each clinic that
 * should get one, so the dentist does not have to remember to press a
 * button — the videos are simply there on Monday morning, and an email says so.
 *
 *   active               every week
 *   trial                never — "trial" means signed up but not paid yet.
 *                        There is no free week: such a clinic has seen a live
 *                        preview in the browser, and its first week is queued
 *                        by the payment webhook the moment it pays.
 *   paused / cancelled   nothing
 *
 * When: Saturday 18:00 UTC (DISPATCH_SCHEDULE), for the Monday that follows.
 * One render runs at a time on a shared 2-core box (docs/CAPACITY.md), so
 * "every Monday" cannot start on Monday: the batch gets the weekend. Each
 * clinic's job carries a priority from its own deadline — Monday 07:00 in its
 * time zone (timezone.ts) — so the queue runs in waves, earliest morning
 * first: Auckland and Tokyo on Saturday night, Istanbul and Berlin next,
 * London, then the Americas. A first week, a restyle or a recording someone
 * is waiting for still jumps the whole batch (job-options.ts).
 *
 * The job id is the same one the web app uses ("week:<clinic>:<monday>",
 * web/src/lib/dentvid/week-job.ts), and the Monday is carried in the job
 * data, so a week made on Saturday is stamped with the week it is for and a
 * clinic whose week was already queued (button or payment) gets nothing twice.
 */

/** The Monday (UTC) of the week a date falls in, "YYYY-MM-DD" — same as web/src/lib/dentvid/week.ts. */
export function weekOf(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

/** Saturday 18:00 UTC: the weekly batch starts (BullMQ job scheduler "dentvid-monday"). */
export const DISPATCH_SCHEDULE = { pattern: "0 18 * * 6", tz: "UTC" } as const;
/** Hours from Monday 00:00 UTC to the dispatch (Saturday 18:00 UTC). */
const DISPATCH_HOURS_INTO_WEEK = 5 * 24 + 18;
const HOUR = 3_600_000;

/**
 * The week something made now is for — same as web/src/lib/dentvid/week.ts.
 * From the Saturday 18:00 UTC dispatch onward that is the coming Monday's
 * week; before it, this Monday's. weekOf(now + 30 h).
 */
export function deliveryWeek(d = new Date()): string {
  return weekOf(new Date(d.getTime() + (7 * 24 - DISPATCH_HOURS_INTO_WEEK) * HOUR));
}

/** "YYYY-MM-DD" and a real date, or undefined. */
export function validWeek(w: unknown): string | undefined {
  return typeof w === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w) && !Number.isNaN(Date.parse(`${w}T00:00:00Z`)) ? w : undefined;
}

export type ClinicRow = { id: string; plan: string; profile?: { country?: string; timezone?: string } | null };

/** Only a paying clinic has videos made (no API spend before payment). */
export function isPaying(plan: string | null | undefined): boolean {
  return plan === "active";
}

export function clinicsToRun(clinics: ClinicRow[]): string[] {
  return clinics.filter((c) => isPaying(c.plan)).map((c) => c.id);
}

export const weekJobId = (clinicId: string, week: string) => `week:${clinicId}:${week}`;

/** Written when the weekly dispatch ran; the dispatch watchdog (watchdog.ts) looks for it. */
export const dispatchKey = (week: string) => `dv:ops:dispatch:${week}`;

export type BatchEntry = { clinicId: string; tz: string; deadline: Date; hoursToDeadline: number; priority: number };

/**
 * The batch in the order it should run: earliest Monday-07:00-local first.
 * Ties (same zone) keep the order the clinics came in.
 */
export function planBatch(clinics: ClinicRow[], week: string, now: Date): BatchEntry[] {
  return clinics
    .filter((c) => isPaying(c.plan))
    .map((c, i) => {
      const tz = clinicTimeZone(c.profile?.country, c.profile?.timezone);
      const deadline = mondayMorning(week, tz);
      const hoursToDeadline = (deadline.getTime() - now.getTime()) / HOUR;
      return { i, entry: { clinicId: c.id, tz, deadline, hoursToDeadline, priority: batchWeekJobOpts(hoursToDeadline).priority } };
    })
    .sort((a, b) => a.entry.deadline.getTime() - b.entry.deadline.getTime() || a.i - b.i)
    .map((x) => x.entry);
}

export type Wave = { tz: string; deadline: string; clinics: number; hoursToDeadline: number };

/** The batch grouped by zone, for the log and the dispatch marker. */
export function waves(batch: BatchEntry[]): Wave[] {
  const out: Wave[] = [];
  for (const b of batch) {
    const last = out.at(-1);
    if (last && last.tz === b.tz) last.clinics++;
    else out.push({ tz: b.tz, deadline: b.deadline.toISOString(), clinics: 1, hoursToDeadline: Math.round(b.hoursToDeadline * 10) / 10 });
  }
  return out;
}

/**
 * Clinics whose deadline the batch is expected to miss if one week takes
 * `minutesPerWeek` on this box and they run in order from `now`
 * (docs/CAPACITY.md has the measured number). Logged at dispatch, so the
 * owner sees "add a render server" coming before a Monday is missed.
 */
export function projectedLate(batch: BatchEntry[], minutesPerWeek: number, now: Date, workers = 1): string[] {
  const late: string[] = [];
  batch.forEach((b, n) => {
    const done = now.getTime() + Math.ceil((n + 1) / Math.max(1, workers)) * minutesPerWeek * 60_000;
    if (done > b.deadline.getTime()) late.push(b.clinicId);
  });
  return late;
}

/** Minutes one week takes end to end on the production box (render + OpenAI wait), for projectedLate. DENTVID_WEEK_MINUTES overrides. */
export function weekMinutes(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.DENTVID_WEEK_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : WEEK_MINUTES_DEFAULT;
}
/** Measured: docs/CAPACITY.md (5 renders on 2 cores + OpenAI time). */
export const WEEK_MINUTES_DEFAULT = 12;

export async function dispatchWeeks(
  db: SupabaseClient,
  queue: Pick<Queue, "add">,
  now = new Date(),
  store: OpsStore | null = null,
  workers = 1,
): Promise<number> {
  const { data: clinics, error } = await db.from("dentvid_clinics").select("id, plan, profile").eq("plan", "active");
  if (error) throw new Error(`dispatch: ${error.message}`);
  const week = deliveryWeek(now);
  const batch = planBatch((clinics ?? []) as ClinicRow[], week, now);
  for (const b of batch) {
    const data: WeekJobData = { clinicId: b.clinicId, count: 5, week, batch: true };
    await queue.add("week", data, { jobId: weekJobId(b.clinicId, week), ...batchWeekJobOpts(b.hoursToDeadline) });
  }
  const late = projectedLate(batch, weekMinutes(), now, workers);
  const w = waves(batch);
  if (store) await store.set(dispatchKey(week), JSON.stringify({ at: now.toISOString(), jobs: batch.length, waves: w.length, projectedLate: late.length }), 8 * 86_400).catch(() => {});
  logger.info({ week, clinics: batch.length, waves: w, projectedLate: late.length }, "dentvid: weekly dispatch");
  if (late.length) {
    logger.warn(
      { week, clinics: batch.length, projectedLate: late.length, minutesPerWeek: weekMinutes(), workers },
      "dentvid: the batch is projected to miss some Monday-morning deadlines — time for a render server (docs/CAPACITY.md)",
    );
  }
  return batch.length;
}
