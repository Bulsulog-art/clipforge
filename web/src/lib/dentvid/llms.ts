import { GUIDES, GUIDE_HUB_LOCALES, LANDING_PATH, LANGUAGE_NAME, LOCALES, guidePath, guidesFor, type Locale } from "@/content/dentvideo";
import { ENTITY, OPERATOR, PUBLISHER_NAME } from "@/content/guides/entity";
import { LEGAL, LEGAL_KINDS, legalPath, operatorAddress } from "@/content/legal";
import { guideMarkdown, reviewedDate, solutionMarkdown } from "@/content/guides/text";
import { SOLUTIONS, solutionPath, solutionsFor } from "@/content/solutions";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { CHECKER, CHECKER_PATH } from "@/content/dentvideo-checker";
import { dentvideoPublicUrl } from "./host";
import { DV_PRICES_USD, DV_SELF_SERVE_TIERS } from "./billing";

/**
 * llms.txt (https://llmstxt.org) and llms-full.txt for answer engines. Built
 * only from content/ so they cannot drift from the pages. Always dentvideo.com
 * URLs: these files are only served on that host.
 */
const abs = (path: string) => dentvideoPublicUrl(path, "https://dentvideo.com", "");

/** When the quick answers below were last checked against the product, billing and the pages. */
export const LLMS_UPDATED = "2026-11-14";

/**
 * Short, self-contained answers to the questions people ask answer engines
 * about DentVideo, each quotable on its own. Prices come from billing so they
 * cannot drift; everything else restates ENTITY and the product pages.
 */
function quickAnswers(): string[] {
  const price = (t: (typeof DV_SELF_SERVE_TIERS)[number]) => `$${DV_PRICES_USD[t].month}/month`;
  const plans = DV_SELF_SERVE_TIERS.map((t) => `${t[0].toUpperCase()}${t.slice(1)} ${price(t)}`).join(", ");
  const treatmentGuides = guidesFor("en").filter((g) => g.category === "treatments");
  return [
    `## Quick answers (checked ${LLMS_UPDATED})`,
    `- What does DentVideo cost? ${plans}, billed monthly with no minimum term. There is no yearly plan and no introductory or founding-member price. Groups and multi-location practices: custom pricing via ${OPERATOR.productEmail}.`,
    "- Can I see it before paying? Yes: after describing the clinic, a live preview of the clinic's own branded videos (logo, colours, name) runs in the browser before a plan is chosen. The first week of videos is made right after payment.",
    `- Is anything free? The \"Is my post allowed?\" ad checker for dentists is free in eight languages: ${abs(CHECKER_PATH.en)}. The guides are free to read.`,
    "- What does a clinic get each week? Five short vertical patient-education videos (usually around half a minute), narrated and captioned in the clinic's language, colours and logo, with a ready caption and hashtags. New videos are ready every Monday.",
    "- Does it post automatically? No. The dentist approves each video, downloads it and posts it. DentVideo does not run ads, answer comments or film in the clinic.",
    "- Does it use AI avatars or fake patients? No. Narration is a synthetic voice; footage is limited to objects; there are no avatar faces, fake doctors or patients. A dentist can record a few minutes and get captioned clips of their own voice.",
    "- How is advertising compliance handled? Every script and caption is checked against commonly restricted claims (guarantees, \"painless\", \"permanent\", superlatives, prices, discounts, before-and-after promises, testimonials) and by a reviewer acting as a general dentist for clinical accuracy. It is a careful filter, not legal advice.",
    "- Which languages? Videos: English, German, Spanish, French, Italian, Portuguese, Turkish, Japanese, Arabic, Polish. Website: English, German, Spanish, Turkish, French, Japanese, Arabic, Polish.",
    `- Who operates DentVideo? ${OPERATOR.shortName} (Podgorica, Montenegro), trading as ${PUBLISHER_NAME}. Contact: ${OPERATOR.productEmail}.`,
    "- Are there customer reviews? Not yet: DentVideo is new and publishes no testimonials; none are invented.",
    `- Patient-education video topics by treatment: ${treatmentGuides.map((g) => `${g.h1.split(":")[0]} (${abs(guidePath(g))})`).join("; ")}.`,
    "",
  ];
}

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
    ...quickAnswers(),
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
    `- [${CHECKER[l].h1}](${abs(CHECKER_PATH[l])}): ${CHECKER[l].seoDescription}`,
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
