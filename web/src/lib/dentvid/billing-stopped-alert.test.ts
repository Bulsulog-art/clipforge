import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent, stoppedAlert, type DvWebhookDeps } from "./billing-webhook";
import { alerts, type OwnerAlert } from "./ops-alert";
import type { DvSubRecord } from "./billing";
import type { SubscriptionStore } from "./subscriptions";

/**
 * The owner's "subscription stopped" alert for a cancellation that ends a paying clinic's plan now says
 * what the clinic was told in writing. The written confirmation goes out only with the first word of a
 * cancellation that keeps a paid-through date (billing-webhook-confirm.test.ts covers that alert); a
 * plan that stops at once gets none, and the alert must not say Dodo's payment notices covered it.
 */

const CLINIC = "11111111-2222-3333-4444-555555555555";
const OWNER = "owner-1";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";
const END = "2026-12-10T00:00:00.000Z";

type Row = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

function fakeDb(row: Row): SupabaseClient {
  return {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        update: (p: Record<string, unknown>) => ((patch = p), q),
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        neq: () => q,
        limit: () => q,
        maybeSingle: async () => {
          if (table !== "dentvid_clinics") return { data: null, error: { code: "42P01", message: "relation does not exist" } };
          return { data: filters.every(([k, v]) => (row as Record<string, unknown>)[k] === v) ? { ...row } : null, error: null };
        },
        then(resolve: (v: unknown) => void) {
          if (!patch && table !== "dentvid_clinics") return resolve({ data: null, error: { code: "42P01", message: `relation "public.${table}" does not exist` } });
          if (patch && table === "dentvid_clinics") Object.assign(row, patch);
          return resolve({ error: null });
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

function ledger(status: string): SubscriptionStore {
  const map = new Map<string, DvSubRecord>([["sub_1", { dodo_subscription_id: "sub_1", clinic_id: CLINIC, status, tier: "practice", product: PRACTICE, period_end: END, last_event_at: "2026-11-10T00:00:00.000Z" }]]);
  return {
    get: async (id) => map.get(id) ?? null,
    forClinic: async (c) => [...map.values()].filter((r) => r.clinic_id === c),
    put: async (r) => (map.set(r.dodo_subscription_id, { ...map.get(r.dodo_subscription_id), ...r }), true),
    recordPayment: async () => {},
    paymentClinic: async () => null,
  };
}

const paying = (): Row => ({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: END });
const event = (type: string, nbd: string | null, timestamp = "2026-11-20T00:00:00Z") => ({
  type,
  timestamp,
  data: { subscription_id: "sub_1", product_id: PRACTICE, status: type.split(".")[1], next_billing_date: nbd, metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER } },
});

function deps(over: Partial<DvWebhookDeps>, now = new Date("2026-11-20T00:00:00Z")) {
  const raised: OwnerAlert[] = [];
  const d: DvWebhookDeps & { raised: OwnerAlert[] } = {
    raised,
    alert: async (a) => void raised.push(a),
    clinicRef: async (_db, id) => ({ id, name: "Sample Dental Practice", email: "dr@clinic.example" }),
    enqueueWeek: vi.fn(async () => "queued" as const),
    sendWelcome: vi.fn(async () => "sent"),
    sendPaymentMail: vi.fn(async () => "sent"),
    sendConfirmMail: vi.fn(async () => "sent"),
    markPaid: vi.fn(async () => {}),
    ownerInternal: async () => false,
    dodoStatus: async () => null,
    paidThrough: async () => null,
    appleManaged: async () => false,
    apple: { get: async () => null, forClinic: async () => [], put: async () => true },
    deletionRequested: async () => false,
    now: () => now,
    selfServe: true,
    ...over,
  };
  return d;
}

const text = (a: OwnerAlert) => [...a.done, ...a.todo].join(" ");

describe("a cancellation that ends the plan at once: the owner's alert", () => {
  it("says no written confirmation went out and how to confirm by hand, never 'payment notices'", async () => {
    const row = paying();
    const d = deps({ subs: ledger("active") });
    const r = await handleDentvideoEvent(fakeDb(row), event("subscription.cancelled", null), d);
    expect(r.body).toMatchObject({ plan: "cancelled" });
    expect(row.plan).toBe("cancelled");
    expect(d.sendConfirmMail).not.toHaveBeenCalled();
    expect(d.raised).toHaveLength(1);
    const a = d.raised[0];
    expect(a.titleEn).toBe("Customer subscription stopped");
    expect(a.done[1]).toBe("No written confirmation went to the clinic. DentVideo confirms a cancellation by email when the plan runs on to the end of a paid period, and this one ended at once.");
    expect(a.todo[0]).toBe("If the clinic asked to cancel, confirm it to dr@clinic.example by hand: its weekly videos have stopped, and its library stays for 90 days unless it chooses a plan again.");
    expect(text(a)).not.toMatch(/payment notices/);
    // The usual question stays.
    expect(a.todo.at(-1)).toMatch(/^Ask dr@clinic\.example why/);
  });

  it("an account being deleted: no email, rightly, and nothing to confirm by hand", async () => {
    const d = deps({ subs: ledger("active"), deletionRequested: async (owner) => owner === OWNER });
    await handleDentvideoEvent(fakeDb(paying()), event("subscription.cancelled", null), d);
    const a = d.raised[0];
    expect(a.done[1]).toMatch(/asked to delete the account in the last hour or two/);
    expect(a.todo[0]).toMatch(/^If the clinic still exists tomorrow, its deletion did not finish/);
    expect(text(a)).not.toMatch(/by hand/);
  });

  it("a deletion that could not be checked: confirm by hand, with a word about that", async () => {
    const d = deps({ subs: ledger("active"), deletionRequested: async () => null });
    await handleDentvideoEvent(fakeDb(paying()), event("subscription.cancelled", null), d);
    const a = d.raised[0];
    expect(a.todo[0]).toMatch(/^If the clinic asked to cancel, confirm it/);
    expect(a.todo[1]).toMatch(/could not be checked whether the owner asked to delete the account/);
  });

  it("without the ledger (0007) the same: the plan ends at once, and so does the alert's account", async () => {
    const subs: SubscriptionStore = { get: async () => undefined, forClinic: async () => null, put: async () => false, recordPayment: async () => {}, paymentClinic: async () => null };
    const d = deps({ subs });
    await handleDentvideoEvent(fakeDb(paying()), event("subscription.cancelled", END), d);
    expect(d.raised[0].done[1]).toMatch(/^No written confirmation went to the clinic/);
  });
});

describe("the end of a cancellation the clinic was told about", () => {
  it("points back to the earlier confirmation instead of asking for another", async () => {
    const d = deps({ subs: ledger("cancelled") }, new Date("2026-12-10T01:00:00Z"));
    await handleDentvideoEvent(fakeDb(paying()), event("subscription.expired", END, "2026-12-10T00:30:00Z"), d);
    const a = d.raised[0];
    expect(a.done[1]).toMatch(/end date of a cancellation Dodo reported earlier/);
    expect(text(a)).not.toMatch(/by hand/);
    expect(d.sendConfirmMail).not.toHaveBeenCalled();
  });
});

describe("payment trouble is unchanged", () => {
  it("on hold: the payment email line, no word about a cancellation confirmation", async () => {
    const d = deps({ subs: ledger("active") });
    await handleDentvideoEvent(fakeDb(paying()), event("subscription.on_hold", END), d);
    const a = d.raised[0];
    expect(a.done[1]).toMatch(/^The clinic was emailed what happened and how to update its card/);
    expect(text(a)).not.toMatch(/written confirmation/);
  });

  it("stoppedAlert keeps the alert's key, title and clinic", () => {
    const base = alerts.customerAtRisk({ clinic: { id: CLINIC, email: "dr@clinic.example" }, event: "subscription.cancelled", from: "active", to: "cancelled" });
    for (const c of [{ kind: "end of notice" as const }, { kind: "ended now" as const, deleting: false }, { kind: "ended now" as const, deleting: true }]) {
      const a = stoppedAlert(base, c, "dr@clinic.example");
      expect(a).toMatchObject({ key: base.key, titleEn: base.titleEn, titleTr: base.titleTr, clinic: base.clinic, severity: base.severity });
      expect(a.done).toHaveLength(2);
    }
  });
});
