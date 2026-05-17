import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { derivativeQueue } from "@/lib/queue";

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("face");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "face image missing" }, { status: 400 });
  }
  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG/PNG/WEBP supported" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 8 MB" }, { status: 413 });
  }

  const svc = createServiceClient();

  const { data: clip, error } = await svc
    .from("clips")
    .select("id, user_id, status")
    .eq("id", clipId)
    .eq("user_id", user.id)
    .single();
  if (error || !clip || clip.status !== "ready") {
    return NextResponse.json({ error: "Clip not ready" }, { status: 404 });
  }

  // Pre-flight credit check (2 credits)
  const { data: profile } = await svc
    .from("profiles")
    .select("credits_balance")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.credits_balance as number) < 2) {
    return NextResponse.json({ error: "Insufficient credits — need 2", code: "credits" }, { status: 402 });
  }

  // upload face
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const facePath = `${user.id}/faces/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await svc.storage
    .from("clipforge-faces")
    .upload(facePath, file, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: derivative, error: dErr } = await svc
    .from("clip_derivatives")
    .insert({
      source_clip_id: clipId,
      user_id: user.id,
      kind: "face_swap",
      target_face_path: facePath,
      status: "queued",
    })
    .select("id")
    .single();
  if (dErr || !derivative) {
    return NextResponse.json({ error: dErr?.message ?? "queue error" }, { status: 500 });
  }

  await derivativeQueue.add(
    "derivative",
    { derivativeId: derivative.id, userId: user.id, kind: "face_swap" },
    { jobId: derivative.id, attempts: 2, backoff: { type: "exponential", delay: 8000 } },
  );

  return NextResponse.json({ derivativeId: derivative.id });
}
