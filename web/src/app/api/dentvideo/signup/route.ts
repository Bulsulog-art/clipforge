import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { dvErrors, dvLocale } from "@/lib/dentvid/locale-server";
import { recordEvent } from "@/lib/dentvid/events-server";
import { geoCountry } from "@/lib/dentvid/events";
import { LIMITS, clientIp, networkOf } from "@/lib/rate-limit";
import { limitChecks, rateLimited } from "@/lib/rate-limit-server";
import { botSignup } from "@/lib/dentvid/bot-check";
import { asLocale } from "@/lib/dentvid/locale";
import { sendVerificationCode } from "@/lib/dentvid/verify-email-server";
import { DV_PRODUCT, isDentvideoUser } from "@/lib/dentvid/membership";
import { verifyTurnstile } from "@/lib/dentvid/turnstile";
import { dvUrl } from "@/lib/dentvid/host";
import { sendEmail } from "@/lib/dentvid/email";
import { resetEmail } from "@/lib/dentvid/reset-email";

// Liman has public sign-up disabled (it hosts other apps too), so DentVideo
// accounts are created here with the service role, already "confirmed" in
// Supabase's sense; the browser then signs in with the same email and
// password. Ownership of the address is proven separately: a 6-digit code is
// emailed right away (lib/dentvid/verify-email) and checkout waits for it.
// The DentVideo marker goes into app_metadata (server-only; see
// lib/dentvid/membership) — never user_metadata, which the user can edit.
//
// Bot brakes: per-IP, per-network, per-address and a high global rate limit,
// a hidden honeypot field and a minimum time on the form
// (lib/dentvid/bot-check), and Cloudflare Turnstile when configured
// (lib/dentvid/turnstile; off unless TURNSTILE_SECRET_KEY and
// NEXT_PUBLIC_TURNSTILE_SITE_KEY are set).
//
// An address that already has an account gets the same answer as a new one
// ({ ok: true }), so the form does not tell strangers who has an account.
// If it is a DentVideo account, its mailbox gets a password-reset link
// (counted against the reset limits): the owner of an address someone else
// signed up with first reclaims it by resetting the password
// (lib/dentvid/verify-email-server exchangeRecovery). The browser then tries
// to sign in; with a different password that fails and the form offers
// sign-in / reset without saying whether the account exists.
const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  /** Honeypot: a field humans never see. Must be empty. */
  website: z.string().max(200).optional(),
  /** Milliseconds the form was open before submit (start-form.tsx). */
  elapsedMs: z.number().int().nonnegative().optional(),
  /** Interface language, for the verification email. */
  locale: z.string().max(8).optional(),
  /** Cloudflare Turnstile token, when the widget is on. */
  turnstile: z.string().max(2048).optional(),
  /** The tab's first-touch source (lib/dentvid/attribution); re-sanitised by the event allow-list. */
  attribution: z.record(z.string().max(80)).optional(),
});

export async function POST(req: Request) {
  const err = await dvErrors();
  const ip = clientIp(req.headers);
  // Per client first: these are the real brake.
  const limited = await rateLimited(
    [
      { key: `rl:signup:ip:${ip}`, rule: LIMITS.signupIp },
      { key: `rl:signup:ipday:${ip}`, rule: LIMITS.signupIpDay },
      { key: `rl:signup:net:${networkOf(ip)}`, rule: LIMITS.signupNetDay },
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
  const human = await verifyTurnstile(body.turnstile, ip);
  if (!human.ok) {
    if (human.reason !== "missing") console.warn("[dentvideo signup] turnstile", human.reason);
    return NextResponse.json({ error: err.createFailed, code: "turnstile" }, { status: 400 });
  }

  // Per address and the global backstop: counted only for requests that got this far.
  const later = await rateLimited(
    [
      { key: `rl:signup:email:${body.email}`, rule: LIMITS.signupEmail },
      { key: "rl:signup:global", rule: LIMITS.signupGlobal },
    ],
    () => err.tooMany,
  );
  if (later) return later;

  const locale = asLocale(body.locale) ?? (await dvLocale().catch(() => "en" as const));
  const { data: created, error } = await dvAdmin().auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    app_metadata: { product: DV_PRODUCT },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    if (!exists) {
      console.error("[dentvideo signup] createUser failed", error.message);
      return NextResponse.json({ error: err.createFailed }, { status: 500 });
    }
    await mailExistingOwner(body.email, locale);
    return NextResponse.json({ ok: true });
  }
  // Funnel: no email, no user id — just that an account was made, in which language.
  void recordEvent("signup_completed", { locale, props: body.attribution, geo: geoCountry(req.headers) });
  // The code email. Not fatal if it fails: the plan step asks for one again.
  if (created?.user) await sendVerificationCode({ userId: created.user.id, email: body.email, language: locale });
  return NextResponse.json({ ok: true });
}

/**
 * Someone signed up with an address that already has a login. If it is a
 * DentVideo account, mail it a password-reset link (within the reset
 * limits): the real owner can get in, or take the address back from whoever
 * registered it first. Other apps' accounts on Liman get nothing.
 */
async function mailExistingOwner(email: string, language: string): Promise<void> {
  try {
    const ok = await limitChecks([
      { key: `rl:reset:email:${email}`, rule: LIMITS.resetEmail },
      { key: `rl:reset:emailday:${email}`, rule: LIMITS.resetEmailDay },
    ]);
    if (!ok.ok) return;
    const { data, error } = await dvAdmin().auth.admin.generateLink({ type: "recovery", email });
    const hashed = data?.properties?.hashed_token;
    if (error || !hashed || !isDentvideoUser(data?.user)) return;
    const link = dvUrl(`/dentvideo/reset?token_hash=${encodeURIComponent(hashed)}&lang=${encodeURIComponent(language)}`);
    if (!(await sendEmail(email, resetEmail({ language, link })))) console.error("[dentvideo signup] reset email for an existing account not sent");
  } catch (e) {
    console.error("[dentvideo signup] existing-account mail failed", (e as Error).message);
  }
}
