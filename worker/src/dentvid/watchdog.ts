import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { batchWeekJobOpts, DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS, type WeekJobData } from "./job-options.js";
import { activeClinicRows, deliveryWeek, dispatchKey, shouldRun, weekJobId, type ClinicRow } from "./schedule.js";
import { alerts, thresholds, type ClinicRef, type DeliverResult, type OpsStore, type OwnerAlert } from "./ops-alert.js";

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
 *
 * Time, the database, the queue and the alert are injected, so the logic is
 * tested with a fake clock and fakes.
 */

/** 90 minutes after the Saturday 18:00 UTC dispatch (schedule.ts DISPATCH_SCHEDULE). */
export const WATCHDOG_SCHEDULE = { pattern: "30 19 * * 6", tz: "UTC" } as const;
export const FIRST_WEEK_SCHEDULE = { pattern: "*/15 * * * *", tz: "UTC" } as const;
/** Paid-clinic markers the web app writes (best effort) next to the payment_succeeded event. */
export const PAID_LIST_KEY = "dv:ops:paid";

export interface WatchDb {
  /** Clinics that should have a week: paying and not paused by the owner (schedule.ts shouldRun). */
  activeClinicIds(): Promise<string[]>;
  /** First payments (payment_succeeded with first = true) since a time. */
  firstPayments(since: Date): Promise<{ clinicId: string; paidAt: string }[]>;
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

export type WatchDeps = {
  db: WatchDb;
  queue: WatchQueue;
  store: OpsStore | null;
  alert: (a: OwnerAlert) => Promise<DeliverResult>;
  now?: Date;
  env?: Record<string, string | undefined>;
};

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

export type FirstWeekCheck = { checked: number; requeued: string[]; alerted: string[] };

const MIN = 60_000;

export async function checkFirstWeeks(deps: WatchDeps): Promise<FirstWeekCheck> {
  const now = deps.now ?? new Date();
  const t = thresholds(deps.env ?? process.env);
  const res: FirstWeekCheck = { checked: 0, requeued: [], alerted: [] };
  const since = new Date(now.getTime() - 3 * 86_400_000);

  // Payments from the events table, plus the web app's Redis markers (either may be missing).
  const paid = new Map<string, string>();
  const add = (clinicId: string, paidAt: string) => {
    if (!clinicId || Number.isNaN(Date.parse(paidAt)) || Date.parse(paidAt) < since.getTime()) return;
    const prev = paid.get(clinicId);
    if (!prev || paidAt > prev) paid.set(clinicId, paidAt);
  };
  for (const p of await deps.db.firstPayments(since).catch(() => [])) add(p.clinicId, p.paidAt);
  if (deps.store) {
    for (const raw of await deps.store.list(PAID_LIST_KEY).catch(() => [] as string[])) {
      try {
        const p = JSON.parse(raw) as { clinicId: string; paidAt: string };
        add(p.clinicId, p.paidAt);
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
      const r = await deps.alert(alerts.firstWeekLate({ clinic: await deps.db.clinic(clinicId), paidAt, minutes, requeued: wasRequeued, jobState: state }));
      if (r === "sent") res.alerted.push(clinicId);
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
      return (await activeClinicRows<ClinicRow>(db)).filter(shouldRun).map((r) => r.id);
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
        .filter((r) => r.clinic_id && (r.props as { first?: unknown } | null)?.first === true)
        .map((r) => ({ clinicId: r.clinic_id as string, paidAt: new Date(r.created_at as string).toISOString() }));
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
