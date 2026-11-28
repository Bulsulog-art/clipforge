import Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";

/**
 * The Claude API behind the chat-completions shape the rest of the worker
 * already speaks.
 *
 * Every text caller (dental/llm.ts agentJson, remotion/plan-from-prompt.ts,
 * the ClipForge steps) and every wrapper around them (eval.ts meterClient,
 * dentvid/voice-down.ts gatedClient, the bench) takes a client with
 * `chat.completions.create(body)` and reads `choices[0].message.content` and
 * `usage`. This adapter keeps that contract, so the tests, meters and spend
 * guards stay as they are, and calls Anthropic's Messages API underneath:
 *
 *   messages        system turns become the top-level `system` (cached),
 *                   user/assistant turns pass through in order
 *   model           Claude ids pass through; an OpenAI id still in the code
 *                   maps to the Claude model of the same tier (`claudeModelFor`)
 *   effort          `reasoning_effort` low|medium|high|xhigh|max becomes
 *                   `output_config.effort`; OpenAI-only values ("none",
 *                   "minimal") get the default effort, never less
 *   temperature     dropped: the current models accept only the default
 *   max tokens      thinking counts toward the limit, so a caller's small cap
 *                   (written for a model without thinking) is raised to
 *                   MIN_MAX_TOKENS
 *   json            response_format json_object/json_schema adds a plain
 *                   "one JSON object only" instruction, and the reply is cut
 *                   down to that object (code fences and any stray prose
 *                   removed), so the caller's JSON.parse and its one repair
 *                   round keep working
 *   stop reasons    a refusal, a reply cut off at the token limit or a full
 *                   context window throws ClaudeStopError (with a reason),
 *                   so the caller's existing error handling runs instead of
 *                   parsing half an answer
 *   usage           input (including cache reads and writes) and output
 *                   tokens come back as prompt_tokens / completion_tokens
 */

/** What a Claude model id looks like. */
export const isClaudeModel = (model: string) => /^claude-/.test(model);

/** The three Claude models the worker uses. */
export const CLAUDE = {
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5",
  opus: "claude-opus-5-5",
} as const;

/**
 * An OpenAI id still written somewhere in the code, mapped to the Claude
 * model of the same tier: the small models to Haiku, the old eval judge to
 * Opus, everything else to Sonnet. A Claude id is returned unchanged.
 */
export function claudeModelFor(model: string): string {
  if (isClaudeModel(model)) return model;
  if (/^gpt-4o$/.test(model)) return CLAUDE.opus;
  if (/(mini|nano)\b/.test(model)) return CLAUDE.haiku;
  return CLAUDE.sonnet;
}

export type ClaudeEffort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: readonly string[] = ["low", "medium", "high", "xhigh", "max"];

/** The effort a call gets when it names none (the writers' level; reviewers ask for "high"). */
export function defaultEffort(_model: string): ClaudeEffort {
  return "medium";
}

/**
 * Thinking and the answer share max_tokens. 16000 leaves a reviewer at high
 * effort room to think and still write its JSON, and stays under the size
 * the SDK accepts without streaming.
 */
export const MIN_MAX_TOKENS = 16_000;
export const MAX_MAX_TOKENS = 20_000;

/** Added to the system prompt when the caller asked for JSON. */
export const JSON_INSTRUCTION =
  "Reply with exactly one JSON object and nothing else: no prose before or after it, no markdown code fences.";

export type ClaudeStopReason = "refusal" | "max_tokens" | "model_context_window_exceeded" | "empty";

/** The model stopped without a usable answer. Thrown so the caller's own retry or repair runs. */
export class ClaudeStopError extends Error {
  readonly provider = "Anthropic";
  constructor(
    readonly reason: ClaudeStopReason,
    readonly model: string,
    detail?: string,
  ) {
    super(
      reason === "refusal"
        ? `claude declined the request (${model})${detail ? `: ${detail}` : ""}`
        : reason === "max_tokens"
          ? `claude reply cut off at the token limit (${model})`
          : reason === "model_context_window_exceeded"
            ? `claude context window exceeded (${model})`
            : `claude returned no text (${model})`,
    );
    this.name = "ClaudeStopError";
  }
}

/**
 * The first complete JSON object in a reply: code fences and any text around
 * the object are removed. A reply with no object is returned trimmed, so the
 * caller's parser reports it as it always has.
 */
export function extractJson(text: string): string {
  const t = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  const body = (fenced ? fenced[1] : t).trim();
  const start = body.search(/[{[]/);
  if (start < 0) return body;
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return body.slice(start, i + 1);
  }
  return body.slice(start);
}

type ChatMessage = { role: string; content?: unknown };
type ChatBody = {
  model: string;
  messages: ChatMessage[];
  response_format?: { type?: string } | null;
  reasoning_effort?: string | null;
  max_tokens?: number | null;
  max_completion_tokens?: number | null;
  [k: string]: unknown;
};

/** The part of the Anthropic client the adapter uses (a fake in tests). */
export type MessagesApi = {
  messages: { create(body: Anthropic.MessageCreateParamsNonStreaming, opts?: Anthropic.RequestOptions): Promise<Anthropic.Message> };
};

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((p) => (p && typeof p === "object" && (p as { type?: unknown }).type === "text" ? String((p as { text?: unknown }).text ?? "") : ""))
      .filter(Boolean)
      .join("\n");
  return content == null ? "" : String(content);
}

/** The Messages API request for one chat-completions body. Exported for tests. */
export function toClaudeRequest(body: ChatBody): Anthropic.MessageCreateParamsNonStreaming {
  const model = claudeModelFor(body.model);
  const json = body.response_format?.type === "json_object" || body.response_format?.type === "json_schema";
  const systemParts: string[] = [];
  const messages: Anthropic.MessageParam[] = [];
  for (const m of body.messages ?? []) {
    const text = textOf(m.content);
    if (m.role === "system" || m.role === "developer") {
      if (text.trim()) systemParts.push(text);
      continue;
    }
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (!text.trim()) continue;
    messages.push({ role: m.role, content: text });
  }
  // The Messages API starts with a user turn and must not end on an
  // assistant turn (no prefill on the current models).
  if (!messages.length || messages[0].role !== "user") messages.unshift({ role: "user", content: "Go ahead." });
  if (messages[messages.length - 1].role === "assistant") messages.push({ role: "user", content: "Continue." });
  if (json) systemParts.push(JSON_INSTRUCTION);

  const effortIn = body.reasoning_effort ?? undefined;
  const effort: ClaudeEffort = effortIn && EFFORTS.includes(effortIn) ? (effortIn as ClaudeEffort) : defaultEffort(model);
  const asked = Number(body.max_completion_tokens ?? body.max_tokens ?? 0) || 0;
  const system = systemParts.join("\n\n");
  return {
    model,
    max_tokens: Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, asked)),
    ...(system
      ? { system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }] }
      : {}),
    messages,
    output_config: { effort },
  };
}

/** The chat-completions answer for one Messages API reply. Throws ClaudeStopError when there is no usable answer. */
export function fromClaudeMessage(msg: Anthropic.Message, json: boolean): OpenAI.Chat.ChatCompletion {
  const model = msg.model;
  if (msg.stop_reason === "refusal") {
    const d = (msg as { stop_details?: { category?: string | null; explanation?: string | null } | null }).stop_details;
    throw new ClaudeStopError("refusal", model, [d?.category, d?.explanation].filter(Boolean).join(": ") || undefined);
  }
  if (msg.stop_reason === "max_tokens") throw new ClaudeStopError("max_tokens", model);
  if (msg.stop_reason === "model_context_window_exceeded") throw new ClaudeStopError("model_context_window_exceeded", model);
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new ClaudeStopError("empty", model);
  const content = json ? extractJson(text) : text;
  const u = msg.usage;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const prompt = u.input_tokens + cacheRead + cacheWrite;
  return {
    id: msg.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, finish_reason: "stop", logprobs: null, message: { role: "assistant", content, refusal: null } }],
    usage: {
      prompt_tokens: prompt,
      completion_tokens: u.output_tokens,
      total_tokens: prompt + u.output_tokens,
      prompt_tokens_details: { cached_tokens: cacheRead },
    },
  } as OpenAI.Chat.ChatCompletion;
}

/**
 * An OpenAI-shaped client (only `chat.completions.create`) backed by the
 * Claude API. Typed as OpenAI so it drops into every existing call site.
 */
export function claudeChatClient(api: MessagesApi): OpenAI {
  const create = async (body: ChatBody, opts?: { signal?: AbortSignal; timeout?: number }) => {
    const json = body.response_format?.type === "json_object" || body.response_format?.type === "json_schema";
    const req = toClaudeRequest(body);
    const msg = await api.messages.create(req, opts ? { signal: opts.signal, timeout: opts.timeout } : undefined);
    return fromClaudeMessage(msg, json);
  };
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

/** The real Anthropic client, with the worker's timeout and retries. Reads ANTHROPIC_API_KEY. */
export function anthropicApi(opts: { apiKey?: string; fetch?: typeof fetch } = {}): MessagesApi {
  return new Anthropic({
    ...(opts.apiKey ? { apiKey: opts.apiKey } : {}),
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
    // A reviewer at high effort can think for a minute; 429/5xx/529 are retried by the SDK.
    timeout: 240_000,
    maxRetries: 3,
  });
}

/** Is this error from the Anthropic API (or the adapter on its behalf)? */
export function isAnthropicError(e: unknown): boolean {
  return e instanceof Anthropic.APIError || e instanceof ClaudeStopError;
}
