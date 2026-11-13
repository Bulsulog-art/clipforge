import { NextResponse } from "next/server";
import { deliveryWeek, dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { dentvidQueue } from "@/lib/queue";
import { noteEnqueueFailure } from "@/lib/dentvid/ops-server";
import { adminPausedMessage, loadClinicPlan } from "@/lib/dentvid/plan";
import { WEEK_VIDEOS, weekJobId } from "@/lib/dentvid/week-job";
import { DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS } from "@/lib/dentvid/job-options";

// Start this week's videos. One run per clinic per week: the job id is the
// week, so pressing the button twice queues nothing new.
export async function POST() {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:week:user:${user.id}`, rule: LIMITS.weekUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;
  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile").eq("owner_id", user.id).maybeSingle();
  const err = await dvErrors((clinic?.profile as { language?: string } | undefined)?.language);
  if (!clinic) return NextResponse.json({ error: err.setupFirst }, { status: 400 });
  // No free week: videos are made only for a paying clinic. A clinic that has
  // not paid yet ("trial") sees the live preview and chooses a plan first.
  const plan = await loadClinicPlan(db, clinic.id);
  // Paused by DentVideo (admin panel): the worker would skip the week, so say so instead of promising videos.
  if (plan.adminPaused) return NextResponse.json({ error: adminPausedMessage((clinic.profile as { language?: string } | undefined)?.language), code: "admin_paused" }, { status: 423 });
  if (!plan.canMake) return NextResponse.json({ error: err.planRequired, needsPlan: true }, { status: 402 });

  // From Saturday evening, the coming Monday's week (the weekend batch's).
  const week = deliveryWeek();
  const jobId = weekJobId(clinic.id, week);
  try {
    // Say so when the week is already made or in progress, instead of
    // promising videos that will not come. A failed run may be retried.
    const existing = await dentvidQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "failed") await existing.remove();
      else if (state === "completed") return NextResponse.json({ error: err.weekMade }, { status: 409 });
      else {
        // Waiting in the weekend batch: the dentist is waiting now, so it goes first.
        if (state === "waiting" || state === "prioritized") await existing.changePriority({ priority: DENTVID_PRIORITY.firstWeek }).catch(() => {});
        return NextResponse.json({ ok: true, week, already: true });
      }
    }
    await dentvidQueue.add("week", { clinicId: clinic.id, count: WEEK_VIDEOS, week }, { jobId, ...FIRST_WEEK_JOB_OPTS });
  } catch (e) {
    await noteEnqueueFailure("week-button", "week", e, clinic.id);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  return NextResponse.json({ ok: true, week });
}
