import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clinicByOwnerEmail, handleDentvideoEvent, type DvWebhookDeps } from "./billing-webhook";
import type { DvSubRecord } from "./billing";
import type { SubscriptionStore } from "./subscriptions";
import type { OwnerAlert } from "./ops-alert";

/**
 * Ordering, duplicates, payment problems and refunds (audit C3, H6, H8, H9):
 * the webhook with an in-memory subscription ledger.
 */

const CLINIC = "11111111-2222-3333-4444-555555555555";
const OWNER = "owner-1";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";

type Clinic = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

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
    dodoStatus: async () => null,
    selfServe: false,
    ...over,
  };
  return d;
}

describe("H6: late and out-of-order webhooks", () => {
  it("an activation older than the cancellation already applied is ignored", async () => {
    const f = fakeDb({ ...paying(), plan: "cancelled", plan_renews_at: null });
    const subs = memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "cancelled", last_event_at: "2026-11-10T12:00:00.000Z" }]);
    const d = deps({ subs });
    const r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", "2026-11-10T11:00:00Z"), d);
    expect(r.body).toMatchObject({ ignored: "stale" });
    expect(f.clinic.plan).toBe("cancelled");
    expect(d.enqueueWeek).not.toHaveBeenCalled();
  });

  it("a renewal with no timestamp for a subscription we know was cancelled does not switch the clinic back on", async () => {
    const f = fakeDb({ ...paying(), plan: "cancelled", plan_renews_at: null });
    const d = deps({ subs: memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "cancelled", last_event_at: "2026-11-10T12:00:00.000Z" }]) });
    const r = await handleDentvideoEvent(f.db, evt("subscription.renewed", "sub_1"), d);
    expect(r.body).toMatchObject({ ignored: "late activation" });
    expect(f.clinic.plan).toBe("cancelled");
    expect(d.raised.map((a) => a.key)).toEqual([`late_activation:${CLINIC}:sub_1`]);
  });

  it("without the ledger, the clinic row alone still stops a late re-activation of its cancelled subscription", async () => {
    const f = fakeDb({ ...paying(), plan: "cancelled", plan_renews_at: null });
    const r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", "2026-11-10T11:00:00Z"), deps());
    expect(r.body).toMatchObject({ ignored: "late activation" });
    expect(f.clinic.plan).toBe("cancelled");
  });

  it("a first payment.succeeded stamped after its subscription.active (and delivered first) does not make the activation stale", async () => {
    const f = fakeDb(unpaid());
    const subs = memorySubs();
    const d = deps({ subs });
    // Dodo: subscription.active at :00, payment.succeeded at :02 — the payment is delivered first.
    await handleDentvideoEvent(f.db, { type: "payment.succeeded", timestamp: "2026-11-13T10:00:02Z", data: { ...evt("x", "sub_1").data, payment_id: "pay_1" } }, d);
    expect(subs.rows.get("sub_1")).toMatchObject({ status: "pending", last_event_at: null });
    const r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", "2026-11-13T10:00:00Z"), d);
    expect(r.body).not.toMatchObject({ ignored: "stale" });
    expect(f.clinic).toMatchObject({ plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1" });
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
    expect(subs.rows.get("sub_1")).toMatchObject({ status: "active", last_event_at: "2026-11-13T10:00:00.000Z" });
  });

  it("a pending row written with the payment's time (before the fix) is not used to call an activation stale", async () => {
    const f = fakeDb(unpaid());
    const subs = memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "pending", last_event_at: "2026-11-13T10:00:02.000Z", last_event_type: "payment.succeeded" }]);
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", "2026-11-13T10:00:00Z"), deps({ subs }));
    expect(f.clinic.plan).toBe("active");
  });

  it("a newer activation is applied, and Dodo's live status can veto one", async () => {
    const f = fakeDb({ ...paying(), plan: "paused" });
    const subs = memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "on_hold", last_event_at: "2026-11-10T12:00:00.000Z" }]);
    // Dodo says it is still on hold: the "active" is not believed.
    let r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", "2026-11-11T12:00:00Z"), deps({ subs, dodoStatus: async () => "on_hold" }));
    expect(r.body).toMatchObject({ ignored: "not active at Dodo" });
    expect(f.clinic.plan).toBe("paused");
    r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", "2026-11-11T12:00:00Z"), deps({ subs, dodoStatus: async () => "active" }));
    expect(f.clinic.plan).toBe("active");
    expect(subs.rows.get("sub_1")).toMatchObject({ status: "active", last_event_at: "2026-11-11T12:00:00.000Z" });
  });
});

describe("C3: a second subscription for the same clinic", () => {
  it("activating while another is live: both recorded, the clinic stays on the first, the owner is told", async () => {
    const f = fakeDb(paying("sub_1"));
    const subs = memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "active", last_event_at: "2026-11-01T00:00:00.000Z" }]);
    const d = deps({ subs });
    const r = await handleDentvideoEvent(f.db, evt("subscription.active", "sub_2", "2026-11-12T00:00:00Z"), d);
    expect(r.body).toMatchObject({ duplicate: true, kept: "sub_1" });
    expect(f.clinic.dodo_subscription_id).toBe("sub_1");
    expect(subs.rows.get("sub_2")?.status).toBe("active");
    expect(d.raised.map((a) => a.key)).toEqual([`dup_sub:${CLINIC}:sub_2`]);
    expect(d.enqueueWeek).not.toHaveBeenCalled();
  });

  it("works without the ledger too: the clinic is not moved and the owner is told", async () => {
    const f = fakeDb(paying("sub_1"));
    const d = deps();
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_2"), d);
    expect(f.clinic.dodo_subscription_id).toBe("sub_1");
    expect(d.raised[0].key).toBe(`dup_sub:${CLINIC}:sub_2`);
  });

  it("if the clinic's current subscription is cancelled while the other one is live, the clinic moves to it", async () => {
    const f = fakeDb(paying("sub_1"));
    const subs = memorySubs([
      { dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "active", last_event_at: "2026-11-01T00:00:00.000Z" },
      { dodo_subscription_id: "sub_2", clinic_id: CLINIC, status: "active", tier: "practice", period_end: "2026-12-12T00:00:00Z", last_event_at: "2026-11-12T00:00:00.000Z" },
    ]);
    const r = await handleDentvideoEvent(f.db, evt("subscription.cancelled", "sub_1", "2026-11-13T00:00:00Z"), deps({ subs }));
    expect(r.body).toMatchObject({ plan: "active", movedTo: "sub_2" });
    expect(f.clinic).toMatchObject({ plan: "active", dodo_subscription_id: "sub_2", plan_renews_at: "2026-12-12T00:00:00Z" });
    expect(subs.rows.get("sub_1")?.status).toBe("cancelled");
  });

  it("payment.succeeded records the payment and a pending subscription (which blocks a second checkout)", async () => {
    const f = fakeDb(unpaid());
    const subs = memorySubs();
    await handleDentvideoEvent(f.db, { type: "payment.succeeded", data: { ...evt("x", "sub_9").data, payment_id: "pay_1" } }, deps({ subs }));
    expect(subs.payments.get("pay_1")).toEqual({ clinic_id: CLINIC, dodo_subscription_id: "sub_9" });
    expect(subs.rows.get("sub_9")?.status).toBe("pending");
    expect(f.clinic.plan).toBe("trial");
  });
});

describe("H8: only a genuine first activation is 'first'", () => {
  it("a returning clinic is not marked as a first payment (the first-week watchdog ignores it)", async () => {
    const f = fakeDb({ ...paying("sub_old"), plan: "cancelled" });
    const d = deps();
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_new"), d);
    expect(f.clinic.plan).toBe("active");
    expect(d.markPaid).not.toHaveBeenCalled();
    expect(d.raised.find((a) => a.key.startsWith("new_paying"))?.titleEn).toBe("A clinic came back");
  });

  it("a brand-new clinic is", async () => {
    const f = fakeDb(unpaid());
    const d = deps();
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1"), d);
    expect(d.markPaid).toHaveBeenCalledWith(CLINIC);
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
  });
});

describe("H9: the clinic hears about payment problems", () => {
  it("on hold → paused, the clinic is emailed how to fix it (email path without an API key), the owner told it was", async () => {
    const f = fakeDb(paying());
    const d = deps();
    const r = await handleDentvideoEvent(f.db, evt("subscription.on_hold", "sub_1"), d);
    expect(f.clinic.plan).toBe("paused");
    expect(d.sendPaymentMail).toHaveBeenCalledWith(f.db, CLINIC, "on_hold", "email");
    expect(r.body).toMatchObject({ clinicEmail: "sent" });
    expect(d.raised[0].done.join(" ")).toMatch(/clinic was emailed/);
  });

  it("with self-serve billing the email points at the portal", async () => {
    const f = fakeDb(paying());
    const d = deps({ selfServe: true });
    await handleDentvideoEvent(f.db, evt("subscription.on_hold", "sub_1"), d);
    expect(d.sendPaymentMail).toHaveBeenCalledWith(f.db, CLINIC, "on_hold", "portal");
  });

  it("payment.failed on a renewal emails the clinic; on a first checkout attempt it does not", async () => {
    let f = fakeDb(paying());
    let d = deps();
    await handleDentvideoEvent(f.db, { type: "payment.failed", data: evt("x", "sub_1").data }, d);
    expect(d.sendPaymentMail).toHaveBeenCalledWith(f.db, CLINIC, "failed", "email");
    f = fakeDb(unpaid());
    d = deps();
    await handleDentvideoEvent(f.db, { type: "payment.failed", data: evt("x", "sub_1").data }, d);
    expect(d.sendPaymentMail).not.toHaveBeenCalled();
  });
});

describe("refunds and disputes", () => {
  it("a chargeback pauses an active clinic and alerts the owner; a refund only alerts", async () => {
    const subs = memorySubs();
    subs.payments.set("pay_1", { clinic_id: CLINIC, dodo_subscription_id: "sub_1" });
    let f = fakeDb(paying());
    let d = deps({ subs });
    let r = await handleDentvideoEvent(f.db, { type: "dispute.opened", data: { payment_id: "pay_1" } }, d);
    expect(r.body).toMatchObject({ paused: true });
    expect(f.clinic.plan).toBe("paused");
    expect(d.raised[0]).toMatchObject({ severity: "urgent", titleEn: "Chargeback / payment dispute" });

    f = fakeDb(paying());
    d = deps({ subs });
    r = await handleDentvideoEvent(f.db, { type: "refund.succeeded", data: { payment_id: "pay_1" } }, d);
    expect(r.body).toMatchObject({ paused: false });
    expect(f.clinic.plan).toBe("active");
    expect(d.raised[0].titleEn).toBe("Refund");
  });
});

describe("historic founding seats (the offer is closed)", () => {
  it("a Practice activation raises no founding-seat alert any more", async () => {
    const f = fakeDb(unpaid());
    const d = deps();
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", undefined, { discount_id: "dsc_1" }), d);
    expect(f.clinic.plan).toBe("active");
    expect(d.raised.map((a) => a.key)).not.toContain("founding_full");
  });

  it("records a typed discount without calling it founding", async () => {
    const f = fakeDb(unpaid());
    const subs = memorySubs();
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1", undefined, { discount_id: "dsc_1" }), deps({ subs }));
    expect(subs.rows.get("sub_1")).toMatchObject({ founding: false, tier: "practice", interval: "month", discount_id: "dsc_1" });
  });
});

describe("chargebacks: under review, and lifted when the dispute is won", () => {
  const disputeOpen = { type: "dispute.opened", data: { payment_id: "pay_1" } };
  const disputeWon = { type: "dispute.won", data: { payment_id: "pay_1" } };
  const ledger = (status: string) => {
    const subs = memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status, tier: "practice", last_event_at: "2026-11-01T00:00:00.000Z" }]);
    subs.payments.set("pay_1", { clinic_id: CLINIC, dodo_subscription_id: "sub_1" });
    return subs;
  };

  it("a chargeback pauses the clinic and marks its subscription 'disputed'; a won dispute switches it back on and queues the week", async () => {
    const f = fakeDb(paying());
    const subs = ledger("active");
    let d = deps({ subs });
    await handleDentvideoEvent(f.db, disputeOpen, d);
    expect(f.clinic.plan).toBe("paused");
    expect(subs.rows.get("sub_1")).toMatchObject({ status: "disputed", last_event_at: "2026-11-01T00:00:00.000Z" });

    d = deps({ subs, dodoStatus: async () => "active" });
    const r = await handleDentvideoEvent(f.db, disputeWon, d);
    expect(r.body).toMatchObject({ resumed: true });
    expect(f.clinic.plan).toBe("active");
    expect(subs.rows.get("sub_1")?.status).toBe("active");
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
    // The owner is still told.
    expect(d.raised[0]).toMatchObject({ titleEn: "Chargeback / payment dispute" });
    expect(d.raised[0].done.join(" ")).toMatch(/dispute was won/);
  });

  it("a won dispute does not switch on a clinic paused for another reason (its card failed since)", async () => {
    const f = fakeDb({ ...paying(), plan: "paused" });
    const d = deps({ subs: ledger("on_hold") });
    const r = await handleDentvideoEvent(f.db, disputeWon, d);
    expect(r.body).not.toHaveProperty("resumed");
    expect(f.clinic.plan).toBe("paused");
    expect(d.enqueueWeek).not.toHaveBeenCalled();
    expect(d.raised).toHaveLength(1);
  });

  it("nor one whose subscription Dodo no longer has active", async () => {
    const f = fakeDb({ ...paying(), plan: "paused" });
    const d = deps({ subs: ledger("disputed"), dodoStatus: async () => "cancelled" });
    await handleDentvideoEvent(f.db, disputeWon, d);
    expect(f.clinic.plan).toBe("paused");
  });
});

describe("events without clinic metadata: the customer's email, only when it is unambiguous", () => {
  const noMeta = (type: string) => {
    const e = evt(type, "sub_dash", "2026-11-13T10:00:00Z");
    return { ...e, data: { ...e.data, metadata: { app: "dentvideo" }, customer: { email: "Dr@Clinic.example" } } };
  };

  it("exactly one DentVideo clinic owner has the email: that clinic is activated", async () => {
    const f = fakeDb(unpaid());
    const clinicByEmail = vi.fn(async () => ({ clinicId: CLINIC }));
    const d = deps({ clinicByEmail });
    await handleDentvideoEvent(f.db, noMeta("subscription.active"), d);
    expect(clinicByEmail).toHaveBeenCalledWith(f.db, "Dr@Clinic.example");
    expect(f.clinic).toMatchObject({ plan: "active", dodo_subscription_id: "sub_dash" });
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
  });

  it("several clinics (or none) for the email: nothing is changed and the owner is alerted — never a guess", async () => {
    for (const problem of ["several clinics", "no clinic", "lookup failed"] as const) {
      const f = fakeDb(unpaid());
      const d = deps({ clinicByEmail: async () => ({ problem }) });
      const r = await handleDentvideoEvent(f.db, noMeta("subscription.active"), d);
      expect(r).toMatchObject({ status: 200, body: { ignored: "no clinic", match: problem } });
      expect(f.clinic.plan).toBe("trial");
      expect(d.raised.map((a) => a.key)).toEqual([`unmatched_billing:sub_dash:subscription.active`]);
      expect(d.raised[0].severity).toBe("urgent");
    }
  });

  it("no email on the event: alerted too", async () => {
    const f = fakeDb(unpaid());
    const clinicByEmail = vi.fn();
    const e = noMeta("subscription.active");
    const d = deps({ clinicByEmail });
    await handleDentvideoEvent(f.db, { ...e, data: { ...e.data, customer: null } }, d);
    expect(clinicByEmail).not.toHaveBeenCalled();
    expect(d.raised[0].what.join(" ")).toMatch(/no customer email/);
  });

  it("an event that does carry clinic metadata never falls back to the email", async () => {
    const f = fakeDb(unpaid());
    const clinicByEmail = vi.fn();
    await handleDentvideoEvent(f.db, evt("subscription.active", "sub_1"), deps({ clinicByEmail }));
    expect(clinicByEmail).not.toHaveBeenCalled();
  });
});

describe("clinicByOwnerEmail (the default lookup)", () => {
  const dv = { product: "dentvideo" };
  const lookupDb = (users: { id: string; email: string; app_metadata: Record<string, unknown> }[], clinics: { id: string; owner_id: string }[]) =>
    ({
      auth: { admin: { listUsers: async () => ({ data: { users }, error: null }) } },
      from: () => {
        let owners: string[] = [];
        const q = {
          select: () => q,
          in: (_k: string, v: string[]) => ((owners = v), q),
          limit: async () => ({ data: clinics.filter((c) => owners.includes(c.owner_id)), error: null }),
        };
        return q;
      },
    }) as unknown as SupabaseClient;

  it("matches the email case-insensitively, DentVideo accounts only, and only one clinic", async () => {
    const users = [
      { id: "u1", email: "dr@clinic.example", app_metadata: dv },
      { id: "u2", email: "other@clinic.example", app_metadata: dv },
    ];
    expect(await clinicByOwnerEmail(lookupDb(users, [{ id: CLINIC, owner_id: "u1" }]), "DR@clinic.example ")).toEqual({ clinicId: CLINIC });
    // A ClipForge login with that email is not a DentVideo clinic owner.
    expect(await clinicByOwnerEmail(lookupDb([{ id: "u1", email: "dr@clinic.example", app_metadata: {} }], [{ id: CLINIC, owner_id: "u1" }]), "dr@clinic.example")).toEqual({ problem: "no clinic" });
    expect(await clinicByOwnerEmail(lookupDb(users, [{ id: CLINIC, owner_id: "u1" }, { id: "c2", owner_id: "u1" }]), "dr@clinic.example")).toEqual({ problem: "several clinics" });
    expect(await clinicByOwnerEmail(lookupDb(users, []), "dr@clinic.example")).toEqual({ problem: "no clinic" });
  });
});
