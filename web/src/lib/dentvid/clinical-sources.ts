/**
 * The public pages behind DentVideo's clinical check: for every aftercare rule
 * the clinical reviewer works with (worker/src/dental/accuracy.ts
 * AFTERCARE_GUIDE), the patient pages of national dental bodies that say the
 * same thing. The help center lists them under "How does DentVideo check a
 * video" (content/help, components/dentvid/help-check-sources.tsx).
 *
 * Plain data, safe for the browser and the server. The block from
 * `ClinicalSource` to AFTERCARE_SOURCES is a word-for-word copy of the
 * worker's; clinical-sources.test.ts fails when the two differ.
 */

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
 * Where each line of AFTERCARE_GUIDE comes from: public patient pages of
 * national dental bodies, each one fetched and read against its rule on the
 * `checked` day. A page that could not be fetched, or did not say what the
 * rule says, was left out. `line` is a phrase from the guide line it backs
 * (accuracy-sources.test.ts ties every guide line to exactly one entry).
 *
 * Not part of the prompt: AFTERCARE_GUIDE and SYSTEM stay as they are, because
 * a change there changes what the reviewer flags and needs a bench run first.
 * The help center lists these pages. From the type above to the end, this
 * block is the same, word for word, in worker/src/dental/accuracy.ts and
 * web/src/lib/dentvid/clinical-sources.ts (the web app cannot import the
 * worker); web/src/lib/dentvid/clinical-sources.test.ts keeps them the same.
 */
export const AFTERCARE_SOURCES: Record<AftercareRuleId, { line: string; sources: readonly ClinicalSource[] }> = {
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
        supports: "Temporary fillings are more fragile than permanent ones: avoid chewing on that side and avoid hard, sticky or chewy food.",
        checked: "2026-11-24",
      },
    ],
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
        body: "American Dental Association",
        title: "Scaling and Root Planing for Gum Disease",
        url: "https://www.mouthhealthy.org/all-topics-a-z/scaling-and-root-planing",
        supports: "After a deep cleaning, gums may be tender and teeth sensitive for a short time (the page covers deep cleaning, the strongest kind).",
        checked: "2026-11-24",
      },
    ],
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
  },
};

/** Every page once, in the guide's order. */
export const CLINICAL_SOURCE_LIST: readonly ClinicalSource[] = Object.values(AFTERCARE_SOURCES)
  .flatMap((r) => r.sources)
  .filter((s, i, all) => all.findIndex((o) => o.url === s.url) === i);

/** The bodies the pages come from, in order of first appearance. */
export const CLINICAL_BODIES: readonly string[] = [...new Set(CLINICAL_SOURCE_LIST.map((s) => s.body))];

/** The day the pages were last read against the rules (the latest `checked`). */
export const CLINICAL_CHECKED: string = CLINICAL_SOURCE_LIST.map((s) => s.checked).sort().at(-1) ?? "";
