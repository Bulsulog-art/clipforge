import { asStep } from "./onboarding";

/**
 * Which form /start shows a signed-out visitor, from its query string.
 *
 *   ?mode=signin | ?mode=forgot   as asked (an expired reset link, the footer)
 *   ?step=preview | plan | …      sign-in: these links come from the activation
 *                                 emails and from /app (bookmarks, the welcome
 *                                 email), i.e. from people who have an account
 *   anything else                 sign-up
 *
 * Before, every one of those showed the sign-up form: a clinic opening "choose
 * your plan" from its email on another device was asked to create an account,
 * and got "there is already an account with this email".
 */
export function signedOutMode(q: URLSearchParams): "signup" | "signin" | "forgot" {
  const m = q.get("mode");
  if (m === "signin" || m === "forgot" || m === "signup") return m;
  const step = asStep(q.get("step"));
  if (step && step !== "account") return "signin";
  return "signup";
}

/**
 * "Forgot your password?": what the form says after POST /api/dentvideo/password-reset.
 * Only a 200 gets the neutral "if an account exists, the link is on its way";
 * a refusal (429 too many attempts, 400 bad address) shows the API's own
 * message (already in the form's language); anything else shows `failed`.
 * Before, every outcome read "the link is on its way" and the clinic waited
 * for an email that was never sent.
 */
export async function resetRequestOutcome(res: Pick<Response, "ok" | "status" | "json"> | null, failed: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!res) return { ok: false, error: failed };
  if (res.ok) return { ok: true };
  // Only the route's own refusals carry a clinic-ready message; a proxy's or
  // the origin guard's ("Bad Origin") does not.
  if (res.status !== 400 && res.status !== 429) return { ok: false, error: failed };
  const body = (await res.json().catch(() => ({}))) as { error?: unknown };
  return { ok: false, error: typeof body.error === "string" && body.error ? body.error : failed };
}

/** After a sign-in on /start: the step the link asked for (resolveStep still caps it at the one reached). */
export function stepAfterSignIn(q: URLSearchParams): string | null {
  const step = asStep(q.get("step"));
  return step && step !== "account" ? step : null;
}
