import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-user push notification preferences.
 *
 *   GET   → returns the current map { kind: bool }
 *   PATCH → updates one or more kinds. Missing keys are left untouched.
 *
 * Known kinds (worker sendPush checks these): job_ready, low_credits,
 * trend_match, avatar_ready. Missing keys default to enabled so existing
 * users aren't unintentionally muted on launch day.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .schema("clipforge")
    .from("profiles")
    .select("push_preferences")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    preferences: (data?.push_preferences as Record<string, boolean>) ?? {},
  });
}

const PatchBody = z.object({
  preferences: z.record(z.string(), z.boolean()),
});

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof PatchBody>;
  try { body = PatchBody.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  // Merge with the existing prefs rather than overwriting so the iOS app
  // can PATCH a single toggle without first having to round-trip the full
  // map.
  const { data: current } = await supabase
    .schema("clipforge")
    .from("profiles")
    .select("push_preferences")
    .eq("id", user.id)
    .maybeSingle();
  const merged = {
    ...((current?.push_preferences as Record<string, boolean>) ?? {}),
    ...body.preferences,
  };

  const { error } = await supabase
    .schema("clipforge")
    .from("profiles")
    .update({ push_preferences: merged })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, preferences: merged });
}
