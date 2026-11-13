import { NextResponse } from "next/server";
import { DV_CLINIC_CLIENT_EVENTS, DV_EVENT_MAX_BYTES, geoCountry, parseClientEvent } from "@/lib/dentvid/events";
import { insertEventRow, readCapped } from "@/lib/dentvid/events-server";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";
import { hotStepForEvent } from "@/lib/dentvid/hot-leads";
import { demoRequestSkip, raiseHotLead } from "@/lib/dentvid/hot-leads-server";

/**
 * POST /api/dentvideo/event — first-party funnel events from the browser
 * (lib/dentvid/events-client). Allow-listed names and props only
 * (lib/dentvid/events); no IP, user agent or cookie id is stored — the IP
 * is used only as a short-lived rate-limit key in Redis.
 *
 * Always answers 204 for a well-formed request, stored or not: the browser
 * never waits on, retries or learns anything from analytics.
 */
export const dynamic = "force-dynamic";

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  // Cheap per-IP brake before the body is read.
  const first = await limitChecks([{ key: `rl:event:ip:${ip}`, rule: LIMITS.eventIp }]);
  // Over the limit: drop quietly (a 429 would only make a script retry).
  if (!first.ok) return NO_CONTENT();

  const text = await readCapped(req, DV_EVENT_MAX_BYTES).catch(() => null);
  if (text === null) return NextResponse.json({ error: "too large" }, { status: 413 });
  // The country comes from the proxy's geo header (an ISO code), never from the body.
  const row = parseClientEvent(text, geoCountry(req.headers));
  if (!row) return NextResponse.json({ error: "bad event" }, { status: 400 });

  if (DV_CLINIC_CLIENT_EVENTS.includes(row.name)) {
    try {
      const { dvSession } = await import("@/lib/dentvid/auth");
      const { db, user } = await dvSession();
      if (user) {
        const { data } = await db.from("dentvid_clinics").select("id").eq("owner_id", user.id).maybeSingle();
        row.clinic_id = (data?.id as string | undefined) ?? null;
      }
    } catch {
      // no session / backend: the event still counts, without a clinic
    }
  }

  // One event name per IP (a script replaying landing_view), and a global
  // ceiling: anonymous events share a tight one; a signed-in clinic's events
  // have their own, so an anonymous flood cannot crowd them out.
  const second = await limitChecks([
    { key: `rl:event:ipname:${ip}:${row.name}`, rule: LIMITS.eventIpName },
    row.clinic_id ? { key: "rl:event:global:clinic", rule: LIMITS.eventClinicGlobal } : { key: "rl:event:global", rule: LIMITS.eventGlobal },
  ]);
  if (!second.ok) return NO_CONTENT();

  // A demo page's play / CTA click: not from a bot or the owner testing his own demo
  // (they would skew /admin/demos), and the first one raises a hot-lead alert.
  const step = hotStepForEvent(row.name, row.props);
  const demoToken = typeof row.props.demo === "string" ? row.props.demo : null;
  if (step && (!demoToken || (await demoRequestSkip(req)))) return NO_CONTENT();

  await insertEventRow(row);
  if (step && demoToken) void raiseHotLead({ token: demoToken, step });
  return NO_CONTENT();
}
