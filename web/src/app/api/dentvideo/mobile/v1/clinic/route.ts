import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { saveClinic } from "@/lib/dentvid/handlers/clinic-save";

/**
 * POST /api/dentvideo/mobile/v1/clinic { profile } — create the caller's clinic, or save its
 * settings when it has one. The web's own handler (lib/dentvid/handlers/clinic-save.ts, also behind
 * POST /api/dentvideo/clinic): same profile schema and closing-line market rules, same per-user rate
 * limit, one clinic per login (upsert on owner_id = the token's user), same analytics (clinic_saved).
 * An account made in the app (POST mobile/v1/signup) gets its clinic here, as the web's start flow
 * gives it one; like the web, the clinic step does not wait for the email code (the purchase does).
 *
 * Only `profile` is passed on: the app never sends a logo path, attribution or a demo token, and an
 * owner_id or id in the body is ignored (the owner is always the bearer token's user).
 *
 * 200 { id } · 400 { error } (invalid profile, "(field)" appended) · 400 { error, field, code:
 * "closing_line" } · 401 { code: "unauthorized" } · 429 · 500 { error }.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, async (s) => {
    const raw = (await req.json().catch(() => null)) as { profile?: unknown } | null;
    const body = JSON.stringify({ profile: raw?.profile ?? null });
    return saveClinic(s, new Request(req.url, { method: "POST", headers: req.headers, body }));
  });
}
