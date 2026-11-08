import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dentvidQueue } from "@/lib/queue";

// The browser uploads the recording straight to the clinic's own storage
// folder (storage RLS allows only that folder), then calls this to process it.
const Body = z.object({ path: z.string().min(3).max(300) });

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!body.path.startsWith(`${user.id}/recordings/`)) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const { data: clinic } = await db.from("dentvid_clinics").select("id").eq("owner_id", user.id).maybeSingle();
  if (!clinic) return NextResponse.json({ error: "Set up your clinic first." }, { status: 400 });

  try {
    await dentvidQueue.add("recording", { clinicId: clinic.id, sourcePath: body.path }, { jobId: `rec:${body.path}`, attempts: 2, backoff: { type: "exponential", delay: 60_000 } });
  } catch {
    return NextResponse.json({ error: "Could not start — please try again." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
