import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { ApproveWeek, approveWeek } from "@/lib/dentvid/mobile";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { recordEvent } from "@/lib/dentvid/events-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/** POST /api/dentvideo/mobile/v1/items/approve-week { week } — approve the week's ready, undecided videos (not the flagged ones). */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, async ({ db, user }) => {
    const err = await dvErrors();
    const limited = await rateLimited([{ key: `rl:items:user:${user.id}`, rule: LIMITS.itemsUser }], () => err.tooMany);
    if (limited) return limited;
    const parsed = ApproveWeek.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: err.invalidDecision }, { status: 400 });
    const r = await approveWeek(db, user.id, parsed.data.week);
    if (!r.ok) return NextResponse.json({ error: err.saveFailed }, { status: 500 });
    if (r.clinicId) for (let i = 0; i < r.approved.length; i++) void recordEvent("video_approved", { clinicId: r.clinicId });
    return NextResponse.json({ ok: true, approved: r.approved.length, ids: r.approved });
  });
}
