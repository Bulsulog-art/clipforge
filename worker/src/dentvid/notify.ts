import { logger } from "../logger.js";
import { readyEmailAt } from "./timezone.js";

/**
 * What came of asking the web app to send a "ready" email:
 *   sent            it went out
 *   retry = true    it did not, for a reason that may pass (the web app or the
 *                   email provider down, a 5xx, a timeout, a rate limit)
 *   retry = false   it did not and never will for this notice (no address, a
 *                   test account, nothing ready, no clinic, no token)
 */
export type NotifyOutcome = { sent: boolean; retry: boolean; reason: string };

/**
 * Tells the web app a clinic's videos are ready, so it emails the dentist.
 * Never throws: the videos are already stored and visible in the library.
 * The caller decides whether a `retry` outcome is retried (the held "notify"
 * job is; see sendReadyAtCivilHour and index.ts).
 */
export async function notifyReadyChecked(
  clinicId: string,
  kind: "week" | "recording",
  counts: { ready: number; flagged: number },
  fetchImpl: typeof fetch = fetch,
): Promise<NotifyOutcome> {
  return postNotice({ clinicId, kind, ...counts }, "ready notice", fetchImpl);
}

/** late: a paying clinic's Monday week is late (delivery.ts); first-late: a first week is late (watchdog.ts). */
export type DelayKind = "late" | "first-late";

/**
 * Tells the web app a clinic's week is late, so it emails the dentist one
 * calm "running late" note (web: lib/dentvid/delay-notice.ts). The callers
 * ask once per clinic and week (a Redis marker); the web app skips test
 * accounts, clinics that no longer get weeks, clinics without an address and
 * a week that arrived meanwhile.
 *
 * `queued` says whether the week really is on its way (its job, or the fresh
 * run a re-queue added, is waiting, running or waiting out a retry). Only
 * then does the email say "queued and on its way"; otherwise it says we were
 * alerted and are on it (a failed run the watchdog did not re-queue waits for
 * the owner).
 *
 * Never throws: a lost notice must not stop a watchdog run. The outcome is
 * classified like the ready notice's.
 */
export async function notifyDelayChecked(
  clinicId: string,
  week: string,
  kind: DelayKind,
  opts: { queued: boolean } = { queued: false },
  fetchImpl: typeof fetch = fetch,
): Promise<NotifyOutcome> {
  return postNotice({ clinicId, kind, week, queued: opts.queued === true }, "delay notice", fetchImpl);
}

/** POST one notice to the web app's internal notify route; never throws. */
async function postNotice(body: { clinicId: string; kind: string } & Record<string, unknown>, label: string, fetchImpl: typeof fetch): Promise<NotifyOutcome> {
  const { clinicId, kind } = body;
  const token = process.env.WORKER_INTERNAL_TOKEN;
  const base = (process.env.DENTVIDEO_APP_URL || "https://dentvideo.com").replace(/\/+$/, "");
  if (!token) return { sent: false, retry: false, reason: "no WORKER_INTERNAL_TOKEN" };
  try {
    const res = await fetchImpl(`${base}/api/internal/dentvideo/notify`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const answer = (await res.json().catch(() => ({}))) as { sent?: boolean; reason?: string; error?: string };
    logger.info({ clinicId, kind, status: res.status, body: answer }, `dentvid: ${label}`);
    if (res.ok && answer.sent === true) return { sent: true, retry: false, reason: "sent" };
    // 200 with a reason: the web app decided not to send (no email, test account, nothing ready) — final.
    if (res.ok && answer.reason) return { sent: false, retry: false, reason: answer.reason };
    // 200 {sent:false} without a reason is the email provider failing; 429 / 5xx / 408 pass too.
    if (res.ok || res.status === 408 || res.status === 429 || res.status >= 500) return { sent: false, retry: true, reason: res.ok ? "send failed" : `HTTP ${res.status}` };
    return { sent: false, retry: false, reason: `HTTP ${res.status}${answer.error ? ` ${answer.error}` : ""}` };
  } catch (e) {
    logger.warn({ clinicId, kind, err: (e as Error).message }, `dentvid: ${label} failed`);
    return { sent: false, retry: true, reason: (e as Error).message.slice(0, 200) };
  }
}

/** notifyReadyChecked, as a plain "was it sent". */
export async function notifyReady(
  clinicId: string,
  kind: "week" | "recording",
  counts: { ready: number; flagged: number },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  return (await notifyReadyChecked(clinicId, kind, counts, fetchImpl)).sent;
}

/**
 * The held "notify" job's retries: the email provider or the web app can be down for
 * hours. 5, 10, 20, 40, 80 min apart (~2.5 h); after the last the owner is told
 * (job-failures.ts). The videos are in the library all along.
 */
export const READY_MAIL_JOB_OPTS = { attempts: 6, backoff: { type: "exponential" as const, delay: 5 * 60_000 } };
/** A ready email that failed when sent at once is handed to the mail queue this much later. */
export const READY_RETRY_DELAY_MS = 2 * 60_000;

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
  deps: { queue?: MailQueue | null; send?: (clinicId: string, kind: "week", counts: { ready: number; flagged: number }) => Promise<boolean | NotifyOutcome> } = {},
): Promise<{ sent: boolean; at: Date; held: boolean; retryQueued?: boolean }> {
  const now = w.now ?? new Date();
  const at = readyEmailAt({ now, week: w.week, tz: w.tz, batch: w.batch });
  const send = deps.send ?? notifyReadyChecked;
  const queue = deps.queue === undefined ? mailQueue : deps.queue;
  const delay = at.getTime() - now.getTime();
  if (delay >= HOLD_MIN_MS && queue) {
    try {
      const data: ReadyMailJob = { clinicId: w.clinicId, kind: "week", week: w.week, ...w.counts };
      await queue.add("notify", data, { jobId: readyMailJobId(w.clinicId, w.week), delay, ...READY_MAIL_JOB_OPTS });
      logger.info({ clinicId: w.clinicId, week: w.week, tz: w.tz, at: at.toISOString() }, "dentvid: ready email held for the clinic's morning");
      return { sent: false, at, held: true };
    } catch (e) {
      logger.warn({ clinicId: w.clinicId, err: (e as Error).message }, "dentvid: could not hold the ready email; sending now");
    }
  }
  const out = await send(w.clinicId, "week", w.counts);
  const r: NotifyOutcome = typeof out === "boolean" ? { sent: out, retry: false, reason: out ? "sent" : "not sent" } : out;
  // Before: a failed immediate send was only logged — the dentist was never told the week was
  // ready. Now it goes to the mail queue, which retries for hours and then tells the owner.
  if (!r.sent && r.retry && queue) {
    try {
      const data: ReadyMailJob = { clinicId: w.clinicId, kind: "week", week: w.week, ...w.counts };
      await queue.add("notify", data, { jobId: `${readyMailJobId(w.clinicId, w.week)}:retry`, delay: READY_RETRY_DELAY_MS, ...READY_MAIL_JOB_OPTS });
      logger.warn({ clinicId: w.clinicId, week: w.week, reason: r.reason }, "dentvid: ready email failed; handed to the mail queue to retry");
      return { sent: false, at: now, held: false, retryQueued: true };
    } catch (e) {
      logger.error({ clinicId: w.clinicId, err: (e as Error).message }, "dentvid: ready email failed and could not be queued for a retry");
    }
  }
  return { sent: r.sent, at: now, held: false };
}
