import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/dodo/webhook serves two products from one Dodo business: DentVideo
 * events must land on Liman's dentvid_clinics, ClipForge events on the cloud
 * project's profiles/credits — never the other way round.
 */

type Call = { table?: string; op: string; args: unknown[] };

/** A tiny stand-in for supabase-js: records calls, answers selects from `rows`. */
function fakeDb(rows: Record<string, Record<string, unknown>[]> = {}) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let op = "select";
    let payload: unknown = null;
    const q = {
      select: (...args: unknown[]) => {
        calls.push({ table, op: "select", args });
        return q;
      },
      update: (p: unknown) => {
        op = "update";
        payload = p;
        calls.push({ table, op: "update", args: [p] });
        return q;
      },
      ilike: (col: string, v: unknown) => {
        filters.push([col, v]);
        return q;
      },
      eq: (col: string, v: unknown) => {
        filters.push([col, v]);
        if (op === "update") {
          for (const r of rows[table] ?? []) if (filters.every(([c, x]) => r[c] === x)) Object.assign(r, payload);
          return Promise.resolve({ data: null, error: null });
        }
        return q;
      },
      // dentvid_items head count ("is this week already made?"): none yet.
      neq: (col: string, v: unknown) => {
        calls.push({ table, op: "count", args: [...filters, [col, v]] });
        return Promise.resolve({ count: 0, data: null, error: null });
      },
      maybeSingle: () => {
        const hit = (rows[table] ?? []).find((r) => filters.every(([c, x]) => r[c] === x)) ?? null;
        return Promise.resolve({ data: hit ? { ...hit } : null, error: null });
      },
    };
    return q;
  };
  const rpc = (name: string, args: unknown) => {
    calls.push({ op: `rpc:${name}`, args: [args] });
    return Promise.resolve({ data: null, error: null });
  };
  return { calls, rows, client: { from, rpc } };
}

let cloud = fakeDb();
let liman = fakeDb();

vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => cloud.client }));
vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => liman.client }));
const queued: { name: string; data: unknown; opts: Record<string, unknown> }[] = [];
vi.mock("@/lib/queue", () => ({
  dentvidQueue: { add: async (name: string, data: unknown, opts: Record<string, unknown>) => void queued.push({ name, data, opts }) },
}));

const SECRET = "whsec_" + Buffer.from("test-secret-for-dodo-webhooks").toString("base64");
process.env.DODO_WEBHOOK_SECRET = SECRET;
process.env.DODO_PRODUCT_PLUS_WEEKLY = "pdt_cf_week";

function signed(event: unknown, secret = SECRET) {
  const body = JSON.stringify(event);
  const id = "msg_test";
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return new Request("https://dentvideo.com/api/dodo/webhook", {
    method: "POST",
    headers: { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}`, "content-type": "application/json" },
    body,
  });
}

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const CF_USER = "2d0c5e8a-3f4b-4c7d-9e0f-1a2b3c4d5e6f";

const dvEvent = (type: string, extra: Record<string, unknown> = {}) => ({
  business_id: "bus_x",
  type,
  timestamp: "2026-11-08T10:00:00Z",
  data: {
    payload_type: "Subscription",
    subscription_id: "sub_dv_1",
    product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN",
    brand_id: "brnd_0NrVafyQGNiKOz0caOKgm",
    status: "active",
    next_billing_date: "2026-12-08T10:00:00Z",
    previous_billing_date: "2026-11-08T10:00:00Z",
    customer: { email: "dr@clinic.example" },
    metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice", interval: "month" },
    ...extra,
  },
});

async function post(req: Request) {
  const { POST } = await import("./route");
  const res = await POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  queued.length = 0;
  cloud = fakeDb({ profiles: [{ id: CF_USER, email: "dr@clinic.example", tier: "free" }] });
  liman = fakeDb({ dentvid_clinics: [{ id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null }] });
});

describe("POST /api/dodo/webhook", () => {
  it("rejects a bad signature before touching either database", async () => {
    const res = await post(signed(dvEvent("subscription.active"), "whsec_" + Buffer.from("wrong").toString("base64")));
    expect(res.status).toBe(401);
    expect(cloud.calls).toHaveLength(0);
    expect(liman.calls).toHaveLength(0);
  });

  it("DentVideo activation updates the clinic on Liman and leaves ClipForge alone", async () => {
    const res = await post(signed(dvEvent("subscription.active")));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ app: "dentvideo", plan: "active" });
    expect(liman.rows.dentvid_clinics[0]).toMatchObject({ plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_dv_1", plan_renews_at: "2026-12-08T10:00:00Z" });
    expect(cloud.calls).toHaveLength(0);
  });

  it("payment → the clinic's first week is queued at once (no free week, nothing before payment)", async () => {
    const res = await post(signed(dvEvent("subscription.active")));
    expect(res.body).toMatchObject({ plan: "active", firstWeek: "queued" });
    expect(queued).toHaveLength(1);
    expect(queued[0].name).toBe("week");
    expect(queued[0].data).toEqual({ clinicId: CLINIC, count: 5, week: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(String(queued[0].opts.jobId)).toMatch(new RegExp(`^week:${CLINIC}:\\d{4}-\\d{2}-\\d{2}$`));
    // A repeat of the same event queues nothing more.
    await post(signed(dvEvent("subscription.active")));
    expect(queued).toHaveLength(1);
  });

  it("is idempotent: the same event twice writes once", async () => {
    await post(signed(dvEvent("subscription.active")));
    const updatesBefore = liman.calls.filter((c) => c.op === "update").length;
    const res = await post(signed(dvEvent("subscription.active")));
    expect(res.body).toMatchObject({ unchanged: true });
    expect(liman.calls.filter((c) => c.op === "update").length).toBe(updatesBefore);
  });

  it("cancel → cancelled, hold → paused, and a stale subscription is ignored", async () => {
    await post(signed(dvEvent("subscription.active")));
    await post(signed(dvEvent("subscription.cancelled", { subscription_id: "sub_old", status: "cancelled" })));
    expect(liman.rows.dentvid_clinics[0].plan).toBe("active");
    await post(signed(dvEvent("subscription.on_hold", { status: "on_hold" })));
    expect(liman.rows.dentvid_clinics[0].plan).toBe("paused");
    await post(signed(dvEvent("subscription.expired", { status: "expired" })));
    expect(liman.rows.dentvid_clinics[0].plan).toBe("cancelled");
    expect(cloud.calls).toHaveLength(0);
  });

  it("finds the clinic by subscription id when metadata is missing (brand routes it)", async () => {
    liman.rows.dentvid_clinics[0] = { ...liman.rows.dentvid_clinics[0], plan: "active", dodo_subscription_id: "sub_dv_1" };
    const res = await post(signed(dvEvent("subscription.cancelled", { metadata: {}, status: "cancelled" })));
    expect(res.status).toBe(200);
    expect(liman.rows.dentvid_clinics[0].plan).toBe("cancelled");
    expect(cloud.calls).toHaveLength(0);
  });

  it("acknowledges an event for an unknown clinic without writing", async () => {
    const res = await post(signed(dvEvent("subscription.active", { metadata: { app: "dentvideo", clinic_id: "9f9f9f9f-1d2f-4a5b-9c8d-7e6f5a4b3c2d", owner_id: OWNER } })));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ignored: "no clinic" });
    expect(liman.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("DentVideo payment events are acknowledged and do not grant ClipForge credits", async () => {
    const res = await post(signed({ type: "payment.succeeded", data: { payment_id: "pay_1", subscription_id: "sub_dv_1", customer: { email: "dr@clinic.example" }, metadata: { app: "dentvideo", clinic_id: CLINIC } } }));
    expect(res.status).toBe(200);
    expect(cloud.calls).toHaveLength(0);
  });

  it("ClipForge events still grant credits and never reach Liman", async () => {
    const res = await post(
      signed({
        type: "subscription.active",
        data: { subscription_id: "sub_cf_1", product_id: "pdt_cf_week", previous_billing_date: "2026-11-08T10:00:00Z", metadata: { user_id: CF_USER, plan: "clipforge_plus_weekly" } },
      }),
    );
    expect(res.status).toBe(200);
    expect(cloud.calls.find((c) => c.op === "rpc:grant_credits")?.args[0]).toMatchObject({ p_user_id: CF_USER, p_amount: 30, p_reference: "dodo:sub:sub_cf_1:2026-11-08T10:00:00Z" });
    expect(cloud.rows.profiles[0].tier).toBe("starter");
    expect(liman.calls).toHaveLength(0);
  });
});
