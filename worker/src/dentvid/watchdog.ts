import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { batchWeekJobOpts, DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS, type WeekJobData } from "./job-options.js";
import { activeClinicRows, deliveryWeek, dispatchKey, getsWeeks, shouldRun, weekJobId, type ClinicRow } from "./schedule.js";
import { alerts, thresholds, type ClinicRef, type DeliverResult, type OpsStore, type OwnerAlert } from "./ops-alert.js";
import { notifyDelayChecked, type DelayKind, type NotifyOutcome } from "./notify.js";

/**
 * Watchdogs: the worker checking its own promises, healing what it can and
 * telling the owner what it could not.
 *
 *   Saturday 19:30 UTC  every paying clinic has the coming week's job (the
 *                       dispatch runs at 18:00, schedule.ts). Missing jobs are
 *                       queued now (same ids, so nothing doubles) and the
 *                       owner is told — with the rest of the weekend still
 *                       ahead to make them before Monday morning.
 *   every 15 minutes    a clinic that paid has its first week. At 45 min with
 *                       no videos the week is re-queued once (idempotent job
 *                       id) — or, if it is still waiting behind other work,
 *                       moved to the front of the queue; at 2 h the owner is
 *                       told. The first week outranks the weekly batch
 *                       (job-options.ts), so a Monday payer waits for at most
 *                       the one week already rendering, not for the batch.
 *                       The clinic gets one calm "your first videos are
 *                       taking a little longer" email at the same 2 h mark
 *                       (once per clinic; notifyClinic). A clinic coming
 *                       back from a pause gets the routine "running late"
 *                       email for its comeback week instead (once per week).
 *
 * Time, the database, the queue, the alert and the clinic's email are
 * injected, so the logic is tested with a fake clock and fakes.
 */

/** 90 minutes after the Saturday 18:00 UTC dispatch (schedule.ts DISPATCH_SCHEDULE). */
export const WATCHDOG_SCHEDULE = { pattern: "30 19 * * 6", tz: "UTC" } as const;
export const FIRST_WEEK_SCHEDULE = { pattern: "*/15 * * * *", tz: "UTC" } as const;
/** Paid-clinic markers the web app writes (best effort) next to the payment_succeeded event. */
export const PAID_LIST_KEY = "dv:ops:paid";

export interface WatchDb {
  /** Clinics that should have a week: paying, not paused by the owner, not the App Review demo (schedule.ts getsWeeks). */
  activeClinicIds(): Promise<string[]>;
  /**
   * Activations since a time: payment_succeeded with first = true (a first payment) or
   * activated = true (back from paused / cancelled — owed its week just the same).
   */
  firstPayments(since: Date): Promise<{ clinicId: string; paidAt: string; returning?: boolean }[]>;
  /** A usable generated video (ready / flagged) created since a time. */
  deliveredSince(clinicId: string, since: Date): Promise<boolean>;
  /** Of these clinics, the ones with generated items for the week. */
  weekMade(clinicIds: string[], week: string): Promise<Set<string>>;
  isActive(clinicId: string): Promise<boolean>;
  clinic(clinicId: string): Promise<ClinicRef>;
}

type JobLike = {
  getState(): Promise<string>;
  retry(state?: "failed" | "completed"): Promise<void>;
  opts?: { priority?: number };
  changePriority?(opts: { priority?: number }): Promise<void>;
};
export type WatchQueue = {
  getJob(id: string): Promise<JobLike | undefined | null>;
  add(name: string, data: unknown, opts: Record<string, unknown>): Promise<unknown>;
};

/**
 * Emails a clinic that its week is late (notify.ts notifyDelayChecked). `queued`: the week is
 * really on its way, so the email may say so. Never throws.
 */
export type ClinicNotifier = (clinicId: string, week: string, kind: DelayKind, opts: { queued: boolean }) => Promise<NotifyOutcome>;

/**
 * The sender used when a watchdog is not given one: the web app's notice, except under the
 * test runner. A test that runs a watchdog without injecting notifyClinic (and with
 * WORKER_INTERNAL_TOKEN set by another test) must never post to a real web app, nor wait out
 * the request's timeout.
 */
export function defaultClinicNotifier(env: Record<string, string | undefined> = process.env): ClinicNotifier {
  if (env.VITEST) return async () => ({ sent: false, retry: false, reason: "not sent from a test run" });
  return notifyDelayChecked;
}

/** BullMQ states in which a week is still on its way: queued, at the front, running, or waiting out a retry's backoff. */
const ON_ITS_WAY = new Set(["waiting", "prioritized", "active", "delayed", "waiting-children"]);

/**
 * Is the week really on its way: is one of these jobs (the week's own, or the fresh run a
 * re-queue added under its own id) queued or running? A failed or completed job, a missing
 * one or a queue that cannot answer is not: the "running late" email then makes no "queued"
 * claim.
 */
export async function weekOnItsWay(queue: WatchQueue, jobIds: string[]): Promise<boolean> {
  for (const id of jobIds) {
    const job = await queue.getJob(id).catch(() => null);
    const state = job ? await job.getState().catch(() => "unknown") : "missing";
    if (ON_ITS_WAY.has(state)) return true;
  }
  return false;
}

export type WatchDeps = {
  db: WatchDb;
  queue: WatchQueue;
  store: OpsStore | null;
  alert: (a: OwnerAlert) => Promise<DeliverResult>;
  /** The clinic's "running late" email; defaults to the web app's notice (notifyDelayChecked). */
  notifyClinic?: ClinicNotifier;
  now?: Date;
  env?: Record<string, string | undefined>;
};

/**
 * One "running late" email per clinic and week, whichever watchdog sees it
 * first (a Saturday-evening payer's first week is also Monday's week the
 * delivery watchdog checks). Set only together with the watchdog's own
 * marker, so it never fires twice.
 */
export const lateNoticeKey = (clinicId: string, week: string) => `dv:ops:late-notice:${clinicId}:${week}`;
export const LATE_NOTICE_TTL_S = 8 * 86_400;
/** The first-week notice: once per clinic (the first-week watchdog looks back 3 days). */
export const firstLateNoticeKey = (clinicId: string) => `dv:ops:first-late-notice:${clinicId}`;
export const FIRST_LATE_NOTICE_TTL_S = 30 * 86_400;

/**
 * Sends the clinic its "running late" email, guarded by the per-week marker
 * (and the caller's own). No store, no email: without the marker it could
 * not be sent only once. `queued` is asked only when the email will go
 * (it reads the queue). Never throws.
 */
export async function noticeClinicOnce(
  store: OpsStore | null,
  notify: ClinicNotifier | undefined,
  clinicId: string,
  week: string,
  kind: DelayKind,
  queued: () => Promise<boolean>,
): Promise<boolean> {
  if (!store) return false;
  if (!(await store.setNx(lateNoticeKey(clinicId, week), LATE_NOTICE_TTL_S).catch(() => false))) return false;
  const onItsWay = await queued().catch(() => false);
  const out = await (notify ?? defaultClinicNotifier())(clinicId, week, kind, { queued: onItsWay }).catch((e: Error) => ({ sent: false, retry: false, reason: e.message }) as NotifyOutcome);
  const log = out.sent ? logger.info.bind(logger) : logger.warn.bind(logger);
  log({ clinicId, week, kind, queued: onItsWay, reason: out.reason }, out.sent ? "dentvid: clinic told its week is late" : "dentvid: could not tell the clinic its week is late");
  return out.sent;
}

/* ------------------------------------------------------------ Monday */

export type DispatchCheck = { week: string; active: number; jobs: number; missing: string[]; requeued: number; alerted: boolean };

export async function checkMondayDispatch(deps: WatchDeps): Promise<DispatchCheck> {
  const now = deps.now ?? new Date();
  // The week the dispatch queued: on Saturday evening, the coming Monday's.
  const week = deliveryWeek(now);
  const active = await deps.db.activeClinicIds();
  const res: DispatchCheck = { week, active: active.length, jobs: 0, missing: [], requeued: 0, alerted: false };
  if (!active.length) return res;

  const marker = deps.store ? await deps.store.get(dispatchKey(week)).catch(() => null) : null;
  const ran = marker ? (JSON.parse(marker) as { jobs?: number }) : null;

  const noJob: string[] = [];
  for (const id of active) {
    const job = await deps.queue.getJob(weekJobId(id, week)).catch(() => null);
    if (job) res.jobs++;
    else noJob.push(id);
  }
  // A clinic whose week is already in the library (e.g. made before its job was cleaned up) is fine.
  const made = noJob.length ? await deps.db.weekMade(noJob, week) : new Set<string>();
  res.missing = noJob.filter((id) => !made.has(id));

  for (const id of res.missing) {
    try {
      // Late already: at the front of the batch, still behind anyone waiting right now.
      const data: WeekJobData = { clinicId: id, count: 5, week, batch: true };
      await deps.queue.add("week", data, { jobId: weekJobId(id, week), ...batchWeekJobOpts(0) });
      res.requeued++;
    } catch (e) {
      logger.error({ clinicId: id, err: (e as Error).message }, "dentvid: watchdog could not queue a week");
    }
  }

  // Spec: the dispatch did not run, or ran with zero jobs while clinics are active, or a clinic has no job.
  const reason = !ran ? "the dispatch never ran" : ran.jobs === 0 ? "the dispatch ran but queued zero jobs" : res.missing.length ? `${res.missing.length} clinic(s) had no job` : "";
  if (reason) {
    await deps.alert(alerts.dispatchMissing({ week, activeClinics: active.length, jobs: res.jobs, missing: res.missing.length, requeued: res.requeued, reason }));
    res.alerted = true;
  }
  logger.info({ ...res, missing: res.missing.length }, "dentvid: monday watchdog");
  return res;
}

/* ------------------------------------------------------------ first week */

export type FirstWeekCheck = { checked: number; requeued: string[]; alerted: string[]; /** Clinics emailed about their late week this run ("first-late", or "late" for one coming back). */ notified: string[] };

const MIN = 60_000;

export async function checkFirstWeeks(deps: WatchDeps): Promise<FirstWeekCheck> {
  const now = deps.now ?? new Date();
  const t = thresholds(deps.env ?? process.env);
  const res: FirstWeekCheck = { checked: 0, requeued: [], alerted: [], notified: [] };
  const since = new Date(now.getTime() - 3 * 86_400_000);

  // Payments from the events table, plus the web app's Redis markers (either may be missing).
  const paid = new Map<string, string>();
  const returning = new Set<string>();
  const add = (clinicId: string, paidAt: string, back?: boolean) => {
    if (!clinicId || Number.isNaN(Date.parse(paidAt)) || Date.parse(paidAt) < since.getTime()) return;
    const prev = paid.get(clinicId);
    if (!prev || paidAt > prev) {
      paid.set(clinicId, paidAt);
      if (back) returning.add(clinicId);
      else returning.delete(clinicId);
    }
  };
  for (const p of await deps.db.firstPayments(since).catch(() => [])) add(p.clinicId, p.paidAt, p.returning);
  if (deps.store) {
    for (const raw of await deps.store.list(PAID_LIST_KEY).catch(() => [] as string[])) {
      try {
        const p = JSON.parse(raw) as { clinicId: string; paidAt: string; returning?: boolean };
        add(p.clinicId, p.paidAt, p.returning === true);
      } catch {
        // ignore
      }
    }
  }

  for (const [clinicId, paidAt] of paid) {
    const minutes = Math.floor((now.getTime() - Date.parse(paidAt)) / MIN);
    if (minutes < t.firstWeekRequeueMin) continue;
    res.checked++;
    if (await deps.db.deliveredSince(clinicId, new Date(paidAt))) continue;
    if (!(await deps.db.isActive(clinicId))) continue;

    // Same week the web app queued at payment (web/src/lib/dentvid/week-job.ts).
    const week = deliveryWeek(new Date(paidAt));
    const data: WeekJobData = { clinicId, count: 5, week };
    // A clinic that already has this week's videos (made before it cancelled and came back,
    // or by the Monday run) is delivered: re-queuing would make the same week twice.
    if ((await deps.db.weekMade([clinicId], week).catch(() => new Set<string>())).has(clinicId)) continue;
    const id = weekJobId(clinicId, week);
    const job = await deps.queue.getJob(id).catch(() => null);
    const state = job ? await job.getState().catch(() => "unknown") : "missing";
    let requeued = false;
    // Once per payment: the marker makes a second watchdog run (or a second worker) a no-op.
    const fresh = deps.store ? await deps.store.setNx(`dv:ops:fw-requeue:${clinicId}:${paidAt}`, 7 * 86_400).catch(() => false) : false;
    if (fresh) {
      if (state === "missing") {
        await deps.queue.add("week", data, { jobId: id, ...FIRST_WEEK_JOB_OPTS });
        requeued = true;
      } else if (state === "failed" && job) {
        await job.retry("failed");
        requeued = true;
      } else if (state === "completed") {
        // Ran but left nothing usable (or skipped): a fresh run under its own fixed id.
        await deps.queue.add("week", data, { jobId: `${id}:requeue`, ...FIRST_WEEK_JOB_OPTS });
        requeued = true;
      } else if ((state === "waiting" || state === "prioritized") && job?.changePriority && job.opts?.priority !== DENTVID_PRIORITY.firstWeek) {
        // Still waiting behind other work (queued before priorities existed,
        // or as a batch week): to the front, without a second job.
        await job.changePriority({ priority: DENTVID_PRIORITY.firstWeek });
        requeued = true;
      }
      // active / delayed / already at the front: on its way — re-queuing would not make it faster.
      if (requeued) {
        res.requeued.push(clinicId);
        logger.warn({ clinicId, minutes, state }, "dentvid: first week re-queued");
      }
    }
    if (minutes >= t.firstWeekAlertMin) {
      const wasRequeued = requeued || (deps.store ? (await deps.store.get(`dv:ops:fw-requeue:${clinicId}:${paidAt}`).catch(() => null)) !== null : false);
      const r = await deps.alert(alerts.firstWeekLate({ clinic: await deps.db.clinic(clinicId), paidAt, minutes, requeued: wasRequeued, jobState: state, returning: returning.has(clinicId) }));
      if (r === "sent") res.alerted.push(clinicId);
      // The dentist was told "you can close this page": a calm note instead of silence.
      //   - A new clinic: once ever, in first-week words.
      //   - A clinic coming back from a pause is not new ("your first videos" would be wrong):
      //     the routine "running late" words, once for its comeback week. The delivery watchdog
      //     skips that week when the clinic came back after its deadline, so this is its only note.
      // Either way the shared per-week marker keeps it to one email with the delivery watchdog's.
      // "Queued and on its way" only when it is: this run re-queued it, or its job (or the
      // re-queue's fresh run) is waiting or running. A failed run used up its one re-queue.
      const back = returning.has(clinicId);
      const ours = back || (deps.store ? await deps.store.setNx(firstLateNoticeKey(clinicId), FIRST_LATE_NOTICE_TTL_S).catch(() => false) : false);
      if (ours && (await noticeClinicOnce(deps.store, deps.notifyClinic, clinicId, week, back ? "late" : "first-late", async () => requeued || (await weekOnItsWay(deps.queue, [id, `${id}:requeue`]))))) {
        res.notified.push(clinicId);
      }
    }
  }
  return res;
}

/* ------------------------------------------------------------ Liman */

export function supabaseWatchDb(db: SupabaseClient): WatchDb {
  return {
    async activeClinicIds() {
      // "*": admin_paused_at (0010) may not exist yet. A clinic the owner paused gets no
      // week from the dispatch, so it must not count as "missing" here either.
      return (await activeClinicRows<ClinicRow>(db)).filter(getsWeeks).map((r) => r.id);
    },
    async firstPayments(since) {
      const { data, error } = await db
        .from("dentvid_events")
        .select("clinic_id, props, created_at")
        .eq("name", "payment_succeeded")
        .gte("created_at", since.toISOString())
        .limit(500);
      if (error) return [];
      return (data ?? [])
        .filter((r) => {
          const p = r.props as { first?: unknown; activated?: unknown } | null;
          return r.clinic_id && (p?.first === true || p?.activated === true);
        })
        .map((r) => ({
          clinicId: r.clinic_id as string,
          paidAt: new Date(r.created_at as string).toISOString(),
          returning: (r.props as { first?: unknown } | null)?.first !== true,
        }));
    },
    async deliveredSince(clinicId, since) {
      const { count } = await db
        .from("dentvid_items")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("kind", "generated")
        .in("status", ["ready", "flagged"])
        .gte("created_at", since.toISOString());
      return (count ?? 0) > 0;
    },
    async weekMade(clinicIds, week) {
      // Any generated item of that week except a failed placeholder counts: the week ran and was stored.
      const { data } = await db.from("dentvid_items").select("clinic_id").in("clinic_id", clinicIds).eq("kind", "generated").eq("week_of", week).neq("status", "failed");
      return new Set((data ?? []).map((r) => r.clinic_id as string));
    },
    async isActive(clinicId) {
      // Paused by the owner counts as not active: no re-queue, no "first week late" alert.
      const { data } = await db.from("dentvid_clinics").select("*").eq("id", clinicId).maybeSingle();
      const row = data as { plan?: string; admin_paused_at?: string | null } | null;
      return !!row && shouldRun({ plan: row.plan ?? "", admin_paused_at: row.admin_paused_at });
    },
    async clinic(clinicId) {
      const { data } = await db.from("dentvid_clinics").select("id, profile, plan_tier").eq("id", clinicId).maybeSingle();
      const p = ((data as { profile?: { name?: string; country?: string } } | null)?.profile ?? {}) as { name?: string; country?: string };
      return { id: clinicId, name: p.name ?? null, country: p.country ?? null, tier: (data as { plan_tier?: string } | null)?.plan_tier ?? null };
    },
  };
}
