import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { derivativeQueue } from "@/lib/queue";

const Body = z.object({
  targetLanguage: z.enum([
    "en", "tr", "es", "fr", "de", "pt", "ar",
    "ru", "ja", "ko", "it", "nl", "pl", "id", "hi",
  ]),
  voiceClone: z.boolean().optional().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const svc = createServiceClient();

  // Voice clone is a paid (Plus) feature. The legacy gate required 'pro'/'agency'
  // tiers that were REMOVED in the 2026-05 pricing refresh — our only paid tier
  // in the IAP catalog is now 'starter' (= Plus), so no paying user could ever
  // pass the old check and voice-clone translation was dead for everyone. Gate
  // against 'free' only, matching voice-clones/route.ts and branding/upload/route.ts.
  if (body.voiceClone) {
    const { data: p } = await svc.from("profiles").select("tier").eq("id", user.id).single();
    if (!p || p.tier === "free") {
      return NextResponse.json(
        { error: "Voice clone is a Plus feature. Subscribe to translate in your own voice." },
        { status: 402 },
      );
    }
  }

  const { data: clip, error } = await svc
    .from("clips")
    .select("id, user_id, status")
    .eq("id", clipId)
    .eq("user_id", user.id)
    .single();
  if (error || !clip || clip.status !== "ready") {
    return NextResponse.json({ error: "Clip not ready" }, { status: 404 });
  }

  // Pre-flight credit check (2 credits, voice clone = 5)
  const cost = body.voiceClone ? 5 : 2;
  const { data: profile } = await svc
    .from("profiles")
    .select("credits_balance")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.credits_balance as number) < cost) {
    return NextResponse.json(
      { error: `Insufficient credits — need ${cost}`, code: "credits" },
      { status: 402 },
    );
  }

  const { data: derivative, error: dErr } = await svc
    .from("clip_derivatives")
    .insert({
      source_clip_id: clipId,
      user_id: user.id,
      kind: "translation",
      target_language: body.targetLanguage,
      voice_clone: body.voiceClone,
      status: "queued",
    })
    .select("id")
    .single();
  if (dErr || !derivative) {
    return NextResponse.json({ error: dErr?.message ?? "queue error" }, { status: 500 });
  }

  await derivativeQueue.add(
    "derivative",
    { derivativeId: derivative.id, userId: user.id, kind: "translation" },
    { jobId: derivative.id, attempts: 2, backoff: { type: "exponential", delay: 6000 } },
  );

  return NextResponse.json({ derivativeId: derivative.id });
}
