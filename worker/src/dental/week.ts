import type OpenAI from "openai";
import { planFromPrompt } from "../remotion/plan-from-prompt.js";
import type { ScenePlan } from "../remotion/scene-plan.js";
import { reviewCompliance, type ComplianceResult } from "./compliance.js";
import { writePostCopy, type PostCopy } from "./copywriter.js";
import type { ClinicProfile } from "./profile.js";
import { planWeek, type Topic } from "./strategist.js";

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
      topic: Topic;
      plan: ScenePlan;
      copy: PostCopy;
      checks: { script: ComplianceResult; copy: ComplianceResult };
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
    `Open with this hook (you may tighten it): "${topic.hook}".`,
    `Write every on-screen word in ${profile.language}. Tone: ${profile.tone}.`,
    `Accurate, mainstream dental guidance only, hedged where outcomes vary ("can", "usually").`,
    `Never mention prices, discounts, guarantees, "painless", "permanent", "best", before/after results or patient stories.`,
    `Stock footage queries must be generic (e.g. "dentist office", "toothbrush close up"), never patients' faces in treatment.`,
    `End with a cta scene inviting the viewer to ask the clinic or book a check-up` +
      (profile.handle ? `, with handle "@${profile.handle.replace(/^@/, "")}".` : "."),
    fixes.length ? `A compliance reviewer required these changes: ${fixes.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function fixesOf(r: ComplianceResult): string[] {
  return [
    ...r.hard.map((h) => `remove or reword "${h.match}" (${h.why})`),
    ...r.issues.map((i) => `"${i.quote}": ${i.problem} → ${i.fix}`),
  ];
}

type Outcome<T> = ({ ok: true; check: ComplianceResult } & T) | { ok: false; rejected: string[] };

async function scriptFor(deps: WeekDeps, profile: ClinicProfile, topic: Topic): Promise<Outcome<{ plan: ScenePlan }>> {
  let fixes: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const { plan } = await planFromPrompt(
      { prompt: scriptBrief(profile, topic, fixes), aspect: "9:16" },
      deps.client,
    );
    const check = await reviewCompliance(deps.client, profile, planText(plan));
    deps.log?.("script reviewed", { topic: topic.title, attempt, verdict: check.verdict });
    if (check.verdict === "pass") return { ok: true, plan, check };
    if (check.verdict === "block") return { ok: false, rejected: fixesOf(check) };
    fixes = fixesOf(check);
  }
  return { ok: false, rejected: fixes };
}

async function copyFor(deps: WeekDeps, profile: ClinicProfile, topic: Topic): Promise<Outcome<{ copy: PostCopy }>> {
  let fixes: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const copy = await writePostCopy(deps.client, profile, topic, fixes);
    const check = await reviewCompliance(deps.client, profile, `${copy.caption}\n${copy.hashtags.join(" ")}`);
    deps.log?.("copy reviewed", { topic: topic.title, attempt, verdict: check.verdict });
    if (check.verdict === "pass") return { ok: true, copy, check };
    if (check.verdict === "block") return { ok: false, rejected: fixesOf(check) };
    fixes = fixesOf(check);
  }
  return { ok: false, rejected: fixes };
}

export async function produceVideo(deps: WeekDeps, profile: ClinicProfile, topic: Topic): Promise<VideoPackage> {
  const script = await scriptFor(deps, profile, topic);
  if (!script.ok) return { status: "rejected", topic, stage: "script", reasons: script.rejected };

  const post = await copyFor(deps, profile, topic);
  if (!post.ok) return { status: "rejected", topic, stage: "copy", reasons: post.rejected };

  const videoPath = deps.render ? await deps.render(script.plan, topic) : undefined;
  return {
    status: "ready",
    topic,
    plan: script.plan,
    copy: post.copy,
    checks: { script: script.check, copy: post.check },
    videoPath,
  };
}

export async function produceWeek(
  deps: WeekDeps,
  profile: ClinicProfile,
  opts: { count?: number; avoidTitles?: string[] } = {},
): Promise<VideoPackage[]> {
  const topics = await planWeek(deps.client, profile, opts);
  const out: VideoPackage[] = [];
  // Sequential on purpose: renders are CPU-bound and the agents are cheap.
  for (const topic of topics) out.push(await produceVideo(deps, profile, topic));
  return out;
}
