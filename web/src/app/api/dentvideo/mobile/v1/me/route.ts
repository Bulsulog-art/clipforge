import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { mobileMe } from "@/lib/dentvid/mobile";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/** GET /api/dentvideo/mobile/v1/me — the account, its clinic and its plan (state and name only, never a price). */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withMobileSession(req, async ({ db, user }) => {
    const limited = await rateLimited([{ key: `rl:mread:user:${user.id}`, rule: LIMITS.mobileReadUser }], () => "Too many requests");
    if (limited) return limited;
    return NextResponse.json(await mobileMe(db, user));
  });
}
