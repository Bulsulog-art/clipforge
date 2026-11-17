import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { mobileBilling } from "@/lib/dentvid/mobile-billing";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * GET /api/dentvideo/mobile/v1/billing — the signed-in clinic's plan, where it is managed, and whether
 * the in-app paywall may open (lib/dentvid/mobile-billing.ts). Bearer session only; the session's own
 * clinic only; never a price.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withMobileSession(req, async ({ db, user }) => {
    const limited = await rateLimited([{ key: `rl:mread:user:${user.id}`, rule: LIMITS.mobileReadUser }], () => "Too many requests");
    if (limited) return limited;
    return NextResponse.json(await mobileBilling(db, user));
  });
}
