import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { videoQueue } from "@/lib/queue";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const niche = String(form.get("niche") ?? "motivation");
  const language = String(form.get("language") ?? "en");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file missing" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 4GB" }, { status: 413 });
  }

  const svc = createServiceClient();
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
      status: "queued",
    })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: error?.message ?? "db" }, { status: 500 });

  await videoQueue.add(
    "ingest",
    { jobId: job.id, userId: user.id, sourceType: "upload", storagePath: path, niche, language },
    { jobId: job.id, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  );

  return NextResponse.json({ jobId: job.id });
}
