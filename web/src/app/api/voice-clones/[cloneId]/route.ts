import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * DELETE /api/voice-clones/:cloneId
 *
 * Deletes a user's voice clone. Best-effort upstream delete at
 * ElevenLabs so the voice doesn't keep counting against the
 * org's clone quota; the local row is always removed even if the
 * upstream call fails.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ cloneId: string }> },
) {
  const { cloneId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("voice_clones")
    .select("id, user_id, elevenlabs_voice_id, sample_path")
    .eq("id", cloneId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (process.env.ELEVENLABS_API_KEY && row.elevenlabs_voice_id) {
    try {
      await fetch(
        `https://api.elevenlabs.io/v1/voices/${row.elevenlabs_voice_id}`,
        {
          method: "DELETE",
          headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
        },
      );
    } catch {
      // Upstream may already be gone — local cleanup must always succeed.
    }
  }
  if (row.sample_path) {
    await svc.storage.from("clipforge-faces").remove([row.sample_path as string])
      .then(() => {}, () => {});
  }

  await svc.from("voice_clones").delete().eq("id", cloneId);
  return new NextResponse(null, { status: 204 });
}
