import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { BUCKET, dvAdmin } from "@/lib/dentvid/supabase";
import { isDentvideoUser } from "@/lib/dentvid/membership";
import { listOwnerFiles } from "@/lib/dentvid/account";
import { logoPathFor } from "@/lib/dentvid/paths";
import { LOGO_MAX_BYTES, decideUpload } from "@/lib/dentvid/storage-quota";
import { ImageFetchError, checkImageBytes } from "@/lib/dentvid/safe-image-fetch";
import { readCappedBytes } from "@/lib/dentvid/events-server";
import { oversizedLogos } from "@/lib/dentvid/upload-slots";

// POST /api/dentvideo/logo — the clinic's logo, sent through this server
// (body = the image bytes, Content-Type = its type, at most 5 MB).
//
// Logos used to go to Liman with a signed upload URL, like recordings. A
// signed URL cannot carry a size limit: the bucket's 500 MB applies, so an
// unpaid account could park hundreds of MB per "logo" on the VPS disk
// (audit 2026-11-15). Here the bytes are counted while they are read, the
// file must start like a PNG, JPEG or WebP and match its declared type, the
// owner's quota is checked against the real size, and the server stores it
// under a path it picks. POST /api/dentvideo/clinic then saves that path
// (and checks it again).

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:upload:user:${user.id}`, rule: LIMITS.uploadUrlUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const { data: clinic } = await db.from("dentvid_clinics").select("profile, plan, plan_tier, logo_path").eq("owner_id", user.id).maybeSingle();
  const err = await dvErrors((clinic?.profile as { language?: string } | undefined)?.language);
  if (!isDentvideoUser(user)) return NextResponse.json({ error: err.invalidUpload, code: "not_dentvideo" }, { status: 403 });

  // A body over the limit is refused while it is read (the declared length is not trusted).
  const bytes = await readCappedBytes(req, LOGO_MAX_BYTES).catch(() => null);
  if (!bytes) return NextResponse.json({ error: err.invalidLogo, code: "size" }, { status: 413 });
  let image;
  try {
    image = checkImageBytes(bytes, req.headers.get("content-type"), LOGO_MAX_BYTES);
  } catch (e) {
    const code = e instanceof ImageFetchError && e.code === "size" ? "size" : "type";
    return NextResponse.json({ error: err.invalidLogo, code }, { status: 400 });
  }

  const admin = dvAdmin();
  let files;
  try {
    files = await listOwnerFiles(admin, user.id);
  } catch (e) {
    console.error("[dentvideo logo] usage lookup failed", (e as Error).message);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  // Oversized "logos" left by the old signed-URL path can never be saved: they go first.
  const junk = oversizedLogos(files, clinic?.logo_path as string | null | undefined);
  if (junk.length) {
    const { error } = await admin.storage.from(BUCKET).remove(junk);
    if (error) console.warn("[dentvideo logo] oversized logos not removed", error.message);
    else files = files.filter((f) => !junk.includes(f.path));
  }
  const usage = { files: files.length, bytes: files.reduce((n, f) => n + (f.size ?? 0), 0) };
  const decision = decideUpload({ kind: "logo", plan: clinic?.plan as string | undefined, tier: clinic?.plan_tier as string | undefined, usage, size: bytes.byteLength, contentType: image.contentType });
  if (!decision.ok) {
    return NextResponse.json({ error: err.invalidLogo, code: decision.reason }, { status: decision.reason === "quota" ? 413 : 400 });
  }

  const path = logoPathFor(user.id, image.ext);
  const { error } = await admin.storage.from(BUCKET).upload(path, image.bytes, { contentType: image.contentType, upsert: false });
  if (error) {
    console.error("[dentvideo logo] store failed", error.message);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  return NextResponse.json({ path, contentType: image.contentType }, { headers: { "cache-control": "no-store" } });
}
