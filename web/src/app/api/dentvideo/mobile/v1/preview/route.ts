import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { loadOwnClinic } from "@/lib/dentvid/mobile";
import { formatHandle, libraryLanguage, pickPreviews, previewControlsSide, servicesWithoutSample } from "@/lib/dentvid/preview-library";
import { BUCKET } from "@/lib/dentvid/supabase";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * GET /api/dentvideo/mobile/v1/preview — the data for the app's "your videos, in your colours" preview
 * before the paywall: the same static, already-reviewed library the web's live preview plays
 * (lib/dentvid/preview-library.ts), picked for the clinic's services and language. Nothing is generated
 * and no model is called: the plans and narrations are files under /dentvideo/preview/<lang>/, and the
 * app fills the {name} / {handle} placeholders itself (personalisePlan's rule). Paths are relative to the
 * API's own origin. The session's own clinic only.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withMobileSession(req, async ({ db, user }) => {
    const limited = await rateLimited([{ key: `rl:mread:user:${user.id}`, rule: LIMITS.mobileReadUser }], () => "Too many requests");
    if (limited) return limited;
    const clinic = await loadOwnClinic(db, user.id);
    if (!clinic) return NextResponse.json({ error: "Set up your clinic first.", code: "no_clinic" }, { status: 409 });
    const p = clinic.profile as { name?: string; handle?: string; language?: string; services?: unknown; brandColor?: string };
    const services = Array.isArray(p.services) ? p.services.filter((s): s is string => typeof s === "string") : [];
    const language = typeof p.language === "string" ? p.language : "en";
    const lang = libraryLanguage(language);
    let logoUrl: string | null = null;
    if (clinic.logo_path) {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(clinic.logo_path, 60 * 60);
      logoUrl = data?.signedUrl ?? null;
    }
    const brand = typeof p.brandColor === "string" && /^#?[0-9A-Fa-f]{6}$/.test(p.brandColor) ? `#${p.brandColor.replace(/^#/, "").toUpperCase()}` : null;
    return NextResponse.json({
      language: lang,
      controlsSide: previewControlsSide(language),
      clinic: { name: typeof p.name === "string" ? p.name : "", handle: formatHandle(p.handle) ?? null, brandColor: brand, logoUrl },
      placeholders: { name: "{name}", handle: "{handle}" },
      samples: pickPreviews(services, language, 3).map((e) => ({
        id: e.id,
        title: e.title,
        service: e.service,
        category: e.category ?? null,
        seconds: e.seconds,
        planPath: `/dentvideo/preview/${lang}/${e.id}.json`,
        audioPath: e.narrated === false ? null : `/dentvideo/preview/${lang}/${e.id}.mp3`,
      })),
      servicesWithoutSample: servicesWithoutSample(services, language),
    });
  });
}
