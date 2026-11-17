import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pickWaitingApple, supabaseAppleTakeoverDb, takeOverWithWaitingApple, type AppleLedgerRow, type AppleTakeoverDb } from "./apple-takeover.js";
import { endPaidUpPlans, type EndingSub, type PlanEndDb } from "./plan-end.js";
import { reconcileBilling, type ActiveClinic } from "./reconcile.js";
import type { OwnerAlert } from "./ops-alert.js";

vi.mock("../logger.js", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

/**
 * The worker ends a web plan (plan-end at its paid date, reconcile when Dodo says cancelled): an App Store
 * subscription bought while that plan was live (ledger ignored_web_active) must take over at once — the
 * customer is paying Apple and must never sit unserved. No new week, no second welcome.
 */

const NOW = new Date("2026-12-10T01:00:00Z");
const END = "2026-12-10T00:40:00.000Z";
const OTID = "2000000100";

type Clinic = {
  plan: string;
  sub: string | null;
  plan_tier?: string | null;
  plan_renews_at?: string | null;
  billing_source?: string | null;
  apple_original_transaction_id?: string | null;
  weeksQueued: number;
  welcomes: number;
};

const waiting = (over: Partial<AppleLedgerRow> = {}): AppleLedgerRow => ({
  original_transaction_id: OTID,
  status: "ignored_web_active",
  tier: "practice",
  environment: "PRODUCTION",
  period_end: "2027-01-05T00:00:00.000Z",
  ...over,
});

/** One in-memory world: clinics, the Apple ledger (null = 0026 not applied), the Dodo plan-end ledger. */
function world(clinics: Record<string, Clinic>, ledger: Record<string, AppleLedgerRow[]> | null) {
  const raised: OwnerAlert[] = [];
  const apple: AppleTakeoverDb = {
    appleRows: async (id) => (ledger ? (ledger[id] ?? []) : null),
    moveToApple: async (id, row) => {
      const c = clinics[id];
      if (!c || c.plan !== "cancelled") return false;
      Object.assign(c, { plan: "active", plan_tier: row.tier, plan_renews_at: row.period_end, sub: null, billing_source: "apple", apple_original_transaction_id: row.original_transaction_id });
      const r = ledger?.[id]?.find((x) => x.original_transaction_id === row.original_transaction_id);
      if (r) r.status = "active";
      return true;
    },
    clinic: async (id) => ({ id, name: "Gülüş" }),
  };
  const alert = async (a: OwnerAlert) => void raised.push(a);
  const planDb = (rows: EndingSub[]): PlanEndDb => ({
    endedSince: async () => rows,
    endPlan: async (clinicId, sub) => {
      const c = clinics[clinicId];
      if (!c || c.plan !== "active" || c.sub !== sub) return false;
      c.plan = "cancelled";
      return true;
    },
  });
  return { apple, alert, raised, planDb };
}

const onDodo = (): Clinic => ({ plan: "active", sub: "sub_1", plan_tier: "starter", plan_renews_at: END, billing_source: "dodo", weeksQueued: 0, welcomes: 0 });
const ended: EndingSub[] = [{ dodo_subscription_id: "sub_1", clinic_id: "c1", status: "cancelled", period_end: END }];

describe("worker: an App Store subscription waiting for a web plan takes over when the worker ends that plan", () => {
  it("plan-end at the paid date: the clinic moves onto the waiting Apple subscription at once (never unserved), no week, no welcome", async () => {
    const clinics = { c1: onDodo() };
    const ledger = { c1: [waiting()] };
    const w = world(clinics, ledger);
    const res = await endPaidUpPlans(w.planDb(ended), NOW, { db: w.apple, alert: w.alert });
    expect(res.ended).toEqual(["c1"]);
    expect(res.movedToApple).toEqual(["c1"]);
    // Without the takeover the clinic would sit at plan "cancelled" while Apple keeps charging (the mutation test).
    expect(clinics.c1).toMatchObject({ plan: "active", billing_source: "apple", apple_original_transaction_id: OTID, plan_tier: "practice", plan_renews_at: "2027-01-05T00:00:00.000Z", sub: null });
    expect(ledger.c1[0].status).toBe("active");
    expect(clinics.c1.weeksQueued).toBe(0);
    expect(clinics.c1.welcomes).toBe(0);
    const a = w.raised.find((x) => x.key.startsWith("appstore:web_active:"));
    expect(a?.done.join(" ")).toMatch(/now runs on the App Store subscription/);
    // A second run changes nothing.
    expect((await endPaidUpPlans(w.planDb(ended), NOW, { db: w.apple, alert: w.alert })).ended).toEqual([]);
  });

  it("only a real, paid-up, held-back subscription takes over: sandbox, refunded, expired, over or tier-less rows never do", async () => {
    for (const row of [
      waiting({ environment: "SANDBOX" }),
      waiting({ status: "refunded" }),
      waiting({ status: "expired" }),
      waiting({ status: "ignored_sandbox" }),
      waiting({ period_end: "2026-12-01T00:00:00.000Z" }),
      waiting({ period_end: null }),
      waiting({ tier: null }),
    ]) {
      const clinics = { c1: onDodo() };
      const w = world(clinics, { c1: [row] });
      const res = await endPaidUpPlans(w.planDb(ended), NOW, { db: w.apple, alert: w.alert });
      expect(res.movedToApple ?? [], JSON.stringify(row)).toEqual([]);
      expect(clinics.c1.plan, JSON.stringify(row)).toBe("cancelled");
    }
    expect(pickWaitingApple([waiting({ status: "refunded" }), waiting({ original_transaction_id: "2000000200" })], NOW)?.original_transaction_id).toBe("2000000200");
  });

  it("without migration 0026 (ledger unreadable) nothing is switched and the owner is alerted", async () => {
    const clinics = { c1: onDodo() };
    const w = world(clinics, null);
    const res = await endPaidUpPlans(w.planDb(ended), NOW, { db: w.apple, alert: w.alert });
    expect(res.ended).toEqual(["c1"]);
    expect(clinics.c1.plan).toBe("cancelled");
    const a = w.raised.find((x) => x.key.startsWith("appstore:takeover_unchecked:"));
    expect(a?.severity).toBe("urgent");
    expect(a?.todo.join(" ")).toMatch(/0026/);
  });

  it("a clinic with no App Store subscription (readable ledger, zero rows) gets no alert at all — production query included", async () => {
    const zero = (data: unknown) =>
      ({
        from: (table: string) => {
          expect(table).toBe("dentvid_apple_subscriptions");
          const q = { select: () => q, eq: () => q, limit: async () => ({ data, error: null }) };
          return q;
        },
      }) as unknown as SupabaseClient;
    for (const data of [[], null]) {
      const prod = supabaseAppleTakeoverDb(zero(data));
      expect(await prod.appleRows("c1")).toEqual([]);
      const raised: OwnerAlert[] = [];
      expect(await takeOverWithWaitingApple({ db: prod, alert: async (a) => void raised.push(a) }, "c1", "test", NOW)).toBeNull();
      expect(raised).toEqual([]);
    }
    const clinics = { c1: onDodo() };
    const w = world(clinics, { c1: [] });
    await endPaidUpPlans(w.planDb(ended), NOW, { db: w.apple, alert: w.alert });
    expect(clinics.c1.plan).toBe("cancelled");
    expect(w.raised).toEqual([]);
  });

  it("a ledger read that throws is treated like an unreadable ledger: plan end stands, owner alerted, no throw", async () => {
    const clinics = { c1: onDodo() };
    const w = world(clinics, {});
    const db: AppleTakeoverDb = { ...w.apple, appleRows: async () => { throw new Error("timeout"); } };
    expect(await takeOverWithWaitingApple({ db, alert: w.alert }, "c1", "test", NOW)).toBeNull();
    expect(w.raised.some((x) => x.key.startsWith("appstore:takeover_unchecked:"))).toBe(true);
  });

  it("nightly reconcile: Dodo says cancelled and the paid time is over → the waiting Apple subscription takes over, no 'access lapsed' alert", async () => {
    const clinics: Record<string, Clinic> = { c1: { ...onDodo(), plan_renews_at: "2026-12-01T00:00:00.000Z" } };
    const ledger = { c1: [waiting()] };
    const w = world(clinics, ledger);
    const active: ActiveClinic = { id: "c1", plan_renews_at: "2026-12-01T00:00:00.000Z", dodo_subscription_id: "sub_1" };
    const res = await reconcileBilling({
      db: {
        activeClinics: async () => [active],
        setPlan: async (_c, plan) => ((clinics.c1.plan = plan), true),
        setRenewsAt: async () => {},
        markLedger: async () => {},
        clinic: async (id) => ({ id }),
      },
      dodo: async () => ({ status: "cancelled", next_billing_date: null }),
      alert: w.alert,
      apple: w.apple,
      now: NOW,
    });
    expect(res.cancelled).toEqual(["c1"]);
    expect(clinics.c1).toMatchObject({ plan: "active", billing_source: "apple", apple_original_transaction_id: OTID });
    expect(w.raised.some((x) => x.key.startsWith("lapsed:"))).toBe(false);
    expect(w.raised.some((x) => x.key.startsWith("appstore:web_active:"))).toBe(true);
  });

  it("nightly reconcile: a paused (on hold) web plan is not ended, so nothing takes over", async () => {
    const clinics: Record<string, Clinic> = { c1: { ...onDodo(), plan_renews_at: "2026-12-01T00:00:00.000Z" } };
    const w = world(clinics, { c1: [waiting()] });
    await reconcileBilling({
      db: {
        activeClinics: async () => [{ id: "c1", plan_renews_at: "2026-12-01T00:00:00.000Z", dodo_subscription_id: "sub_1" }],
        setPlan: async (_c, plan) => ((clinics.c1.plan = plan), true),
        setRenewsAt: async () => {},
        markLedger: async () => {},
        clinic: async (id) => ({ id }),
      },
      dodo: async () => ({ status: "on_hold", next_billing_date: null }),
      alert: w.alert,
      apple: w.apple,
      now: NOW,
    });
    expect(clinics.c1).toMatchObject({ plan: "paused", billing_source: "dodo" });
  });
});
