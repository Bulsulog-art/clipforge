import { describe, it, expect, vi } from "vitest";
import { clinicsToRun, weekOf } from "./schedule.js";
import { notifyReady } from "./notify.js";

describe("monday dispatch", () => {
  it("uses the same Monday key as the web app", () => {
    expect(weekOf(new Date("2026-11-08T11:00:00Z"))).toBe("2026-11-02"); // Sunday
    expect(weekOf(new Date("2026-11-09T05:00:00Z"))).toBe("2026-11-09"); // Monday
  });
  it("runs active clinics weekly and trials only for their free first week", () => {
    const clinics = [
      { id: "a", plan: "active" },
      { id: "t1", plan: "trial" },
      { id: "t2", plan: "trial" },
      { id: "p", plan: "paused" },
      { id: "c", plan: "cancelled" },
    ];
    expect(clinicsToRun(clinics, new Set(["a", "t2"]))).toEqual(["a", "t1"]);
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
