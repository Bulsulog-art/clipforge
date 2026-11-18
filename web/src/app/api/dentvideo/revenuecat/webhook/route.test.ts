import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryReplayStore } from "@/lib/webhook-replay";

/** POST /api/dentvideo/revenuecat/webhook: auth, size, parsing, replay and failure handling around the handler. */

const SECRET = "dv-rc-webhook-secret-0123456789abcdef";
const handled: unknown[] = [];
let answer: { status: number; body: Record<string, unknown> } = { status: 200, body: { ok: true } };
let store: MemoryReplayStore;
const ownerAlerts: { key: string }[] = [];

vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => ({}) }));
vi.mock("@/lib/dentvid/ops-server", () => ({ raiseOwnerAlert: async (a: { key: string }) => void ownerAlerts.push(a) }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null, replayStore: () => store }));
vi.mock("@/lib/dentvid/apple-webhook", async (orig) => {
  const m = (await orig()) as typeof import("@/lib/dentvid/apple-webhook");
  return {
    ...m,
    handleAppleEvent: async (_db: unknown, evt: unknown) => {
      handled.push(evt);
      if (answer.status === 599) throw new Error("boom");
      return answer;
    },
  };
});

const event = (id = "evt-1", type = "INITIAL_PURCHASE") => ({ api_version: "1.0", event: { id, type, app_user_id: "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e" } });

async function post(body: unknown, auth: string | null = `Bearer ${SECRET}`, headers: Record<string, string> = {}) {
  const { POST } = await import("./route");
  const h: Record<string, string> = { "content-type": "application/json", ...headers };
  if (auth !== null) h.authorization = auth;
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/revenuecat/webhook", { method: "POST", headers: h, body: typeof body === "string" ? body : JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  handled.length = 0;
  ownerAlerts.length = 0;
  answer = { status: 200, body: { ok: true } };
  store = new MemoryReplayStore();
  vi.stubEnv("DENTVID_REVENUECAT_WEBHOOK_AUTH", SECRET);
  vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "clipforge-secret-0123456789abcdef");
});

describe("POST /api/dentvideo/revenuecat/webhook", () => {
  it("401 without the shared secret, with a wrong one, or with ClipForge's — and the handler never runs", async () => {
    vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "clipforge-secret-0123456789abcdef");
    for (const auth of [null, "", "Bearer wrong-secret-0123456789abcdef", `Basic ${SECRET}`, "Bearer clipforge-secret-0123456789abcdef"]) {
      expect((await post(event(), auth)).status, String(auth)).toBe(401);
    }
    expect(handled).toEqual([]);
  });

  it("security: 401 for everyone while DENTVID_REVENUECAT_WEBHOOK_AUTH reuses ClipForge's secret", async () => {
    vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", SECRET);
    expect((await post(event("reuse-1"), `Bearer ${SECRET}`)).status).toBe(401);
    expect((await post(event("reuse-2"), SECRET)).status).toBe(401);
    expect(handled).toEqual([]);
  });

  it("401 for everyone when DENTVID_REVENUECAT_WEBHOOK_AUTH is not set", async () => {
    vi.stubEnv("DENTVID_REVENUECAT_WEBHOOK_AUTH", "");
    expect((await post(event(), "Bearer ")).status).toBe(401);
    expect((await post(event(), `Bearer ${SECRET}`)).status).toBe(401);
    expect(handled).toEqual([]);
  });

  it("accepts the secret with or without the Bearer prefix", async () => {
    expect((await post(event("e1"), SECRET)).status).toBe(200);
    expect((await post(event("e2"), `Bearer ${SECRET}`)).status).toBe(200);
    expect(handled).toHaveLength(2);
  });

  it("refuses bodies that are too large or not an event", async () => {
    expect((await post("x".repeat(70 * 1024))).status).toBe(413);
    expect((await post("{not json")).status).toBe(400);
    expect((await post({ api_version: "1.0" })).status).toBe(400);
    expect(handled).toEqual([]);
  });

  it("each delivery is processed once; a failed one is released for RevenueCat's retry", async () => {
    expect((await post(event("dup"))).status).toBe(200);
    expect(await post(event("dup"))).toMatchObject({ status: 200, body: { duplicate: true } });
    expect(handled).toHaveLength(1);

    answer = { status: 500, body: { error: "db down" } };
    expect((await post(event("retry"))).status).toBe(500);
    expect(ownerAlerts).toHaveLength(1);
    answer = { status: 200, body: { ok: true } };
    expect((await post(event("retry"))).status).toBe(200);
    expect(handled).toHaveLength(3);
  });

  it("503 (no clinic yet) is retried by RevenueCat without paging the owner as an error", async () => {
    answer = { status: 503, body: { error: "clinic not set up yet — retry" } };
    expect((await post(event("early"))).status).toBe(503);
    expect(ownerAlerts).toEqual([]);
    answer = { status: 200, body: { ok: true } };
    expect((await post(event("early"))).status).toBe(200);
  });

  it("a handler exception releases the delivery and tells the owner", async () => {
    answer = { status: 599, body: {} };
    await expect(post(event("throws"))).rejects.toThrow("boom");
    expect(ownerAlerts).toHaveLength(1);
    answer = { status: 200, body: { ok: true } };
    expect((await post(event("throws"))).status).toBe(200);
  });
});
