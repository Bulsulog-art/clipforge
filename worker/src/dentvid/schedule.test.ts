import { describe, it, expect, vi } from "vitest";
import { clinicsToRun, deliveryWeek, dispatchWeeks, DISPATCH_SCHEDULE, isPaying, planBatch, projectedLate, validWeek, waves, weekOf, type ClinicRow } from "./schedule.js";
import { notifyReady } from "./notify.js";

describe("monday dispatch", () => {
  it("uses the same Monday key as the web app", () => {
    expect(weekOf(new Date("2026-11-08T11:00:00Z"))).toBe("2026-11-02"); // Sunday
    expect(weekOf(new Date("2026-11-09T05:00:00Z"))).toBe("2026-11-09"); // Monday
  });
  it("runs only paying clinics — a trial (not paid yet) clinic never gets a week, made before or not", () => {
    const clinics = [
      { id: "a", plan: "active" },
      { id: "t1", plan: "trial" },
      { id: "t2", plan: "trial" },
      { id: "p", plan: "paused" },
      { id: "c", plan: "cancelled" },
      { id: "a2", plan: "active" },
    ];
    expect(clinicsToRun(clinics)).toEqual(["a", "a2"]);
    expect(clinicsToRun([{ id: "t", plan: "trial" }])).toEqual([]);
  });
  it("only an active plan pays for model calls", () => {
    expect(isPaying("active")).toBe(true);
    for (const p of ["trial", "paused", "cancelled", "", null, undefined]) expect(isPaying(p)).toBe(false);
  });
});

describe("the weekend batch, in waves by time zone", () => {
  // Fake clock: the Saturday 18:00 UTC dispatch before Monday 2026-11-16.
  const SAT = new Date("2026-11-14T18:00:00Z");
  const clinic = (id: string, country?: string, plan = "active"): ClinicRow => ({ id, plan, profile: country ? { country } : null });
  const clinics = [
    clinic("nyc", "US"),
    clinic("ldn", "GB"),
    clinic("tky", "JP"),
    clinic("ist", "TR"),
    clinic("ber", "DE"),
    clinic("akl", "NZ"),
    clinic("unknown"),
    clinic("trial-jp", "JP", "trial"),
  ];

  it("starts Saturday 18:00 UTC", () => {
    expect(DISPATCH_SCHEDULE).toEqual({ pattern: "0 18 * * 6", tz: "UTC" });
  });

  it("is for the coming Monday from the dispatch on, this Monday before it", () => {
    expect(deliveryWeek(SAT)).toBe("2026-11-16");
    expect(deliveryWeek(new Date("2026-11-14T17:59:59Z"))).toBe("2026-11-09");
    expect(deliveryWeek(new Date("2026-11-16T05:00:00Z"))).toBe("2026-11-16");
    expect(deliveryWeek(new Date("2026-11-20T12:00:00Z"))).toBe("2026-11-16");
    expect(validWeek("2026-11-16")).toBe("2026-11-16");
    for (const bad of [undefined, "", "2026-13-45", "next week", 20261116]) expect(validWeek(bad)).toBeUndefined();
  });

  it("runs the earliest Monday morning first: Auckland, Tokyo, Istanbul, Berlin, London (and unknown → UTC), New York", () => {
    const batch = planBatch(clinics, "2026-11-16", SAT);
    expect(batch.map((b) => b.clinicId)).toEqual(["akl", "tky", "ist", "ber", "ldn", "unknown", "nyc"]);
    // Priority = 100 + hours from the dispatch to that clinic's Monday 07:00.
    expect(batch.map((b) => b.priority)).toEqual([124, 128, 134, 136, 137, 137, 142]);
    expect(batch[0].deadline.toISOString()).toBe("2026-11-15T18:00:00.000Z");
    expect(waves(batch).map((w) => `${w.tz}:${w.clinics}`)).toEqual([
      "Pacific/Auckland:1",
      "Asia/Tokyo:1",
      "Europe/Istanbul:1",
      "Europe/Berlin:1",
      "Europe/London:1",
      "UTC:1",
      "America/New_York:1",
    ]);
  });

  it("queues every paying clinic's week stamped with the coming Monday, flagged as batch, ordered by deadline", async () => {
    const db = { from: () => ({ select: (cols: string) => (expect(cols).toContain("profile"), { eq: async () => ({ data: clinics.filter((c) => c.plan === "active"), error: null }) }) }) };
    const add = vi.fn(async () => ({}));
    expect(await dispatchWeeks(db as never, { add } as never, SAT)).toBe(7);
    const calls = add.mock.calls as unknown as [string, { clinicId: string; week: string; batch: boolean }, { jobId: string; priority: number }][];
    expect(calls.every(([name, data, opts]) => name === "week" && data.week === "2026-11-16" && data.batch === true && opts.jobId === `week:${data.clinicId}:2026-11-16`)).toBe(true);
    expect(calls.find(([, d]) => d.clinicId === "tky")![2].priority).toBeLessThan(calls.find(([, d]) => d.clinicId === "nyc")![2].priority);
  });

  it("projects which clinics would miss their morning at a given speed — the signal to add a render server", () => {
    const batch = planBatch([clinic("a1", "NZ"), clinic("a2", "NZ"), clinic("b", "GB")], "2026-11-16", SAT);
    // 13 h a week: the second Auckland clinic finishes 26 h in (deadline 24 h), London 39 h in (deadline 37 h).
    expect(projectedLate(batch, 13 * 60, SAT)).toEqual(["a2", "b"]);
    expect(projectedLate(batch, 13 * 60, SAT, 2)).toEqual([]);
    expect(projectedLate(batch, 9, SAT)).toEqual([]);
  });
});

describe("notifyReady", () => {
  it("posts to the app with the internal token and reports whether mail went out", async () => {
    process.env.WORKER_INTERNAL_TOKEN = "tok";
    const f = vi.fn(async () => new Response(JSON.stringify({ sent: true }), { status: 200 }));
    expect(await notifyReady("c1", "week", { ready: 4, flagged: 1 }, f as unknown as typeof fetch)).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://dentvideo.com/api/internal/dentvideo/notify");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toEqual({ clinicId: "c1", kind: "week", ready: 4, flagged: 1 });
  });
  it("never throws", async () => {
    const f = vi.fn(async () => { throw new Error("down"); });
    expect(await notifyReady("c1", "week", { ready: 1, flagged: 0 }, f as unknown as typeof fetch)).toBe(false);
  });
});
