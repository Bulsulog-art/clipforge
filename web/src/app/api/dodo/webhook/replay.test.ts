import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryReplayStore } from "@/lib/webhook-replay";

/**
 * /api/dodo/webhook: a correctly signed delivery replayed inside the
 * signature's 5-minute window is acknowledged but not processed again; a
 * delivery that failed is processed when Dodo retries it.
 */

const replay = new MemoryReplayStore();
const limited = { next: null as Response | null };
vi.mock("@/lib/rate-limit-server", () => ({
  replayStore: () => replay,
  rateLimited: async () => limited.next,
}));

let lookups = 0;
let failNext = false;
const cloudClient = {
  from: () => {
    lookups++;
    if (failNext) {
      failNext = false;
      throw new Error("db down");
    }
    const q = { select: () => q, ilike: () => q, maybeSingle: async () => ({ data: null, error: null }) };
    return q;
  },
};
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => cloudClient }));
vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => ({}) }));
vi.mock("@/lib/queue", () => ({ dentvidQueue: { add: async () => {} } }));

const SECRET = "whsec_" + Buffer.from("test-secret-for-dodo-webhooks").toString("base64");
process.env.DODO_WEBHOOK_SECRET = SECRET;

function signed(id: string) {
  // A ClipForge event for an unknown customer: processed = one profile lookup.
  const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_1", customer: { email: "nobody@example.com" } } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return new Request("https://dentvideo.com/api/dodo/webhook", {
    method: "POST",
    headers: { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}`, "content-type": "application/json" },
    body,
  });
}

async function post(req: Request) {
  const { POST } = await import("./route");
  const res = await POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  replay.m.clear();
  lookups = 0;
  failNext = false;
  limited.next = null;
});

describe("dodo webhook replay protection", () => {
  it("processes a delivery once; the same signed delivery again is a no-op 200", async () => {
    const first = await post(signed("msg_a"));
    expect(first.status).toBe(200);
    expect(lookups).toBe(1);
    const again = await post(signed("msg_a"));
    expect(again).toEqual({ status: 200, body: { ok: true, duplicate: true } });
    expect(lookups).toBe(1);
    // A different delivery is processed.
    await post(signed("msg_b"));
    expect(lookups).toBe(2);
  });

  it("a delivery that failed is processed again on Dodo's retry", async () => {
    failNext = true;
    await expect(post(signed("msg_c"))).rejects.toThrow("db down");
    const retry = await post(signed("msg_c"));
    expect(retry.status).toBe(200);
    expect(lookups).toBe(2);
  });

  it("an unsigned replay never reaches the dedupe or the handler", async () => {
    const req = signed("msg_d");
    const tampered = new Request(req.url, { method: "POST", headers: req.headers, body: '{"type":"payment.succeeded","data":{}}' });
    expect((await post(tampered)).status).toBe(401);
    expect(lookups).toBe(0);
    expect(replay.m.size).toBe(0);
  });

  it("answers 429 when the per-IP limit is hit, before verifying anything", async () => {
    limited.next = new Response(JSON.stringify({ error: "too many requests" }), { status: 429, headers: { "Retry-After": "30" } });
    expect((await post(signed("msg_e"))).status).toBe(429);
    expect(lookups).toBe(0);
  });
});
