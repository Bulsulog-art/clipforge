import type OpenAI from "openai";
import { planFromPrompt } from "../remotion/plan-from-prompt.js";
import type { ScenePlan } from "../remotion/scene-plan.js";
import { reviewCompliance, type ComplianceResult } from "./compliance.js";
import { writePostCopy, type PostCopy } from "./copywriter.js";
import { addressRule, type ClinicProfile } from "./profile.js";
import { planWeek, type Topic } from "./strategist.js";
import { reviewAccuracy, type AccuracyResult } from "./accuracy.js";
import { shootCardText, writeShootCard, type ShootCard } from "./shoot-card.js";

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
      copy: PostCopy;
      checks: { script: Checks; copy: Checks };
      /** How the dentist can film this topic themselves, in their language. */
      shootCard?: ShootCard;
      videoPath?: string;
    }
  | { status: "rejected"; topic: Topic; stage: "script" | "copy"; reasons: string[] };

export type WeekDeps = {
  client: OpenAI;
  /** Renders a plan to a file and returns its path. Omit to plan only. */
  render?: (plan: ScenePlan, topic: Topic) => Promise<string>;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
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
    `Structure: hook → the answer in 2-4 varied scenes (never two "statement" scenes in a row; use a list or compare at least once) → cta.`,
    `Write every on-screen word in ${profile.language}. Tone: ${profile.tone}. ${addressRule(profile)}`,
    `Accurate, mainstream dental guidance only, hedged where outcomes vary ("can", "usually").`,
    `Never mention prices, discounts, guarantees, "painless", "permanent", "best", before/after results or patient stories.`,
    `Stock footage queries: 2-4 English words specific to THIS topic (e.g. "teeth whitening tray", "dental floss close up", "child toothbrush"), not a generic "dentist office", and never patients' faces in treatment.`,
    `End with a cta scene inviting the viewer to ask the clinic or book a check-up` +
      (profile.handle ? `. Put "@${profile.handle.replace(/^@/, "")}" only in the cta scene's "handle" field, never inside any text.` : "."),
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
  write: (fixes: string[]) => Promise<T>,
  textOf: (t: T) => string,
  accuracyOf: (t: T) => Promise<AccuracyResult>,
  profile: ClinicProfile,
): Promise<Outcome<{ value: T }>> {
  let fixes: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const value = await write(fixes);
    const compliance = await reviewCompliance(deps.client, profile, textOf(value));
    deps.log?.(`${label} compliance`, { topic: topic.title, attempt, verdict: compliance.verdict });
    if (compliance.verdict === "block") return { ok: false, rejected: fixesOf(compliance) };
    if (compliance.verdict === "revise") {
      fixes = fixesOf(compliance);
      continue;
    }
    const accuracy = await accuracyOf(value);
    deps.log?.(`${label} accuracy`, { topic: topic.title, attempt, verdict: accuracy.verdict });
    if (accuracy.verdict === "pass") return { ok: true, value, checks: { compliance, accuracy } };
    if (accuracy.verdict === "block") return { ok: false, rejected: fixesOf(accuracy) };
    fixes = fixesOf(accuracy);
  }
  return { ok: false, rejected: fixes };
}

export async function produceVideo(deps: WeekDeps, profile: ClinicProfile, topic: Topic): Promise<VideoPackage> {
  const script = await reviewed(
    deps,
    "script",
    topic,
    async (fixes) => (await planFromPrompt({ prompt: scriptBrief(profile, topic, fixes), aspect: "9:16" }, deps.client)).plan,
    planText,
    (plan) => reviewAccuracy(deps.client, profile, topic, { script: planText(plan) }),
    profile,
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
  const videoPath = deps.render ? await deps.render(script.value, topic) : undefined;
  return {
    status: "ready",
    approval: "pending",
    topic,
    plan: script.value,
    copy: post.value,
    checks: { script: script.checks, copy: post.checks },
    shootCard,
    videoPath,
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
  const topics = await planWeek(deps.client, profile, { ...opts, count: want + 2 });
  const out: VideoPackage[] = [];
  // Sequential on purpose: renders are CPU-bound and the agents are cheap.
  for (const topic of topics) {
    if (out.filter((p) => p.status === "ready").length >= want) break;
    // One topic failing (a plan the model could not get valid, a render
    // error) must not cost the clinic the rest of its week.
    try {
      out.push(await produceVideo(deps, profile, topic));
    } catch (e) {
      deps.log?.("topic failed", { topic: topic.title, error: (e as Error).message });
      out.push({ status: "rejected", topic, stage: "script", reasons: [`could not produce: ${(e as Error).message}`] });
    }
  }
  return out;
}
