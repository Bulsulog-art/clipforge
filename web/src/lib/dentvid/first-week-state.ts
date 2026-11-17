/**
 * When the "your first week is being made" card offers "try again".
 * Its own module: lib/dentvid/onboarding.ts is in the landing's browser
 * bundle (the teaser), and this is only for the signed-in app.
 */
/** "Usually within an hour" is the promise; after that hour the first week shows the calm "taking longer" state with "try again". */
export const FIRST_WEEK_SLOW_MS = 60 * 60_000;
/** A paid clinic whose week has no job at all gets "try again" after this grace (the page itself asks for the week on load). */
export const FIRST_WEEK_MISSING_GRACE_MS = 2 * 60_000;

/**
 * The first week's job as the server saw it: `state` null = no such job in
 * the queue; the whole value null/undefined = the queue could not be asked.
 */
export type FirstWeekJob = { state: string | null; createdAt: number | null } | null | undefined;

/**
 * Has the first week been "being made" for too long, so the card should
 * offer "try again"? Pure: the card calls it with the server's view of the
 * job and when this browser first saw the card.
 *   - not paid yet → never (the payment is still being confirmed);
 *   - the job is missing (webhook never reached the queue) → after a short grace;
 *   - the job failed (and no retry note says otherwise) → yes;
 *   - otherwise once FIRST_WEEK_SLOW_MS have passed since the job was queued
 *     (or, without a job time, since the card was first seen).
 * The retry button posts /api/dentvideo/week, which queues a missing job,
 * re-queues a failed one and moves a waiting one to the front — never a second week.
 */
export function firstWeekStuck(args: { paid: boolean; job: FirstWeekJob; seenSince: number; now: number }): boolean {
  if (!args.paid) return false;
  const { job, seenSince, now } = args;
  if (job && job.state === null && now - seenSince > FIRST_WEEK_MISSING_GRACE_MS) return true;
  if (job?.state === "failed") return true;
  const since = Math.min(job?.createdAt ?? Number.POSITIVE_INFINITY, seenSince);
  return now - since > FIRST_WEEK_SLOW_MS;
}
