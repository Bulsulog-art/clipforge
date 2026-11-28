import type OpenAI from "openai";
import type { z } from "zod";
import { modelParams } from "../lib/model-params.js";
import { DEFAULT_MODELS, llmProvider } from "../lib/text-llm.js";
import { ClaudeStopError, isClaudeModel, MAX_MAX_TOKENS } from "../lib/claude-chat.js";

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
 * DENTVID_REVIEW_MODEL / DENTVID_JUDGE_MODEL override them, with a model of
 * the provider in use: on Claude an OpenAI id there is ignored (and logged).
 */
export const DEFAULT_AGENT_MODEL = DEFAULT_MODELS.openai.agent;
export const DEFAULT_REVIEW_MODEL = DEFAULT_MODELS.openai.review;

export type Effort = "low" | "medium" | "high";
const LOWER_EFFORT: Record<Effort, Effort> = { high: "medium", medium: "low", low: "low" };
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

type Env = Record<string, string | undefined>;

/**
 * An override from DENTVID_*_MODEL, if it fits the provider. On Claude an
 * OpenAI id left in Coolify from before (gpt-5.4-mini, gpt-4o) is ignored and
 * the role keeps its Claude default: mapped by tier it would quietly move the
 * writers to the small model and drop the reviewers' effort. Returns the
 * ignored id too, so it can be logged.
 */
function override(v: string | undefined, fallback: string, env: Env): { model: string; ignored?: string } {
  const asked = v?.trim();
  if (!asked) return { model: fallback };
  if (llmProvider(env) === "anthropic" && !isClaudeModel(asked)) return { model: fallback, ignored: asked };
  return { model: asked };
}

/** The OpenAI ids set in DENTVID_*_MODEL that are ignored because text runs on Claude. */
export function ignoredModelOverrides(env: Env = process.env): string[] {
  const d = DEFAULT_MODELS[llmProvider(env)];
  return [
    ["DENTVID_AGENT_MODEL", d.agent],
    ["DENTVID_REVIEW_MODEL", d.review],
    ["DENTVID_JUDGE_MODEL", d.judge],
  ].flatMap(([name, fallback]) => {
    const o = override(env[name], fallback, env);
    return o.ignored ? [`${name}=${o.ignored}`] : [];
  });
}

export function resolveModels(env: Env = process.env) {
  const d = DEFAULT_MODELS[llmProvider(env)];
  return {
    agent: override(env.DENTVID_AGENT_MODEL, d.agent, env).model,
    review: override(env.DENTVID_REVIEW_MODEL, d.review, env).model,
  };
}

/** The eval judge for this provider, or DENTVID_JUDGE_MODEL. */
export function resolveJudge(env: Env = process.env): string {
  return override(env.DENTVID_JUDGE_MODEL, DEFAULT_MODELS[llmProvider(env)].judge, env).model;
}

const ignored = ignoredModelOverrides();
if (ignored.length)
  console.warn(`dentvid: text runs on Claude, so these OpenAI model overrides are ignored and the Claude defaults are used: ${ignored.join(", ")}. Remove them, or set LLM_PROVIDER=openai.`);

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
  const effort = args.effort ?? AGENT_EFFORT;
  const once = async (e: Effort, maxTokens?: number) => {
    const model = args.model ?? AGENT_MODEL;
    const res = await client.chat.completions.create({
      model,
      ...modelParams(model, args.temperature ?? 0.5, e),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      response_format: { type: "json_object" },
      messages,
    });
    return res.choices[0]?.message?.content ?? "{}";
  };
  // A Claude reply cut off at the token limit (it thought too long) gets one
  // more try with the largest budget and one step less effort, the way a
  // truncated reply used to get the JSON repair round.
  const ask = async () => {
    try {
      return await once(effort);
    } catch (e) {
      if (!(e instanceof ClaudeStopError) || e.reason !== "max_tokens") throw e;
      return once(LOWER_EFFORT[effort], MAX_MAX_TOKENS);
    }
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
