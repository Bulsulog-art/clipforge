import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  capacityAlert,
  capacityAlertKey,
  median,
  MIN_DURATION_SAMPLES,
  recordWeekDuration,
  SLOW_FACTOR,
  WEEK_DURATION_KEY,
  WEEK_DURATION_SAMPLES,
  weekDurationSample,
  weekPace,
  type WeekPace,
} from "./capacity.js";
import { _resetLocalOnce, MemoryOpsStore, type Mail } from "./ops-alert.js";
import { configureOps, ownerAlertOnce } from "./ops.js";
import { dispatchKey, dispatchWeeks, WEEK_MINUTES_DEFAULT, type ClinicRow } from "./schedule.js";

/**
 * "The batch will miss deadlines" used to be a log line, projected from a
 * 12-minute estimate nobody measured. Now real week durations are recorded,
 * their median replaces the estimate once there are enough, and the owner is
 * emailed once per delivery week when a Monday morning would be missed.
 */

const FULL_WEEK = 5;
const MIN = 60_000;
const job = (minutes: number, name = "week") => ({ name, processedOn: 1_000_000, finishedOn: 1_000_000 + minutes * MIN });

describe("recording how long a real week took", () => {
  it("a week job that made a full week in its run: its wall time in minutes", () => {
    expect(weekDurationSample(job(14.5), { ready: 4, flagged: 1, rejected: 2 }, FULL_WEEK)).toBe(14.5);
    expect(weekDurationSample(job(9), { ready: 6, flagged: 0 }, FULL_WEEK)).toBe(9);
  });

  it("not a week's work: a re-run that made the missing two, a week already made, another job, odd timestamps", () => {
    expect(weekDurationSample(job(4), { ready: 2, flagged: 0 }, FULL_WEEK)).toBeNull();
    expect(weekDurationSample(job(0.02), { ready: 0, flagged: 0, rejected: 0, already: 5 }, FULL_WEEK)).toBeNull();
    expect(weekDurationSample(job(12, "recording"), { ready: 5 }, FULL_WEEK)).toBeNull();
    expect(weekDurationSample({ name: "week", processedOn: null, finishedOn: 5 }, { ready: 5 }, FULL_WEEK)).toBeNull();
    expect(weekDurationSample({ name: "week", processedOn: 10, finishedOn: 5 }, { ready: 5 }, FULL_WEEK)).toBeNull();
    // Longer than six hours is not a week's work (a paused worker, a clock jump).
    expect(weekDurationSample(job(7 * 60), { ready: 5 }, FULL_WEEK)).toBeNull();
    expect(weekDurationSample(job(12), undefined, FULL_WEEK)).toBeNull();
  });

  it("keeps the last WEEK_DURATION_SAMPLES in one capped list; never throws", async () => {
    const store = new MemoryOpsStore();
    for (let i = 1; i <= WEEK_DURATION_SAMPLES + 7; i++) await recordWeekDuration(store, job(i), { ready: 5, flagged: 0 }, FULL_WEEK);
    const list = await store.list(WEEK_DURATION_KEY);
    expect(list).toHaveLength(WEEK_DURATION_SAMPLES);
    expect(list[0]).toBe("8");
    expect(list.at(-1)).toBe(String(WEEK_DURATION_SAMPLES + 7));
    // Not a full week: nothing added.
    expect(await recordWeekDuration(store, job(3), { ready: 1, flagged: 0 }, FULL_WEEK)).toBeNull();
    expect(await store.list(WEEK_DURATION_KEY)).toHaveLength(WEEK_DURATION_SAMPLES);
    // No store, or a store that is down.
    expect(await recordWeekDuration(null, job(12), { ready: 5 }, FULL_WEEK)).toBeNull();
    store.down = true;
    await expect(recordWeekDuration(store, job(12), { ready: 5 }, FULL_WEEK)).resolves.toBeNull();
  });
});

describe("the minutes the dispatch projects with", () => {
  const withSamples = async (values: (number | string)[]) => {
    const s = new MemoryOpsStore();
    for (const v of values) await s.push(WEEK_DURATION_KEY, String(v), 60, 100);
    return s;
  };

  it("the configured estimate until MIN_DURATION_SAMPLES full weeks were measured", async () => {
    expect(await weekPace(null, 12)).toEqual({ minutes: 12, source: "configured", samples: 0, configured: 12, slow: false });
    const few = await withSamples([30, 31, 29, 30].slice(0, MIN_DURATION_SAMPLES - 1));
    expect(await weekPace(few, 12)).toMatchObject({ minutes: 12, source: "configured", samples: MIN_DURATION_SAMPLES - 1, slow: false });
  });

  it("then the median of what was measured (junk ignored), and 'slow' past SLOW_FACTOR × the plan", async () => {
    const s = await withSamples([10, 40, 11, "x", -3, 12, 13, 9]);
    expect(await weekPace(s, 12)).toMatchObject({ minutes: 11.5, source: "measured", samples: 6, measured: 11.5, slow: false });
    const slow = await withSamples([20, 19, 21, 22, 18]);
    expect(SLOW_FACTOR).toBe(1.5);
    expect(await weekPace(slow, 12)).toMatchObject({ minutes: 20, slow: true });
    expect((await weekPace(slow, 14)).slow).toBe(false);
  });

  it("a store that is down reads as no samples", async () => {
    const s = await withSamples([20, 20, 20, 20, 20]);
    s.down = true;
    expect(await weekPace(s, 12)).toMatchObject({ minutes: 12, source: "configured", samples: 0 });
  });

  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("the owner's capacity alert", () => {
  const pace = (over: Partial<WeekPace> = {}): WeekPace => ({ minutes: 12, source: "configured", samples: 0, configured: 12, slow: false, ...over });

  it("nothing late and the pace as planned: no alert", () => {
    expect(capacityAlert({ week: "2026-11-30", clinics: 40, late: 0, lateZones: [], pace: pace(), workers: 1 })).toBeNull();
  });

  it("projected late: urgent, with the numbers and the zones affected, and the decision left to the owner", () => {
    const a = capacityAlert({ week: "2026-11-30", clinics: 130, late: 7, lateZones: ["America/New_York"], pace: pace({ minutes: 14, source: "measured", samples: 12, measured: 14 }), workers: 1 })!;
    expect(a.key).toBe("capacity_late:2026-11-30");
    expect(a.severity).toBe("urgent");
    expect(a.what.join(" ")).toMatch(/130 weeks to make.*14 minutes per week, the median of the last 12 full weeks.*7 of them would be ready only after their clinic's Monday 07:00/);
    expect(a.facts).toContainEqual(["Time zones affected", "America/New_York"]);
    expect(a.todo.join(" ")).toMatch(/Decide whether to add a render server/);
    // Owner copy without dashes as punctuation.
    for (const line of [...a.what, ...a.done, ...a.todo]) expect(line).not.toMatch(/[—–]/);
  });

  it("weeks slower than planned but nothing late yet: a warning, once", () => {
    const a = capacityAlert({ week: "2026-11-30", clinics: 20, late: 0, lateZones: [], pace: pace({ minutes: 20, source: "measured", samples: 8, measured: 20, slow: true }), workers: 1 })!;
    expect(a.key).toBe("capacity_slow:2026-11-30");
    expect(a.severity).toBe("warning");
    expect(a.what.join(" ")).toMatch(/took 20 minutes each \(median\), against 12 minutes planned/);
    for (const line of [...a.what, ...a.done, ...a.todo]) expect(line).not.toMatch(/[—–]/);
  });

  it("late and slow: one urgent email that says both", () => {
    const a = capacityAlert({ week: "2026-11-30", clinics: 50, late: 3, lateZones: ["Pacific/Auckland"], pace: pace({ minutes: 30, source: "measured", samples: 6, measured: 30, slow: true }), workers: 1 })!;
    expect(a.severity).toBe("urgent");
    expect(a.what.join(" ")).toMatch(/Weeks take longer than planned: 30 minutes measured against 12 minutes planned/);
  });
});

/* ------------------------------------------------------------- at dispatch */

/** Enough of supabase-js for activeClinicRows: one page of active clinics. */
const clinicsDb = (rows: ClinicRow[]) => ({
  from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: async (a: number, b: number) => ({ data: rows.slice(a, b + 1), error: null }) }) }) }) }),
});
/** n clinics in Auckland: Monday 07:00 there is Sunday 18:00 UTC, 24 hours after the dispatch. */
const auckland = (n: number): ClinicRow[] => Array.from({ length: n }, (_, i) => ({ id: `nz${i}`, plan: "active", profile: { country: "NZ" } }));
const SAT = new Date("2026-11-28T18:00:00Z");
const WEEK = "2026-11-30";

describe("the Saturday dispatch", () => {
  let store: MemoryOpsStore;
  let mails: Mail[];
  const add = vi.fn(async () => ({}));
  const samples = async (minutes: number, n = MIN_DURATION_SAMPLES) => {
    for (let i = 0; i < n; i++) await recordWeekDuration(store, job(minutes), { ready: 5, flagged: 0 }, FULL_WEEK);
  };
  const marker = async (week = WEEK) => JSON.parse((await store.get(dispatchKey(week)))!) as { projectedLate: number };

  beforeEach(() => {
    store = new MemoryOpsStore();
    mails = [];
    add.mockClear();
    _resetLocalOnce();
    configureOps({ store, send: async (m) => (mails.push(m), true), env: {} });
  });

  it("projectedLate > 0 → one alert per week (a dispatch run twice sends nothing more; the next week is told again)", async () => {
    // 30 Auckland clinics at 60 minutes a week: 30 hours of work for 24 hours to their morning.
    await samples(60);
    expect(await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, SAT, store, 1, { alertOnce: ownerAlertOnce })).toBe(30);
    expect((await marker()).projectedLate).toBe(6);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/weekend batch may miss some Monday deliveries/);
    expect(mails[0].text).toMatch(/6 of them would be ready only after/);
    expect(mails[0].text).toContain("Pacific/Auckland");
    expect(await store.get(capacityAlertKey(WEEK))).not.toBeNull();
    // The same dispatch again (a retried job, a second worker), even on another day: nothing more.
    await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, new Date(SAT.getTime() + 30 * 3_600_000), store, 1, { alertOnce: ownerAlertOnce });
    expect(mails).toHaveLength(1);
    // The next week's dispatch tells the owner again.
    _resetLocalOnce();
    configureOps({ store, send: async (m) => (mails.push(m), true), env: {}, now: () => new Date(SAT.getTime() + 7 * 86_400_000) });
    await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, new Date(SAT.getTime() + 7 * 86_400_000), store, 1, { alertOnce: ownerAlertOnce });
    expect(mails).toHaveLength(2);
  });

  it("median of recorded durations replaces the default in projectedLate", async () => {
    const alertOnce = vi.fn(async () => "sent" as const);
    // At the default 12 minutes, 30 Auckland weeks fit in 24 hours: nothing late, no alert.
    await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, SAT, store, 1, { alertOnce, env: {} });
    expect((await marker()).projectedLate).toBe(0);
    expect(alertOnce).not.toHaveBeenCalled();
    expect(WEEK_MINUTES_DEFAULT).toBe(12);
    // Measured: 60 minutes a week. The same batch is now projected late, and the owner is told.
    await samples(60);
    await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, SAT, store, 1, { alertOnce, env: {} });
    expect((await marker()).projectedLate).toBe(6);
    expect(alertOnce).toHaveBeenCalledTimes(1);
    expect(alertOnce).toHaveBeenCalledWith(capacityAlertKey(WEEK), expect.any(Number), expect.objectContaining({ key: `capacity_late:${WEEK}`, severity: "urgent" }));
  });

  it("…both ways: a measured median faster than a pessimistic DENTVID_WEEK_MINUTES clears the projection", async () => {
    const alertOnce = vi.fn(async () => "sent" as const);
    await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, SAT, store, 1, { alertOnce, env: { DENTVID_WEEK_MINUTES: "60" } });
    expect((await marker()).projectedLate).toBe(6);
    await samples(10);
    alertOnce.mockClear();
    await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, SAT, store, 1, { alertOnce, env: { DENTVID_WEEK_MINUTES: "60" } });
    expect((await marker()).projectedLate).toBe(0);
    expect(alertOnce).not.toHaveBeenCalled();
  });

  it("weeks 1.5× slower than planned but nothing late: one 'slower than planned' warning", async () => {
    const alertOnce = vi.fn(async () => "sent" as const);
    await samples(20);
    await dispatchWeeks(clinicsDb(auckland(10)) as never, { add } as never, SAT, store, 1, { alertOnce, env: {} });
    expect((await marker()).projectedLate).toBe(0);
    expect(alertOnce).toHaveBeenCalledWith(capacityAlertKey(WEEK), expect.any(Number), expect.objectContaining({ key: `capacity_slow:${WEEK}`, severity: "warning" }));
  });

  it("the dispatch marker keeps its shape, and an alert that throws never fails the dispatch", async () => {
    await samples(60);
    const alertOnce = vi.fn(async () => {
      throw new Error("resend down");
    });
    expect(await dispatchWeeks(clinicsDb(auckland(30)) as never, { add } as never, SAT, store, 1, { alertOnce })).toBe(30);
    expect(Object.keys(JSON.parse((await store.get(dispatchKey(WEEK)))!)).sort()).toEqual(["at", "jobs", "projectedLate", "waves"]);
    expect(add).toHaveBeenCalledTimes(30);
  });
});
