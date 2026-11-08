import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { dvErrors, dvLocale } from "@/lib/dentvid/locale-server";
import { recordEvent } from "@/lib/dentvid/events-server";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { botSignup } from "@/lib/dentvid/bot-check";

// Liman has public sign-up disabled (it hosts other apps too), so DentVideo
// accounts are created here with the service role, already confirmed; the
// browser then signs in with the same email and password.
//
// Bot brakes (no third-party captcha): per-IP and global rate limits, a
// hidden honeypot field and a minimum time on the form (lib/dentvid/bot-check).
const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  /** Honeypot: a field humans never see. Must be empty. */
  website: z.string().max(200).optional(),
  /** Milliseconds the form was open before submit (start-form.tsx). */
  elapsedMs: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const err = await dvErrors();
  const ip = clientIp(req.headers);
  const limited = await rateLimited(
    [
      { key: `rl:signup:ip:${ip}`, rule: LIMITS.signupIp },
      { key: `rl:signup:ipday:${ip}`, rule: LIMITS.signupIpDay },
      { key: "rl:signup:global", rule: LIMITS.signupGlobal },
    ],
    () => err.tooMany,
  );
  if (limited) return limited;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.badSignup }, { status: 400 });
  const body = parsed.data;
  const bot = botSignup({ honeypot: body.website, elapsedMs: body.elapsedMs });
  if (bot) {
    console.warn("[dentvideo signup] refused as automated", bot, ip);
    return NextResponse.json({ error: err.createFailed }, { status: 400 });
  }
  const { error } = await dvAdmin().auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { product: "dentvideo" },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    if (!exists) console.error("[dentvideo signup] createUser failed", error.message);
    return NextResponse.json({ error: exists ? err.accountExists : err.createFailed }, { status: exists ? 409 : 500 });
  }
  // Funnel: no email, no user id — just that an account was made, in which language.
  void recordEvent("signup_completed", { locale: await dvLocale().catch(() => null) });
  return NextResponse.json({ ok: true });
}
