import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { saveClinic } from "@/lib/dentvid/handlers/clinic-save";

// POST { profile, logoPath? }: create or update the clinic. Rules: lib/dentvid/handlers/clinic-save.ts.
export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return saveClinic({ db, user }, req);
}
