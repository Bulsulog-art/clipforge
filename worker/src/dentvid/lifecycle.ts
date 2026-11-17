import { logger } from "../logger.js";

/**
 * Hourly lifecycle run (BullMQ job "lifecycle" on the dentvid queue, set up
 * in index.ts). The web app owns the rules, the copy and the unsubscribe
 * tokens (web/src/lib/dentvid/lifecycle.ts); the worker only provides the
 * clock, the same way it asks for "videos ready" emails (notify.ts).
 *
 * Best effort: a failed run is logged and the next hour tries again. The
 * web side is idempotent (one row per clinic and email kind) and capped
 * (per run and per hour), so a retried or doubled run cannot double-send.
 */
export const LIFECYCLE_SCHEDULE = { pattern: "23 * * * *", tz: "UTC" } as const;

export type LifecycleRun = { ok: boolean; status?: number; body?: unknown };

export async function runLifecycle(fetchImpl: typeof fetch = fetch): Promise<LifecycleRun> {
  const token = process.env.WORKER_INTERNAL_TOKEN;
  const base = (process.env.DENTVIDEO_APP_URL || "https://dentvideo.com").replace(/\/+$/, "");
  if (!token) {
    logger.warn("dentvid: lifecycle run skipped — no WORKER_INTERNAL_TOKEN");
    return { ok: false };
  }
  try {
    const res = await fetchImpl(`${base}/api/internal/dentvideo/lifecycle`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.json().catch(() => ({}));
    logger.info({ status: res.status, body }, "dentvid: lifecycle run");
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "dentvid: lifecycle run failed");
    return { ok: false };
  }
}
