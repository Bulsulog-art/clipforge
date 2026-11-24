import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { recordEvent } from "@/lib/dentvid/events-server";
import { isMissingColumn } from "@/lib/dentvid/posting";
import { clinicRefFor, raiseOwnerAlert } from "@/lib/dentvid/ops-server";
import { alerts, type DeclineReasonTag } from "@/lib/dentvid/ops-alert";

// What a clinic changes on an item: its decision, and its own "posted" tick
// (posted_at, 0012; approved videos only). Nothing is
// publishable until it is "approved". Only a finished video (ready / flagged)
// can be decided on — a queued, failed or rejected item has nothing to approve
// (0007 enforces the same on direct REST writes).
//
// A decline is heard: the app tells the dentist "your note goes to our team",
// so the owner gets one alert per declined video (urgent when the dentist says
// something is wrong), a server-only video_declined event counts it (the reason
// tag only, never the words), and the note stays on the video. An undo or a
// later approval no longer erases it: the Monday week reads it (worker
// dental/memory.ts) and the team can still see what was said.

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
  const declined = body.approval === "rejected";
  // The note is written only with a decline: an undo or an approval keeps what the dentist said.
  const change = { approval: body.approval, ...(declined ? { approval_note: body.note ?? null } : {}), updated_at: new Date().toISOString() };
  const { data: updated, error } = await db
    .from("dentvid_items")
    .update(change)
    .eq("id", id)
    .eq("owner_id", user.id)
    .in("status", DECIDABLE)
    .select("clinic_id, title");
  if (error) {
    console.error("dentvideo decision failed", error.message);
    return NextResponse.json({ error: err.saveFailed }, { status: 500 });
  }
  if (!updated?.length) return NextResponse.json({ error: err.invalidDecision }, { status: 409 });
  const row = updated[0] as { clinic_id?: string; title?: string | null } | undefined;
  const clinicId = row?.clinic_id;
  if (body.approval === "approved" && clinicId) void recordEvent("video_approved", { clinicId });
  if (declined && clinicId) {
    const reason = declineReasonOf(body.note);
    void recordEvent("video_declined", { clinicId, props: reason ? { reason } : {} });
    void alertDeclined({ db, user }, clinicId, id, row?.title ?? null, reason, body.note ?? null);
  }
  return NextResponse.json({ ok: true });
}

const DECLINE_TAG = /^\s*\[(wrong|notUs|look|other)\]\s*/;

/** The reason tag in front of a decline note (app-ui.ts declineNote writes "[notUs] their words"). */
export function declineReasonOf(note: string | null | undefined): DeclineReasonTag | null {
  return (DECLINE_TAG.exec(note ?? "")?.[1] as DeclineReasonTag | undefined) ?? null;
}

/** Fire and forget: the owner hears about a declined video. Never throws, never delays the answer. */
async function alertDeclined({ db, user }: DvActor, clinicId: string, itemId: string, title: string | null, reason: DeclineReasonTag | null, note: string | null): Promise<void> {
  try {
    const clinic = await clinicRefFor(db, clinicId);
    // The person who declined is the clinic's owner: their sign-in address is the one to answer.
    const ref = { ...clinic, email: clinic.email ?? user.email ?? null };
    const words = note?.replace(DECLINE_TAG, "").trim() || null;
    await raiseOwnerAlert(alerts.videoDeclined({ clinic: ref, itemId, title, reason, note: words }));
  } catch (e) {
    console.error("dentvideo decline alert failed", (e as Error)?.message ?? String(e));
  }
}
