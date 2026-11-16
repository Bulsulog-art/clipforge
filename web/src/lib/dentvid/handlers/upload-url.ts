import { NextResponse } from "next/server";
import { z } from "zod";
import type { DvActor } from "@/lib/dentvid/handlers/item-patch";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited, uploadSlotStore } from "@/lib/rate-limit-server";
import { BUCKET, dvAdmin } from "@/lib/dentvid/supabase";
import { isDentvideoUser } from "@/lib/dentvid/membership";
import { listOwnerFiles } from "@/lib/dentvid/account";
import { recordingPathFor } from "@/lib/dentvid/paths";
import { decideUpload, extFor } from "@/lib/dentvid/storage-quota";
import { claimUploadSlot } from "@/lib/dentvid/upload-slots";

// POST /api/dentvideo/upload-url { kind: "recording", name, size, contentType }
// — a one-time signed upload URL for the clinic's own storage folder.
//
// The server picks the path (timestamped recording) and signs it only after
// checking: a DentVideo account (app_metadata), a plan that includes
// recordings, the type and size, the owner's storage quota
// (lib/dentvid/storage-quota), and that the owner does not already hold too
// many unused upload URLs (lib/dentvid/upload-slots — a signed URL cannot
// bound the real size, so unused URLs were a way past the quota). Migration
// 0008 applies the same rules to direct uploads in the storage insert policy.
//
// Logos no longer come this way: POST /api/dentvideo/logo reads and checks
// the bytes itself (a signed "logo" URL accepted up to the bucket's 500 MB).

const Body = z.object({
  kind: z.enum(["logo", "recording"]),
  name: z.string().max(200).optional(),
  size: z.number().int().positive().max(2 ** 40),
  contentType: z.string().max(100),
});

/** A one-time signed upload URL. Shared by the web route (cookie) and the iPhone app's route (bearer). */
export async function createUploadUrl({ db, user }: DvActor, req: Request): Promise<NextResponse> {
  const limited = await rateLimited([{ key: `rl:upload:user:${user.id}`, rule: LIMITS.uploadUrlUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, plan, plan_tier").eq("owner_id", user.id).maybeSingle();
  const err = await dvErrors((clinic?.profile as { language?: string } | undefined)?.language);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.invalidUpload }, { status: 400 });
  if (!isDentvideoUser(user)) return NextResponse.json({ error: err.invalidUpload, code: "not_dentvideo" }, { status: 403 });
  const body = parsed.data;
  const contentType = body.contentType.toLowerCase();
  // Logos go through POST /api/dentvideo/logo, where the server sees (and bounds) the bytes.
  if (body.kind === "logo") return NextResponse.json({ error: err.invalidLogo, code: "logo_route" }, { status: 400 });
  if (!clinic) return NextResponse.json({ error: err.setupFirst }, { status: 400 });

  const admin = dvAdmin();
  let usage;
  let stored: Set<string>;
  try {
    const files = await listOwnerFiles(admin, user.id);
    usage = { files: files.length, bytes: files.reduce((n, f) => n + (f.size ?? 0), 0) };
    stored = new Set(files.map((f) => f.path));
  } catch (e) {
    console.error("[dentvideo upload] usage lookup failed", (e as Error).message);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }

  const decision = decideUpload({ kind: body.kind, plan: clinic?.plan as string | undefined, tier: clinic?.plan_tier as string | undefined, usage, size: body.size, contentType });
  if (!decision.ok) {
    // Only recordings are plan-gated: the answer names Practice, with or without a plan today
    // (the record page shows the same upsell before any upload, so this is a fallback).
    if (decision.reason === "plan") return NextResponse.json({ error: err.recordingsNeedPractice, needsPlan: true }, { status: 402 });
    if (decision.reason === "quota") return NextResponse.json({ error: err.invalidUpload, code: "quota" }, { status: 413 });
    return NextResponse.json({ error: err.invalidUpload, code: decision.reason }, { status: 400 });
  }

  const path = recordingPathFor(user.id, extFor(body.kind, body.name, contentType));
  // Only a few unused upload URLs at a time: each one could carry the bucket's 500 MB.
  if (!(await holdsSlot(user.id, path, stored))) {
    return NextResponse.json({ error: err.tooMany, code: "pending" }, { status: 429, headers: { "Retry-After": "600" } });
  }
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data?.token) {
    console.error("[dentvideo upload] could not sign", error?.message);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  // uploadUrl: the full signed address, for the iPhone app's background PUT (the browser builds it from path + token).
  return NextResponse.json({ path, token: data.token, contentType, ...(data.signedUrl ? { uploadUrl: data.signedUrl } : {}) }, { headers: { "cache-control": "no-store" } });
}

/** Take a pending-upload slot. True when Redis cannot tell (capacity limits fail open, like the rate limits). */
async function holdsSlot(ownerId: string, path: string, stored: Set<string>): Promise<boolean> {
  try {
    const store = await uploadSlotStore();
    if (!store) return true;
    return await claimUploadSlot(store, { ownerId, kind: "recording", path, stored });
  } catch (e) {
    console.warn("[dentvideo upload] slot store unavailable", (e as Error).message);
    return true;
  }
}
