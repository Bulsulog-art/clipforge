import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { createUploadUrl } from "@/lib/dentvid/handlers/upload-url";

// POST { kind: "recording", name, size, contentType }: a one-time signed upload URL. Rules: lib/dentvid/handlers/upload-url.ts.
export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return createUploadUrl({ db, user }, req);
}
