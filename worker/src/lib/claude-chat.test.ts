import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import {
  claudeChatClient,
  claudeModelFor,
  ClaudeStopError,
  extractJson,
  fromClaudeMessage,
  JSON_INSTRUCTION,
  MAX_MAX_TOKENS,
  MIN_MAX_TOKENS,
  toClaudeRequest,
  type MessagesApi,
} from "./claude-chat.js";
import { clipforgeModel, DEFAULT_MODELS, llmProvider, textClient } from "./text-llm.js";
import { agentJson } from "../dental/llm.js";
import { meterClient, spendCap, type Usage } from "../dental/eval.js";
import { gatedClient, VoiceDownError } from "../dentvid/voice-down.js";
import { z } from "zod";

/**
 * The Claude adapter: the chat-completions shape every text caller uses,
 * backed by Anthropic's Messages API. The Anthropic client is a fake; no
 * network.
 */

function reply(text: string, over: Partial<Anthropic.Message> = {}): Anthropic.Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content: [
      { type: "thinking", thinking: "", signature: "sig" } as unknown as Anthropic.ContentBlock,
      { type: "text", text, citations: null } as Anthropic.TextBlock,
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 40, cache_read_input_tokens: 30, cache_creation_input_tokens: 20 } as Anthropic.Usage,
    ...over,
  } as Anthropic.Message;
}

function fakeApi(...answers: (Anthropic.Message | Error)[]) {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const api: MessagesApi = {
    messages: {
      create: vi.fn(async (body: Anthropic.MessageCreateParamsNonStreaming) => {
        calls.push(body);
        const a = answers[Math.min(calls.length - 1, answers.length - 1)];
        if (a instanceof Error) throw a;
        return a;
      }),
    },
  };
  return { api, calls };
}

describe("request mapping", () => {
  it("moves system turns to the top-level system, keeps user/assistant order, drops temperature", () => {
    const req = toClaudeRequest({
      model: "claude-sonnet-5-5",
      temperature: 0.7,
      messages: [
        { role: "system", content: "You write scene plans." },
        { role: "user", content: "a video about flossing" },
        { role: "assistant", content: '{"bad":true}' },
        { role: "user", content: "That was rejected. Fix it." },
      ],
    });
    expect(req.model).toBe("claude-sonnet-5-5");
    expect(req.system).toEqual([{ type: "text", text: "You write scene plans.", cache_control: { type: "ephemeral" } }]);
    expect(req.messages).toEqual([
      { role: "user", content: "a video about flossing" },
      { role: "assistant", content: '{"bad":true}' },
      { role: "user", content: "That was rejected. Fix it." },
    ]);
    expect(req).not.toHaveProperty("temperature");
    expect(req).not.toHaveProperty("top_p");
  });

  it("adds the JSON instruction only when the caller asked for JSON", () => {
    const json = toClaudeRequest({ model: "claude-haiku-5-5", response_format: { type: "json_object" }, messages: [{ role: "system", content: "S" }, { role: "user", content: "U" }] });
    expect((json.system as Anthropic.TextBlockParam[])[0].text).toBe(`S\n\n${JSON_INSTRUCTION}`);
    const plain = toClaudeRequest({ model: "claude-haiku-5-5", messages: [{ role: "system", content: "S" }, { role: "user", content: "U" }] });
    expect((plain.system as Anthropic.TextBlockParam[])[0].text).toBe("S");
  });

  it("joins text parts and never sends an assistant turn last or first", () => {
    const req = toClaudeRequest({
      model: "claude-sonnet-5-5",
      messages: [
        { role: "assistant", content: "earlier" },
        { role: "user", content: [{ type: "text", text: "one" }, { type: "text", text: "two" }] },
        { role: "assistant", content: "draft" },
      ],
    });
    expect(req.messages[0].role).toBe("user");
    expect(req.messages[2]).toEqual({ role: "user", content: "one\ntwo" });
    expect(req.messages.at(-1)?.role).toBe("user");
  });

  it("maps reasoning_effort to output_config.effort; OpenAI-only levels get the default, never low", () => {
    const at = (e?: string) => toClaudeRequest({ model: "claude-sonnet-5-5", reasoning_effort: e, messages: [{ role: "user", content: "x" }] }).output_config;
    expect(at("high")).toEqual({ effort: "high" });
    expect(at("medium")).toEqual({ effort: "medium" });
    expect(at("none")).toEqual({ effort: "medium" });
    expect(at("minimal")).toEqual({ effort: "medium" });
    expect(at(undefined)).toEqual({ effort: "medium" });
  });

  it("raises a small token cap to leave room for thinking, keeps a larger one", () => {
    const cap = (n?: number) => toClaudeRequest({ model: "claude-sonnet-5-5", max_completion_tokens: n, messages: [{ role: "user", content: "x" }] }).max_tokens;
    expect(cap(1600)).toBe(MIN_MAX_TOKENS);
    expect(cap(undefined)).toBe(MIN_MAX_TOKENS);
    expect(cap(18_000)).toBe(18_000);
    expect(cap(500_000)).toBeLessThanOrEqual(20_000);
  });
});

describe("model mapping", () => {
  it("passes Claude ids through and maps OpenAI ids by tier", () => {
    expect(claudeModelFor("claude-opus-5-5")).toBe("claude-opus-5-5");
    expect(claudeModelFor("claude-haiku-5-5")).toBe("claude-haiku-5-5");
    expect(claudeModelFor("gpt-4o-mini")).toBe("claude-haiku-5-5");
    expect(claudeModelFor("gpt-5.4-mini")).toBe("claude-haiku-5-5");
    expect(claudeModelFor("gpt-5.4")).toBe("claude-sonnet-5-5");
    expect(claudeModelFor("gpt-4o")).toBe("claude-opus-5-5");
  });
});

describe("JSON extraction", () => {
  it("strips code fences and prose around the object", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(extractJson('Here you go:\n{"a":{"b":[1,2]}}\nHope that helps.')).toBe('{"a":{"b":[1,2]}}');
    expect(extractJson('{"t":"a } inside a string \\" and"} trailing')).toBe('{"t":"a } inside a string \\" and"}');
  });

  it("leaves a reply without an object for the caller's parser to reject", () => {
    expect(extractJson("  no json here  ")).toBe("no json here");
  });
});

describe("response mapping", () => {
  it("returns the text, skipping thinking blocks, and maps usage with cache tokens", () => {
    const r = fromClaudeMessage(reply('```json\n{"ok":true}\n```'), true);
    expect(r.choices[0].message.content).toBe('{"ok":true}');
    expect(r.model).toBe("claude-sonnet-5-5");
    expect(r.usage).toMatchObject({ prompt_tokens: 150, completion_tokens: 40, total_tokens: 190, prompt_tokens_details: { cached_tokens: 30 } });
  });

  it("returns plain text untouched when JSON was not asked for", () => {
    expect(fromClaudeMessage(reply("Hello {not json}"), false).choices[0].message.content).toBe("Hello {not json}");
  });

  it("throws a clear error on a refusal, a cut-off reply, a full context or no text", () => {
    const refusal = reply("", { stop_reason: "refusal", ...({ stop_details: { category: "bio", explanation: "x" } } as object) });
    expect(() => fromClaudeMessage(refusal, true)).toThrow(ClaudeStopError);
    expect(() => fromClaudeMessage(refusal, true)).toThrow(/declined.*bio/);
    expect(() => fromClaudeMessage(reply('{"a":', { stop_reason: "max_tokens" }), true)).toThrow(/cut off/);
    expect(() => fromClaudeMessage(reply("x", { stop_reason: "model_context_window_exceeded" }), true)).toThrow(/context window/);
    expect(() => fromClaudeMessage(reply("   "), true)).toThrow(/no text/);
  });
});

describe("the adapter as a client", () => {
  it("drives agentJson through its one repair round", async () => {
    const { api, calls } = fakeApi(reply('{"n":"x"}'), reply('```json\n{"n":3}\n```'));
    const out = await agentJson(claudeChatClient(api), {
      system: "Return { n }",
      user: "go",
      schema: z.object({ n: z.number() }),
      model: "claude-sonnet-5-5",
      effort: "high",
    });
    expect(out).toEqual({ n: 3 });
    expect(calls).toHaveLength(2);
    expect(calls[0].output_config).toEqual({ effort: "high" });
    // The rejected answer and the validator's message are sent back on the repair call.
    expect(calls[1].messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(String(calls[1].messages[2].content)).toMatch(/rejected/);
  });

  it("a reply cut off at the token limit gets one more try with the largest budget and one step less effort", async () => {
    const { api, calls } = fakeApi(reply("{\"n\":", { stop_reason: "max_tokens" }), reply('{"n":3}'));
    const out = await agentJson(claudeChatClient(api), { system: "s", user: "u", schema: z.object({ n: z.number() }), model: "claude-sonnet-5-5", effort: "high" });
    expect(out).toEqual({ n: 3 });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ max_tokens: MIN_MAX_TOKENS, output_config: { effort: "high" } });
    expect(calls[1]).toMatchObject({ max_tokens: MAX_MAX_TOKENS, output_config: { effort: "medium" } });
  });

  it("cut off twice: the video fails with the stop error, after exactly one extra try", async () => {
    const cut = () => reply("{", { stop_reason: "max_tokens" });
    const { api, calls } = fakeApi(cut(), cut(), cut());
    await expect(agentJson(claudeChatClient(api), { system: "s", user: "u", schema: z.object({}), model: "claude-sonnet-5-5", effort: "medium" })).rejects.toThrow(/cut off at the token limit/);
    expect(calls).toHaveLength(2);
    expect(calls[1].output_config).toEqual({ effort: "low" });
  });

  it("lets a refusal surface as an error, not as an empty JSON object", async () => {
    const { api } = fakeApi(reply("", { stop_reason: "refusal" }));
    await expect(agentJson(claudeChatClient(api), { system: "s", user: "u", schema: z.object({}), model: "claude-sonnet-5-5" })).rejects.toThrow(ClaudeStopError);
  });

  it("passes API errors through untouched (the SDK already retried them)", async () => {
    const err = Object.assign(new Error("credit balance is too low"), { status: 400 });
    const { api } = fakeApi(err);
    await expect(claudeChatClient(api).chat.completions.create({ model: "claude-sonnet-5-5", messages: [{ role: "user", content: "x" }] })).rejects.toBe(err);
  });

  it("is metered by the eval's meter under the model that really ran, and capped", async () => {
    const { api } = fakeApi(reply('{"a":1}', { model: "claude-haiku-5-5", usage: { input_tokens: 1_000_000, output_tokens: 0 } as Anthropic.Usage }));
    const usage: Usage = {};
    const cap = spendCap(0.15, usage);
    const client = meterClient(claudeChatClient(api), usage, (m) => cap.check(m));
    await client.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: "x" }] });
    expect(usage["claude-haiku-5-5"]).toEqual({ calls: 1, input: 1_000_000, output: 0 });
    expect(cap.total()).toBe(0.1);
    await client.chat.completions.create({ model: "claude-haiku-5-5", messages: [{ role: "user", content: "x" }] });
    await expect(client.chat.completions.create({ model: "claude-haiku-5-5", messages: [{ role: "user", content: "x" }] })).rejects.toThrow(/spend cap/);
  });

  it("is stopped by the voice-down breaker before any call", async () => {
    const { api, calls } = fakeApi(reply("{}"));
    const client = gatedClient(claudeChatClient(api), () => true);
    await expect(client.chat.completions.create({ model: "claude-sonnet-5-5", messages: [{ role: "user", content: "x" }] })).rejects.toThrow(VoiceDownError);
    expect(calls).toHaveLength(0);
  });
});

describe("provider switch (LLM_PROVIDER)", () => {
  it("defaults to Claude when an Anthropic key is set, else OpenAI", () => {
    expect(llmProvider({ ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
    expect(llmProvider({})).toBe("openai");
    expect(llmProvider({ ANTHROPIC_API_KEY: "  " })).toBe("openai");
  });

  it("rolls back to OpenAI with LLM_PROVIDER=openai, even with an Anthropic key", () => {
    expect(llmProvider({ ANTHROPIC_API_KEY: "k", LLM_PROVIDER: "openai" })).toBe("openai");
    expect(llmProvider({ LLM_PROVIDER: " Anthropic " })).toBe("anthropic");
    expect(llmProvider({ ANTHROPIC_API_KEY: "k", LLM_PROVIDER: "nonsense" })).toBe("anthropic");
  });

  it("picks the ClipForge model for the provider", () => {
    expect(clipforgeModel({ ANTHROPIC_API_KEY: "k" })).toBe("claude-haiku-5-5");
    expect(clipforgeModel({ ANTHROPIC_API_KEY: "k", LLM_PROVIDER: "openai" })).toBe("gpt-4o-mini");
    expect(DEFAULT_MODELS.anthropic).toEqual({ agent: "claude-sonnet-5-5", review: "claude-sonnet-5-5", judge: "claude-opus-5-5", clipforge: "claude-haiku-5-5" });
  });

  it("builds the Claude adapter or a real OpenAI client", () => {
    const claude = textClient({ env: { ANTHROPIC_API_KEY: "test-key" } });
    expect(typeof claude.chat.completions.create).toBe("function");
    expect(claude.constructor.name).not.toBe("OpenAI");
    const openai = textClient({ env: { ANTHROPIC_API_KEY: "test-key", LLM_PROVIDER: "openai", OPENAI_API_KEY: "x" } });
    expect(openai.constructor.name).toBe("OpenAI");
  });
});
