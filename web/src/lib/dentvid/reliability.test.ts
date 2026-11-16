import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent, withTimeout } from "./billing-webhook";
import { enqueueFirstWeek, type KeptJob } from "./week-job";

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

/* ---------------------------------------------------------------- F9 (owner decision) */

describe("F9 cancellation: what happens today (owner decision, docs/RELIABILITY.md)", () => {
  // The app tells a cancelled clinic "it is paid until {date}" and docs/SUPPORT.md promises access
  // "until the end of the period you've paid for". Today a subscription.cancelled event switches the
  // clinic off at once, whatever its next_billing_date says. This is right if Dodo only sends
  // `cancelled` at the period end (cancel_at_next_billing_date), wrong if it is an immediate cancel.
  it("a cancelled event with a future paid-until date stops the clinic now", async () => {
    const { db, clinic } = fakeDb({ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-10T00:00:00Z" });
    const r = await handleDentvideoEvent(
      db,
      { type: "subscription.cancelled", data: { ...activeEvt("sub_1").data, status: "cancelled", next_billing_date: "2026-12-10T00:00:00Z" } },
      { ...base, alert: async () => "sent", now: () => new Date("2026-11-20T00:00:00Z") },
    );
    expect(r.body).toMatchObject({ plan: "cancelled" });
    expect(clinic.plan).toBe("cancelled");
  });
});
