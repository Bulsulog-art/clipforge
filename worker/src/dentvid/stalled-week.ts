import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { FIRST_WEEK_JOB_OPTS, type WeekJobData } from "./job-options.js";
import { alerts, cleanError, type ClinicRef, type OpsStore, type OwnerAlert, type WeekDelay } from "./ops-alert.js";
import { validWeek, weekJobId, weekOf } from "./schedule.js";
import { clinicTimeZone, mondayMorning } from "./timezone.js";

/**
 * A "week" job that BullMQ has failed for good (index.ts wires this to the
 * dentvid worker's "failed" event), so it is tested without a queue.
 *
 * Why: a week whose worker process died under it (out of memory, a deploy, a
 * restart) is put back in the queue by BullMQ; once that happened more often
 * than maxStalledCount, BullMQ fails the job itself with an UnrecoverableError
 * "job stalled more than allowable limit", at attempt 1 of 4. runDentvidWeek
 * never sees that failure, so before this nothing told the owner, the library
 * said nothing, and the delivery watchdog (delivery.ts) re-queued the week only
 * after the clinic's Monday 08:00: too late for the Monday-morning promise.
 *
 * Final means one of:
 *   stalled     BullMQ's "stalled more than allowable limit" (the process died)
 *   exhausted   every attempt used (attemptsMade >= attempts)
 *   permanent   an UnrecoverableError runDentvidWeek threw itself (a bad key,
 *               no quota, a broken profile): "retrying would not help"
 *
 * On a final failure:
 *   - the library says "delayed, we're on it" (setWeekDelay "delayed");
 *   - the owner gets the usual "week failed" alert (alerts.weekFailed, one per
 *     clinic, week and day, so it never doubles the one runDentvidWeek sent);
 *   - stalled or exhausted, and the clinic's Monday 07:00 not passed yet: the
 *     week is queued ONCE more, 5 minutes later, at first-week priority, under
 *     its own id (week:<clinic>:<monday>:stalled), claimed by
 *     dv:ops:stall-retry:<clinic>:<monday>. That run makes only the videos still
 *     missing (jobs.ts videosToMake), within the spend guard. A permanent error
 *     is not queued again (runDentvidWeek's own rule); after the deadline the
 *     hourly delivery watchdog takes over.
 * A spend-guard refusal is not a failure: the week is parked and the owner was told.
 */

/** BullMQ's failedReason for a job whose process died under it more than maxStalledCount times. */
export const STALLED_MESSAGE = /stalled more than allowable limit/i;
/** How long after the failure the one extra run starts: time for a restarting worker to come back. */
export const STALL_RETRY_DELAY_MS = 5 * 60_000;
/** The once-per-clinic-and-week claim lives as long as the week's other markers. */
export const STALL_RETRY_TTL_SEC = 8 * 86_400;
export const stallRetryKey = (clinicId: string, week: string) => `dv:ops:stall-retry:${clinicId}:${week}`;
export const stalledJobId = (clinicId: string, week: string) => `${weekJobId(clinicId, week)}:stalled`;

/** What the "failed" event hands over (a BullMQ Job fits). */
export type FailedWeekJob = {
  name: string;
  id?: string | null;
  data?: unknown;
  attemptsMade: number;
  opts?: { attempts?: number };
};

export type FailureKind = "stalled" | "exhausted" | "permanent";

const message = (err: unknown) => `${(err as { message?: unknown } | null)?.message ?? ""}`;

/** Why this failure is final, or null while BullMQ will still retry it. */
export function finalKind(job: Pick<FailedWeekJob, "attemptsMade" | "opts">, err: unknown): FailureKind | null {
  if (STALLED_MESSAGE.test(message(err))) return "stalled";
  if ((err as { name?: unknown } | null)?.name === "UnrecoverableError") return "permanent";
  if (job.attemptsMade >= Math.max(1, job.opts?.attempts ?? 1)) return "exhausted";
  return null;
}

/** Is this a final failure of the job (no BullMQ retry will follow)? */
export function weekJobFinal(job: Pick<FailedWeekJob, "attemptsMade" | "opts">, err: unknown): boolean {
  return finalKind(job, err) !== null;
}

/** The clinic, for the alert and for its Monday-morning deadline. */
export type WeekClinic = { ref: ClinicRef; tz: string };

export type StalledWeekDeps = {
  queue: { add(name: string, data: unknown, opts: Record<string, unknown>): Promise<unknown> };
  store: OpsStore | null;
  alert: (a: OwnerAlert) => Promise<unknown>;
  setDelay: (clinicId: string, week: string, state: WeekDelay) => Promise<void>;
  clinic: (clinicId: string) => Promise<WeekClinic>;
  now?: Date;
};

export type FailedWeekOutcome =
  | { handled: false; reason: "not_week" | "not_final" | "spend_refusal" | "no_clinic" }
  | {
      handled: true;
      week: string;
      kind: FailureKind;
      requeued: boolean;
      /** Why it was not queued again. */
      skipped?: "permanent" | "past_deadline" | "already" | "queue_error";
    };

export async function handleFailedWeek(
  job: FailedWeekJob | undefined,
  err: unknown,
  deps: StalledWeekDeps,
  opts: { spendRefusal?: boolean } = {},
): Promise<FailedWeekOutcome> {
  if (!job || job.name !== "week") return { handled: false, reason: "not_week" };
  if (opts.spendRefusal) return { handled: false, reason: "spend_refusal" };
  const kind = finalKind(job, err);
  if (!kind) return { handled: false, reason: "not_final" };
  const data = (job.data ?? {}) as Partial<WeekJobData>;
  const clinicId = typeof data.clinicId === "string" && data.clinicId ? data.clinicId : null;
  if (!clinicId) {
    logger.error({ jobId: job.id, err: message(err) }, "dentvid: a week job failed for good without a clinic id");
    return { handled: false, reason: "no_clinic" };
  }
  const now = deps.now ?? new Date();
  // Same as jobs.ts jobWeek: the Monday in the job data, else the week it runs in.
  const week = validWeek(data.week) ?? weekOf(now);

  await deps.setDelay(clinicId, week, "delayed").catch(() => {});
  const clinic = await deps.clinic(clinicId).catch((): WeekClinic => ({ ref: { id: clinicId }, tz: clinicTimeZone() }));

  let requeued = false;
  let skipped: Extract<FailedWeekOutcome, { handled: true }>["skipped"];
  if (kind === "permanent") skipped = "permanent";
  else if (now.getTime() >= mondayMorning(week, clinic.tz).getTime()) skipped = "past_deadline";
  else {
    const key = stallRetryKey(clinicId, week);
    // Once per clinic and week: the extra run failing again (or a second worker) never queues a third.
    const fresh = deps.store ? await deps.store.setNx(key, STALL_RETRY_TTL_SEC).catch(() => false) : true;
    if (!fresh) skipped = "already";
    else {
      const again: WeekJobData = {
        clinicId,
        count: typeof data.count === "number" && data.count > 0 ? data.count : 5,
        week,
        ...(data.batch ? { batch: true } : {}),
      };
      try {
        await deps.queue.add("week", again, { jobId: stalledJobId(clinicId, week), delay: STALL_RETRY_DELAY_MS, ...FIRST_WEEK_JOB_OPTS });
        requeued = true;
      } catch (e) {
        skipped = "queue_error";
        logger.error({ clinicId, week, err: (e as Error).message }, "dentvid: a failed week could not be queued once more");
        // The claim is given back, so a later failure of this week may still try.
        if (deps.store) await deps.store.del(key).catch(() => {});
      }
    }
  }

  const base = alerts.weekFailed({
    clinic: clinic.ref,
    week,
    attempts: Math.max(1, job.attemptsMade),
    error: cleanError(err),
    permanent: kind === "permanent",
  });
  await deps
    .alert({
      ...base,
      what: kind === "stalled" ? [...base.what, STALLED_WHAT] : base.what,
      done: [...base.done, doneNote(requeued, skipped, clinicId, week)],
    })
    .catch(() => "failed");
  return { handled: true, week, kind, requeued, ...(skipped ? { skipped } : {}) };
}

const STALLED_WHAT =
  "The worker process running it stopped more than once in the middle of the run (a restart, a deploy or running out of memory), so BullMQ gave the job up without retrying it.";

function doneNote(requeued: boolean, skipped: string | undefined, clinicId: string, week: string): string {
  if (requeued) {
    return `Queued once more by itself, starting 5 minutes later ahead of the weekly batch (job ${stalledJobId(clinicId, week)}). It makes only the videos still missing, within the spend guard.`;
  }
  if (skipped === "past_deadline") return "Not queued again here: the clinic's Monday morning has passed. The hourly delivery watchdog retries late weeks.";
  if (skipped === "already") return "Not queued again: this week already had its one extra run.";
  if (skipped === "queue_error") return "It could not be queued again (the queue did not answer). Retry it by hand.";
  return "Not queued again: the error will not go away by itself.";
}

/** The clinic's name for the alert and its time zone for the deadline, in one read. Never throws. */
export async function weekClinic(db: () => Pick<SupabaseClient, "from">, clinicId: string): Promise<WeekClinic> {
  try {
    const { data, error } = await db().from("dentvid_clinics").select("id, profile, plan_tier").eq("id", clinicId).maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as { profile?: { name?: string; country?: string; timezone?: string } | null; plan_tier?: string | null };
    const p = row.profile ?? {};
    return {
      ref: { id: clinicId, name: p.name ?? null, country: p.country ?? null, tier: row.plan_tier ?? null },
      tz: clinicTimeZone(p.country, p.timezone),
    };
  } catch (e) {
    logger.warn({ clinicId, err: (e as Error).message }, "dentvid: clinic not read for a failed week; using the default time zone");
    return { ref: { id: clinicId }, tz: clinicTimeZone() };
  }
}
