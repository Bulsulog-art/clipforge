import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { ACCOUNT_TEXT } from "@/content/dentvideo-account";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";

let session: { user: { id: string; email: string } | null; clinic: Record<string, unknown> | null };
const filters: [string, unknown][] = [];

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

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function call() {
  const { POST } = await import("./route");
  const res = await POST();
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  session = { user: { id: OWNER, email: "dr@clinic.example" }, clinic: { id: CLINIC, owner_id: OWNER, plan: "active", dodo_subscription_id: "sub_123", profile: { language: "en" } } };
  filters.length = 0;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("DODO_API_KEY", "sk_test");
  vi.stubEnv("DODO_ENVIRONMENT", "live");
  vi.stubEnv("NEXT_PUBLIC_DENTVIDEO_URL", "https://dentvideo.com");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/dentvideo/billing/portal", () => {
  it("needs a signed-in owner", async () => {
    session.user = null;
    expect((await call()).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("without DODO_API_KEY keeps the email path and calls nothing", async () => {
    vi.stubEnv("DODO_API_KEY", "");
    expect(await call()).toEqual({ status: 501, body: { error: ACCOUNT_TEXT.en.errors.billingUnavailable, fallback: "email" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("finds the customer from the clinic's stored subscription and returns Dodo's portal link", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ subscription_id: "sub_123", status: "active", customer: { customer_id: "cus_9" }, metadata: { app: "dentvideo", clinic_id: CLINIC } }))
      .mockResolvedValueOnce(json({ link: "https://customer.dodopayments.com/session/abc" }));
    expect(await call()).toEqual({ status: 200, body: { url: "https://customer.dodopayments.com/session/abc" } });
    expect(filters).toContainEqual(["owner_id", OWNER]);
    expect(fetchMock.mock.calls[0][0]).toBe("https://live.dodopayments.com/subscriptions/sub_123");
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer sk_test");
    const portal = new URL(fetchMock.mock.calls[1][0] as string);
    expect(portal.origin + portal.pathname).toBe("https://live.dodopayments.com/customers/cus_9/customer-portal/session");
    expect(portal.searchParams.get("return_url")).toBe("https://dentvideo.com/app/settings");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });

  it("refuses a clinic without a subscription, or a subscription that names another clinic", async () => {
    session.clinic = { ...session.clinic!, dodo_subscription_id: null };
    expect((await call()).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();

    session.clinic = { ...session.clinic!, dodo_subscription_id: "sub_123" };
    fetchMock.mockResolvedValueOnce(json({ subscription_id: "sub_123", status: "active", customer: { customer_id: "cus_9" }, metadata: { clinic_id: "someone-else" } }));
    expect((await call()).status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores a clinic row that belongs to another owner", async () => {
    session.clinic = { ...session.clinic!, owner_id: "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f" };
    expect((await call()).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says so when Dodo fails", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "boom" }, 500));
    expect(await call()).toEqual({ status: 502, body: { error: ACCOUNT_TEXT.en.errors.billingFailed } });
  });
});
