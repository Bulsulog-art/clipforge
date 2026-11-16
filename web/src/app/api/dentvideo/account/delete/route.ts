import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { deleteAccount } from "@/lib/dentvid/handlers/account-delete";

// POST { confirm }: delete the signed-in clinic's account. Steps: lib/dentvid/handlers/account-delete.ts and lib/dentvid/account.ts.
export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  return deleteAccount({ db, user }, req);
}
