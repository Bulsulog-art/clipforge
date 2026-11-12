import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { dentvidQueue } from "@/lib/queue";
import { noteEnqueueFailure } from "@/lib/dentvid/ops-server";
import { loadClinicPlan } from "@/lib/dentvid/plan";
import { isOwnRecordingPath } from "@/lib/dentvid/paths";
import { RECORDING_JOB_OPTS } from "@/lib/dentvid/job-options";

// The browser uploads the recording straight to the clinic's own storage
// folder (storage RLS allows only that folder), then calls this to process it.
const Body = z.object({ path: z.string().min(3).max(300) });

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited(
    [
      { key: `rl:recording:user:${user.id}`, rule: LIMITS.recordingUser },
      { key: `rl:recording:userday:${user.id}`, rule: LIMITS.recordingUserDay },
    ],
    async () => (await dvErrors()).tooMany,
  );
  if (limited) return limited;
  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile").eq("owner_id", user.id).maybeSingle();
  const err = await dvErrors((clinic?.profile as { language?: string } | undefined)?.language);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isOwnRecordingPath(parsed.data.path, user.id)) {
    return NextResponse.json({ error: err.invalidUpload }, { status: 400 });
  }
  if (!clinic) return NextResponse.json({ error: err.setupFirst }, { status: 400 });
  // No free week: recordings are processed only for a paying clinic.
  const plan = await loadClinicPlan(db, clinic.id);
  if (!plan.canMake) return NextResponse.json({ error: err.planRequired, needsPlan: true }, { status: 402 });
  // Own recordings are a Practice/Group feature (as sold on the pricing page).
  if (plan.plan === "active" && plan.tier === "starter") return NextResponse.json({ error: err.recordingsNeedPractice, needsPlan: true }, { status: 402 });

  const path = parsed.data.path;
  try {
    await dentvidQueue.add("recording", { clinicId: clinic.id, sourcePath: path }, { jobId: `rec:${path}`, ...RECORDING_JOB_OPTS });
  } catch (e) {
    await noteEnqueueFailure("recording-upload", "recording", e, clinic.id);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
