import { NextResponse } from "next/server";
import { dvSession, weekOf } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { dentvidQueue } from "@/lib/queue";

// Start this week's videos. One run per clinic per week: the job id is the
// week, so pressing the button twice queues nothing new.
export async function POST() {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile").eq("owner_id", user.id).maybeSingle();
  const err = await dvErrors((clinic?.profile as { language?: string } | undefined)?.language);
  if (!clinic) return NextResponse.json({ error: err.setupFirst }, { status: 400 });

  const week = weekOf();
  const jobId = `week:${clinic.id}:${week}`;
  try {
    // Say so when the week is already made or in progress, instead of
    // promising videos that will not come. A failed run may be retried.
    const existing = await dentvidQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "failed") await existing.remove();
      else if (state === "completed") return NextResponse.json({ error: err.weekMade }, { status: 409 });
      else return NextResponse.json({ ok: true, week, already: true });
    }
    await dentvidQueue.add("week", { clinicId: clinic.id, count: 5 }, { jobId, attempts: 2, backoff: { type: "exponential", delay: 60_000 } });
  } catch {
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  return NextResponse.json({ ok: true, week });
}
