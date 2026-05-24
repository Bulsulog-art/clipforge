import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/voice-clones
 *
 * Lists the calling user's voice clones (with stable id + display name).
 * Used by AvatarStudio's voice picker to surface clones at the top.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .schema("clipforge")
    .from("voice_clones")
    .select("id, name, elevenlabs_voice_id, status, error_message, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ clones: data ?? [] });
}

/**
 * POST /api/voice-clones
 *
 * Multipart upload — `sample` audio file + `name` text field. Forwards
 * the sample to ElevenLabs /v1/voices/add, persists the returned
 * voice_id, returns the new row.
 *
 * Gate: Plus tier only — cloning is a marquee Plus perk and ElevenLabs
 * costs us $1 per minute of TTS at the highest tier.
 *
 * 60s, 8 MB upload cap — ElevenLabs' own recommendation for a clean
 * professional clone.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles").select("tier").eq("id", user.id).maybeSingle();
  if (!profile || profile.tier === "free") {
    return NextResponse.json(
      { error: "Voice cloning is a Plus feature." },
      { status: 402 },
    );
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "Voice cloning isn't configured on our server yet. Please contact support." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("sample");
  const name = String(form.get("name") ?? "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "sample file missing" }, { status: 400 });
  }
  if (!name || name.length > 60) {
    return NextResponse.json({ error: "name must be 1–60 chars" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Sample must be ≤ 8 MB" }, { status: 413 });
  }
  const mime = file.type || "audio/mpeg";
  if (!mime.startsWith("audio/")) {
    return NextResponse.json({ error: "Sample must be an audio file" }, { status: 415 });
  }

  // Store the original sample so we can re-clone or audit later.
  const ext = (file.name.split(".").pop() ?? "m4a").toLowerCase();
  const samplePath = `${user.id}/voice-samples/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await svc.storage
    .from("clipforge-faces")     // reuse user-owned-media bucket
    .upload(samplePath, file, { contentType: mime, upsert: false });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Forward to ElevenLabs /v1/voices/add (multipart, files[]).
  const elFormData = new FormData();
  elFormData.append("name", name);
  elFormData.append("description", `ClipForge user clone for ${user.id}`);
  elFormData.append("files", file, file.name || `sample.${ext}`);

  const elRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    body: elFormData,
  });
  const elJson = (await elRes.json().catch(() => ({}))) as {
    voice_id?: string;
    detail?: { status?: string; message?: string } | string;
  };
  if (!elRes.ok || !elJson.voice_id) {
    const detail = typeof elJson.detail === "string"
      ? elJson.detail
      : elJson.detail?.message ?? `HTTP ${elRes.status}`;
    return NextResponse.json(
      { error: `ElevenLabs rejected the sample: ${detail}` },
      { status: 502 },
    );
  }

  const { data: row, error: insErr } = await svc
    .from("voice_clones")
    .insert({
      user_id: user.id,
      name,
      elevenlabs_voice_id: elJson.voice_id,
      sample_path: samplePath,
      status: "ready",
    })
    .select("id, name, elevenlabs_voice_id, status, created_at")
    .single();
  if (insErr || !row) {
    return NextResponse.json({ error: insErr?.message ?? "db" }, { status: 500 });
  }

  return NextResponse.json({ clone: row });
}
