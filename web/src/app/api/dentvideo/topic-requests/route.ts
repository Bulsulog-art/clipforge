import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { topicsGet, topicsPost } from "@/lib/dentvid/handlers/requests";

// "Suggest a topic for next week": the clinic's suggestions (GET) and a new one (POST { text }).
// The rules live in lib/dentvid/clinic-requests.ts, shared with the iPhone app's route.
export const dynamic = "force-dynamic";

export async function GET() {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return topicsGet({ db, user });
}

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return topicsPost({ db, user }, req);
}
