import IORedis from "ioredis";
import { NextResponse } from "next/server";
import { checkAll, type Check, type CounterStore, type LimitResult } from "./rate-limit";
import type { ReplayStore } from "./webhook-replay";

/**
 * Redis-backed limits for the API routes (REDIS_URL — the same Redis as the
 * queues, its own connection). Fail-open: if Redis does not answer within a
 * few hundred milliseconds the request goes through and a warning is logged.
 * Rate limits protect capacity; the money is protected fail-closed by the
 * worker's spend guard (worker/src/dentvid/spend-guard.ts), so an outage of
 * the limiter never turns into spend.
 */

let _redis: IORedis | null | undefined;

export function limiterRedis(): IORedis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return (_redis = null);
  _redis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    commandTimeout: 500,
    connectTimeout: 2000,
  });
  _redis.on("error", () => {}); // reported per request below; avoid unhandled 'error' events
  return _redis;
}

/** The limiter's connection, waiting briefly for it on first use (the first requests after a start). */
async function readyRedis(): Promise<IORedis | null> {
  const r = limiterRedis();
  if (!r || r.status === "ready") return r;
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 500);
    r.once("ready", () => {
      clearTimeout(t);
      resolve();
    });
  });
  return r;
}

export class RedisStore implements CounterStore {
  constructor(private r: IORedis) {}
  async incr(key: string, ttlSec: number): Promise<number> {
    const res = await this.r.multi().incr(key).expire(key, ttlSec).exec();
    const n = res?.[0]?.[1];
    if (typeof n !== "number") throw new Error("rate limit: bad INCR reply");
    return n;
  }
  async get(key: string): Promise<number> {
    return Number((await this.r.get(key)) ?? 0);
  }
}

export async function limitChecks(checks: Check[]): Promise<LimitResult> {
  const r = await readyRedis();
  if (!r) return { ok: true, remaining: -1, retryAfterSec: 0 };
  try {
    return await checkAll(new RedisStore(r), checks);
  } catch (e) {
    console.warn("[rate-limit] store unavailable, allowing request", (e as Error).message);
    return { ok: true, remaining: -1, retryAfterSec: 0 };
  }
}

export function tooManyResponse(message: string, retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: message, retryAfter: retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

/**
 * Apply limits; null when the request may proceed, else the 429 to return.
 * `message` is a function so the localized text is only built on refusal.
 */
export async function rateLimited(checks: Check[], message: () => string | Promise<string>): Promise<NextResponse | null> {
  const res = await limitChecks(checks);
  if (res.ok) return null;
  return tooManyResponse(await message(), res.retryAfterSec);
}

/** Webhook replay store on the same connection (lib/webhook-replay). Null without Redis. */
export function replayStore(): ReplayStore | null {
  const r = limiterRedis();
  if (!r) return null;
  return {
    setNx: async (key, value, ttlSec) => {
      await readyRedis();
      return (await r.set(key, value, "EX", ttlSec, "NX")) === "OK";
    },
    get: (key) => r.get(key),
    set: async (key, value, ttlSec) => {
      await r.set(key, value, "EX", ttlSec);
    },
    del: async (key) => {
      await r.del(key);
    },
  };
}
