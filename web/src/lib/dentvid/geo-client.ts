// The visitor's country from /api/dentvideo/geo, asked once per page load and
// shared by every caller (the price tags in price-region.tsx and the ad-click
// consent prompt), so a page sends one request, not one per component.
// Browser-side and tiny: it ships on every public page.

export type DvGeo = { country: string | null; consentRequired: boolean };

let pending: Promise<DvGeo | null> | null = null;

/** The answer, or null if the request failed (a later call asks again). */
export function fetchDvGeo(): Promise<DvGeo | null> {
  if (!pending) {
    const p: Promise<DvGeo | null> = fetch("/api/dentvideo/geo", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { country?: unknown; consentRequired?: unknown } | null) =>
        b ? { country: typeof b.country === "string" ? b.country : null, consentRequired: b.consentRequired !== false } : null,
      )
      .catch(() => null)
      .then((g) => {
        if (!g && pending === p) pending = null;
        return g;
      });
    pending = p;
  }
  return pending;
}

/** Tests only. */
export function resetDvGeo() {
  pending = null;
}
