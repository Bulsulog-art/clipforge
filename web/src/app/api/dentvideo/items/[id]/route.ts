import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";

// The only thing a clinic changes on an item: its decision. Nothing is
// publishable until it is "approved".
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
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.invalidDecision }, { status: 400 });
  const body = parsed.data;
  const { error } = await db
    .from("dentvid_items")
    .update({ approval: body.approval, approval_note: body.note ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) {
    console.error("dentvideo decision failed", error.message);
    return NextResponse.json({ error: err.saveFailed }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
