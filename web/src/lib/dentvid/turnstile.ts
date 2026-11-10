/**
 * Optional Cloudflare Turnstile on the DentVideo sign-up form.
 *
 * Off unless TURNSTILE_SECRET_KEY (server) is set; the form shows the widget
 * when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Set both together (the site key
 * alone shows a widget nobody checks; the secret alone refuses every sign-up,
 * so turnstileEnabled() needs both).
 *
 * Fail-closed while enabled: a missing or rejected token is refused. If
 * Cloudflare cannot be reached the request is refused too — a sign-up can be
 * retried; an open door during an outage is what a bot farm waits for.
 */

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.TURNSTILE_SECRET_KEY?.trim() && !!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
}

export type TurnstileResult = { ok: true; skipped?: true } | { ok: false; reason: "missing" | "rejected" | "unavailable" };

export async function verifyTurnstile(
  token: string | null | undefined,
  ip: string | null,
  opts: { env?: Record<string, string | undefined>; fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<TurnstileResult> {
  const env = opts.env ?? process.env;
  if (!turnstileEnabled(env)) return { ok: true, skipped: true };
  if (!token || token.length > 2048) return { ok: false, reason: "missing" };
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY!.trim(), response: token });
  if (ip && ip !== "unknown") form.set("remoteip", ip);
  try {
    const res = await (opts.fetch ?? fetch)(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return body?.success === true ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
