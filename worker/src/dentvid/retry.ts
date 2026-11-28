import { UnrecoverableError } from "bullmq";

/**
 * Retries for a paying clinic's week. BullMQ retries a failed "week" job
 * with exponential backoff; what is worth retrying is decided here, in one
 * place, so it is tested and the same everywhere a week is queued (Monday
 * dispatch, payment webhook, the app's button, parked-job resume, the
 * first-week watchdog — the web app keeps the same numbers in
 * web/src/lib/dentvid/week-job.ts).
 *
 *   transient   rate limits (429), 5xx from OpenAI / Pexels / storage,
 *               network resets and timeouts, a render that timed out,
 *               "zero usable videos" when the failures were technical
 *               → retried: 2, 4, 8 minutes later (4 attempts in all)
 *   permanent   a broken clinic profile, a missing clinic, a 4xx that is
 *               not 408/409/429, an auth/quota error, anything thrown as
 *               UnrecoverableError → not retried; the owner is told at once
 *
 * Unknown errors count as transient: one more try is cheap and the spend
 * guard caps what retries can cost (DENTVID_MAX_WEEKS_PER_CLINIC_WEEK).
 */

export const WEEK_ATTEMPTS = 4;
export const WEEK_BACKOFF_MS = 120_000;
export const WEEK_JOB_OPTS = { attempts: WEEK_ATTEMPTS, backoff: { type: "exponential" as const, delay: WEEK_BACKOFF_MS } };

/** Delay before retry n (1-based), as BullMQ's exponential backoff computes it. */
export const backoffDelay = (retry: number, base = WEEK_BACKOFF_MS) => Math.round(2 ** (retry - 1) * base);

export type FailureKind = "transient" | "permanent";

/** "Nothing usable this time, but only for passing reasons" — the job should run again. */
export class TransientWeekError extends Error {
  readonly transient = true;
}

const PERMANENT_MSG: RegExp[] = [
  /\bnot found\b/i,
  /\binvalid[_ ]api[_ ]key\b|\bincorrect api key\b|\bunauthori[sz]ed\b|\b401\b|\b403\b/i,
  /\binsufficient[_ ]quota\b|\bbilling\b.*\b(hard )?limit\b/i,
  /\bZodError\b|\binvalid_type\b|\bexpected .* received\b/i,
  /DENTVID_SUPABASE_URL .* not set/i,
  /recording path outside|recording too large|the limit is \d+ min/i,
];

const TRANSIENT_MSG: RegExp[] = [
  /\b429\b|rate.?limit|too many requests/i,
  /\b5\d\d\b|server error|bad gateway|service unavailable|gateway timeout|overloaded/i,
  /timed? ?out|timeout|ETIMEDOUT|ESOCKETTIMEDOUT|AbortError|aborted/i,
  /ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|EPIPE|socket hang up|fetch failed|network/i,
  /upload .*:|storage|ENOSPC|EMFILE/i,
  /zero usable|no usable/i,
];

function statusOf(e: unknown): number | null {
  const s = (e as { status?: unknown; statusCode?: unknown } | null)?.status ?? (e as { statusCode?: unknown } | null)?.statusCode;
  return typeof s === "number" ? s : null;
}

/**
 * The AI provider refused before doing any work, for a reason on our side
 * that no retry within the hour fixes: the account is out of credit
 * (OpenAI sends this as HTTP 429 with code "insufficient_quota", so the
 * status alone reads as a rate limit; Anthropic as a billing_error or a
 * "credit balance is too low" request error), a billing or spend limit, or a
 * bad key.
 * Nothing was spent, so the job's spend reservation is given back
 * (jobs.ts) and the week is not retried four times against a closed door.
 */
export function providerRefused(e: unknown): boolean {
  const o = (e ?? {}) as {
    code?: unknown;
    type?: unknown;
    errorCode?: unknown;
    error?: { code?: unknown; type?: unknown; error?: { type?: unknown } | null } | null;
  };
  // OpenAI: code/type on the error or its body. Anthropic SDK: `type` and `errorCode` on the error, the body's error.type.
  const codes = [o.code, o.type, o.errorCode, o.error?.code, o.error?.type, o.error?.error?.type].filter((c): c is string => typeof c === "string");
  if (
    codes.some((c) =>
      /^(insufficient_quota|billing_hard_limit_reached|billing_not_active|invalid_api_key|account_deactivated|authentication_error|billing_error|permission_error|organization_on_hold|\w*spend_limit_reached)$/i.test(c),
    )
  )
    return true;
  const msg = `${(e as Error)?.message ?? ""}`;
  return /\binsufficient[_ ]quota\b|exceeded your current quota|billing[_ ]hard[_ ]limit|\bincorrect api key\b|\binvalid[_ ]api[_ ]key\b|credit balance is too low|invalid x-api-key/i.test(msg);
}

export function classifyFailure(e: unknown): FailureKind {
  if (e instanceof TransientWeekError) return "transient";
  if (e instanceof UnrecoverableError) return "permanent";
  // Before the status: an out-of-credit account answers 429, like a rate limit.
  if (providerRefused(e)) return "permanent";
  const status = statusOf(e);
  if (status !== null) {
    if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) return "transient";
    if (status >= 400) return "permanent";
  }
  const msg = `${(e as Error)?.name ?? ""} ${(e as Error)?.message ?? String(e)}`;
  if (TRANSIENT_MSG.some((r) => r.test(msg))) return "transient";
  if (PERMANENT_MSG.some((r) => r.test(msg))) return "permanent";
  return "transient";
}

/** Is this the last attempt BullMQ will make? attemptsMade counts finished attempts before this one. */
export function isLastAttempt(attemptsMade: number, attempts: number | undefined): boolean {
  return attemptsMade + 1 >= Math.max(1, attempts ?? 1);
}
