import { NextResponse } from "next/server";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { workerAuthorised } from "@/lib/dentvid/internal-auth";
import { missingTable } from "@/lib/dentvid/events-server";
import { alertsEnabled, alertsLastDay, digestHasNews, renderDigest, resendSender, sumLastDay } from "@/lib/dentvid/ops-alert";
import { webOpsStore } from "@/lib/dentvid/ops-server";
import { buildDigest, type DigestClinic } from "@/lib/dentvid/ops-digest";
import type { AdminEvent } from "@/lib/dentvid/admin-metrics";

/**
 * Called daily at 08:30 Istanbul by the worker (BullMQ job "digest",
 * worker/src/dentvid/digest.ts): the owner's daily digest, sent to
 * OWNER_ALERT_EMAIL only if anything happened in the last 24 h. Once per
 * day (Redis), however often it is called. Authenticated with
 * WORKER_INTERNAL_TOKEN. Off with DENTVID_OWNER_ALERTS=off.
 */
const MRR_KEY = "dv:ops:mrr";

export async function POST(req: Request) {
  if (!workerAuthorised(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (!alertsEnabled(process.env)) return NextResponse.json({ sent: false, reason: "alerts off" });

  const now = new Date();
  const db = dvAdmin();
  const store = await webOpsStore();
  // Once per Istanbul day: a second call (a retried job, a second worker) changes nothing.
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
  const doneKey = `dv:ops:digest:${day}`;
  if (store && (await store.get(doneKey).catch(() => null))) return NextResponse.json({ sent: false, reason: "already ran today" });

  const { data: clinicRows, error: cErr } = await db.from("dentvid_clinics").select("id, created_at, updated_at, plan, plan_tier, dodo_subscription_id, profile").limit(10_000);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  const evRes = await db
    .from("dentvid_events")
    .select("name, locale, props, clinic_id, created_at")
    .in("name", ["checkout_opened", "payment_succeeded", "signup_completed", "week_ready"])
    .gte("created_at", new Date(now.getTime() - 400 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(10_000);
  const eventsTable = !missingTable(evRes.error);

  const prevRaw = store ? await store.get(MRR_KEY).catch(() => null) : null;
  const prev = prevRaw ? (JSON.parse(prevRaw) as { usd: number; at: string }) : null;
  const data = buildDigest({
    now,
    clinics: (clinicRows ?? []) as DigestClinic[],
    events: (evRes.data ?? []) as AdminEvent[],
    eventsTable,
    alerts: await alertsLastDay(store, now),
    emailsSent: await sumLastDay(store, "email_sent", now),
    emailsFailed: await sumLastDay(store, "email_fail", now),
    mrrPrevUsd: prev && now.getTime() - Date.parse(prev.at) < 36 * 3600_000 ? prev.usd : null,
  });
  if (store && !(await store.setNx(doneKey, 2 * 86_400).catch(() => true))) return NextResponse.json({ sent: false, reason: "already ran today" });
  // Tomorrow's delta is measured from today.
  await store?.set(MRR_KEY, JSON.stringify({ usd: data.mrrUsd, at: now.toISOString() }), 3 * 86_400).catch(() => {});
  if (!digestHasNews(data)) return NextResponse.json({ sent: false, reason: "nothing happened" });
  const sent = await resendSender(process.env)(renderDigest(data));
  return NextResponse.json({ sent, newPaying: data.newPaying.length, alerts: data.alerts.length });
}
