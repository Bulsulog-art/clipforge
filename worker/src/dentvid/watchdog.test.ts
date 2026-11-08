import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkFirstWeeks, checkMondayDispatch, PAID_LIST_KEY, type WatchDb, type WatchQueue } from "./watchdog.js";
import { dispatchKey } from "./schedule.js";
import { MemoryOpsStore, type OwnerAlert } from "./ops-alert.js";
import { WEEK_JOB_OPTS } from "./retry.js";

/** A fake clock: every check is given "now". */
const at = (iso: string) => new Date(iso);
const MONDAY_7 = at("2026-11-09T07:00:00Z");

type Job = { state: string; retry: ReturnType<typeof vi.fn> };
function fakeQueue(jobs: Record<string, string> = {}) {
  const map = new Map<string, Job>(Object.entries(jobs).map(([id, state]) => [id, { state, retry: vi.fn(async () => {}) }]));
  const added: { name: string; data: unknown; opts: Record<string, unknown> }[] = [];
  const q: WatchQueue = {
    getJob: async (id) => {
      const j = map.get(id);
      return j ? { getState: async () => j.state, retry: j.retry } : null;
    },
    add: async (name, data, opts) => {
      // BullMQ: an existing job id is a no-op.
      if (!map.has(opts.jobId as string)) {
        map.set(opts.jobId as string, { state: "waiting", retry: vi.fn(async () => {}) });
        added.push({ name, data, opts });
      }
      return {};
    },
  };
  return { q, map, added };
}

function fakeDb(over: Partial<WatchDb> = {}): WatchDb {
  return {
    activeClinicIds: async () => [],
    firstPayments: async () => [],
    deliveredSince: async () => false,
    weekMade: async () => new Set(),
    isActive: async () => true,
    clinic: async (id) => ({ id, name: `Clinic ${id}`, tier: "practice", country: "TR" }),
    ...over,
  };
}

let store: MemoryOpsStore;
let raised: OwnerAlert[];
const alert = async (a: OwnerAlert) => (raised.push(a), "sent" as const);

beforeEach(() => {
  store = new MemoryOpsStore();
  raised = [];
});

describe("Monday 07:00 watchdog", () => {
  it("dispatch ran and every paying clinic has its job → quiet", async () => {
    await store.set(dispatchKey("2026-11-09"), JSON.stringify({ at: "2026-11-09T05:00:00Z", jobs: 2 }), 1);
    const { q, added } = fakeQueue({ "week:a:2026-11-09": "completed", "week:b:2026-11-09": "active" });
    const r = await checkMondayDispatch({ db: fakeDb({ activeClinicIds: async () => ["a", "b"] }), queue: q, store, alert, now: MONDAY_7 });
    expect(r).toMatchObject({ active: 2, jobs: 2, missing: [], alerted: false });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
  });

  it("dispatch never ran → every week queued now (same ids) and the owner told", async () => {
    const { q, added } = fakeQueue();
    const r = await checkMondayDispatch({ db: fakeDb({ activeClinicIds: async () => ["a", "b", "c"] }), queue: q, store, alert, now: MONDAY_7 });
    expect(r.requeued).toBe(3);
    expect(added.map((a) => a.opts)).toEqual(["a", "b", "c"].map((id) => ({ jobId: `week:${id}:2026-11-09`, ...WEEK_JOB_OPTS })));
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe("dispatch:2026-11-09");
    expect(raised[0].what[0]).toMatch(/never ran/);
  });

  it("dispatch ran but produced zero jobs while clinics are active → alert", async () => {
    await store.set(dispatchKey("2026-11-09"), JSON.stringify({ jobs: 0 }), 1);
    const { q } = fakeQueue();
    await checkMondayDispatch({ db: fakeDb({ activeClinicIds: async () => ["a"] }), queue: q, store, alert, now: MONDAY_7 });
    expect(raised[0].what[0]).toMatch(/zero jobs/);
  });

  it("one clinic missing a job → only it is queued; a clinic whose week is already made is left alone", async () => {
    await store.set(dispatchKey("2026-11-09"), JSON.stringify({ jobs: 1 }), 1);
    const { q, added } = fakeQueue({ "week:a:2026-11-09": "completed" });
    const r = await checkMondayDispatch({
      db: fakeDb({ activeClinicIds: async () => ["a", "b", "c"], weekMade: async () => new Set(["c"]) }),
      queue: q,
      store,
      alert,
      now: MONDAY_7,
    });
    expect(r.missing).toEqual(["b"]);
    expect(added.map((a) => (a.data as { clinicId: string }).clinicId)).toEqual(["b"]);
    expect(raised).toHaveLength(1);
  });

  it("no paying clinics → nothing to check", async () => {
    const { q } = fakeQueue();
    expect(await checkMondayDispatch({ db: fakeDb(), queue: q, store, alert, now: MONDAY_7 })).toMatchObject({ active: 0, alerted: false });
    expect(raised).toEqual([]);
  });
});

describe("first-week watchdog (every 15 min)", () => {
  const PAID = "2026-11-08T10:00:00.000Z"; // a Sunday
  const plus = (min: number) => new Date(Date.parse(PAID) + min * 60_000);
  const payments = async () => [{ clinicId: "new", paidAt: PAID }];

  it("before 45 minutes: patience", async () => {
    const { q, added } = fakeQueue();
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: q, store, alert, now: plus(44), env: {} });
    expect(r).toEqual({ checked: 0, requeued: [], alerted: [] });
    expect(added).toEqual([]);
  });

  it("45 minutes, job missing → re-queued under the canonical id, exactly once however often it runs", async () => {
    const { q, added } = fakeQueue();
    const deps = { db: fakeDb({ firstPayments: payments }), queue: q, store, alert, env: {} };
    expect((await checkFirstWeeks({ ...deps, now: plus(45) })).requeued).toEqual(["new"]);
    expect(added).toEqual([{ name: "week", data: { clinicId: "new", count: 5 }, opts: { jobId: "week:new:2026-11-02", ...WEEK_JOB_OPTS } }]);
    // Next runs (and a second worker) do nothing more.
    expect((await checkFirstWeeks({ ...deps, now: plus(60) })).requeued).toEqual([]);
    expect((await checkFirstWeeks({ ...deps, now: plus(75) })).requeued).toEqual([]);
    expect(added).toHaveLength(1);
    expect(raised).toEqual([]);
  });

  it("a failed job is retried; a completed-but-empty one gets a fresh run under its own fixed id; a running one is left alone", async () => {
    const failed = fakeQueue({ "week:new:2026-11-02": "failed" });
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: failed.q, store, alert, now: plus(50), env: {} });
    expect(failed.map.get("week:new:2026-11-02")!.retry).toHaveBeenCalledWith("failed");

    store = new MemoryOpsStore();
    const done = fakeQueue({ "week:new:2026-11-02": "completed" });
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: done.q, store, alert, now: plus(50), env: {} });
    expect(done.added.map((a) => a.opts.jobId)).toEqual(["week:new:2026-11-02:requeue"]);

    store = new MemoryOpsStore();
    const running = fakeQueue({ "week:new:2026-11-02": "active" });
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: running.q, store, alert, now: plus(50), env: {} });
    expect(r.requeued).toEqual([]);
    expect(running.added).toEqual([]);
  });

  it("2 hours and still nothing → the owner is told (with what was already done)", async () => {
    const { q } = fakeQueue();
    const deps = { db: fakeDb({ firstPayments: payments }), queue: q, store, alert, env: {} };
    await checkFirstWeeks({ ...deps, now: plus(45) });
    expect(raised).toEqual([]);
    const r = await checkFirstWeeks({ ...deps, now: plus(121) });
    expect(r.alerted).toEqual(["new"]);
    expect(raised[0].key).toBe("first_week_late:new");
    expect(raised[0].done[0]).toMatch(/re-queued automatically/);
    expect(raised[0].clinic?.name).toBe("Clinic new");
  });

  it("delivered, or no longer paying → nothing", async () => {
    const { q, added } = fakeQueue();
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments, deliveredSince: async () => true }), queue: q, store, alert, now: plus(130), env: {} });
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments, isActive: async () => false }), queue: q, store, alert, now: plus(130), env: {} });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
  });

  it("also finds payments from the web app's Redis markers when the events table missed one", async () => {
    await store.push(PAID_LIST_KEY, JSON.stringify({ clinicId: "redis-only", paidAt: PAID }), 1, 100);
    const { q, added } = fakeQueue();
    await checkFirstWeeks({ db: fakeDb(), queue: q, store, alert, now: plus(46), env: {} });
    expect(added.map((a) => a.opts.jobId)).toEqual(["week:redis-only:2026-11-02"]);
  });

  it("thresholds follow the env", async () => {
    const { q, added } = fakeQueue();
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: q, store, alert, now: plus(20), env: { DENTVID_FIRST_WEEK_REQUEUE_MIN: "15" } });
    expect(added).toHaveLength(1);
  });
});
