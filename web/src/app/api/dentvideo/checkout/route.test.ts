import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";

let session: { user: { id: string; email: string } | null; clinic: Record<string, unknown> | null };

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
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));

const fetchMock = vi.fn();

function req(body: unknown) {
  return new Request("https://dentvideo.com/api/dentvideo/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function call(body: unknown) {
  const { POST } = await import("./route");
  const res = await POST(req(body));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const sent = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body as string) as Record<string, unknown>;

beforeEach(() => {
  session = { user: { id: OWNER, email: "dr@clinic.example" }, clinic: { id: CLINIC, plan: "trial", profile: { language: "de" } } };
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

const ok = (url = "https://checkout.dodopayments.com/session/cks_1") => new Response(JSON.stringify({ session_id: "cks_1", checkout_url: url }), { status: 200 });

describe("POST /api/dentvideo/checkout", () => {
  it("needs a signed-in clinic owner", async () => {
    session.user = null;
    expect((await call({ plan: "practice", interval: "month" })).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens a live Dodo checkout for the plan with the founding code and metadata", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    const res = await call({ plan: "practice", interval: "month" });
    expect(res).toEqual({ status: 200, body: { url: "https://checkout.dodopayments.com/session/cks_1" } });
    expect(fetchMock.mock.calls[0][0]).toBe("https://live.dodopayments.com/checkouts");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer sk_test");
    expect(sent(0)).toMatchObject({
      product_cart: [{ product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN", quantity: 1 }],
      customer: { email: "dr@clinic.example" },
      discount_codes: ["KURUCU100"],
      metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice" },
      return_url: "https://dentvideo.com/app?billing=success",
      customization: { force_language: "de" },
    });
  });

  it("opens at list price when Dodo refuses the founding code", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "discount usage limit reached" }), { status: 422 })).mockResolvedValueOnce(ok());
    const res = await call({ plan: "practice", interval: "month" });
    expect(res.status).toBe(200);
    expect(sent(0).discount_codes).toEqual(["KURUCU100"]);
    expect(sent(1).discount_codes).toBeUndefined();
  });

  it("says so when a typed code is refused, without retrying", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "invalid discount" }), { status: 422 }));
    const res = await call({ plan: "starter", interval: "month", code: "nope10" });
    expect(res).toEqual({ status: 400, body: { error: APP_TEXT.en.errors.invalidCode } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses unknown or unsold plans and clinics that already pay", async () => {
    expect((await call({ plan: "platinum", interval: "month" })).status).toBe(400);
    expect((await call({ plan: "group", interval: "year" })).status).toBe(400);
    session.clinic = { ...session.clinic, plan: "active" };
    expect((await call({ plan: "group", interval: "month" })).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is unavailable without DODO_API_KEY", async () => {
    vi.stubEnv("DODO_API_KEY", "");
    expect((await call({ plan: "starter", interval: "month" })).status).toBe(503);
  });
});
