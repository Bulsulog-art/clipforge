import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { startRecording } from "@/lib/dentvid/handlers/recording";

// Process an uploaded recording. The rules live in lib/dentvid/handlers/recording.ts, shared with the iPhone app.
export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return startRecording({ db, user }, req);
}
