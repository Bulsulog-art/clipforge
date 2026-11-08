import { NextResponse } from "next/server";
import { z } from "zod";
import { clinicProfileSchema } from "@/lib/dentvid/profile";
import { dvSession } from "@/lib/dentvid/auth";

const Body = z.object({
  profile: clinicProfileSchema,
  logoPath: z.string().max(300).nullable().optional(),
});

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    const issue = e instanceof z.ZodError ? e.issues[0] : undefined;
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid clinic profile." },
      { status: 400 },
    );
  }
  if (body.logoPath && !body.logoPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid logo." }, { status: 400 });
  }

  const row = {
    owner_id: user.id,
    profile: body.profile,
    ...(body.logoPath !== undefined ? { logo_path: body.logoPath } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db.from("dentvid_clinics").upsert(row, { onConflict: "owner_id" }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
