import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Custom branding (logo watermark) — Plus-tier feature. iOS uploads the
 * logo via the /upload subroute first, then calls one of these endpoints
 * to read / update / delete the metadata row.
 */

/**
 * GET /api/branding
 *
 * Returns the user's branding row (or null) plus a 5-minute signed URL
 * for the logo so the Settings sheet can preview it without round-tripping
 * through the worker.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .schema("clipforge")
    .from("clip_branding")
    .select("logo_path, position, opacity, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ branding: null });

  const svc = createServiceClient();
  const { data: signed } = await svc.storage
    .from("clipforge-faces")
    .createSignedUrl(row.logo_path as string, 5 * 60);

  return NextResponse.json({
    branding: {
      logoPath: row.logo_path,
      position: row.position,
      opacity: row.opacity,
      updatedAt: row.updated_at,
      previewUrl: signed?.signedUrl ?? null,
    },
  });
}

const PatchBody = z.object({
  position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).optional(),
  opacity: z.number().min(0.10).max(1.00).optional(),
});

/**
 * PATCH /api/branding — update position / opacity without re-uploading
 * the logo.
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof PatchBody>;
  try { body = PatchBody.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.position !== undefined) updates.position = body.position;
  if (body.opacity !== undefined) updates.opacity = body.opacity;
  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .schema("clipforge")
    .from("clip_branding")
    .update(updates)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/branding — removes the row + best-effort deletes the logo
 * blob in storage. Worker will revert to the default outro on next render.
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("clip_branding")
    .select("logo_path")
    .eq("user_id", user.id)
    .maybeSingle();
  if (row?.logo_path) {
    await svc.storage.from("clipforge-faces").remove([row.logo_path as string])
      .then(() => {}, () => {});
  }
  await svc.from("clip_branding").delete().eq("user_id", user.id);
  return new NextResponse(null, { status: 204 });
}
