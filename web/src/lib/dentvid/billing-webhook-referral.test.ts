import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent, type DvWebhookDeps } from "./billing-webhook";
import type { DvSubRecord } from "./billing";
import type { SubscriptionStore } from "./subscriptions";
import type { ReferralStore } from "./referrals-server";
import { countsTowardCap, REFERRAL, type RewardRow } from "./referrals";

/**
 * "Give a month, get a month" through the Dodo webhook: the referrer's free
 * month is recorded once on the referred clinic's first successful payment,
 * voided by a refund or chargeback, never for a self-referral, capped.
 */

const REFERRER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLINIC = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OWNER = "owner-b";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";

type Clinic = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

function fakeDb(clinic: Clinic) {
  const db = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        update: (p: Record<string, unknown>) => ((patch = p), q),
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        neq: () => q,
        maybeSingle: async () => {
          if (table !== "dentvid_clinics") return { data: null, error: { code: "42P01", message: "relation does not exist" } };
          const match = filters.every(([k, v]) => (clinic as Record<string, unknown>)[k] === v);
          return { data: match ? { ...clinic } : null, error: null };
        },
        then(resolve: (v: unknown) => void) {
          if (patch && table === "dentvid_clinics") Object.assign(clinic, patch);
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, clinic };
}

function memorySubs(): SubscriptionStore {
  const map = new Map<string, DvSubRecord>();
  const payments = new Map<string, { clinic_id: string; dodo_subscription_id: string | null }>();
  return {
    get: async (id) => map.get(id) ?? null,
    forClinic: async (c) => [...map.values()].filter((r) => r.clinic_id === c),
    put: async (r) => (map.set(r.dodo_subscription_id, { ...r }), true),
    recordPayment: async (p, c, s) => void payments.set(p, { clinic_id: c, dodo_subscription_id: s }),
    paymentClinic: async (p) => payments.get(p) ?? null,
  };
}

/** Rewards with the database's one-row-per-referred-clinic rule. */
function memoryReferrals(opts: { referred?: boolean; emails?: Record<string, string>; existing?: RewardRow[] } = {}) {
  const rows: RewardRow[] = [...(opts.existing ?? [])];
  const store: ReferralStore & { rows: RewardRow[] } = {
    rows,
    referralOf: async (id) => (id === CLINIC && opts.referred !== false ? { code: "DV7K3M9Q", referrerClinicId: REFERRER } : null),
    rewardFor: async (id) => rows.find((r) => r.referred_clinic_id === id) ?? null,
    recentCount: async (id, now) => countsTowardCap(rows.filter((r) => r.referrer_clinic_id === id), now),
    insertReward: async (row) => {
      if (rows.some((r) => r.referred_clinic_id === row.referred_clinic_id)) return "exists";
      rows.push({ ...row, id: rows.length + 1 });
      return "created";
    },
    voidReward: async (id, reason) => {
      for (const r of rows) if (r.referred_clinic_id === id && (r.status === "pending" || r.status === "capped")) Object.assign(r, { status: "void", void_reason: reason });
    },
    ownerEmail: async (id) => opts.emails?.[id] ?? null,
  };
  return store;
}

const unpaid = (): Clinic => ({ id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null });

const payment = (paymentId: string, extra: Record<string, unknown> = {}) => ({
  type: "payment.succeeded",
  timestamp: "2026-11-15T10:00:00Z",
  data: {
    payment_id: paymentId,
    subscription_id: "sub_1",
    product_id: PRACTICE,
    total_amount: 2450,
    customer: { email: "b@clinic-b.example" },
    metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice", interval: "month" },
    ...extra,
  },
});

const moneyBack = (type: string) => ({ type, data: { payment_id: "pay_1", metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER } } });

function deps(referrals: ReferralStore, over: Partial<DvWebhookDeps> = {}): DvWebhookDeps {
  return {
    alert: async () => {},
    clinicRef: async (_db, id) => ({ id, name: "Clinic B" }),
    enqueueWeek: vi.fn(async () => "queued" as const),
    sendWelcome: vi.fn(async () => "sent"),
    sendPaymentMail: vi.fn(async () => "sent"),
    markPaid: vi.fn(async () => {}),
    dodoStatus: async () => null,
    subs: memorySubs(),
    referrals,
    now: () => new Date("2026-11-15T10:00:05Z"),
    ...over,
  };
}

const emails = { [REFERRER]: "a@clinic-a.example", [CLINIC]: "b@clinic-b.example" };

describe("referral reward via the Dodo webhook", () => {
  it("records the referrer's month once: a retried event and the next month's payment add nothing", async () => {
    const f = fakeDb(unpaid());
    const refs = memoryReferrals({ emails });
    const d = deps(refs);
    const r1 = await handleDentvideoEvent(f.db, payment("pay_1"), d);
    expect(r1).toMatchObject({ status: 200, body: { referral: "reward pending" } });
    const r2 = await handleDentvideoEvent(f.db, payment("pay_1"), d);
    expect(r2.body).toMatchObject({ referral: "exists" });
    const r3 = await handleDentvideoEvent(f.db, { ...payment("pay_2"), timestamp: "2026-12-15T10:00:00Z" }, d);
    expect(r3.body).toMatchObject({ referral: "exists" });
    expect(refs.rows).toHaveLength(1);
    expect(refs.rows[0]).toMatchObject({
      referrer_clinic_id: REFERRER,
      referred_clinic_id: CLINIC,
      dodo_payment_id: "pay_1",
      status: "pending",
      first_paid_at: "2026-11-15T10:00:00.000Z",
      eligible_at: new Date(Date.parse("2026-11-15T10:00:00Z") + REFERRAL.holdDays * 86_400_000).toISOString(),
    });
  });

  it("a clinic that was not referred records nothing", async () => {
    const refs = memoryReferrals({ referred: false, emails });
    const r = await handleDentvideoEvent(fakeDb(unpaid()).db, payment("pay_1"), deps(refs));
    expect(r.body).not.toHaveProperty("referral");
    expect(refs.rows).toHaveLength(0);
  });

  it("self-referral: the referrer paying for the 'referred' clinic earns no month", async () => {
    const refs = memoryReferrals({ emails });
    const r = await handleDentvideoEvent(fakeDb(unpaid()).db, payment("pay_1", { customer: { email: "A@clinic-a.example" } }), deps(refs));
    expect(r.body).toMatchObject({ referral: "reward void" });
    expect(refs.rows[0]).toMatchObject({ status: "void", void_reason: "self_referral" });
  });

  it("a refund within the window voids the month; a later payment does not bring it back", async () => {
    const f = fakeDb(unpaid());
    const refs = memoryReferrals({ emails });
    const d = deps(refs);
    await handleDentvideoEvent(f.db, payment("pay_1"), d);
    const r = await handleDentvideoEvent(f.db, moneyBack("refund.succeeded"), d);
    expect(r).toMatchObject({ status: 200, body: { referral: "reward void" } });
    expect(refs.rows[0]).toMatchObject({ status: "void", void_reason: "refund.succeeded" });
    await handleDentvideoEvent(f.db, payment("pay_2"), d);
    expect(refs.rows).toHaveLength(1);
    expect(refs.rows[0].status).toBe("void");
  });

  it("a chargeback voids it too; a failed refund does not", async () => {
    const f = fakeDb({ ...unpaid(), plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1" });
    const refs = memoryReferrals({ emails });
    const d = deps(refs);
    await handleDentvideoEvent(f.db, payment("pay_1"), d);
    await handleDentvideoEvent(f.db, moneyBack("refund.failed"), d);
    expect(refs.rows[0].status).toBe("pending");
    await handleDentvideoEvent(f.db, moneyBack("dispute.opened"), d);
    expect(refs.rows[0]).toMatchObject({ status: "void", void_reason: "dispute.opened" });
  });

  it("a month already applied is left alone (the owner decides)", async () => {
    const f = fakeDb(unpaid());
    const applied: RewardRow = { id: 1, referred_clinic_id: CLINIC, referrer_clinic_id: REFERRER, code: "DV7K3M9Q", first_paid_at: "2026-10-01T00:00:00Z", eligible_at: "2026-10-31T00:00:00Z", status: "applied" };
    const refs = memoryReferrals({ emails, existing: [applied] });
    const r = await handleDentvideoEvent(f.db, moneyBack("refund.succeeded"), deps(refs));
    expect(r.body).toMatchObject({ referral: "reward already applied" });
    expect(refs.rows[0].status).toBe("applied");
  });

  it("over the yearly cap the month is recorded as capped", async () => {
    const others: RewardRow[] = Array.from({ length: REFERRAL.capPerYear }, (_, i) => ({
      id: i + 10,
      referred_clinic_id: `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, "0")}`,
      referrer_clinic_id: REFERRER,
      code: "DV7K3M9Q",
      first_paid_at: "2026-06-01T00:00:00Z",
      eligible_at: "2026-07-01T00:00:00Z",
      status: "applied",
    }));
    const refs = memoryReferrals({ emails, existing: others });
    const r = await handleDentvideoEvent(fakeDb(unpaid()).db, payment("pay_1"), deps(refs));
    expect(r.body).toMatchObject({ referral: "reward capped" });
  });

  it("a database error is retried by Dodo (500), not lost", async () => {
    const refs = memoryReferrals({ emails });
    refs.insertReward = async () => {
      throw new Error("connection reset");
    };
    const r = await handleDentvideoEvent(fakeDb(unpaid()).db, payment("pay_1"), deps(refs));
    expect(r.status).toBe(500);
  });

  it("before migration 0018 nothing changes", async () => {
    const refs = memoryReferrals({ emails });
    refs.referralOf = async () => undefined;
    const r = await handleDentvideoEvent(fakeDb(unpaid()).db, payment("pay_1"), deps(refs));
    expect(r).toMatchObject({ status: 200, body: { recorded: "payment.succeeded" } });
    expect(r.body).not.toHaveProperty("referral");
  });
});
