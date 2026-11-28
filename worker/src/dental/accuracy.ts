import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_EFFORT, REVIEW_MODEL } from "./llm.js";
import type { ClinicProfile } from "./profile.js";
import type { Topic } from "./strategist.js";

/**
 * The clinical-accuracy agent. The compliance agent asks "may a clinic say
 * this?"; this one asks "is it true, and is it about this topic?". The first
 * real runs produced text that passed every advertising rule and was still
 * wrong: whitening described as protecting tooth health, post-extraction
 * salt-water rinses offered as root-canal aftercare, a video saying "first
 * visit at 1" over a caption saying "at 6 months".
 *
 * It runs on a stronger model than the writers, because a confident wrong
 * medical statement is the one failure a clinic will not forgive. It is
 * still not a dentist: every video also goes to the clinic for approval.
 */

export const accuracySchema = z.object({
  verdict: z.enum(["pass", "revise", "block"]),
  issues: z
    .array(z.object({ quote: z.string().max(300), problem: z.string().max(300), fix: z.string().max(300) }))
    .max(12)
    .default([]),
});
export type AccuracyResult = z.infer<typeof accuracySchema>;

/**
 * What dentists normally tell patients after each procedure. The reviewer
 * checks against it, and the writers are given it up front: in the eval most
 * accuracy rewrites were invented aftercare ("48 hours", salt rinses after a
 * root canal) that the writer could not have known was wrong.
 */
export const AFTERCARE_GUIDE = `Procedure-specific aftercare is often mixed up — check which procedure it belongs to:
- extractions and implant surgery: for the first ~24 hours no vigorous rinsing, spitting or straws (protect the clot); AFTER that, gentle warm salt-water rinses are commonly advised. None of this applies to root canals, fillings or cleanings;
- "wait about 30 minutes before eating or drinking" → after fluoride varnish or similar, not after every cleaning;
- "avoid chewing on that side until the permanent restoration" → root canals with a temporary filling;
- "wear aligners 20-22 hours a day" → clear aligners; with the aligners in, plain water only — other drinks (especially sugary, acidic or hot ones) mean taking them out, because a sugary or acidic drink held against the teeth under the tray raises the risk of decay and erosion, coloured drinks can stain them and hot drinks can warp them; clean the teeth (or at least rinse) before putting them back. The decay/erosion reason is the main one — a script that only mentions staining misses it;
- implants: the implant usually needs a healing period (often a few months) to fuse with the bone before it takes full chewing load, unless the dentist has planned immediate loading; until then, follow the dentist's instructions on soft food and that side;
- professional cleaning: usually no special restrictions afterwards; gums can be a little tender or teeth briefly sensitive;
- whitening: avoiding strongly coloured food and drink (coffee, tea, red wine) for the first day or two is commonly advised; temporary sensitivity is common.`;

const SYSTEM = `You are a careful general dentist reviewing patient-education content before a clinic publishes it.
Check, against mainstream current guidance (national dental associations, FDI, NHS/ADA-level consensus):
1. Accuracy: is every clinical statement true for most patients? Flag wrong facts, outdated advice, overstated benefits ("whitening protects teeth"), understated risks.
2. Relevance: does each piece of procedure-specific advice belong to the procedure it is presented for? (e.g. advice for extractions does not belong in root-canal aftercare.) General oral-hygiene and prevention advice is always relevant for a dental clinic. Never flag the topic or title itself — judge the statements.
3. Consistency: when both a video script and a caption are given, they must not contradict each other (ages, timings, counts).
4. Safety: medication or home-remedy advice must defer to the patient's own dentist; nothing that could delay seeing a dentist for pain, swelling or bleeding.
5. Standard instructions: advice must match what dentists normally tell patients for THIS procedure — flag advice that is stricter, looser or different from standard instructions (it misleads patients as much as a wrong fact).
${AFTERCARE_GUIDE}
Hedged, generally true statements PASS. Do not nitpick wording or style. Do not ask for more detail, more caveats or a longer list of risks: a short video cannot say everything, and that is not an error. Only flag what a dentist would actually correct.

Return JSON: { "verdict": "pass" | "revise" | "block", "issues": [ { "quote", "problem", "fix" } ] }
- "revise": give the corrected statement in "fix", in the same language as the text.
- "block": the topic itself is unsuitable for general patient education.`;

export async function reviewAccuracy(
  client: OpenAI,
  profile: Pick<ClinicProfile, "language" | "country">,
  topic: Pick<Topic, "title" | "question" | "service">,
  parts: { script: string; caption?: string },
  /**
   * "recording": the text is the dentist's own words from their video. They
   * chose the subject, so there is no topic to be relevant to — only wrong,
   * unsafe or promise-like statements are flagged. (A correct temporary-
   * filling tip was flagged as "off topic" against an auto-generated title.)
   */
  mode: "script" | "recording" = "script",
): Promise<AccuracyResult> {
  return agentJson(client, {
    system:
      mode === "recording"
        ? `${SYSTEM}\n\nTHIS TEXT IS THE DENTIST'S OWN SPOKEN WORDS from their video. Skip check 2 (relevance) entirely: the dentist chose what to talk about. Flag only statements that are clinically wrong, unsafe, or contradict standard instructions for the procedure being described.`
        : SYSTEM,
    user:
      `Language: ${profile.language}. Country: ${profile.country}.\n` +
      `Topic: ${topic.title} (service: ${topic.service}). Patient question: ${topic.question}\n\n` +
      `VIDEO SCRIPT:\n${parts.script}` +
      (parts.caption ? `\n\nCAPTION:\n${parts.caption}` : ""),
    schema: accuracySchema,
    temperature: 0.1,
    model: REVIEW_MODEL,
    effort: REVIEW_EFFORT,
  });
}

/** A public patient-information page from a national dental body. */
export type ClinicalSource = {
  /** Who publishes the page. */
  body: string;
  /** The page's own title. */
  title: string;
  url: string;
  /** What the page says that the rule rests on, in a few words, so the next check is quick. */
  supports: string;
  /** The day the page was fetched and read against the rule. */
  checked: string;
};

/** One line of AFTERCARE_GUIDE, by name. */
export type AftercareRuleId =
  | "extraction"
  | "fluoride-varnish"
  | "root-canal"
  | "clear-aligners"
  | "implant-healing"
  | "professional-cleaning"
  | "whitening";

/**
 * The public patient pages each line of AFTERCARE_GUIDE was compared with:
 * pages of national dental bodies, each one fetched and read against its rule
 * on the `checked` day. A page that could not be fetched was left out. The
 * rules came first and the pages were looked up for them afterwards, so a page
 * can say less than its rule: `supports` records what the page itself says,
 * and `gap` what none of the rule's pages say. `line` is a phrase from the
 * guide line the entry belongs to (accuracy-sources.test.ts ties every guide
 * line to exactly one entry).
 *
 * Not part of the prompt: AFTERCARE_GUIDE and SYSTEM stay as they are, because
 * a change there changes what the reviewer flags and needs a bench run first.
 * The help center lists these pages. From the type above to the end, this
 * block is the same, word for word, in worker/src/dental/accuracy.ts and
 * web/src/lib/dentvid/clinical-sources.ts (the web app cannot import the
 * worker); web/src/lib/dentvid/clinical-sources.test.ts keeps them the same.
 */
export const AFTERCARE_SOURCES: Record<
  AftercareRuleId,
  {
    line: string;
    sources: readonly ClinicalSource[];
    /** What the rule says that none of its pages say. Absent when the pages say all of it. */
    gap?: string;
  }
> = {
  extraction: {
    line: "extractions and implant surgery:",
    sources: [
      {
        body: "Oral Health Foundation",
        title: "What to do following an extraction",
        url: "https://www.dentalhealth.org/what-to-do-following-an-extraction",
        supports: "The first 24 hours matter for healing: avoid rinsing and do not disturb the clot, then use a warm salt mouthwash.",
        checked: "2026-11-24",
      },
      {
        body: "American Dental Association",
        title: "Extractions",
        url: "https://www.mouthhealthy.org/all-topics-a-z/extractions",
        supports: "Do not rinse vigorously, avoid drinking through a straw for 24 hours, and rinse gently for the first few days.",
        checked: "2026-11-24",
      },
    ],
  },
  "fluoride-varnish": {
    line: "after fluoride varnish",
    sources: [
      {
        body: "American Dental Association",
        title: "Is Fluoride Safe for Children?",
        url: "https://www.mouthhealthy.org/life-stages/babies-and-kids/moms-guide-to-fluoride",
        supports: "After fluoride varnish a child may be advised to avoid eating or drinking for a short time, maybe 30 minutes.",
        checked: "2026-11-24",
      },
    ],
  },
  "root-canal": {
    line: "root canals with a temporary filling",
    sources: [
      {
        body: "American Dental Association",
        title: "Root Canals",
        url: "https://www.mouthhealthy.org/all-topics-a-z/root-canals",
        supports: "A temporary filling protects the tooth until a permanent filling or crown is placed at a follow-up visit.",
        checked: "2026-11-24",
      },
      {
        body: "Oral Health Foundation",
        title: "Temporary Fillings Explained",
        url: "https://www.dentalhealth.org/temporary-fillings",
        supports: "Temporary fillings are more fragile than permanent ones: avoid chewing on that side for a few hours after placement, and avoid hard, sticky or chewy food. The page is about temporary fillings in general, not root canals.",
        checked: "2026-11-24",
      },
    ],
    gap: "Neither page says to avoid chewing on that side until the permanent restoration: the ADA page gives no chewing advice, and the Oral Health Foundation says a few hours after the temporary filling is placed.",
  },
  "clear-aligners": {
    line: "→ clear aligners",
    sources: [
      {
        body: "American Association of Orthodontists",
        title: "Clear Aligner Therapy: How Transparent Aligners Work",
        url: "https://aaoinfo.org/whats-trending/clear-aligner-therapy/",
        supports: "Wear aligners 20-22 hours a day; avoid any drink that is not water while they are in, as trapped liquid can stain and cause cavities.",
        checked: "2026-11-24",
      },
      {
        body: "American Association of Orthodontists",
        title: "Living with Braces: Food, Oral Hygiene, & Care Tips",
        url: "https://aaoinfo.org/whats-trending/life-during-treatment/",
        supports: "Take aligners out before eating or drinking anything but tap water, and put them back after cleaning the teeth.",
        checked: "2026-11-24",
      },
    ],
  },
  "implant-healing": {
    line: "implants: the implant usually needs a healing period",
    sources: [
      {
        body: "American Dental Association",
        title: "Implants",
        url: "https://www.mouthhealthy.org/all-topics-a-z/implants",
        supports: "Soft food during healing; the bone may need up to several months to grow around the implant, though some patients get teeth in one visit.",
        checked: "2026-11-24",
      },
      {
        body: "Oral Health Foundation",
        title: "Understanding Dental Implants",
        url: "https://www.dentalhealth.org/dental-implants",
        supports: "The implant is left to heal, usually around four months, before the crown is attached; same-day teeth are possible in some cases.",
        checked: "2026-11-24",
      },
    ],
  },
  "professional-cleaning": {
    line: "professional cleaning:",
    sources: [
      {
        body: "NHS",
        title: "Dental treatments",
        url: "https://www.nhs.uk/live-well/healthy-teeth-and-gums/dental-treatments/",
        supports: "A scale and polish is the hygienist carefully removing the plaque and tartar that build up on the teeth; the page gives no aftercare for it.",
        checked: "2026-11-24",
      },
    ],
    gap: "No page found says in so many words that a routine cleaning needs no special care afterwards, or that gums can be a little tender. The ADA page on scaling and root planing is about deep cleaning, a different procedure with more aftercare, so it is not listed.",
  },
  whitening: {
    line: "whitening:",
    sources: [
      {
        body: "NHS",
        title: "Teeth whitening",
        url: "https://www.nhs.uk/tests-and-treatments/teeth-whitening/",
        supports: "Coffee, tea and red wine stain teeth; sensitive teeth and sore gums can follow whitening for a short time.",
        checked: "2026-11-24",
      },
      {
        body: "Oral Health Foundation",
        title: "About tooth whitening",
        url: "https://www.dentalhealth.org/about-tooth-whitening",
        supports: "The effect lasts less with food and drink that stain; sensitivity after whitening is usually temporary.",
        checked: "2026-11-24",
      },
    ],
    gap: "Neither page gives a time, such as the first day or two, for avoiding coloured food and drink after whitening: both name coffee, tea and red wine as stains.",
  },
};
