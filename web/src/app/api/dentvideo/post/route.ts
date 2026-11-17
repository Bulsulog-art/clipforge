import { NextResponse } from "next/server";
import { dvAdmin, BUCKET } from "@/lib/dentvid/supabase";
import { handlePostAction, supabasePostLinkStore } from "@/lib/dentvid/post-link";
import { recordEvent } from "@/lib/dentvid/events-server";
import { unsubscribeSecret } from "@/lib/dentvid/unsubscribe-token";
import { clientIp, LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * The buttons of the email's "approve & share" page (dentvideo.com/post):
 * { t, v, action: "approve" } approves that one ready, pending video;
 * { t, v, action: "posted", on } ticks an approved one as posted.
 * The signed, expiring token is the key (lib/dentvid/post-link.ts).
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = await limitChecks([{ key: `rl:post:ip:${clientIp(req.headers)}`, rule: LIMITS.unsubscribeIp }]);
  if (!limit.ok) return NextResponse.json({ ok: false, error: "too many" }, { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const r = await handlePostAction(body ?? {}, {
      store: supabasePostLinkStore(dvAdmin(), BUCKET),
      secret: unsubscribeSecret(),
      onApproved: (clinicId) => void recordEvent("video_approved", { clinicId }),
    });
    return NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[dentvideo] post action failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
