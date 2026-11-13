import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { asLocale } from "@/lib/dentvid/locale";
import { LIMITS, clientIp, type Check } from "@/lib/rate-limit";
import { kvStore, rateLimited } from "@/lib/rate-limit-server";
import { fmtAuth, verifyText } from "@/content/dentvideo-auth";
import { checkCode, isEmailVerified, normalizeEmail, pendingCode, verifySecret, VERIFY_RULES } from "@/lib/dentvid/verify-email";
import { markEmailVerified, sendVerificationCode, type SendCodeResult } from "@/lib/dentvid/verify-email-server";
import { recordEvent } from "@/lib/dentvid/events-server";
import { isDentvideoOnly } from "@/lib/dentvid/membership";
import { geoCountry } from "@/lib/dentvid/events";

// POST /api/dentvideo/verify-email — the signed-in owner proves they receive
// mail at their account's address (lib/dentvid/verify-email).
//   { action: "send", onlyIfNone? }   email a new 6-digit code (60 s apart)
//   { action: "confirm", code }       check it; on a match the account is verified
//   { action: "change", email }       correct a mistyped address (unverified accounts only), then send
// Checkout refuses unverified accounts; the plan step shows the code card.

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), onlyIfNone: z.boolean().optional(), locale: z.string().max(8).optional() }),
  z.object({ action: z.literal("confirm"), code: z.string().max(40), attribution: z.record(z.string().max(80)).optional() }),
  z.object({ action: z.literal("change"), email: z.string().trim().toLowerCase().email().max(200), locale: z.string().max(8).optional() }),
]);

const json = (body: Record<string, unknown>, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const locale = asLocale(parsed.success && "locale" in parsed.data ? parsed.data.locale : null) ?? (await dvLocale());
  const v = verifyText(locale);
  const { user } = await dvSession();
  if (!user?.email) return json({ error: v.failed }, 401);
  if (!parsed.success) return json({ error: v.malformed }, 400);
  if (isEmailVerified(user)) return json({ ok: true, verified: true, email: user.email });
  const body = parsed.data;
  const ip = clientIp(req.headers);
  const email = normalizeEmail(user.email);

  const sendChecks = (to: string): Check[] => [
    { key: `rl:verify:send:user:${user.id}`, rule: LIMITS.verifySendUser },
    { key: `rl:verify:send:email:${to}`, rule: LIMITS.verifySendEmail },
    { key: `rl:verify:send:emailday:${to}`, rule: LIMITS.verifySendEmailDay },
    { key: `rl:verify:send:ip:${ip}`, rule: LIMITS.verifySendIp },
    { key: "rl:verify:send:global", rule: LIMITS.verifySendGlobal },
  ];
  const sendAnswer = (to: string, r: SendCodeResult) => {
    if (r.ok) return json({ ok: true, email: to, resendInSec: VERIFY_RULES.resendAfterSec });
    if (r.reason === "pending") return json({ ok: true, email: to, pending: true });
    if (r.reason === "cooldown") return json({ error: fmtAuth(v.resendIn, { s: r.retryAfterSec }), retryAfter: r.retryAfterSec }, 429, { "Retry-After": String(r.retryAfterSec) });
    return json({ error: v.failed }, 503);
  };

  if (body.action === "send") {
    // The plan step asks on every load; a code already waiting is not re-sent and not counted.
    if (body.onlyIfNone) {
      const pending = await pendingCode(kvStore(), { userId: user.id, email }).catch(() => null);
      if (pending) return json({ ok: true, email, pending: true, resendInSec: pending.resendInSec });
    }
    const limited = await rateLimited(sendChecks(email), () => v.failed);
    if (limited) return limited;
    return sendAnswer(email, await sendVerificationCode({ userId: user.id, email, language: locale, onlyIfNone: body.onlyIfNone }));
  }

  if (body.action === "confirm") {
    const limited = await rateLimited(
      [
        { key: `rl:verify:confirm:user:${user.id}`, rule: LIMITS.verifyConfirmUser },
        { key: `rl:verify:confirm:ip:${ip}`, rule: LIMITS.verifyConfirmIp },
      ],
      () => v.locked,
    );
    if (limited) return limited;
    const secret = verifySecret();
    if (!secret) return json({ error: v.failed }, 503);
    let res;
    try {
      res = await checkCode(kvStore(), { userId: user.id, email, code: body.code, secret });
    } catch (e) {
      console.error("[dentvideo verify] code store unavailable", (e as Error).message);
      return json({ error: v.failed }, 503);
    }
    if (!res.ok) {
      const error = res.reason === "wrong" ? fmtAuth(v.wrong, { n: res.attemptsLeft }) : v[res.reason];
      return json({ error, reason: res.reason, ...(res.reason === "wrong" ? { attemptsLeft: res.attemptsLeft } : {}) }, 400);
    }
    if (!(await markEmailVerified(user.id, email, "code"))) return json({ error: v.failed }, 503);
    // Funnel: the address was confirmed (no address, no user id stored).
    void recordEvent("code_verified", { locale, props: body.attribution, geo: geoCountry(req.headers) });
    return json({ ok: true, verified: true, email });
  }

  // change: a typo at sign-up. Only while unverified, so a verified address is never swapped here.
  const limited = await rateLimited([{ key: `rl:verify:change:user:${user.id}`, rule: LIMITS.verifyChangeUser }, ...sendChecks(body.email)], () => v.failed);
  if (limited) return limited;
  if (body.email !== email) {
    // Liman is shared: an account another app made (and that joined DentVideo
    // with its password) logs in to that app with this address too. Changing
    // it here would silently change that app's login, so only a login that is
    // DentVideo's alone may be corrected (lib/dentvid/membership).
    if (!isDentvideoOnly(user)) return json({ error: v.sharedLogin, reason: "shared" }, 409);
    const { error } = await dvAdmin().auth.admin.updateUserById(user.id, { email: body.email, email_confirm: true });
    if (error) {
      const taken = /already|registered|exists|duplicate/i.test(error.message);
      if (!taken) console.error("[dentvideo verify] email change failed", error.message);
      return json({ error: taken ? v.emailTaken : v.failed }, taken ? 409 : 500);
    }
  }
  return sendAnswer(body.email, await sendVerificationCode({ userId: user.id, email: body.email, language: locale, ignoreCooldown: true }));
}
