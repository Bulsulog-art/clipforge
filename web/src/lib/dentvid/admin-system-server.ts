import type IORedis from "ioredis";
import {
  COST_DAILY_KEY,
  COUNT_COMMANDS,
  HEARTBEAT_KEY,
  JOB_FIELDS,
  MONITOR_HISTORY_KEY,
  MONITOR_LAST_KEY,
  MONITOR_STATE_KEY,
  QUEUES,
  costByDay,
  dispatchWeek,
  emptyMonitor,
  isStuck,
  lastDispatch,
  monitorView,
  nextDispatch,
  parseAlerts,
  parseDispatch,
  parseHeartbeats,
  parseJobHash,
  parseMonitorHistory,
  parseMonitorRun,
  parseMonitorState,
  parseQueueCounts,
  workerHealth,
  type DispatchMarker,
  type HeartbeatView,
  type JobInfo,
  type MonitorView,
  type OpsAlert,
  type PipelineReply,
  type QueueStats,
} from "./admin-system";

/**
 * Reads the queue & system state from Redis (REDIS_URL, the limiter's
 * connection: commands time out in 500 ms). Read-only; every part fails soft
 * and the whole read gives up after 2.5 s, so a dead Redis costs the page
 * one short wait and a "Redis not reachable" note, never an error.
 */

export type SystemSnapshot = {
  available: boolean;
  error?: string;
  queues: QueueStats[];
  failed: JobInfo[];
  stuck: JobInfo[];
  heartbeats: HeartbeatView[];
  health: ReturnType<typeof workerHealth>;
  lastBatch: { at: string; week: string; marker: DispatchMarker | null };
  nextBatch: { at: string; week: string };
  alerts: OpsAlert[];
  costByDay: [string, number][];
  /** The synthetic monitor's last run and history. */
  monitor: MonitorView;
};

const DAY = 86_400_000;

export function emptySnapshot(now: Date, error?: string): SystemSnapshot {
  const last = lastDispatch(now);
  const next = nextDispatch(now);
  return {
    available: false,
    ...(error ? { error } : {}),
    queues: [],
    failed: [],
    stuck: [],
    heartbeats: [],
    health: "unknown",
    lastBatch: { at: last.at.toISOString(), week: last.week, marker: null },
    nextBatch: { at: next.toISOString(), week: dispatchWeek(next) },
    alerts: [],
    costByDay: [],
    monitor: emptyMonitor(),
  };
}

async function ready(r: IORedis): Promise<boolean> {
  if (r.status === "ready") return true;
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 800);
    r.once("ready", () => {
      clearTimeout(t);
      resolve();
    });
  });
  return (r.status as string) === "ready";
}

async function jobs(r: IORedis, queue: string, ids: string[]): Promise<JobInfo[]> {
  if (!ids.length) return [];
  const p = r.pipeline();
  for (const id of ids) p.hmget(`bull:${queue}:${id}`, ...JOB_FIELDS);
  const res = ((await p.exec()) ?? []) as PipelineReply[];
  return ids.map((id, i) => (res[i]?.[0] ? null : parseJobHash(queue, id, (res[i]?.[1] as (string | null)[]) ?? []))).filter((j): j is JobInfo => !!j);
}

export async function readSystem(now = new Date(), opts: { failedPerQueue?: number; redis?: IORedis | null } = {}): Promise<SystemSnapshot> {
  let r: IORedis | null;
  if (opts.redis !== undefined) r = opts.redis;
  else {
    try {
      const { limiterRedis } = await import("../rate-limit-server");
      r = limiterRedis();
    } catch {
      r = null;
    }
  }
  if (!r) return emptySnapshot(now, "REDIS_URL is not set on the web app.");
  const redis = r;
  const work = (async (): Promise<SystemSnapshot> => {
    if (!(await ready(redis))) return emptySnapshot(now, "Redis is not reachable from the web app.");
    const p = redis.pipeline();
    for (const q of QUEUES) {
      for (const c of COUNT_COMMANDS) p[c.cmd](`bull:${q}:${c.suffix}`);
      p.hget(`bull:${q}:meta`, "paused");
    }
    const per = opts.failedPerQueue ?? 15;
    for (const q of QUEUES) p.zrevrange(`bull:${q}:failed`, 0, per - 1);
    for (const q of QUEUES) p.lrange(`bull:${q}:active`, 0, 19);
    p.hgetall(HEARTBEAT_KEY);
    const last = lastDispatch(now);
    const next = nextDispatch(now);
    p.get(`dv:ops:dispatch:${last.week}`);
    const days = [0, 1, 2].map((i) => new Date(now.getTime() - i * DAY).toISOString().slice(0, 10));
    for (const d of days) p.lrange(`dv:ops:alerts:${d}`, 0, -1);
    p.hgetall(COST_DAILY_KEY);
    for (const d of days) p.get(`dv:spend:usd:day:${d}`);
    p.get(MONITOR_LAST_KEY);
    p.lrange(MONITOR_HISTORY_KEY, 0, -1);
    p.get(MONITOR_STATE_KEY);
    const res = ((await p.exec()) ?? []) as PipelineReply[];

    let i = 0;
    const take = (k: number) => {
      const out = res.slice(i, i + k);
      i += k;
      return out;
    };
    const queues = QUEUES.map((q) => parseQueueCounts(q, take(COUNT_COMMANDS.length + 1)));
    const failedIds = QUEUES.map((q) => ({ q, ids: ((take(1)[0]?.[1] as string[] | null) ?? []).slice(0, per) }));
    const activeIds = QUEUES.map((q) => ({ q, ids: (take(1)[0]?.[1] as string[] | null) ?? [] }));
    const hb = take(1)[0]?.[1] as Record<string, string> | null;
    const marker = parseDispatch(take(1)[0]?.[1] as string | null);
    const alertLists = take(days.length).map((x) => (x[1] as string[] | null) ?? []);
    const costHash = take(1)[0]?.[1] as Record<string, string> | null;
    const live = Object.fromEntries(days.map((d) => [d, (take(1)[0]?.[1] as string | null) ?? null]));
    const monitorLast = parseMonitorRun(take(1)[0]?.[1] as string | null);
    const monitorHistory = parseMonitorHistory(take(1)[0]?.[1] as string[] | null);
    const monitorState = parseMonitorState(take(1)[0]?.[1] as string | null);

    const failed = (await Promise.all(failedIds.map(({ q, ids }) => jobs(redis, q, ids)))).flat().sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));
    const active = (await Promise.all(activeIds.map(({ q, ids }) => jobs(redis, q, ids)))).flat();
    const heartbeats = parseHeartbeats(hb, now);
    return {
      available: true,
      queues,
      failed,
      stuck: active.filter((j) => isStuck(j, now)),
      heartbeats,
      health: workerHealth(heartbeats),
      lastBatch: { at: last.at.toISOString(), week: last.week, marker },
      nextBatch: { at: next.toISOString(), week: dispatchWeek(next) },
      alerts: parseAlerts(alertLists),
      costByDay: [...costByDay(costHash, live).entries()].sort((a, b) => a[0].localeCompare(b[0])),
      monitor: monitorView(monitorLast, monitorHistory, monitorState, now),
    };
  })();
  const timeout = new Promise<SystemSnapshot>((resolve) => setTimeout(() => resolve(emptySnapshot(now, "Redis did not answer in time.")), 2500));
  try {
    return await Promise.race([work, timeout]);
  } catch (e) {
    return emptySnapshot(now, `Redis read failed: ${(e as Error).message}`);
  }
}
