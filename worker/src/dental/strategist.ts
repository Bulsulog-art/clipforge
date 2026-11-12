import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
import { PILLARS, addressRule, type ClinicProfile } from "./profile.js";
import { scanHardRules } from "./compliance.js";
import { hookLimit, marketRules, speechUnits } from "./locale.js";
import { hookExamples } from "./examples.js";
import { BLOCKING_HOOK, hookProblems, hookShape } from "./style.js";
import { dropRepeats, memoryBrief, type PastTopic } from "./memory.js";
import { seasonalBrief } from "./calendar.js";

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
  /**
   * The one sentence a viewer should remember. Optional so stored topics
   * from before it existed still parse; the writers build the video on it.
   */
  takeaway: z.string().min(5).max(160).optional().catch(undefined),
});
export type Topic = z.infer<typeof topicSchema>;

const weekSchema = z.object({ topics: z.array(topicSchema).min(1).max(14) });

export async function planWeek(
  client: OpenAI,
  profile: ClinicProfile,
  opts: {
    count?: number;
    avoidTitles?: string[];
    patientSearches?: string[];
    /** What the clinic already posted (richer than avoidTitles: hooks, services, dates). */
    history?: PastTopic[];
    /** The day the week is planned (seasonal hooks); defaults to now. */
    today?: Date;
  } = {},
): Promise<Topic[]> {
  const count = Math.min(14, Math.max(1, opts.count ?? 5));
  const history = pastTopics(opts);
  const memory = memoryBrief(history, profile.services, opts.today);
  const season = seasonalBrief(profile.country, profile.language, opts.today);
  const { topics } = await agentJson(client, {
    system: `You plan short educational videos (Reels/TikTok/Shorts) for a dental clinic.
Each video answers ONE real question patients ask, about a service the clinic offers, and leaves the viewer with ONE takeaway they could repeat to a friend.
Rules:
- Write everything in the clinic's language.
- "service" is copied exactly from the clinic's list, and the video is about THAT service — never a treatment the clinic does not list (no veneers under "implants").
- Educational and accurate, mainstream dental guidance only. No prices, discounts, guarantees, superlatives, before/after promises or testimonials.
- Mix the pillars across the week (${PILLARS.join(", ")}); never more than two of the same pillar.
- Spread the week across the clinic's services: at most two videos about the same service, and never two that answer the same question in different words.
- Hooks decide whether anyone watches. ${hookLimit(profile.language).text.replace(/^u/, "U")}, specific, and built on one of these:
  * a myth stated, then challenged: "Whitening thins your enamel? Not really."
  * a common mistake: "You're brushing too hard — here's the sign."
  * a concrete number or timeframe, with the loop left open: "Your toothbrush has an expiry date — most people miss it."
  * a relatable moment: "That sharp pain when you drink something cold?"
  Never a generic textbook question ("What is X?", "Is X important?", "How does X work?"), never a hook that suggests dentists or clinics get things wrong (the clinic posts it), never a bare topic label, never a listicle label ("3 tips for…", "5 things about…").
  Open a loop, do not close it: the hook raises the question and the video answers it. "Implant treatment happens in 3 stages." gives the answer away; "Your implant isn't done on day one — here's why." makes people stay.
  Medicine is rarely absolute, and a reviewer will reject absolutes, so a myth hook challenges with "not quite" / "usually not", never a flat "No!".
  Native hooks in this clinic's language, for sound and shape: ${hookExamples(profile.language).map((h) => `"${h}"`).join(" ")}
The examples above show shapes only — do not reuse their subjects or wording.
- Vary the hook shapes across the week (question, moment, mistake, myth, surprising fact): at most two plain questions.
- "takeaway": the one sentence the viewer should remember, in the clinic's language, hedged where outcomes vary ("Brush, spit, don't rinse." / "Wait about 30 minutes after something acidic before brushing.").${marketRules(profile.country) ? `\n- ${marketRules(profile.country)}` : ""}
Return JSON: { "topics": [ { "title", "pillar", "question", "hook", "service", "takeaway" } ] }`,
    user:
      `Clinic: ${profile.name}${profile.city ? `, ${profile.city}` : ""} (${profile.country}).\n` +
      `Language: ${profile.language}. Tone: ${profile.tone}. ${addressRule(profile)}\n` +
      `Services: ${profile.services.join(", ")}.\n` +
      `Plan ${count} videos.` +
      (memory ? `\n${memory}` : "") +
      (season ? `\n${season}` : "") +
      (opts.patientSearches?.length
        ? `\nWhat patients in ${profile.country} actually type into Google about these services (real searches, this week). Build most of the week on these questions — answer them as asked, never mention prices:\n- ${opts.patientSearches.join("\n- ")}`
        : ""),
    schema: weekSchema,
    temperature: 0.8,
    // Hooks decide whether anyone watches; worth the stronger model once a week.
    model: REVIEW_MODEL,
  });

  // Keep only topics about services the clinic offers, and cap the count.
  const offered = profile.services.map((s) => s.toLowerCase());
  const perService = new Map<string, number>();
  // A topic the clinic already posted is dropped before anything is spent
  // writing it — unless that would leave the week short.
  return dropRepeats(topics, history, Math.min(count, topics.length))
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

/** History from whatever the caller has: full past topics, or just titles. */
export function pastTopics(opts: { avoidTitles?: string[]; history?: PastTopic[] }): PastTopic[] {
  const known = new Set((opts.history ?? []).map((h) => h.title));
  return [...(opts.history ?? []), ...(opts.avoidTitles ?? []).filter((t) => !known.has(t)).map((title) => ({ title }))];
}

const sharpenSchema = z.object({
  hooks: z.array(
    z.object({
      index: z.number().int().min(0),
      candidates: z.array(z.object({ hook: z.string().min(3).max(90), score: z.number().min(1).max(5) })).min(1).max(6),
    }),
  ),
});

/**
 * The hook editor. One idea per topic is rarely the best one: the eval's
 * judge, scrolling as a patient, scored the strategist's first hooks around
 * 3.5/5 — clear, but forgettable. So a second pass writes several options
 * per topic and keeps the one a patient would stop for, on the same rules.
 * If anything goes wrong the strategist's own hooks stand.
 */
export async function sharpenHooks(client: OpenAI, profile: ClinicProfile, topics: Topic[], recentHooks: string[] = []): Promise<Topic[]> {
  if (!topics.length) return topics;
  try {
    const { hooks } = await agentJson(client, {
      model: REVIEW_MODEL,
      temperature: 0.9,
      system: `You are the editor who writes the first line of short dental-education videos (Reels/TikTok) for a clinic, in native ${profile.language}.
For each topic: write 4 different hooks, then pick the one a patient scrolling their feed would stop for.
A strong hook:
- is ${hookLimit(profile.language).text}, specific and concrete — a moment, a mistake, a surprising fact or a myth;
- opens a question the video answers; it never gives the answer away;
- sounds like something a person would say out loud in ${profile.language}, not a headline or a translation;
- ${addressRule(profile)}
- uses the shapes of these native hooks (never their subjects or words): ${hookExamples(profile.language).map((h) => `"${h}"`).join(" ")}
Never: anything suggesting dentists or clinics get things wrong ("What do dentists often skip?") — the clinic itself posts this; a textbook question ("What is X?"), a "Did you know?" opener in any language ("Lo sapeva?", "Wussten Sie?", "¿Sabías que?", "Biliyor muydunuz?"), a topic label or "Topic: description" line ("Your implant: a multi-step process"), a listicle ("3 tips…"), absolutes ("never", "always", "No!"), promises, prices, "best", fear.
Score every candidate 1-5 as that scrolling patient would, strictly: 3 is "fine, forgettable".
Vary the shapes across the week: at most half of the chosen hooks may be questions; the rest a mistake ("You're brushing too hard — here's the sign."), a moment ("That twinge when you sip something cold…"), or a surprising fact.
Return JSON: { "hooks": [ { "index", "candidates": [ { "hook", "score" } ×4 ] } ] } — one entry per topic, same index.`,
      user:
        topics.map((t, i) => `${i}. Topic: ${t.title} — patient question: "${t.question}" — current hook: "${t.hook}"`).join("\n") +
        (recentHooks.length ? `\nThe clinic's recent hooks — do not reuse their opening words: ${recentHooks.slice(-10).map((h) => `"${h}"`).join(" ")}` : ""),
      schema: sharpenSchema,
    });
    // Candidates that are short enough, clean of banned words and free of the
    // hook failures a pattern can see (style.ts), best first.
    const ranked = new Map(
      hooks.map((h) => [
        h.index,
        h.candidates
          .map((c) => ({ hook: c.hook.trim(), score: c.score }))
          .filter((c) => usableHook(c.hook, profile.language))
          .sort((a, b) => b.score - a.score),
      ]),
    );
    return balanceShapes(topics, ranked);
  } catch {
    return topics;
  }
}

/** A hook the post-check would send back is never chosen. */
export function usableHook(hook: string, language: string): boolean {
  return (
    speechUnits(hook, language) <= hookLimit(language).max &&
    scanHardRules(hook).length === 0 &&
    !hookProblems(hook, language).some((p) => BLOCKING_HOOK.has(p.code))
  );
}

/**
 * Picks each topic's best hook, then evens out the week: when more than half
 * of the chosen hooks are plain questions (the baseline: 10 of 30 weeks'
 * scripts sat in question-heavy weeks), a question is swapped for that
 * topic's best non-question candidate scoring within one point of it.
 * Deterministic and free — no extra model call.
 */
export function balanceShapes(topics: Topic[], ranked: Map<number, { hook: string; score: number }[]>): Topic[] {
  const chosen = topics.map((t, i) => ranked.get(i)?.[0] ?? { hook: t.hook, score: 0 });
  const isQuestion = (h: string) => hookShape(h) === "question";
  const limit = Math.floor(topics.length / 2);
  let questions = chosen.filter((c) => isQuestion(c.hook)).length;
  for (let i = 0; i < topics.length && questions > limit; i++) {
    if (!isQuestion(chosen[i].hook)) continue;
    const alt = (ranked.get(i) ?? []).find((c) => !isQuestion(c.hook) && c.score >= chosen[i].score - 1);
    if (alt) {
      chosen[i] = alt;
      questions--;
    }
  }
  return topics.map((t, i) => ({ ...t, hook: chosen[i].hook }));
}
