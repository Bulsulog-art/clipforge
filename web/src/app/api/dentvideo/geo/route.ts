import { NextResponse } from "next/server";
import { requestCountry } from "@/lib/dentvid/geo-ip";
import { consentRequired } from "@/lib/dentvid/ad-click";

/**
 * GET /api/dentvideo/geo — two answers for the visitor's browser, from our
 * own server's IP → country lookup (lib/dentvid/geo-ip.ts: a local DB-IP
 * database, no third-party call). The IP is never returned, logged or
 * stored, and no cookie is set. Client-sent country headers (CF-IPCountry and
 * the like) are ignored unless DENTVID_TRUST_EDGE_COUNTRY=1.
 *
 *  - country: an ISO code or null. The public pages are CDN-cached and the
 *    same for everyone; their price tags ask once per tab to show EUR or TL
 *    where that is what Dodo charges (components/dentvid/price-region.tsx).
 *  - consentRequired: must this visitor consent before an ad click id is
 *    stored? Asked only by a visitor who arrived with a gclid / gbraid /
 *    wbraid (components/dentvid/ad-consent-prompt). Unknown country → true.
 *
 * The browser asks once per page (lib/dentvid/geo-client.ts shares the
 * answer) and may keep it for an hour: private, it differs per visitor.
 */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const country = requestCountry(req.headers) ?? null;
  return NextResponse.json({ country, consentRequired: consentRequired(country ?? undefined) }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
