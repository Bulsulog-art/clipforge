import { dvAdmin } from "@/lib/dentvid/supabase";
import { lifecycleConfig, MissingSchemaError, supabaseLifecycleStore } from "@/lib/dentvid/lifecycle";
import { unsubscribePage } from "@/lib/dentvid/lifecycle-email";
import { unsubscribeSecret, verifyUnsubscribeToken } from "@/lib/dentvid/unsubscribe-token";
import { asLocale } from "@/lib/dentvid/locale";
import { clientIp, LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

/**
 * Unsubscribe from DentVideo reminder emails, no login: the link carries a
 * signed token (lib/dentvid/unsubscribe-token.ts).
 *
 *   GET   the link in the email: opts out and shows a short confirmation
 *         page in the clinic's language.
 *   POST  RFC 8058 one-click ("List-Unsubscribe-Post"), sent by Gmail,
 *         Apple Mail and others on the reader's behalf: opts out, plain 200.
 *
 * Opting out stops reminders only; service mail about paid videos still goes.
 */
export const dynamic = "force-dynamic";

type Outcome = { state: "done" | "invalid" | "error"; language: string };

async function optOut(req: Request): Promise<Outcome> {
  const limit = await limitChecks([{ key: `rl:unsub:ip:${clientIp(req.headers)}`, rule: LIMITS.unsubscribeIp }]);
  if (!limit.ok) return { state: "error", language: "en" };
  const token = new URL(req.url).searchParams.get("t");
  const clinicId = verifyUnsubscribeToken(token, unsubscribeSecret());
  if (!clinicId) return { state: "invalid", language: "en" };
  try {
    const store = supabaseLifecycleStore(dvAdmin());
    const clinic = await store.clinic(clinicId);
    const language = asLocale(clinic?.profile?.language) ?? "en";
    // A deleted clinic gets no more email anyway: confirm rather than alarm.
    if (!clinic) return { state: "done", language };
    await store.optOut(clinicId, new Date());
    return { state: "done", language };
  } catch (e) {
    console.error("[dentvideo] unsubscribe failed", e instanceof MissingSchemaError ? "migration 0005 missing" : (e as Error).message);
    return { state: "error", language: "en" };
  }
}

const STATUS = { done: 200, invalid: 400, error: 503 } as const;

export async function GET(req: Request) {
  const r = await optOut(req);
  const html = unsubscribePage({ language: r.language, state: r.state, homeUrl: lifecycleConfig().base });
  return new Response(html, {
    status: STATUS[r.state],
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

export async function POST(req: Request) {
  const r = await optOut(req);
  return new Response(r.state === "done" ? "unsubscribed" : r.state, { status: STATUS[r.state], headers: { "cache-control": "no-store" } });
}
