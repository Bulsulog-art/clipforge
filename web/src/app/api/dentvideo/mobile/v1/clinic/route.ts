import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { saveClinic } from "@/lib/dentvid/handlers/clinic-save";
import { loadOwnClinic } from "@/lib/dentvid/mobile";
import { dvErrors } from "@/lib/dentvid/locale-server";

/**
 * POST /api/dentvideo/mobile/v1/clinic { profile } — save the clinic's settings with the web's
 * validation (profile schema, closing-line market rules). The app edits an existing clinic only:
 * it never creates one (that is the web's onboarding), and it never sends a logo or a demo token.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, async (s) => {
    if (!(await loadOwnClinic(s.db, s.user.id))) return NextResponse.json({ error: (await dvErrors()).setupFirst, code: "no_clinic" }, { status: 400 });
    const raw = (await req.json().catch(() => null)) as { profile?: unknown } | null;
    const body = JSON.stringify({ profile: raw?.profile ?? null });
    return saveClinic(s, new Request(req.url, { method: "POST", headers: req.headers, body }));
  });
}
