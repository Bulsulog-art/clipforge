import { GUIDES, GUIDE_HUB_LOCALES, LANDING_PATH, LANGUAGE_NAME, LOCALES, guidePath, guidesFor, type Locale } from "@/content/dentvideo";
import { ENTITY, OPERATOR, PUBLISHER_NAME } from "@/content/guides/entity";
import { LEGAL, LEGAL_KINDS, legalPath, operatorAddress } from "@/content/legal";
import { guideMarkdown, reviewedDate, solutionMarkdown } from "@/content/guides/text";
import { ANSWER_KINDS, SOLUTIONS, solutionPath, solutionsFor } from "@/content/solutions";
import { findClaim } from "@/content/solutions/claims";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { CHECKER, CHECKER_PATH } from "@/content/dentvideo-checker";
import { HELP, HELP_PATH } from "@/content/help";
import { EXAMPLES, EXAMPLES_PATH, EXAMPLES_UI, examplePath, examplesFor, sampleOf, type ExampleVideo } from "@/content/dentvideo-examples";
import { dentvideoPublicUrl } from "./host";
import { DV_SELF_SERVE_TIERS } from "./billing";
import { DV_CURRENCIES, dvTierPrice } from "./pricing";

/**
 * llms.txt (https://llmstxt.org) and llms-full.txt for answer engines. Built
 * only from content/ so they cannot drift from the pages. Always dentvideo.com
 * URLs: these files are only served on that host.
 */
const abs = (path: string) => dentvideoPublicUrl(path, "https://dentvideo.com", "");

/** When the quick answers below were last checked against the product, billing and the pages. */
export const LLMS_UPDATED = "2026-11-17";

/**
 * The questions dentists ask before choosing (agency, Canva, a video library,
 * filming themselves), answered briefly and pointing to the English answer
 * pages, which quote the other options' own pages with dates.
 */
function decisionAnswers(): string[] {
  const page = (kind: string) => {
    const p = SOLUTIONS.find((o) => o.locale === "en" && o.kind === kind);
    return p ? abs(solutionPath(p)) : abs(LANDING_PATH.en);
  };
  // Facts about another company carry its own page and the date it was read (content/solutions/claims.ts).
  const src = (...ids: string[]) =>
    `(${ids
      .map(findClaim)
      .map((c) => `${c.url}, as of ${c.checked}`)
      .join("; ")})`;
  return [
    `- What are the ways to make patient-education or social media videos for a dental clinic? Five: film them yourself, hire a dental marketing agency, design them in an app such as Canva, license a ready-made video library (chairside and website explanations), or use software such as DentVideo that writes, narrates, captions and checks five videos a week for the dentist to approve. Comparison with sources and dates: ${page("options")}`,
    `- DentVideo or a dental marketing agency? An agency can do more (strategy, on-site filming, ads, comment replies, posting) and usually costs more because it sells people's time. DentVideo covers the weekly educational videos only, checks every script for advertising rules and clinical accuracy, and leaves approval and posting to the clinic; the two can be combined. Details and published US agency prices with sources: ${page("vs-agency")}`,
    `- DentVideo or Canva? Canva is a general design app with dental video templates, an AI voice generator and auto captions ${src("canva-dental-templates", "canva-ai-voice", "canva-auto-captions")}: someone on the team makes each video and checks every claim. It is the more flexible choice for posters, flyers and graphics. DentVideo makes and checks five videos a week and suits clinics short on time. Details with sources: ${page("vs-canva")}`,
    `- Is there a free option? Filming yourself costs only time, and Canva has a free plan ${src("canva-plans")}. DentVideo has no free plan or trial; what is free is the ad checker and the preview of a clinic's own videos before paying.`,
  ];
}

/**
 * Short, self-contained answers to the questions people ask answer engines
 * about DentVideo, each quotable on its own. Prices come from billing so they
 * cannot drift; everything else restates ENTITY and the product pages.
 */
function quickAnswers(): string[] {
  // "$49 / €49 / 1.490 TL": every list currency (pricing.ts), so no market reads a converted guess.
  const price = (t: (typeof DV_SELF_SERVE_TIERS)[number]) => DV_CURRENCIES.map((c) => dvTierPrice("en", t, c)).join(" / ");
  const plans = DV_SELF_SERVE_TIERS.map((t) => `${t[0].toUpperCase()}${t.slice(1)} ${price(t)}`).join(", ");
  const treatmentGuides = guidesFor("en").filter((g) => g.category === "treatments");
  return [
    `## Quick answers (checked ${LLMS_UPDATED})`,
    `- What does DentVideo cost? ${plans} a month, excluding tax: US dollars in most countries, euros in the euro area, Turkish lira in Türkiye (the billing country decides). Billed monthly with no minimum term, cancel anytime. There is no yearly plan, no introductory price and no discount or discount code. Groups and multi-location practices: priced per location, via ${OPERATOR.productEmail}. Tax is added at checkout by Dodo Payments, the merchant of record.`,
    "- Can I see it before paying? Yes, in two steps. On the homepage, with no account, a clinic types its name, adds its logo and picks a color and sees them on a real DentVideo video. Then it creates an account (free to create) and describes the clinic, and a full preview of its week runs in the browser before a plan is chosen. Payment happens only when a plan is chosen; the first week of videos is made right after payment, about 15 minutes later.",
    `- Is anything free? The \"Is my post allowed?\" ad checker for dentists is free in eight languages: ${abs(CHECKER_PATH.en)}. A dentist pastes a caption or ad, picks a country (US, UK, Türkiye, Germany, Austria, Switzerland, Spain, Mexico, France, Poland, Japan, UAE, Saudi Arabia, or general rules) and sees each sentence marked OK, risky or not allowed, with the reason, a link to the official text and a calmer wording. It runs in the browser with fixed word rules (no AI call); the text is not sent to a server, and a shared link carries it in the URL fragment. It is a careful filter, not legal advice. The guides are free to read.`,
    `- Where can I see what the videos look like? Real sample videos, made for fictional demo clinics, three per language, each with a page describing what it covers: ${abs(EXAMPLES_PATH.en)} (also /de/examples, /es/examples, /tr/examples, /fr/examples, /ja/examples, /ar/examples, /pl/examples). They are shown as examples only, not offered for download or reuse.`,
    "- What does a clinic get each week? Five finished vertical patient-education videos (1080 × 1920 MP4, the samples run 20 to 40 seconds), narrated and captioned in the clinic's language, with its logo, colors and name, each with a ready caption and hashtags and a status (ready, or marked for a look with the reason). New videos are ready every Monday; topics are only treatments the clinic offers. Practice also turns the dentist's own phone recordings into captioned clips.",
    "- What is not included? DentVideo does not post for the clinic, answer comments or messages, run ads or paid campaigns, make Stories or ad visuals, make recruiting or job videos, or make before-and-after, price or testimonial posts.",
    "- Does it post automatically? No. The dentist approves each video, downloads it and posts it. DentVideo does not run ads, answer comments or film in the clinic.",
    "- Does it use AI avatars or fake patients? No. Scripts are written by software and the narration is a synthetic voice, and the site says so; footage is limited to objects; there are no avatar faces, fake doctors or patients. Where a platform or the clinic's rules ask for an AI label, the clinic adds it when posting. On Practice a dentist can record a few minutes and get captioned clips of themselves.",
    "- Does DentVideo need patient data (HIPAA, GDPR)? No. It never asks for patient information, so an account holds no patient health information; Practice users are asked to keep patients out of their recordings. The data processing agreement (Article 28 GDPR) applies when the clinic accepts the Terms, lists every sub-processor (including OpenAI for scripts and narration) and is available signed on request.",
    "- How is advertising compliance handled? Every script is written with the clinic's market rules in mind (for example the HWG and Berufsordnung in Germany, the 2025 Turkish health advertising regulation, the CAP Code and GDC guidance in the UK, the ADA Code and FTC rules in the US). Software (LLM-based checks plus fixed word rules) then checks every script and caption twice before the clinic sees it: against commonly restricted claims (guarantees, \"painless\", \"permanent\", superlatives, prices, discounts, before-and-after promises, testimonials) and, set up to think like a general dentist, for clinical accuracy. No human lawyer or compliance officer reviews it; it is a careful filter, not legal advice, it does not certify compliance, and the clinic approves every video.",
    "- Which languages? Videos: English, German, Spanish, French, Italian, Portuguese, Turkish, Japanese, Arabic, Polish (formal or informal address). Website, in eight languages: English, German, Spanish, Turkish, French, Japanese, Arabic, Polish.",
    "- Can the clinic choose the voice and the closing line? Yes. The clinic chooses a female or male narrator for its new videos, and can add one calm closing line under its captions; DentVideo checks that line against the market's advertising rules (no booking push, no promises, no prices, no urgency) before saving it. Without one, the posts use DentVideo's own closing lines.",
    "- Who approves? The dentist, always: nothing is published until the clinic approves it, and the clinic posts approved videos itself.",
    `- Who operates DentVideo? ${OPERATOR.shortName} (Podgorica, Montenegro), trading as ${PUBLISHER_NAME}. Contact: ${OPERATOR.productEmail}.`,
    "- Are there customer reviews? Not yet: DentVideo is new and publishes no testimonials; none are invented.",
    ...decisionAnswers(),
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
    "- Comparison and answer pages state another company's features or published prices only as a quoted claim that links that company's own page and gives the date it was read; claims older than a year fail the site's tests and must be re-checked. Each page also says where another option is the better fit.",
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
    `- [${EXAMPLES_UI[l].h1}](${abs(EXAMPLES_PATH[l])}): ${EXAMPLES_UI[l].seoDescription}`,
    ...examplesFor(l).map((e) => `  - [${sampleOf(e).name}](${abs(examplePath(e))}): ${e.seoDescription}`),
    `- [${HELP[l].meta.title}](${abs(HELP_PATH[l])}): ${HELP[l].meta.description}`,
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

/** One sample video's page as Markdown: what it covers and the text on screen (not a narration transcript). */
function exampleMarkdown(e: ExampleVideo): string {
  const ui = EXAMPLES_UI[e.locale];
  const s = sampleOf(e);
  return [
    `## ${e.h1}`,
    "",
    `URL: ${abs(examplePath(e))} · Language: ${e.locale} · Length: ${Math.round(s.seconds)} s · On-screen hook: "${s.name}"`,
    "",
    e.summary,
    "",
    `${ui.onScreenHeading}:`,
    ...e.onScreen.map((line) => `- ${line}`),
    "",
    `${ui.demoNote} ${ui.disclaimer}`,
    "",
  ].join("\n");
}

export function llmsTxt(): string {
  const lines = [
    ...factsBlock(),
    ...editorialBlock(),
    ...legalBlock(),
    "## What DentVideo makes, and how it compares",
    ...SOLUTIONS.filter((p) => !ANSWER_KINDS.includes(p.kind)).map((p) => `- [${p.h1}](${abs(solutionPath(p))}) (${p.locale}): ${p.seoDescription}`),
    "",
    "## Choosing how to make dental videos (sourced, dated comparisons)",
    ...SOLUTIONS.filter((p) => ANSWER_KINDS.includes(p.kind)).map((p) => `- [${p.h1}](${abs(solutionPath(p))}) (${p.locale}, last reviewed ${reviewedDate(p)}): ${p.seoDescription}`),
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
    "# Example videos",
    "",
    ...EXAMPLES.map(exampleMarkdown),
    "# Guides",
    "",
    ...GUIDES.map((g) => guideMarkdown(g, abs)),
  ];
  return lines.join("\n");
}
