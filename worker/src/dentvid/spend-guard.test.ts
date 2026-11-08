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

  it("enforces the global daily $ ceiling across clinics", async () => {
    const g = new SpendGuard(new MemoryGuardStore(), () => cfg({ dailyUsd: 1, costUsd: { week: 0.5, restyle: 0.03, recording: 0.5, topup: 0.3 } }));
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
