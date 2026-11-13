import { timingSafeEqual } from "node:crypto";

/**
 * Accounts made by the synthetic monitor (worker/src/dentvid/synthetic.ts)
 * and the browser smoke test (scripts/dentvideo-smoke.mjs):
 * e2e-monitor+<anything>@<domain>.
 *
 *   - Never emailed — not the verification code, not a reset link — whoever
 *     makes them. (Lifecycle mail already skips every e2e- address.)
 *   - Not counted in the funnel.
 *   - With the monitor token (header x-dv-monitor = DENTVIDEO_MONITOR_TOKEN,
 *     at least 16 characters), sign-up skips the per-IP / per-address
 *     limits, the bot brake and Turnstile for them — the monitor signs up
 *     every 15 minutes from one server. The token does nothing for any
 *     other address.
 */
export const MONITOR_HEADER = "x-dv-monitor";

export function isMonitorEmail(email: string | null | undefined): boolean {
  return /^e2e-monitor(\+[^@\s]*)?@[^@\s]+$/i.test((email ?? "").trim());
}

/** The request carries the monitor token (constant-time compare). False when the token is not configured. */
export function monitorAuthorised(header: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  const expected = env.DENTVIDEO_MONITOR_TOKEN?.trim();
  const got = (header ?? "").trim();
  if (!expected || expected.length < 16 || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A monitor sign-up: a monitor address AND the token. */
export const isMonitorSignup = (email: string, header: string | null | undefined, env?: Record<string, string | undefined>) => isMonitorEmail(email) && monitorAuthorised(header, env);
