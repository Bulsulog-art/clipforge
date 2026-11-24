import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { gatedClient, isVoiceDownSkip, VOICE_DOWN_MESSAGE, VOICE_DOWN_TOPICS, VoiceDownError, voiceDown, type VoiceTally } from "./voice-down.js";

/**
 * The breaker a week run puts in front of its model client (jobs.ts): once the
 * run's voice is down, no more scripts are paid for. Tested on the real
 * OpenAI SDK with a fetch that never leaves the process.
 */

const completion = {
  id: "chatcmpl-test",
  object: "chat.completion",
  created: 0,
  model: "test-model",
  choices: [{ index: 0, message: { role: "assistant", content: '{"ok":true}', refusal: null }, finish_reason: "stop", logprobs: null }],
};

function sdk() {
  const requests: string[] = [];
  const fetchImpl = async (url: unknown) => {
    requests.push(String(url));
    return new Response(JSON.stringify(completion), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new OpenAI({ apiKey: "x", fetch: fetchImpl as never, maxRetries: 0 });
  return { client, requests };
}

const ask = (c: OpenAI) => c.chat.completions.create({ model: "test-model", messages: [{ role: "user", content: "hi" }] });

describe("gatedClient", () => {
  it("while the voice is up, calls go through the real SDK untouched", async () => {
    const { client, requests } = sdk();
    const c = gatedClient(client, () => false);
    expect(c).toBeInstanceOf(OpenAI);
    const r = await ask(c);
    expect(r.choices[0].message.content).toBe('{"ok":true}');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatch(/\/chat\/completions$/);
    // Plain values come through as they are.
    expect(c.apiKey).toBe("x");
  });

  it("once it is down, every call is refused before it reaches the provider, and nothing is paid", async () => {
    const { client, requests } = sdk();
    let down = false;
    const c = gatedClient(client, () => down);
    await ask(c);
    down = true;
    await expect(ask(c)).rejects.toBeInstanceOf(VoiceDownError);
    // Also a call chained without await (a rejected promise, never a throw out of the call itself).
    const p = c.chat.completions.create({ model: "test-model", messages: [] });
    await expect(p).rejects.toThrow(VOICE_DOWN_MESSAGE);
    expect(requests).toHaveLength(1);
  });

  it("the breaker is read at each call: a run that finds its voice again goes on", async () => {
    const { client, requests } = sdk();
    let down = true;
    const c = gatedClient(client, () => down);
    await expect(ask(c)).rejects.toBeInstanceOf(VoiceDownError);
    down = false;
    await ask(c);
    expect(requests).toHaveLength(1);
  });
});

describe("voiceDown", () => {
  const tally = (ok: number, topics: string[]): VoiceTally => ({ ok, failedTopics: new Set(topics) });

  it(`needs ${VOICE_DOWN_TOPICS} different topics failing and none working`, () => {
    expect(VOICE_DOWN_TOPICS).toBe(2);
    expect(voiceDown(tally(0, []))).toBe(false);
    // One topic whose own text the voice cannot say: the rest of the week still gets its chance.
    expect(voiceDown(tally(0, ["a"]))).toBe(false);
    expect(voiceDown(tally(0, ["a", "b"]))).toBe(true);
    // A narration that worked this run: the voice is up, whatever failed.
    expect(voiceDown(tally(1, ["a", "b", "c"]))).toBe(false);
  });

  it("a skipped topic is recognised from the error or from the message week.ts keeps", () => {
    expect(isVoiceDownSkip(new VoiceDownError())).toBe(true);
    expect(isVoiceDownSkip(new VoiceDownError().message)).toBe(true);
    expect(isVoiceDownSkip({ message: `wrapped: ${VOICE_DOWN_MESSAGE}` })).toBe(true);
    expect(isVoiceDownSkip(new Error("narration failed: openai tts failed (500)"))).toBe(false);
    expect(isVoiceDownSkip(undefined)).toBe(false);
  });
});
