import os from "node:os";
import type IORedis from "ioredis";
import { logger } from "../logger.js";

/**
 * The worker's pulse, for the owner's admin panel (/admin/system on the web
 * app, which reads the same Redis):
 *
 *   dv:worker:heartbeats   hash: one field per worker process (host:pid) →
 *                          JSON { host, pid, version, startedAt, at, uptimeSec,
 *                          roles, renderConcurrency }. Written every minute;
 *                          the panel shows an entry older than 3 minutes as
 *                          down. Entries silent for a week are pruned here.
 *   dv:cost:daily          hash: UTC day → cents of API spend reserved by the
 *                          spend guard that day (spend-guard.ts keeps the day
 *                          counter only 3 days, for its cap). Copied from the
 *                          live counter each minute, so the panel can show
 *                          7- and 30-day spend; days older than 400 are pruned.
 *
 * Best effort: a heartbeat that cannot be written is logged and never stops
 * the worker. Field names and keys are shared with
 * web/src/lib/dentvid/admin-system.ts.
 */

export const HEARTBEAT_KEY = "dv:worker:heartbeats";
export const COST_DAILY_KEY = "dv:cost:daily";
export const HEARTBEAT_EVERY_MS = 60_000;
const PRUNE_HEARTBEAT_MS = 7 * 86_400_000;
const KEEP_COST_DAYS = 400;

export type Heartbeat = {
  host: string;
  pid: number;
  version: string;
  startedAt: string;
  at: string;
  uptimeSec: number;
  roles: string[];
  renderConcurrency: number;
};

export function heartbeatPayload(args: {
  roles: Iterable<string>;
  renderConcurrency: number;
  startedAt: Date;
  now?: Date;
  env?: Record<string, string | undefined>;
  host?: string;
  pid?: number;
}): Heartbeat {
  const now = args.now ?? new Date();
  const env = args.env ?? process.env;
  return {
    host: args.host ?? os.hostname(),
    pid: args.pid ?? process.pid,
    version: (env.GIT_COMMIT_SHA || env.SOURCE_COMMIT || env.npm_package_version || "unknown").slice(0, 40),
    startedAt: args.startedAt.toISOString(),
    at: now.toISOString(),
    uptimeSec: Math.max(0, Math.round((now.getTime() - args.startedAt.getTime()) / 1000)),
    roles: [...args.roles].sort(),
    renderConcurrency: args.renderConcurrency,
  };
}

export const heartbeatField = (hb: Pick<Heartbeat, "host" | "pid">) => `${hb.host}:${hb.pid}`;

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** Fields of the heartbeat hash that have been silent for a week (dead processes). */
export function staleHeartbeatFields(all: Record<string, string>, now: Date): string[] {
  const out: string[] = [];
  for (const [field, raw] of Object.entries(all)) {
    let at = NaN;
    try {
      at = Date.parse((JSON.parse(raw) as { at?: string }).at ?? "");
    } catch {
      // unreadable: prune
    }
    if (!Number.isFinite(at) || now.getTime() - at > PRUNE_HEARTBEAT_MS) out.push(field);
  }
  return out;
}

/** Days of the cost hash older than KEEP_COST_DAYS. */
export function oldCostDays(days: string[], now: Date): string[] {
  const cutoff = dayOf(new Date(now.getTime() - KEEP_COST_DAYS * 86_400_000));
  return days.filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < cutoff);
}

/** One beat: the heartbeat, today's and yesterday's spend copied into the long-lived cost hash, pruning. */
export async function beat(r: Pick<IORedis, "hset" | "hgetall" | "hdel" | "hkeys" | "get">, hb: Heartbeat, now = new Date()): Promise<void> {
  await r.hset(HEARTBEAT_KEY, heartbeatField(hb), JSON.stringify(hb));
  const today = dayOf(now);
  const yesterday = dayOf(new Date(now.getTime() - 86_400_000));
  for (const d of [yesterday, today]) {
    const v = await r.get(`dv:spend:usd:day:${d}`);
    if (v !== null && Number.isFinite(Number(v))) await r.hset(COST_DAILY_KEY, d, String(Math.round(Number(v))));
  }
  // Pruning is cheap but not needed every minute.
  if (now.getUTCMinutes() === 0) {
    const stale = staleHeartbeatFields(await r.hgetall(HEARTBEAT_KEY), now);
    if (stale.length) await r.hdel(HEARTBEAT_KEY, ...stale);
    const old = oldCostDays(await r.hkeys(COST_DAILY_KEY), now);
    if (old.length) await r.hdel(COST_DAILY_KEY, ...old);
  }
}

/** Starts the minute heartbeat; returns a stop function. */
export function startHeartbeat(r: IORedis, info: { roles: Iterable<string>; renderConcurrency: number }): () => void {
  const startedAt = new Date();
  const roles = [...info.roles];
  const tick = () => {
    if (r.status !== "ready") return;
    beat(r, heartbeatPayload({ roles, renderConcurrency: info.renderConcurrency, startedAt })).catch((e) =>
      logger.warn({ err: (e as Error).message }, "dentvid: heartbeat not written"),
    );
  };
  if (r.status === "ready") tick();
  else r.once("ready", tick);
  const t = setInterval(tick, HEARTBEAT_EVERY_MS);
  t.unref?.();
  return () => clearInterval(t);
}
