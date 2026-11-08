import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
import { PILLARS, addressRule, type ClinicProfile } from "./profile.js";
import { scanHardRules } from "./compliance.js";

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
- Spread the week across the clinic's services: at most two videos about the same service, and never two that answer the same question in different words.
- Hooks decide whether anyone watches. Under 9 words, specific, and built on one of these:
  * a myth stated, then challenged: "Whitening thins your enamel? Not really."
  * a common mistake: "You're brushing too hard — here's the sign."
  * a concrete number or timeframe: "Your toothbrush has a 3-month expiry date."
  * a relatable moment: "That sharp pain when you drink something cold?"
  Never a generic textbook question ("What is X?", "Is X important?", "How does X work?"), never a bare topic label, never a listicle label ("3 tips for…", "5 things about…").
  Open a loop, do not close it: the hook raises the question and the video answers it. "Implant treatment happens in 3 stages." gives the answer away; "Your implant isn't done on day one — here's why." makes people stay.
  Medicine is rarely absolute, and a reviewer will reject absolutes, so a myth hook challenges with "not quite" / "usually not", never a flat "No!".
The examples above show shapes only — do not reuse their subjects.
Return JSON: { "topics": [ { "title", "pillar", "question", "hook", "service" } ] }`,
    user:
      `Clinic: ${profile.name}${profile.city ? `, ${profile.city}` : ""} (${profile.country}).\n` +
      `Language: ${profile.language}. Tone: ${profile.tone}. ${addressRule(profile)}\n` +
      `Services: ${profile.services.join(", ")}.\n` +
      `Plan ${count} videos.` +
      (opts.avoidTitles?.length ? `\nAlready published, do not repeat: ${opts.avoidTitles.join(" | ")}` : ""),
    schema: weekSchema,
    temperature: 0.8,
    // Hooks decide whether anyone watches; worth the stronger model once a week.
    model: REVIEW_MODEL,
  });

  // Keep only topics about services the clinic offers, and cap the count.
  const offered = profile.services.map((s) => s.toLowerCase());
  const perService = new Map<string, number>();
  return topics
    .filter((t) => offered.some((s) => t.service.toLowerCase().includes(s) || s.includes(t.service.toLowerCase())))
    // A topic built on a banned word ("Can a root canal be painless?") can
    // only be rejected later; drop it now and let a spare take its place.
    .filter((t) => scanHardRules(`${t.title} ${t.hook} ${t.question}`).length === 0)
    .filter((t) => {
      // At most two per service, so one service cannot fill the week.
      const key = t.service.toLowerCase().trim();
      const n = perService.get(key) ?? 0;
      perService.set(key, n + 1);
      return n < 2;
    })
    .slice(0, count);
}

const sharpenSchema = z.object({
  hooks: z.array(z.object({ index: z.number().int().min(0), candidates: z.array(z.string()).max(6), best: z.string().min(3).max(90) })),
});

/**
 * The hook editor. One idea per topic is rarely the best one: the eval's
 * judge, scrolling as a patient, scored the strategist's first hooks around
 * 3.5/5 — clear, but forgettable. So a second pass writes several options
 * per topic and keeps the one a patient would stop for, on the same rules.
 * If anything goes wrong the strategist's own hooks stand.
 */
export async function sharpenHooks(client: OpenAI, profile: ClinicProfile, topics: Topic[]): Promise<Topic[]> {
  if (!topics.length) return topics;
  try {
    const { hooks } = await agentJson(client, {
      model: REVIEW_MODEL,
      temperature: 0.9,
      system: `You are the editor who writes the first line of short dental-education videos (Reels/TikTok) for a clinic, in native ${profile.language}.
For each topic: write 4 different hooks, then pick the one a patient scrolling their feed would stop for.
A strong hook:
- is under 9 words, specific and concrete — a moment, a mistake, a surprising fact or a myth;
- opens a question the video answers; it never gives the answer away;
- sounds like something a person would say out loud in ${profile.language}, not a headline or a translation;
- ${addressRule(profile)}
Never: a textbook question ("What is X?"), a topic label, a listicle ("3 tips…"), absolutes ("never", "always", "No!"), promises, prices, "best", fear.
Vary the shapes across the week: at most half of the chosen hooks may be questions; the rest a mistake ("You're brushing too hard — here's the sign."), a moment ("That twinge when you sip something cold…"), or a surprising fact.
Return JSON: { "hooks": [ { "index", "candidates": [4 strings], "best" } ] } — one entry per topic, same index.`,
      user: topics.map((t, i) => `${i}. Topic: ${t.title} — patient question: "${t.question}" — current hook: "${t.hook}"`).join("\n"),
      schema: sharpenSchema,
    });
    const best = new Map(hooks.map((h) => [h.index, h.best.trim()]));
    return topics.map((t, i) => {
      const h = best.get(i);
      return h && h.split(/\s+/).length <= 12 ? { ...t, hook: h } : t;
    });
  } catch {
    return topics;
  }
}
