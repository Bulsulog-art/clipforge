import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";

// The only thing a clinic changes on an item: its decision. Nothing is
// publishable until it is "approved".
const Body = z.object({
  approval: z.enum(["approved", "rejected", "pending"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }
  const { error } = await db
    .from("dentvid_items")
    .update({ approval: body.approval, approval_note: body.note ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
