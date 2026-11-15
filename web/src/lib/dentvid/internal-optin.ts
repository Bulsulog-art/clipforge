import { markInternalBrowser } from "./internal-flag";

/**
 * ?dv_internal=1 / ?dv_internal=0 on any DentVideo page (loaded on demand by
 * components/dentvid/ad-consent AdCapture, so ordinary visitors never
 * download it).
 *
 *   1  asks POST /api/dentvideo/internal; the flag is kept only when the
 *      server answers that the visitor is signed in as an internal account
 *      or an admin. A bare link therefore marks nobody — anyone could pass
 *      it around, and an unguessable "secret" URL leaks the same way.
 *   0  removes the flag (taking a browser back INTO the numbers needs no proof).
 *
 * Either way the parameter is taken off the address bar, so it is not
 * bookmarked or shared by accident.
 */

export type InternalAnswer = { internal?: boolean };

export function internalParam(search: string): "1" | "0" | null {
  try {
    const v = new URLSearchParams(search).get("dv_internal");
    return v === "1" || v === "0" ? v : null;
  } catch {
    return null;
  }
}

/** Apply ?dv_internal= from the current page. Resolves to the flag's state afterwards (null: nothing asked). Never throws. */
export async function applyInternalParam(loc: Pick<Location, "search" | "href"> = window.location, ask: () => Promise<InternalAnswer | null> = askServer): Promise<boolean | null> {
  const v = internalParam(loc.search);
  if (!v) return null;
  stripParam(loc);
  if (v === "0") {
    markInternalBrowser(false);
    return false;
  }
  const answer = await ask().catch(() => null);
  if (answer?.internal === true) {
    markInternalBrowser();
    return true;
  }
  return false;
}

async function askServer(): Promise<InternalAnswer | null> {
  const res = await fetch("/api/dentvideo/internal", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}" });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as InternalAnswer | null;
}

function stripParam(loc: Pick<Location, "href">): void {
  try {
    const u = new URL(loc.href);
    u.searchParams.delete("dv_internal");
    window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
  } catch {
    // the parameter stays visible; harmless
  }
}
