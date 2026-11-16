import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { loadOwnClinic, mobileItems } from "@/lib/dentvid/mobile";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * GET /api/dentvideo/mobile/v1/items — the clinic's library as the web shows it (same rows, same
 * reason codes, one-hour signed video and poster URLs), with each video's suggested posting slot
 * and filming card.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withMobileSession(req, async ({ db, user }) => {
    const limited = await rateLimited([{ key: `rl:mread:user:${user.id}`, rule: LIMITS.mobileReadUser }], () => "Too many requests");
    if (limited) return limited;
    const clinic = await loadOwnClinic(db, user.id);
    return NextResponse.json(await mobileItems(db, user.id, clinic));
  });
}
