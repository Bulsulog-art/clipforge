import { beforeEach, describe, expect, it, vi } from "vitest";

let limitOk = true;
const checks: string[][] = [];
const counted: string[] = [];
const recorded: [string, Record<string, unknown>][] = [];
const LIVE = "Ab3dE5fG7hJ";

vi.mock("@/lib/rate-limit-server", () => ({
  limitChecks: async (c: { key: string }[]) => {
    checks.push(c.map((x) => x.key));
    return { ok: limitOk, remaining: 0, retryAfterSec: 0 };
  },
}));
vi.mock("@/lib/dentvid/demos-server", () => ({
  countDemoView: async (token: string) => {
    counted.push(token);
    return token === LIVE ? { token, language: "tr", campaign: "tr-launch" } : null;
  },
}));
vi.mock("@/lib/dentvid/events-server", async (orig) => ({
  ...(await orig<typeof import("@/lib/dentvid/events-server")>()),
  recordEvent: async (name: string, opts: Record<string, unknown>) => {
    recorded.push([name, opts]);
    return true;
  },
}));

async function view(body: unknown, ip = "203.0.113.9") {
  const { POST } = await import("./route");
  const res = await POST(
    new Request("https://dentvideo.com/api/dentvideo/demo/view", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip, "cf-ipcountry": "TR" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
  return res.status;
}

beforeEach(() => {
  limitOk = true;
  checks.length = 0;
  counted.length = 0;
  recorded.length = 0;
});

describe("POST /api/dentvideo/demo/view", () => {
  it("counts a view of a live demo and records demo_viewed", async () => {
    expect(await view({ token: LIVE, locale: "tr" })).toBe(204);
    expect(counted).toEqual([LIVE]);
    expect(recorded).toEqual([["demo_viewed", { locale: "tr", props: { demo: LIVE, utm_campaign: "tr-launch" }, geo: "TR" }]]);
    // Per address, per address and demo, and global.
    expect(checks[0].some((k) => k.includes(`iptoken:`) && k.endsWith(LIVE))).toBe(true);
  });

  it("is rate-limited: over the limit nothing is counted", async () => {
    limitOk = false;
    expect(await view({ token: LIVE })).toBe(204);
    expect(counted).toEqual([]);
    expect(recorded).toEqual([]);
  });

  it("answers the same for unknown and malformed tokens (nothing leaks)", async () => {
    expect(await view({ token: "Zx7Cv3Bn6Mq" })).toBe(204);
    expect(recorded).toEqual([]);
    for (const bad of [{ token: "../../x" }, { token: 5 }, "{not json", ""]) expect(await view(bad)).toBe(204);
    expect(counted).toEqual(["Zx7Cv3Bn6Mq"]);
  });
});
