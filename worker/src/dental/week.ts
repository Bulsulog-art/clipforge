import type OpenAI from "openai";
import { planFromPrompt } from "../remotion/plan-from-prompt.js";
import { narrate } from "./narrate.js";
import { AGENT_MODEL } from "./llm.js";
import { guardFootage } from "./footage.js";
import { backgroundSrc, defaultBackgrounds, matchingBackgrounds, suggestBackgrounds } from "../dentvid/backgrounds/suggest.js";
import { totalSeconds, type ScenePlan } from "../remotion/scene-plan.js";
import { AVOID_WORDS, reviewCompliance, type ComplianceResult } from "./compliance.js";
import { writePostCopy, type PostCopy } from "./copywriter.js";
import { addressRule, type ClinicProfile } from "./profile.js";
import { planWeek, sharpenHooks, type Topic } from "./strategist.js";
import { AFTERCARE_GUIDE, reviewAccuracy, type AccuracyResult } from "./accuracy.js";
import { shootCardText, writeShootCard, type ShootCard } from "./shoot-card.js";
import { inspectVideo, type QaReport } from "../steps/qa.js";

/**
 * The orchestrator: one clinic profile in, a week of ready-to-post videos out.
 *
 *   strategist → for each topic:
 *     scriptwriter (scene plan) → compliance ─┬─ pass ─→ copywriter → compliance → render
 *                                             ├─ revise → rewrite once with the fixes → compliance
 *                                             └─ block / still failing → dropped, with the reason
 *
 * The rule the whole system is built on: nothing reaches "ready" without a
 * passing compliance review of both the on-screen text and the caption.
 * Rendering is injected so the agents run (and are tested) without a GPU,
 * a browser or storage.
 */

export type VideoPackage =
  | {
      status: "ready";
      /** Nothing is published until the clinic's dentist approves it. */
      approval: "pending" | "approved" | "rejected";
      topic: Topic;
      plan: ScenePlan;
      /** Library photo ids for this video, best first; plan.backgrounds holds the chosen ones. */
      suggestedBackgrounds?: string[];
      copy: PostCopy;
      checks: { script: Checks; copy: Checks };
      /** How the dentist can film this topic themselves, in their language. */
      shootCard?: ShootCard;
      videoPath?: string;
      /** Measurements of the rendered file; issues mean "look before posting". */
      qa?: QaReport;
    }
  | { status: "rejected"; topic: Topic; stage: "script" | "copy"; reasons: string[] };

export type WeekDeps = {
  client: OpenAI;
  /** Renders a plan to a file and returns its path. Omit to plan only. */
  render?: (plan: ScenePlan, topic: Topic) => Promise<string>;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
  /** Real patient searches for the clinic's services (dental/questions.ts). Omit to plan without them. */
  searches?: (profile: ClinicProfile) => Promise<string[]>;
};

/** Every word a viewer will read or hear in the video. */
export function planText(plan: ScenePlan): string {
  const out: string[] = [];
  for (const s of plan.scenes) {
    switch (s.kind) {
      case "hook":
        out.push(s.text, s.sub ?? "");
        break;
      case "statement":
      case "quote":
        out.push(s.text);
        break;
      case "list":
        out.push(s.heading, ...s.items);
        break;
      case "stat":
        out.push(`${s.value} ${s.label}`, s.context ?? "");
        break;
      case "compare":
        out.push(`${s.left.label}: ${s.left.text}`, `${s.right.label}: ${s.right.text}`);
        break;
      case "footage":
        out.push(s.caption ?? "");
        break;
      case "cta":
        out.push(s.text);
        break;
    }
  }
  if (plan.voiceover) out.push(plan.voiceover.text);
  return out.filter(Boolean).join("\n");
}

export function scriptBrief(profile: ClinicProfile, topic: Topic, fixes: string[] = []): string {
  return [
    `An educational ${profile.language} video for the dental clinic "${profile.name}".`,
    `Topic: ${topic.title}. It answers the patient question: "${topic.question}".`,
    `The hook scene's text must be this line, word for word or tightened but never made more generic: "${topic.hook}".`,
    `Include narration exactly in this shape: "voiceover": { "text": "<the full narration, every sentence>", "voice": "nova" } (voice may be "nova" or "onyx"). The text is natural spoken ${profile.language}, same form of address, covering the same points as the screen. It should sound like a friendly dentist talking to one patient: varied sentences, contractions where the language uses them, every sentence adding something new, no word or idea repeated, never list items read out. About 2.3 words per second of video.`,
    `Structure: hook → the answer in 2-4 varied scenes (never two "statement" scenes in a row; use a list or compare at least once) → cta.`,
    `Write every on-screen word in ${profile.language}. Tone: ${profile.tone}. ${addressRule(profile)}`,
    `Accurate, mainstream dental guidance only, hedged where outcomes vary ("can", "usually").`,
    `Never mention prices, discounts, guarantees, "painless", "permanent", "best", before/after results or patient stories.`,
    `Words the reviewers always reject — never use them on screen or in narration: ${AVOID_WORDS[profile.language] ?? AVOID_WORDS.en}.`,
    `Aftercare and instructions: only what dentists normally tell patients for THIS procedure, and say to follow the dentist's own instructions. Do not invent timeframes or extra restrictions. Reference:\n${AFTERCARE_GUIDE}`,
    `Never invent statistics or percentages ("80% of patients…"); say "most people" or leave it out. A number is allowed only for a guideline interval or timeframe (every 6 months, the first 48 hours).`,
    `Include exactly ONE footage scene with stock footage — { "kind": "footage", "source": { "type": "stock", "query": "..." }, "caption": "<one short line of the answer>", "seconds": 3-4 } — placed right after the hook or in the middle, so the video is not only text. The query: 2-4 English words for an object or action you can film (e.g. "teeth whitening tray", "dental floss close up", "child brushing teeth"), never a generic "dentist office" — objects only, no people, no clinic or treatment scenes.`,
    `End with a cta scene inviting the viewer to ask the clinic or book a check-up` +
      (profile.handle ? `. Put "@${profile.handle.replace(/^@/, "")}" only in the cta scene's "handle" field, never inside any text.` : "."),
    `On-screen length limits: hook and every list item and the cta at most 80 characters; other lines at most 200. When a reviewer's fix is longer, shorten it to fit — keep its meaning, not its length.`,
    fixes.length ? `A compliance or clinical reviewer required these changes: ${fixes.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type Review = { verdict: "pass" | "revise" | "block"; issues: { quote: string; problem: string; fix: string }[]; hard?: ComplianceResult["hard"] };

function fixesOf(r: Review): string[] {
  return [
    ...(r.hard ?? []).map((h) => `remove or reword "${h.match}" (${h.why})`),
    ...r.issues.map((i) => `"${i.quote}": ${i.problem} → ${i.fix}`),
  ];
}

export type Checks = { compliance: ComplianceResult; accuracy: AccuracyResult };
type Outcome<T> = ({ ok: true; checks: Checks } & T) | { ok: false; rejected: string[] };

/**
 * Write, then pass both reviewers. Compliance first (cheap, and a hard-rule
 * hit makes the accuracy review moot), then clinical accuracy. Either one's
 * fixes feed the next rewrite; three attempts in all.
 */
async function reviewed<T>(
  deps: WeekDeps,
  label: string,
  topic: Topic,
  /** `previous` is the last draft a reviewer sent back, to be edited rather than redone. */
  write: (fixes: string[], previous?: T) => Promise<T>,
  textOf: (t: T) => string,
  accuracyOf: (t: T) => Promise<AccuracyResult>,
  profile: ClinicProfile,
  /** Deterministic checks run before any reviewer; problems become fixes. */
  check?: (t: T) => string[],
): Promise<Outcome<{ value: T }>> {
  let fixes: string[] = [];
  let previous: T | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const value = await write(fixes, previous);
    previous = value;
    const problems = check?.(value) ?? [];
    if (problems.length) {
      deps.log?.(`${label} structure`, { topic: topic.title, attempt, problems });
      fixes = problems;
      continue;
    }
    const compliance = await reviewCompliance(deps.client, profile, textOf(value));
    deps.log?.(`${label} compliance`, { topic: topic.title, attempt, verdict: compliance.verdict, ...(compliance.verdict === "pass" ? {} : { fixes: fixesOf(compliance) }) });
    if (compliance.verdict === "block") return { ok: false, rejected: fixesOf(compliance) };
    if (compliance.verdict === "revise") {
      fixes = fixesOf(compliance);
      continue;
    }
    const accuracy = await accuracyOf(value);
    deps.log?.(`${label} accuracy`, { topic: topic.title, attempt, verdict: accuracy.verdict, ...(accuracy.verdict === "pass" ? {} : { fixes: fixesOf(accuracy) }) });
    if (accuracy.verdict === "pass") return { ok: true, value, checks: { compliance, accuracy } };
    if (accuracy.verdict === "block") return { ok: false, rejected: fixesOf(accuracy) };
    fixes = fixesOf(accuracy);
  }
  return { ok: false, rejected: fixes };
}

/**
 * A narrated video needs narration that is actually narration. Seen live:
 * { "text": "nova", "voice": "nova" } — the voice name in the text field,
 * which rendered a 0.5-second voiceover over a 24-second video.
 */
export function narrationProblems(plan: ScenePlan): string[] {
  const text = plan.voiceover?.text?.trim() ?? "";
  const words = text.split(/\s+/).filter(Boolean).length;
  const needed = Math.round(totalSeconds(plan) * 1.2);
  if (!text) return ['add "voiceover": { "text": "<full narration>", "voice": "nova" }'];
  if (words < needed)
    return [`voiceover.text has ${words} words; write the full narration (about ${Math.round(totalSeconds(plan) * 2.3)} words) — it must be the spoken script, not a voice name`];
  return [];
}

export async function produceVideo(
  deps: WeekDeps,
  profile: ClinicProfile,
  topic: Topic,
  /** Stock queries already used this week, so no two videos share a shot. */
  usedFootage: Set<string> = new Set(),
): Promise<VideoPackage> {
  const script = await reviewed(
    deps,
    "script",
    topic,
    async (fixes, previous) => {
      // A plan that is still invalid after the planner's own repair round
      // (seen in the eval: a 95-character cta) gets one fresh attempt told
      // exactly what was wrong, instead of losing the topic.
      // A rewrite edits the draft the reviewer saw. Writing from scratch
      // fixed one sentence and introduced new problems elsewhere (eval:
      // most rejections were a third, different objection).
      const brief =
        scriptBrief(profile, topic, fixes) +
        (previous && fixes.length
          ? `\nThis is a revision. Keep the previous version below — its structure, scenes and wording — and change ONLY what the reviewer required:\n${JSON.stringify({ scenes: previous.scenes, voiceover: previous.voiceover })}`
          : "");
      const { plan } = await planFromPrompt({ prompt: brief, aspect: "9:16", model: AGENT_MODEL }, deps.client).catch((err: Error) =>
        planFromPrompt({ prompt: `${brief}\nThe previous attempt was invalid: ${err.message}. Keep every on-screen text well under its limit.`, aspect: "9:16", model: AGENT_MODEL }, deps.client),
      );
      // The planner's voice-over reads like a leaflet; the narrator rewrites
      // it from the screen text alone, so the reviews below still see one story.
      if (!plan.voiceover) return plan;
      const text = await narrate(deps.client, profile, topic, plan, fixes, previous?.voiceover?.text).catch(() => plan.voiceover!.text);
      return { ...plan, voiceover: { ...plan.voiceover, text } };
    },
    planText,
    (plan) => reviewAccuracy(deps.client, profile, topic, { script: planText(plan) }),
    profile,
    narrationProblems,
  );
  if (!script.ok) return { status: "rejected", topic, stage: "script", reasons: script.rejected };

  // The caption is written FROM the approved script, and reviewed against
  // it, so the two cannot disagree (seen live: "age 1" vs "6 months").
  const facts = planText(script.value);
  const post = await reviewed(
    deps,
    "copy",
    topic,
    (fixes) => writePostCopy(deps.client, profile, topic, fixes, facts),
    (c) => `${c.caption}\n${c.hashtags.join(" ")}`,
    (c) => reviewAccuracy(deps.client, profile, topic, { script: facts, caption: c.caption }),
    profile,
  );
  if (!post.ok) return { status: "rejected", topic, stage: "copy", reasons: post.rejected };

  // The dentist will SAY these words on camera, so the card gets the same
  // two reviews as the video. A card that cannot pass is left out; the
  // video itself does not depend on it. (Seen live: a card recommending
  // over-the-counter painkillers without deferring to the dentist.)
  const card = await reviewed(
    deps,
    "shoot card",
    topic,
    (fixes) => writeShootCard(deps.client, profile, topic, fixes),
    shootCardText,
    (c) => reviewAccuracy(deps.client, profile, topic, { script: shootCardText(c) }),
    profile,
  ).catch(() => undefined);
  const shootCard = card?.ok ? card.value : undefined;
  // Painted in the clinic's colour, so the week reads as theirs.
  // Objects only, never people or a clinic in stock footage; no repeats.
  const guarded = guardFootage(script.value, topic.service, usedFootage);
  // Library photos behind the text: 10–20 ranked suggestions are kept for the
  // clinic to choose from; the top few go in by default (dentvid/backgrounds).
  const bgInput = {
    plan: guarded,
    topic: `${topic.title} . ${topic.question} . ${topic.hook}`,
    service: topic.service,
    language: profile.language,
  };
  const suggestedBackgrounds = suggestBackgrounds(bgInput);
  // Only photos about this topic go in by default; with none, the video keeps its plain brand backdrop.
  const relevant = matchingBackgrounds(bgInput);
  const chosen = defaultBackgrounds(suggestedBackgrounds.filter((id) => relevant.has(id)), totalSeconds(guarded)).map(backgroundSrc);
  const safe: ScenePlan = chosen.length ? { ...guarded, backgrounds: chosen } : guarded;
  const branded = profile.brandColor
    ? { ...safe, brandColor: profile.brandColor, ...(profile.brandAccent ? { brandAccent: profile.brandAccent } : {}) }
    : safe;
  const videoPath = deps.render ? await deps.render(branded, topic) : undefined;
  // Measure the render before anyone sees it (silent narration, wrong size,
  // black frames…). A failing video is still delivered, marked with why.
  const qa = videoPath
    ? await inspectVideo(videoPath, { width: 1080, height: 1920, minSec: 8, maxSec: 90, expectAudio: true }).catch(() => undefined)
    : undefined;
  return {
    status: "ready",
    approval: "pending",
    topic,
    plan: safe,
    suggestedBackgrounds,
    copy: post.value,
    checks: { script: script.checks, copy: post.checks },
    shootCard,
    videoPath,
    qa,
  };
}

export async function produceWeek(
  deps: WeekDeps,
  profile: ClinicProfile,
  opts: { count?: number; avoidTitles?: string[] } = {},
): Promise<VideoPackage[]> {
  const want = Math.max(1, opts.count ?? 5);
  // Plan spares: a topic the reviewers reject is replaced, so the clinic
  // still gets the week it pays for instead of a gap.
  const patientSearches = deps.searches ? await deps.searches(profile).catch(() => []) : [];
  deps.log?.("patient searches", { count: patientSearches.length });
  const topics = await sharpenHooks(deps.client, profile, await planWeek(deps.client, profile, { ...opts, count: want + 2, patientSearches }));
  const out: VideoPackage[] = [];
  const usedFootage = new Set<string>();
  // Sequential on purpose: renders are CPU-bound and the agents are cheap.
  for (const topic of topics) {
    if (out.filter((p) => p.status === "ready").length >= want) break;
    // One topic failing (a plan the model could not get valid, a render
    // error) must not cost the clinic the rest of its week.
    try {
      out.push(await produceVideo(deps, profile, topic, usedFootage));
    } catch (e) {
      deps.log?.("topic failed", { topic: topic.title, error: (e as Error).message });
      out.push({ status: "rejected", topic, stage: "script", reasons: [`could not produce: ${(e as Error).message}`] });
    }
  }
  return out;
}
