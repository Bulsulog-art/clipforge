import { asLocale } from "./locale";
import { MissingSchemaError, type LifecycleStore } from "./lifecycle";
import { unsubscribePage } from "./lifecycle-email";
import { verifyUnsubscribeToken } from "./unsubscribe-token";

/**
 * Unsubscribe, RFC 8058 style.
 *
 *   GET   the link in the email: verifies the token and shows a confirmation
 *         page with one "Unsubscribe" button. It changes nothing, so mail
 *         security scanners that open every link cannot opt anyone out.
 *   POST  the button, or a mail client's one-click request
 *         (List-Unsubscribe-Post: List-Unsubscribe=One-Click): opts out at
 *         once. Browsers get the "you're unsubscribed" page, mail clients a
 *         plain 200.
 *
 * Opting out stops reminders only; service mail about paid videos still goes.
 */
export type UnsubRequest = { method: "GET" | "POST"; url: string; accept?: string | null };
export type UnsubResponse = { status: number; contentType: string; body: string };
export type UnsubDeps = { store: () => LifecycleStore; secret: string | null; homeUrl: string; now?: () => Date };

const html = (status: number, body: string): UnsubResponse => ({ status, contentType: "text/html; charset=utf-8", body });

export async function handleUnsubscribe(req: UnsubRequest, deps: UnsubDeps): Promise<UnsubResponse> {
  const url = new URL(req.url);
  const clinicId = verifyUnsubscribeToken(url.searchParams.get("t"), deps.secret);
  const wantsHtml = req.method === "GET" || /text\/html/i.test(req.accept ?? "");
  const page = (status: number, state: "confirm" | "done" | "invalid" | "error", language = "en") =>
    html(status, unsubscribePage({ language, state, homeUrl: deps.homeUrl, action: `${url.pathname}${url.search}` }));

  if (!clinicId) return wantsHtml ? page(400, "invalid") : { status: 400, contentType: "text/plain", body: "invalid" };

  let language = "en";
  try {
    const store = deps.store();
    const clinic = await store.clinic(clinicId);
    language = asLocale(clinic?.profile?.language) ?? "en";
    if (req.method === "GET") return page(200, "confirm", language);
    // A deleted clinic gets no more email anyway: confirm rather than alarm.
    if (clinic) await store.optOut(clinicId, deps.now?.() ?? new Date());
  } catch (e) {
    console.error("[dentvideo] unsubscribe failed", e instanceof MissingSchemaError ? "migration 0005 missing" : (e as Error).message);
    // The confirmation page needs nothing from the database; only the opt-out does.
    if (req.method === "GET") return page(200, "confirm", language);
    return wantsHtml ? page(503, "error", language) : { status: 503, contentType: "text/plain", body: "error" };
  }
  return wantsHtml ? page(200, "done", language) : { status: 200, contentType: "text/plain", body: "unsubscribed" };
}
