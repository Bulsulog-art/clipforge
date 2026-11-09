import { logger } from "../logger.js";
import { readyEmailAt } from "./timezone.js";

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

/* ------------------------------------------------------------ at a civil hour */

/** The "notify" job on the light dentvid-mail queue: a ready email held for the clinic's morning. */
export type ReadyMailJob = { clinicId: string; kind: "week"; ready: number; flagged: number; week: string };
export const readyMailJobId = (clinicId: string, week: string) => `ready:${clinicId}:${week}`;

type MailQueue = { add(name: string, data: ReadyMailJob, opts: Record<string, unknown>): Promise<unknown> };
let mailQueue: MailQueue | null = null;

/** index.ts hands over the dentvid-mail queue; until then (tests, CLI) a ready email goes out at once. */
export function configureReadyMail(queue: MailQueue | null): void {
  mailQueue = queue;
}

/** Below this, holding an email is not worth a job: send it now. */
const HOLD_MIN_MS = 60_000;

export type ReadyWeek = {
  clinicId: string;
  week: string;
  /** The clinic's zone (timezone.ts clinicTimeZone). */
  tz: string;
  /** A weekly-batch week (made over the weekend) rather than one someone is waiting for. */
  batch: boolean;
  counts: { ready: number; flagged: number };
  now?: Date;
};

/**
 * A finished week's "ready" email, at a civil hour in the clinic's zone
 * (timezone.ts readyEmailAt): a batch week made on Saturday night is
 * announced on Monday at 07:00 local, one finished at 23:00 on Monday the
 * next morning at 07:00; a week someone is waiting for is announced at once.
 * A held email is a delayed job with a fixed id, so a re-run week never
 * sends two. If it cannot be queued, it is sent now — late beats never.
 */
export async function sendReadyAtCivilHour(
  w: ReadyWeek,
  deps: { queue?: MailQueue | null; send?: typeof notifyReady } = {},
): Promise<{ sent: boolean; at: Date; held: boolean }> {
  const now = w.now ?? new Date();
  const at = readyEmailAt({ now, week: w.week, tz: w.tz, batch: w.batch });
  const send = deps.send ?? notifyReady;
  const queue = deps.queue === undefined ? mailQueue : deps.queue;
  const delay = at.getTime() - now.getTime();
  if (delay >= HOLD_MIN_MS && queue) {
    try {
      const data: ReadyMailJob = { clinicId: w.clinicId, kind: "week", week: w.week, ...w.counts };
      await queue.add("notify", data, { jobId: readyMailJobId(w.clinicId, w.week), delay, attempts: 3, backoff: { type: "exponential", delay: 60_000 } });
      logger.info({ clinicId: w.clinicId, week: w.week, tz: w.tz, at: at.toISOString() }, "dentvid: ready email held for the clinic's morning");
      return { sent: false, at, held: true };
    } catch (e) {
      logger.warn({ clinicId: w.clinicId, err: (e as Error).message }, "dentvid: could not hold the ready email; sending now");
    }
  }
  return { sent: await send(w.clinicId, "week", w.counts), at: now, held: false };
}
