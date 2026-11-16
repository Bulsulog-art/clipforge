import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { subtitlesGet } from "@/lib/dentvid/handlers/requests";

// One of the clinic's own videos as a subtitle file: ?format=srt (default) or ?format=vtt (lib/dentvid/subtitles.ts).
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return subtitlesGet({ db, user }, id, req);
}
