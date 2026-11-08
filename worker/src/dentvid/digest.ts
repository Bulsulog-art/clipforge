import { logger } from "../logger.js";

/**
 * The owner's daily digest at 08:30 Istanbul (BullMQ job "digest" on the
 * dentvid-mail queue). Like the lifecycle run, the web app owns the numbers
 * (it already computes MRR and the funnel for /dentvideo/admin) and sends the
 * email — only if anything happened in the last 24 h; the worker provides
 * the clock. Best effort: a failed run is logged; the next day tries again.
 */
export const DIGEST_SCHEDULE = { pattern: "30 8 * * *", tz: "Europe/Istanbul" } as const;

export async function runDigest(fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; status?: number; body?: unknown }> {
  const token = process.env.WORKER_INTERNAL_TOKEN;
  const base = (process.env.DENTVIDEO_APP_URL || "https://dentvideo.com").replace(/\/+$/, "");
  if (!token) {
    logger.warn("dentvid: digest skipped — no WORKER_INTERNAL_TOKEN");
    return { ok: false };
  }
  try {
    const res = await fetchImpl(`${base}/api/internal/dentvideo/digest`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.json().catch(() => ({}));
    logger.info({ status: res.status, body }, "dentvid: digest run");
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "dentvid: digest run failed");
    return { ok: false };
  }
}
