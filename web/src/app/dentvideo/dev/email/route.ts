import { codeEmail } from "@/lib/dentvid/verify-email-message";

export const dynamic = "force-dynamic";

/**
 * Dev-only: the verification-code email as HTML, for design review.
 * 404 unless DENTVIDEO_DEV_PREVIEW=1.  /dentvideo/dev/email?lang=ar
 */
export async function GET(req: Request) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") return new Response("Not found", { status: 404 });
  const lang = new URL(req.url).searchParams.get("lang") ?? "en";
  const { html } = codeEmail({ language: lang, code: "482913" });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
}
