import type OpenAI from "openai";
import { z } from "zod";
import { agentJson } from "./llm.js";
import type { ClinicProfile } from "./profile.js";
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

export async function writeShootCard(client: OpenAI, profile: ClinicProfile, topic: Topic): Promise<ShootCard> {
  return agentJson(client, {
    system: `You write a filming card for a dentist who will record a short talking-to-camera video on a phone.
Everything in the clinic's language. Plain, spoken sentences the dentist can say naturally — not a script to read word for word.
- opening: the first sentence to say, built on the hook.
- points: 2-5 talking points, each one idea, accurate and hedged where outcomes vary.
- closing: one sentence inviting viewers to ask or book a check-up (no prices, offers or guarantees).
- avoid: what NOT to say for this topic (promises, prices, naming patients, …).
- setup: 1-4 practical filming tips (vertical, eye level, quiet room, window light, …).
- minutes: suggested length, usually 2-5.
Return JSON: { "opening", "points": [], "closing", "avoid": [], "setup": [], "minutes" }`,
    user:
      `Clinic: ${profile.name}. Language: ${profile.language}. Tone: ${profile.tone}.\n` +
      `Topic: ${topic.title}. Hook: ${topic.hook}. Patient question: ${topic.question}`,
    schema: shootCardSchema,
    temperature: 0.6,
  });
}
