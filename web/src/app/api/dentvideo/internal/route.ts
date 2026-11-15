import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { isAdminUser } from "@/lib/dentvid/admin";
import { isInternalUser } from "@/lib/dentvid/internal-traffic";

/**
 * POST /api/dentvideo/internal — may this browser be marked as internal
 * traffic (?dv_internal=1, lib/dentvid/internal-optin)? Yes only for a
 * signed-in internal account (lib/dentvid/internal-traffic) or an admin
 * (DENTVIDEO_ADMIN_USER_IDS). Answers a boolean and changes nothing on the
 * server; the browser keeps the flag in its own storage.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { user } = await dvSession();
    if (user && (isInternalUser(user) || isAdminUser(user.id))) return NextResponse.json({ internal: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    // no session / backend: not internal
  }
  return NextResponse.json({ internal: false }, { status: 403, headers: { "cache-control": "no-store" } });
}
