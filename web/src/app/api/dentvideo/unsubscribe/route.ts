import { dvAdmin } from "@/lib/dentvid/supabase";
import { lifecycleConfig, supabaseLifecycleStore } from "@/lib/dentvid/lifecycle";
import { unsubscribePage } from "@/lib/dentvid/lifecycle-email";
import { handleUnsubscribe } from "@/lib/dentvid/unsubscribe";
import { unsubscribeSecret } from "@/lib/dentvid/unsubscribe-token";
import { clientIp, LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * Unsubscribe from DentVideo reminder emails, no login (signed token).
 * GET shows a confirmation page and changes nothing; POST (the page's button,
 * or a mail client's RFC 8058 one-click request) opts out. See
 * lib/dentvid/unsubscribe.ts.
 */
export const dynamic = "force-dynamic";

const HEADERS = { "cache-control": "no-store", "x-robots-tag": "noindex" };

async function respond(req: Request, method: "GET" | "POST") {
  const home = lifecycleConfig().base;
  const limit = await limitChecks([{ key: `rl:unsub:ip:${clientIp(req.headers)}`, rule: LIMITS.unsubscribeIp }]);
  if (!limit.ok) {
    return new Response(unsubscribePage({ language: "en", state: "error", homeUrl: home }), {
      status: 429,
      headers: { ...HEADERS, "content-type": "text/html; charset=utf-8", "retry-after": String(limit.retryAfterSec) },
    });
  }
  const r = await handleUnsubscribe(
    { method, url: req.url, accept: req.headers.get("accept") },
    { store: () => supabaseLifecycleStore(dvAdmin()), secret: unsubscribeSecret(), homeUrl: home },
  );
  return new Response(r.body, { status: r.status, headers: { ...HEADERS, "content-type": r.contentType } });
}

export const GET = (req: Request) => respond(req, "GET");
export const POST = (req: Request) => respond(req, "POST");
