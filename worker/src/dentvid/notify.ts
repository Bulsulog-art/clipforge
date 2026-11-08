import { logger } from "../logger.js";

/**
 * Tells the web app a clinic's videos are ready, so it emails the dentist.
 * Best effort: a failed notice is logged and never fails the job — the
 * videos are already stored and visible in the library.
 */
export async function notifyReady(
  clinicId: string,
  kind: "week" | "recording",
  counts: { ready: number; flagged: number },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const token = process.env.WORKER_INTERNAL_TOKEN;
  const base = (process.env.DENTVIDEO_APP_URL || "https://dentvideo.com").replace(/\/+$/, "");
  if (!token) return false;
  try {
    const res = await fetchImpl(`${base}/api/internal/dentvideo/notify`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ clinicId, kind, ...counts }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    logger.info({ clinicId, kind, status: res.status, body }, "dentvid: ready notice");
    return res.ok && (body as { sent?: boolean }).sent === true;
  } catch (e) {
    logger.warn({ clinicId, err: (e as Error).message }, "dentvid: ready notice failed");
    return false;
  }
}
