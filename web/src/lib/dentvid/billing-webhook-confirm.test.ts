import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LIMITS, slidingWindow } from "@/lib/rate-limit";
import { accountDeletionMarker, confirmMailWith, handleDentvideoEvent, type DvWebhookDeps } from "./billing-webhook";
import type { DvSubRecord, DvTier } from "./billing";
import type { SubscriptionStore } from "./subscriptions";
import { MemoryOpsStore, renderAlert, type OwnerAlert } from "./ops-alert";
import type { AppleSubRecord, AppleSubscriptionStore } from "./apple-store";
import { sendBillingConfirmation, type BillingConfirmNotice } from "./billing-confirm-email";
import { deletionLimitKey } from "./billing-confirm-checks";
import { KindNotAllowedError, type ClinicForMail, type LifecycleStore, type LogRow, type Sender } from "./lifecycle";
import { noticeDate } from "./retention-email";

/** A day as the New York clinic below reads it (the email's own date format: a US clinic writes "December 9, 2026"). */
const ny = (iso: string) => noticeDate("en", new Date(iso), "America/New_York", "US");

/**
 * Money events are confirmed to the clinic in writing (billing-confirm-email.ts): the first word of a
 * cancellation, and a plan change. Once each, never for App Store or demo clinics, and an email that
 * fails never fails (or retries) the webhook.
 */

const CLINIC = "11111111-2222-3333-4444-555555555555";
const OWNER = "owner-1";
const STARTER = "pdt_0NrVahwZsINvy3TNz2H35";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";
const NOW = new Date("2026-11-20T00:00:00Z");
const END = "2026-12-10T00:00:00.000Z";

type Clinic = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

/** The clinic table in memory; every other table is missing (as before 0024 / 0026), unless `tables` holds rows for it. */
function fakeDb(clinic: Clinic, tables: Record<string, unknown[]> = {}) {
  const db = {
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
          return { data: filters.every(([k, v]) => (clinic as Record<string, unknown>)[k] === v) ? { ...clinic } : null, error: null };
        },
        then(resolve: (v: unknown) => void) {
          if (table === "dentvid_items") return resolve({ count: 0, error: null });
          if (!patch && table !== "dentvid_clinics") {
            return resolve(tables[table] ? { data: tables[table], error: null } : { data: null, error: { code: "42P01", message: `relation "public.${table}" does not exist` } });
          }
          if (patch && table === "dentvid_clinics" && filters.every(([k, v]) => (clinic as Record<string, unknown>)[k] === v)) Object.assign(clinic, patch);
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, clinic };
}

function memorySubs(rows: DvSubRecord[] = []): SubscriptionStore & { rows: Map<string, DvSubRecord> } {
  const map = new Map(rows.map((r) => [r.dodo_subscription_id, { ...r }]));
  return {
    rows: map,
    get: async (id) => map.get(id) ?? null,
    forClinic: async (c) => [...map.values()].filter((r) => r.clinic_id === c),
    put: async (r) => (map.set(r.dodo_subscription_id, { ...map.get(r.dodo_subscription_id), ...r }), true),
    recordPayment: async () => {},
    paymentClinic: async () => null,
  };
}

const paying = (tier = "practice"): Clinic => ({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: tier, dodo_subscription_id: "sub_1", plan_renews_at: END });
const ledger = (tier: DvTier = "practice") =>
  memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "active", tier, product: tier === "starter" ? STARTER : PRACTICE, period_end: END, last_event_at: "2026-11-10T00:00:00.000Z" }]);

const meta = { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice", interval: "month" };

/** The App Store ledger (0026) with these rows. */
const appleLedger = (rows: Partial<AppleSubRecord>[] = []): AppleSubscriptionStore => ({
  get: async () => null,
  forClinic: async () => rows.map((r) => ({ original_transaction_id: "1000", clinic_id: CLINIC, app_user_id: OWNER, status: "active", ...r })),
  put: async () => true,
});
/** Bought in the iPhone app while the web plan ran: held back, paid well past the web plan's end. */
const waitingApple = { status: "ignored_web_active", tier: "practice", environment: "PRODUCTION", period_end: "2027-01-05T00:00:00.000Z" };
const cancel = (type = "subscription.cancelled", nbd: string | null = END, timestamp = "2026-11-20T00:00:00Z") => ({
  type,
  timestamp,
  data: { subscription_id: "sub_1", product_id: PRACTICE, status: type.split(".")[1], next_billing_date: nbd, metadata: meta },
});
const planChanged = (product: string, timestamp = "2026-11-20T10:00:00Z", status = "active") => ({
  type: "subscription.plan_changed",
  timestamp,
  data: { subscription_id: "sub_1", product_id: product, status, next_billing_date: END, metadata: meta },
});

function deps(over: Partial<DvWebhookDeps> = {}) {
  const raised: OwnerAlert[] = [];
  const notices: BillingConfirmNotice[] = [];
  const d: DvWebhookDeps & { raised: OwnerAlert[]; notices: BillingConfirmNotice[] } = {
    raised,
    notices,
    alert: async (a) => void raised.push(a),
    clinicRef: async (_db, id) => ({ id, name: "Örnek Diş Kliniği", email: "dr@clinic.example" }),
    enqueueWeek: vi.fn(async () => "queued" as const),
    sendWelcome: vi.fn(async () => "sent"),
    sendPaymentMail: vi.fn(async () => "sent"),
    sendConfirmMail: vi.fn(async (_db: SupabaseClient, _id: string, n: BillingConfirmNotice) => (notices.push(n), "sent")),
    markPaid: vi.fn(async () => {}),
    ownerInternal: async () => false,
    dodoStatus: async () => null,
    paidThrough: async () => null,
    appleManaged: async () => false,
    apple: appleLedger(),
    deletionRequested: async () => false,
    now: () => NOW,
    selfServe: true,
    ...over,
  };
  return d;
}

/** The real sender over an in-memory email log and owner: what actually reaches the clinic. */
function realMail(owner: { email: string; verified: boolean } | null = { email: "dr@clinic.example", verified: true }, opts: { ok?: boolean; demo?: boolean } = {}) {
  const log: LogRow[] = [];
  const sent: { to: string; subject: string; text: string }[] = [];
  const row: ClinicForMail = { id: CLINIC, owner_id: OWNER, profile: { name: "Sample Dental Practice", language: "en", country: "US", timezone: "America/New_York" }, plan: "active", created_at: "", email_opt_out_at: null };
  const store: LifecycleStore = {
    trialClinics: async () => [],
    logs: async () => log,
    clinic: async () => row,
    claim: async (c, kind) => (log.some((l) => l.kind === kind) ? false : (log.push({ clinic_id: c, kind, sent_at: "" }), true)),
    release: async (_c, kind) => void log.splice(log.findIndex((l) => l.kind === kind), 1),
    owner: async () => owner,
    optOut: async () => true,
  };
  const send: Sender = async (to, m) => (sent.push({ to, subject: m.subject, text: m.text }), opts.ok ?? true);
  const sendConfirmMail = (_db: SupabaseClient, id: string, n: BillingConfirmNotice) =>
    sendBillingConfirmation({ store, send, config: { base: "https://dentvideo.com", enabled: true }, isDemo: async () => !!opts.demo }, id, n);
  return { sendConfirmMail, sent, log, row, store };
}

describe("cancellation: one written confirmation, on the first word", () => {
  it("names the day the videos stop; the same event again, or cancelled then expired, sends nothing new", async () => {
    const { db, clinic } = fakeDb(paying());
    const d = deps({ subs: ledger() });
    const r = await handleDentvideoEvent(db, cancel(), d);
    expect(r).toMatchObject({ status: 200, body: { plan: "active", endsAt: END, confirmEmail: "sent" } });
    expect(d.notices).toEqual([{ kind: "cancelled", subscriptionId: "sub_1", endsAt: END, since: "2026-11-10T00:00:00.000Z" }]);
    expect(clinic.plan).toBe("active");

    const again = await handleDentvideoEvent(db, cancel(), d);
    expect(again.body).toMatchObject({ unchanged: true });
    expect(again.body).not.toHaveProperty("confirmEmail");
    await handleDentvideoEvent(db, cancel("subscription.expired", END, "2026-11-21T00:00:00Z"), d);
    expect(d.sendConfirmMail).toHaveBeenCalledTimes(1);
  });

  it("end to end: exactly one email reaches the clinic, in its language, with both dates", async () => {
    const { db } = fakeDb(paying());
    const mail = realMail();
    const d = deps({ subs: ledger(), sendConfirmMail: mail.sendConfirmMail });
    await handleDentvideoEvent(db, cancel(), d);
    await handleDentvideoEvent(db, cancel(), d);
    await handleDentvideoEvent(db, cancel("subscription.expired", END, "2026-11-21T00:00:00Z"), d);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe("dr@clinic.example");
    expect(mail.sent[0].subject).toBe("Your DentVideo plan is canceled");
    // 00:00 UTC on 10 December is still the 9th in New York; the library stays 90 days after that.
    expect(mail.sent[0].text).toContain(`You keep getting your weekly videos until ${ny(END)}.`);
    expect(ny(END)).toBe(noticeDate("en", new Date("2026-12-09T12:00:00Z"), "UTC", "US"));
    expect(ny(END)).toBe("December 9, 2026");
    expect(mail.sent[0].text).toContain(`for 90 days, until ${ny("2027-03-10T00:00:00Z")}`);
  });

  it("two deliveries racing past the first-word check still email once (the email log claims it)", async () => {
    const mail = realMail();
    const a = fakeDb(paying());
    const b = fakeDb(paying());
    // Each delivery reads the ledger before the other wrote it.
    await Promise.all([
      handleDentvideoEvent(a.db, cancel(), deps({ subs: ledger(), sendConfirmMail: mail.sendConfirmMail })),
      handleDentvideoEvent(b.db, cancel("subscription.expired"), deps({ subs: ledger(), sendConfirmMail: mail.sendConfirmMail })),
    ]);
    expect(mail.sent).toHaveLength(1);
  });

  it("an end date read from Dodo (no date on the event) is the one confirmed", async () => {
    const { db } = fakeDb(paying());
    const d = deps({ subs: ledger(), paidThrough: async () => END });
    const r = await handleDentvideoEvent(db, cancel("subscription.cancelled", null), d);
    expect(r.body).toMatchObject({ endsAt: END, confirmEmail: "sent" });
    expect(d.notices).toEqual([{ kind: "cancelled", subscriptionId: "sub_1", endsAt: END, since: "2026-11-10T00:00:00.000Z" }]);
  });

  it("not for a clinic whose plan the App Store pays for", async () => {
    const { db, clinic } = fakeDb(paying());
    const d = deps({ subs: ledger(), appleManaged: async () => true });
    const r = await handleDentvideoEvent(db, cancel(), d);
    expect(r.body).toMatchObject({ ignored: "app_store_managed" });
    expect(d.sendConfirmMail).not.toHaveBeenCalled();
    expect(clinic.plan_renews_at).toBe(END);
  });

  it("not for the review demo clinic, and not when the owner has no address: the webhook still answers 200", async () => {
    for (const [mail, want] of [
      [realMail(undefined, { demo: true }), "demo clinic"],
      [realMail(null), "no email"],
      [realMail({ email: "dr@clinic.example", verified: false }), "unverified"],
    ] as const) {
      const { db, clinic } = fakeDb(paying());
      const subs = ledger();
      const r = await handleDentvideoEvent(db, cancel(), deps({ subs, sendConfirmMail: mail.sendConfirmMail }));
      expect(r, want).toMatchObject({ status: 200, body: { plan: "active", endsAt: END, confirmEmail: want } });
      expect(mail.sent, want).toHaveLength(0);
      expect(clinic.plan_renews_at, want).toBe(END);
      expect(subs.rows.get("sub_1"), want).toMatchObject({ status: "cancelled", period_end: END });
    }
  });

  it("an email that fails or throws never fails the webhook: the end is recorded, the owner told, Dodo gets 200", async () => {
    const failures: DvWebhookDeps["sendConfirmMail"][] = [
      async () => {
        throw new Error("resend down");
      },
      () => {
        throw new Error("thrown before any promise");
      },
      async () => "failed",
      realMail(undefined, { ok: false }).sendConfirmMail,
    ];
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const sendConfirmMail of failures) {
      const { db, clinic } = fakeDb(paying());
      const subs = ledger();
      const d = deps({ subs, sendConfirmMail });
      const r = await handleDentvideoEvent(db, cancel(), d);
      expect(r).toMatchObject({ status: 200, body: { ok: true, plan: "active", endsAt: END, confirmEmail: "failed" } });
      expect(clinic.plan_renews_at).toBe(END);
      expect(subs.rows.get("sub_1")).toMatchObject({ status: "cancelled", period_end: END });
      expect(d.raised.map((a) => a.key)).toEqual([`at_risk:${CLINIC}:subscription.cancelled`]);
    }
    err.mockRestore();
  });

  it("a confirmation that hangs does not hold up the answer to Dodo", async () => {
    const { db, clinic } = fakeDb(paying());
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({ subs: ledger(), sendConfirmMail: () => new Promise<string>(() => {}), confirmTimeoutMs: 20 });
    const r = await handleDentvideoEvent(db, cancel(), d);
    err.mockRestore();
    expect(r).toMatchObject({ status: 200, body: { plan: "active", endsAt: END, confirmEmail: "timed out" } });
    expect(clinic.plan_renews_at).toBe(END);
  });

  it("nothing when the clinic is cancelled at once (no future date), has no ledger, or never paid", async () => {
    const cases: [Clinic, SubscriptionStore, ReturnType<typeof cancel>][] = [
      [paying(), ledger(), cancel("subscription.cancelled", "2026-11-19T00:00:00Z")],
      [paying(), { get: async () => undefined, forClinic: async () => null, put: async () => false, recordPayment: async () => {}, paymentClinic: async () => null }, cancel()],
      [{ ...paying(), plan: "trial", dodo_subscription_id: null, plan_renews_at: null }, memorySubs(), cancel()],
    ];
    for (const [c, subs, e] of cases) {
      const { db } = fakeDb(c);
      const d = deps({ subs });
      await handleDentvideoEvent(db, e, d);
      expect(d.sendConfirmMail).not.toHaveBeenCalled();
    }
  });

  it("a clinic that comes back on a new subscription and cancels it again gets a new confirmation", async () => {
    const mail = realMail();
    const { db, clinic } = fakeDb(paying());
    const subs = ledger();
    const d = deps({ subs, sendConfirmMail: mail.sendConfirmMail });
    await handleDentvideoEvent(db, cancel(), d);
    // The period ran out and the clinic chose a plan again (sub_2).
    Object.assign(clinic, { plan: "cancelled", plan_renews_at: null });
    const later = "2027-01-10T00:00:00.000Z";
    await handleDentvideoEvent(db, { type: "subscription.active", timestamp: "2026-12-11T00:00:00Z", data: { subscription_id: "sub_2", product_id: PRACTICE, status: "active", next_billing_date: later, metadata: meta } }, d);
    expect(clinic).toMatchObject({ plan: "active", dodo_subscription_id: "sub_2" });
    await handleDentvideoEvent(db, { type: "subscription.cancelled", timestamp: "2026-12-20T00:00:00Z", data: { subscription_id: "sub_2", product_id: PRACTICE, status: "cancelled", next_billing_date: later, metadata: meta } }, { ...d, now: () => new Date("2026-12-20T00:00:00Z") });
    expect(mail.sent.map((s) => s.subject)).toEqual(["Your DentVideo plan is canceled", "Your DentVideo plan is canceled"]);
    expect(mail.sent[1].text).toContain(`until ${ny(later)}.`);
  });
});

describe("plan change: one written confirmation naming the new plan", () => {
  it("Starter to Practice: once, with the right tier; a redelivery sends nothing", async () => {
    const { db, clinic } = fakeDb(paying("starter"));
    const d = deps({ subs: ledger("starter") });
    const r = await handleDentvideoEvent(db, planChanged(PRACTICE), d);
    expect(r).toMatchObject({ status: 200, body: { plan: "active", confirmEmail: "sent" } });
    expect(clinic.plan_tier).toBe("practice");
    expect(d.notices).toEqual([{ kind: "plan_changed", subscriptionId: "sub_1", tier: "practice", eventAt: "2026-11-20T10:00:00.000Z", prorated: true }]);
    const again = await handleDentvideoEvent(db, planChanged(PRACTICE), d);
    expect(again.body).not.toHaveProperty("confirmEmail");
    expect(d.sendConfirmMail).toHaveBeenCalledTimes(1);
    expect(d.enqueueWeek).not.toHaveBeenCalled();
    expect(d.sendWelcome).not.toHaveBeenCalled();
  });

  it("end to end: Practice and back to Starter are two emails, each naming its plan", async () => {
    const mail = realMail();
    const { db } = fakeDb(paying("starter"));
    const d = deps({ subs: ledger("starter"), sendConfirmMail: mail.sendConfirmMail });
    await handleDentvideoEvent(db, planChanged(PRACTICE), d);
    await handleDentvideoEvent(db, planChanged(PRACTICE), d);
    await handleDentvideoEvent(db, planChanged(STARTER, "2026-11-22T10:00:00Z"), d);
    expect(mail.sent.map((s) => s.subject)).toEqual(["Your DentVideo plan is now Practice", "Your DentVideo plan is now Starter"]);
    expect(mail.sent[0].text).toContain("Practice includes everything in Starter");
    expect(mail.sent[0].text).toContain("charged or credited by Dodo Payments");
  });

  it("nothing when the tier did not change, the event is not active, it is a renewal, or the App Store owns the plan", async () => {
    const cases: [Clinic, unknown, Partial<DvWebhookDeps>][] = [
      [paying("practice"), planChanged(PRACTICE), {}],
      // Same tier, a new billing date: the row moves, the plan does not.
      [paying("practice"), { ...planChanged(PRACTICE), data: { ...planChanged(PRACTICE).data, next_billing_date: "2027-01-10T00:00:00.000Z" } }, {}],
      [paying("starter"), planChanged(PRACTICE, undefined, "on_hold"), {}],
      [paying("starter"), { type: "subscription.renewed", timestamp: "2026-11-20T10:00:00Z", data: { ...planChanged(PRACTICE).data } }, {}],
      [paying("starter"), planChanged(PRACTICE), { appleManaged: async () => true }],
    ];
    for (const [c, e, over] of cases) {
      const { db } = fakeDb(c);
      const d = deps({ subs: ledger(c.plan_tier as DvTier), ...over });
      const r = await handleDentvideoEvent(db, e as Parameters<typeof handleDentvideoEvent>[1], d);
      expect(r.status).toBe(200);
      expect(d.sendConfirmMail).not.toHaveBeenCalled();
    }
  });

  it("a failed confirmation never fails the plan change", async () => {
    const { db, clinic } = fakeDb(paying("starter"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({
      subs: ledger("starter"),
      sendConfirmMail: async () => {
        throw new Error("resend down");
      },
    });
    const r = await handleDentvideoEvent(db, planChanged(PRACTICE), d);
    err.mockRestore();
    expect(r).toMatchObject({ status: 200, body: { plan: "active", confirmEmail: "failed" } });
    expect(clinic.plan_tier).toBe("practice");
  });
});

describe("a cancellation is never confirmed when it would not be true", () => {
  it("an App Store subscription held back while the web plan ran takes over at the end: no 'your plan ends' email", async () => {
    const { db, clinic } = fakeDb(paying());
    const mail = realMail();
    const subs = ledger();
    const d = deps({ subs, sendConfirmMail: mail.sendConfirmMail, apple: appleLedger([waitingApple]) });
    const r = await handleDentvideoEvent(db, cancel(), d);
    expect(r).toMatchObject({ status: 200, body: { plan: "active", endsAt: END, confirmEmail: "app store takes over" } });
    expect(mail.sent).toHaveLength(0);
    expect(mail.log).toHaveLength(0);
    // The end is still recorded (the worker's takeover needs it), and the owner's alert says the plan carries on.
    expect(clinic.plan_renews_at).toBe(END);
    expect(subs.rows.get("sub_1")).toMatchObject({ status: "cancelled", period_end: END });
    expect(d.raised).toHaveLength(1);
    expect(d.raised[0].done.join(" ")).toMatch(/App Store subscription it bought in the app takes over/);
    expect(d.raised[0].done.join(" ")).not.toMatch(/library stays until/);
  });

  it("an App Store row that cannot take over (sandbox, no tier, already lapsed, or not held back) does not stop the email", async () => {
    for (const row of [
      { ...waitingApple, environment: "SANDBOX" },
      { ...waitingApple, tier: null },
      { ...waitingApple, period_end: "2026-11-19T00:00:00.000Z" },
      { ...waitingApple, status: "expired" },
    ]) {
      const { db } = fakeDb(paying());
      const mail = realMail();
      const r = await handleDentvideoEvent(db, cancel(), deps({ subs: ledger(), sendConfirmMail: mail.sendConfirmMail, apple: appleLedger([row]) }));
      expect(r.body, JSON.stringify(row)).toMatchObject({ confirmEmail: "sent" });
      expect(mail.sent).toHaveLength(1);
    }
  });

  it("the App Store ledger: missing table (0026 not applied) is no App Store subscription; a failed read is unknown, so no email and the owner confirms by hand", async () => {
    const noLedger = fakeDb(paying());
    const sent = await handleDentvideoEvent(noLedger.db, cancel(), deps({ subs: ledger(), apple: undefined }));
    expect(sent.body).toMatchObject({ confirmEmail: "sent" });

    const withRow = fakeDb(paying(), { dentvid_apple_subscriptions: [waitingApple] });
    const held = await handleDentvideoEvent(withRow.db, cancel(), deps({ subs: ledger(), apple: undefined }));
    expect(held.body).toMatchObject({ confirmEmail: "app store takes over" });

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb(paying());
    const d = deps({ subs: ledger(), apple: { ...appleLedger(), forClinic: async () => null } });
    const r = await handleDentvideoEvent(db, cancel(), d);
    err.mockRestore();
    expect(r).toMatchObject({ status: 200, body: { plan: "active", endsAt: END, confirmEmail: "not checked" } });
    expect(d.sendConfirmMail).not.toHaveBeenCalled();
    expect(d.raised.map((a) => a.key)).toEqual([`at_risk:${CLINIC}:subscription.cancelled`]);
    expect(d.raised[0].todo[0]).toBe("Confirm the cancellation to dr@clinic.example by hand: weekly videos until 2026-12-10, library kept until 2027-03-10.");
  });

  it("an account being deleted: its owner is never told the library stays 90 days", async () => {
    // What the deletion route does first (handlers/account-delete.ts): count the request, then cancel Dodo.
    const ops = new MemoryOpsStore();
    const counter = { incr: (k: string, ttl: number) => ops.incr(k, ttl), get: async (k: string) => Number((await ops.get(k)) ?? 0) };
    await slidingWindow(counter, deletionLimitKey(OWNER), LIMITS.accountDeleteUser, NOW.getTime() - 40 * 60_000);

    const { db, clinic } = fakeDb(paying());
    const mail = realMail();
    const subs = ledger();
    const d = deps({ subs, sendConfirmMail: mail.sendConfirmMail, deletionRequested: (owner) => accountDeletionMarker(owner, NOW, { ops: async () => ops }) });
    const r = await handleDentvideoEvent(db, cancel(), d);
    expect(r).toMatchObject({ status: 200, body: { plan: "active", endsAt: END, confirmEmail: "account deletion" } });
    expect(mail.sent).toHaveLength(0);
    expect(mail.log).toHaveLength(0);
    expect(clinic.plan_renews_at).toBe(END);
    expect(d.raised[0].done.join(" ")).toMatch(/asked to delete the account/);
    expect(d.raised[0].todo[0]).toMatch(/^If the clinic still exists tomorrow, its deletion did not finish/);

    // Another clinic's deletion is not this one's.
    const other = fakeDb(paying());
    const d2 = deps({ subs: ledger(), sendConfirmMail: realMail().sendConfirmMail, deletionRequested: () => accountDeletionMarker("someone-else", NOW, { ops: async () => ops }) });
    expect((await handleDentvideoEvent(other.db, cancel(), d2)).body).toMatchObject({ confirmEmail: "sent" });
  });

  it("when the deletion marker cannot be read (Redis down or not configured), nothing is sent and the owner confirms by hand", async () => {
    const down = new MemoryOpsStore();
    down.down = true;
    for (const ops of [async () => down, async () => null]) {
      const { db } = fakeDb(paying());
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const d = deps({ subs: ledger(), deletionRequested: (owner) => accountDeletionMarker(owner, NOW, { ops, retryMs: 1 }) });
      const r = await handleDentvideoEvent(db, cancel(), d);
      err.mockRestore();
      expect(r.body).toMatchObject({ plan: "active", endsAt: END, confirmEmail: "not checked" });
      expect(d.sendConfirmMail).not.toHaveBeenCalled();
      expect(d.raised[0].done.join(" ")).toMatch(/could not be checked/);
      expect(d.raised[0].todo[0]).toMatch(/by hand/);
    }
  });
});

describe("the owner's alert says what the clinic was told", () => {
  it("sent: the alert names both dates and says the clinic has them in writing (never 'no email was sent')", async () => {
    const { db } = fakeDb(paying());
    const d = deps({ subs: ledger() });
    await handleDentvideoEvent(db, cancel(), d);
    const a = d.raised[0];
    expect(a.key).toBe(`at_risk:${CLINIC}:subscription.cancelled`);
    expect(a.done).toEqual([
      "The clinic keeps getting its weekly videos until 2026-12-10; then the plan ends, and its library stays until 2027-03-10 unless it chooses a plan again.",
      // ops-alert.ts customerAtRisk's own line: step 6 passes cancellationConfirmed when the email was sent.
      "The clinic was emailed a confirmation of the end date and how long its library stays (in its language, once).",
    ]);
    expect(a.done.join(" ")).not.toMatch(/No email was sent|payment notices|update its card/);
  });

  it("sent, end to end: the owner's alert email matches the email the clinic received", async () => {
    const { db } = fakeDb(paying());
    const mail = realMail();
    const d = deps({ subs: ledger(), sendConfirmMail: mail.sendConfirmMail });
    const r = await handleDentvideoEvent(db, cancel(), d);
    expect(r.body).toMatchObject({ confirmEmail: "sent" });
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].text).toContain(`You keep getting your weekly videos until ${ny(END)}.`);
    expect(d.raised.map((a) => a.key)).toEqual([`at_risk:${CLINIC}:subscription.cancelled`]);
    const owner = renderAlert(d.raised[0]).text;
    expect(owner).toContain("The clinic was emailed a confirmation of the end date and how long its library stays (in its language, once).");
    expect(owner).toContain("until 2026-12-10");
    expect(owner).not.toMatch(/No email was sent|payment notices|new weeks stop/);
  });

  it("already sent (a claim from an earlier delivery): the alert does not claim a new email went out", async () => {
    const { db } = fakeDb(paying());
    const d = deps({ subs: ledger(), sendConfirmMail: async () => "already sent" });
    await handleDentvideoEvent(db, cancel(), d);
    expect(d.raised[0].done[1]).toBe("The clinic already had its written confirmation of this cancellation.");
  });

  it("failed: the alert says so and asks the owner to confirm by hand, with the dates to give", async () => {
    const { db } = fakeDb(paying());
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({ subs: ledger(), sendConfirmMail: async () => "failed" });
    await handleDentvideoEvent(db, cancel(), d);
    err.mockRestore();
    expect(d.raised).toHaveLength(1);
    expect(d.raised[0].done[1]).toBe("No written confirmation went to the clinic (failed: the email could not be sent).");
    expect(d.raised[0].todo[0]).toBe("Confirm the cancellation to dr@clinic.example by hand: weekly videos until 2026-12-10, library kept until 2027-03-10.");
  });

  it("timed out: Dodo gets its answer at once; if the send then fails, the owner gets a separate alert", async () => {
    const { db } = fakeDb(paying());
    let finish: (r: string) => void = () => {};
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({ subs: ledger(), confirmTimeoutMs: 20, sendConfirmMail: () => new Promise<string>((res) => (finish = res)) });
    const r = await handleDentvideoEvent(db, cancel(), d);
    expect(r.body).toMatchObject({ confirmEmail: "timed out" });
    expect(d.raised.map((a) => a.key)).toEqual([`at_risk:${CLINIC}:subscription.cancelled`]);
    expect(d.raised[0].done[1]).toMatch(/still being sent .* separate alert if it fails/);
    finish("failed");
    await vi.waitFor(() => expect(d.raised).toHaveLength(2));
    err.mockRestore();
    expect(d.raised[1]).toMatchObject({ key: `confirm_not_sent:${CLINIC}:cancelled`, severity: "warning" });
    expect(d.raised[1].todo[0]).toBe("Send dr@clinic.example a short confirmation by hand: weekly videos until 2026-12-10, library kept until 2027-03-10.");
  });

  it("timed out, then sent after all: no second alert", async () => {
    const { db } = fakeDb(paying());
    let finish: (r: string) => void = () => {};
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({ subs: ledger(), confirmTimeoutMs: 20, sendConfirmMail: () => new Promise<string>((res) => (finish = res)) });
    await handleDentvideoEvent(db, cancel(), d);
    finish("sent");
    await new Promise((res) => setTimeout(res, 20));
    err.mockRestore();
    expect(d.raised).toHaveLength(1);
  });
});

describe("cancelled, resumed, cancelled again", () => {
  it("the same subscription cancelled a second time after a resume is confirmed again; a repeat of either word is not", async () => {
    const mail = realMail();
    const { db } = fakeDb(paying());
    const subs = ledger();
    const d = deps({ subs, sendConfirmMail: mail.sendConfirmMail });
    await handleDentvideoEvent(db, cancel(), d);
    // The clinic changed its mind and the subscription was resumed (a newer subscription.active on sub_1).
    const resumed = await handleDentvideoEvent(db, { type: "subscription.active", timestamp: "2026-11-22T00:00:00Z", data: { subscription_id: "sub_1", product_id: PRACTICE, status: "active", next_billing_date: END, metadata: meta } }, d);
    expect(resumed.status).toBe(200);
    expect(subs.rows.get("sub_1")?.status).toBe("active");
    await handleDentvideoEvent(db, cancel("subscription.cancelled", END, "2026-11-25T00:00:00Z"), { ...d, now: () => new Date("2026-11-25T00:00:00Z") });
    await handleDentvideoEvent(db, cancel("subscription.cancelled", END, "2026-11-25T00:00:00Z"), { ...d, now: () => new Date("2026-11-25T00:00:00Z") });
    expect(mail.sent.map((m) => m.subject)).toEqual(["Your DentVideo plan is canceled", "Your DentVideo plan is canceled"]);
  });
});

describe("the plan change email says how the difference is billed only when DentVideo knows", () => {
  const run = async (from: DvTier, product: string, over: Partial<DvWebhookDeps>) => {
    const mail = realMail();
    const { db } = fakeDb(paying(from));
    await handleDentvideoEvent(db, planChanged(product), deps({ subs: ledger(from), sendConfirmMail: mail.sendConfirmMail, ...over }));
    return mail.sent;
  };

  it("self-serve switch between Starter and Practice: prorated by Dodo, as the plan screen said", async () => {
    const sent = await run("starter", PRACTICE, { selfServe: true });
    expect(sent[0].text).toContain("For the rest of this billing period, the difference is charged or credited by Dodo Payments");
  });

  it("no self-serve billing (the owner changed it in Dodo by hand): no claim about proration", async () => {
    const sent = await run("starter", PRACTICE, { selfServe: false });
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("Dodo Payments, our payment provider, handles the billing for your new plan.");
    expect(sent[0].text).not.toMatch(/charged or credited/);
  });

  it("to or from Group (always set up by hand): no claim about proration either", async () => {
    const d = deps({ subs: ledger("group") });
    const { db } = fakeDb(paying("group"));
    await handleDentvideoEvent(db, planChanged(PRACTICE), d);
    expect(d.notices).toEqual([expect.objectContaining({ kind: "plan_changed", tier: "practice", prorated: false })]);
  });

  it("a plan change confirmation that fails: the owner is told which clinic to write to", async () => {
    const { db } = fakeDb(paying("starter"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({ subs: ledger("starter"), sendConfirmMail: async () => "failed" });
    const r = await handleDentvideoEvent(db, planChanged(PRACTICE), d);
    err.mockRestore();
    expect(r).toMatchObject({ status: 200, body: { plan: "active", confirmEmail: "failed" } });
    const a = d.raised.find((x) => x.key === `confirm_not_sent:${CLINIC}:plan_changed`);
    expect(a?.todo[0]).toBe("Send dr@clinic.example a short confirmation by hand: the plan is now Practice.");
    // Nothing for results that are not a breakage.
    for (const result of ["sent", "already sent", "demo clinic", "no email", "test account"]) {
      const f = fakeDb(paying("starter"));
      const d2 = deps({ subs: ledger("starter"), sendConfirmMail: async () => result });
      await handleDentvideoEvent(f.db, planChanged(PRACTICE), d2);
      expect(d2.raised.filter((x) => x.key.startsWith("confirm_not_sent")), result).toEqual([]);
    }
  });
});

describe("the production sender (confirmMailWith): what reaches the clinic without any test hook", () => {
  /** A db whose clinic row carries review_demo (0024). */
  const demoDb = (reviewDemo: boolean | null) =>
    ({
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { review_demo: reviewDemo }, error: null }) };
        return q;
      },
    }) as unknown as SupabaseClient;
  const notice: BillingConfirmNotice = { kind: "cancelled", subscriptionId: "sub_1", endsAt: END, since: null };

  function wired(over: { claimThrows?: boolean } = {}) {
    const mail = realMail();
    const store = { ...mail.store } as LifecycleStore;
    if (over.claimThrows)
      store.claim = async (_c, kind) => {
        throw new KindNotAllowedError(kind);
      };
    const sent: string[] = [];
    const send: Sender = async (to) => (sent.push(to), true);
    const ops = new MemoryOpsStore();
    return { store, send, sent, ops };
  }

  it("leaves out the App Review demo clinic (review_demo read from the clinic row)", async () => {
    const w = wired();
    const env = { RESEND_API_KEY: "re_test" };
    const io = { env, send: w.send, store: () => w.store, ops: async () => w.ops };
    expect(await confirmMailWith(io)(demoDb(true), CLINIC, notice)).toBe("demo clinic");
    expect(await confirmMailWith(io)(demoDb(false), CLINIC, notice)).toBe("sent");
    expect(w.sent).toEqual(["dr@clinic.example"]);
  });

  it("before 0011 the once-only claim is a Redis key, so a second delivery sends nothing", async () => {
    const w = wired({ claimThrows: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const io = { env: { RESEND_API_KEY: "re_test" }, send: w.send, store: () => w.store, ops: async () => w.ops };
    expect(await confirmMailWith(io)(demoDb(null), CLINIC, notice)).toBe("sent");
    expect(await confirmMailWith(io)(demoDb(null), CLINIC, notice)).toBe("already sent");
    warn.mockRestore();
    expect(w.sent).toHaveLength(1);
    expect([...w.ops.kv.keys()]).toEqual([expect.stringMatching(new RegExp(`^dv:billconfirm:${CLINIC}:plan_cancelled_[0-9a-f]{10}$`))]);
  });

  it("no Resend key: nothing; the lifecycle off switch: nothing", async () => {
    const w = wired();
    const io = { send: w.send, store: () => w.store, ops: async () => w.ops };
    expect(await confirmMailWith({ ...io, env: {} })(demoDb(false), CLINIC, notice)).toBe("no email key");
    expect(await confirmMailWith({ ...io, env: { RESEND_API_KEY: "re_test", DENTVIDEO_LIFECYCLE_EMAILS: "off" } })(demoDb(false), CLINIC, notice)).toBe("disabled");
    expect(w.sent).toEqual([]);
  });
});

describe("the other billing emails are unchanged", () => {
  it("on hold still sends the payment-problem email, and no confirmation", async () => {
    const { db } = fakeDb(paying());
    const d = deps({ subs: ledger() });
    const r = await handleDentvideoEvent(db, { type: "subscription.on_hold", timestamp: "2026-11-20T00:00:00Z", data: { ...cancel().data, status: "on_hold" } }, d);
    expect(r.body).toMatchObject({ plan: "paused", clinicEmail: "sent" });
    expect(d.sendPaymentMail).toHaveBeenCalledTimes(1);
    expect(d.sendConfirmMail).not.toHaveBeenCalled();
  });
});
