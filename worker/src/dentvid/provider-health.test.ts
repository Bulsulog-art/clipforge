import { describe, expect, it, vi } from "vitest";
import { MemoryOpsStore } from "./ops-alert.js";
import Anthropic from "@anthropic-ai/sdk";
import { PROVIDER_DOWN_KEY, clearProviderDown, dailyProviderCheck, noteProviderRefused, preflight, probeAnthropic, probeElevenLabs, probeOpenAI, providerOfError, weekProviders } from "./provider-health.js";

// No network: every provider answer is a fake fetch. Only free endpoints are ever asked for.
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
const ENV = { OPENAI_API_KEY: "sk-test" };

describe("provider pre-flight (free endpoints only)", () => {
  it("OpenAI: asks only GET /v1/models; 200 is fine", async () => {
    const f = answer(200, { data: [] });
    expect(await probeOpenAI(ENV, f as never)).toEqual({ state: "ok" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/models");
    expect(init.method).toBe("GET");
  });

  it("OpenAI: a bad key, a deactivated account or an exhausted quota is a refusal", async () => {
    expect((await probeOpenAI(ENV, answer(401, { error: { code: "invalid_api_key" } }) as never)).state).toBe("refused");
    expect((await probeOpenAI(ENV, answer(403, { error: { code: "account_deactivated" } }) as never)).state).toBe("refused");
    expect((await probeOpenAI(ENV, answer(429, { error: { code: "insufficient_quota", type: "insufficient_quota" } }) as never)).state).toBe("refused");
    expect((await probeOpenAI({}, answer(200, {}) as never)).state).toBe("refused");
  });

  it("OpenAI: a rate limit, a 5xx or no network is 'unknown', never a refusal (a probe must not hold a week up)", async () => {
    expect((await probeOpenAI(ENV, answer(429, { error: { code: "rate_limit_exceeded" } }) as never)).state).toBe("unknown");
    expect((await probeOpenAI(ENV, answer(503, {}) as never)).state).toBe("unknown");
    expect((await probeOpenAI(ENV, vi.fn(async () => { throw new Error("fetch failed"); }) as never)).state).toBe("unknown");
  });

  it("a refusal seen on a real call is remembered (out of credit does not show on /v1/models) and blocks the next week before it spends", async () => {
    const store = new MemoryOpsStore();
    const err = Object.assign(new Error("429 You exceeded your current quota"), { status: 429, code: "insufficient_quota" });
    await noteProviderRefused(store, "OpenAI", err);
    const f = answer(200, { data: [] });
    const r = await preflight(store, ENV, f as never);
    expect(r).toMatchObject({ ok: false, provider: "OpenAI" });
    expect(f).not.toHaveBeenCalled();
    await clearProviderDown(store, "OpenAI");
    expect(await preflight(store, ENV, f as never)).toEqual({ ok: true });
  });

  it("a passing error (rate limit, timeout) is not remembered", async () => {
    const store = new MemoryOpsStore();
    await noteProviderRefused(store, "OpenAI", Object.assign(new Error("Rate limit reached for requests"), { status: 429 }));
    expect(await store.get(PROVIDER_DOWN_KEY("OpenAI"))).toBeNull();
  });

  it("ElevenLabs: checked only when it narrates; used-up characters is a refusal, but it falls back to OpenAI", async () => {
    expect(await probeElevenLabs({}, answer(200, {}) as never)).toEqual({ state: "ok" });
    const on = { DENTVID_TTS_PROVIDER: "elevenlabs", ELEVENLABS_API_KEY: "k" };
    const used = answer(200, { character_count: 100_000, character_limit: 100_000 });
    expect((await probeElevenLabs(on, used as never)).state).toBe("refused");
    expect((used.mock.calls[0] as unknown as [string])[0]).toBe("https://api.elevenlabs.io/v1/user/subscription");
    expect((await probeElevenLabs(on, answer(200, { character_count: 10, character_limit: 100_000 }) as never)).state).toBe("ok");
    const found = await dailyProviderCheck(null, { ...ENV, ...on }, (async (u: string) => (u.includes("elevenlabs") ? new Response(JSON.stringify({ character_count: 5, character_limit: 5 }), { status: 200 }) : new Response("{}", { status: 200 }))) as never);
    expect(found).toEqual([{ provider: "ElevenLabs", reason: expect.stringMatching(/quota used up/), fallback: true }]);
  });
});

describe("Anthropic, the text provider (lib/text-llm.ts)", () => {
  const BOTH = { OPENAI_API_KEY: "sk-test", ANTHROPIC_API_KEY: "ak-test" };
  const byHost = (anthropic: Response | Error, openai: Response = new Response("{}", { status: 200 })) =>
    vi.fn(async (u: string) => {
      if (u.includes("anthropic.com")) {
        if (anthropic instanceof Error) throw anthropic;
        return anthropic.clone();
      }
      return openai.clone();
    });

  it("asks only GET /v1/models with the key header; 200 is fine", async () => {
    const f = answer(200, { data: [] });
    expect(await probeAnthropic(BOTH, f as never)).toEqual({ state: "ok" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/models");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("ak-test");
  });

  it("a bad key, a refused account or a billing error is a refusal; a 5xx, 529 or no network is unknown", async () => {
    expect((await probeAnthropic(BOTH, answer(401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) as never)).state).toBe("refused");
    expect((await probeAnthropic(BOTH, answer(403, { error: { type: "permission_error" } }) as never)).state).toBe("refused");
    expect((await probeAnthropic(BOTH, answer(402, { error: { type: "billing_error" } }) as never)).state).toBe("refused");
    expect((await probeAnthropic({}, answer(200, {}) as never)).state).toBe("refused");
    expect((await probeAnthropic(BOTH, answer(529, { error: { type: "overloaded_error" } }) as never)).state).toBe("unknown");
    expect((await probeAnthropic(BOTH, answer(500, {}) as never)).state).toBe("unknown");
    expect((await probeAnthropic(BOTH, vi.fn(async () => { throw new Error("fetch failed"); }) as never)).state).toBe("unknown");
  });

  it("a week needs Anthropic (text) and OpenAI (voice) on Claude, only OpenAI after a rollback", () => {
    expect(weekProviders(BOTH)).toEqual(["Anthropic", "OpenAI"]);
    expect(weekProviders({ ...BOTH, LLM_PROVIDER: "openai" })).toEqual(["OpenAI"]);
    expect(weekProviders(ENV)).toEqual(["OpenAI"]);
  });

  it("the pre-flight stops a week when the Anthropic key is refused, before any paid call", async () => {
    const f = byHost(new Response(JSON.stringify({ error: { type: "authentication_error" } }), { status: 401 }));
    expect(await preflight(null, BOTH, f as never)).toMatchObject({ ok: false, provider: "Anthropic" });
    expect(await preflight(null, { ...BOTH, LLM_PROVIDER: "openai" }, f as never)).toEqual({ ok: true });
    // Anthropic fine, OpenAI (the voice) refused: still stopped.
    const g = byHost(new Response("{}", { status: 200 }), new Response(JSON.stringify({ error: { code: "invalid_api_key" } }), { status: 401 }));
    expect(await preflight(null, BOTH, g as never)).toMatchObject({ ok: false, provider: "OpenAI" });
  });

  it("an out-of-credit refusal on a real Claude call is remembered under Anthropic and blocks the next week", async () => {
    const store = new MemoryOpsStore();
    const err = new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } }, "Your credit balance is too low to access the Anthropic API.", new Headers());
    expect(providerOfError(err)).toBe("Anthropic");
    expect(providerOfError(new Error("openai tts failed (429)"))).toBe("OpenAI");
    await noteProviderRefused(store, providerOfError(err), err);
    expect(await store.get(PROVIDER_DOWN_KEY("Anthropic"))).not.toBeNull();
    const f = byHost(new Response("{}", { status: 200 }));
    expect(await preflight(store, BOTH, f as never)).toMatchObject({ ok: false, provider: "Anthropic", reason: expect.stringMatching(/recent call/) });
    expect(f).not.toHaveBeenCalled();
    const daily = await dailyProviderCheck(store, BOTH, f as never);
    expect(daily).toEqual([{ provider: "Anthropic", reason: expect.stringMatching(/recent call/), fallback: false }]);
    await clearProviderDown(store, "Anthropic");
    expect(await preflight(store, BOTH, f as never)).toEqual({ ok: true });
  });

  it("an overloaded or rate-limited Claude call is not remembered", async () => {
    const store = new MemoryOpsStore();
    const err = new Anthropic.RateLimitError(429, { type: "error", error: { type: "rate_limit_error", message: "slow down" } }, "slow down", new Headers());
    await noteProviderRefused(store, "Anthropic", err);
    expect(await store.get(PROVIDER_DOWN_KEY("Anthropic"))).toBeNull();
  });
});
