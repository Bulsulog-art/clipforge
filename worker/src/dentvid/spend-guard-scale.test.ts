import { describe, expect, it, vi } from "vitest";
import { guardConfig, MemoryGuardStore, scaledCaps, SpendGuard } from "./spend-guard.js";
import { MemoryParkStore, resumeParked } from "./park.js";

/**
 * The global ceilings exist to catch runaway bugs, not to cap growth: they
 * scale with the number of paying clinics. Per-clinic caps bound abuse.
 */

const MONDAY = new Date("2026-11-09T05:00:00Z");
const clinics = (n: number) => Array.from({ length: n }, (_, i) => `clinic-${i}`);

describe("global caps scale with active clinics", () => {
  it("defaults: $1.15/day and $5.15/month per active clinic, never below the env caps", () => {
    const cfg = guardConfig({});
    expect(cfg.dailyUsdPerActiveClinic).toBeCloseTo(1.15);
    expect(cfg.monthlyUsdPerActiveClinic).toBeCloseTo(5.15);
    expect(scaledCaps(cfg, 0)).toEqual({ dailyUsd: 20, monthlyUsd: 300 });
    expect(scaledCaps(cfg, null)).toEqual({ dailyUsd: 20, monthlyUsd: 300 });
    const s = scaledCaps(cfg, 100);
    expect(s.dailyUsd).toBeCloseTo(115);
    expect(s.monthlyUsd).toBeCloseTo(515);
  });

  it("100 active clinics on a Monday: every one gets its week", async () => {
    const guard = new SpendGuard(new MemoryGuardStore(), () => guardConfig({}), { activeClinics: async () => 100 });
    const results = [];
    for (const id of clinics(100)) results.push(await guard.reserve("week", id, { now: MONDAY }));
    expect(results.every((r) => r.ok)).toBe(true);
    // …and the month still has room for the following Mondays.
    for (const [i, day] of ["2026-11-16", "2026-11-23"].entries()) {
      for (const id of clinics(100)) expect((await guard.reserve("week", id, { now: new Date(`${day}T05:00:00Z`) })).ok, `week ${i}`).toBe(true);
    }
  });

  it("counts once per cache period, not once per job", async () => {
    const count = vi.fn(async () => 100);
    const guard = new SpendGuard(new MemoryGuardStore(), () => guardConfig({}), { activeClinics: count });
    for (const id of clinics(50)) await guard.reserve("week", id, { now: MONDAY });
    expect(count).toHaveBeenCalledTimes(1);
    await guard.reserve("week", "late", { now: new Date(MONDAY.getTime() + 11 * 60_000) });
    expect(count).toHaveBeenCalledTimes(2);
  });

  it("a runaway loop re-enqueuing one clinic is still stopped by the per-clinic caps", async () => {
    const guard = new SpendGuard(new MemoryGuardStore(), () => guardConfig({}), { activeClinics: async () => 1000 });
    let allowed = 0;
    for (let i = 0; i < 500; i++) if ((await guard.reserve("week", "looping-clinic", { now: MONDAY })).ok) allowed++;
    expect(allowed).toBe(3); // DENTVID_MAX_WEEKS_PER_CLINIC_WEEK
    expect(await guard.reserve("week", "looping-clinic", { now: MONDAY })).toMatchObject({ ok: false, reason: "clinic_weekly_weeks" });
    let restyles = 0;
    for (let i = 0; i < 500; i++) if ((await guard.reserve("restyle", "looping-clinic", { now: MONDAY })).ok) restyles++;
    expect(restyles).toBe(10); // DENTVID_MAX_RESTYLES_PER_CLINIC_DAY
    // Other clinics are unaffected.
    expect((await guard.reserve("week", "other", { now: MONDAY })).ok).toBe(true);
  });

  it("count failure → env caps apply, one alert, nothing blocked silently", async () => {
    const alert = vi.fn(async () => true);
    const guard = new SpendGuard(new MemoryGuardStore(), () => guardConfig({}), {
      activeClinics: async () => {
        throw new Error("liman down");
      },
      alert,
    });
    const ok = [];
    for (const id of clinics(100)) ok.push((await guard.reserve("week", id, { now: MONDAY })).ok);
    // $20 env cap / $0.50 per week = 40 weeks; the rest are refused (and parked by the job), not lost.
    expect(ok.filter(Boolean)).toHaveLength(40);
    expect(alert).toHaveBeenCalledTimes(1);
    expect((alert.mock.calls[0] as unknown[])[0]).toMatch(/active clinic count unavailable/);
  });

  it("parked Mondays resume the same day once the count is readable again", async () => {
    let countWorks = false;
    const store = new MemoryGuardStore();
    const guard = new SpendGuard(store, () => guardConfig({}), {
      activeClinics: async () => {
        if (!countWorks) throw new Error("liman down");
        return 100;
      },
      cacheMs: 0,
      alert: vi.fn(async () => true),
    });
    const park = new MemoryParkStore();
    for (const id of clinics(100)) {
      const d = await guard.reserve("week", id, { now: MONDAY });
      if (!d.ok) await park.put({ jobId: `week:${id}:2026-11-09`, name: "week", data: { clinicId: id, count: 5 }, reason: d.reason, parkedAt: MONDAY.toISOString() });
    }
    expect(park.m.size).toBe(60);

    const queue = { getJob: vi.fn(async () => ({ getState: async () => "failed", retry: vi.fn(async () => {}) })), add: vi.fn(async () => ({})) };
    const later = new Date(MONDAY.getTime() + 15 * 60_000);
    expect(await resumeParked(park, queue, guard, later)).toMatchObject({ resumed: 0, waiting: 60 });

    countWorks = true;
    expect(await resumeParked(park, queue, guard, new Date(later.getTime() + 15 * 60_000))).toMatchObject({ resumed: 60, waiting: 0 });
    expect(park.m.size).toBe(0);
    // And when they run, the scaled cap lets them all through on the same day.
    for (const id of clinics(100).slice(40)) expect((await guard.reserve("week", id, { now: later })).ok).toBe(true);
  });
});
