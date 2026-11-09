import { GUIDES, GUIDE_HUB_LOCALES, LANDING_PATH, LANGUAGE_NAME, LOCALES, guidePath, guidesFor } from "@/content/dentvideo";
import { ENTITY, PUBLISHER_NAME } from "@/content/guides/entity";
import { guideMarkdown, solutionMarkdown } from "@/content/guides/text";
import { SOLUTIONS, solutionPath } from "@/content/solutions";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { dentvideoPublicUrl } from "./host";

/**
 * llms.txt (https://llmstxt.org) and llms-full.txt for answer engines. Built
 * only from content/ so they cannot drift from the pages. Always dentvideo.com
 * URLs: these files are only served on that host.
 */
const abs = (path: string) => dentvideoPublicUrl(path, "https://dentvideo.com", "");

function factsBlock(): string[] {
  const en = ENTITY.en;
  return [
    "# DentVideo",
    "",
    `> ${en.definition}`,
    "",
    "## Key facts",
    ...en.facts.map((f) => `- ${f.label}: ${f.value}`),
    "",
    "## How a week works",
    ...en.sections.flatMap((s) => [`### ${s.heading}`, ...s.paragraphs, ""]),
    "## FAQ",
    ...en.faq.flatMap((f) => [`### ${f.q}`, f.a, ""]),
  ];
}

export function llmsTxt(): string {
  const lines = [
    ...factsBlock(),
    "## Pages",
    ...LOCALES.map((l) => `- [DentVideo — ${LANGUAGE_NAME[l]}](${abs(LANDING_PATH[l])}) (${l})`),
    ...LOCALES.map((l) => `- [${ENTITY[l].h1}](${abs(ABOUT_PATH[l])}) (${l}): ${ENTITY[l].definition}`),
    "",
    "## What DentVideo makes, and how it compares",
    ...SOLUTIONS.map((p) => `- [${p.h1}](${abs(solutionPath(p))}) (${p.locale}): ${p.seoDescription}`),
    "",
    ...GUIDE_HUB_LOCALES.flatMap((l) => [
      `## Guides (${LANGUAGE_NAME[l]})`,
      `- [${GUIDE_UI[l].index.h1}](${abs(GUIDES_INDEX_PATH[l])}): ${GUIDE_UI[l].index.description}`,
      ...guidesFor(l).map((g) => `- [${g.h1}](${abs(guidePath(g))}): ${g.description}`),
      "",
    ]),
    "## Optional",
    `- [Full text of every guide](${abs("/dentvideo/llms-full.txt")})`,
    "",
  ];
  return lines.join("\n");
}

export function llmsFullTxt(): string {
  const lines = [
    ...factsBlock(),
    `Publisher: ${PUBLISHER_NAME}. Guides are general information, not legal advice; rules differ by country and change.`,
    "",
    ...LOCALES.flatMap((l) => [`# ${ENTITY[l].h1}`, "", ENTITY[l].definition, "", ...ENTITY[l].facts.map((f) => `- ${f.label}: ${f.value}`), ""]),
    "# What DentVideo makes, and how it compares",
    "",
    ...SOLUTIONS.map((p) => solutionMarkdown(p, abs)),
    "# Guides",
    "",
    ...GUIDES.map((g) => guideMarkdown(g, abs)),
  ];
  return lines.join("\n");
}
