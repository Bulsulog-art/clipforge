import { NextResponse } from "next/server";
import { geoCountry } from "@/lib/dentvid/events";
import { consentRequired } from "@/lib/dentvid/ad-click";

/**
 * GET /api/dentvideo/geo — two answers for the visitor's browser, from the
 * edge's country header only (CF-IPCountry and the like, via geoCountry):
 * never the IP, never a cookie.
 *
 *  - country: an ISO code or null. The public pages are CDN-cached and the
 *    same for everyone; their price tags ask once per tab to show EUR or TL
 *    where that is what Dodo charges (components/dentvid/price-region.tsx).
 *  - consentRequired: must this visitor consent before an ad click id is
 *    stored? Asked only by a visitor who arrived with a gclid / gbraid /
 *    wbraid (components/dentvid/ad-consent-prompt). Unknown country → true.
 *
 * Cached in the browser only: the answer differs per visitor.
 */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const country = geoCountry(req.headers) ?? null;
  return NextResponse.json(
    { country, consentRequired: consentRequired(country ?? undefined) },
    { headers: { "Cache-Control": "private, max-age=3600", Vary: "CF-IPCountry, X-Vercel-IP-Country, X-Country-Code" } },
  );
}
