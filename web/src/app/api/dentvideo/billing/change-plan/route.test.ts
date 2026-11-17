import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { ACCOUNT_TEXT } from "@/content/dentvideo-account";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const STARTER = "pdt_0NrVahwZsINvy3TNz2H35";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";

let session: { user: { id: string } | null; clinic: Record<string, unknown> | null };

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: session.user,
    db: {
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: session.clinic, error: null }) };
        return q;
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors, dvLocale: async () => "en" }));

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function call(body: unknown) {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/billing/change-plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  session = { user: { id: OWNER }, clinic: { id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_123" } };
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("DODO_API_KEY", "sk_test");
  vi.stubEnv("DODO_ENVIRONMENT", "test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/dentvideo/billing/change-plan", () => {
  it("without DODO_API_KEY keeps the email path", async () => {
    vi.stubEnv("DODO_API_KEY", "");
    expect(await call({ plan: "practice" })).toEqual({ status: 501, body: { error: ACCOUNT_TEXT.en.errors.billingUnavailable, fallback: "email" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("moves Starter to Practice with immediate proration", async () => {
    fetchMock.mockResolvedValueOnce(json({ subscription_id: "sub_123", status: "active", product_id: STARTER, customer: { customer_id: "cus_9" } })).mockResolvedValueOnce(json({}));
    expect(await call({ plan: "practice", interval: "month" })).toEqual({ status: 200, body: { ok: true, plan: "practice", interval: "month" } });
    expect(fetchMock.mock.calls[1][0]).toBe("https://test.dodopayments.com/subscriptions/sub_123/change-plan");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ product_id: PRACTICE, quantity: 1, proration_billing_mode: "prorated_immediately" });
  });

  it("refuses the plan the clinic already has, unknown plans and clinics without an active subscription", async () => {
    fetchMock.mockResolvedValueOnce(json({ subscription_id: "sub_123", status: "active", product_id: PRACTICE }));
    expect((await call({ plan: "practice" })).body).toEqual({ error: ACCOUNT_TEXT.en.errors.samePlan });
    expect((await call({ plan: "platinum" })).status).toBe(400);
    session.clinic = { ...session.clinic!, plan: "cancelled" };
    expect((await call({ plan: "starter" })).status).toBe(409);
    session.user = null;
    expect((await call({ plan: "starter" })).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never switches to Group: it is Contact us, monthly or yearly", async () => {
    for (const interval of ["month", "year"]) {
      const res = await call({ plan: "group", interval });
      expect(res.status, interval).toBe(400);
      expect(res.body.code, interval).toBe("contact_sales");
      expect(String(res.body.error), interval).toContain("hello@dentvideo.com");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
