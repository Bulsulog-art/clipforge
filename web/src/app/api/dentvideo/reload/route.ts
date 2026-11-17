/**
 * Where a DentVideo form goes when the browser submits it natively — which
 * only happens when the page's JavaScript never ran, e.g. its chunks were
 * gone after a deploy (lib/chunk-reload). Without an action the browser sent
 * a GET to the same page with whatever fields had names (the honeypot) in
 * the URL, and the sign-up silently did nothing. Here nothing is read or
 * stored: the browser is sent back to the page it was on (same site only),
 * which loads the current build so the form works again.
 */
export function POST(req: Request) {
  return new Response(null, {
    status: 303,
    headers: { Location: backTo(req.headers.get("referer")), "Cache-Control": "no-store" },
  });
}

/** The referring page's path and query, or /start; never another site. */
function backTo(referer: string | null): string {
  if (!referer) return "/start";
  try {
    const u = new URL(referer);
    const path = `${u.pathname}${u.search}`;
    // A path only: the browser resolves it on the host the form was on.
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/api/") ? path : "/start";
  } catch {
    return "/start";
  }
}
