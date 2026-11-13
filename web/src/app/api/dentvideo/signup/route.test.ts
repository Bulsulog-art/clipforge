import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

const created: Record<string, unknown>[] = [];
const mails: { to: string; subject: string }[] = [];
const checks: string[] = [];
let existing: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null = null;
let limitedKey: string | null = null;
const sendCode = vi.fn(async () => ({ ok: true as const }));

vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors, dvLocale: async () => "en" }));
const recorded: unknown[][] = [];
vi.mock("@/lib/dentvid/events-server", () => ({
  recordEvent: async (...a: unknown[]) => {
    recorded.push(a);
  },
}));
const ownerAlerts: { key: string; facts?: [string, string][] }[] = [];
vi.mock("@/lib/dentvid/ops-server", () => ({
  raiseOwnerAlert: async (a: { key: string; facts?: [string, string][] }) => {
    ownerAlerts.push(a);
    return "sent";
  },
}));
vi.mock("@/lib/dentvid/verify-email-server", () => ({ sendVerificationCode: (...a: unknown[]) => sendCode(...(a as [])) }));
vi.mock("@/lib/dentvid/email", () => ({
  sendEmail: async (to: string, msg: { subject: string }) => {
    mails.push({ to, subject: msg.subject });
    return true;
  },
}));
vi.mock("@/lib/rate-limit-server", async () => {
  const { NextResponse } = await import("next/server");
  const run = (cs: { key: string }[]) => {
    checks.push(...cs.map((c) => c.key));
    return cs.some((c) => c.key === limitedKey);
  };
  return {
    rateLimited: async (cs: { key: string }[]) => (run(cs) ? NextResponse.json({ error: "slow down" }, { status: 429 }) : null),
    limitChecks: async (cs: { key: string }[]) => ({ ok: !run(cs), remaining: 0, retryAfterSec: 0 }),
  };
});
let serverSignIns: { email: string; password: string }[] = [];
let serverSignInFails = false;
let createFails: string | null = null;
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/dentvid/supabase", () => ({
  dvServer: () => ({
    auth: {
      signInWithPassword: async (c: { email: string; password: string }) => {
        serverSignIns.push(c);
        return { error: serverSignInFails ? { message: "network" } : null };
      },
    },
  }),
  dvAdmin: () => ({
    auth: {
      admin: {
        createUser: async (attrs: Record<string, unknown>) => {
          if (createFails) return { data: { user: null }, error: { message: createFails } };
          if (existing) return { data: { user: null }, error: { message: "A user with this email address has already been registered" } };
          created.push(attrs);
          return { data: { user: { id: "new-user", email: attrs.email } }, error: null };
        },
        generateLink: async () => ({ data: { user: existing, properties: { hashed_token: "hashed" } }, error: null }),
      },
    },
  }),
}));

async function signup(extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const { POST } = await import("./route");
  const body = { email: "Dr@Clinic.example", password: "longenough", website: "", elapsedMs: 5000, locale: "de", ...extra };
  const res = await POST(
    new Request("https://dentvideo.com/api/dentvideo/signup", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.9", ...headers }, body: JSON.stringify(body) }),
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  serverSignIns = [];
  serverSignInFails = false;
  created.length = 0;
  mails.length = 0;
  checks.length = 0;
  existing = null;
  limitedKey = null;
  sendCode.mockClear();
  sendCode.mockImplementation(async () => ({ ok: true as const }));
  ownerAlerts.length = 0;
  recorded.length = 0;
  createFails = null;
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/dentvideo/signup", () => {
  it("records signup_completed with the tab's first-touch source and the edge country (no email, no user id)", async () => {
    recorded.length = 0;
    const attribution = { utm_source: "instagram", utm_medium: "dm", utm_campaign: "tr-launch" };
    await signup({ attribution }, { "cf-ipcountry": "TR" });
    expect(recorded).toEqual([["signup_completed", { locale: "de", props: attribution, geo: "TR" }]]);
    expect(JSON.stringify(recorded)).not.toContain("clinic.example");
  });

  it("creates the account with the DentVideo marker in app_metadata (server-only), not user_metadata", async () => {
    expect(await signup()).toEqual({ status: 200, body: { ok: true, signedIn: true } });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ email: "dr@clinic.example", email_confirm: true, app_metadata: { product: "dentvideo" } });
    expect(created[0]).not.toHaveProperty("user_metadata");
    expect(sendCode).toHaveBeenCalledTimes(1);
  });

  it("tells the form an address already has an account, and mails a DentVideo owner a reset link", async () => {
    const fresh = await signup();
    existing = { app_metadata: { product: "dentvideo" } };
    const again = await signup({ password: "someoneelse" });
    expect(fresh.body).toEqual({ ok: true, signedIn: true });
    expect(again).toEqual({ status: 200, body: { ok: true, existing: true } });
    expect(mails).toEqual([{ to: "dr@clinic.example", subject: expect.stringContaining("DentVideo") }]);
    // Counted against the reset mail limits for that address.
    expect(checks).toContain("rl:reset:email:dr@clinic.example");
  });

  it("does not mail another Liman app's user, nor one whose only DentVideo claim is user_metadata", async () => {
    existing = { app_metadata: { product: "aires" } };
    expect((await signup()).body).toEqual({ ok: true, existing: true });
    existing = { app_metadata: {}, user_metadata: { product: "dentvideo" } };
    expect((await signup()).body).toEqual({ ok: true, existing: true });
    expect(mails).toEqual([]);
  });

  it("stops mailing an existing address once its reset limit is spent", async () => {
    existing = { app_metadata: { product: "dentvideo" } };
    limitedKey = "rl:reset:email:dr@clinic.example";
    expect((await signup()).body).toEqual({ ok: true, existing: true });
    expect(mails).toEqual([]);
  });

  it("limits per IP, per network and per address; the global ceiling only for requests that pass those", async () => {
    await signup();
    expect(checks).toEqual(["rl:signup:ip:203.0.113.9", "rl:signup:ipday:203.0.113.9", "rl:signup:net:203.0.113.0/24", "rl:signup:email:dr@clinic.example", "rl:signup:global"]);
    checks.length = 0;
    limitedKey = "rl:signup:net:203.0.113.0/24";
    expect((await signup()).status).toBe(429);
    expect(checks).not.toContain("rl:signup:global");
  });

  it("with Turnstile configured, refuses a sign-up without a valid token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x-site");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    vi.stubGlobal("fetch", fetchMock);
    expect((await signup()).body).toMatchObject({ code: "turnstile" });
    expect((await signup({ turnstile: "bad" })).body).toMatchObject({ code: "turnstile" });
    expect(created).toHaveLength(0);
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ success: true })));
    expect(await signup({ turnstile: "good" })).toEqual({ status: 200, body: { ok: true, signedIn: true } });
    expect(created).toHaveLength(1);
  });

  it("still refuses the honeypot and an instant submit", async () => {
    expect((await signup({ website: "http://spam" })).status).toBe(400);
    expect((await signup({ elapsedMs: 10 })).status).toBe(400);
    expect(created).toHaveLength(0);
  });
});


describe("signs a new account in on the server", () => {
  it("opens the session and tells the form it is signed in", async () => {
    const r = await signup();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, signedIn: true });
    expect(serverSignIns).toEqual([{ email: "dr@clinic.example", password: "longenough" }]);
  });

  it("still answers ok when the server sign-in fails, so the form can try itself", async () => {
    serverSignInFails = true;
    const r = await signup();
    expect(r.body).toMatchObject({ ok: true, signedIn: false });
  });

  it("says plainly that an address already has an account, and does not sign it in", async () => {
    existing = { app_metadata: { product: "dentvideo" } };
    const r = await signup();
    expect(r.body).toMatchObject({ ok: true, existing: true });
    expect(r.body.signedIn).toBeUndefined();
    expect(serverSignIns).toEqual([]);
  });
});

const TOKEN = "monitor-token-0123456789abcdef";
const MONITOR = "e2e-monitor+1731400000000abc@bulsulabs.com";

describe("the synthetic monitor's sign-ups (e2e-monitor+…)", () => {
  it("with the token: no client limits, no bot brake, no email, no funnel event, and the user id back", async () => {
    vi.stubEnv("DENTVIDEO_MONITOR_TOKEN", TOKEN);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x-site");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    vi.stubGlobal("fetch", fetchMock);
    limitedKey = "rl:signup:ip:203.0.113.9";
    const r = await signup({ email: MONITOR, elapsedMs: undefined }, { "x-dv-monitor": TOKEN });
    expect(r).toEqual({ status: 200, body: { ok: true, signedIn: true, userId: "new-user" } });
    expect(checks).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendCode).not.toHaveBeenCalled();
    expect(recorded).toEqual([]);
    expect(mails).toEqual([]);
    expect(serverSignIns).toHaveLength(1);
  });

  it("without the token (or a wrong one) a monitor address goes through every brake — but is still never emailed", async () => {
    vi.stubEnv("DENTVIDEO_MONITOR_TOKEN", TOKEN);
    const r = await signup({ email: MONITOR }, { "x-dv-monitor": "monitor-token-wrong-0000000000" });
    expect(r).toEqual({ status: 200, body: { ok: true, signedIn: true } });
    expect(checks).toContain("rl:signup:ip:203.0.113.9");
    expect(checks).toContain("rl:signup:global");
    expect(sendCode).not.toHaveBeenCalled();
    expect(recorded).toEqual([]);
    limitedKey = "rl:signup:ip:203.0.113.9";
    expect((await signup({ email: MONITOR })).status).toBe(429);
  });

  it("the token does nothing for a real address", async () => {
    vi.stubEnv("DENTVIDEO_MONITOR_TOKEN", TOKEN);
    limitedKey = "rl:signup:ip:203.0.113.9";
    expect((await signup({}, { "x-dv-monitor": TOKEN })).status).toBe(429);
    limitedKey = null;
    const ok = await signup({ elapsedMs: 10 }, { "x-dv-monitor": TOKEN });
    expect(ok.status).toBe(400);
    const fine = await signup({}, { "x-dv-monitor": TOKEN });
    expect(fine.body).toEqual({ ok: true, signedIn: true });
    expect(sendCode).toHaveBeenCalledTimes(1);
  });

  it("an existing monitor address gets no reset mail", async () => {
    existing = { app_metadata: { product: "dentvideo" } };
    expect((await signup({ email: MONITOR })).body).toEqual({ ok: true, existing: true });
    expect(mails).toEqual([]);
  });
});

describe("a step that fails for a real clinic is logged and the owner is told", () => {
  it("account creation refused", async () => {
    createFails = "Database error saving new user";
    expect((await signup()).status).toBe(500);
    expect(ownerAlerts.map((a) => a.key)).toEqual(["signup_broken:create_account"]);
    expect(ownerAlerts[0].facts).toContainEqual(["Error", "Database error saving new user"]);
  });

  it("server sign-in failed right after the account was made", async () => {
    serverSignInFails = true;
    expect((await signup()).body).toEqual({ ok: true, signedIn: false });
    expect(ownerAlerts.map((a) => a.key)).toEqual(["signup_broken:server_sign_in"]);
  });

  it("the verification code could not be issued or sent", async () => {
    sendCode.mockImplementation(async () => ({ ok: false, reason: "unavailable" }) as never);
    expect((await signup()).body).toEqual({ ok: true, signedIn: true });
    expect(ownerAlerts.map((a) => a.key)).toEqual(["signup_broken:verification_code"]);
    ownerAlerts.length = 0;
    sendCode.mockImplementation(async () => {
      throw new Error("redis down");
    });
    expect((await signup()).body).toEqual({ ok: true, signedIn: true });
    expect(ownerAlerts.map((a) => a.key)).toEqual(["signup_broken:verification_code"]);
  });

  it("nothing is raised when all is well, nor for monitor accounts", async () => {
    await signup();
    serverSignInFails = true;
    await signup({ email: MONITOR });
    expect(ownerAlerts).toEqual([]);
  });
});
