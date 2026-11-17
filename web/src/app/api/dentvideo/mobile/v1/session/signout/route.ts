import { NextResponse } from "next/server";
import { z } from "zod";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { deleteDevice } from "@/lib/dentvid/mobile";
import { dvAdmin } from "@/lib/dentvid/supabase";

/**
 * POST /api/dentvideo/mobile/v1/session/signout { deviceToken? } — ends this phone's session on
 * the server (its refresh token stops working) and forgets its push token, so a signed-out phone
 * gets no more of this clinic's notices. The app clears the Keychain whatever the answer.
 */
export const dynamic = "force-dynamic";

const Body = z.object({ deviceToken: z.string().trim().toLowerCase().regex(/^[0-9a-f]{64,200}$/).optional() }).strict();

export async function POST(req: Request) {
  return withMobileSession(req, async ({ user, token }) => {
    const parsed = Body.safeParse((await req.json().catch(() => ({}))) ?? {});
    const admin = dvAdmin();
    if (parsed.success && parsed.data.deviceToken) await deleteDevice(admin, user.id, parsed.data.deviceToken);
    await admin.auth.admin.signOut(token, "local").catch(() => {});
    return NextResponse.json({ ok: true });
  });
}
