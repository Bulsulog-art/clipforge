import { llmsTxt } from "@/lib/dentvid/llms";

// llms.txt (https://llmstxt.org) for DentVideo: entity facts and an index of
// every page for AI answer engines, built from content/ (lib/dentvid/llms.ts).
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
