import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GET /api/health?deep=1: the AI providers. OpenAI (narration, transcription)
 * is always probed; Anthropic (the worker's text provider) only where a key
 * is set, so a web app without one is not reported as down. Both probes use
 * the free model list and never print the key. Fetch, Supabase and Redis are
 * fakes.
 */

vi.mock("@/lib/rate-limit-server", () => ({ limiterRedis: () => null, rateLimited: async () => null }));
vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }) }),
}));

const { GET } = await import("./route");

type Sub = { name: string; ok: boolean; detail?: string };
const calls: { url: string; headers: Record<string, string> }[] = [];
let anthropicStatus = 200;

beforeEach(() => {
  calls.length = 0;
  anthropicStatus = 200;
  delete process.env.REDIS_URL;
  process.env.OPENAI_API_KEY = "sk-openai-test";
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      if (url.includes("anthropic.com")) return new Response("{}", { status: anthropicStatus });
      return new Response("{}", { status: 200 });
    }),
  );
});
afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function deep() {
  const res = await GET(new Request("https://dentvideo.com/api/health?deep=1"));
  const text = await res.text();
  return { text, json: JSON.parse(text) as { subsystems: Record<string, Sub> } };
}

describe("GET /api/health?deep=1: AI providers", () => {
  it("without an Anthropic key: OpenAI only, Anthropic not listed", async () => {
    const { json } = await deep();
    expect(json.subsystems.openai.ok).toBe(true);
    expect(json.subsystems.anthropic).toBeUndefined();
    expect(calls.some((c) => c.url.includes("anthropic.com"))).toBe(false);
  });

  it("with a key: the free model list, with the key and version headers; 200 is ok", async () => {
    process.env.ANTHROPIC_API_KEY = "ak-test-secret";
    const { json, text } = await deep();
    expect(json.subsystems.anthropic).toMatchObject({ name: "anthropic", ok: true });
    const call = calls.find((c) => c.url.includes("anthropic.com"))!;
    expect(call.url).toBe("https://api.anthropic.com/v1/models");
    expect(call.headers["x-api-key"]).toBe("ak-test-secret");
    expect(call.headers["anthropic-version"]).toBe("2023-06-01");
    expect(text).not.toContain("ak-test-secret");
  });

  it("a refused key shows as not ok with the HTTP status only", async () => {
    process.env.ANTHROPIC_API_KEY = "ak-test-secret";
    anthropicStatus = 401;
    const { json, text } = await deep();
    expect(json.subsystems.anthropic).toMatchObject({ ok: false, detail: "HTTP 401" });
    expect(text).not.toContain("ak-test-secret");
  });
});
