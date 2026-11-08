import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { dvErrors } from "@/lib/dentvid/locale-server";

// Liman has public sign-up disabled (it hosts other apps too), so DentVideo
// accounts are created here with the service role, already confirmed; the
// browser then signs in with the same email and password.
const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const err = await dvErrors();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.badSignup }, { status: 400 });
  const body = parsed.data;
  const { error } = await dvAdmin().auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { product: "dentvideo" },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return NextResponse.json({ error: exists ? err.accountExists : err.createFailed }, { status: exists ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
