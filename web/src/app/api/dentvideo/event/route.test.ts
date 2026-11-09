import { beforeEach, describe, expect, it, vi } from "vitest";

const inserted: unknown[] = [];
let limitOk = true;
const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";

vi.mock("@/lib/dentvid/events-server", async (orig) => ({
  ...(await orig<typeof import("@/lib/dentvid/events-server")>()),
  insertEventRow: async (row: unknown) => {
    inserted.push(row);
    return true;
  },
}));
const checked: string[][] = [];
vi.mock("@/lib/rate-limit-server", () => ({
  limitChecks: async (checks: { key: string }[]) => {
    checked.push(checks.map((c) => c.key));
    return { ok: limitOk, remaining: 0, retryAfterSec: 1 };
  },
}));
vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: { id: "u1", email: "dr@clinic.example" },
    db: {
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { id: CLINIC }, error: null }) };
        return q;
      },
    },
  }),
}));

const post = async (body: string) => {
  const { POST } = await import("./route");
  return POST(new Request("https://dentvideo.com/api/dentvideo/event", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.9" }, body }));
};

describe("POST /api/dentvideo/event", () => {
  beforeEach(() => {
    inserted.length = 0;
    checked.length = 0;
    limitOk = true;
  });

  it("stores an allowed browser event, sanitised, without IP", async () => {
    const res = await post(JSON.stringify({ name: "landing_view", locale: "de", props: { utm_source: "google", email: "a@b.c" } }));
    expect(res.status).toBe(204);
    expect(inserted).toEqual([{ name: "landing_view", locale: "de", props: { utm_source: "google" }, clinic_id: null }]);
    expect(JSON.stringify(inserted)).not.toContain("203.0.113.9");
  });

  it("attaches the signed-in clinic to clinic events from the session", async () => {
    await post(JSON.stringify({ name: "plan_clicked", props: { tier: "practice", interval: "month", where: "onboarding" } }));
    expect(inserted).toEqual([{ name: "plan_clicked", locale: null, props: { tier: "practice", interval: "month", where: "onboarding" }, clinic_id: CLINIC }]);
  });

  it("refuses server-only and unknown events", async () => {
    expect((await post(JSON.stringify({ name: "payment_succeeded", props: { tier: "group" } }))).status).toBe(400);
    expect((await post(JSON.stringify({ name: "hello" }))).status).toBe(400);
    expect(inserted).toEqual([]);
  });

  it("refuses a body over the cap", async () => {
    expect((await post(JSON.stringify({ name: "landing_view", pad: "x".repeat(4000) }))).status).toBe(413);
  });

  it("limits per IP, per IP and event name, and globally — anonymous and clinic events on separate ceilings", async () => {
    await post(JSON.stringify({ name: "landing_view" }));
    expect(checked).toEqual([["rl:event:ip:203.0.113.9"], ["rl:event:ipname:203.0.113.9:landing_view", "rl:event:global"]]);
    checked.length = 0;
    await post(JSON.stringify({ name: "plan_clicked", props: { tier: "practice", interval: "month", where: "onboarding" } }));
    expect(checked[1]).toEqual(["rl:event:ipname:203.0.113.9:plan_clicked", "rl:event:global:clinic"]);
  });

  it("anonymous limits are tighter than before (per IP 30/10 min, 12 per event name, 5000/h global)", async () => {
    const { LIMITS } = await import("@/lib/rate-limit");
    expect(LIMITS.eventIp).toEqual({ limit: 30, windowSec: 600 });
    expect(LIMITS.eventIpName.limit).toBeLessThan(LIMITS.eventIp.limit);
    expect(LIMITS.eventGlobal).toEqual({ limit: 5000, windowSec: 3600 });
  });

  it("over the rate limit: dropped quietly", async () => {
    limitOk = false;
    expect((await post(JSON.stringify({ name: "landing_view" }))).status).toBe(204);
    expect(inserted).toEqual([]);
  });
});
