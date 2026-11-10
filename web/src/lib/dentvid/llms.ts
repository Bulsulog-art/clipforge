import { GUIDES, GUIDE_HUB_LOCALES, LANDING_PATH, LANGUAGE_NAME, LOCALES, guidePath, guidesFor, type Locale } from "@/content/dentvideo";
import { ENTITY, OPERATOR, PUBLISHER_NAME } from "@/content/guides/entity";
import { LEGAL, LEGAL_KINDS, legalPath, operatorAddress } from "@/content/legal";
import { guideMarkdown, reviewedDate, solutionMarkdown } from "@/content/guides/text";
import { SOLUTIONS, solutionPath, solutionsFor } from "@/content/solutions";
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

/**
 * How the guides are written, so an answer engine can judge what it quotes:
 * who writes them, how they are dated and sourced, and what they never contain.
 */
function editorialBlock(): string[] {
  return [
    "## Editorial policy (guides and /videos pages)",
    `- Written and reviewed by the DentVideo editorial team at ${PUBLISHER_NAME}, a two-person software company. No page claims a named clinical or legal reviewer.`,
    "- Every page shows a \"last reviewed\" date; rules guides link the official texts they rely on (laws, regulators, professional bodies) in a Sources list.",
    "- Rules guides are general information, not legal advice. They are hedged (\"usually\", \"check your regulator\") because rules differ by country and change.",
    "- Guides contain no prices, no invented statistics, no patient testimonials and no promised patient results.",
    "- DentVideo publishes no customer reviews or testimonials: it is new, and none are invented.",
    "",
  ];
}

/** Who operates DentVideo and where the legal texts are (English authoritative). */
function legalBlock(): string[] {
  const docs = LEGAL.en.docs;
  return [
    "## Legal",
    `- Operator: ${OPERATOR.legalName} (${OPERATOR.shortName}), a limited liability company under the laws of Montenegro, trading as ${OPERATOR.brand}. Registered office: ${operatorAddress("en")}. CRPS registration no. ${OPERATOR.registrationNumber}; tax ID (PIB) ${OPERATOR.taxId}. Managing director: ${OPERATOR.director}. Contact: ${OPERATOR.productEmail}.`,
    "- DentVideo is sold to businesses and professionals (dental clinics). Payments: Dodo Payments is the merchant of record.",
    ...LEGAL_KINDS.map((k) => `- [${docs[k].title}](${abs(legalPath(k, "en"))}): ${docs[k].description}`),
    "- Translations of every legal page exist in all site languages (linked per language below); the English version prevails.",
    "",
  ];
}

/** One language's pages: landing, About, product/comparison pages, guides hub and every guide. */
function languageIndex(l: Locale): string[] {
  const lines = [
    `## ${LANGUAGE_NAME[l]} (${l})`,
    `- [DentVideo — ${LANGUAGE_NAME[l]}](${abs(LANDING_PATH[l])}): landing page`,
    `- [${ENTITY[l].h1}](${abs(ABOUT_PATH[l])}): ${ENTITY[l].definition}`,
    ...solutionsFor(l).map((p) => `- [${p.h1}](${abs(solutionPath(p))}): ${p.seoDescription}`),
  ];
  if (GUIDE_HUB_LOCALES.includes(l)) {
    lines.push(`- [${GUIDE_UI[l].index.h1}](${abs(GUIDES_INDEX_PATH[l])}): ${GUIDE_UI[l].index.description}`);
    for (const g of guidesFor(l)) {
      const reviewed = reviewedDate(g);
      lines.push(`- [${g.h1}](${abs(guidePath(g))}): ${g.description}${reviewed ? ` (last reviewed ${reviewed})` : ""}`);
    }
  }
  lines.push(`- Legal: ${LEGAL_KINDS.map((k) => `[${LEGAL[l].docs[k].title}](${abs(legalPath(k, l))})`).join(", ")}`);
  lines.push("");
  return lines;
}

export function llmsTxt(): string {
  const lines = [
    ...factsBlock(),
    ...editorialBlock(),
    ...legalBlock(),
    "## What DentVideo makes, and how it compares",
    ...SOLUTIONS.map((p) => `- [${p.h1}](${abs(solutionPath(p))}) (${p.locale}): ${p.seoDescription}`),
    "",
    "# Pages by language",
    "",
    ...LOCALES.flatMap(languageIndex),
    "## Optional",
    `- [Full text of every guide and product page](${abs("/dentvideo/llms-full.txt")})`,
    "",
  ];
  return lines.join("\n");
}

export function llmsFullTxt(): string {
  const lines = [
    ...factsBlock(),
    ...editorialBlock(),
    ...legalBlock(),
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
