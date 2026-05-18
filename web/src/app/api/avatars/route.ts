import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/avatars — list the active stock avatar catalog (logged-in users only).
 * Returns short-lived signed URLs so the iOS app can render thumbnails without
 * exposing the bucket publicly.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("avatars")
    .select("id, name, description, image_path, default_voice_id, persona, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (data ?? []).map(async (a) => {
      const { data: signed } = await svc.storage
        .from("clipforge-avatars")
        .createSignedUrl(a.image_path, 60 * 30);
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        persona: a.persona,
        defaultVoiceId: a.default_voice_id,
        imageUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ avatars: enriched });
}
