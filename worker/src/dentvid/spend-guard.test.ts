import { describe, expect, it, vi } from "vitest";
import { alertRefusal, countersFor, guardConfig, MemoryGuardStore, SpendGuard, type GuardConfig } from "./spend-guard.js";
import { MemoryParkStore, resumeParked } from "./park.js";

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const cfg = (over: Partial<GuardConfig> = {}): GuardConfig => ({ ...guardConfig({}), ...over });

describe("guardConfig", () => {
  it("has safe defaults and reads overrides", () => {
    const d = guardConfig({});
    expect(d.paused).toBe(false);
    expect(d.dailyUsd).toBe(20);
    expect(d.monthlyUsd).toBe(300);
    expect(d.costUsd.week).toBeGreaterThan(0);
    const o = guardConfig({ DENTVID_PAUSE_GENERATION: "1", DENTVID_DAILY_USD_CAP: "5", DENTVID_COST_WEEK_USD: "x" });
    expect(o.paused).toBe(true);
    expect(o.dailyUsd).toBe(5);
    expect(o.costUsd.week).toBe(0.5); // unparseable → default
  });
});

describe("SpendGuard", () => {
  it("allows up to the per-clinic weekly week runs, then refuses", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg({ maxWeeksPerClinicWeek: 2 }));
    expect((await g.reserve("week", CLINIC)).ok).toBe(true);
    expect((await g.reserve("week", CLINIC)).ok).toBe(true);
    const third = await g.reserve("week", CLINIC);
    expect(third).toMatchObject({ ok: false, reason: "clinic_weekly_weeks" });
    // Another clinic is unaffected.
    expect((await g.reserve("week", "other-clinic")).ok).toBe(true);
  });

  it("gives a released week run back (a week the provider refused at once), never below zero", async () => {
    const store = new MemoryGuardStore();
    const g = new SpendGuard(store, () => cfg({ maxWeeksPerClinicWeek: 1 }));
    expect((await g.reserve("week", CLINIC)).ok).toBe(true);
    expect((await g.reserve("week", CLINIC)).ok).toBe(false);
    expect(await g.release("week", CLINIC)).toBe(true);
    expect((await g.reserve("week", CLINIC)).ok).toBe(true);
    await g.release("week", CLINIC);
    await g.release("week", CLINIC);
    expect([...store.values.values()].every((v) => v === 0)).toBe(true);
    // No store, or a store that is down: nothing to give back, and no throw.
    expect(await new SpendGuard(null).release("week", CLINIC)).toBe(false);
    store.down = true;
    expect(await g.release("week", CLINIC)).toBe(false);
  });

  it("enforces the global daily $ ceiling across clinics", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg({ dailyUsd: 1, costUsd: { week: 0.5, restyle: 0.03, recording: 0.5, topup: 0.3, change: 0.15 } }));
    expect((await g.reserve("week", "a")).ok).toBe(true);
    expect((await g.reserve("week", "b")).ok).toBe(true);
    expect(await g.reserve("week", "c")).toMatchObject({ ok: false, reason: "global_daily_usd" });
  });

  it("is all-or-nothing: a refused reservation counts nothing", async () => {
    const store = new MemoryGuardStore();
    const g = new SpendGuard(store, () => cfg({ maxRestylesPerClinicDay: 1 }));
    await g.reserve("restyle", CLINIC);
    const before = new Map(store.values);
    expect((await g.reserve("restyle", CLINIC)).ok).toBe(false);
    expect(store.values).toEqual(before);
  });

  it("dry runs check without counting", async () => {
    const store = new MemoryGuardStore();
    const g = new SpendGuard(store, () => cfg());
    expect((await g.reserve("recording", CLINIC, { dryRun: true })).ok).toBe(true);
    expect(store.values.size).toBe(0);
  });

  it("refuses everything when paused (kill switch)", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg({ paused: true }));
    expect(await g.reserve("week", CLINIC)).toMatchObject({ ok: false, reason: "paused" });
  });

  it("fails closed when the counter store is down or missing", async () => {
    const store = new MemoryGuardStore();
    store.down = true;
    expect(await new SpendGuard(store, () => cfg()).reserve("week", CLINIC)).toMatchObject({ ok: false, reason: "store_unavailable" });
    expect(await new SpendGuard(null, () => cfg()).reserve("week", CLINIC)).toMatchObject({ ok: false, reason: "store_unavailable" });
  });

  it("budgets every op against day, month and clinic $ counters", () => {
    const keys = countersFor("recording", CLINIC, cfg(), new Date("2026-11-11T10:00:00Z")).map((c) => c.key);
    expect(keys).toContain("dv:spend:usd:day:2026-11-11");
    expect(keys).toContain("dv:spend:usd:month:2026-11");
    expect(keys).toContain(`dv:spend:usd:clinic:${CLINIC}:2026-11-11`);
    expect(keys).toContain(`dv:spend:ops:recording:${CLINIC}:2026-11-09`); // the Monday
  });
});

describe("alertRefusal", () => {
  it("sends one email per reason per day, however many jobs are refused", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg());
    const send = vi.fn(async () => true);
    for (let i = 0; i < 25; i++) {
      await alertRefusal(g, { op: "week", clinicId: `c${i}`, reason: "global_daily_usd", detail: "x", parked: true }, send);
    }
    expect(send).toHaveBeenCalledTimes(1);
    await alertRefusal(g, { op: "week", clinicId: "c1", reason: "paused", detail: "x", parked: true }, send);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("still de-duplicates when Redis is down (in-process gate)", async () => {
    const store = new MemoryGuardStore();
    store.down = true;
    const g = new SpendGuard(store, () => cfg());
    const send = vi.fn(async () => true);
    for (let i = 0; i < 5; i++) await alertRefusal(g, { op: "week", clinicId: "c", reason: "store_unavailable", detail: "x", parked: false }, send);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("resumeParked", () => {
  const parked = (jobId: string, parkedAt: string) => ({ jobId, name: "week" as const, data: { clinicId: CLINIC, count: 5 }, reason: "paused" as const, parkedAt });

  it("keeps jobs parked while the guard refuses, retries them once it allows", async () => {
    const store = new MemoryParkStore();
    await store.put(parked("week:c:2026-11-09", new Date().toISOString()));
    let paused = true;
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg({ paused }));
    const retry = vi.fn(async () => {});
    const queue = { getJob: vi.fn(async () => ({ getState: async () => "failed", retry })), add: vi.fn(async () => ({})) };

    expect(await resumeParked(store, queue, g)).toMatchObject({ resumed: 0, waiting: 1 });
    expect(retry).not.toHaveBeenCalled();

    paused = false;
    expect(await resumeParked(store, queue, g)).toMatchObject({ resumed: 1 });
    expect(retry).toHaveBeenCalledWith("failed");
    expect(store.m.size).toBe(0);
  });

  it("re-adds a parked job whose BullMQ entry is gone, and drops week-old ones", async () => {
    const store = new MemoryParkStore();
    await store.put(parked("fresh", new Date().toISOString()));
    await store.put(parked("stale", new Date(Date.now() - 8 * 86400_000).toISOString()));
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg());
    const queue = { getJob: vi.fn(async () => undefined), add: vi.fn(async () => ({})) };
    expect(await resumeParked(store, queue, g)).toMatchObject({ resumed: 1, dropped: 1 });
    expect(queue.add).toHaveBeenCalledWith("week", { clinicId: CLINIC, count: 5 }, expect.objectContaining({ jobId: "fresh" }));
  });
});

describe("a week's runs count against the Monday it delivers, not the week it runs in", () => {
  // The batch for week W runs from Saturday 18:00 UTC, inside W-1's calendar week. Counted by the run
  // date, it shared one cap of 6 with W-1's first week, its retries and the clinic's "try again", and a
  // clinic that needed them was parked until Monday 00:00 UTC: past Tokyo's, Sydney's and Auckland's mornings.
  const W_MINUS_1 = "2026-11-23";
  const W = "2026-11-30";
  const WEDNESDAY = new Date("2026-11-25T10:00:00Z");
  const SATURDAY_BATCH = new Date("2026-11-28T18:05:00Z");
  const roomy = () => cfg({ dailyUsd: 1e6, monthlyUsd: 1e6, clinicDailyUsd: 1e6 });

  it("batch week W reserved on Saturday counts against W", async () => {
    const store = new MemoryGuardStore();
    const g = new SpendGuard(store, roomy);
    expect((await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W })).ok).toBe(true);
    expect(store.values.get(`dv:spend:ops:week:${CLINIC}:${W}`)).toBe(1);
    expect(store.values.has(`dv:spend:ops:week:${CLINIC}:${W_MINUS_1}`)).toBe(false);
    expect(countersFor("week", CLINIC, roomy(), SATURDAY_BATCH, W).find((c) => c.reason === "clinic_weekly_weeks")?.key).toBe(`dv:spend:ops:week:${CLINIC}:${W}`);
  });

  it("first week (W-1) with 4 attempts + 1 button run does not block Saturday's batch for W", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), roomy);
    // A clinic that paid on Wednesday: its first week took all 4 attempts and a "try again".
    for (let i = 0; i < 5; i++) expect((await g.reserve("week", CLINIC, { now: WEDNESDAY, week: W_MINUS_1 })).ok).toBe(true);
    // Saturday's batch for W: its 4 attempts and the one extra run all go through.
    for (let i = 0; i < 5; i++) expect((await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W })).ok, `run ${i + 1}`).toBe(true);
    // Each week keeps its own cap.
    expect((await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W })).ok).toBe(true);
    expect(await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W })).toMatchObject({ ok: false, reason: "clinic_weekly_weeks" });
    expect((await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W_MINUS_1 })).ok).toBe(true);
    expect(await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W_MINUS_1 })).toMatchObject({ ok: false, reason: "clinic_weekly_weeks" });
  });

  it("the old way (keyed by the run date) would have parked that batch: the guard still does without a week", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), roomy);
    for (let i = 0; i < 5; i++) await g.reserve("week", CLINIC, { now: WEDNESDAY });
    expect((await g.reserve("week", CLINIC, { now: SATURDAY_BATCH })).ok).toBe(true);
    expect(await g.reserve("week", CLINIC, { now: SATURDAY_BATCH })).toMatchObject({ ok: false, reason: "clinic_weekly_weeks" });
  });

  it("the dollar caps stay by day: a delivery week never opens more money", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg({ clinicDailyUsd: 1, dailyUsd: 1e6, monthlyUsd: 1e6 }));
    expect((await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W })).ok).toBe(true);
    expect((await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W })).ok).toBe(true);
    expect(await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: "2026-12-07" })).toMatchObject({ ok: false, reason: "clinic_daily_usd" });
  });

  it("a release gives back the same delivery week's run; a malformed week means the run date's Monday", async () => {
    const store = new MemoryGuardStore();
    const g = new SpendGuard(store, roomy);
    await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W });
    expect(await g.release("week", CLINIC, { now: SATURDAY_BATCH, week: W })).toBe(true);
    expect(store.values.get(`dv:spend:ops:week:${CLINIC}:${W}`)).toBe(0);
    await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: "next monday" });
    expect(store.values.get(`dv:spend:ops:week:${CLINIC}:${W_MINUS_1}`)).toBe(1);
  });

  it("other operations ignore the week: recordings and changes stay per calendar week", async () => {
    const keys = (op: "recording" | "change") => countersFor(op, CLINIC, roomy(), SATURDAY_BATCH, W).map((c) => c.key);
    expect(keys("recording")).toContain(`dv:spend:ops:recording:${CLINIC}:${W_MINUS_1}`);
    expect(keys("change")).toContain(`dv:spend:ops:change:${CLINIC}:${W_MINUS_1}`);
  });

  it("a parked week is resumed when its own delivery week has room, whatever the run week's count", async () => {
    const guardStore = new MemoryGuardStore();
    const g = new SpendGuard(guardStore, roomy);
    // W-1 is full; W is not.
    for (let i = 0; i < 6; i++) await g.reserve("week", CLINIC, { now: SATURDAY_BATCH, week: W_MINUS_1 });
    const park = new MemoryParkStore();
    await park.put({ jobId: `week:${CLINIC}:${W}`, name: "week", data: { clinicId: CLINIC, count: 5, week: W, batch: true }, reason: "global_daily_usd", parkedAt: SATURDAY_BATCH.toISOString() });
    await park.put({ jobId: `week:${CLINIC}:${W_MINUS_1}`, name: "week", data: { clinicId: CLINIC, count: 5, week: W_MINUS_1 }, reason: "clinic_weekly_weeks", parkedAt: SATURDAY_BATCH.toISOString() });
    const queue = { getJob: vi.fn(async () => undefined), add: vi.fn(async () => ({})) };
    expect(await resumeParked(park, queue, g, new Date(SATURDAY_BATCH.getTime() + 15 * 60_000))).toMatchObject({ resumed: 1, waiting: 1 });
    expect(queue.add).toHaveBeenCalledWith("week", expect.objectContaining({ week: W }), expect.objectContaining({ jobId: `week:${CLINIC}:${W}` }));
    // Only a check: nothing reserved for the resumed week yet.
    expect(guardStore.values.get(`dv:spend:ops:week:${CLINIC}:${W}`) ?? 0).toBe(0);
  });
});
