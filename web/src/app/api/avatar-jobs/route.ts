import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { avatarQueue } from "@/lib/queue";
import { isOwnedPath } from "@/lib/security";

const Body = z.object({
  script: z.string().min(10).max(1200),
  avatarId: z.string().uuid().optional(),
  customImagePath: z.string().max(500).optional(),
  voiceId: z.string().min(2).max(80),
  niche: z.string().min(2).max(40).default("motivation"),
  bgMusic: z.boolean().optional().default(true),
}).refine((b) => Boolean(b.avatarId) !== Boolean(b.customImagePath), {
  message: "Provide either avatarId OR customImagePath, not both",
});

/**
 * POST /api/avatar-jobs — kick off an AI avatar render.
 *
 * Costs 5 credits at render time. Credits are reserved by the worker so
 * users can queue multiple jobs even with a small balance — if a job hits
 * insufficient_credits later it will fail with a clear error message.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
  }

  // Ownership guard: customImagePath MUST live under the user's own UUID
  // prefix in storage. Without this a malicious client could pass another
  // user's face/path and our worker would render a lipsync deepfake.
  if (!isOwnedPath(body.customImagePath, user.id)) {
    return NextResponse.json(
      { error: "customImagePath must be under your own user folder" },
      { status: 403 },
    );
  }

  const svc = createServiceClient();

  // Quick affordability check (anti-spam — actual reservation is in the worker)
  const { data: profile } = await svc
    .from("profiles")
    .select("credits_balance")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.credits_balance as number) < 5) {
    return NextResponse.json(
      { error: "You need 5 credits to render an AI avatar. Buy a +10 pack or upgrade to Plus." },
      { status: 402 },
    );
  }

  const { data: job, error } = await svc
    .from("avatar_jobs")
    .insert({
      user_id: user.id,
      script: body.script,
      avatar_id: body.avatarId ?? null,
      custom_image_path: body.customImagePath ?? null,
      voice_id: body.voiceId,
      niche: body.niche,
      bg_music_enabled: body.bgMusic,
      status: "queued",
    })
    .select("id")
    .single();
  if (error || !job) {
    return NextResponse.json({ error: error?.message ?? "DB error" }, { status: 500 });
  }

  await avatarQueue.add(
    "render",
    { avatarJobId: job.id, userId: user.id },
    { jobId: job.id, attempts: 2, backoff: { type: "exponential", delay: 10_000 } },
  );

  return NextResponse.json({ avatarJobId: job.id });
}
