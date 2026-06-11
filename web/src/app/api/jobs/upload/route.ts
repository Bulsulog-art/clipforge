import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { videoQueue } from "@/lib/queue";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Enforce the monthly video quota BEFORE we parse the (up to 4GB) body and
  // upload it to storage. The URL-source route (api/jobs/route.ts) already does
  // this; the upload route skipped it entirely, so a free/over-limit user could
  // bypass the limit and burn a 4GB upload + a full render. Same check, earliest
  // possible point.
  const svc = createServiceClient();
  const { data: quota } = await svc
    .from("v_user_quota")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (quota && quota.videos_used >= quota.videos_limit) {
    return NextResponse.json(
      { error: "Monthly limit reached. Upgrade your plan to continue." },
      { status: 402 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const niche = String(form.get("niche") ?? "motivation");
  const language = String(form.get("language") ?? "en");
  // Optional ClipAnything brief — only clip moments matching this request.
  const clipPrompt = String(form.get("prompt") ?? "").trim().slice(0, 280);
  // Optional thumbnail style. Worker switches FFmpeg recipe on this.
  const rawThumbStyle = String(form.get("thumbnailStyle") ?? "");
  const thumbnailStyle: "mrbeast" | "cinematic" | "minimal" | undefined =
    rawThumbStyle === "mrbeast" || rawThumbStyle === "cinematic" || rawThumbStyle === "minimal"
      ? rawThumbStyle
      : undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file missing" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 4GB" }, { status: 413 });
  }

  const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await svc.storage
    .from("clipforge-videos-raw")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: job, error } = await svc
    .from("video_jobs")
    .insert({
      user_id: user.id,
      source_type: "upload",
      storage_path: path,
      title: file.name,
      niche, language,
      clip_prompt: clipPrompt || null,
      status: "queued",
    })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: error?.message ?? "db" }, { status: 500 });

  // Match the URL-source priority bands (see api/jobs/route.ts). Plus
  // users render first when the queue is congested.
  const { data: profile } = await svc
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  const tier = (profile?.tier as string | undefined) ?? "free";
  const priority =
    tier === "agency" ? 1 :
    tier === "pro"    ? 5 :
    tier === "starter" ? 10 : 100;

  await videoQueue.add(
    "ingest",
    {
      jobId: job.id,
      userId: user.id,
      sourceType: "upload",
      storagePath: path,
      niche,
      language,
      clipPrompt: clipPrompt || undefined,
      thumbnailStyle,
    },
    { jobId: job.id, attempts: 3, backoff: { type: "exponential", delay: 5000 }, priority },
  );

  return NextResponse.json({ jobId: job.id });
}
