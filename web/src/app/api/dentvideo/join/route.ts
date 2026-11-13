import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dvServer } from "@/lib/dentvid/supabase";
import { isDentvideoUser } from "@/lib/dentvid/membership";
import { joinDentvideo } from "@/lib/dentvid/join";

// POST /api/dentvideo/join — called by the sign-in form right after a
// successful password sign-in. Liman is shared with other apps: an account
// another app made with the same address has no DentVideo marker, so the
// database (dentvid_is_member) would refuse its clinic. The password was just
// proven, so the signed-in account is added to DentVideo here. A no-op for
// DentVideo accounts; 401 without a session.

export async function POST() {
  const { data } = await dvServer(await cookies()).auth.getUser();
  const user = data?.user;
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (isDentvideoUser(user)) return NextResponse.json({ ok: true, joined: false });
  const ok = await joinDentvideo(user.id);
  return NextResponse.json(ok ? { ok: true, joined: true } : { error: "failed" }, { status: ok ? 200 : 502 });
}
