import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { changePost } from "@/lib/dentvid/handlers/requests";

// "Ask for a change" on one of the clinic's own videos (POST { note }): queues the worker's
// "change" job. Limits and checks: lib/dentvid/clinic-requests.ts, shared with the iPhone app.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return changePost({ db, user }, id, req);
}
