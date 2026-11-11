import { NextResponse } from "next/server";
import { isDemoToken } from "@/lib/dentvid/demos";
import { demoLogo } from "@/lib/dentvid/demos-server";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * GET /api/dentvideo/demo/<token>/logo — a live demo's logo copy, from the
 * private bucket, same-origin (the preview reads its pixels for colours,
 * which a cross-origin signed URL would not allow everywhere). Only PNG,
 * JPEG or WebP were ever stored; served with nosniff and a locked-down CSP.
 * Expired, disabled or unknown demos: 404.
 */
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isDemoToken(token)) return notFound();
  const limit = await limitChecks([{ key: `rl:demologo:ip:${clientIp(req.headers)}`, rule: LIMITS.demoLogoIp }]);
  if (!limit.ok) return new NextResponse("Too many requests", { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
  const logo = await demoLogo(token).catch(() => null);
  if (!logo) return notFound();
  return new NextResponse(logo.bytes, {
    status: 200,
    headers: {
      "content-type": logo.contentType,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
