import { SAMPLE_KINDS, sampleEmailFor, type SampleKind } from "@/lib/dentvid/email-samples";
import { unsubscribePage, type UnsubState } from "@/lib/dentvid/lifecycle-email";
import { approvePage, type ApproveState } from "@/lib/dentvid/approve-link";

export const dynamic = "force-dynamic";

/**
 * Dev-only: every DentVideo email as HTML, for design review.
 * 404 unless DENTVIDEO_DEV_PREVIEW=1.
 *   /dentvideo/dev/email?lang=ar&kind=<one of SAMPLE_KINDS>[&format=text][&brand=0]
 *   kind=unsub-confirm|unsub-done|unsub-invalid|unsub-error   the unsubscribe page
 *   kind=approve-confirm|approve-done|approve-nothing|approve-invalid|approve-error   the one-tap approve page
 */
export async function GET(req: Request) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") return new Response("Not found", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const lang = sp.get("lang") ?? "en";
  const kind = sp.get("kind") ?? "code";
  const html = (body: string) => new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
  if (kind.startsWith("unsub-")) {
    return html(unsubscribePage({ language: lang, state: kind.slice(6) as UnsubState, homeUrl: "/dentvideo", action: "/api/dentvideo/unsubscribe?t=dev" }));
  }
  if (kind.startsWith("approve-")) {
    const items = [
      { id: "1", title: "Proper brushing technique" },
      { id: "2", title: "Whitening myths" },
    ];
    return html(approvePage({ language: lang, state: kind.slice(8) as ApproveState, items, count: items.length, appUrl: "/dentvideo/app", action: "/api/dentvideo/approve?t=dev" }));
  }
  if (!(SAMPLE_KINDS as readonly string[]).includes(kind)) return new Response(`kind: ${SAMPLE_KINDS.join(", ")}`, { status: 400 });
  const m = sampleEmailFor(kind as SampleKind, lang, { brand: sp.get("brand") !== "0" });
  if (sp.get("format") === "text") return new Response(`Subject: ${m.subject}\n\n${m.text}`, { headers: { "content-type": "text/plain; charset=utf-8" } });
  return html(m.html);
}
