import type OpenAI from "openai";
import type { z } from "zod";
import { modelParams } from "../lib/model-params.js";
import { DEFAULT_MODELS, llmProvider } from "../lib/text-llm.js";

/**
 * Which models DentVideo's agents run on.
 *
 *   agent   the writers: scene planner, copywriter, shoot card
 *   review  the judgement calls: clinical accuracy, compliance, narrator,
 *           strategist and hook editor
 *
 * On Claude (the default when ANTHROPIC_API_KEY is set, lib/text-llm.ts)
 * both run on claude-sonnet-5-5: the writers at effort "medium", the
 * reviewers at "high", because a wrong clinical or compliance verdict costs
 * more than the thinking. Measured against the OpenAI baseline in "Model
 * choice" in docs/AUTONOMOUS_PLAN.md.
 *
 * With LLM_PROVIDER=openai the OpenAI choice stands (gpt-5.4-mini /
 * gpt-5.4, chosen by the same eval). DENTVID_AGENT_MODEL /
 * DENTVID_REVIEW_MODEL / DENTVID_JUDGE_MODEL override them either way.
 */
export const DEFAULT_AGENT_MODEL = DEFAULT_MODELS.openai.agent;
export const DEFAULT_REVIEW_MODEL = DEFAULT_MODELS.openai.review;

export type Effort = "low" | "medium" | "high";
const effortOf = (v: string | undefined, fallback: Effort): Effort => {
  const e = v?.trim().toLowerCase();
  return e === "low" || e === "medium" || e === "high" ? e : fallback;
};

/**
 * The writers' effort and the reviewers' effort on Claude (ignored by the
 * OpenAI models). DENTVID_AGENT_EFFORT / DENTVID_REVIEW_EFFORT (low, medium,
 * high) change them without a deploy of new code: lower effort means fewer
 * thinking tokens, so a cheaper but less careful video.
 */
export function resolveEfforts(env: Record<string, string | undefined> = process.env): { agent: Effort; review: Effort } {
  return { agent: effortOf(env.DENTVID_AGENT_EFFORT, "medium"), review: effortOf(env.DENTVID_REVIEW_EFFORT, "high") };
}
const efforts = resolveEfforts();
export const AGENT_EFFORT: Effort = efforts.agent;
export const REVIEW_EFFORT: Effort = efforts.review;

export function resolveModels(env: Record<string, string | undefined> = process.env) {
  const pick = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);
  const d = DEFAULT_MODELS[llmProvider(env)];
  return {
    agent: pick(env.DENTVID_AGENT_MODEL, d.agent),
    review: pick(env.DENTVID_REVIEW_MODEL, d.review),
  };
}

/** The eval judge for this provider, or DENTVID_JUDGE_MODEL. */
export function resolveJudge(env: Record<string, string | undefined> = process.env): string {
  return env.DENTVID_JUDGE_MODEL?.trim() || DEFAULT_MODELS[llmProvider(env)].judge;
}

const models = resolveModels();
export const AGENT_MODEL = models.agent;
/** For judgement calls where being wrong is expensive (clinical accuracy). */
export const REVIEW_MODEL = models.review;
/**
 * The eval's judge. Fixed on purpose, independent of the models under test:
 * a judge that changes with the candidate makes scores incomparable.
 */
export const JUDGE_MODEL = resolveJudge();

/**
 * One agent turn: system + user prompt in, JSON validated against `schema`
 * out. A response that fails validation gets exactly one repair round with
 * the validator's message — the same policy as planFromPrompt, for the same
 * reason: one round fixes nearly every real failure, more rounds mostly pay
 * to watch the model fail the same way.
 */
export async function agentJson<S extends z.ZodTypeAny>(
  client: OpenAI,
  args: { system: string; user: string; schema: S; temperature?: number; model?: string; effort?: Effort },
): Promise<z.infer<S>> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: args.system },
    { role: "user", content: args.user },
  ];
  const ask = async () => {
    const model = args.model ?? AGENT_MODEL;
    const res = await client.chat.completions.create({
      model,
      ...modelParams(model, args.temperature ?? 0.5, args.effort ?? AGENT_EFFORT),
      response_format: { type: "json_object" },
      messages,
    });
    return res.choices[0]?.message?.content ?? "{}";
  };

  const raw = await ask();
  const first = args.schema.safeParse(safeJson(raw));
  if (first.success) return first.data;

  messages.push({ role: "assistant", content: raw });
  messages.push({
    role: "user",
    content: `That JSON was rejected: ${first.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ")}. Return the corrected JSON only.`,
  });
  return args.schema.parse(safeJson(await ask()));
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
