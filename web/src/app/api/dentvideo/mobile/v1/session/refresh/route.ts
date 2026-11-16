import { NextResponse } from "next/server";
import { dvAnonClient, NO_STORE } from "@/lib/dentvid/mobile-auth";
import { RefreshBody, mayUseApp, tokensOf } from "@/lib/dentvid/mobile-session";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * POST /api/dentvideo/mobile/v1/session/refresh { refreshToken } — a new token set. Liman rotates
 * the refresh token (the old one stops working), so the app stores the answer at once. 401 means
 * the session is gone (signed out elsewhere, password changed, account deleted): the app signs out.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = await rateLimited([{ key: `rl:mrefresh:ip:${clientIp(req.headers)}`, rule: LIMITS.mobileRefreshIp }], () => "Too many requests");
  if (limited) return limited;
  const parsed = RefreshBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please sign in again.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const { data, error } = await dvAnonClient().auth.refreshSession({ refresh_token: parsed.data.refreshToken });
  if (error || !data.session || !mayUseApp(data.user)) return NextResponse.json({ error: "Please sign in again.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const tokens = tokensOf(data.session, data.user);
  if (!tokens) return NextResponse.json({ error: "Please sign in again.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  return NextResponse.json(tokens, { headers: NO_STORE });
}
