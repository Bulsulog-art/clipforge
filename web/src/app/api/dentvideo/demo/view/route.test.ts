import { beforeEach, describe, expect, it, vi } from "vitest";

let limitOk = true;
const checks: string[][] = [];
const counted: string[] = [];
const recorded: [string, Record<string, unknown>][] = [];
const LIVE = "Ab3dE5fG7hJ";
const ADMIN = "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const hot: Record<string, unknown>[] = [];
let sessionUser: { id: string } | null = null;

vi.mock("@/lib/rate-limit-server", () => ({
  limitChecks: async (c: { key: string }[]) => {
    checks.push(c.map((x) => x.key));
    return { ok: limitOk, remaining: 0, retryAfterSec: 0 };
  },
}));
vi.mock("@/lib/dentvid/demos-server", () => ({
  countDemoView: async (token: string) => {
    counted.push(token);
    return token === LIVE ? { token, language: "tr", campaign: "tr-launch", view_count: 4 } : null;
  },
}));
vi.mock("@/lib/dentvid/auth", () => ({ dvSession: async () => ({ user: sessionUser, db: {} }) }));
vi.mock("@/lib/dentvid/hot-leads-server", async (orig) => ({
  ...(await orig<typeof import("@/lib/dentvid/hot-leads-server")>()),
  raiseHotLead: async (input: Record<string, unknown>) => {
    hot.push(input);
    return "sent";
  },
}));
vi.mock("@/lib/dentvid/events-server", async (orig) => ({
  ...(await orig<typeof import("@/lib/dentvid/events-server")>()),
  recordEvent: async (name: string, opts: Record<string, unknown>) => {
    recorded.push([name, opts]);
    return true;
  },
}));

async function view(body: unknown, ip = "203.0.113.9", ua: string | null = SAFARI) {
  const { POST } = await import("./route");
  const res = await POST(
    new Request("https://dentvideo.com/api/dentvideo/demo/view", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip, "cf-ipcountry": "TR", ...(ua !== null ? { "user-agent": ua } : {}) },
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
  hot.length = 0;
  sessionUser = null;
  process.env.DENTVIDEO_ADMIN_USER_IDS = ADMIN;
});

describe("POST /api/dentvideo/demo/view", () => {
  it("counts a view of a live demo and records demo_viewed", async () => {
    expect(await view({ token: LIVE, locale: "tr" })).toBe(204);
    expect(counted).toEqual([LIVE]);
    expect(recorded).toEqual([["demo_viewed", { locale: "tr", props: { demo: LIVE, utm_campaign: "tr-launch" }, geo: "TR" }]]);
    // Per address, per address and demo, and global.
    expect(checks[0].some((k) => k.includes(`iptoken:`) && k.endsWith(LIVE))).toBe(true);
    // …and tells the owner (the hot-lead gate makes it the first view only), with the view just counted.
    expect(hot).toEqual([{ token: LIVE, step: "viewed", demo: expect.objectContaining({ token: LIVE }), views: 5 }]);
  });

  it("does not count link previews, crawlers, headless browsers or scripts — and they use up no rate limit", async () => {
    for (const ua of [
      "WhatsApp/2.24.21.80 A",
      "TelegramBot (like TwitterBot)",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36",
      "curl/8.5.0",
      null,
    ]) {
      expect(await view({ token: LIVE, locale: "tr" }, "203.0.113.9", ua)).toBe(204);
    }
    expect(counted).toEqual([]);
    expect(recorded).toEqual([]);
    expect(checks).toEqual([]);
    expect(hot).toEqual([]);
  });

  it("does not count the signed-in owner opening his own demo", async () => {
    sessionUser = { id: ADMIN };
    expect(await view({ token: LIVE, locale: "tr" })).toBe(204);
    expect(counted).toEqual([]);
    expect(hot).toEqual([]);
    // A signed-in clinic that is not an admin is a prospect like any other.
    sessionUser = { id: "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e" };
    await view({ token: LIVE, locale: "tr" });
    expect(counted).toEqual([LIVE]);
  });

  it("is rate-limited: over the limit nothing is counted", async () => {
    limitOk = false;
    expect(await view({ token: LIVE })).toBe(204);
    expect(counted).toEqual([]);
    expect(recorded).toEqual([]);
    expect(hot).toEqual([]);
  });

  it("answers the same for unknown and malformed tokens (nothing leaks)", async () => {
    expect(await view({ token: "Zx7Cv3Bn6Mq" })).toBe(204);
    expect(recorded).toEqual([]);
    for (const bad of [{ token: "../../x" }, { token: 5 }, "{not json", ""]) expect(await view(bad)).toBe(204);
    expect(counted).toEqual(["Zx7Cv3Bn6Mq"]);
    expect(hot).toEqual([]);
  });
});
