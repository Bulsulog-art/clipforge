import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { storeLogo } from "@/lib/dentvid/handlers/logo-upload";

// POST /api/dentvideo/logo — the clinic's logo, sent through this server
// (body = the image bytes, Content-Type = its type, at most 5 MB). The rules
// (size counted while reading, real image type, quota, a path the server
// picks) are in lib/dentvid/handlers/logo-upload.ts, shared with the iPhone
// app's POST /api/dentvideo/mobile/v1/logo. POST /api/dentvideo/clinic then
// saves the path (and checks it again).

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return storeLogo({ db, user }, req);
}
