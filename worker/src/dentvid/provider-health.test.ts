import { describe, expect, it, vi } from "vitest";
import { MemoryOpsStore } from "./ops-alert.js";
import { PROVIDER_DOWN_KEY, clearProviderDown, dailyProviderCheck, noteProviderRefused, preflight, probeElevenLabs, probeOpenAI } from "./provider-health.js";

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
