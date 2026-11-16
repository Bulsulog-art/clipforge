import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS, type WeekJobData } from "./job-options.js";
import { activeClinicRows, deliveryWeek, shouldRun, weekJobId, weekOf, type ClinicRow } from "./schedule.js";
import { clinicTimeZone, mondayMorning } from "./timezone.js";
import { alerts, weekStateKey, type ClinicRef, type DeliverResult, type OpsStore, type OwnerAlert } from "./ops-alert.js";
import { supabaseWatchDb, type WatchQueue } from "./watchdog.js";

/**
 * The delivery watchdog: did every paying clinic actually get its week by
 * Monday 07:00 in its own time zone? (BullMQ job "watchdog-delivery" on the
 * dentvid-mail queue, hourly.)
 *
 * The other watchdogs check promises at fixed moments: the Saturday 19:30
 * check that every clinic has a job, the 15-minute check that a new payer
 * gets its first week. Nothing looked at the deadline itself. A week lost
 * after Saturday 19:30 (Redis restarted without its data, a job removed by
 * hand, a worker that was down all Sunday, a batch longer than the weekend,
 * a week parked by the spend guard) reached Monday morning in silence.
 *
 * For each paying clinic whose deadline passed more than an hour ago (and at
 * most four days ago), the week must be in its library. If it is not:
 *   - the job is put back at the front of the queue, once per clinic and week
 *     (missing → added; failed → retried; completed with nothing → a fresh
 *     run under its own id; waiting behind the batch → to the front);
 *   - the clinic's library says "taking a little longer" (never an error);
 *   - the owner is told (one email per clinic and week a day).
 * A clinic that started paying after its deadline is the first-week
 * watchdog's, not this one's.
 *
 * Every run also writes the delivery report the daily ops sweep reads
 * (DELIVERY_REPORT_KEY): per paying clinic the last week delivered, and
 * failed / stuck jobs per clinic.
 */

export const DELIVERY_SCHEDULE = { pattern: "41 * * * *", tz: "UTC" } as const;
export const DELIVERY_REPORT_KEY = "dv:ops:delivery";
/** After the deadline, before a missing week counts as late (a Monday 06:58 finish is on time). */
export const LATE_GRACE_MS = 60 * 60_000;
/** How long after its deadline a week keeps being checked (a clinic re-alerted daily meanwhile). */
export const LATE_WINDOW_MS = 4 * 86_400_000;
/** An active job running longer than this is stuck (admin-system.ts STUCK_ACTIVE_MS: a week is ~12 min). */
export const STUCK_ACTIVE_MS = 90 * 60_000;

export type PayingClinic = { id: string; tz: string };

export interface DeliveryDb {
  /** Paying clinics that should get weeks (schedule.ts shouldRun), with their time zone. */
  payingClinics(): Promise<PayingClinic[]>;
  /** Activations (first payment or back from paused / cancelled) since a time (watchdog.ts firstPayments). */
  activations(since: Date): Promise<{ clinicId: string; paidAt: string }[]>;
  /** Of these clinics, the ones with generated items for the week (failed placeholders do not count). */
  weekMade(clinicIds: string[], week: string): Promise<Set<string>>;
  /** Last week with a usable generated video, per clinic, looking back to `sinceWeek`. */
  lastDelivered(clinicIds: string[], sinceWeek: string): Promise<Map<string, string>>;
  clinic(clinicId: string): Promise<ClinicRef>;
}

type ListedJob = { id?: string | null; name: string; data?: unknown; processedOn?: number | null; failedReason?: string | null };
export type DeliveryQueue = WatchQueue & {
  getJobs?(types: ("failed" | "active")[], start?: number, end?: number, asc?: boolean): Promise<(ListedJob | undefined)[]>;
};

export type DeliveryDeps = {
  db: DeliveryDb;
  queue: DeliveryQueue;
  store: OpsStore | null;
  alert: (a: OwnerAlert) => Promise<DeliverResult>;
  now?: Date;
};

export type LateWeek = { clinicId: string; week: string; deadline: string; jobState: string; requeued: boolean };

export type DeliveryReport = {
  at: string;
  payingClinics: number;
  /** Clinics whose deadline for a week has passed (within the window) at this run. */
  due: number;
  delivered: number;
  late: LateWeek[];
  /** Per paying clinic: the last week it got (null: none in the last 8 weeks). */
  lastDelivered: Record<string, string | null>;
  /** Paying clinics whose last delivered week is older than the current Monday's (and that have been paying long enough to be owed it). */
  behind: string[];
  /** Failed dentvid jobs (kept by BullMQ) and active jobs older than STUCK_ACTIVE_MS, per clinic. */
  failedJobs: Record<string, number>;
  stuckJobs: Record<string, number>;
};

const DAY = 86_400_000;
const addDays = (week: string, n: number) => new Date(Date.parse(`${week}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** The weeks whose deadline may be in the window: this Monday's and, from Saturday evening, the coming one. */
export function candidateWeeks(now: Date): string[] {
  return [...new Set([weekOf(now), deliveryWeek(now), addDays(weekOf(now), -7)])];
}

/** Is a clinic's week due (deadline + grace passed, inside the window)? */
export function isDue(deadline: Date, now: Date): boolean {
  const since = now.getTime() - deadline.getTime();
  return since >= LATE_GRACE_MS && since <= LATE_WINDOW_MS;
}

const clinicOf = (j: ListedJob | undefined) => ((j?.data ?? {}) as { clinicId?: unknown }).clinicId;

export async function checkWeekDelivery(deps: DeliveryDeps): Promise<DeliveryReport> {
  const now = deps.now ?? new Date();
  const clinics = await deps.db.payingClinics();
  const report: DeliveryReport = { at: now.toISOString(), payingClinics: clinics.length, due: 0, delivered: 0, late: [], lastDelivered: {}, behind: [], failedJobs: {}, stuckJobs: {} };

  // Started paying recently: when. A clinic that paid after a deadline was not owed that week by then.
  const activatedAt = new Map<string, number>();
  for (const a of await deps.db.activations(new Date(now.getTime() - LATE_WINDOW_MS - 7 * DAY)).catch(() => [])) {
    const t = Date.parse(a.paidAt);
    if (Number.isFinite(t)) activatedAt.set(a.clinicId, Math.max(activatedAt.get(a.clinicId) ?? 0, t));
  }

  for (const week of candidateWeeks(now)) {
    const due = clinics
      .map((c) => ({ ...c, deadline: mondayMorning(week, c.tz) }))
      .filter((c) => isDue(c.deadline, now) && !((activatedAt.get(c.id) ?? 0) > c.deadline.getTime() - LATE_GRACE_MS));
    if (!due.length) continue;
    report.due += due.length;
    const made = await deps.db.weekMade(
      due.map((c) => c.id),
      week,
    );
    for (const c of due) {
      if (made.has(c.id)) {
        report.delivered++;
        continue;
      }
      const late = await handleLate(deps, c.id, week, c.deadline);
      report.late.push(late);
    }
  }

  // The report the daily sweep reads.
  const ids = clinics.map((c) => c.id);
  const last = ids.length ? await deps.db.lastDelivered(ids, addDays(weekOf(now), -56)).catch(() => new Map<string, string>()) : new Map<string, string>();
  const thisMonday = weekOf(now);
  for (const c of clinics) {
    const w = last.get(c.id) ?? null;
    report.lastDelivered[c.id] = w;
    // Owed this Monday's week: its deadline has passed and it was paying before then.
    const deadline = mondayMorning(thisMonday, c.tz);
    const owed = now.getTime() - deadline.getTime() >= LATE_GRACE_MS && !((activatedAt.get(c.id) ?? 0) > deadline.getTime() - LATE_GRACE_MS);
    if (owed && (!w || w < thisMonday)) report.behind.push(c.id);
  }
  if (deps.queue.getJobs) {
    const paying = new Set(ids);
    for (const j of await deps.queue.getJobs(["failed"], 0, 999).catch(() => [])) {
      const id = clinicOf(j);
      if (typeof id === "string" && paying.has(id)) report.failedJobs[id] = (report.failedJobs[id] ?? 0) + 1;
    }
    for (const j of await deps.queue.getJobs(["active"], 0, 99).catch(() => [])) {
      const id = clinicOf(j);
      if (typeof id === "string" && j?.processedOn && now.getTime() - j.processedOn > STUCK_ACTIVE_MS) report.stuckJobs[id] = (report.stuckJobs[id] ?? 0) + 1;
    }
  }

  if (deps.store) await deps.store.set(DELIVERY_REPORT_KEY, JSON.stringify(report), 3 * 86_400).catch(() => {});
  const log = report.late.length || report.behind.length ? logger.warn.bind(logger) : logger.info.bind(logger);
  log(
    { paying: report.payingClinics, due: report.due, delivered: report.delivered, late: report.late.length, behind: report.behind.length, failed: Object.keys(report.failedJobs).length, stuck: Object.keys(report.stuckJobs).length },
    "dentvid: delivery watchdog",
  );
  return report;
}

async function handleLate(deps: DeliveryDeps, clinicId: string, week: string, deadline: Date): Promise<LateWeek> {
  const id = weekJobId(clinicId, week);
  const job = await deps.queue.getJob(id).catch(() => null);
  const state = job ? await job.getState().catch(() => "unknown") : "missing";
  let requeued = false;
  // Once per clinic and week: a second run (or a second worker) does not stack re-queues.
  const fresh = deps.store ? await deps.store.setNx(`dv:ops:late-requeue:${clinicId}:${week}`, 8 * 86_400).catch(() => false) : true;
  if (fresh) {
    const data: WeekJobData = { clinicId, count: 5, week };
    try {
      if (state === "missing") {
        await deps.queue.add("week", data, { jobId: id, ...FIRST_WEEK_JOB_OPTS });
        requeued = true;
      } else if (state === "failed" && job) {
        await job.retry("failed");
        requeued = true;
      } else if (state === "completed") {
        // Ran but left nothing usable (or skipped): a fresh run under its own fixed id.
        await deps.queue.add("week", data, { jobId: `${id}:late`, ...FIRST_WEEK_JOB_OPTS });
        requeued = true;
      } else if ((state === "waiting" || state === "prioritized") && job?.changePriority && job.opts?.priority !== DENTVID_PRIORITY.firstWeek) {
        await job.changePriority({ priority: DENTVID_PRIORITY.firstWeek });
        requeued = true;
      }
    } catch (e) {
      logger.error({ clinicId, week, err: (e as Error).message }, "dentvid: delivery watchdog could not re-queue a late week");
    }
  }
  // An honest note in the library — unless the week already failed for good ("delayed" stays).
  if (deps.store) {
    const key = weekStateKey(clinicId, week);
    const cur = await deps.store.get(key).catch(() => null);
    if (cur !== "delayed") await deps.store.set(key, "retrying", 8 * 86_400).catch(() => {});
  }
  await deps.alert(alerts.weekLate({ clinic: await deps.db.clinic(clinicId).catch(() => ({ id: clinicId })), week, deadline: deadline.toISOString(), jobState: state, requeued })).catch(() => "failed");
  logger.warn({ clinicId, week, state, requeued }, "dentvid: a paying clinic's week is late");
  return { clinicId, week, deadline: deadline.toISOString(), jobState: state, requeued };
}

/* ------------------------------------------------------------ Liman */

/** Clinic ids per lastDelivered query: ≤ ~8 weeks × 5 videos each stays under PostgREST's 1000-row cap. */
const LAST_CHUNK = 20;

export function supabaseDeliveryDb(db: SupabaseClient): DeliveryDb {
  const watch = supabaseWatchDb(db);
  return {
    async payingClinics() {
      return (await activeClinicRows<ClinicRow>(db))
        .filter(shouldRun)
        .map((c) => ({ id: c.id, tz: clinicTimeZone(c.profile?.country, c.profile?.timezone) }));
    },
    activations: (since) => watch.firstPayments(since),
    weekMade: (ids, week) => watch.weekMade(ids, week),
    async lastDelivered(ids, sinceWeek) {
      const out = new Map<string, string>();
      for (let i = 0; i < ids.length; i += LAST_CHUNK) {
        const { data, error } = await db
          .from("dentvid_items")
          .select("clinic_id, week_of")
          .in("clinic_id", ids.slice(i, i + LAST_CHUNK))
          .eq("kind", "generated")
          .in("status", ["ready", "flagged"])
          .gte("week_of", sinceWeek)
          .limit(1000);
        if (error) throw new Error(`last delivered: ${error.message}`);
        for (const r of (data ?? []) as { clinic_id: string; week_of: string | null }[]) {
          if (r.week_of && (!out.has(r.clinic_id) || r.week_of > out.get(r.clinic_id)!)) out.set(r.clinic_id, r.week_of);
        }
      }
      return out;
    },
    clinic: (id) => watch.clinic(id),
  };
}
