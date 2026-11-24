import type IORedis from "ioredis";
import { HEARTBEAT_KEY, lastDispatch, parseDispatch, parseHeartbeats, type HeartbeatView } from "./admin-system";

/**
 * Is the DentVideo worker doing its job? For an outside uptime monitor
 * (GET /api/health?worker=1): every other alarm runs inside the worker, so a
 * worker that died on a Friday night would stay silent through the weekend
 * and no week would be made.
 *
 * Unhealthy (503) when any of these holds:
 *   heartbeat  no heartbeat younger than 3 minutes (admin-system.ts) covers
 *              one of the roles dentvid (renders), dentvid-mail (emails,
 *              watchdogs) or crons; a dentvid beat must also take renders
 *              (render concurrency above 0)
 *   dispatch   from 60 minutes after the Saturday 18:00 UTC dispatch until
 *              21:00 UTC, the marker for the coming week is missing
 *              (dv:ops:dispatch:<monday>, worker schedule.ts). The dispatch
 *              job waits behind the one render already running and retries
 *              5 and 10 minutes apart, so its marker can be most of an hour
 *              late on a healthy box. After 21:00 the 19:30 dispatch watchdog
 *              (worker watchdog.ts) has queued whatever was missing and told
 *              the owner, without writing the marker: a red light kept up
 *              after that repair would hide the next real outage, so from
 *              then on the heartbeat and queue checks watch the batch.
 *   queue      the oldest waiting or prioritized dentvid job has waited more
 *              than 6 hours while none is active. Its wait starts when it
 *              became due: its add time plus its delay (a scheduler job is
 *              created a week ahead), or when its last attempt started (a
 *              retry), not when it was first added
 *   database   a head count on dentvid_clinics (Liman) fails
 *   Redis      cannot be read at all: none of the above can be known
 *
 * What it says names no hosts, keys, job ids or clinics: only which check
 * failed, in words, and for the worker the roles that went quiet.
 */

export const WATCHED_ROLES = ["dentvid", "dentvid-mail", "crons"] as const;
export type WatchedRole = (typeof WATCHED_ROLES)[number];
/** After the Saturday dispatch, how long its marker may take to appear. */
export const DISPATCH_GRACE_MS = 60 * 60_000;
/** The dispatch is checked until Saturday 21:00 UTC (18:00 + 3 h), after the 19:30 dispatch watchdog. */
export const DISPATCH_WATCH_MS = 3 * 3_600_000;
/** A dentvid job waiting longer than this with nothing running means nothing is taking jobs. */
export const QUEUE_WAIT_MAX_MS = 6 * 3_600_000;
/** Ids read from the queue for the oldest-job check (its oldest and its next to run). */
export const QUEUE_SAMPLE = 100;

export type Check = { ok: boolean; detail?: string };
export type WorkerHealth = {
  ok: boolean;
  checks: { heartbeat: Check; dispatch: Check; queue: Check; database: Check };
};

/** What the checks read from Redis; null when Redis could not be read. */
export type WorkerState = {
  heartbeats: HeartbeatView[];
  /** The raw dispatch marker of the most recent Saturday batch. */
  dispatchMarker: string | null;
  /** Epoch ms since which the longest-waiting dentvid job has waited (waitingSince), null when none waits. */
  oldestWaitingAt: number | null;
  active: number;
};

/** The watched roles that no fresh heartbeat covers. */
export function quietRoles(beats: HeartbeatView[]): WatchedRole[] {
  const fresh = beats.filter((b) => !b.stale);
  return WATCHED_ROLES.filter(
    (role) =>
      !fresh.some(
        // A process with the dentvid role but no render slots (DENTVID_RENDER_CONCURRENCY=0) makes no videos.
        (b) => b.roles.includes(role) && (role !== "dentvid" || b.renderConcurrency === null || b.renderConcurrency > 0),
      ),
  );
}

export function judgeWorkerHealth(state: WorkerState | null, database: Check, now: Date): WorkerHealth {
  if (!state) {
    const down = { ok: false, detail: "redis unreachable" };
    return { ok: false, checks: { heartbeat: down, dispatch: down, queue: down, database } };
  }
  const quiet = quietRoles(state.heartbeats);
  const heartbeat: Check = quiet.length ? { ok: false, detail: `no fresh heartbeat for: ${quiet.join(", ")}` } : { ok: true };

  const last = lastDispatch(now);
  const since = now.getTime() - last.at.getTime();
  const due = since >= DISPATCH_GRACE_MS && since < DISPATCH_WATCH_MS;
  const dispatch: Check = !due || parseDispatch(state.dispatchMarker) ? { ok: true } : { ok: false, detail: "the weekly dispatch has not run" };

  const waitedMs = state.oldestWaitingAt === null ? 0 : now.getTime() - state.oldestWaitingAt;
  const queue: Check =
    state.active === 0 && waitedMs > QUEUE_WAIT_MAX_MS
      ? { ok: false, detail: `a job has waited ${(waitedMs / 3_600_000).toFixed(1)} h with none running` }
      : { ok: true };

  return { ok: heartbeat.ok && dispatch.ok && queue.ok && database.ok, checks: { heartbeat, dispatch, queue, database } };
}

/**
 * Since when a job in the wait or prioritized list has been waiting, from its
 * BullMQ hash fields: the later of when it became due (timestamp + opts.delay;
 * BullMQ sets the hash's own "delay" to 0 when it promotes a delayed job, the
 * opts keep it) and when its last attempt started (processedOn, for a retry
 * back from its backoff). Null when the hash has no usable timestamp.
 */
export function waitingSince(fields: { timestamp?: unknown; opts?: unknown; processedOn?: unknown }): number | null {
  const ts = Number(fields.timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  let delay = 0;
  if (typeof fields.opts === "string") {
    try {
      const d = Number((JSON.parse(fields.opts) as { delay?: unknown } | null)?.delay);
      if (Number.isFinite(d) && d > 0) delay = d;
    } catch {
      // Unreadable options: the add time is the best guess.
    }
  }
  const started = Number(fields.processedOn);
  return Math.max(ts + delay, Number.isFinite(started) && started > 0 ? started : 0);
}

type Reply = [Error | null, unknown];

async function ready(r: IORedis): Promise<boolean> {
  if (r.status === "ready") return true;
  await new Promise<void>((resolve) => {
    const onReady = () => {
      clearTimeout(t);
      resolve();
    };
    // Gone on a timeout too: a Redis that stays down must not collect one listener per health check.
    const t = setTimeout(() => {
      r.off("ready", onReady);
      resolve();
    }, 800);
    r.once("ready", onReady);
  });
  return (r.status as string) === "ready";
}

const value = (reply: Reply | undefined) => {
  if (!reply || reply[0]) throw reply?.[0] ?? new Error("missing reply");
  return reply[1];
};

/** Reads what judgeWorkerHealth needs (read-only). Throws when Redis does not answer. */
export async function readWorkerState(redis: IORedis, now: Date): Promise<WorkerState> {
  if (!(await ready(redis))) throw new Error("redis not ready");
  const p = redis.pipeline();
  p.hgetall(HEARTBEAT_KEY);
  p.get(`dv:ops:dispatch:${lastDispatch(now).week}`);
  p.llen("bull:dentvid:active");
  // BullMQ pushes new jobs on the left of the wait list and takes them from the right: the oldest are last.
  p.lrange("bull:dentvid:wait", -QUEUE_SAMPLE, -1);
  // Prioritized jobs in the order they will run; the weekly batch is queued all at once.
  p.zrange("bull:dentvid:prioritized", 0, QUEUE_SAMPLE - 1);
  const res = ((await p.exec()) ?? []) as Reply[];
  const heartbeats = parseHeartbeats(value(res[0]) as Record<string, string> | null, now);
  const dispatchMarker = (value(res[1]) as string | null) ?? null;
  const active = Number(value(res[2]) ?? 0) || 0;
  const ids = [...new Set([...((value(res[3]) as string[] | null) ?? []), ...((value(res[4]) as string[] | null) ?? [])])];

  let oldestWaitingAt: number | null = null;
  if (ids.length) {
    const q = redis.pipeline();
    for (const id of ids) q.hmget(`bull:dentvid:${id}`, "timestamp", "opts", "processedOn");
    for (const [err, reply] of ((await q.exec()) ?? []) as Reply[]) {
      if (err || !Array.isArray(reply)) continue;
      const [timestamp, opts, processedOn] = reply as (string | null)[];
      const t = waitingSince({ timestamp, opts, processedOn });
      if (t !== null && (oldestWaitingAt === null || t < oldestWaitingAt)) oldestWaitingAt = t;
    }
  }
  return { heartbeats, dispatchMarker, oldestWaitingAt, active };
}

/**
 * The last judged result, for HEALTH_CACHE_MS: a monitor (or anyone) asking
 * more often costs no reads at all, and is answered before the rate limit, so
 * someone sharing the monitor's address cannot turn its checks into 429s.
 */
export const HEALTH_CACHE_MS = 15_000;
let cached: { at: number; health: WorkerHealth } | null = null;

export function cachedWorkerHealth(now: Date): WorkerHealth | null {
  if (!cached) return null;
  const age = now.getTime() - cached.at;
  return age >= 0 && age < HEALTH_CACHE_MS ? cached.health : null;
}

export function rememberWorkerHealth(now: Date, health: WorkerHealth): void {
  cached = { at: now.getTime(), health };
}

/** For tests. */
export function _resetWorkerHealthCache(): void {
  cached = null;
}
