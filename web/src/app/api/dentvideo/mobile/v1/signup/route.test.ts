import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

/**
 * POST /api/dentvideo/mobile/v1/signup — the iPhone app's sign-up through the web's own handler
 * (lib/dentvid/handlers/signup.ts): the same brakes and limits, the 6-digit code, and a token set
 * in the answer instead of a cookie.
 */

const created: Record<string, unknown>[] = [];
const checks: string[] = [];
const mails: string[] = [];
const joined: string[] = [];
let limitedKey: string | null = null;
let existing: { id: string; app_metadata: Record<string, unknown>; password: string } | null = null;
const sendCode = vi.fn(async () => ({ ok: true as const }));

vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors, dvLocale: async () => "en" }));
vi.mock("@/lib/dentvid/events-server", () => ({ recordEvent: async () => {} }));
vi.mock("@/lib/dentvid/ad-conversions-server", () => ({ recordSignupClick: async () => "recorded" }));
vi.mock("@/lib/dentvid/ops-server", () => ({ raiseOwnerAlert: async () => "sent" }));
vi.mock("@/lib/dentvid/verify-email-server", () => ({ sendVerificationCode: (...a: unknown[]) => sendCode(...(a as [])) }));
vi.mock("@/lib/dentvid/email", () => ({ sendEmail: async (to: string) => (mails.push(to), true) }));
vi.mock("@/lib/dentvid/join", () => ({ joinDentvideo: async (id: string) => (joined.push(id), true) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/rate-limit-server", async () => {
  const { NextResponse } = await import("next/server");
  const run = (cs: { key: string }[]) => (checks.push(...cs.map((c) => c.key)), cs.some((c) => c.key === limitedKey));
  return {
    rateLimited: async (cs: { key: string }[]) => (run(cs) ? NextResponse.json({ error: "slow down" }, { status: 429 }) : null),
    limitChecks: async (cs: { key: string }[]) => ({ ok: !run(cs), remaining: 0, retryAfterSec: 0 }),
  };
});
const cookieSignIns: unknown[] = [];
vi.mock("@/lib/dentvid/supabase", () => ({
  dvServer: () => ({ auth: { signInWithPassword: async (c: unknown) => (cookieSignIns.push(c), { error: null }), getUser: async () => ({ data: { user: null } }) } }),
  dvAdmin: () => ({
    auth: {
      admin: {
        createUser: async (attrs: Record<string, unknown>) => {
          if (existing) return { data: { user: null }, error: { message: "A user with this email address has already been registered" } };
          created.push(attrs);
          return { data: { user: { id: "new-user", email: attrs.email } }, error: null };
        },
        generateLink: async () => ({ data: { user: { id: "x" }, properties: { hashed_token: "hashed" } }, error: null }),
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/mobile-auth", () => ({
  dvAnonClient: () => ({
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const user = existing
          ? existing.password === password
            ? { id: existing.id, email, app_metadata: existing.app_metadata }
            : null
          : { id: "new-user", email, app_metadata: { product: "dentvideo" } };
        if (!user) return { data: { session: null, user: null }, error: { message: "Invalid login credentials" } };
        return { data: { user, session: { access_token: `at-${user.id}`, refresh_token: `rt-${user.id}`, expires_at: 2_000_000_000 } }, error: null };
      },
    },
  }),
}));

async function signup(extra: Record<string, unknown> = {}) {
  const { POST } = await import("./route");
  const body = { email: "Dr@Clinic.example", password: "longenough", elapsedMs: 5000, locale: "de", ...extra };
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/mobile/v1/signup", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.9" }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, headers: res.headers };
}

beforeEach(() => {
  created.length = 0;
  checks.length = 0;
  mails.length = 0;
  joined.length = 0;
  cookieSignIns.length = 0;
  limitedKey = null;
  existing = null;
  sendCode.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/dentvideo/mobile/v1/signup", () => {
  it("creates a DentVideo account, emails the 6-digit code, and answers the app's token set — no cookie", async () => {
    const r = await signup();
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, signedIn: true, session: { accessToken: "at-new-user", refreshToken: "rt-new-user", expiresAt: 2_000_000_000, user: { id: "new-user", email: "dr@clinic.example" } } });
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ email: "dr@clinic.example", email_confirm: true, app_metadata: { product: "dentvideo" } });
    expect(sendCode).toHaveBeenCalledTimes(1);
    expect(cookieSignIns).toEqual([]);
  });

  it("applies the web's limits (IP, network, address, global) plus the app's own ceiling", async () => {
    await signup();
    expect(checks).toEqual(
      expect.arrayContaining(["rl:signup:ip:203.0.113.9", "rl:signup:ipday:203.0.113.9", "rl:signup:email:dr@clinic.example", "rl:signup:global", "rl:signup:mobile:global"]),
    );
    for (const key of ["rl:signup:ip:203.0.113.9", "rl:signup:email:dr@clinic.example", "rl:signup:mobile:global"]) {
      created.length = 0;
      limitedKey = key;
      expect((await signup()).status, key).toBe(429);
      expect(created, key).toEqual([]);
    }
  });

  it("refuses a request that did not come from the app's form (no fill time, or too fast)", async () => {
    expect((await signup({ elapsedMs: undefined })).status).toBe(400);
    expect((await signup({ elapsedMs: 300 })).status).toBe(400);
    expect(created).toEqual([]);
    expect(sendCode).not.toHaveBeenCalled();
  });

  it("does not need a Turnstile token (a browser widget) even when the web form requires one", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    expect((await signup()).status).toBe(200);
    expect(created).toHaveLength(1);
  });

  it("an address that already has an account: the right password signs in (joining another app's login), a wrong one gets the reset mail", async () => {
    existing = { id: "old-user", app_metadata: { product: "aires" }, password: "longenough" };
    const right = await signup();
    expect(right.body).toMatchObject({ ok: true, existing: true, signedIn: true, session: { accessToken: "at-old-user" } });
    expect(joined).toEqual(["old-user"]);

    existing = { id: "old-user", app_metadata: { product: "dentvideo" }, password: "something-else" };
    const wrong = await signup();
    expect(wrong.body).toEqual({ ok: true, existing: true });
    expect(mails).toEqual(["dr@clinic.example"]);
  });
});
