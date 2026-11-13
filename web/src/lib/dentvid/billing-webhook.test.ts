import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent } from "./billing-webhook";
import { enqueueFirstWeek, weekJobId, WEEK_JOB_OPTS } from "./week-job";

const CLINIC = "11111111-2222-3333-4444-555555555555";
const OWNER = "owner-1";

type Clinic = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

/**
 * A tiny in-memory stand-in for the PostgREST builder: enough for
 * dentvid_clinics lookups/updates and the dentvid_items head count.
 */
function fakeDb(clinic: Clinic, itemsThisWeek = 0) {
  const updates: Record<string, unknown>[] = [];
  const itemFilters: [string, string, unknown][] = [];
  const db = {
    from(table: string) {
      const filters: [string, string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        update: (p: Record<string, unknown>) => ((patch = p), q),
        eq: (k: string, v: unknown) => (filters.push(["eq", k, v]), q),
        neq: (k: string, v: unknown) => (filters.push(["neq", k, v]), q),
        maybeSingle: async () => {
          const match = filters.every(([, k, v]) => (clinic as Record<string, unknown>)[k] === v);
          return { data: match ? { ...clinic } : null, error: null };
        },
        then(resolve: (v: unknown) => void) {
          if (table === "dentvid_items") {
            itemFilters.push(...filters);
            return resolve({ count: itemsThisWeek, error: null });
          }
          if (patch) {
            updates.push(patch);
            Object.assign(clinic, patch);
          }
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, updates, itemFilters, clinic };
}

const unpaid = (): Clinic => ({ id: CLINIC, owner_id: OWNER, plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null });

const active = (sub = "sub_1") => ({
  type: "subscription.active",
  data: {
    subscription_id: sub,
    product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN",
    status: "active",
    next_billing_date: "2026-12-08T00:00:00Z",
    metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice" },
  },
});

describe("payment webhook → first week", () => {
  it("activates an unpaid clinic and queues its first week straight away", async () => {
    const { db, clinic } = fakeDb(unpaid());
    const enqueueWeek = vi.fn(async () => "queued" as const);
    const r = await handleDentvideoEvent(db, active(), { enqueueWeek });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ plan: "active", firstWeek: "queued" });
    expect(clinic.plan).toBe("active");
    expect(clinic.plan_tier).toBe("practice");
    expect(enqueueWeek).toHaveBeenCalledTimes(1);
    expect(enqueueWeek).toHaveBeenCalledWith(db, CLINIC);
  });

  it("queues again when a paused or cancelled clinic pays again", async () => {
    for (const plan of ["paused", "cancelled"]) {
      const { db } = fakeDb({ ...unpaid(), plan, dodo_subscription_id: "sub_old" });
      const enqueueWeek = vi.fn(async () => "queued" as const);
      await handleDentvideoEvent(db, active("sub_new"), { enqueueWeek });
      expect(enqueueWeek, plan).toHaveBeenCalledTimes(1);
    }
  });

  it("does not queue on renewals, repeats or deactivations", async () => {
    const paying = { ...unpaid(), plan: "active", plan_tier: "practice", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-08T00:00:00Z" };
    const enqueueWeek = vi.fn(async () => "queued" as const);
    // Renewal of an active clinic (Monday dispatch makes its weeks).
    await handleDentvideoEvent(fakeDb({ ...paying }).db, { ...active(), type: "subscription.renewed", data: { ...active().data, next_billing_date: "2027-01-08T00:00:00Z" } }, { enqueueWeek });
    // The same activation delivered twice.
    await handleDentvideoEvent(fakeDb({ ...paying }).db, active(), { enqueueWeek });
    // Cancelled.
    await handleDentvideoEvent(fakeDb({ ...paying }).db, { ...active(), type: "subscription.cancelled" }, { enqueueWeek });
    // A first payment that failed: stays unpaid, nothing made.
    await handleDentvideoEvent(fakeDb(unpaid()).db, { ...active(), type: "subscription.failed" }, { enqueueWeek });
    expect(enqueueWeek).not.toHaveBeenCalled();
  });

  it("still acknowledges the payment when the queue is down", async () => {
    const { db, clinic } = fakeDb(unpaid());
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await handleDentvideoEvent(db, active(), { enqueueWeek: async () => { throw new Error("redis down"); } });
    err.mockRestore();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ plan: "active", firstWeek: "failed" });
    expect(clinic.plan).toBe("active");
  });
});

describe("enqueueFirstWeek", () => {
  const now = new Date("2026-11-05T11:00:00Z"); // a Thursday → week of 2026-11-02

  it("adds the week job with the same id scheme as the web button and Monday dispatch", async () => {
    const { db, itemFilters } = fakeDb(unpaid(), 0);
    const add = vi.fn(async () => ({}));
    expect(await enqueueFirstWeek(db, { add }, CLINIC, now)).toBe("queued");
    expect(add).toHaveBeenCalledWith("week", { clinicId: CLINIC, count: 5, week: "2026-11-02" }, { jobId: `week:${CLINIC}:2026-11-02`, ...WEEK_JOB_OPTS, priority: 1 });
    expect(weekJobId(CLINIC, "2026-11-02")).toBe(`week:${CLINIC}:2026-11-02`);
    expect(itemFilters).toEqual(
      expect.arrayContaining([
        ["eq", "clinic_id", CLINIC],
        ["eq", "week_of", "2026-11-02"],
        ["neq", "status", "failed"],
      ]),
    );
  });

  it("skips a week that is already made", async () => {
    const { db } = fakeDb(unpaid(), 5);
    const add = vi.fn(async () => ({}));
    expect(await enqueueFirstWeek(db, { add }, CLINIC, now)).toBe("made");
    expect(add).not.toHaveBeenCalled();
  });
});

describe("payment webhook → silent failures reach the owner", () => {
  const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});
  const clinicRef = async (_db: SupabaseClient, id: string) => ({ id, name: "Gülüş Dental" });
  const keysOf = (alert: { mock: { calls: unknown[][] } }) => alert.mock.calls.map((c) => (c[0] as { key: string }).key);

  it("a first week that could not be queued raises an alert naming the clinic", async () => {
    const err = quiet();
    const alert = vi.fn(async (_a: unknown) => "sent");
    const r = await handleDentvideoEvent(fakeDb(unpaid()).db, active(), {
      enqueueWeek: async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:6379");
      },
      sendWelcome: async () => "sent",
      alert,
      clinicRef,
    });
    err.mockRestore();
    expect(r.body).toMatchObject({ firstWeek: "failed" });
    expect(keysOf(alert)).toContain(`enqueue_failed:payment:${CLINIC}`);
  });

  it("a welcome email that failed raises a heads-up; one already sent or to a test account does not", async () => {
    for (const [result, expected] of [
      ["failed", true],
      ["migration missing", true],
      ["already sent", false],
      ["test account", false],
      ["sent", false],
    ] as const) {
      const err = quiet();
      const alert = vi.fn(async (_a: unknown) => "sent");
      await handleDentvideoEvent(fakeDb(unpaid()).db, active(), { enqueueWeek: async () => "queued" as const, sendWelcome: async () => result, alert, clinicRef });
      err.mockRestore();
      expect(keysOf(alert).includes(`welcome_not_sent:${CLINIC}`), result).toBe(expected);
    }
  });

  it("a welcome that threw is reported too", async () => {
    const err = quiet();
    const alert = vi.fn(async (_a: unknown) => "sent");
    const r = await handleDentvideoEvent(fakeDb(unpaid()).db, active(), {
      enqueueWeek: async () => "queued" as const,
      sendWelcome: async () => {
        throw new Error("lifecycle store down");
      },
      alert,
      clinicRef,
    });
    err.mockRestore();
    expect(r.body).toMatchObject({ welcomeEmail: "failed" });
    expect(keysOf(alert)).toContain(`welcome_not_sent:${CLINIC}`);
  });
});
