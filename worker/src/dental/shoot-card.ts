import type OpenAI from "openai";
import { z } from "zod";
import { agentJson } from "./llm.js";
import { addressRule, type ClinicProfile } from "./profile.js";
import { marketRules } from "./locale.js";
import type { Topic } from "./strategist.js";

/**
 * The shoot-card agent: turns a topic into a one-screen brief a dentist can
 * film from in five minutes on a phone. Patients trust a clinic they have
 * seen and heard; generated slides do not build that. The card is how the
 * clinic's own face gets into the content without the dentist having to
 * plan anything — they read it, press record, and the clip pipeline does
 * the rest.
 */

export const shootCardSchema = z.object({
  opening: z.string().min(3).max(140),
  points: z.array(z.string().min(3).max(200)).min(2).max(5),
  closing: z.string().min(3).max(140),
  avoid: z.array(z.string().min(3).max(140)).max(5).default([]),
  setup: z.array(z.string().min(3).max(140)).min(1).max(4),
  minutes: z.number().min(1).max(10),
});
export type ShootCard = z.infer<typeof shootCardSchema>;

export function shootCardText(c: ShootCard): string {
  return [c.opening, ...c.points, c.closing].join("\n");
}

export async function writeShootCard(
  client: OpenAI,
  profile: ClinicProfile,
  topic: Topic,
  fixes: string[] = [],
): Promise<ShootCard> {
  return agentJson(client, {
    system: `You write a filming card for a dentist who will record a short talking-to-camera video on a phone.
Everything in the clinic's language. Plain, spoken sentences the dentist can say naturally — not a script to read word for word.
- opening: the first sentence to say, built on the hook.
- points: 2-5 talking points, each one idea, accurate and hedged where outcomes vary. Medication or home-remedy advice must say to follow the dentist's instructions.
- closing: ${
      profile.country.toUpperCase() === "TR"
        ? `one sentence pointing viewers to their own dentist (hekiminiz) for what applies to them — Türkiye's rules (RG 33075) allow information only: never "randevu alın/planlayın", "bize yazın/ulaşın/sorun", "kliniğimiz" (no prices, offers or guarantees).`
        : "one sentence inviting viewers to ask or book a check-up, calmly (no prices, offers, guarantees or urgency)."
    }${marketRules(profile.country) ? `\n- ${marketRules(profile.country)}` : ""}
- avoid: what NOT to say for this topic (promises, prices, naming patients, …).
- setup: 1-4 practical filming tips (vertical, eye level, quiet room, window light, …).
- minutes: suggested length, usually 2-5.
Return JSON: { "opening", "points": [], "closing", "avoid": [], "setup": [], "minutes" }`,
    user:
      `Clinic: ${profile.name}. Language: ${profile.language}. Tone: ${profile.tone}. ${addressRule(profile)}\n` +
      `Topic: ${topic.title}. Hook: ${topic.hook}. Patient question: ${topic.question}` +
      (fixes.length ? `\nA reviewer required these changes: ${fixes.join(" | ")}` : ""),
    schema: shootCardSchema,
    temperature: 0.6,
  });
}
