import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent, type DvWebhookDeps } from "./billing-webhook";
import type { DvSubRecord } from "./billing";
import type { SubscriptionStore } from "./subscriptions";
import type { OwnerAlert } from "./ops-alert";

/**
 * The web's Dodo webhook next to App Store plans (docs/DENTVIDEO_IAP_PLAN.md): a clinic whose plan the
 * App Store pays for is never moved by a Dodo event, and a web payment after an App Store plan ended
 * takes the clinic back to the web.
 */

const CLINIC = "11111111-2222-3333-4444-555555555555";
const OWNER = "owner-1";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";

type Clinic = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null; billing_source?: string | null; apple_original_transaction_id?: string | null };

function fakeDb(clinic: Clinic) {
  const updates: Record<string, unknown>[] = [];
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
          if (table === "dentvid_items") return resolve({ count: 0, error: null });
          if (patch && table === "dentvid_clinics") {
            updates.push(patch);
            Object.assign(clinic, patch);
          }
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, updates, clinic };
}

function memorySubs(rows: DvSubRecord[] = []): SubscriptionStore & { rows: Map<string, DvSubRecord>; payments: Map<string, { clinic_id: string; dodo_subscription_id: string | null }> } {
  const map = new Map(rows.map((r) => [r.dodo_subscription_id, { ...r }]));
  const payments = new Map<string, { clinic_id: string; dodo_subscription_id: string | null }>();
  return {
    rows: map,
    payments,
    get: async (id) => map.get(id) ?? null,
    forClinic: async (c) => [...map.values()].filter((r) => r.clinic_id === c),
    put: async (r) => (map.set(r.dodo_subscription_id, { ...map.get(r.dodo_subscription_id), ...r, updated_at: new Date().toISOString() }), true),
    recordPayment: async (p, c, s) => void payments.set(p, { clinic_id: c, dodo_subscription_id: s }),
    paymentClinic: async (p) => payments.get(p) ?? null,
  };
}

const unpaid = (): Clinic => ({ id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null });
const paying = (sub = "sub_1"): Clinic => ({ ...unpaid(), plan: "active", plan_tier: "practice", dodo_subscription_id: sub, plan_renews_at: "2026-12-08T00:00:00Z" });

const evt = (type: string, sub: string, timestamp?: string, extra: Record<string, unknown> = {}) => ({
  type,
  ...(timestamp ? { timestamp } : {}),
  data: {
    subscription_id: sub,
    product_id: PRACTICE,
    status: type === "subscription.active" || type === "subscription.renewed" ? "active" : type.split(".")[1],
    next_billing_date: "2026-12-08T00:00:00Z",
    metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice", interval: "month" },
    ...extra,
  },
});

function deps(over: Partial<DvWebhookDeps> = {}) {
  const raised: OwnerAlert[] = [];
  const d: DvWebhookDeps & { raised: OwnerAlert[] } = {
    raised,
    alert: async (a) => void raised.push(a),
    clinicRef: async (_db, id) => ({ id, name: "Gülüş", email: "dr@clinic.example" }),
    enqueueWeek: vi.fn(async () => "queued" as const),
    sendWelcome: vi.fn(async () => "sent"),
    sendPaymentMail: vi.fn(async () => "sent"),
    markPaid: vi.fn(async () => {}),
    adConversion: vi.fn(async () => "recorded"),
    ownerInternal: async () => false,
    dodoStatus: async () => null,
    selfServe: false,
    ...over,
  };
  return d;
}

const onApple = (): Clinic => ({ ...unpaid(), plan: "active", plan_tier: "practice", plan_renews_at: "2026-12-17T10:00:00Z", billing_source: "apple", apple_original_transaction_id: "2000000100" });

describe("Dodo events for a clinic the App Store pays for", () => {
  it("a Dodo activation is a second subscription: recorded, the owner told to cancel and refund it in Dodo; the plan is untouched", async () => {
    const f = fakeDb(onApple());
    const subs = memorySubs();
    const d = deps({ subs });
    const r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_9", "2026-11-17T10:00:00Z"), d);
    expect(r.body).toMatchObject({ ignored: "app_store_managed" });
    expect(f.clinic).toMatchObject({ plan: "active", billing_source: "apple", dodo_subscription_id: null, plan_tier: "practice" });
    expect(f.updates).toEqual([]);
    expect(d.enqueueWeek).not.toHaveBeenCalled();
    expect(d.sendWelcome).not.toHaveBeenCalled();
    expect(subs.rows.get("sub_9")).toMatchObject({ status: "active", clinic_id: CLINIC });
    const alert = d.raised.find((a) => a.key.startsWith("appstore:cross_channel:"));
    expect(alert?.todo.join(" ")).toMatch(/cancel subscription sub_9 and refund/);
  });

  it("a Dodo cancellation / on hold of an old web subscription never cancels or pauses the App Store plan", async () => {
    for (const type of ["subscription.cancelled", "subscription.on_hold", "subscription.expired"]) {
      const f = fakeDb(onApple());
      const r = await handleDentvideoEvent(f.db, evt(type, "sub_old", "2026-11-17T10:00:00Z"), deps());
      expect(r.body, type).toMatchObject({ ignored: "app_store_managed" });
      expect(f.clinic.plan, type).toBe("active");
    }
  });

  it("payment.failed on an old web subscription sends no 'update your card' email to an App Store clinic", async () => {
    const f = fakeDb({ ...onApple(), dodo_subscription_id: null });
    const subs = memorySubs([{ dodo_subscription_id: "sub_old", clinic_id: CLINIC, status: "on_hold" }]);
    const d = deps({ subs });
    const r = await handleDentvideoEvent(f.db, { type: "payment.failed", data: evt("x", "sub_old").data }, d);
    expect(r.body).toMatchObject({ ignored: "app_store_managed" });
    expect(d.sendPaymentMail).not.toHaveBeenCalled();
  });

  it("a chargeback on an old web payment does not pause a plan the App Store pays for", async () => {
    const f = fakeDb(onApple());
    const subs = memorySubs();
    subs.payments.set("pay_old", { clinic_id: CLINIC, dodo_subscription_id: "sub_old" });
    const d = deps({ subs });
    const r = await handleDentvideoEvent(f.db, { type: "dispute.opened", data: { payment_id: "pay_old" } }, d);
    expect(r.body).toMatchObject({ paused: false });
    expect(f.clinic.plan).toBe("active");
  });

  it("after the App Store plan ended, a web payment switches the clinic on as a Dodo plan again (one week, once)", async () => {
    const f = fakeDb({ ...onApple(), plan: "cancelled", plan_renews_at: null });
    const d = deps();
    const r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_2", "2026-11-17T10:00:00Z"), d);
    expect(r.body).toMatchObject({ plan: "active" });
    expect(f.clinic).toMatchObject({ plan: "active", dodo_subscription_id: "sub_2", billing_source: "dodo" });
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
    // A clinic that paid before (in the app) is not a first web payment: no Google Ads conversion.
    expect(d.adConversion).not.toHaveBeenCalled();
  });

  it("security: before 0026, cancelling the old Dodo subscription (as the cross-channel alert asks) never cancels the clinic Apple moved off it", async () => {
    // The App Store webhook took the clinic over without 0026: plan active, dodo_subscription_id cleared, no billing_source column.
    for (const type of ["subscription.cancelled", "subscription.on_hold", "subscription.expired", "subscription.failed"]) {
      const f = fakeDb({ ...unpaid(), plan: "active", plan_tier: "practice", plan_renews_at: "2026-12-17T10:00:00Z" });
      const subs = memorySubs([{ dodo_subscription_id: "sub_old", clinic_id: CLINIC, status: "active" }]);
      const r = await handleDentvideoEvent(f.db, evt(type, "sub_old", "2026-11-17T10:00:00Z"), deps({ subs }));
      expect(r.body, type).toMatchObject({ ignored: "not the clinic's subscription" });
      expect(f.clinic, type).toMatchObject({ plan: "active", dodo_subscription_id: null, plan_renews_at: "2026-12-17T10:00:00Z" });
      expect(f.updates, type).toEqual([]);
    }
  });

  it("a plain web clinic (no billing source) behaves exactly as before", async () => {
    const f = fakeDb(unpaid());
    const d = deps();
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", "2026-11-17T10:00:00Z"), d);
    expect(f.clinic).toMatchObject({ plan: "active", dodo_subscription_id: "sub_1" });
    expect(f.clinic.billing_source).toBeUndefined();
    expect(d.adConversion).toHaveBeenCalledTimes(1);
  });
});
