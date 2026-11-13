import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent, metadataMatchesClinic } from "./billing-webhook";
import type { OwnerAlert } from "./ops-alert";

/**
 * Checkout metadata is the buyer's to set: a Dodo static payment link takes any
 * metadata_<key> in its URL (checkout.dodopayments.com/buy/<product>?metadata_app=dentvideo
 * &metadata_clinic_id=…&metadata_plan=practice). The webhook must act only on
 * what Dodo signs about the purchase itself (the product), and only on the
 * clinic whose owner the metadata names.
 */

const CLINIC = "11111111-2222-4333-8444-555555555555";
const OWNER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_OWNER = "99999999-8888-4777-8666-555555555555";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";
const STARTER = "pdt_0NrVahwZsINvy3TNz2H35";
const CLIPFORGE_WEEKLY = "pdt_cf_week";

type Clinic = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

function fakeDb(clinic: Clinic) {
  const db = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        update: (p: Record<string, unknown>) => ((patch = p), q),
        upsert: () => q,
        insert: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        neq: () => q,
        in: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => {
          if (table !== "dentvid_clinics") return { data: null, error: null };
          const match = filters.every(([k, v]) => (clinic as Record<string, unknown>)[k] === v);
          return { data: match ? { ...clinic } : null, error: null };
        },
        then(resolve: (v: unknown) => void) {
          if (table === "dentvid_clinics" && patch) Object.assign(clinic, patch);
          return resolve({ data: [], error: null, count: 0 });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, clinic };
}

const unpaid = (): Clinic => ({ id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null });

const event = (type: string, data: Record<string, unknown>) => ({
  type,
  data: { subscription_id: "sub_x", status: "active", next_billing_date: "2026-12-08T00:00:00Z", ...data },
});

function deps() {
  const alerts: OwnerAlert[] = [];
  return {
    alerts,
    d: {
      alert: vi.fn(async (a: OwnerAlert) => void alerts.push(a)),
      enqueueWeek: vi.fn(async () => "queued" as const),
      sendWelcome: vi.fn(async () => "sent"),
      markPaid: vi.fn(async () => {}),
      clinicRef: vi.fn(async () => ({ id: CLINIC })),
      dodoStatus: vi.fn(async () => null),
      subs: {
        get: vi.fn(async () => undefined),
        put: vi.fn(async () => true),
        forClinic: vi.fn(async () => null),
        recordPayment: vi.fn(async () => true),
        paymentClinic: vi.fn(async () => null),
      },
    },
  };
}

describe("Dodo webhook: checkout metadata is not trusted", () => {
  it("never activates a clinic for a product that is not a DentVideo plan (a cheaper product with DentVideo metadata)", async () => {
    const { db, clinic } = fakeDb(unpaid());
    const { d, alerts } = deps();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await handleDentvideoEvent(
      db,
      event("subscription.active", { product_id: CLIPFORGE_WEEKLY, metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice" } }),
      d as never,
    );
    warn.mockRestore();
    expect(r).toMatchObject({ status: 200, body: { ignored: "not a DentVideo product" } });
    expect(clinic.plan).toBe("trial");
    expect(clinic.plan_tier).toBeNull();
    expect(d.enqueueWeek).not.toHaveBeenCalled();
    expect(alerts.map((a) => a.key)).toEqual(["suspicious_billing:sub_x:subscription.active"]);
  });

  it("takes the tier from the product, not from metadata.plan", async () => {
    const { db, clinic } = fakeDb(unpaid());
    const { d } = deps();
    await handleDentvideoEvent(db, event("subscription.active", { product_id: STARTER, metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice" } }), d as never);
    expect(clinic.plan).toBe("active");
    expect(clinic.plan_tier).toBe("starter");
  });

  it("ignores metadata naming a clinic whose owner it does not match (paying for, then disputing, someone else's clinic)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const metadata of [
      { app: "dentvideo", clinic_id: CLINIC, owner_id: OTHER_OWNER },
      { app: "dentvideo", clinic_id: CLINIC },
    ]) {
      const { db, clinic } = fakeDb(unpaid());
      const { d, alerts } = deps();
      const r = await handleDentvideoEvent(db, event("subscription.active", { product_id: PRACTICE, metadata }), d as never);
      expect(r.body).toMatchObject({ ignored: "owner mismatch" });
      expect(clinic.plan).toBe("trial");
      expect(alerts).toHaveLength(1);
    }
    // A chargeback on a payment that names a paying clinic with the wrong owner does not pause it.
    const paying = { ...unpaid(), plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_real" };
    const { db, clinic } = fakeDb(paying);
    const { d } = deps();
    const r = await handleDentvideoEvent(db, { type: "dispute.opened", data: { payment_id: "pay_1", metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OTHER_OWNER } } }, d as never);
    warn.mockRestore();
    expect(r.body).toMatchObject({ ignored: "owner mismatch" });
    expect(clinic.plan).toBe("active");
  });

  it("still applies events for the clinic's own subscription, and a matching owner", async () => {
    const paying = { ...unpaid(), plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_x" };
    const { db, clinic } = fakeDb(paying);
    const { d } = deps();
    await handleDentvideoEvent(db, event("subscription.cancelled", { product_id: PRACTICE, metadata: { app: "dentvideo", clinic_id: CLINIC } }), d as never);
    expect(clinic.plan).toBe("cancelled");

    expect(metadataMatchesClinic({ metadata: { owner_id: OWNER.toUpperCase() } }, { owner_id: OWNER })).toBe(true);
    expect(metadataMatchesClinic({ metadata: { owner_id: OTHER_OWNER } }, { owner_id: OWNER })).toBe(false);
    expect(metadataMatchesClinic({ subscription_id: "sub_1", metadata: {} }, { owner_id: OWNER, dodo_subscription_id: "sub_1" })).toBe(true);
    expect(metadataMatchesClinic({ subscription_id: "sub_2", metadata: {} }, { owner_id: OWNER, dodo_subscription_id: "sub_1" })).toBe(false);
  });
});
