import { dvAdmin } from "@/lib/dentvid/supabase";
import { approvePage, handleApprove, supabaseApproveStore } from "@/lib/dentvid/approve-link";
import { recordEvent } from "@/lib/dentvid/events-server";
import { lifecycleConfig } from "@/lib/dentvid/lifecycle";
import { unsubscribeSecret } from "@/lib/dentvid/unsubscribe-token";
import { requestLocale } from "@/lib/dentvid/request-locale";
import { clientIp, LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * "Approve all in one tap" from the "your week is ready" email, no login
 * (signed, expiring token). GET shows the videos and one button and changes
 * nothing; POST (the button) approves the week's ready videos. See
 * lib/dentvid/approve-link.ts.
 */
export const dynamic = "force-dynamic";

const HEADERS = { "cache-control": "no-store", "x-robots-tag": "noindex", "content-type": "text/html; charset=utf-8", "referrer-policy": "no-referrer" };

async function respond(req: Request, method: "GET" | "POST") {
  const appUrl = `${lifecycleConfig().base}/app`;
  const language = requestLocale(req.headers.get("cookie"), req.headers.get("accept-language"));
  // Same budget as the unsubscribe page: a person taps this a few times at most.
  const limit = await limitChecks([{ key: `rl:approve:ip:${clientIp(req.headers)}`, rule: LIMITS.unsubscribeIp }]);
  if (!limit.ok) {
    return new Response(approvePage({ language, state: "error", items: [], count: 0, appUrl, action: "" }), {
      status: 429,
      headers: { ...HEADERS, "retry-after": String(limit.retryAfterSec) },
    });
  }
  const r = await handleApprove(
    { method, url: req.url, language },
    {
      store: () => supabaseApproveStore(dvAdmin()),
      secret: unsubscribeSecret(),
      appUrl,
      onApproved: (clinicId, n) => {
        for (let i = 0; i < n; i++) void recordEvent("video_approved", { clinicId });
      },
    },
  );
  return new Response(r.body, { status: r.status, headers: HEADERS });
}

export const GET = (req: Request) => respond(req, "GET");
export const POST = (req: Request) => respond(req, "POST");
