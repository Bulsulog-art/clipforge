import { llmsFullTxt } from "@/lib/dentvid/llms";

// llms-full.txt: the entity facts in every language and the full text of every guide, as Markdown.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFullTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
