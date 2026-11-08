/**
 * Cheap bot brakes for the sign-up form, no third-party captcha needed:
 *
 *   honeypot   a text field hidden from people (off-screen, aria-hidden,
 *              tabIndex -1, autocomplete off). Form-filling bots fill it.
 *   fill time  people take seconds to type an email and a password; a
 *              script posting the form instantly is refused. The browser
 *              reports how long the form was open (`elapsedMs`); a request
 *              without it did not come from our form.
 *
 * Neither stops a determined attacker who reads the page source — the
 * per-IP and global rate limits do the rest, and Cloudflare Turnstile is an
 * optional owner step (docs/SECURITY.md).
 */
export const MIN_FILL_MS = 2500;

export type BotReason = "honeypot" | "too-fast" | "no-timing";

export function botSignup(args: { honeypot?: string | null; elapsedMs?: number | null }): BotReason | null {
  if (args.honeypot && args.honeypot.trim() !== "") return "honeypot";
  if (args.elapsedMs === undefined || args.elapsedMs === null) return "no-timing";
  if (args.elapsedMs < MIN_FILL_MS) return "too-fast";
  return null;
}
