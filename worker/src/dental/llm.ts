import type OpenAI from "openai";
import type { z } from "zod";
import { modelParams } from "../lib/model-params.js";

/**
 * Which models DentVideo's agents run on, chosen by measurement: see "Model
 * choice" in docs/AUTONOMOUS_PLAN.md. Over two eval runs (24 videos each)
 * gpt-5.4-mini/gpt-5.4 kept ready rate and hook score level with
 * gpt-4o-mini/gpt-4o, raised the first-pass rate from 67% to 88% and the
 * voice score from 3.48 to 4.09, for about one cent more per video.
 *
 *   agent   the writers: scene planner, copywriter, shoot card
 *   review  the judgement calls: clinical accuracy, compliance, narrator,
 *           strategist and hook editor
 *
 * DENTVID_AGENT_MODEL / DENTVID_REVIEW_MODEL override them (for the eval, or
 * to roll back without a deploy of new code).
 */
export const DEFAULT_AGENT_MODEL = "gpt-5.4-mini";
export const DEFAULT_REVIEW_MODEL = "gpt-5.4";

export function resolveModels(env: Record<string, string | undefined> = process.env) {
  const pick = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);
  return {
    agent: pick(env.DENTVID_AGENT_MODEL, DEFAULT_AGENT_MODEL),
    review: pick(env.DENTVID_REVIEW_MODEL, DEFAULT_REVIEW_MODEL),
  };
}

const models = resolveModels();
export const AGENT_MODEL = models.agent;
/** For judgement calls where being wrong is expensive (clinical accuracy). */
export const REVIEW_MODEL = models.review;
/**
 * The eval's judge. Fixed on purpose, independent of the models under test:
 * a judge that changes with the candidate makes scores incomparable.
 */
export const JUDGE_MODEL = process.env.DENTVID_JUDGE_MODEL?.trim() || "gpt-4o";

/**
 * One agent turn: system + user prompt in, JSON validated against `schema`
 * out. A response that fails validation gets exactly one repair round with
 * the validator's message — the same policy as planFromPrompt, for the same
 * reason: one round fixes nearly every real failure, more rounds mostly pay
 * to watch the model fail the same way.
 */
export async function agentJson<S extends z.ZodTypeAny>(
  client: OpenAI,
  args: { system: string; user: string; schema: S; temperature?: number; model?: string },
): Promise<z.infer<S>> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: args.system },
    { role: "user", content: args.user },
  ];
  const ask = async () => {
    const model = args.model ?? AGENT_MODEL;
    const res = await client.chat.completions.create({
      model,
      ...modelParams(model, args.temperature ?? 0.5),
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
