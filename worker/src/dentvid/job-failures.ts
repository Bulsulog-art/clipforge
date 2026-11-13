import { alerts, cleanError, type ClinicRef, type OwnerAlert } from "./ops-alert.js";

/**
 * Which failed BullMQ jobs the owner must hear about, decided in one place
 * (index.ts wires it to the workers' "failed" events) so it is unit-tested.
 *
 *   dentvid-mail   watchdogs, billing reconcile, digest, lifecycle: a cron
 *                  that fails is otherwise silent — the very checks meant to
 *                  catch a missed Monday or a lapsed subscription would stop
 *                  without anyone noticing.
 *   dentvid        the Saturday dispatch; a dentist's own recording (a week
 *                  alerts from runDentvidWeek itself; a stalled week from index.ts).
 *
 * Only on the job's last attempt (no alert for a failure BullMQ will retry),
 * never for a spend-guard refusal (parked, already alerted), and the alert
 * keys de-duplicate per day (ops-alert.ts) so an hourly cron that keeps
 * failing is one email a day, not 24.
 */

/** Scheduled jobs and the retries their scheduler gives them (index.ts upsertJobScheduler). */
export const CRON_JOB_OPTS = { attempts: 3, backoff: { type: "exponential" as const, delay: 5 * 60_000 } };

export const MAIL_CRONS = new Set(["watchdog-monday", "watchdog-first-week", "billing-reconcile", "digest", "lifecycle"]);

export type FailedJob = {
  name: string;
  id?: string | null;
  data?: unknown;
  attemptsMade: number;
  opts?: { attempts?: number };
};

export type FailureAlert = { kind: "cron"; alert: OwnerAlert } | { kind: "recording"; clinicId: string; build: (clinic: ClinicRef) => OwnerAlert } | null;

const isFinal = (job: FailedJob) => job.attemptsMade >= Math.max(1, job.opts?.attempts ?? 1);

export function failureAlert(queue: "dentvid" | "dentvid-mail", job: FailedJob | undefined, err: unknown, opts: { spendRefusal?: boolean } = {}): FailureAlert {
  if (!job || opts.spendRefusal) return null;
  // UnrecoverableError ends a job early: BullMQ will not retry it either.
  const final = isFinal(job) || (err as { name?: string } | null)?.name === "UnrecoverableError";
  if (!final) return null;
  const error = cleanError(err);
  if (queue === "dentvid-mail") {
    return MAIL_CRONS.has(job.name) ? { kind: "cron", alert: alerts.cronFailed({ job: job.name, error, attempts: job.attemptsMade }) } : null;
  }
  if (job.name === "dispatch") return { kind: "cron", alert: alerts.cronFailed({ job: "dispatch", error, attempts: job.attemptsMade }) };
  if (job.name === "recording") {
    const clinicId = (job.data as { clinicId?: string } | null)?.clinicId ?? "unknown";
    return { kind: "recording", clinicId, build: (clinic) => alerts.recordingFailed({ clinic, attempts: job.attemptsMade, error, jobId: String(job.id ?? "") }) };
  }
  return null;
}

/** A lifecycle / digest run reports {ok:false} instead of throwing; turn that into a failure BullMQ (and failureAlert) sees. */
export function assertRunOk<T extends { ok: boolean; status?: number }>(name: string, run: T): T {
  if (!run.ok) throw new Error(`${name}: the web app did not complete the run${run.status ? ` (HTTP ${run.status})` : " (unreachable or no WORKER_INTERNAL_TOKEN)"}`);
  return run;
}
