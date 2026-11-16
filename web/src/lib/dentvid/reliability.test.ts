import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent, withTimeout } from "./billing-webhook";
import { enqueueFirstWeek, type KeptJob } from "./week-job";
import { checkoutBlock, planEndsAt, type DvSubRecord } from "./billing";
import type { SubscriptionStore } from "./subscriptions";

/**
 * Post-purchase chain: failure modes found in the reliability review
 * (docs/RELIABILITY.md). Each test proves the "after" behaviour of a fix;
 * the comment says what happened before.
 */

const CLINIC = "11111111-2222-3333-4444-555555555555";
const OWNER = "owner-1";
const PRACTICE = "pdt_0NrVai0xqpQKU8H3Zj3QN";

type Clinic = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

function fakeDb(clinic: Clinic, itemsThisWeek = 0) {
  const events: { name: string; props: Record<string, unknown> }[] = [];
  const db = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        update: (p: Record<string, unknown>) => ((patch = p), q),
        insert: (row: { name: string; props: Record<string, unknown> }) => {
          if (table === "dentvid_events") events.push(row);
          return q;
        },
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        neq: () => q,
        maybeSingle: async () => ({ data: filters.every(([k, v]) => (clinic as Record<string, unknown>)[k] === v) ? { ...clinic } : null, error: null }),
        then(resolve: (v: unknown) => void) {
          if (table === "dentvid_items") return resolve({ count: itemsThisWeek, error: null });
          if (patch) Object.assign(clinic, patch);
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, clinic, events };
}

const activeEvt = (sub = "sub_2", type = "subscription.active") => ({
  type,
  data: {
    subscription_id: sub,
    product_id: PRACTICE,
    status: "active",
    next_billing_date: "2026-12-16T00:00:00Z",
    metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice" },
  },
});

const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});
const base = { sendWelcome: async () => "sent", ownerInternal: async () => false, adConversion: async () => "ok", clinicRef: async (_db: SupabaseClient, id: string) => ({ id }) };

/* ---------------------------------------------------------------- F1 */

describe("F1 re-subscribe: a kept finished job must not swallow the week", () => {
  const now = new Date("2026-11-16T10:00:00Z"); // Monday → week 2026-11-16

  function queueWith(state: string | null) {
    const job: KeptJob & { removed: boolean; priority?: number } = {
      removed: false,
      getState: async () => state ?? "unknown",
      remove: async () => {
        job.removed = true;
      },
      changePriority: async (o) => {
        job.priority = o.priority;
      },
    };
    const add = vi.fn(async () => ({}));
    return { job, add, queue: { add, getJob: async () => (state ? job : null) } };
  }

  // Before: the Saturday batch job ran while the clinic was on hold (worker: "skipped — no active
  // plan", job completed with nothing). Monday the card is fixed → webhook → queue.add with the
  // same id → BullMQ ignores it (completed jobs are kept 7 days) → no week until next Saturday.
  it("a completed job with nothing delivered is removed and the week queued again", async () => {
    const { db } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: null }, 0);
    const q = queueWith("completed");
    expect(await enqueueFirstWeek(db, q.queue, CLINIC, now)).toBe("queued");
    expect(q.job.removed).toBe(true);
    expect(q.add).toHaveBeenCalledWith("week", { clinicId: CLINIC, count: 5, week: "2026-11-16" }, expect.objectContaining({ jobId: `week:${CLINIC}:2026-11-16`, priority: 1 }));
  });

  it("a failed job is removed and queued again", async () => {
    const { db } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: null }, 0);
    const q = queueWith("failed");
    expect(await enqueueFirstWeek(db, q.queue, CLINIC, now)).toBe("queued");
    expect(q.job.removed).toBe(true);
    expect(q.add).toHaveBeenCalledTimes(1);
  });

  it("a job still waiting in the batch is moved to the front, not duplicated", async () => {
    const { db } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: null }, 0);
    const q = queueWith("prioritized");
    expect(await enqueueFirstWeek(db, q.queue, CLINIC, now)).toBe("queued");
    expect(q.job.removed).toBe(false);
    expect(q.job.priority).toBe(1);
    expect(q.add).not.toHaveBeenCalled();
  });

  it("an active job is left alone (add is a no-op under the same id)", async () => {
    const { db } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: null }, 0);
    const q = queueWith("active");
    expect(await enqueueFirstWeek(db, q.queue, CLINIC, now)).toBe("queued");
    expect(q.job.removed).toBe(false);
  });

  it("a week already delivered is never touched", async () => {
    const { db } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: null }, 5);
    const q = queueWith("completed");
    expect(await enqueueFirstWeek(db, q.queue, CLINIC, now)).toBe("made");
    expect(q.job.removed).toBe(false);
    expect(q.add).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------- F2 */

describe("F2 Redis down at payment: the webhook answers, the owner hears", () => {
  // Before: the web app's queue connection buffers commands while Redis is down
  // (enableOfflineQueue, maxRetriesPerRequest null) → queue.add never settles →
  // the webhook never answered, no welcome email, no "could not queue" alert.
  it("a hanging enqueue is cut off; first week 'failed', alert raised, welcome still sent", async () => {
    const err = quiet();
    const { db, clinic } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null });
    const alert = vi.fn(async (_a: unknown) => "sent");
    const sendWelcome = vi.fn(async () => "sent");
    const markPaid = vi.fn(async () => {});
    const started = Date.now();
    const r = await handleDentvideoEvent(db, activeEvt("sub_1"), {
      ...base,
      sendWelcome,
      alert,
      markPaid,
      enqueueWeek: () => new Promise(() => {}), // never settles
      enqueueTimeoutMs: 30,
    });
    err.mockRestore();
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ plan: "active", firstWeek: "failed", welcomeEmail: "sent" });
    expect(clinic.plan).toBe("active");
    expect(alert.mock.calls.map((c) => (c[0] as { key: string }).key)).toContain(`enqueue_failed:payment:${CLINIC}`);
    // The watchdog was told before the enqueue was tried.
    expect(markPaid).toHaveBeenCalledWith(CLINIC, expect.any(Date), false);
    expect(sendWelcome).toHaveBeenCalledTimes(1);
  });

  it("withTimeout passes a fast result through and clears its timer", async () => {
    expect(await withTimeout(Promise.resolve("ok"), 10_000, "x")).toBe("ok");
    await expect(withTimeout(new Promise(() => {}), 5, "queueing")).rejects.toThrow(/queueing timed out/);
  });
});

/* ---------------------------------------------------------------- F3 */

describe("F3 re-activation is watched like a first payment", () => {
  // Before: markPaid (the worker's first-week watchdog marker) only for a clinic's first ever payment,
  // and the payment_succeeded event said only `first`. A clinic back from on hold / cancelled whose
  // week could not be queued was never re-queued by the watchdog.
  it("a returning clinic is marked for the watchdog and its event says activated", async () => {
    const { db, events } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "paused", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: null });
    const markPaid = vi.fn(async () => {});
    const r = await handleDentvideoEvent(db, activeEvt("sub_1", "subscription.renewed"), { ...base, alert: async () => "sent", markPaid, enqueueWeek: async () => "queued" as const });
    expect(r.body).toMatchObject({ plan: "active", firstWeek: "queued" });
    expect(markPaid).toHaveBeenCalledWith(CLINIC, expect.any(Date), true);
    await new Promise((res) => setTimeout(res, 0)); // recordEvent is fire-and-forget
    const paid = events.find((e) => e.name === "payment_succeeded");
    expect(paid?.props).toMatchObject({ first: false, activated: true });
  });

  it("an ordinary renewal of an active clinic is not an activation", async () => {
    const { db, events } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: "2026-11-16T00:00:00Z" });
    const markPaid = vi.fn(async () => {});
    const enqueueWeek = vi.fn(async () => "queued" as const);
    await handleDentvideoEvent(db, activeEvt("sub_1", "subscription.renewed"), { ...base, alert: async () => "sent", markPaid, enqueueWeek });
    await new Promise((res) => setTimeout(res, 0));
    expect(markPaid).not.toHaveBeenCalled();
    expect(enqueueWeek).not.toHaveBeenCalled();
    expect(events.find((e) => e.name === "payment_succeeded")?.props).toMatchObject({ activated: false });
  });
});

/* ---------------------------------------------------------------- DB down */

describe("webhook while the database is down", () => {
  it("answers 500 (Dodo retries for days) and changes nothing; the retry once Liman is back activates and queues the week", async () => {
    const clinic: Clinic = { id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null };
    let down = true;
    const db = {
      from(table: string) {
        const filters: [string, unknown][] = [];
        let patch: Record<string, unknown> | null = null;
        const q = {
          select: () => q,
          update: (p: Record<string, unknown>) => ((patch = p), q),
          insert: () => q,
          eq: (k: string, v: unknown) => (filters.push([k, v]), q),
          neq: () => q,
          maybeSingle: async () =>
            down ? { data: null, error: { message: "connect ECONNREFUSED liman:5432" } } : { data: filters.every(([k, v]) => (clinic as Record<string, unknown>)[k] === v) ? { ...clinic } : null, error: null },
          then(resolve: (v: unknown) => void) {
            if (table === "dentvid_items") return resolve({ count: 0, error: null });
            if (patch && !down) Object.assign(clinic, patch);
            return resolve({ error: down ? { message: "down" } : null });
          },
        };
        return q;
      },
    } as unknown as SupabaseClient;
    const enqueueWeek = vi.fn(async () => "queued" as const);
    const deps = { ...base, alert: async () => "sent", markPaid: async () => {}, enqueueWeek };
    const first = await handleDentvideoEvent(db, activeEvt("sub_1"), deps);
    expect(first.status).toBe(500);
    expect(clinic.plan).toBe("trial");
    expect(enqueueWeek).not.toHaveBeenCalled();
    down = false;
    const retry = await handleDentvideoEvent(db, activeEvt("sub_1"), deps);
    expect(retry).toMatchObject({ status: 200, body: { plan: "active", firstWeek: "queued" } });
  });
});

/* ---------------------------------------------------------------- F9 cancelled, paid until */

describe("F9 a cancelled clinic keeps its weeks until the end of the period it paid for", () => {
  const NOW = new Date("2026-11-20T00:00:00Z");
  const END = "2026-12-10T00:00:00.000Z";
  const payingClinic = (): Clinic => ({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: END });
  const memorySubs = (rows: DvSubRecord[] = []) => {
    const map = new Map(rows.map((r) => [r.dodo_subscription_id, { ...r }]));
    const store: SubscriptionStore & { rows: typeof map } = {
      rows: map,
      get: async (id) => map.get(id) ?? null,
      forClinic: async (c) => [...map.values()].filter((r) => r.clinic_id === c),
      put: async (r) => (map.set(r.dodo_subscription_id, { ...map.get(r.dodo_subscription_id), ...r, updated_at: NOW.toISOString() }), true),
      recordPayment: async () => {},
      paymentClinic: async () => null,
    };
    return store;
  };
  const ledger = () => memorySubs([{ dodo_subscription_id: "sub_1", clinic_id: CLINIC, status: "active", tier: "practice", period_end: END, last_event_at: "2026-11-10T00:00:00.000Z" }]);
  const cancel = (type = "subscription.cancelled", nbd: string | null = END, sub = "sub_1") => ({
    type,
    timestamp: "2026-11-20T00:00:00Z",
    data: { ...activeEvt(sub).data, status: type.split(".")[1], next_billing_date: nbd },
  });
  const deps = (subs: SubscriptionStore, extra: Record<string, unknown> = {}) => {
    const raised: { key: string; text?: string }[] = [];
    return { raised, d: { ...base, subs, now: () => NOW, alert: async (a: unknown) => (raised.push(a as { key: string }), "sent"), dodoStatus: async () => null, paidThrough: async () => null, ...extra } };
  };

  it("cancel with a future paid-through date: stays active until then, end stored, owner told", async () => {
    const { db, clinic } = fakeDb(payingClinic());
    const subs = ledger();
    const { d, raised } = deps(subs);
    const r = await handleDentvideoEvent(db, cancel(), d);
    expect(r.body).toMatchObject({ plan: "active", endsAt: END });
    expect(clinic.plan).toBe("active");
    expect(clinic.plan_renews_at).toBe(END);
    expect(subs.rows.get("sub_1")).toMatchObject({ status: "cancelled", period_end: END });
    expect(planEndsAt(clinic, await subs.forClinic(CLINIC), NOW)).toBe(END);
    // A second checkout is refused with "paid until" (no double charge); not "you already have a plan".
    expect(checkoutBlock({ clinic, subs: await subs.forClinic(CLINIC), now: NOW })).toEqual({ code: "cancelled_pending", until: END });
    expect(raised.map((a) => a.key)).toEqual([`at_risk:${CLINIC}:subscription.cancelled`]);
  });

  it("expired with a future date is treated the same", async () => {
    const { db, clinic } = fakeDb(payingClinic());
    const { d } = deps(ledger());
    await handleDentvideoEvent(db, cancel("subscription.expired"), d);
    expect(clinic.plan).toBe("active");
  });

  it("no date in the event: Dodo's own subscription is read for it", async () => {
    const { db, clinic } = fakeDb(payingClinic());
    const paidThrough = vi.fn(async () => END);
    const { d } = deps(ledger(), { paidThrough });
    const r = await handleDentvideoEvent(db, cancel("subscription.cancelled", null), d);
    expect(paidThrough).toHaveBeenCalledWith("sub_1");
    expect(r.body).toMatchObject({ endsAt: END });
    expect(clinic.plan).toBe("active");
  });

  it("cancel with a past or missing date: cancelled at once, as before", async () => {
    for (const nbd of ["2026-11-19T00:00:00Z", null]) {
      const { db, clinic } = fakeDb(payingClinic());
      const { d } = deps(ledger());
      const r = await handleDentvideoEvent(db, cancel("subscription.cancelled", nbd), d);
      expect(r.body).toMatchObject({ plan: "cancelled" });
      expect(clinic.plan).toBe("cancelled");
    }
  });

  it("without the ledger (0007 missing) nothing could remember the end: cancelled at once, as before", async () => {
    const { db, clinic } = fakeDb(payingClinic());
    const noLedger: SubscriptionStore = { get: async () => undefined, forClinic: async () => null, put: async () => false, recordPayment: async () => {}, paymentClinic: async () => null };
    const { d } = deps(noLedger);
    await handleDentvideoEvent(db, cancel(), d);
    expect(clinic.plan).toBe("cancelled");
  });

  it("the same cancel event twice (or cancelled then expired): no change, one owner alert", async () => {
    const { db, clinic } = fakeDb(payingClinic());
    const subs = ledger();
    const { d, raised } = deps(subs);
    await handleDentvideoEvent(db, cancel(), d);
    const again = await handleDentvideoEvent(db, cancel(), d);
    expect(again.body).toMatchObject({ plan: "active", endsAt: END, unchanged: true });
    await handleDentvideoEvent(db, { ...cancel("subscription.expired"), timestamp: "2026-11-21T00:00:00Z" }, d);
    expect(clinic.plan).toBe("active");
    expect(raised).toHaveLength(1);
  });

  it("re-subscribing before the end clears the pending end (the new subscription is the current one)", async () => {
    const { db, clinic } = fakeDb(payingClinic());
    const subs = ledger();
    const { d } = deps(subs);
    await handleDentvideoEvent(db, cancel(), d);
    const r = await handleDentvideoEvent(db, { ...activeEvt("sub_2"), timestamp: "2026-11-25T00:00:00Z", data: { ...activeEvt("sub_2").data, next_billing_date: "2026-12-25T00:00:00Z" } }, d);
    expect(r.body).toMatchObject({ plan: "active" });
    expect(clinic.dodo_subscription_id).toBe("sub_2");
    expect(clinic.plan_renews_at).toBe("2026-12-25T00:00:00Z");
    expect(planEndsAt(clinic, await subs.forClinic(CLINIC), NOW)).toBeNull();
    expect(checkoutBlock({ clinic, subs: await subs.forClinic(CLINIC), now: NOW })).toEqual({ code: "active" });
  });

  it("the old subscription restarted at Dodo (renewed again) also clears it", async () => {
    const { db, clinic } = fakeDb(payingClinic());
    const subs = ledger();
    const { d } = deps(subs, { dodoStatus: async () => "active" });
    await handleDentvideoEvent(db, cancel(), d);
    await handleDentvideoEvent(db, { ...activeEvt("sub_1", "subscription.renewed"), timestamp: "2026-11-22T00:00:00Z" }, d);
    expect(subs.rows.get("sub_1")?.status).toBe("active");
    expect(planEndsAt(clinic, await subs.forClinic(CLINIC), NOW)).toBeNull();
  });

  it("planEndsAt: only the current subscription, only ending statuses, only a future date", () => {
    const row = (status: string, period_end: string | null, id = "sub_1") => ({ dodo_subscription_id: id, clinic_id: CLINIC, status, period_end });
    const c = { plan: "active", dodo_subscription_id: "sub_1" };
    expect(planEndsAt(c, [row("cancelled", END)], NOW)).toBe(END);
    expect(planEndsAt(c, [row("active", END)], NOW)).toBeNull();
    expect(planEndsAt(c, [row("cancelled", "2026-11-01T00:00:00Z")], NOW)).toBeNull();
    expect(planEndsAt(c, [row("cancelled", END, "sub_0")], NOW)).toBeNull();
    expect(planEndsAt({ ...c, plan: "cancelled" }, [row("cancelled", END)], NOW)).toBeNull();
    expect(planEndsAt(c, null, NOW)).toBeNull();
  });
});
