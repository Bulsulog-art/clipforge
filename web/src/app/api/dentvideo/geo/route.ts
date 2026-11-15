import { NextResponse } from "next/server";
import { geoCountry } from "@/lib/dentvid/events";

// GET /api/dentvideo/geo — the visitor's country as the edge reports it
// (CF-IPCountry / x-vercel-ip-country / x-country-code), or null. The public
// pages are CDN-cached and the same for everyone; their price tags ask this
// once per tab to show EUR or TL where that is what Dodo charges
// (components/dentvid/price.tsx). An ISO code only, never the IP. Cached in
// the browser only: the answer differs per visitor.

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return NextResponse.json(
    { country: geoCountry(req.headers) ?? null },
    { headers: { "Cache-Control": "private, max-age=3600", Vary: "CF-IPCountry, X-Vercel-IP-Country, X-Country-Code" } },
  );
}
