import { NextResponse } from "next/server";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { handleAppleEvent, revenuecatAuthOk } from "@/lib/dentvid/apple-webhook";
import type { RcEvent } from "@/lib/dentvid/apple-billing";
import { alerts, cleanError } from "@/lib/dentvid/ops-alert";
import { raiseOwnerAlert } from "@/lib/dentvid/ops-server";
import { claimWebhook, settleWebhook } from "@/lib/webhook-replay";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { rateLimited, replayStore } from "@/lib/rate-limit-server";

/**
 * POST /api/dentvideo/revenuecat/webhook — DentVideo's App Store purchases
 * (iPhone app → Apple → RevenueCat project "DentVideo" → here).
 *
 * Auth: the Authorization header RevenueCat is configured to send, compared
 * in constant time with DENTVID_REVENUECAT_WEBHOOK_AUTH (unset → every call is
 * refused). ClipForge's own RevenueCat webhook (/api/revenuecat/webhook) is a
 * different project with a different secret; neither accepts the other's.
 *
 * Each delivery is processed once (lib/webhook-replay, keyed by RevenueCat's
 * event id); a failed one is released so RevenueCat's retry runs. 5xx → the
 * owner hears once a day per event type.
 */
export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limited = await rateLimited([{ key: `rl:rcdv:ip:${ip}`, rule: LIMITS.revenuecatWebhookIp }], () => "too many requests");
  if (limited) return limited;

  if (!revenuecatAuthOk(req.headers.get("authorization"), process.env.DENTVID_REVENUECAT_WEBHOOK_AUTH)) {
    console.warn("[apple:dentvideo] webhook refused: bad or missing Authorization");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return NextResponse.json({ error: "payload too large" }, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "payload too large" }, { status: 413 });
  let evt: RcEvent | null = null;
  try {
    evt = ((JSON.parse(raw) as { event?: RcEvent } | null)?.event ?? null) as RcEvent | null;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!evt || typeof evt !== "object" || typeof evt.type !== "string") return NextResponse.json({ error: "no event" }, { status: 400 });

  const eventId = typeof evt.id === "string" && evt.id.trim() ? evt.id.trim().slice(0, 120) : null;
  const store = replayStore();
  const claimKey = eventId ? `rc-dv:${eventId}` : null;
  if (claimKey) {
    const claim = await claimWebhook(store, claimKey);
    if (claim === "duplicate") return NextResponse.json({ ok: true, duplicate: true });
    if (claim === "inflight") return NextResponse.json({ error: "delivery in progress" }, { status: 409 });
  }

  let status = 500;
  try {
    let db;
    try {
      db = dvAdmin();
    } catch (e) {
      await ownerHears(evt.type, e);
      return NextResponse.json({ error: "dentvideo backend not configured" }, { status: 500 });
    }
    const result = await handleAppleEvent(db, evt);
    status = result.status;
    if (result.status >= 500 && result.status !== 503) await ownerHears(evt.type, String(result.body.error ?? result.status));
    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    await ownerHears(evt.type, e);
    throw e;
  } finally {
    if (claimKey) await settleWebhook(store, claimKey, status < 300);
  }
}

async function ownerHears(type: string, error: unknown): Promise<void> {
  await raiseOwnerAlert(alerts.webhookError({ event: `App Store ${type}`, error: cleanError(error) })).catch(() => {});
}
