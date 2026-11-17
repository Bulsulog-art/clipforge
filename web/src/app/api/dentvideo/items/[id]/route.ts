import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { patchItem } from "@/lib/dentvid/handlers/item-patch";

// A clinic's decision on an item, or its "posted" tick. The rules live in
// lib/dentvid/handlers/item-patch.ts, shared with the iPhone app's route.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return patchItem({ db, user }, id, req);
}
