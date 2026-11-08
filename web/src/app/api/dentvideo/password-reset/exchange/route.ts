import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { exchangeRecovery } from "@/lib/dentvid/verify-email-server";

// POST /api/dentvideo/password-reset/exchange — the /reset page hands over
// the token from the reset email; we exchange it for a session here rather
// than in the browser, because a successful exchange is proof the person
// reads this address's mail: the account is marked verified
// (lib/dentvid/verify-email) before the session goes back to the page.

const Body = z.object({ token_hash: z.string().min(8).max(200) });

const MIN = 60;

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limited = await rateLimited([{ key: `rl:reset-exchange:ip:${ip}`, rule: { limit: 20, windowSec: 60 * MIN } }], () => "Too many requests");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const res = await exchangeRecovery(parsed.data.token_hash);
    if (!res) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return NextResponse.json(res, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[dentvideo reset] exchange failed", (e as Error).message);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
