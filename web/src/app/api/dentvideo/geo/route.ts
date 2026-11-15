import { NextResponse } from "next/server";
import { geoCountry } from "@/lib/dentvid/events";
import { consentRequired } from "@/lib/dentvid/ad-click";

/**
 * GET /api/dentvideo/geo — does this visitor have to consent before an ad
 * click id is stored? Asked only by the browser of a visitor who arrived with
 * a gclid / gbraid / wbraid (components/dentvid/ad-consent), so the public
 * pages themselves stay the same cached HTML for everyone.
 *
 * Reads only the edge's country header (Cloudflare CF-IPCountry and the
 * like, via geoCountry) — never the IP, never a cookie — and answers with a
 * yes/no, not the country. Unknown country → consent required.
 */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return NextResponse.json(
    { consentRequired: consentRequired(geoCountry(req.headers)) },
    // Per visitor: no shared cache may keep it, and it sets no cookie.
    { headers: { "Cache-Control": "private, no-store", Vary: "CF-IPCountry" } },
  );
}
