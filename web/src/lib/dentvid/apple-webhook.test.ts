import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleAppleEvent, revenuecatAuthOk, type AppleWebhookDeps } from "./apple-webhook";
import type { AppleSubRecord, AppleSubscriptionStore } from "./apple-store";
import type { DvSubRecord } from "./billing";
import type { SubscriptionStore } from "./subscriptions";
import type { RcEvent } from "./apple-billing";
import type { OwnerAlert } from "./ops-alert";

vi.mock("./events-server", () => ({ recordEvent: vi.fn() }));

/**
 * The RevenueCat webhook (App Store purchases in the iPhone app) against an in-memory clinic table,
 * Apple ledger and Dodo ledger: every event type, duplicates, out-of-order delivery, unknown users,
 * cross-channel conflicts, refunds, expirations and the sandbox policy.
 */

const USER_A = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const USER_B = "2d0c5e8a-3f4b-4c7d-9e0f-1a2b3c4d5e6f";
const NOBODY = "3e1d6f9b-4a5c-4d8e-8f1a-2b3c4d5e6f7a";
const OTHER_APP = "4f2e7a0c-5b6d-4e9f-9a2b-3c4d5e6f7a8b";
const OTID = "2000000100";
const OTID_2 = "2000000200";
const NOW = new Date("2026-11-17T10:00:00Z");
const ms = (iso: string) => Date.parse(iso);

type Clinic = {
  id: string;
  owner_id: string;
  plan: string;
  plan_tier: string | null;
  dodo_subscription_id: string | null;
  plan_renews_at: string | null;
  billing_source?: string | null;
  apple_original_transaction_id?: string | null;
};

function fakeDb(clinics: Clinic[], opts: { noAppleColumns?: boolean; failUpdate?: boolean } = {}) {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const db = {
    from(table: string) {
      if (table !== "dentvid_clinics") throw new Error(`unexpected table ${table}`);
      const filters: [string, unknown][] = [];
      let cols = "*";
      let patch: Record<string, unknown> | null = null;
      const appleCol = (s: string) => /billing_source|apple_original_transaction_id/.test(s);
      const q = {
        select: (c: string) => ((cols = c), q),
        update: (p: Record<string, unknown>) => ((patch = p), q),
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        maybeSingle: async () => {
          if (opts.noAppleColumns && appleCol(cols)) return { data: null, error: { code: "42703", message: "column dentvid_clinics.billing_source does not exist" } };
          const row = clinics.find((c) => filters.every(([k, v]) => (c as Record<string, unknown>)[k] === v));
          return { data: row ? { ...row } : null, error: null };
        },
        then(resolve: (v: unknown) => void) {
          if (!patch) return resolve({ error: null });
          if (opts.failUpdate) return resolve({ error: { code: "57014", message: "statement timeout" } });
          if (opts.noAppleColumns && Object.keys(patch).some(appleCol)) return resolve({ error: { code: "PGRST204", message: "Could not find the 'billing_source' column" } });
          for (const c of clinics) {
            if (filters.every(([k, v]) => (c as Record<string, unknown>)[k] === v)) {
              Object.assign(c, patch);
              updates.push({ id: c.id, patch });
            }
          }
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, updates, clinics };
}

function memoryApple(rows: AppleSubRecord[] = [], available = true): AppleSubscriptionStore & { rows: Map<string, AppleSubRecord> } {
  const map = new Map(rows.map((r) => [r.original_transaction_id, { ...r }]));
  return {
    rows: map,
    get: async (id) => (available ? (map.get(id) ?? null) : undefined),
    forClinic: async (c) => (available ? [...map.values()].filter((r) => r.clinic_id === c) : null),
    put: async (r) => (available ? (map.set(r.original_transaction_id, { ...map.get(r.original_transaction_id), ...r }), true) : false),
  };
}

function memoryDodo(rows: DvSubRecord[] = []): SubscriptionStore {
  const map = new Map(rows.map((r) => [r.dodo_subscription_id, r]));
  return {
    get: async (id) => map.get(id) ?? null,
    forClinic: async (c) => [...map.values()].filter((r) => r.clinic_id === c),
    put: async () => true,
    recordPayment: async () => {},
    paymentClinic: async () => null,
  };
}

const USERS: Record<string, { id: string; dentvideo: boolean }> = {
  [USER_A]: { id: USER_A, dentvideo: true },
  [USER_B]: { id: USER_B, dentvideo: true },
  [OTHER_APP]: { id: OTHER_APP, dentvideo: false },
};

function deps(over: Partial<AppleWebhookDeps> = {}) {
  const raised: OwnerAlert[] = [];
  const d = {
    raised,
    alert: async (a: OwnerAlert) => void raised.push(a),
    clinicRef: async (_db: SupabaseClient, id: string) => ({ id, name: "Gülüş", email: "dr@clinic.example" }),
    enqueueWeek: vi.fn(async () => "queued" as const),
    sendWelcome: vi.fn(async () => "sent"),
    markPaid: vi.fn(async () => {}),
    adConversion: vi.fn(async () => "recorded"),
    ownerInternal: vi.fn(async () => false),
    userById: async (_db: SupabaseClient, id: string) => USERS[id] ?? null,
    // A real (non-internal) clinic owner with a proven address, unless a test says otherwise.
    sandboxOwner: async () => ({ email: "dr@clinic.example", verified: true }),
    apple: memoryApple(),
    subs: memoryDodo(),
    now: () => NOW,
    env: {},
    ...over,
  };
  return d as typeof d & { apple: ReturnType<typeof memoryApple> };
}

const trial = (owner = USER_A, id = "clinic-a"): Clinic => ({ id, owner_id: owner, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null, billing_source: null, apple_original_transaction_id: null });
const appleActive = (otid = OTID, renews = "2026-12-17T10:00:00.000Z"): Clinic => ({ ...trial(), plan: "active", plan_tier: "practice", plan_renews_at: renews, billing_source: "apple", apple_original_transaction_id: otid });

let seq = 0;
const ev = (type: string, extra: Partial<RcEvent> = {}): RcEvent => ({
  id: `evt-${++seq}`,
  type,
  app_user_id: USER_A,
  product_id: "dentvideo_practice_monthly",
  store: "APP_STORE",
  environment: "PRODUCTION",
  original_transaction_id: OTID,
  transaction_id: `tx-${seq}`,
  purchased_at_ms: ms("2026-11-17T09:59:00Z"),
  expiration_at_ms: ms("2026-12-17T10:00:00Z"),
  event_timestamp_ms: ms("2026-11-17T10:00:00Z") + seq * 1000,
  ...extra,
});

describe("RevenueCat webhook: activation", () => {
  it("INITIAL_PURCHASE switches a new clinic on through the web's own activation, marked as an App Store plan", async () => {
    const { db, clinics } = fakeDb([trial()]);
    const d = deps();
    const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    expect(r).toMatchObject({ status: 200, body: { ok: true, plan: "active", tier: "practice", firstWeek: "queued", welcomeEmail: "sent" } });
    expect(clinics[0]).toMatchObject({ plan: "active", plan_tier: "practice", plan_renews_at: "2026-12-17T10:00:00.000Z", billing_source: "apple", apple_original_transaction_id: OTID, dodo_subscription_id: null });
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
    expect(d.sendWelcome).toHaveBeenCalledTimes(1);
    expect(d.markPaid).toHaveBeenCalledWith("clinic-a", NOW, false);
    // An App Store purchase is never a Google Ads web conversion.
    expect(d.adConversion).not.toHaveBeenCalled();
    expect(d.raised.map((a) => a.key)).toEqual(["new_paying:clinic-a"]);
    expect(d.raised[0].what[0]).toMatch(/iPhone app \(App Store\)/);
    expect(d.apple.rows.get(OTID)).toMatchObject({ status: "active", tier: "practice", clinic_id: "clinic-a", app_user_id: USER_A, period_end: "2026-12-17T10:00:00.000Z" });
  });

  it("the same delivery twice, and a renewal: one activation, one week, one welcome", async () => {
    const { db, clinics } = fakeDb([trial()]);
    const d = deps();
    const first = ev("INITIAL_PURCHASE");
    await handleAppleEvent(db, first, d);
    expect(await handleAppleEvent(db, first, d)).toMatchObject({ status: 200, body: { duplicate: true } });
    const renewal = await handleAppleEvent(db, ev("RENEWAL", { expiration_at_ms: ms("2027-01-17T10:00:00Z") }), d);
    expect(renewal.body).toMatchObject({ plan: "active" });
    expect(clinics[0].plan_renews_at).toBe("2027-01-17T10:00:00.000Z");
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
    expect(d.sendWelcome).toHaveBeenCalledTimes(1);
    expect(d.raised.filter((a) => a.key.startsWith("new_paying"))).toHaveLength(1);
  });

  it("out of order: an event older than the last one applied changes nothing", async () => {
    const { db, clinics } = fakeDb([trial()]);
    const d = deps();
    const late = ev("EXPIRATION", { event_timestamp_ms: ms("2026-11-01T00:00:00Z") });
    await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    expect(await handleAppleEvent(db, late, d)).toMatchObject({ status: 200, body: { ignored: "stale" } });
    expect(clinics[0].plan).toBe("active");
  });

  it("PRODUCT_CHANGE: an upgrade moves the tier now; a downgrade waits for Apple's renewal", async () => {
    const start = { ...appleActive(), plan_tier: "starter" };
    const { db, clinics } = fakeDb([start]);
    const d = deps({ apple: memoryApple([{ original_transaction_id: OTID, clinic_id: "clinic-a", app_user_id: USER_A, status: "active", tier: "starter" }]) });
    await handleAppleEvent(db, ev("PRODUCT_CHANGE", { product_id: "dentvideo_starter_monthly", new_product_id: "dentvideo_practice_monthly" }), d);
    expect(clinics[0].plan_tier).toBe("practice");
    await handleAppleEvent(db, ev("PRODUCT_CHANGE", { product_id: "dentvideo_practice_monthly", new_product_id: "dentvideo_starter_monthly" }), d);
    expect(clinics[0].plan_tier).toBe("practice");
    expect(d.apple.rows.get(OTID)?.pending_tier).toBe("starter");
    // The renewal carries the new product: now the downgrade applies.
    await handleAppleEvent(db, ev("RENEWAL", { product_id: "dentvideo_starter_monthly", expiration_at_ms: ms("2027-01-17T10:00:00Z") }), d);
    expect(clinics[0].plan_tier).toBe("starter");
    expect(d.apple.rows.get(OTID)?.pending_tier).toBeNull();
    expect(d.enqueueWeek).not.toHaveBeenCalled();
  });
});

describe("RevenueCat webhook: cancellation, expiration, refunds", () => {
  it("CANCELLATION keeps the plan until the paid period ends (F9), then EXPIRATION ends it", async () => {
    const { db, clinics } = fakeDb([appleActive()]);
    const d = deps({ apple: memoryApple([{ original_transaction_id: OTID, clinic_id: "clinic-a", app_user_id: USER_A, status: "active", tier: "practice" }]) });
    const c = await handleAppleEvent(db, ev("CANCELLATION", { cancel_reason: "UNSUBSCRIBE" }), d);
    expect(c.body).toMatchObject({ plan: "active", endsAt: "2026-12-17T10:00:00.000Z" });
    expect(clinics[0].plan).toBe("active");
    expect(d.apple.rows.get(OTID)?.status).toBe("cancelled");
    expect(d.raised.filter((a) => a.key.startsWith("at_risk") || a.titleEn.match(/risk/i))).toHaveLength(1);
    // A repeated cancellation tells the owner nothing new.
    await handleAppleEvent(db, ev("CANCELLATION", { cancel_reason: "UNSUBSCRIBE" }), d);
    expect(d.raised).toHaveLength(1);
    const e = await handleAppleEvent(db, ev("EXPIRATION", { expiration_reason: "UNSUBSCRIBE" }), d);
    expect(e.body).toMatchObject({ plan: "cancelled" });
    expect(clinics[0]).toMatchObject({ plan: "cancelled", plan_renews_at: null });
  });

  it("UNCANCELLATION puts auto-renew back: still active, no new week", async () => {
    const { db, clinics } = fakeDb([appleActive()]);
    const d = deps({ apple: memoryApple([{ original_transaction_id: OTID, clinic_id: "clinic-a", app_user_id: USER_A, status: "cancelled", tier: "practice" }]) });
    await handleAppleEvent(db, ev("UNCANCELLATION"), d);
    expect(clinics[0].plan).toBe("active");
    expect(d.apple.rows.get(OTID)?.status).toBe("active");
    expect(d.enqueueWeek).not.toHaveBeenCalled();
  });

  it("a cancellation whose period is already over ends the plan now", async () => {
    const { db, clinics } = fakeDb([appleActive(OTID, "2026-11-10T00:00:00.000Z")]);
    const d = deps();
    await handleAppleEvent(db, ev("CANCELLATION", { cancel_reason: "BILLING_ERROR", expiration_at_ms: ms("2026-11-10T00:00:00Z") }), d);
    expect(clinics[0].plan).toBe("cancelled");
  });

  it.each([
    ["CANCELLATION", { cancel_reason: "CUSTOMER_SUPPORT" }],
    ["REFUND", {}],
  ])("a refund (%s) ends the plan at once and tells the owner", async (type, extra) => {
    const { db, clinics } = fakeDb([appleActive()]);
    const d = deps();
    const r = await handleAppleEvent(db, ev(type, extra), d);
    expect(r.body).toMatchObject({ plan: "cancelled", reason: "refunded" });
    expect(clinics[0].plan).toBe("cancelled");
    expect(d.apple.rows.get(OTID)?.status).toBe("refunded");
    expect(d.raised.some((a) => a.key.startsWith("appstore:refund:"))).toBe(true);
  });

  it("an event about a subscription that is not the clinic's current one never moves the plan", async () => {
    const { db, clinics } = fakeDb([appleActive(OTID_2)]);
    const d = deps();
    const r = await handleAppleEvent(db, ev("EXPIRATION"), d);
    expect(r.body).toMatchObject({ recorded: "expired", current: false });
    expect(clinics[0].plan).toBe("active");
  });
});

describe("RevenueCat webhook: billing problems", () => {
  it("BILLING_ISSUE inside Apple's grace period keeps the clinic on until the grace ends", async () => {
    const { db, clinics } = fakeDb([appleActive()]);
    const d = deps();
    const r = await handleAppleEvent(db, ev("BILLING_ISSUE", { grace_period_expiration_at_ms: ms("2026-12-03T10:00:00Z") }), d);
    expect(r.body).toMatchObject({ plan: "active", graceUntil: "2026-12-03T10:00:00.000Z" });
    expect(clinics[0]).toMatchObject({ plan: "active", plan_renews_at: "2026-12-03T10:00:00.000Z" });
    expect(d.apple.rows.get(OTID)?.status).toBe("billing_issue");
  });

  it("BILLING_ISSUE without a grace period pauses (like Dodo's on hold); the recovered RENEWAL switches it back on", async () => {
    const { db, clinics } = fakeDb([appleActive()]);
    const d = deps();
    await handleAppleEvent(db, ev("BILLING_ISSUE"), d);
    expect(clinics[0].plan).toBe("paused");
    await handleAppleEvent(db, ev("RENEWAL", { expiration_at_ms: ms("2026-12-20T10:00:00Z") }), d);
    expect(clinics[0]).toMatchObject({ plan: "active", plan_renews_at: "2026-12-20T10:00:00.000Z" });
    // Back from paused: the week is queued again, as a returning clinic (no second welcome is the lifecycle's job).
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
    expect(d.markPaid).toHaveBeenCalledWith("clinic-a", NOW, true);
  });

  it("SUBSCRIPTION_PAUSED and REFUND_REVERSED are recorded, nothing moves", async () => {
    const { db, clinics } = fakeDb([appleActive()]);
    const d = deps();
    expect((await handleAppleEvent(db, ev("SUBSCRIPTION_PAUSED"), d)).body).toMatchObject({ recorded: "pause_scheduled" });
    expect((await handleAppleEvent(db, ev("REFUND_REVERSED"), d)).body).toMatchObject({ recorded: "refund_reversed" });
    expect(clinics[0].plan).toBe("active");
    expect(d.raised.some((a) => a.key.startsWith("appstore:refund_reversed:"))).toBe(true);
  });
});

describe("RevenueCat webhook: who is it", () => {
  it("an app_user_id that is no DentVideo login: 200 (a retry will not change it) and the owner is told", async () => {
    for (const who of [NOBODY, OTHER_APP, "$RCAnonymousID:8a7b6c"]) {
      const { db, updates } = fakeDb([trial()]);
      const d = deps();
      const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE", { app_user_id: who, original_app_user_id: who, aliases: [who] }), d);
      expect(r).toMatchObject({ status: 200, body: { ignored: "no user" } });
      expect(updates).toEqual([]);
      expect(d.raised.map((a) => a.key)).toEqual([`appstore:unmatched:${OTID}:INITIAL_PURCHASE`]);
    }
  });

  it("an anonymous purchase aliased to the login afterwards is matched through the alias", async () => {
    const { db, clinics } = fakeDb([trial()]);
    await handleAppleEvent(db, ev("INITIAL_PURCHASE", { app_user_id: "$RCAnonymousID:8a7b6c", aliases: ["$RCAnonymousID:8a7b6c", USER_A] }), deps());
    expect(clinics[0].plan).toBe("active");
  });

  it("a login without a clinic yet: 503 so RevenueCat retries, owner told", async () => {
    const { db } = fakeDb([]);
    const d = deps();
    const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    expect(r.status).toBe(503);
    expect(d.raised[0].key).toBe(`appstore:no_clinic:${OTID}:INITIAL_PURCHASE`);
  });

  it("a Liman lookup that fails: 500 (retry), nothing changed", async () => {
    const { db, updates } = fakeDb([trial()]);
    const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE"), deps({ userById: async () => Promise.reject(new Error("liman down")) }));
    expect(r.status).toBe(500);
    expect(updates).toEqual([]);
  });

  it("a database error on the clinic update: 500 so RevenueCat retries; no week, no welcome", async () => {
    const { db } = fakeDb([trial()], { failUpdate: true });
    const d = deps();
    const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    expect(r.status).toBe(500);
    expect(d.enqueueWeek).not.toHaveBeenCalled();
    expect(d.sendWelcome).not.toHaveBeenCalled();
  });

  it("TEST needs no clinic and changes nothing", async () => {
    const { db, updates } = fakeDb([]);
    expect(await handleAppleEvent(db, ev("TEST", { app_user_id: "whatever" }), deps())).toMatchObject({ status: 200, body: { test: true } });
    expect(updates).toEqual([]);
  });

  it("promotional grants, other stores, family sharing and other apps' products never switch a clinic on", async () => {
    for (const extra of [{ store: "PROMOTIONAL" }, { store: "PLAY_STORE" }, { is_family_share: true }, { product_id: "clipforge_pro_monthly" }]) {
      const { db, clinics } = fakeDb([trial()]);
      const d = deps();
      const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE", extra), d);
      expect(r.body.ignored).toBeTruthy();
      expect(clinics[0].plan).toBe("trial");
      expect(d.raised[0].key).toMatch(/^appstore:ignored:/);
    }
  });
});

describe("RevenueCat webhook: one plan per clinic across channels", () => {
  it("security: a purchase in someone else's name (Dodo plan live) never switches the clinic, and its refund leaves the Dodo clinic untouched", async () => {
    // app_user_id is whatever the app passed to Purchases.logIn: an attacker buys under the victim's login id.
    const onDodo: Clinic = { ...trial(), plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-01T00:00:00Z", billing_source: "dodo" };
    const before = { ...onDodo };
    const { db, clinics, updates } = fakeDb([onDodo]);
    const d = deps({ subs: memoryDodo([{ dodo_subscription_id: "sub_1", clinic_id: "clinic-a", status: "active" }]) });
    const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    expect(r.body).toMatchObject({ ignored: "web plan active", kept: "sub_1" });
    expect(d.apple.rows.get(OTID)).toMatchObject({ status: "ignored_web_active", clinic_id: "clinic-a", tier: "practice", period_end: "2026-12-17T10:00:00.000Z" });
    const alert = d.raised.find((a) => a.key.startsWith("appstore:web_active:"));
    expect(alert?.severity).toBe("urgent");
    expect(alert?.todo[0]).toMatch(/Contact dr@clinic.example: did they buy in the iPhone app/);
    // Renewals, an upgrade, auto-renew back on: still the web's plan.
    for (const t of ["RENEWAL", "UNCANCELLATION", "SUBSCRIPTION_EXTENDED"]) {
      expect((await handleAppleEvent(db, ev(t), d)).body, t).toMatchObject({ ignored: "web plan active" });
    }
    expect((await handleAppleEvent(db, ev("PRODUCT_CHANGE", { product_id: "dentvideo_starter_monthly", new_product_id: "dentvideo_practice_monthly" }), d)).body).toMatchObject({ ignored: "web plan active" });
    // The attacker asks Apple for a refund (both shapes RevenueCat sends), then it expires.
    for (const e of [ev("CANCELLATION", { cancel_reason: "CUSTOMER_SUPPORT" }), ev("REFUND"), ev("BILLING_ISSUE"), ev("CANCELLATION"), ev("EXPIRATION")]) {
      const res = await handleAppleEvent(db, e, d);
      expect(res.status, e.type).toBe(200);
    }
    expect(clinics[0]).toEqual(before);
    expect(updates).toEqual([]);
    expect(d.enqueueWeek).not.toHaveBeenCalled();
    expect(d.sendWelcome).not.toHaveBeenCalled();
    expect(d.markPaid).not.toHaveBeenCalled();
    expect(d.raised.some((a) => a.key.startsWith("new_paying") || a.key.startsWith("appstore:cross_channel"))).toBe(false);
  });

  it("security: a web plan on hold, or cancelled but still paid up, is not ended by an App Store purchase either; without 0026 neither", async () => {
    const cases: [Clinic, DvSubRecord, { noAppleColumns?: boolean }][] = [
      [{ ...trial(), plan: "paused", plan_tier: "starter", dodo_subscription_id: "sub_1", plan_renews_at: "2026-11-10T00:00:00Z" }, { dodo_subscription_id: "sub_1", clinic_id: "clinic-a", status: "on_hold" }, {}],
      [{ ...trial(), plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-01T00:00:00Z" }, { dodo_subscription_id: "sub_1", clinic_id: "clinic-a", status: "cancelled" }, {}],
      [{ ...trial(), plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-01T00:00:00Z" }, { dodo_subscription_id: "sub_1", clinic_id: "clinic-a", status: "active" }, { noAppleColumns: true }],
    ];
    for (const [clinic, sub, opts] of cases) {
      const before = { ...clinic };
      const { db, clinics } = fakeDb([clinic], opts);
      const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE"), deps({ subs: memoryDodo([sub]), ...(opts.noAppleColumns ? { apple: memoryApple([], false) } : {}) }));
      expect(r.body, sub.status).toMatchObject({ ignored: "web plan active" });
      expect(clinics[0], sub.status).toEqual(before);
    }
  });

  it("a held-back App Store subscription switches the clinic on at its next event once the web plan has ended", async () => {
    const onDodo: Clinic = { ...trial(), plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-01T00:00:00Z" };
    const { db, clinics } = fakeDb([onDodo]);
    const d = deps({ subs: memoryDodo([{ dodo_subscription_id: "sub_1", clinic_id: "clinic-a", status: "active" }]) });
    await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    Object.assign(clinics[0], { plan: "cancelled", plan_renews_at: null });
    const r = await handleAppleEvent(db, ev("RENEWAL", { expiration_at_ms: ms("2027-01-17T10:00:00Z") }), d);
    expect(r.body).toMatchObject({ plan: "active" });
    expect(clinics[0]).toMatchObject({ plan: "active", billing_source: "apple", apple_original_transaction_id: OTID, dodo_subscription_id: null });
    expect(d.apple.rows.get(OTID)?.status).toBe("active");
  });

  it("an old Dodo subscription that already ended is no conflict", async () => {
    const wasDodo: Clinic = { ...trial(), plan: "cancelled", dodo_subscription_id: "sub_old" };
    const { db, clinics } = fakeDb([wasDodo]);
    const d = deps({ subs: memoryDodo([{ dodo_subscription_id: "sub_old", clinic_id: "clinic-a", status: "cancelled" }]) });
    await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    expect(clinics[0]).toMatchObject({ plan: "active", billing_source: "apple" });
    expect(d.raised.some((a) => a.key.startsWith("appstore:cross_channel"))).toBe(false);
    // Coming back is not a first payment (the watchdog must not treat it as one).
    expect(d.markPaid).toHaveBeenCalledWith("clinic-a", NOW, true);
  });

  it("a second Apple subscription (another Apple ID) is recorded, not applied; when the first expires the clinic moves to it", async () => {
    const { db, clinics } = fakeDb([appleActive()]);
    const d = deps({ apple: memoryApple([{ original_transaction_id: OTID, clinic_id: "clinic-a", app_user_id: USER_A, status: "active", tier: "practice", period_end: "2026-12-17T10:00:00Z" }]) });
    const dup = await handleAppleEvent(db, ev("INITIAL_PURCHASE", { original_transaction_id: OTID_2, product_id: "dentvideo_starter_monthly", expiration_at_ms: ms("2027-01-05T00:00:00Z") }), d);
    expect(dup.body).toMatchObject({ duplicate: true, kept: OTID });
    expect(clinics[0]).toMatchObject({ apple_original_transaction_id: OTID, plan_tier: "practice" });
    expect(d.raised.some((a) => a.key.startsWith("appstore:apple_duplicate:"))).toBe(true);
    const exp = await handleAppleEvent(db, ev("EXPIRATION"), d);
    expect(exp.body).toMatchObject({ plan: "active", movedTo: OTID_2 });
    expect(clinics[0]).toMatchObject({ plan: "active", apple_original_transaction_id: OTID_2, plan_tier: "starter" });
  });
});

describe("RevenueCat webhook: sandbox, migration, transfer", () => {
  it("security: sandbox purchases follow DENTVID_IAP_SANDBOX: internal (default) only for a proven internal or allow-listed owner; allow only when set; off never", async () => {
    const run = async (over: Partial<AppleWebhookDeps>) => {
      const { db, clinics } = fakeDb([trial()]);
      const d = deps(over);
      const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE", { environment: "SANDBOX" }), d);
      return { r, clinics, d };
    };
    // Default: a real clinic owner (a TestFlight tester under any login) gets nothing.
    {
      const { r, clinics, d } = await run({});
      expect(r.body).toMatchObject({ ignored: "sandbox" });
      expect(clinics[0].plan).toBe("trial");
      expect(d.enqueueWeek).not.toHaveBeenCalled();
      expect(d.apple.rows.get(OTID)?.status).toBe("ignored_sandbox");
    }
    // Owner internal by a domain pattern, proven address: allowed.
    {
      const { clinics, d } = await run({ sandboxOwner: async () => ({ email: "qa@bulsulabs.com", verified: true }) });
      expect(clinics[0].plan).toBe("active");
      expect(d.raised.some((a) => a.key.startsWith("appstore:sandbox:"))).toBe(true);
    }
    // The App Review demo account on DENTVID_IAP_SANDBOX_ALLOW_EMAILS: allowed.
    expect((await run({ env: { DENTVID_IAP_SANDBOX_ALLOW_EMAILS: "appreview@dentvideo-demo.example" }, sandboxOwner: async () => ({ email: "AppReview@dentvideo-demo.example", verified: true }) })).clinics[0].plan).toBe("active");
    // Owner-set pattern: allowed.
    expect((await run({ env: { DENTVID_INTERNAL_EMAIL_PATTERNS: "*@tester.example" }, sandboxOwner: async () => ({ email: "a@tester.example", verified: true }) })).clinics[0].plan).toBe("active");
    // Refused: an unproven internal-looking address, a catch-all pattern match, app_metadata.internal alone, an unreadable owner.
    for (const owner of [{ email: "fake@bulsulabs.com", verified: false }, { email: "qa+me@gmail.com", verified: true }, null]) {
      expect((await run({ sandboxOwner: async () => owner, ownerInternal: async () => true })).clinics[0].plan, JSON.stringify(owner)).toBe("trial");
    }
    expect((await run({ sandboxOwner: async () => { throw new Error("liman down"); } })).clinics[0].plan).toBe("trial");
    // allow: anyone, only when set explicitly. off: nobody, not even internal.
    expect((await run({ env: { DENTVID_IAP_SANDBOX: "allow" } })).clinics[0].plan).toBe("active");
    expect((await run({ env: { DENTVID_IAP_SANDBOX: "off" }, sandboxOwner: async () => ({ email: "qa@bulsulabs.com", verified: true }) })).clinics[0].plan).toBe("trial");
  });

  it("security: a sandbox purchase (no money) never takes a clinic off a paid Dodo or production Apple plan", async () => {
    // Even under DENTVID_IAP_SANDBOX=allow (the attacker's best case).
    const allow = { env: { DENTVID_IAP_SANDBOX: "allow" } };
    // app_user_id is whatever the app passed to Purchases.logIn: a TestFlight build logged in as a victim's id.
    {
      const onDodo: Clinic = { ...trial(), plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-01T00:00:00Z" };
      const { db, clinics } = fakeDb([onDodo]);
      const d = deps({ ...allow, subs: memoryDodo([{ dodo_subscription_id: "sub_1", clinic_id: "clinic-a", status: "active" }]) });
      const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE", { environment: "SANDBOX", original_transaction_id: OTID_2 }), d);
      expect(r.body).toMatchObject({ ignored: "sandbox over a paid plan" });
      expect(clinics[0]).toMatchObject({ plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_1", billing_source: null });
      expect(d.apple.rows.get(OTID_2)?.status).toBe("ignored_sandbox");
      expect(d.raised.some((a) => a.key.startsWith("appstore:ignored:"))).toBe(true);
      // Its expiry hours later changes nothing either.
      const e = await handleAppleEvent(db, ev("EXPIRATION", { environment: "SANDBOX", original_transaction_id: OTID_2 }), d);
      expect(e.body).toMatchObject({ current: false });
      expect(clinics[0].plan).toBe("active");
    }
    {
      // A production Apple plan the customer switched off (ending): a sandbox purchase does not take over either.
      const { db, clinics } = fakeDb([appleActive()]);
      const d = deps({ ...allow, apple: memoryApple([{ original_transaction_id: OTID, clinic_id: "clinic-a", app_user_id: USER_A, status: "cancelled", period_end: "2026-12-17T10:00:00.000Z" }]) });
      const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE", { environment: "SANDBOX", original_transaction_id: OTID_2 }), d);
      expect(r.body).toMatchObject({ ignored: "sandbox over a paid plan" });
      expect(clinics[0]).toMatchObject({ apple_original_transaction_id: OTID, billing_source: "apple" });
    }
    {
      // The clinic's own sandbox subscription still renews (TestFlight / App Review).
      const { db, clinics } = fakeDb([trial()]);
      const d = deps(allow);
      await handleAppleEvent(db, ev("INITIAL_PURCHASE", { environment: "SANDBOX" }), d);
      const r = await handleAppleEvent(db, ev("RENEWAL", { environment: "SANDBOX", expiration_at_ms: ms("2026-11-18T10:00:00Z") }), d);
      expect(r.body).toMatchObject({ plan: "active" });
      expect(clinics[0].plan_renews_at).toBe("2026-11-18T10:00:00.000Z");
    }
  });

  it("without migration 0026 the paying clinic is still switched on, and the owner is told to apply it", async () => {
    const { db, clinics } = fakeDb([trial()], { noAppleColumns: true });
    const d = deps({ apple: memoryApple([], false) });
    const r = await handleAppleEvent(db, ev("INITIAL_PURCHASE"), d);
    expect(r.body).toMatchObject({ plan: "active" });
    expect(clinics[0]).toMatchObject({ plan: "active", plan_tier: "practice" });
    expect(clinics[0].billing_source).toBeNull();
    expect(d.raised.some((a) => a.key.startsWith("appstore:migration_missing:"))).toBe(true);
    expect(d.enqueueWeek).toHaveBeenCalledTimes(1);
  });

  it("TRANSFER: the account it left loses the plan; the account it went to is switched on from the event's own facts", async () => {
    const a = appleActive();
    const b = trial(USER_B, "clinic-b");
    const { db, clinics } = fakeDb([a, b]);
    const d = deps({ apple: memoryApple([{ original_transaction_id: OTID, clinic_id: "clinic-a", app_user_id: USER_A, status: "active", tier: "practice" }]) });
    const r = await handleAppleEvent(db, ev("TRANSFER", { app_user_id: USER_B, transferred_from: [USER_A], transferred_to: [USER_B] }), d);
    expect(r.status).toBe(200);
    expect(clinics[0].plan).toBe("cancelled");
    expect(clinics[1]).toMatchObject({ plan: "active", billing_source: "apple", apple_original_transaction_id: OTID });
    expect(d.raised.some((x) => x.key.startsWith("appstore:transfer:"))).toBe(true);
  });

  it("TRANSFER without product facts only switches the old account off", async () => {
    const { db, clinics } = fakeDb([appleActive(), trial(USER_B, "clinic-b")]);
    await handleAppleEvent(db, ev("TRANSFER", { product_id: undefined, expiration_at_ms: null, transferred_from: [USER_A], transferred_to: [USER_B] }), deps());
    expect(clinics.map((c) => c.plan)).toEqual(["cancelled", "trial"]);
  });
});

describe("revenuecatAuthOk (constant-time shared secret)", () => {
  const secret = "s3cr3t-0123456789abcdef-0123456789";
  it("accepts the secret itself or as a Bearer token", () => {
    expect(revenuecatAuthOk(secret, secret)).toBe(true);
    expect(revenuecatAuthOk(`Bearer ${secret}`, secret)).toBe(true);
    expect(revenuecatAuthOk(`  Bearer ${secret} `, secret)).toBe(true);
  });
  it("refuses a missing, wrong or truncated header, and everything when no (or a too short) secret is configured", () => {
    expect(revenuecatAuthOk(null, secret)).toBe(false);
    expect(revenuecatAuthOk("", secret)).toBe(false);
    expect(revenuecatAuthOk(`Bearer ${secret}x`, secret)).toBe(false);
    expect(revenuecatAuthOk(secret.slice(0, -1), secret)).toBe(false);
    expect(revenuecatAuthOk(`Basic ${secret}`, secret)).toBe(false);
    expect(revenuecatAuthOk("Bearer ", "")).toBe(false);
    expect(revenuecatAuthOk("Bearer undefined", undefined)).toBe(false);
    expect(revenuecatAuthOk("short", "short")).toBe(false);
  });

  it("security: a secret equal to ClipForge's RevenueCat secret is refused (rotate it), a different one is not", () => {
    const secret = "shared-0123456789abcdef0123456789";
    expect(revenuecatAuthOk(`Bearer ${secret}`, secret, secret)).toBe(false);
    expect(revenuecatAuthOk(secret, secret, ` ${secret} `)).toBe(false);
    expect(revenuecatAuthOk(secret, secret, "clipforge-0123456789abcdef0123")).toBe(true);
    expect(revenuecatAuthOk(secret, secret, "")).toBe(true);
  });
});
