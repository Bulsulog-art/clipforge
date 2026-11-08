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

const SYSTEM = `You are a careful general dentist reviewing patient-education content before a clinic publishes it.
Check, against mainstream current guidance (national dental associations, FDI, NHS/ADA-level consensus):
1. Accuracy: is every clinical statement true for most patients? Flag wrong facts, outdated advice, overstated benefits ("whitening protects teeth"), understated risks.
2. Relevance: does each piece of advice belong to THIS topic/procedure? (e.g. advice for extractions does not belong in root-canal aftercare.)
3. Consistency: when both a video script and a caption are given, they must not contradict each other (ages, timings, counts).
4. Safety: medication or home-remedy advice must defer to the patient's own dentist; nothing that could delay seeing a dentist for pain, swelling or bleeding.
Hedged, generally true statements PASS. Do not nitpick wording or style; only flag what a dentist would correct.

Return JSON: { "verdict": "pass" | "revise" | "block", "issues": [ { "quote", "problem", "fix" } ] }
- "revise": give the corrected statement in "fix", in the same language as the text.
- "block": the topic itself is unsuitable for general patient education.`;

export async function reviewAccuracy(
  client: OpenAI,
  profile: Pick<ClinicProfile, "language" | "country">,
  topic: Pick<Topic, "title" | "question" | "service">,
  parts: { script: string; caption?: string },
): Promise<AccuracyResult> {
  return agentJson(client, {
    system: SYSTEM,
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
