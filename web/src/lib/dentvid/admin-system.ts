/**
 * Queue & system state for the admin panel, as pure functions of what Redis
 * returned — so parsing, staleness and the schedule maths are unit-tested
 * and the dev harness can feed fixtures to the same code.
 *
 * Keys read (all written by the worker):
 *   bull:<queue>:{wait,paused,active}               lists      (BullMQ)
 *   bull:<queue>:{prioritized,delayed,failed,completed,waiting-children}  sorted sets
 *   bull:<queue>:meta                               hash, "paused" when the queue is paused
 *   bull:<queue>:<jobId>                            hash: name, data, failedReason, attemptsMade, timestamp, processedOn, finishedOn
 *   dv:worker:heartbeats                            hash (worker/src/dentvid/heartbeat.ts)
 *   dv:cost:daily                                   hash: day → cents (heartbeat.ts)
 *   dv:ops:dispatch:<monday>                        the weekly dispatch marker (schedule.ts)
 *   dv:ops:alerts:<day>                             owner alerts raised that day (ops-alert.ts)
 */

export const QUEUES = ["dentvid", "dentvid-mail", "video-pipeline", "generate", "publish", "derivative"] as const;
export type QueueName = (typeof QUEUES)[number];
/** Queues whose failed jobs the panel may retry. */
export const RETRYABLE_QUEUES: readonly QueueName[] = ["dentvid", "dentvid-mail"];
export const isQueueName = (q: unknown): q is QueueName => typeof q === "string" && (QUEUES as readonly string[]).includes(q);

export const HEARTBEAT_KEY = "dv:worker:heartbeats";
export const COST_DAILY_KEY = "dv:cost:daily";
/** A worker silent for longer than this is shown as down. */
export const HEARTBEAT_STALE_MS = 3 * 60_000;
/** An active job running longer than this is called stuck (a week is ~12 min end to end; docs/CAPACITY.md). */
export const STUCK_ACTIVE_MS = 90 * 60_000;

/* ----------------------------------------------------------------- queues */

/** The commands for one queue's counts, in the order parseQueueCounts expects. */
export const COUNT_COMMANDS: { field: keyof QueueCounts; cmd: "llen" | "zcard"; suffix: string }[] = [
  { field: "waiting", cmd: "llen", suffix: "wait" },
  { field: "pausedJobs", cmd: "llen", suffix: "paused" },
  { field: "active", cmd: "llen", suffix: "active" },
  { field: "prioritized", cmd: "zcard", suffix: "prioritized" },
  { field: "delayed", cmd: "zcard", suffix: "delayed" },
  { field: "failed", cmd: "zcard", suffix: "failed" },
  { field: "completed", cmd: "zcard", suffix: "completed" },
  { field: "waitingChildren", cmd: "zcard", suffix: "waiting-children" },
];

export type QueueCounts = {
  waiting: number;
  pausedJobs: number;
  active: number;
  prioritized: number;
  delayed: number;
  failed: number;
  completed: number;
  waitingChildren: number;
};

export type QueueStats = QueueCounts & { name: string; paused: boolean; queued: number; error?: string };

/** ioredis pipeline replies are [err, value] pairs. */
export type PipelineReply = [Error | null, unknown];

const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
};

/**
 * One queue's stats from the replies to COUNT_COMMANDS followed by
 * HGET bull:<q>:meta paused. A failed command counts as 0 and is reported.
 */
export function parseQueueCounts(name: string, replies: PipelineReply[]): QueueStats {
  const counts = {} as QueueCounts;
  let error: string | undefined;
  COUNT_COMMANDS.forEach((c, i) => {
    const [err, v] = replies[i] ?? [new Error("missing reply"), null];
    if (err) error = err.message;
    counts[c.field] = err ? 0 : n(v);
  });
  const [metaErr, meta] = replies[COUNT_COMMANDS.length] ?? [null, null];
  const paused = !metaErr && meta !== null && meta !== undefined && String(meta) !== "0" && String(meta) !== "";
  return {
    name,
    ...counts,
    paused,
    queued: counts.waiting + counts.pausedJobs + counts.prioritized,
    ...(error ? { error } : {}),
  };
}

export const JOB_FIELDS = ["name", "data", "failedReason", "attemptsMade", "timestamp", "processedOn", "finishedOn", "opts"] as const;

export type JobInfo = {
  id: string;
  queue: string;
  name: string;
  clinicId: string | null;
  week: string | null;
  failedReason: string | null;
  attemptsMade: number;
  maxAttempts: number | null;
  priority: number | null;
  createdAt: string | null;
  processedAt: string | null;
  finishedAt: string | null;
};

const ms = (v: unknown) => {
  const x = Number(v);
  return v !== null && v !== undefined && v !== "" && Number.isFinite(x) && x > 0 ? new Date(x).toISOString() : null;
};

/** A job's hash (HMGET bull:<q>:<id> ...JOB_FIELDS) as the panel shows it; null when the job is gone. */
export function parseJobHash(queue: string, id: string, values: (string | null)[]): JobInfo | null {
  if (!values.length || values.every((v) => v === null)) return null;
  const [name, data, failedReason, attemptsMade, timestamp, processedOn, finishedOn, opts] = values;
  let d: Record<string, unknown> = {};
  let o: Record<string, unknown> = {};
  try {
    d = JSON.parse(data ?? "{}") ?? {};
  } catch {
    d = {};
  }
  try {
    o = JSON.parse(opts ?? "{}") ?? {};
  } catch {
    o = {};
  }
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    id,
    queue,
    name: name ?? "?",
    clinicId: str(d.clinicId) && /^[0-9a-f-]{36}$/i.test(String(d.clinicId)) ? String(d.clinicId) : null,
    week: str(d.week),
    failedReason: failedReason ? failedReason.slice(0, 500) : null,
    attemptsMade: n(attemptsMade),
    maxAttempts: typeof o.attempts === "number" ? o.attempts : null,
    priority: typeof o.priority === "number" ? o.priority : null,
    createdAt: ms(timestamp),
    processedAt: ms(processedOn),
    finishedAt: ms(finishedOn),
  };
}

/** An active job that has been running for longer than STUCK_ACTIVE_MS. */
export function isStuck(job: Pick<JobInfo, "processedAt">, now: Date): boolean {
  if (!job.processedAt) return false;
  return now.getTime() - Date.parse(job.processedAt) > STUCK_ACTIVE_MS;
}

/** A BullMQ job id the panel may act on: no key separators or glob characters. */
export const isJobId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9:_.@/-]{1,300}$/.test(id) && !id.includes("..");

/* -------------------------------------------------------------- heartbeat */

export type Heartbeat = {
  field: string;
  host: string;
  pid: number | null;
  version: string;
  startedAt: string | null;
  at: string;
  uptimeSec: number | null;
  roles: string[];
  renderConcurrency: number | null;
};

export type HeartbeatView = Heartbeat & { ageMs: number; stale: boolean };

/** The heartbeat hash, newest first, each with its age and whether it is stale (> 3 min). */
export function parseHeartbeats(all: Record<string, string> | null | undefined, now: Date): HeartbeatView[] {
  const out: HeartbeatView[] = [];
  for (const [field, raw] of Object.entries(all ?? {})) {
    let p: Record<string, unknown>;
    try {
      p = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      continue;
    }
    const at = typeof p.at === "string" && Number.isFinite(Date.parse(p.at)) ? p.at : null;
    if (!at) continue;
    const ageMs = Math.max(0, now.getTime() - Date.parse(at));
    out.push({
      field,
      host: typeof p.host === "string" ? p.host : field,
      pid: typeof p.pid === "number" ? p.pid : null,
      version: typeof p.version === "string" ? p.version : "unknown",
      startedAt: typeof p.startedAt === "string" ? p.startedAt : null,
      at,
      uptimeSec: typeof p.uptimeSec === "number" ? p.uptimeSec : null,
      roles: Array.isArray(p.roles) ? p.roles.filter((r): r is string => typeof r === "string") : [],
      renderConcurrency: typeof p.renderConcurrency === "number" ? p.renderConcurrency : null,
      ageMs,
      stale: heartbeatStale(at, now),
    });
  }
  return out.sort((a, b) => a.ageMs - b.ageMs);
}

export function heartbeatStale(at: string | null | undefined, now: Date): boolean {
  const t = Date.parse(at ?? "");
  return !Number.isFinite(t) || now.getTime() - t > HEARTBEAT_STALE_MS;
}

/**
 * The worker's overall state: "down" with no fresh heartbeat at all, "partial"
 * when a process that used to beat went quiet (a render server, say), else "up".
 * The roles that matter are covered by the fresh ones: a stale entry of a role
 * still served by a fresh process is history, not an outage.
 */
export function workerHealth(beats: HeartbeatView[]): "up" | "partial" | "down" | "unknown" {
  if (!beats.length) return "unknown";
  const fresh = beats.filter((b) => !b.stale);
  if (!fresh.length) return "down";
  const covered = new Set(fresh.flatMap((b) => b.roles));
  const missing = beats.filter((b) => b.stale && b.ageMs < 86_400_000).some((b) => b.roles.some((r) => !covered.has(r)));
  return missing ? "partial" : "up";
}

/* ---------------------------------------------------------------- batches */

/** Saturday 18:00 UTC (worker/src/dentvid/schedule.ts DISPATCH_SCHEDULE): the next weekly batch at or after `now`. */
export function nextDispatch(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0));
  const add = (6 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

/** The Monday the batch at `dispatch` is for (the one after it). */
export function dispatchWeek(dispatch: Date): string {
  const d = new Date(dispatch.getTime() + 2 * 86_400_000);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
}

/** The most recent batch before `now`, and the Monday it was for. */
export function lastDispatch(now: Date): { at: Date; week: string } {
  const next = nextDispatch(now);
  const at = new Date(next.getTime() - 7 * 86_400_000);
  return { at, week: dispatchWeek(at) };
}

export type DispatchMarker = { at: string; jobs: number; waves: number; projectedLate: number };

export function parseDispatch(raw: string | null | undefined): DispatchMarker | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (typeof p.at !== "string") return null;
    return { at: p.at, jobs: n(p.jobs), waves: n(p.waves), projectedLate: n(p.projectedLate) };
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- alerts */

export type OpsAlert = { at: string; severity: string; title: string; key: string; clinic: string | null };

/** Owner alerts from the per-day logs (oldest first in each list), newest first overall. */
export function parseAlerts(lists: (string[] | null | undefined)[]): OpsAlert[] {
  const out: OpsAlert[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      try {
        const p = JSON.parse(raw) as Record<string, unknown>;
        if (typeof p.at !== "string" || typeof p.title !== "string") continue;
        out.push({
          at: p.at,
          severity: typeof p.severity === "string" ? p.severity : "info",
          title: p.title.slice(0, 300),
          key: typeof p.key === "string" ? p.key : "",
          clinic: typeof p.clinic === "string" ? p.clinic : null,
        });
      } catch {
        // skip
      }
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Alerts about money coming back (refunds, disputes) — for the Billing screen. */
export const isBillingAlert = (a: Pick<OpsAlert, "key" | "title">) => /refund|dispute|chargeback|billing|payment|webhook/i.test(`${a.key} ${a.title}`);

/* ------------------------------------------------------------------- cost */

/** Day → USD from the cost hash (cents), merged with the live day counters (cents) the spend guard keeps. */
export function costByDay(hash: Record<string, string> | null | undefined, live: Record<string, string | null> = {}): Map<string, number> {
  const out = new Map<string, number>();
  for (const [d, v] of Object.entries(hash ?? {})) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) out.set(d, n(v) / 100);
  for (const [d, v] of Object.entries(live)) if (v !== null && /^\d{4}-\d{2}-\d{2}$/.test(d)) out.set(d, Math.max(out.get(d) ?? 0, n(v) / 100));
  return out;
}

/** Sum of the last `days` UTC days (today included). */
export function costOver(byDay: Map<string, number>, days: number, now: Date): number {
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    sum += byDay.get(d) ?? 0;
  }
  return Math.round(sum * 100) / 100;
}
