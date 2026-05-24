import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/account/attribution
 *
 * Records where a user signed up from. Idempotent — only writes if
 * profile.signup_source is currently null, so a replayed call from the
 * web client can't overwrite an earlier (more accurate) attribution.
 *
 * Web client persists UTM params to localStorage on first landing,
 * then fires this once after Supabase auth completes.
 */
const Body = z.object({
  utmSource: z.string().max(60).optional(),
  utmMedium: z.string().max(60).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  utmTerm: z.string().max(60).optional(),
  // Catch-alls so we capture organic-but-non-UTM context too.
  referrer: z.string().max(500).optional(),
  landingPath: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const svc = createServiceClient();

  // Only write if not already set. Avoids a replay from the web client
  // overwriting the original attribution if the user comes back later.
  const { data: existing } = await svc
    .from("profiles")
    .select("signup_source")
    .eq("id", user.id)
    .maybeSingle();
  if (existing?.signup_source) {
    return NextResponse.json({ ok: true, alreadySet: true });
  }

  const payload = {
    utmSource: body.utmSource ?? null,
    utmMedium: body.utmMedium ?? null,
    utmCampaign: body.utmCampaign ?? null,
    utmContent: body.utmContent ?? null,
    utmTerm: body.utmTerm ?? null,
    referrer: body.referrer ?? null,
    landingPath: body.landingPath ?? null,
    capturedAt: new Date().toISOString(),
  };

  const { error } = await svc
    .from("profiles")
    .update({ signup_source: payload })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
