import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/generate/assets — park a clip the person wants in their video.
 *
 * Deliberately does not create a job. Attachments are uploaded while the
 * person is still writing their prompt, so the wait happens during typing
 * instead of after they press the button. /api/generate then takes the
 * returned paths.
 *
 * Files land under `${user.id}/generate-assets/`, which satisfies the
 * ownership prefix that both /api/generate and the signing route enforce.
 */

/** A clip for a short video. Bigger than this is a feature film, not a shot. */
const MAX_BYTES = 200 * 1024 * 1024;

const ALLOWED_EXT = new Set(["mp4", "mov", "m4v", "webm"]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Clips must be under 200MB" }, { status: 413 });
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  // Trust the extension over the browser's content-type, which is empty or
  // wrong often enough that rejecting on it alone turns away real videos.
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Use an mp4, mov, m4v or webm file" }, { status: 415 });
  }

  const path = `${user.id}/generate-assets/${crypto.randomUUID()}.${ext}`;
  const svc = createServiceClient();
  const { error } = await svc.storage
    .from("clipforge-videos-raw")
    .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });

  if (error) {
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  return NextResponse.json({ path, name: file.name, size: file.size }, { status: 201 });
}
