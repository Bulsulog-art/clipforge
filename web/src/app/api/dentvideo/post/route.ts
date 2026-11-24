import { NextResponse } from "next/server";
import { dvAdmin, BUCKET } from "@/lib/dentvid/supabase";
import { handlePostAction, shareOnceKey, supabasePostLinkStore, SHARE_ONCE_TTL_S, type ShareCounter } from "@/lib/dentvid/post-link";
import { recordEvent } from "@/lib/dentvid/events-server";
import { internalRequestReason } from "@/lib/dentvid/internal-request";
import { MemoryOpsStore, type OpsStore } from "@/lib/dentvid/ops-alert";
import { webOpsStore } from "@/lib/dentvid/ops-server";
import { unsubscribeSecret } from "@/lib/dentvid/unsubscribe-token";
import { clientIp, LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * The buttons of the email's "approve & share" page (dentvideo.com/post):
 * { t, v, action: "approve" } approves that one ready, pending video;
 * { t, v, action: "posted", on } ticks an approved one as posted;
 * { t, v, action: "shared", method } counts the share or download the page
 * just made, as the clinic's video_shared event, once per video (one of
 * ours, by request or by `internal: true`, is kept apart: post-link.ts).
 * The signed, expiring token is the key (lib/dentvid/post-link.ts).
 */
export const dynamic = "force-dynamic";

// Redis missing or down: a per-process memory keeps the once-per-video rule (at worst one extra count per process).
const local = new MemoryOpsStore();
const LOCAL_MAX = 5000;

async function once(): Promise<Pick<OpsStore, "setNx" | "del">> {
  const store = await webOpsStore().catch(() => null);
  return {
    async setNx(key, ttl) {
      try {
        if (store) return await store.setNx(key, ttl);
      } catch {
        // fall back
      }
      if (local.kv.size >= LOCAL_MAX) local.kv.clear();
      return local.setNx(key, ttl);
    },
    async del(key) {
      await local.del(key);
      try {
        if (store) await store.del(key);
      } catch {
        // best effort
      }
    },
  };
}

function shareCounter(): ShareCounter {
  return {
    claim: async (itemId) => (await once()).setNx(shareOnceKey(itemId), SHARE_ONCE_TTL_S),
    release: async (itemId) => (await once()).del(shareOnceKey(itemId)),
    record: ({ clinicId, method, locale, device, internal }) => recordEvent("video_shared", { clinicId, locale, props: { method, ...(device ? { device } : {}) }, internal }),
  };
}

export async function POST(req: Request) {
  const limit = await limitChecks([{ key: `rl:post:ip:${clientIp(req.headers)}`, rule: LIMITS.unsubscribeIp }]);
  if (!limit.ok) return NextResponse.json({ ok: false, error: "too many" }, { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const r = await handlePostAction(body ?? {}, {
      store: supabasePostLinkStore(dvAdmin(), BUCKET),
      secret: unsubscribeSecret(),
      onApproved: (clinicId) => void recordEvent("video_approved", { clinicId }),
      shares: shareCounter(),
      // A bot or our scripts' marker; the page adds `internal: true` for a browser flagged as ours.
      internal: internalRequestReason(req.headers) !== null,
    });
    return NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[dentvideo] post action failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
