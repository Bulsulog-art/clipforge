import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/branding/upload
 *
 * Multipart upload — field name "logo". Accepts PNG / JPEG up to 2 MB.
 * Uploads to clipforge-faces (re-used user-owned-image bucket) under
 * `<user_id>/branding/logo.<ext>` so a previous logo gets overwritten.
 *
 * Gate: Plus tier only — branding is the marquee Plus perk.
 *
 * On success, upserts clip_branding so the worker reads the new logo
 * path on the next render.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.tier === "free") {
    return NextResponse.json(
      { error: "Custom branding is a Plus feature." },
      { status: 402 },
    );
  }

  const form = await req.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "logo file missing" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo must be ≤ 2 MB" }, { status: 413 });
  }
  const mime = file.type || "image/png";
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
    return NextResponse.json(
      { error: "Logo must be PNG, JPEG or WebP." },
      { status: 415 },
    );
  }
  const ext =
    mime === "image/jpeg" ? "jpg" :
    mime === "image/webp" ? "webp" : "png";

  // Stable path so re-uploads replace the prior file rather than littering
  // the bucket with stale orphans.
  const path = `${user.id}/branding/logo.${ext}`;

  const { error: upErr } = await svc.storage
    .from("clipforge-faces")
    .upload(path, file, {
      contentType: mime,
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Persist metadata
  const { error: rowErr } = await svc.from("clip_branding").upsert(
    {
      user_id: user.id,
      logo_path: path,
      // Keep existing position/opacity if a row exists; only set defaults
      // when bootstrapping the first time.
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, logoPath: path });
}
