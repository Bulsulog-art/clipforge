import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryOpsStore, _resetLocalOnce, type Mail } from "@/lib/dentvid/ops-alert";
import { _setOpsForTests, PAID_LIST_KEY } from "@/lib/dentvid/ops-server";

/**
 * The payment webhook tells the owner what matters: a new paying clinic
 * (good news, at once), a paying clinic at risk (payment failed, on hold,
 * cancelled), a signed event that could not be processed, and a burst of
 * bad signatures (a rotated secret means real payments are not recorded).
 * Redis and Resend are fakes; one email per incident per day.
 */

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";

type Row = Record<string, unknown>;
let clinics: Row[] = [];
let failUpdate = false;

function limanClient() {
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let patch: Row | null = null;
    const q = {
      select: () => q,
      update: (p: Row) => ((patch = p), q),
      eq: (c: string, v: unknown) => {
        filters.push([c, v]);
        if (patch) {
          if (failUpdate) return Promise.resolve({ error: { message: "connection refused" } });
          for (const r of clinics) if (filters.every(([k, x]) => r[k] === x)) Object.assign(r, patch);
          return Promise.resolve({ error: null });
        }
        return q;
      },
      neq: () => Promise.resolve({ count: 0, error: null }),
      maybeSingle: () => {
        const hit = table === "dentvid_clinics" ? clinics.find((r) => filters.every(([k, x]) => r[k] === x)) : null;
        return Promise.resolve({ data: hit ? { ...hit } : null, error: null });
      },
      insert: () => Promise.resolve({ error: null }),
    };
    return q;
  };
  return { from, auth: { admin: { getUserById: async () => ({ data: { user: { email: "dr@gulus.example" } } }) } } };
}

vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => limanClient() }));
vi.mock("@/lib/queue", () => ({ dentvidQueue: { add: async () => {} } }));

const SECRET = "whsec_" + Buffer.from("test-secret-for-dodo-webhooks").toString("base64");
process.env.DODO_WEBHOOK_SECRET = SECRET;
let msg = 0;

function signed(event: unknown, secret = SECRET) {
  const body = JSON.stringify(event);
  const id = `msg_${++msg}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return new Request("https://dentvideo.com/api/dodo/webhook", {
    method: "POST",
    headers: { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}`, "content-type": "application/json" },
    body,
  });
}

const dvEvent = (type: string, extra: Row = {}) => ({
  type,
  data: {
    subscription_id: "sub_dv_1",
    product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN",
    status: "active",
    next_billing_date: "2026-12-08T10:00:00Z",
    metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice", interval: "month" },
    ...extra,
  },
});

async function post(req: Request) {
  const { POST } = await import("./route");
  try {
    const res = await POST(req);
    return { status: res.status, body: (await res.json()) as Row };
  } catch (e) {
    return { status: 500, body: { thrown: (e as Error).message } };
  }
}

let store: MemoryOpsStore;
let mails: Mail[];

beforeEach(() => {
  _resetLocalOnce();
  store = new MemoryOpsStore();
  mails = [];
  _setOpsForTests(store, async (m) => (mails.push(m), true));
  failUpdate = false;
  clinics = [{ id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null, profile: { name: "Gülüş Dental", country: "TR" } }];
});

describe("payment webhook → owner alerts", () => {
  it("a new paying clinic: good news at once, with name, tier, country and email — and a marker for the first-week watchdog", async () => {
    const res = await post(signed(dvEvent("subscription.active")));
    expect(res.status).toBe(200);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/GÜZEL HABER: Yeni ödeme yapan klinik \/ GOOD NEWS: New paying clinic — Gülüş Dental/);
    expect(mails[0].text).toMatch(/practice \(monthly\) from TR/);
    expect(mails[0].text).toContain("dr@gulus.example");
    expect(mails[0].text).toContain(CLINIC);
    const paid = (await store.list(PAID_LIST_KEY)).map((l) => JSON.parse(l));
    expect(paid).toEqual([{ clinicId: CLINIC, paidAt: expect.any(String) }]);
    // Renewals are not news.
    await post(signed(dvEvent("subscription.renewed", { next_billing_date: "2027-01-08T10:00:00Z" })));
    expect(mails).toHaveLength(1);
  });

  it("a paying clinic cancels → customer at risk, with a suggested action", async () => {
    clinics[0] = { ...clinics[0], plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_dv_1" };
    await post(signed(dvEvent("subscription.cancelled")));
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/DİKKAT: Müşteri aboneliği durdu \/ HEADS-UP: Customer subscription stopped — Gülüş Dental/);
    expect(mails[0].text).toMatch(/active → cancelled/);
    expect(mails[0].text).toMatch(/Ask dr@gulus\.example why/);
  });

  it("on hold → payment-failed alert; payment.failed (plan unchanged) → alert too, once a day", async () => {
    clinics[0] = { ...clinics[0], plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_dv_1" };
    await post(signed(dvEvent("payment.failed", { payment_id: "pay_1" })));
    await post(signed(dvEvent("payment.failed", { payment_id: "pay_2" })));
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/Customer payment failed/);
    await post(signed(dvEvent("subscription.on_hold")));
    expect(mails).toHaveLength(2);
    expect(mails[1].text).toMatch(/active → paused/);
  });

  it("a signed event that cannot be processed → 5xx for Dodo's retry, and the owner told once", async () => {
    failUpdate = true;
    const r1 = await post(signed(dvEvent("subscription.active")));
    const r2 = await post(signed(dvEvent("subscription.active")));
    expect(r1.status).toBe(500);
    expect(r2.status).toBe(500);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/ACİL: Ödeme olayı işlenemedi \/ URGENT: Payment webhook processing failed/);
    expect(mails[0].text).toMatch(/connection refused/);
  });

  it("bad signatures: quiet below the threshold, one alert at 5 in an hour, no storm after", async () => {
    const bad = "whsec_" + Buffer.from("wrong").toString("base64");
    for (let i = 0; i < 4; i++) expect((await post(signed(dvEvent("subscription.active"), bad))).status).toBe(401);
    expect(mails).toEqual([]);
    for (let i = 0; i < 20; i++) await post(signed(dvEvent("subscription.active"), bad));
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/signature failures/);
    expect(mails[0].text).toMatch(/DODO_WEBHOOK_SECRET/);
  });

  it("kill switch: DENTVID_OWNER_ALERTS=off → the webhook works, nobody is emailed", async () => {
    process.env.DENTVID_OWNER_ALERTS = "off";
    try {
      expect((await post(signed(dvEvent("subscription.active")))).status).toBe(200);
      expect(mails).toEqual([]);
    } finally {
      delete process.env.DENTVID_OWNER_ALERTS;
    }
  });
});
