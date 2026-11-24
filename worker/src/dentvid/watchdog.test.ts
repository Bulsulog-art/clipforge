import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkFirstWeeks, checkMondayDispatch, firstLateNoticeKey, lateNoticeKey, PAID_LIST_KEY, type ClinicNotifier, type WatchDb, type WatchQueue } from "./watchdog.js";
import { dispatchKey } from "./schedule.js";
import { MemoryOpsStore, type OwnerAlert } from "./ops-alert.js";
import { batchWeekJobOpts, DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS } from "./job-options.js";
import { thresholds } from "./ops-alert.js";
import { WEEK_MINUTES_DEFAULT } from "./schedule.js";
import { FIRST_WEEK_SCHEDULE, WATCHDOG_SCHEDULE } from "./watchdog.js";

/** A fake clock: every check is given "now". */
const at = (iso: string) => new Date(iso);
// 90 minutes after the Saturday 18:00 UTC dispatch, which queued the coming Monday's week.
const SAT_1930 = at("2026-11-14T19:30:00Z");

type Job = { state: string; retry: ReturnType<typeof vi.fn>; opts: { priority?: number }; changePriority: ReturnType<typeof vi.fn> };
const job = (state: string, priority?: number): Job => ({ state, retry: vi.fn(async () => {}), opts: { priority }, changePriority: vi.fn(async () => {}) });
function fakeQueue(jobs: Record<string, string | Job> = {}) {
  const map = new Map<string, Job>(Object.entries(jobs).map(([id, j]) => [id, typeof j === "string" ? job(j) : j]));
  const added: { name: string; data: unknown; opts: Record<string, unknown> }[] = [];
  const q: WatchQueue = {
    getJob: async (id) => {
      const j = map.get(id);
      return j ? { getState: async () => j.state, retry: j.retry, opts: j.opts, changePriority: j.changePriority } : null;
    },
    add: async (name, data, opts) => {
      // BullMQ: an existing job id is a no-op.
      if (!map.has(opts.jobId as string)) {
        map.set(opts.jobId as string, job("waiting", opts.priority as number | undefined));
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
/** The clinic's "running late" email, faked: never the real web app from a test. */
let told: [clinicId: string, week: string, kind: string][];
const notifyClinic: ClinicNotifier = async (clinicId, week, kind) => (told.push([clinicId, week, kind]), { sent: true, retry: false, reason: "sent" });

beforeEach(() => {
  store = new MemoryOpsStore();
  raised = [];
  told = [];
});

describe("Saturday 19:30 dispatch watchdog", () => {
  it("runs 90 minutes after the Saturday 18:00 UTC dispatch", () => {
    expect(WATCHDOG_SCHEDULE).toEqual({ pattern: "30 19 * * 6", tz: "UTC" });
  });

  it("dispatch ran and every paying clinic has its job → quiet", async () => {
    await store.set(dispatchKey("2026-11-16"), JSON.stringify({ at: "2026-11-16T05:00:00Z", jobs: 2 }), 1);
    const { q, added } = fakeQueue({ "week:a:2026-11-16": "completed", "week:b:2026-11-16": "active" });
    const r = await checkMondayDispatch({ db: fakeDb({ activeClinicIds: async () => ["a", "b"] }), queue: q, store, alert, now: SAT_1930 });
    expect(r).toMatchObject({ active: 2, jobs: 2, missing: [], alerted: false });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
  });

  it("dispatch never ran → every week queued now (same ids) and the owner told", async () => {
    const { q, added } = fakeQueue();
    const r = await checkMondayDispatch({ db: fakeDb({ activeClinicIds: async () => ["a", "b", "c"] }), queue: q, store, alert, now: SAT_1930 });
    expect(r.requeued).toBe(3);
    expect(added.map((a) => a.opts)).toEqual(["a", "b", "c"].map((id) => ({ jobId: `week:${id}:2026-11-16`, ...batchWeekJobOpts(0) })));
    // Stamped with the coming Monday, as the dispatch would have.
    expect(added[0].data).toEqual({ clinicId: "a", count: 5, week: "2026-11-16", batch: true });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe("dispatch:2026-11-16");
    expect(raised[0].what[0]).toMatch(/never ran/);
  });

  it("dispatch ran but produced zero jobs while clinics are active → alert", async () => {
    await store.set(dispatchKey("2026-11-16"), JSON.stringify({ jobs: 0 }), 1);
    const { q } = fakeQueue();
    await checkMondayDispatch({ db: fakeDb({ activeClinicIds: async () => ["a"] }), queue: q, store, alert, now: SAT_1930 });
    expect(raised[0].what[0]).toMatch(/zero jobs/);
  });

  it("one clinic missing a job → only it is queued; a clinic whose week is already made is left alone", async () => {
    await store.set(dispatchKey("2026-11-16"), JSON.stringify({ jobs: 1 }), 1);
    const { q, added } = fakeQueue({ "week:a:2026-11-16": "completed" });
    const r = await checkMondayDispatch({
      db: fakeDb({ activeClinicIds: async () => ["a", "b", "c"], weekMade: async () => new Set(["c"]) }),
      queue: q,
      store,
      alert,
      now: SAT_1930,
    });
    expect(r.missing).toEqual(["b"]);
    expect(added.map((a) => (a.data as { clinicId: string }).clinicId)).toEqual(["b"]);
    expect(raised).toHaveLength(1);
  });

  it("no paying clinics → nothing to check", async () => {
    const { q } = fakeQueue();
    expect(await checkMondayDispatch({ db: fakeDb(), queue: q, store, alert, now: SAT_1930 })).toMatchObject({ active: 0, alerted: false });
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
    expect(r).toEqual({ checked: 0, requeued: [], alerted: [], notified: [] });
    expect(added).toEqual([]);
  });

  it("45 minutes, job missing → re-queued under the canonical id, exactly once however often it runs", async () => {
    const { q, added } = fakeQueue();
    const deps = { db: fakeDb({ firstPayments: payments }), queue: q, store, alert, env: {} };
    expect((await checkFirstWeeks({ ...deps, now: plus(45) })).requeued).toEqual(["new"]);
    // Paid on Sunday, after the batch started: the coming Monday's week, at the front of the queue.
    expect(added).toEqual([{ name: "week", data: { clinicId: "new", count: 5, week: "2026-11-09" }, opts: { jobId: "week:new:2026-11-09", ...FIRST_WEEK_JOB_OPTS } }]);
    // Next runs (and a second worker) do nothing more.
    expect((await checkFirstWeeks({ ...deps, now: plus(60) })).requeued).toEqual([]);
    expect((await checkFirstWeeks({ ...deps, now: plus(75) })).requeued).toEqual([]);
    expect(added).toHaveLength(1);
    expect(raised).toEqual([]);
  });

  it("a failed job is retried; a completed-but-empty one gets a fresh run under its own fixed id; a running one is left alone", async () => {
    const failed = fakeQueue({ "week:new:2026-11-09": "failed" });
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: failed.q, store, alert, now: plus(50), env: {} });
    expect(failed.map.get("week:new:2026-11-09")!.retry).toHaveBeenCalledWith("failed");

    store = new MemoryOpsStore();
    const done = fakeQueue({ "week:new:2026-11-09": "completed" });
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: done.q, store, alert, now: plus(50), env: {} });
    expect(done.added.map((a) => a.opts.jobId)).toEqual(["week:new:2026-11-09:requeue"]);

    store = new MemoryOpsStore();
    const running = fakeQueue({ "week:new:2026-11-09": "active" });
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: running.q, store, alert, now: plus(50), env: {} });
    expect(r.requeued).toEqual([]);
    expect(running.added).toEqual([]);
  });

  it("a first week still waiting behind the batch (queued without the first-week priority) is moved to the front, once", async () => {
    const waiting = fakeQueue({ "week:new:2026-11-09": job("prioritized", 140) });
    const deps = { db: fakeDb({ firstPayments: payments }), queue: waiting.q, store, alert, env: {} };
    expect((await checkFirstWeeks({ ...deps, now: plus(46) })).requeued).toEqual(["new"]);
    const j = waiting.map.get("week:new:2026-11-09")!;
    expect(j.changePriority).toHaveBeenCalledWith({ priority: DENTVID_PRIORITY.firstWeek });
    expect(waiting.added).toEqual([]);
    await checkFirstWeeks({ ...deps, now: plus(61) });
    expect(j.changePriority).toHaveBeenCalledTimes(1);

    // Already at the front: nothing to do.
    store = new MemoryOpsStore();
    const front = fakeQueue({ "week:new:2026-11-09": job("prioritized", DENTVID_PRIORITY.firstWeek) });
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: front.q, store, alert, now: plus(46), env: {} });
    expect(r.requeued).toEqual([]);
    expect(front.map.get("week:new:2026-11-09")!.changePriority).not.toHaveBeenCalled();
  });

  it("2 hours and still nothing → the owner is told (with what was already done)", async () => {
    const { q } = fakeQueue();
    const deps = { db: fakeDb({ firstPayments: payments }), queue: q, store, alert, notifyClinic, env: {} };
    await checkFirstWeeks({ ...deps, now: plus(45) });
    expect(raised).toEqual([]);
    const r = await checkFirstWeeks({ ...deps, now: plus(121) });
    expect(r.alerted).toEqual(["new"]);
    expect(raised[0].key).toBe("first_week_late:new");
    expect(raised[0].done[0]).toMatch(/re-queued automatically/);
    expect(raised[0].clinic?.name).toBe("Clinic new");
  });

  it("2 hours and still nothing → the clinic gets one calm 'first-late' email, however often the watchdog runs", async () => {
    const { q } = fakeQueue();
    const deps = { db: fakeDb({ firstPayments: payments }), queue: q, store, alert, notifyClinic, env: {} };
    // Before the alert threshold: the dentist is not bothered.
    expect((await checkFirstWeeks({ ...deps, now: plus(45) })).notified).toEqual([]);
    expect((await checkFirstWeeks({ ...deps, now: plus(119) })).notified).toEqual([]);
    expect(told).toEqual([]);
    expect((await checkFirstWeeks({ ...deps, now: plus(121) })).notified).toEqual(["new"]);
    // The next runs (every 15 minutes, and a second worker) send nothing more.
    for (const m of [136, 151, 166, 600]) expect((await checkFirstWeeks({ ...deps, now: plus(m) })).notified).toEqual([]);
    expect(told).toEqual([["new", "2026-11-09", "first-late"]]);
    expect(await store.get(firstLateNoticeKey("new"))).not.toBeNull();
    // The per-week marker the delivery watchdog reads, so Monday's check does not send a second email.
    expect(await store.get(lateNoticeKey("new", "2026-11-09"))).not.toBeNull();
  });

  it("once per clinic: a clinic already told about its first week is not told again for a later payment", async () => {
    await store.setNx(firstLateNoticeKey("new"), 60);
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: fakeQueue().q, store, alert, notifyClinic, now: plus(121), env: {} });
    expect(r.alerted).toEqual(["new"]);
    expect(r.notified).toEqual([]);
    expect(told).toEqual([]);
  });

  it("the first-late email does not depend on the owner's alert going out, and a failed send is not retried every 15 minutes", async () => {
    const { q } = fakeQueue();
    const failing: ClinicNotifier = async (clinicId, week, kind) => (told.push([clinicId, week, kind]), { sent: false, retry: true, reason: "HTTP 503" });
    const quietAlert = async () => "deduped" as const;
    const deps = { db: fakeDb({ firstPayments: payments }), queue: q, store, alert: quietAlert, notifyClinic: failing, env: {} };
    const r = await checkFirstWeeks({ ...deps, now: plus(121) });
    expect(r.alerted).toEqual([]);
    expect(r.notified).toEqual([]);
    await checkFirstWeeks({ ...deps, now: plus(136) });
    expect(told).toHaveLength(1);
  });

  it("a notifier that throws does not stop the watchdog", async () => {
    const { q } = fakeQueue();
    const boom: ClinicNotifier = async () => {
      throw new Error("web app down");
    };
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: q, store, alert, notifyClinic: boom, now: plus(121), env: {} });
    expect(r.alerted).toEqual(["new"]);
    expect(r.notified).toEqual([]);
  });

  it("no 'first-late' email for a clinic coming back from a pause (it is not new), nor without a store to remember it was sent", async () => {
    const { q } = fakeQueue();
    const back = async () => [{ clinicId: "back", paidAt: PAID, returning: true }];
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: back }), queue: q, store, alert, notifyClinic, now: plus(121), env: {} });
    expect(r.alerted).toEqual(["back"]);
    expect(r.notified).toEqual([]);
    const noStore = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: fakeQueue().q, store: null, alert, notifyClinic, now: plus(121), env: {} });
    expect(noStore.notified).toEqual([]);
    expect(told).toEqual([]);
  });

  it("a store that is down sends no email (it could not promise just one) and does not break the run", async () => {
    const { q } = fakeQueue();
    const deps = { db: fakeDb({ firstPayments: payments }), queue: q, store, alert, notifyClinic, env: {} };
    store.down = true;
    const r = await checkFirstWeeks({ ...deps, now: plus(121) });
    expect(r.notified).toEqual([]);
    expect(told).toEqual([]);
  });

  it("delivered, or no longer paying → nothing", async () => {
    const { q, added } = fakeQueue();
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments, deliveredSince: async () => true }), queue: q, store, alert, notifyClinic, now: plus(130), env: {} });
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments, isActive: async () => false }), queue: q, store, alert, notifyClinic, now: plus(130), env: {} });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
    expect(told).toEqual([]);
  });

  it("a returning clinic that already has this week's videos counts as delivered: no second week, no alert", async () => {
    const { q, added } = fakeQueue({ "week:new:2026-11-09": "completed" });
    const weekMade = vi.fn(async (ids: string[], week: string) => new Set(week === "2026-11-09" ? ids : []));
    const r = await checkFirstWeeks({ db: fakeDb({ firstPayments: payments, weekMade }), queue: q, store, alert, now: plus(130), env: {} });
    expect(r.requeued).toEqual([]);
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
    expect(weekMade).toHaveBeenCalledWith(["new"], "2026-11-09");
  });

  it("also finds payments from the web app's Redis markers when the events table missed one", async () => {
    await store.push(PAID_LIST_KEY, JSON.stringify({ clinicId: "redis-only", paidAt: PAID }), 1, 100);
    const { q, added } = fakeQueue();
    await checkFirstWeeks({ db: fakeDb(), queue: q, store, alert, now: plus(46), env: {} });
    expect(added.map((a) => a.opts.jobId)).toEqual(["week:redis-only:2026-11-09"]);
  });

  it("thresholds follow the env", async () => {
    const { q, added } = fakeQueue();
    await checkFirstWeeks({ db: fakeDb({ firstPayments: payments }), queue: q, store, alert, now: plus(20), env: { DENTVID_FIRST_WEEK_REQUEUE_MIN: "15" } });
    expect(added).toHaveLength(1);
  });
});

describe("watchdog thresholds leave room for the queue", () => {
  it("a first week that waits behind one batch week already rendering is re-queued and alerted only after it should have arrived", () => {
    const t = thresholds({});
    // Worst case with one render at a time: the batch week already rendering, then this one.
    const worstCase = 2 * WEEK_MINUTES_DEFAULT;
    expect(t.firstWeekRequeueMin).toBeGreaterThan(worstCase);
    expect(t.firstWeekAlertMin).toBeGreaterThanOrEqual(t.firstWeekRequeueMin + worstCase);
  });
  it("checks every 15 minutes", () => {
    expect(FIRST_WEEK_SCHEDULE.pattern).toBe("*/15 * * * *");
  });
});

describe("supabaseWatchDb — who should have a week", () => {
  const rows = [
    { id: "a", plan: "active", admin_paused_at: null },
    { id: "p", plan: "active", admin_paused_at: "2026-11-10T10:00:00Z" },
    { id: "b", plan: "active" },
    { id: "demo", plan: "active", admin_paused_at: null, review_demo: true },
  ];
  const db = {
    from: () => ({
      select: () => ({
        eq: (_col: string, v: string) => ({
          order: () => ({ range: async () => ({ data: rows.filter((r) => r.plan === v), error: null }) }),
          maybeSingle: async () => ({ data: rows.find((r) => r.id === v) ?? null, error: null }),
        }),
      }),
    }),
  };

  it("a clinic the owner paused is not 'missing' on Saturday (no false dispatch alert) and not active for the first-week watchdog", async () => {
    const { supabaseWatchDb } = await import("./watchdog.js");
    const w = supabaseWatchDb(db as never);
    // The App Review demo clinic gets no batch, so it is not "missing" either.
    expect(await w.activeClinicIds()).toEqual(["a", "b"]);
    expect(await w.isActive("p")).toBe(false);
    expect(await w.isActive("a")).toBe(true);
    expect(await w.isActive("nope")).toBe(false);
  });

  it("with only paused clinics the Saturday check raises nothing", async () => {
    const { supabaseWatchDb } = await import("./watchdog.js");
    const paused = supabaseWatchDb({ from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: async () => ({ data: [rows[1]], error: null }) }) }) }) }) } as never);
    const alert = vi.fn(async () => "sent" as const);
    const queue = { getJob: vi.fn(async () => null), add: vi.fn(async () => ({})) };
    const res = await checkMondayDispatch({ db: { ...paused, weekMade: async () => new Set<string>() } as never, queue, store: new MemoryOpsStore(), alert, now: at("2026-11-14T19:30:00Z") });
    expect(res.active).toBe(0);
    expect(alert).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
