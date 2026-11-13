import { NextResponse } from "next/server";
import { isDemoToken } from "@/lib/dentvid/demos";
import { countDemoView } from "@/lib/dentvid/demos-server";
import { geoCountry, sanitizeLocale } from "@/lib/dentvid/events";
import { readCapped, recordEvent } from "@/lib/dentvid/events-server";
import { demoRequestSkip, raiseHotLead } from "@/lib/dentvid/hot-leads-server";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * POST /api/dentvideo/demo/view — one view of a personalised demo page,
 * sent by the page itself once per tab (components/dentvid/demo-client).
 * Counted from the browser rather than on render, so link-preview bots
 * (Instagram, LinkedIn, WhatsApp unfurl the link) do not count — and,
 * since some fetchers do run the page's script (Google, headless
 * scanners), a request whose user agent is a bot or a script is dropped
 * here too (lib/dentvid/hot-leads isBotUserAgent), as is the signed-in
 * owner opening his own demo. Neither uses up the rate limit.
 *
 * At most one view per address and demo per hour, plus per-address and
 * global ceilings. Always 204: the page learns nothing — in particular not
 * whether a token exists.
 *
 * The first counted view of a demo raises a hot-lead alert to the owner
 * (lib/dentvid/hot-leads-server: once per demo, capped per day).
 */
export const dynamic = "force-dynamic";

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  const text = await readCapped(req, 256).catch(() => null);
  if (!text) return NO_CONTENT();
  let body: { token?: unknown; locale?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NO_CONTENT();
  }
  if (!isDemoToken(body.token)) return NO_CONTENT();
  const token = body.token;
  if (await demoRequestSkip(req)) return NO_CONTENT();
  const ip = clientIp(req.headers);
  const limit = await limitChecks([
    { key: `rl:demoview:ip:${ip}`, rule: LIMITS.demoViewIp },
    { key: `rl:demoview:iptoken:${ip}:${token}`, rule: LIMITS.demoViewIpToken },
    { key: "rl:demoview:global", rule: LIMITS.demoViewGlobal },
  ]);
  if (!limit.ok) return NO_CONTENT();

  const demo = await countDemoView(token);
  if (demo) {
    await recordEvent("demo_viewed", {
      locale: sanitizeLocale(body.locale) ?? demo.language,
      props: { demo: token, utm_campaign: demo.campaign },
      geo: geoCountry(req.headers),
    });
    void raiseHotLead({ token, step: "viewed", demo, views: (demo.view_count ?? 0) + 1 });
  }
  return NO_CONTENT();
}
