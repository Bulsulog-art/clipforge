import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkWeekDelivery, supabaseDeliveryDb, type DeliveryDb, type DeliveryQueue } from "./delivery.js";
import { defaultClinicNotifier, lateNoticeKey, type ClinicNotifier } from "./watchdog.js";
import { notifyDelayChecked } from "./notify.js";
import { MemoryOpsStore } from "./ops-alert.js";

/** Which clinics the Monday delivery watchdog expects a week for (Liman adapter). */
describe("supabaseDeliveryDb.payingClinics", () => {
  const rows = [
    { id: "a", plan: "active", admin_paused_at: null, profile: { country: "DE" } },
    { id: "p", plan: "active", admin_paused_at: "2026-11-10T10:00:00Z", profile: { country: "DE" } },
    { id: "demo", plan: "active", admin_paused_at: null, review_demo: true, profile: { country: "US" } },
  ];
  const db = {
    from: () => ({
      select: () => ({
        eq: (_col: string, v: string) => ({
          order: () => ({ range: async () => ({ data: rows.filter((r) => r.plan === v), error: null }) }),
        }),
      }),
    }),
  };

  it("leaves out a clinic the owner paused and the App Review demo clinic (no false 'late' alert, no requeue)", async () => {
    const paying = await supabaseDeliveryDb(db as never).payingClinics();
    expect(paying.map((c) => c.id)).toEqual(["a"]);
  });
});

/* ------------------------------------------------------------ the clinic hears it from us */

describe("delivery watchdog: one calm 'running late' email per clinic and week", () => {
  const WEEK = "2026-11-16";
  // Istanbul: Monday 07:00 +03 = 04:00 UTC. Checked at 05:41 UTC (deadline + 1 h 41).
  const MON_0541 = new Date("2026-11-16T05:41:00Z");
  const hour = (n: number) => new Date(MON_0541.getTime() + n * 3_600_000);

  let store: MemoryOpsStore;
  let told: [clinicId: string, week: string, kind: string, queued: boolean][];
  const notifyClinic: ClinicNotifier = async (clinicId, week, kind, o) => (told.push([clinicId, week, kind, o.queued]), { sent: true, retry: false, reason: "sent" });
  const alert = vi.fn(async () => "sent" as const);

  /** BullMQ, faked: a retried job goes back to waiting; `broken` makes every re-queue throw (Redis hiccup). */
  function queue(states: Record<string, string> = {}, broken = false): DeliveryQueue {
    const map = new Map(Object.entries(states));
    return {
      getJob: async (id) =>
        map.has(id)
          ? {
              getState: async () => map.get(id)!,
              retry: async () => {
                if (broken) throw new Error("Connection is closed.");
                map.set(id, "waiting");
              },
              opts: {},
            }
          : null,
      add: async (_n, _d, opts) => {
        if (broken) throw new Error("Connection is closed.");
        if (!map.has(opts.jobId as string)) map.set(opts.jobId as string, "prioritized");
        return {};
      },
    };
  }
  function db(over: Partial<DeliveryDb> = {}): DeliveryDb {
    return {
      payingClinics: async () => [{ id: "ist", tz: "Europe/Istanbul" }],
      activations: async () => [],
      weekMade: async () => new Set(),
      lastDelivered: async () => new Map(),
      clinic: async (id) => ({ id, name: `Clinic ${id}` }),
      ...over,
    };
  }

  beforeEach(() => {
    store = new MemoryOpsStore();
    told = [];
    alert.mockClear();
  });

  it("a late week: the clinic is told exactly once across hourly runs and a second worker; the owner is still alerted each run", async () => {
    const deps = { db: db(), queue: queue(), store, alert, notifyClinic };
    const first = await checkWeekDelivery({ ...deps, now: MON_0541 });
    expect(first.late).toEqual([expect.objectContaining({ clinicId: "ist", week: WEEK, requeued: true, notified: true })]);
    const second = await checkWeekDelivery({ ...deps, now: hour(1) });
    expect(second.late).toEqual([expect.objectContaining({ clinicId: "ist", notified: false })]);
    // A second worker running the same hour, with its own queue handle: still nothing more.
    await checkWeekDelivery({ ...deps, queue: queue(), now: hour(1) });
    expect(told).toEqual([["ist", WEEK, "late", true]]);
    expect(alert).toHaveBeenCalledTimes(3);
  });

  it("per clinic and per week: two late clinics are each told once, and a later late week is told again", async () => {
    const two = db({ payingClinics: async () => ["a", "b"].map((id) => ({ id, tz: "Europe/Istanbul" })) });
    await checkWeekDelivery({ db: two, queue: queue(), store, alert, notifyClinic, now: MON_0541 });
    await checkWeekDelivery({ db: two, queue: queue(), store, alert, notifyClinic, now: hour(2) });
    expect(told.sort()).toEqual([
      ["a", WEEK, "late", true],
      ["b", WEEK, "late", true],
    ]);
    await checkWeekDelivery({ db: two, queue: queue(), store, alert, notifyClinic, now: hour(24 * 7) });
    expect(told.filter((t) => t[1] === "2026-11-23").map((t) => t[0]).sort()).toEqual(["a", "b"]);
  });

  it("a delivered week, or a week not yet past its deadline + grace, sends nothing", async () => {
    await checkWeekDelivery({ db: db({ weekMade: async () => new Set(["ist"]) }), queue: queue(), store, alert, notifyClinic, now: MON_0541 });
    await checkWeekDelivery({ db: db(), queue: queue(), store: new MemoryOpsStore(), alert, notifyClinic, now: new Date("2026-11-16T04:30:00Z") });
    expect(told).toEqual([]);
  });

  it("only the run that sets the re-queue marker emails: a week an earlier run already handled stays quiet", async () => {
    await store.setNx(`dv:ops:late-requeue:ist:${WEEK}`, 60);
    const r = await checkWeekDelivery({ db: db(), queue: queue(), store, alert, notifyClinic, now: MON_0541 });
    expect(r.late[0]).toMatchObject({ requeued: false, notified: false });
    expect(told).toEqual([]);
  });

  it("a week the first-week watchdog already reported to the clinic is not reported twice", async () => {
    await store.setNx(lateNoticeKey("ist", WEEK), 60);
    const r = await checkWeekDelivery({ db: db(), queue: queue(), store, alert, notifyClinic, now: MON_0541 });
    expect(r.late[0]).toMatchObject({ requeued: true, notified: false });
    expect(told).toEqual([]);
  });

  it("without a store (nothing to remember it by) or with the store down, no email rather than one an hour", async () => {
    await checkWeekDelivery({ db: db(), queue: queue(), store: null, alert, notifyClinic, now: MON_0541 });
    store.down = true;
    await checkWeekDelivery({ db: db(), queue: queue(), store, alert, notifyClinic, now: MON_0541 });
    expect(told).toEqual([]);
  });

  it("a failed or throwing notifier never breaks the run and is not retried every hour", async () => {
    let calls = 0;
    const boom: ClinicNotifier = async () => {
      calls++;
      throw new Error("web app down");
    };
    const r = await checkWeekDelivery({ db: db(), queue: queue(), store, alert, notifyClinic: boom, now: MON_0541 });
    expect(r.late[0]).toMatchObject({ requeued: true, notified: false });
    await checkWeekDelivery({ db: db(), queue: queue(), store, alert, notifyClinic: boom, now: hour(1) });
    expect(calls).toBe(1);
  });

  it("'queued and on its way' only when it is: a re-queue that worked, or a job still waiting or running", async () => {
    const run = async (states: Record<string, string>, broken = false) => {
      const st = new MemoryOpsStore();
      told = [];
      const r = await checkWeekDelivery({ db: db(), queue: queue(states, broken), store: st, alert, notifyClinic, now: MON_0541 });
      return { r: r.late[0], queued: told[0]?.[3] };
    };
    const id = `week:ist:${WEEK}`;
    // Re-queued by this run: missing → added, failed → retried, completed with nothing → a fresh run.
    expect(await run({})).toMatchObject({ r: { jobState: "missing", requeued: true }, queued: true });
    expect(await run({ [id]: "failed" })).toMatchObject({ r: { jobState: "failed", requeued: true }, queued: true });
    expect(await run({ [id]: "completed" })).toMatchObject({ r: { jobState: "completed", requeued: true }, queued: true });
    // Not re-queued, but on its way: running, or waiting out a retry's backoff.
    expect(await run({ [id]: "active" })).toMatchObject({ r: { requeued: false }, queued: true });
    expect(await run({ [id]: "delayed" })).toMatchObject({ r: { requeued: false }, queued: true });
    // The re-queue threw (Redis hiccup): the week is failed or missing, and the email must not say "queued".
    expect(await run({ [id]: "failed" }, true)).toMatchObject({ r: { jobState: "failed", requeued: false, notified: true }, queued: false });
    expect(await run({}, true)).toMatchObject({ r: { jobState: "missing", requeued: false, notified: true }, queued: false });
    // A completed week whose fresh run (under :late) already finished with nothing: not on its way either.
    const st = new MemoryOpsStore();
    await st.setNx(`dv:ops:late-requeue:ist:${WEEK}`, 60);
    told = [];
    const quiet = await checkWeekDelivery({ db: db(), queue: queue({ [id]: "completed", [`${id}:late`]: "completed" }), store: st, alert, notifyClinic, now: MON_0541 });
    expect(quiet.late[0].notified).toBe(false); // an earlier run already told the clinic
    expect(told).toEqual([]);
  });

  it("without an injected notifier: the web app's notice in production, and never a real request from a test run", async () => {
    // Production wiring: the default sender is notify.ts's, which posts kind, week and queued (schedule.test.ts).
    expect(defaultClinicNotifier({})).toBe(notifyDelayChecked);
    // Under the test runner, even with a token set by another test, nothing is fetched.
    vi.stubEnv("WORKER_INTERNAL_TOKEN", "tok");
    vi.stubEnv("DENTVIDEO_APP_URL", "https://app.example");
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ sent: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const r = await checkWeekDelivery({ db: db(), queue: queue(), store, alert, now: MON_0541 });
      expect(r.late[0]).toMatchObject({ requeued: true, notified: false });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(await defaultClinicNotifier({ VITEST: "true" })("ist", WEEK, "late", { queued: true })).toEqual({ sent: false, retry: false, reason: "not sent from a test run" });
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
