import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const Body = z.object({
  message: z.string().min(1).max(4000),
  appVersion: z.string().max(60).optional(),
  osVersion: z.string().max(60).optional(),
  deviceModel: z.string().max(80).optional(),
});

/**
 * POST /api/feedback
 *
 * Stores a single feedback message from the authed user. The table has
 * RLS that denies all SELECTs, so a leaked client can only write — never
 * read other users' messages.
 *
 * No rate limit yet — if abuse appears, add a count(user_id, last 24h)
 * gate. Anonymous + sign-up spam was the actual risk and anonymous
 * sign-ins are already disabled in Auth config (per the 2026-05 push).
 */
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

  const svc = createServiceClient();
  const { error } = await svc.from("feedback").insert({
    user_id: user.id,
    message: body.message,
    app_version: body.appVersion ?? null,
    os_version: body.osVersion ?? null,
    device_model: body.deviceModel ?? null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
