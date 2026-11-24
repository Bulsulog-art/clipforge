import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS, WEEK_RETRY, type WeekJobData } from "./job-options.js";
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
 *   - stalled or exhausted, and the clinic's Monday 07:00 not passed yet: the
 *     week is queued ONCE more, claimed by dv:ops:stall-retry:<clinic>:<monday>.
 *     The extra run takes the week's own job id (week:<clinic>:<monday>): the
 *     failed job (BullMQ keeps it for 14 days) is removed to free the id. The
 *     clinic's "try again" button, the owner's requeue in /dentvideo/admin and
 *     the watchdogs all look at that id only, so they see the week waiting
 *     and start no second run beside it. The run makes only the videos still
 *     missing (jobs.ts videosToMake), within the spend guard.
 *       stalled    5 minutes later (time for a restarting worker to come
 *                  back), at first-week priority, 2 attempts.
 *       exhausted  30 minutes later (four failures in a row within minutes:
 *                  give the outage time to pass), at its own place in the
 *                  queue (a batch week does not jump the batch), 1 attempt.
 *     Every run of a week reserves one of the clinic's weekly runs
 *     (spend-guard.ts DENTVID_MAX_WEEKS_PER_CLINIC_WEEK, 6). A stalled week
 *     used up to 3 (BullMQ ran it again after each of its MAX_STALLED_COUNT
 *     allowed stalls), an exhausted one 4. With the extra run that makes at
 *     most 5, leaving one for the clinic's "try again" or the owner's requeue
 *     (other week runs in the same week, such as a first week, count too).
 *     A permanent error is not queued again (runDentvidWeek's own rule); after
 *     the deadline the hourly delivery watchdog takes over (it retries the
 *     failed job under the week's own id). A week that already had its extra
 *     run (the claim is there) is never queued again, whatever failed, and
 *     neither is anything when the claim cannot be taken (no ops store).
 *   - the owner hears what happened and what is already being done. Each
 *     alert has its own key, because deliverAlert sends one email per key and
 *     day and runDentvidWeek already used week_failed:<clinic>:<monday> for a
 *     week that used every attempt:
 *       week_failed:<c>:<w>:stalled  the process died under it (runDentvidWeek never spoke)
 *       week_requeued:<c>:<w>        an exhausted week was queued once more (runDentvidWeek
 *                                    told the owner it failed; this says no hand retry is needed)
 *       week_failed:<c>:<w>:again    the week failed again after its one extra run was queued
 *       week_failed:<c>:<w>          everything else, the same alert runDentvidWeek sends
 *                                    (so it is not doubled, and is sent if that one was not)
 * A spend-guard refusal is not a failure: the week is parked and the owner was told.
 */

/**
 * How often a week's process may die under it before BullMQ fails it as stalled (the dentvid
 * worker's maxStalledCount, index.ts). BullMQ runs it once more after each, so a stalled week ran
 * MAX_STALLED_COUNT + 1 times.
 */
export const MAX_STALLED_COUNT = 2;
/** BullMQ's failedReason for a job whose process died under it more than maxStalledCount times. */
export const STALLED_MESSAGE = /stalled more than allowable limit/i;
/** How long after a stalled failure the one extra run starts: time for a restarting worker to come back. */
export const STALL_RETRY_DELAY_MS = 5 * 60_000;
/** How long after a week used every attempt its one extra run starts: time for an outage to pass. */
export const EXHAUSTED_RETRY_DELAY_MS = 30 * 60_000;
/**
 * Attempts of the extra run (see the header): with what the failed week already
 * reserved, the clinic's weekly run cap keeps room for one retry by hand.
 */
export const EXHAUSTED_RETRY_ATTEMPTS = 1;
export const STALLED_RETRY_ATTEMPTS = 2;
/** The once-per-clinic-and-week claim lives as long as the week's other markers. */
export const STALL_RETRY_TTL_SEC = 8 * 86_400;
export const stallRetryKey = (clinicId: string, week: string) => `dv:ops:stall-retry:${clinicId}:${week}`;

/** What the "failed" event hands over (a BullMQ Job fits). */
export type FailedWeekJob = {
  name: string;
  id?: string | null;
  data?: unknown;
  attemptsMade: number;
  opts?: { attempts?: number; priority?: number };
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

/** A job BullMQ keeps under an id (failed jobs for 14 days: index.ts removeOnFail). */
export type KeptWeekJob = { getState(): Promise<string>; remove(): Promise<unknown> };

export type StalledWeekDeps = {
  /** The slice of the dentvid Queue this needs (a BullMQ Queue fits). */
  queue: {
    add(name: string, data: unknown, opts: Record<string, unknown>): Promise<unknown>;
    getJob(id: string): Promise<KeptWeekJob | null | undefined>;
  };
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
      skipped?: "permanent" | "past_deadline" | "already" | "on_its_way" | "no_claim" | "queue_error";
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

  const key = stallRetryKey(clinicId, week);
  // Has this week had its one extra run? Then whatever failed now (the extra run itself, or a
  // "try again" after it) is not queued again, and the owner hears it under the ":again" key.
  const hadExtra = deps.store ? await deps.store.get(key).then((v) => v !== null, () => false) : false;
  let requeued = false;
  let skipped: Extract<FailedWeekOutcome, { handled: true }>["skipped"];
  let queueError: string | undefined;
  if (hadExtra) skipped = "already";
  else if (kind === "permanent") skipped = "permanent";
  else if (now.getTime() >= mondayMorning(week, clinic.tz).getTime()) skipped = "past_deadline";
  // No store: the extra run could not be kept to once, so nothing is queued.
  else if (!deps.store) skipped = "no_claim";
  else {
    // Once per clinic and week: the extra run failing again (or a second worker) never queues a third.
    // A store that does not answer cannot keep it to once, so nothing is queued.
    const claim = await deps.store.setNx(key, STALL_RETRY_TTL_SEC).then((fresh) => (fresh ? "fresh" : "already"), () => "no_claim" as const);
    if (claim !== "fresh") skipped = claim;
    else {
      const again: WeekJobData = {
        clinicId,
        count: typeof data.count === "number" && data.count > 0 ? data.count : 5,
        week,
        ...(data.batch ? { batch: true } : {}),
      };
      try {
        const placed = await takeWeekId(deps.queue, weekJobId(clinicId, week), again, extraRunOpts(kind, job));
        if (placed === "queued") requeued = true;
        else skipped = "on_its_way";
      } catch (e) {
        skipped = "queue_error";
        queueError = cleanError(e);
        logger.error({ clinicId, week, err: (e as Error).message }, "dentvid: a failed week could not be queued once more");
      }
      // Not queued by this handler: the claim is given back, so a later failure of this week may still try.
      if (!requeued) await deps.store.del(key).catch(() => {});
    }
  }

  const notice = ownerNotice({ kind, job, err, clinic: clinic.ref, clinicId, week, requeued, skipped, queueError });
  await deps.alert(notice).catch(() => "failed");
  return { handled: true, week, kind, requeued, ...(skipped ? { skipped } : {}) };
}

/** The extra run's queue options (see the header): delay, priority and attempts by why the week failed. */
export function extraRunOpts(kind: "stalled" | "exhausted", job: Pick<FailedWeekJob, "opts">): Record<string, unknown> {
  if (kind === "stalled") return { delay: STALL_RETRY_DELAY_MS, ...FIRST_WEEK_JOB_OPTS, attempts: STALLED_RETRY_ATTEMPTS };
  const p = job.opts?.priority;
  const priority = typeof p === "number" && Number.isInteger(p) && p > 0 ? p : DENTVID_PRIORITY.batch;
  return { delay: EXHAUSTED_RETRY_DELAY_MS, ...WEEK_RETRY, attempts: EXHAUSTED_RETRY_ATTEMPTS, priority };
}

/**
 * Queue the extra run under the week's own job id. BullMQ ignores an add whose id it
 * still keeps, and it keeps a failed job for 14 days, so the failed job is removed
 * first. A job of this week that is waiting or running (the clinic pressed "try again"
 * a moment ago, or a watchdog queued it) is that run: nothing is added beside it.
 */
export async function takeWeekId(
  queue: StalledWeekDeps["queue"],
  id: string,
  data: WeekJobData,
  opts: Record<string, unknown>,
): Promise<"queued" | "on_its_way"> {
  const kept = await queue.getJob(id);
  if (kept) {
    const state = await kept.getState();
    if (state === "failed" || state === "completed") await kept.remove();
    else if (state !== "unknown") return "on_its_way";
  }
  await queue.add("week", data, { jobId: id, ...opts });
  return "queued";
}

type NoticeInput = {
  kind: FailureKind;
  job: FailedWeekJob;
  err: unknown;
  clinic: ClinicRef;
  clinicId: string;
  week: string;
  requeued: boolean;
  skipped?: Extract<FailedWeekOutcome, { handled: true }>["skipped"];
  queueError?: string;
};

const LIBRARY_NOTE = "The clinic's library shows the calm “your videos are delayed, we're on it” note, with no error text. No email went to the clinic.";

/** What the owner is told about a week that failed for good (see the header for the keys). */
export function ownerNotice(n: NoticeInput): OwnerAlert {
  const { kind, job, clinic, clinicId, week } = n;
  const base = alerts.weekFailed({ clinic, week, attempts: Math.max(1, job.attemptsMade), error: cleanError(n.err), permanent: kind === "permanent" });
  const ownId = weekJobId(clinicId, week);
  const jobId = job.id ?? ownId;
  const retryByHand = `Look at the error above and the worker logs (job id ${jobId}). When the cause is fixed, requeue the week in /dentvideo/admin: it makes only the missing videos.`;
  const writeClinic = "If it will take more than a day, write the clinic a short note.";
  // The extra run holds the week's own id, which the app's "try again" and the admin requeue look at.
  const noSecondRun = "The clinic's “try again” button and requeue in /dentvideo/admin see the week waiting and start no second run beside it.";
  const freedId = "The failed job was taken off BullMQ's failed list to free the week's id; its error is above.";

  if (n.skipped === "already") {
    return {
      ...base,
      key: `${base.key}:again`,
      what: [
        `The week of ${week} failed again after it had already been queued once more by itself.`,
        ...(kind === "stalled" ? [STALLED_WHAT] : base.what),
      ],
      done: ["Not queued again: a week gets one extra run by itself, and this one had it.", LIBRARY_NOTE],
      todo: [retryByHand, writeClinic],
    };
  }

  if (kind === "stalled") {
    const done = n.requeued
      ? `Queued once more by itself (job ${ownId}), starting in 5 minutes ahead of the weekly batch, with ${attemptsText(STALLED_RETRY_ATTEMPTS)}. It makes only the videos still missing, within the spend guard. ${freedId}`
      : skippedNote(n);
    return {
      ...base,
      key: `${base.key}:stalled`,
      what: [`The week of ${week} stopped before it was finished.`, STALLED_WHAT],
      done: [done, LIBRARY_NOTE],
      todo: n.requeued
        ? [`Nothing for now. ${noSecondRun} If the extra run fails too, you get another email.`, "If the worker keeps restarting, look at its memory and logs."]
        : [retryByHand, writeClinic],
    };
  }

  if (kind === "exhausted" && n.requeued) {
    return {
      key: `week_requeued:${clinicId}:${week}`,
      severity: "warning",
      titleTr: "Başarısız hafta bir kez daha sıraya alındı",
      titleEn: "A failed week was queued once more",
      clinic,
      what: [`The week of ${week} failed after every attempt (see the “week failed” email about it). The clinic's Monday morning has not come yet.`],
      facts: [["Error", cleanError(n.err)]],
      done: [
        `Queued once more by itself (job ${ownId}), starting in 30 minutes, at its own place in the queue, with ${attemptsText(EXHAUSTED_RETRY_ATTEMPTS)}, to leave room in the clinic's weekly run limit for a retry by hand. It makes only the videos still missing, within the spend guard. ${freedId}`,
      ],
      todo: [`No need to retry by hand now. ${noSecondRun} If this run fails too, you get another email.`, "If the error above is something you can fix, fix it before the extra run starts in 30 minutes."],
    };
  }

  // A permanent error, or a week that used every attempt and was not queued again: the alert runDentvidWeek sent.
  return kind === "permanent" ? base : { ...base, done: [...base.done, skippedNote(n)] };
}

const attemptsText = (n: number) => (n === 1 ? "one attempt" : `${n} attempts`);

const STALLED_WHAT =
  "The worker process running it stopped more than once in the middle of the run (a restart, a deploy or running out of memory), so BullMQ gave the job up without retrying it.";

function skippedNote(n: Pick<NoticeInput, "skipped" | "queueError">): string {
  if (n.skipped === "past_deadline") return "Not queued again here: the clinic's Monday morning has passed. The hourly delivery watchdog re-queues late weeks.";
  if (n.skipped === "queue_error") return `It could not be queued once more: ${n.queueError ?? "the queue refused it"}.`;
  if (n.skipped === "no_claim") return "Not queued again: the ops store (Redis) did not answer, so the extra run could not be kept to one.";
  if (n.skipped === "on_its_way") return "Not queued again here: a run of this week is already waiting (the clinic pressed “try again”, or a watchdog queued it).";
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
