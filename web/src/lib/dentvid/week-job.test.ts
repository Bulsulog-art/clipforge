import { describe, expect, it } from "vitest";
import { weekDelivered, weekRunFor } from "./week-job";

describe("the 'make this week' / 'try again' button", () => {
  it("queues a week that has no job and nothing delivered", () => {
    expect(weekRunFor(null, 0)).toBe("queue");
    expect(weekRunFor(undefined, 0)).toBe("queue");
  });

  it("re-queues a run that failed for good (e.g. the AI provider was out of credit), so the clinic is never stuck on 'delayed'", () => {
    expect(weekRunFor("failed", 0)).toBe("requeue");
  });

  it("re-queues a run that completed without one usable video (every topic rejected)", () => {
    expect(weekRunFor("completed", 0)).toBe("requeue");
  });

  it("never makes a second week once there are usable videos, whatever the job's state (completed jobs are dropped after a day)", () => {
    expect(weekRunFor("completed", 3)).toBe("made");
    expect(weekRunFor("failed", 1)).toBe("made");
    expect(weekRunFor(null, 5)).toBe("made");
  });

  it("leaves a run that is waiting or being made alone", () => {
    for (const s of ["waiting", "prioritized", "active", "delayed", "waiting-children"]) expect(weekRunFor(s, 0)).toBe("running");
  });
});

describe("has this week delivered anything?", () => {
  const W = "2026-11-16";
  const item = (status: string, week_of = W, kind = "generated") => ({ kind, week_of, status });
  it("only ready / flagged generated videos of that week count", () => {
    expect(weekDelivered([item("ready")], W)).toBe(true);
    expect(weekDelivered([item("flagged")], W)).toBe(true);
    expect(weekDelivered([item("rejected"), item("rejected"), item("failed")], W)).toBe(false);
    expect(weekDelivered([item("ready", "2026-11-09")], W)).toBe(false);
    expect(weekDelivered([item("ready", W, "recording")], W)).toBe(false);
    expect(weekDelivered([], W)).toBe(false);
  });
});
