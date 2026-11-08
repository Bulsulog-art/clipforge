import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";

// Liman has public sign-up disabled (it hosts other apps too), so DentVideo
// accounts are created here with the service role, already confirmed; the
// browser then signs in with the same email and password.
const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  }
  const { error } = await dvAdmin().auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { product: "dentvideo" },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: exists ? "An account with this email already exists. Sign in instead." : "Could not create the account." },
      { status: exists ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
