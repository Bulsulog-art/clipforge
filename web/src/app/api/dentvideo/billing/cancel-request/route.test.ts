import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { ACCOUNT_TEXT } from "@/content/dentvideo-account";
import type { OwnerAlert } from "@/lib/dentvid/ops-alert";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";

let session: { user: { id: string; email: string } | null; clinic: Record<string, unknown> | null };
const filters: [string, unknown][] = [];
const raised: OwnerAlert[] = [];
let deliver: string = "sent";

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: session.user,
    db: {
      from: () => {
        const q = { select: () => q, eq: (k: string, v: unknown) => (filters.push([k, v]), q), maybeSingle: async () => ({ data: session.clinic, error: null }) };
        return q;
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors, dvLocale: async () => "en" }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));
vi.mock("@/lib/dentvid/ops-server", () => ({ raiseOwnerAlert: async (a: OwnerAlert) => (raised.push(a), deliver) }));

async function call(body?: unknown) {
  const { POST } = await import("./route");
  void body; // the route takes no body: nothing the browser sends can name a clinic
  const res = await POST();
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  session = { user: { id: OWNER, email: "dr@clinic.example" }, clinic: { id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_123", plan_renews_at: "2026-12-17T00:00:00Z", profile: { language: "en", name: "Smile Dental", country: "DE" } } };
  filters.length = 0;
  raised.length = 0;
  deliver = "sent";
  vi.stubEnv("DODO_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/dentvideo/billing/cancel-request (online billing off)", () => {
  it("needs a signed-in owner", async () => {
    session.user = null;
    expect((await call()).status).toBe(401);
    expect(raised).toEqual([]);
  });

  it("tells the owner at once: urgent alert with the clinic, its Dodo subscription and the reply address", async () => {
    expect(await call()).toEqual({ status: 200, body: { ok: true } });
    expect(filters).toContainEqual(["owner_id", OWNER]);
    expect(raised).toHaveLength(1);
    expect(raised[0]).toMatchObject({ key: `cancel_request:${CLINIC}`, severity: "urgent", clinic: { id: CLINIC, name: "Smile Dental" } });
    expect(JSON.stringify(raised[0].facts)).toContain("sub_123");
    expect(JSON.stringify(raised[0].facts)).toContain("dr@clinic.example");
  });

  it("only ever for the signed-in owner's own clinic (a row of another owner is refused)", async () => {
    session.clinic = { ...session.clinic!, owner_id: "someone-else" };
    expect((await call({ clinicId: "other" })).status).toBe(409);
    expect(raised).toEqual([]);
  });

  it("refuses a clinic that is not paying (nothing to cancel)", async () => {
    for (const plan of ["trial", "cancelled"]) {
      session.clinic = { ...session.clinic!, plan };
      expect((await call()).status).toBe(409);
    }
    session.clinic = null;
    expect((await call()).status).toBe(409);
    expect(raised).toEqual([]);
  });

  it("with online billing on, sends the clinic to the portal instead", async () => {
    vi.stubEnv("DODO_API_KEY", "sk_test");
    expect(await call()).toMatchObject({ status: 409, body: { fallback: "portal" } });
    expect(raised).toEqual([]);
  });

  it("if the owner could not be told (mail failed, muted), the clinic is shown the address to write to", async () => {
    deliver = "failed";
    expect(await call()).toEqual({ status: 503, body: { error: ACCOUNT_TEXT.en.errors.billingUnavailable, fallback: "email" } });
    expect(ACCOUNT_TEXT.en.errors.billingUnavailable).toContain("hello@dentvideo.com");
    deliver = "deduped";
    expect((await call()).status).toBe(200);
  });
});

describe("cancel wording while online billing is off, every language", () => {
  it("names the address and the same-day answer, in the settings card, the 501 message and the delete block", async () => {
    const SAME_DAY = /same day|selben Tag|mismo día|aynı gün|jour même|当日中|اليوم نفسه|tego samego dnia/i;
    for (const [l, a] of Object.entries(ACCOUNT_TEXT)) {
      expect(a.errors.billingUnavailable, l).toContain("hello@dentvideo.com");
      expect(a.errors.billingUnavailable, l).toMatch(SAME_DAY);
      expect(a.errors.deleteNeedsCancel, l).toContain("hello@dentvideo.com");
      const s = APP_TEXT[l as keyof typeof APP_TEXT].settings;
      expect(s.manageLead, l).toMatch(SAME_DAY);
      // The card's lead names the button by its own label.
      expect(s.manageLead, l).toContain(a.cancelRequestButton);
      expect(a.errors.deleteNeedsCancel, l).toContain(a.cancelRequestButton);
      expect(a.cancelRequestFailed, l).toContain("hello@dentvideo.com");
    }
  });
});
