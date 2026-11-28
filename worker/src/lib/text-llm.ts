import OpenAI from "openai";
import { anthropicApi, CLAUDE, claudeChatClient } from "./claude-chat.js";

/**
 * Which provider writes and checks text, and the one place a text client is
 * made. Voice (steps/tts.ts) and transcription (steps/transcribe.ts) stay on
 * OpenAI and do not come through here.
 *
 *   LLM_PROVIDER=anthropic  Claude (the default when ANTHROPIC_API_KEY is set)
 *   LLM_PROVIDER=openai     the OpenAI models as before (the default without
 *                           an Anthropic key): a rollback without new code
 */
export type LlmProvider = "anthropic" | "openai";
type Env = Record<string, string | undefined>;

export function llmProvider(env: Env = process.env): LlmProvider {
  const asked = env.LLM_PROVIDER?.trim().toLowerCase();
  if (asked === "openai" || asked === "anthropic") return asked;
  return env.ANTHROPIC_API_KEY?.trim() ? "anthropic" : "openai";
}

/** The provider's display name, as provider-health.ts and the owner alerts call it. */
export const providerName = (p: LlmProvider) => (p === "anthropic" ? "Anthropic" : "OpenAI");

/**
 * The default models per role and provider. The DentVideo writers are the
 * scene planner, copywriter and shoot card; the reviewers are clinical
 * accuracy, compliance, narrator, strategist and hook editor; the judge
 * scores the eval and is fixed, whatever the candidates are; ClipForge is
 * the older app's high-volume steps (moment scoring, caption translation,
 * trend snapshots, prompt-to-video plans).
 */
export const DEFAULT_MODELS: Record<LlmProvider, { agent: string; review: string; judge: string; clipforge: string }> = {
  anthropic: { agent: CLAUDE.sonnet, review: CLAUDE.sonnet, judge: CLAUDE.opus, clipforge: CLAUDE.haiku },
  openai: { agent: "gpt-5.4-mini", review: "gpt-5.4", judge: "gpt-4o", clipforge: "gpt-4o-mini" },
};

/** The model for ClipForge's text steps under the current provider. */
export function clipforgeModel(env: Env = process.env): string {
  return DEFAULT_MODELS[llmProvider(env)].clipforge;
}

/** Behind an HTTPS proxy (NODE_USE_ENV_PROXY=1) Node's own fetch honours HTTPS_PROXY; the OpenAI SDK's bundled one does not. */
const proxyFetch = (env: Env) => (env.NODE_USE_ENV_PROXY ? (globalThis.fetch as typeof fetch) : undefined);

/**
 * An OpenAI-shaped text client (`chat.completions.create`) for the current
 * provider. `fetch` is passed to either SDK (the eval and bench run behind a
 * proxy).
 */
export function textClient(opts: { env?: Env; fetch?: typeof fetch } = {}): OpenAI {
  const env = opts.env ?? process.env;
  const f = opts.fetch ?? proxyFetch(env);
  if (llmProvider(env) === "anthropic") return claudeChatClient(anthropicApi({ fetch: f }));
  return new OpenAI({ apiKey: env.OPENAI_API_KEY, ...(f ? { fetch: f as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>["fetch"] } : {}) });
}
