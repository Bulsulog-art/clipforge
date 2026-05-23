import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/events
 *
 * Accepts a small batch of analytics events from the iOS app. Events are
 * stored in clipforge.app_events with insert-only RLS, so a leaked client
 * can never read another user's funnel.
 *
 * The iOS client batches up to 25 events per request and flushes on a
 * 30-second cadence or when the queue fills.
 */
const Event = z.object({
  event: z.string().min(1).max(80),
  props: z.record(z.string(), z.unknown()).optional(),
  appVersion: z.string().max(60).optional(),
  osVersion: z.string().max(60).optional(),
  createdAt: z.string().datetime().optional(),
});
const Body = z.object({
  events: z.array(Event).min(1).max(50),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rows = body.events.map((e) => ({
    user_id: user.id,
    event: e.event,
    props: e.props ?? null,
    app_version: e.appVersion ?? null,
    os_version: e.osVersion ?? null,
    created_at: e.createdAt ?? new Date().toISOString(),
  }));

  const svc = createServiceClient();
  const { error } = await svc.from("app_events").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: rows.length });
}
