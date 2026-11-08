import type OpenAI from "openai";
import { z } from "zod";
import { agentJson } from "./llm.js";
import { PILLARS, addressRule, type ClinicProfile } from "./profile.js";

/**
 * The strategist agent: a week of video ideas for one clinic.
 *
 * Patients do not search for "dental marketing"; they search for "is
 * whitening bad for teeth" and "what happens in a root canal". So every idea
 * is a real patient question, about a service the clinic actually offers,
 * answered educationally — which is also what keeps it compliant.
 */

export const topicSchema = z.object({
  title: z.string().min(3).max(90),
  pillar: z.enum(PILLARS),
  /** The patient question this video answers, in their words. */
  question: z.string().min(5).max(160),
  /** The scroll-stopping first line. */
  hook: z.string().min(3).max(90),
  /** Which of the clinic's services it relates to. */
  service: z.string().min(2).max(60),
});
export type Topic = z.infer<typeof topicSchema>;

const weekSchema = z.object({ topics: z.array(topicSchema).min(1).max(14) });

export async function planWeek(
  client: OpenAI,
  profile: ClinicProfile,
  opts: { count?: number; avoidTitles?: string[] } = {},
): Promise<Topic[]> {
  const count = Math.min(14, Math.max(1, opts.count ?? 5));
  const { topics } = await agentJson(client, {
    system: `You plan short educational videos (Reels/TikTok/Shorts) for a dental clinic.
Each video answers ONE real question patients ask, about a service the clinic offers.
Rules:
- Write everything in the clinic's language.
- Educational and accurate, mainstream dental guidance only. No prices, discounts, guarantees, superlatives, before/after promises or testimonials.
- Mix the pillars across the week (${PILLARS.join(", ")}); never more than two of the same pillar.
- Hooks decide whether anyone watches. Under 9 words, specific, and built on one of these:
  * a myth stated, then challenged: "Whitening thins your enamel? Not really."
  * a common mistake: "Stop rinsing right after you brush."
  * a concrete number or timeframe: "Your toothbrush has a 3-month expiry date."
  * a relatable moment: "That sharp pain when you drink something cold?"
  Never a generic textbook question ("What is X?", "Is X important?", "How does X work?") and never a bare topic label.
Return JSON: { "topics": [ { "title", "pillar", "question", "hook", "service" } ] }`,
    user:
      `Clinic: ${profile.name}${profile.city ? `, ${profile.city}` : ""} (${profile.country}).\n` +
      `Language: ${profile.language}. Tone: ${profile.tone}. ${addressRule(profile)}\n` +
      `Services: ${profile.services.join(", ")}.\n` +
      `Plan ${count} videos.` +
      (opts.avoidTitles?.length ? `\nAlready published, do not repeat: ${opts.avoidTitles.join(" | ")}` : ""),
    schema: weekSchema,
    temperature: 0.8,
  });

  // Keep only topics about services the clinic offers, and cap the count.
  const offered = profile.services.map((s) => s.toLowerCase());
  return topics
    .filter((t) => offered.some((s) => t.service.toLowerCase().includes(s) || s.includes(t.service.toLowerCase())))
    .slice(0, count);
}
