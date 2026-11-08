import { NextResponse } from "next/server";
import { z } from "zod";
import { clinicProfileSchema } from "@/lib/dentvid/profile";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { isOwnLogoPath } from "@/lib/dentvid/paths";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

const Body = z.object({
  profile: clinicProfileSchema,
  logoPath: z.string().max(300).nullable().optional(),
});

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  const raw = await req.json().catch(() => null);
  // Answer in the language the clinic just chose, when it says one.
  const err = await dvErrors((raw as { profile?: { language?: string } } | null)?.profile?.language);
  if (!user) return NextResponse.json({ error: err.signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:clinic:user:${user.id}`, rule: LIMITS.clinicUser }], () => err.tooMany);
  if (limited) return limited;

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".");
    return NextResponse.json({ error: field ? `${err.invalidProfile} (${field})` : err.invalidProfile }, { status: 400 });
  }
  const body = parsed.data;
  if (body.logoPath && !isOwnLogoPath(body.logoPath, user.id)) {
    return NextResponse.json({ error: err.invalidLogo }, { status: 400 });
  }

  const row = {
    owner_id: user.id,
    profile: body.profile,
    ...(body.logoPath !== undefined ? { logo_path: body.logoPath } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db.from("dentvid_clinics").upsert(row, { onConflict: "owner_id" }).select("id").single();
  if (error) {
    console.error("dentvideo clinic save failed", error.message);
    return NextResponse.json({ error: err.saveFailed }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
