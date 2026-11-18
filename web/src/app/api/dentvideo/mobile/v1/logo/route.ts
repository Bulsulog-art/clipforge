import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { loadOwnClinic } from "@/lib/dentvid/mobile";
import { storeLogo } from "@/lib/dentvid/handlers/logo-upload";
import { saveClinic } from "@/lib/dentvid/handlers/clinic-save";
import { BUCKET, dvAdmin } from "@/lib/dentvid/supabase";

/**
 * POST /api/dentvideo/mobile/v1/logo — the clinic's logo from the iPhone app ("See it with your
 * logo", before the paywall). Body = the image bytes, Content-Type = its type, at most 5 MB.
 *
 * The web's own rules, twice over: the bytes are stored by the web's logo handler
 * (lib/dentvid/handlers/logo-upload.ts: size counted while reading, real PNG/JPEG/WebP, quota, a
 * path the server picks), then attached to the caller's clinic by the web's clinic handler
 * (handlers/clinic-save.ts, with the clinic's stored profile and that path: own-folder check, size
 * and type checked again, the previous logo removed). The app never names a path, so it can never
 * point the clinic at a file that is not its own. A refused attach removes the file just stored.
 *
 * 200 { path, contentType, logoUrl } (logoUrl: signed for 1 h) · 409 { code: "no_clinic" } ·
 * the handlers' 400 / 403 / 413 / 429 / 503 · 401.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, async (s) => {
    const clinic = await loadOwnClinic(s.db, s.user.id);
    if (!clinic) return NextResponse.json({ error: "Set up your clinic first.", code: "no_clinic" }, { status: 409 });

    const stored = await storeLogo(s, req);
    if (stored.status !== 200) return stored;
    const { path, contentType } = (await stored.json()) as { path: string; contentType: string };

    // The request's own headers (country for the analytics), as JSON now.
    const headers = new Headers(req.headers);
    headers.set("content-type", "application/json");
    headers.delete("content-length");
    const attach = await saveClinic(s, new Request(req.url, { method: "POST", headers, body: JSON.stringify({ profile: clinic.profile, logoPath: path }) }));
    if (attach.status !== 200) {
      // Not attached: the file goes again (it would only count against the clinic's quota).
      try {
        await dvAdmin().storage.from(BUCKET).remove([path]);
      } catch (e) {
        console.warn("[dentvideo mobile logo] unattached logo not removed", (e as Error).message);
      }
      return attach;
    }

    const { data } = await s.db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    return NextResponse.json({ path, contentType, logoUrl: data?.signedUrl ?? null });
  });
}
