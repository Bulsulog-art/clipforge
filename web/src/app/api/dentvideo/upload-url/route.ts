import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { BUCKET, dvAdmin } from "@/lib/dentvid/supabase";
import { isDentvideoUser } from "@/lib/dentvid/membership";
import { listOwnerFiles } from "@/lib/dentvid/account";
import { logoPathFor, recordingPathFor } from "@/lib/dentvid/paths";
import { decideUpload, extFor } from "@/lib/dentvid/storage-quota";

// POST /api/dentvideo/upload-url { kind, name, size, contentType } — a
// one-time signed upload URL for the clinic's own storage folder.
//
// The server picks the path (versioned logo name, timestamped recording) and
// signs it only after checking: a DentVideo account (app_metadata), a plan
// that includes recordings for a recording, the type and size, and the
// owner's storage quota (lib/dentvid/storage-quota). Migration 0008 applies
// the same rules to direct uploads in the storage insert policy.

const Body = z.object({
  kind: z.enum(["logo", "recording"]),
  name: z.string().max(200).optional(),
  size: z.number().int().positive().max(2 ** 40),
  contentType: z.string().max(100),
});

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:upload:user:${user.id}`, rule: LIMITS.uploadUrlUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, plan, plan_tier").eq("owner_id", user.id).maybeSingle();
  const err = await dvErrors((clinic?.profile as { language?: string } | undefined)?.language);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.invalidUpload }, { status: 400 });
  if (!isDentvideoUser(user)) return NextResponse.json({ error: err.invalidUpload, code: "not_dentvideo" }, { status: 403 });
  const body = parsed.data;
  const contentType = body.contentType.toLowerCase();
  if (body.kind === "recording" && !clinic) return NextResponse.json({ error: err.setupFirst }, { status: 400 });

  const admin = dvAdmin();
  let usage;
  try {
    const files = await listOwnerFiles(admin, user.id);
    usage = { files: files.length, bytes: files.reduce((n, f) => n + (f.size ?? 0), 0) };
  } catch (e) {
    console.error("[dentvideo upload] usage lookup failed", (e as Error).message);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }

  const decision = decideUpload({ kind: body.kind, plan: clinic?.plan as string | undefined, tier: clinic?.plan_tier as string | undefined, usage, size: body.size, contentType });
  if (!decision.ok) {
    if (decision.reason === "plan") {
      const starter = clinic?.plan === "active";
      return NextResponse.json({ error: starter ? err.recordingsNeedPractice : err.planRequired, needsPlan: true }, { status: 402 });
    }
    if (decision.reason === "quota") return NextResponse.json({ error: err.invalidUpload, code: "quota" }, { status: 413 });
    return NextResponse.json({ error: body.kind === "logo" ? err.invalidLogo : err.invalidUpload, code: decision.reason }, { status: 400 });
  }

  const ext = extFor(body.kind, body.name, contentType);
  const path = body.kind === "logo" ? logoPathFor(user.id, ext) : recordingPathFor(user.id, ext);
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data?.token) {
    console.error("[dentvideo upload] could not sign", error?.message);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  return NextResponse.json({ path, token: data.token, contentType }, { headers: { "cache-control": "no-store" } });
}
