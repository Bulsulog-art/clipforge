import { GUIDES, LANDING, LANDING_PATH, LOCALES, guidePath } from "@/content/dentvideo";
import { absoluteUrl } from "@/lib/site";

// llms.txt (https://llmstxt.org) for DentVideo: a plain summary for AI answer
// engines, built only from content/dentvideo.ts so it cannot drift from the pages.
export const dynamic = "force-static";

export function GET() {
  const en = LANDING.en;
  const lines = [
    "# DentVideo",
    "",
    `> ${en.meta.description}`,
    "",
    "## How it works",
    ...en.how.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.text}`),
    "",
    "## Checks before the clinic sees a video",
    ...en.checks.items.map((c) => `- ${c.title}: ${c.text}`),
    "",
    "## Pricing",
    `- ${en.pricing.text}`,
    "",
    "## FAQ",
    ...en.faq.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    "## Pages",
    ...LOCALES.map((l) => `- [${LANDING[l].meta.title}](${absoluteUrl(LANDING_PATH[l])}) (${l})`),
    "",
    "## Guides",
    ...GUIDES.map((g) => `- [${g.h1}](${absoluteUrl(guidePath(g))}) (${g.locale}): ${g.description}`),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
