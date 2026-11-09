import { codeEmail } from "@/lib/dentvid/verify-email-message";
import { resetEmail } from "@/lib/dentvid/reset-email";
import { unsubscribePage, type UnsubState } from "@/lib/dentvid/lifecycle-email";

export const dynamic = "force-dynamic";

/**
 * Dev-only: account emails as HTML, for design review.
 * 404 unless DENTVIDEO_DEV_PREVIEW=1.  /dentvideo/dev/email?lang=ar[&kind=code|reset|unsub-confirm|unsub-done|unsub-invalid|unsub-error]
 * (the unsub-* kinds are the reminder unsubscribe page, not an email)
 */
export async function GET(req: Request) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") return new Response("Not found", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const lang = sp.get("lang") ?? "en";
  const kind = sp.get("kind") ?? "code";
  if (kind.startsWith("unsub-")) {
    const state = kind.slice(6) as UnsubState;
    const html = unsubscribePage({ language: lang, state, homeUrl: "/dentvideo", action: "/api/dentvideo/unsubscribe?t=dev" });
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
  }
  const { html } =
    kind === "reset"
      ? resetEmail({ language: lang, link: `https://dentvideo.com/reset?token_hash=pkce_0123456789abcdef&lang=${encodeURIComponent(lang)}` })
      : codeEmail({ language: lang, code: "482913" });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
}
