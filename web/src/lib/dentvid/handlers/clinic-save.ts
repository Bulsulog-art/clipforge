import { NextResponse } from "next/server";
import { z } from "zod";
import { clinicProfileSchema } from "@/lib/dentvid/profile";
import { closingLineMessage } from "@/lib/dentvid/closing-line-message";
import type { DvActor } from "@/lib/dentvid/handlers/item-patch";
import { dvErrors, dvLocale } from "@/lib/dentvid/locale-server";
import { isOwnLogoPath } from "@/lib/dentvid/paths";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { recordEvent } from "@/lib/dentvid/events-server";
import { isInternalUser } from "@/lib/dentvid/internal-traffic";
import { requestCountry } from "@/lib/dentvid/geo-ip";
import { BUCKET, dvAdmin } from "@/lib/dentvid/supabase";
import { LOGO_MAX_BYTES } from "@/lib/dentvid/storage-quota";
import { fmt } from "@/content/dentvideo-app";
import { copyDemoLogoTo, loadDemoRow } from "@/lib/dentvid/demos-server";
import { isDemoActive } from "@/lib/dentvid/demos";
import { sniffImage } from "@/lib/dentvid/safe-image-fetch";
import { isAdminUser } from "@/lib/dentvid/admin";
import { raiseHotLead } from "@/lib/dentvid/hot-leads-server";

const Body = z.object({
  profile: clinicProfileSchema,
  logoPath: z.string().max(300).nullable().optional(),
  /** The tab's first-touch source (lib/dentvid/attribution): becomes the clinic's first touch on /admin. */
  attribution: z.record(z.string().max(80)).optional(),
  /**
   * The personalised demo the clinic came from (/d/<token>): credits the
   * clinic to it, and — when the clinic has no logo of its own yet — the
   * demo's logo is copied into the owner's folder, so nothing is retyped.
   */
  demoToken: z.string().regex(/^[A-Za-z0-9]{10,12}$/).optional(),
});

/** Size of one object in the owner's folder, null when it is not there. */
async function objectSize(path: string): Promise<number | null> {
  const slash = path.lastIndexOf("/");
  const { data, error } = await dvAdmin().storage.from(BUCKET).list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 10 });
  if (error) throw new Error(error.message);
  const hit = (data ?? []).find((e) => e.name === path.slice(slash + 1) && e.id != null);
  if (!hit) return null;
  const size = (hit.metadata as { size?: number } | null)?.size;
  return typeof size === "number" ? size : 0;
}

/** Whether the stored object starts like a PNG, JPEG or WebP (already bounded by LOGO_MAX_BYTES). Throws when it cannot be read. */
async function isStoredImage(path: string): Promise<boolean> {
  const { data, error } = await dvAdmin().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "logo not readable");
  return sniffImage(new Uint8Array(await data.slice(0, 16).arrayBuffer())) !== null;
}

/** Save the clinic profile. Shared by the web route (cookie) and the iPhone app's route (bearer). */
export async function saveClinic({ db, user }: DvActor, req: Request): Promise<NextResponse> {
  const raw = await req.json().catch(() => null);
  // Answer in the language the clinic just chose, when it says one.
  const err = await dvErrors((raw as { profile?: { language?: string } } | null)?.profile?.language);
  const limited = await rateLimited([{ key: `rl:clinic:user:${user.id}`, rule: LIMITS.clinicUser }], () => err.tooMany);
  if (limited) return limited;

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".");
    return NextResponse.json({ error: field ? `${err.invalidProfile} (${field})` : err.invalidProfile }, { status: 400 });
  }
  const body = parsed.data;
  // A closing line the clinic's market rules refuse is not stored: the worker
  // would ignore it anyway, and the clinic would never know why.
  const closingRefused = body.profile.closingLine ? closingLineMessage(body.profile.closingLine, body.profile.country, await dvLocale(body.profile.language)) : null;
  if (closingRefused) return NextResponse.json({ error: closingRefused, field: "closingLine", code: "closing_line" }, { status: 400 });
  if (body.logoPath && !isOwnLogoPath(body.logoPath, user.id)) {
    return NextResponse.json({ error: err.invalidLogo }, { status: 400 });
  }

  // The logo replaced by this save (deleted once the new path is stored).
  const { data: before } = await db.from("dentvid_clinics").select("logo_path").eq("owner_id", user.id).maybeSingle();
  const previousLogo = (before?.logo_path as string | null | undefined) ?? null;
  const newLogo = body.logoPath && body.logoPath !== previousLogo ? body.logoPath : null;

  // From a demo link: the demo it came from (any state — the credit stays), and its logo for a clinic without one.
  const demo = body.demoToken ? await loadDemoRow(body.demoToken).catch(() => null) : null;
  if (demo && !body.logoPath && !previousLogo && demo.logo_path && isDemoActive(demo)) {
    const copied = await copyDemoLogoTo(demo.token, user.id).catch(() => null);
    // Copied by the server from a checked image (≤ 2 MB, PNG/JPEG/WebP) into the owner's own folder.
    if (copied && isOwnLogoPath(copied, user.id)) body.logoPath = copied;
  }

  // A signed upload URL cannot bound the size; check the stored file here.
  if (newLogo) {
    try {
      const size = await objectSize(newLogo);
      if (size === null) return NextResponse.json({ error: err.invalidLogo }, { status: 400 });
      if (size > LOGO_MAX_BYTES) {
        await dvAdmin().storage.from(BUCKET).remove([newLogo]);
        return NextResponse.json({ error: fmt(err.logoTooLarge, { mb: LOGO_MAX_BYTES / (1024 * 1024) }), code: "size" }, { status: 400 });
      }
      // Nor can it check what was uploaded: the file must really be a PNG, JPEG or WebP
      // (its first bytes), not just named like one. The worker checks again at render time.
      if (!(await isStoredImage(newLogo))) {
        await dvAdmin().storage.from(BUCKET).remove([newLogo]);
        return NextResponse.json({ error: err.invalidLogo, code: "type" }, { status: 400 });
      }
    } catch (e) {
      console.error("dentvideo clinic: logo check failed", (e as Error).message);
      return NextResponse.json({ error: err.saveFailed }, { status: 503 });
    }
  }

  const row = {
    owner_id: user.id,
    profile: body.profile,
    ...(body.logoPath !== undefined ? { logo_path: body.logoPath } : {}),
    updated_at: new Date().toISOString(),
  };
  const first = await db.from("dentvid_clinics").upsert(row, { onConflict: "owner_id" }).select("id, logo_path").single();
  let data = first.data;
  let error: { message: string; code?: string } | null = first.error;
  // Before migration 0021 the 0007 profile guard does not know "closingLine",
  // and before 0022 it does not know "narratorVoice": either refuses the whole
  // owner write (23514). Both were checked above (shape, and market rules for
  // the line), so the rest is saved as the owner and those keys added with the
  // service role, as the logo path is below.
  const { closingLine, narratorVoice, ...rest } = body.profile;
  if (error?.code === "23514" && (closingLine || narratorVoice)) {
    const retry = await db.from("dentvid_clinics").upsert({ ...row, profile: rest }, { onConflict: "owner_id" }).select("id, logo_path").single();
    data = retry.data;
    error = retry.error;
    if (!error) error = (await dvAdmin().from("dentvid_clinics").update({ profile: body.profile }).eq("owner_id", user.id)).error;
  }
  if (error || !data) {
    console.error("dentvideo clinic save failed", error?.message);
    return NextResponse.json({ error: err.saveFailed }, { status: 500 });
  }

  // Before migration 0008 the 0004 trigger knows only "<uid>/logo.<ext>" and
  // quietly keeps the old value for a versioned name. The path was validated
  // above (own folder, exact shape), so store it with the service role.
  let savedLogo = (data.logo_path as string | null | undefined) ?? null;
  if (body.logoPath && savedLogo !== body.logoPath) {
    const { error: fixErr } = await dvAdmin().from("dentvid_clinics").update({ logo_path: body.logoPath }).eq("owner_id", user.id);
    if (fixErr) {
      console.error("dentvideo clinic: logo path not saved", fixErr.message);
      return NextResponse.json({ error: err.saveFailed }, { status: 500 });
    }
    savedLogo = body.logoPath;
  }

  // The old logo file goes once the new one is stored (only if the row really changed).
  const replaced = body.logoPath !== undefined && previousLogo && savedLogo !== previousLogo && isOwnLogoPath(previousLogo, user.id);
  if (replaced) {
    try {
      const { error: rmErr } = await dvAdmin().storage.from(BUCKET).remove([previousLogo]);
      if (rmErr) console.warn("dentvideo clinic: previous logo not removed", rmErr.message);
    } catch (e) {
      // The save stands; the orphan is picked up by scripts/dentvideo-storage-cleanup.mjs.
      console.warn("dentvideo clinic: previous logo not removed", (e as Error).message);
    }
  }

  void recordEvent("clinic_saved", {
    locale: body.profile.language,
    props: { ...(body.attribution ?? {}), ...(demo ? { demo: demo.token } : {}), country: body.profile.country, language: body.profile.language },
    clinicId: data.id as string,
    geo: requestCountry(req.headers),
    internal: isInternalUser(user),
  });
  // A clinic signed up from a demo link: the warmest lead there is (once per demo; not the owner testing).
  if (demo && !isAdminUser(user.id)) void raiseHotLead({ token: demo.token, step: "signup", demo, clinicId: data.id as string });
  return NextResponse.json({ id: data.id });
}
