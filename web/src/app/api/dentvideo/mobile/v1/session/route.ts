import { NextResponse } from "next/server";
import { dvAnonClient, NO_STORE } from "@/lib/dentvid/mobile-auth";
import { SignInBody, mayUseApp, tokensOf } from "@/lib/dentvid/mobile-session";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * POST /api/dentvideo/mobile/v1/session { email, password } — sign in from the iPhone app.
 * Answers the token set (the app keeps it in the Keychain); no cookie is set. Wrong password and
 * unknown address get the same answer. Accounts made by another app on the shared Liman are
 * refused (403 not_dentvideo) and their fresh session is revoked at once.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const err = await dvErrors();
  const raw = await req.json().catch(() => null);
  const parsed = SignInBody.safeParse(raw);
  const ip = clientIp(req.headers);
  const checks = [{ key: `rl:msignin:ip:${ip}`, rule: LIMITS.mobileSignInIp }];
  if (parsed.success) {
    checks.push({ key: `rl:msignin:email:${parsed.data.email}`, rule: LIMITS.mobileSignInEmail });
    checks.push({ key: `rl:msignin:emailday:${parsed.data.email}`, rule: LIMITS.mobileSignInEmailDay });
  }
  const limited = await rateLimited(checks, () => err.tooMany);
  if (limited) return limited;
  if (!parsed.success) return NextResponse.json({ error: err.signIn, code: "invalid_credentials" }, { status: 400, headers: NO_STORE });

  const { data, error } = await dvAnonClient().auth.signInWithPassword(parsed.data);
  if (error || !data.session) return NextResponse.json({ error: err.signIn, code: "invalid_credentials" }, { status: 401, headers: NO_STORE });
  if (!mayUseApp(data.user)) {
    await dvAdmin().auth.admin.signOut(data.session.access_token, "local").catch(() => {});
    return NextResponse.json({ error: err.signIn, code: "not_dentvideo" }, { status: 403, headers: NO_STORE });
  }
  const tokens = tokensOf(data.session, data.user);
  if (!tokens) return NextResponse.json({ error: err.signIn, code: "invalid_credentials" }, { status: 401, headers: NO_STORE });
  return NextResponse.json(tokens, { headers: NO_STORE });
}
