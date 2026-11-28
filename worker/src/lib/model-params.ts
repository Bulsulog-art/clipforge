/**
 * Sampling parameters a chat model will accept.
 *
 * The gpt-4 family takes any temperature. The gpt-5/gpt-6 reasoning models
 * reject anything but the default temperature and instead take a reasoning
 * effort; which efforts they accept differs by generation (probed against the
 * API on 2026-11-08):
 *   gpt-5, gpt-5-mini, gpt-5-nano  → "minimal" is the lowest
 *   gpt-6.1-*                      → "low" is the lowest
 *   other gpt-5.x / gpt-6 / o*     → "none"
 *   gpt-5.4 family                 → "none", and then temperature works too
 *
 * The lowest effort is used: these are short writing and review jobs, and
 * higher efforts add latency and output tokens (billed) on every call. Not
 * yet measured against higher efforts in the eval.
 */
export type Effort = "none" | "minimal" | "low" | "medium" | "high";

/**
 * Typed for the SDK as temperature only: the installed openai types predate
 * the "none"/"minimal" efforts, but the API accepts them and the extra key
 * travels in the request body unchanged.
 */
export type ModelParams = { temperature?: number };

export function modelParams(model: string, temperature: number | undefined, effort?: "low" | "medium" | "high"): ModelParams {
  return params(model, temperature, effort) as ModelParams;
}

/**
 * Claude models (lib/claude-chat.ts) take no temperature: they accept only
 * the default. They take an effort instead (`reasoning_effort` here, turned
 * into output_config.effort by the adapter): "medium" for the writers unless
 * the caller asks for more (the reviewers ask for "high").
 */
export function params(model: string, temperature: number | undefined, effort?: "low" | "medium" | "high"): { temperature?: number; reasoning_effort?: Effort } {
  if (/^claude-/.test(model)) return { reasoning_effort: effort ?? "medium" };
  if (/^(gpt-4|gpt-3|chatgpt|chat-latest)/.test(model)) return temperature === undefined ? {} : { temperature };
  if (/^gpt-5(-mini|-nano)?(-\d{4}-\d{2}-\d{2})?$/.test(model)) return { reasoning_effort: "minimal" };
  if (/^gpt-6\.1/.test(model)) return { reasoning_effort: "low" };
  if (/^gpt-5\.4/.test(model)) return temperature === undefined ? { reasoning_effort: "none" } : { reasoning_effort: "none", temperature };
  return { reasoning_effort: "none" };
}
