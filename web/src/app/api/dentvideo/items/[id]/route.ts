import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { recordEvent } from "@/lib/dentvid/events-server";

// The only thing a clinic changes on an item: its decision. Nothing is
// publishable until it is "approved". Only a finished video (ready / flagged)
// can be decided on — a queued, failed or rejected item has nothing to approve
// (0007 enforces the same on direct REST writes).

/** Item statuses a clinic may approve or reject. */
const DECIDABLE = ["ready", "flagged"] as const;

const Body = z.object({
  approval: z.enum(["approved", "rejected", "pending"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await dvSession();
  // The cookie already carries the clinic's language (the app pages keep it in step).
  const err = await dvErrors();
  if (!user) return NextResponse.json({ error: err.signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:items:user:${user.id}`, rule: LIMITS.itemsUser }], () => err.tooMany);
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.invalidDecision }, { status: 400 });
  const body = parsed.data;
  const { data: updated, error } = await db
    .from("dentvid_items")
    .update({ approval: body.approval, approval_note: body.note ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id)
    .in("status", DECIDABLE)
    .select("clinic_id");
  if (error) {
    console.error("dentvideo decision failed", error.message);
    return NextResponse.json({ error: err.saveFailed }, { status: 500 });
  }
  if (!updated?.length) return NextResponse.json({ error: err.invalidDecision }, { status: 409 });
  const clinicId = (updated[0] as { clinic_id?: string } | undefined)?.clinic_id;
  if (body.approval === "approved" && clinicId) void recordEvent("video_approved", { clinicId });
  return NextResponse.json({ ok: true });
}
