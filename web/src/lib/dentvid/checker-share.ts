import { CHECKER_MAX_CHARS } from "./ad-checker-limits";
import { isCheckerMarket, type CheckerMarket } from "./checker-markets";

/**
 * A link to a check, with the text inside it: dentvideo.com/ad-checker#m=TR&t=…
 *
 * The text rides in the URL fragment (after "#"), which browsers never send
 * to a server: not in the request, not in the Referer header. Opening the
 * link fills the checker in the colleague's browser and checks it there.
 * Tiny and dependency-free: the checker reads it on load.
 */

/** The fragment (without "#") that reopens this check. */
export function shareFragment(text: string, market: CheckerMarket): string {
  const p = new URLSearchParams();
  p.set("m", market);
  p.set("t", text.slice(0, CHECKER_MAX_CHARS));
  return p.toString();
}

/** A full link to the check: the page's own address (no query, no old fragment) plus the fragment. */
export function shareUrl(pageUrl: string, text: string, market: CheckerMarket): string {
  const base = pageUrl.split("#")[0].split("?")[0];
  return `${base}#${shareFragment(text, market)}`;
}

/** The check a fragment carries, or null when it is not one (a plain "#how" anchor, an empty text). */
export function readShareFragment(hash: string): { text: string; market: CheckerMarket | null } | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!/(^|&)t=/.test(raw)) return null;
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(raw);
  } catch {
    return null;
  }
  const text = (p.get("t") ?? "").slice(0, CHECKER_MAX_CHARS);
  if (!text.trim()) return null;
  const m = (p.get("m") ?? "").toUpperCase();
  return { text, market: isCheckerMarket(m) ? m : null };
}
