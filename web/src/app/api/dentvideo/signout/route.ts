import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dvAdmin, dvServer } from "@/lib/dentvid/supabase";
import { isDvAuthCookieName, signOutEverywhere } from "@/lib/dentvid/sign-out";

export const dynamic = "force-dynamic";

/**
 * POST /api/dentvideo/signout — "Sign out" in the app header and the sign-up
 * wizard. Ends the account's sessions everywhere with a token the server has
 * just checked or refreshed (lib/dentvid/sign-out.ts), then clears this
 * browser's dv-auth cookies on the response. Always 200: the clinic is
 * signed out of this browser either way; `global` says whether the other
 * sessions were ended too.
 */
export async function POST() {
  const store = await cookies();
  const db = dvServer(store);
  const result = await signOutEverywhere({
    session: async () => (await db.auth.getSession()).data.session,
    refresh: async () => (await db.auth.refreshSession()).data.session,
    revoke: async (jwt, scope) => {
      const { error } = await dvAdmin().auth.admin.signOut(jwt, scope);
      return error ? { status: (error as { status?: number }).status, message: error.message } : null;
    },
  });
  if (!result.global) console.warn("[dentvideo signout] other sessions may remain", result.error);
  for (const c of store.getAll()) {
    if (isDvAuthCookieName(c.name)) store.delete(c.name);
  }
  return NextResponse.json({ ok: true, global: result.global }, { headers: { "Cache-Control": "no-store" } });
}
