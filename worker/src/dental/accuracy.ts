import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
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
- "wear aligners 20-22 hours a day" → clear aligners;
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
  });
}
