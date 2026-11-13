import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { dvAdmin, dvServer } from "@/lib/dentvid/supabase";
import { dvErrors, dvLocale } from "@/lib/dentvid/locale-server";
import { appText } from "@/content/dentvideo-app";
import { authText } from "@/content/dentvideo-auth";
import { passwordTooLong } from "@/lib/dentvid/password";
import { recordEvent } from "@/lib/dentvid/events-server";
import { geoCountry } from "@/lib/dentvid/events";
import { LIMITS, clientIp, networkOf } from "@/lib/rate-limit";
import { limitChecks, rateLimited } from "@/lib/rate-limit-server";
import { botSignup } from "@/lib/dentvid/bot-check";
import { asLocale } from "@/lib/dentvid/locale";
import { sendVerificationCode } from "@/lib/dentvid/verify-email-server";
import { DV_PRODUCT, isDentvideoUser } from "@/lib/dentvid/membership";
import { joinDentvideo } from "@/lib/dentvid/join";
import { verifyTurnstile } from "@/lib/dentvid/turnstile";
import { dvUrl } from "@/lib/dentvid/host";
import { sendEmail } from "@/lib/dentvid/email";
import { resetEmail } from "@/lib/dentvid/reset-email";
import { MONITOR_HEADER, isMonitorEmail, monitorAuthorised } from "@/lib/dentvid/monitor-account";
import { raiseOwnerAlert } from "@/lib/dentvid/ops-server";
import { alerts, cleanError } from "@/lib/dentvid/ops-alert";

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
// An address that already has an account gets { ok: true, existing: true }:
// the form says so plainly (a clinic that forgot it had signed up must not be
// left at a dead end) and offers sign-in / reset.
// If it is a DentVideo account, its mailbox gets a password-reset link
// (counted against the reset limits): the owner of an address someone else
// signed up with first reclaims it by resetting the password
// (lib/dentvid/verify-email-server exchangeRecovery). The browser then tries
// to sign in; with a different password that fails and the form offers
// sign-in / reset without saying whether the account exists.
//
// The synthetic monitor and the smoke test (lib/dentvid/monitor-account)
// sign up as e2e-monitor+…@ addresses: those are never emailed nor counted
// in the funnel, and with the monitor token they skip the per-client brakes
// and get the new user id back (so the monitor can delete the account).
//
// A step that fails for a real clinic (account not created, server sign-in
// failed, no verification code) is logged and the owner is alerted (once a
// day per step; lib/dentvid/ops-alert signupBroken).
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
  // The form names its language: errors answer in it (the cookie or the
  // browser's language only when the body names none).
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const asked = asLocale(typeof raw?.locale === "string" ? raw.locale : null);
  const err = asked ? appText(asked).errors : await dvErrors();
  const ip = clientIp(req.headers);
  const clientLimits = [
    { key: `rl:signup:ip:${ip}`, rule: LIMITS.signupIp },
    { key: `rl:signup:ipday:${ip}`, rule: LIMITS.signupIpDay },
    { key: `rl:signup:net:${networkOf(ip)}`, rule: LIMITS.signupNetDay },
  ];
  const withToken = monitorAuthorised(req.headers.get(MONITOR_HEADER));
  // Per client first: these are the real brake.
  if (!withToken) {
    const limited = await rateLimited(clientLimits, () => err.tooMany);
    if (limited) return limited;
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: err.badSignup }, { status: 400 });
  const body = parsed.data;
  // Liman (GoTrue, bcrypt) refuses passwords over 72 bytes: say so, instead of
  // "could not create the account" and an alert to the owner.
  if (passwordTooLong(body.password)) {
    return NextResponse.json({ error: authText(asked ?? (await dvLocale().catch(() => "en"))).passwordTooLong, code: "password_too_long" }, { status: 400 });
  }
  const testAccount = isMonitorEmail(body.email);
  // The token only ever helps a monitor address.
  const monitor = withToken && testAccount;
  if (withToken && !monitor) {
    const limited = await rateLimited(clientLimits, () => err.tooMany);
    if (limited) return limited;
  }
  if (!monitor) {
    const refused = await brakes(body, ip, err);
    if (refused) return refused;
  }

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
      if (!testAccount) ownerHears("create_account", error.message);
      return NextResponse.json({ error: err.createFailed }, { status: 500 });
    }
    if (!testAccount) {
      // The address already has a login — maybe made by another app on Liman
      // with the same address. The right password proves the account is
      // theirs: sign in here and add DentVideo to it. Otherwise mail the
      // address a reset link, which proves it from the mailbox instead.
      if ((await signInHere(body.email, body.password)).ok && (await joinSignedIn())) {
        return NextResponse.json({ ok: true, existing: true, signedIn: true });
      }
      await mailExistingOwner(body.email, locale);
    }
    return NextResponse.json({ ok: true, existing: true });
  }
  if (!testAccount) {
    // Funnel: no email, no user id — just that an account was made, in which language.
    void recordEvent("signup_completed", { locale, props: body.attribution, geo: geoCountry(req.headers) });
    // The code email. Not fatal if it fails: the plan step asks for one again — but the owner hears about it.
    if (created?.user) {
      const code = await sendVerificationCode({ userId: created.user.id, email: body.email, language: locale }).catch((e: Error) => ({ ok: false as const, reason: e.message }));
      if (!code.ok && code.reason !== "cooldown" && code.reason !== "pending") {
        console.error("[dentvideo signup] verification code not sent", code.reason);
        ownerHears("verification_code", code.reason);
      }
    }
  }
  // Open the session here and set the dv-auth cookie on this response, so the
  // new clinic is signed in without a second request from the browser (that
  // second call failed on some phones — private tabs, flaky mobile networks,
  // password managers rewriting the field). The browser falls back to signing
  // in itself only if this did not work.
  const signIn = await signInHere(body.email, body.password);
  if (!signIn.ok && !testAccount) ownerHears("server_sign_in", signIn.error);
  return NextResponse.json({ ok: true, signedIn: signIn.ok, ...(monitor && created?.user ? { userId: created.user.id } : {}) });
}

/** Tell the owner a sign-up step failed for a real clinic (once a day per step). Never throws, never waits. */
function ownerHears(step: "create_account" | "server_sign_in" | "verification_code", error: string) {
  void raiseOwnerAlert(alerts.signupBroken({ step, error: cleanError(error) })).catch(() => {});
}

/** Bot brakes and the per-address / global limits. A response when refused. */
async function brakes(body: z.infer<typeof Body>, ip: string, err: Awaited<ReturnType<typeof dvErrors>>): Promise<NextResponse | null> {
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
  return rateLimited(
    [
      { key: `rl:signup:email:${body.email}`, rule: LIMITS.signupEmail },
      { key: "rl:signup:global", rule: LIMITS.signupGlobal },
    ],
    () => err.tooMany,
  );
}

/** The account just signed in here becomes a DentVideo account (it proved its password). */
async function joinSignedIn(): Promise<boolean> {
  try {
    const { data } = await dvServer(await cookies()).auth.getUser();
    if (!data?.user) return false;
    return isDentvideoUser(data.user) || (await joinDentvideo(data.user.id));
  } catch (e) {
    console.error("[dentvideo signup] join failed", (e as Error).message);
    return false;
  }
}

/** Signs the new account in on the server; the session cookie rides on this response. */
async function signInHere(email: string, password: string): Promise<{ ok: boolean; error: string }> {
  try {
    const { error } = await dvServer(await cookies()).auth.signInWithPassword({ email, password });
    if (error) console.error("[dentvideo signup] server sign-in failed", error.message);
    return { ok: !error, error: error?.message ?? "" };
  } catch (e) {
    console.error("[dentvideo signup] server sign-in failed", (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Someone signed up with an address that already has a login (DentVideo's or
 * another app's on Liman) and the password did not match. Mail it a
 * password-reset link (within the reset limits): the real owner gets in from
 * the mailbox — opening the link also adds DentVideo to another app's
 * account — or takes the address back from whoever registered it first.
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
    if (error || !hashed || !data?.user) return;
    const link = dvUrl(`/dentvideo/reset?token_hash=${encodeURIComponent(hashed)}&lang=${encodeURIComponent(language)}`);
    if (!(await sendEmail(email, resetEmail({ language, link })))) console.error("[dentvideo signup] reset email for an existing account not sent");
  } catch (e) {
    console.error("[dentvideo signup] existing-account mail failed", (e as Error).message);
  }
}
