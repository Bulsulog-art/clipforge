import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { recordEvent } from "@/lib/dentvid/events-server";
import { isMissingColumn } from "@/lib/dentvid/posting";

// What a clinic changes on an item: its decision, and its own "posted" tick
// (posted_at, 0012; approved videos only). Nothing is
// publishable until it is "approved". Only a finished video (ready / flagged)
// can be decided on — a queued, failed or rejected item has nothing to approve
// (0007 enforces the same on direct REST writes).

/** Item statuses a clinic may approve or reject. */
const DECIDABLE = ["ready", "flagged"] as const;

const Decision = z.object({
  approval: z.enum(["approved", "rejected", "pending"]),
  note: z.string().max(500).optional(),
});
const Posted = z.object({ posted: z.boolean() }).strict();

/** The signed-in owner and a client acting as them (RLS applies): from the dv-auth cookie or the app's bearer token. */
export type DvActor = { db: SupabaseClient; user: User };

/**
 * PATCH an item: the web route (cookie session) and the iPhone app's route (bearer session) share
 * this, so both apply exactly the same rules.
 */
export async function patchItem({ db, user }: DvActor, id: string, req: Request): Promise<NextResponse> {
  // The cookie already carries the clinic's language (the app pages keep it in step).
  const err = await dvErrors();
  const limited = await rateLimited([{ key: `rl:items:user:${user.id}`, rule: LIMITS.itemsUser }], () => err.tooMany);
  if (limited) return limited;
  const raw = await req.json().catch(() => null);
  const tick = Posted.safeParse(raw);
  if (tick.success) {
    // The clinic's checklist: kept on the account so every device agrees. A database without
    // 0012 answers "stored: false" and the app keeps the tick in the browser, as before.
    const { data: ticked, error } = await db
      .from("dentvid_items")
      .update({ posted_at: tick.data.posted ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("approval", "approved")
      .select("id");
    if (error) {
      if (isMissingColumn(error, "posted_at")) return NextResponse.json({ ok: true, stored: false });
      console.error("dentvideo posted tick failed", error.message);
      return NextResponse.json({ error: err.saveFailed }, { status: 500 });
    }
    if (!ticked?.length) return NextResponse.json({ error: err.invalidDecision }, { status: 409 });
    return NextResponse.json({ ok: true, stored: true });
  }
  const parsed = Decision.safeParse(raw);
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
