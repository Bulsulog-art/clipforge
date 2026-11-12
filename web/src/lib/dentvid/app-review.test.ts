import { describe, expect, it } from "vitest";
import type { LibraryItem } from "@/components/dentvid/library";
import {
  declineNote,
  firstToReview,
  nextUndecided,
  parsePosted,
  postingProgress,
  postingStreak,
  reviewQueue,
  swipeStep,
  titleWithCount,
  togglePosted,
} from "./app-ui";

let seq = 0;
const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: `i${++seq}`,
  kind: "generated",
  status: "ready",
  approval: "pending",
  title: "t",
  week_of: "2026-11-09",
  findings: [],
  videoUrl: "/v.mp4",
  ...over,
});

describe("the review queue", () => {
  const approved = item({ approval: "approved" });
  const look = item({ status: "flagged" });
  const review = item();
  const making = item({ status: "working", videoUrl: undefined });
  const failed = item({ status: "failed" });
  const declined = item({ approval: "rejected" });
  const all = [approved, look, review, making, failed, declined];

  it("steps through every video there is something to watch in, nothing being made or failed", () => {
    expect(reviewQueue(all).map((i) => i.id)).toEqual([approved.id, look.id, review.id, declined.id]);
  });
  it("opens on the first video still waiting for a decision", () => {
    expect(firstToReview(reviewQueue(all))).toBe(1);
    expect(firstToReview([approved, declined])).toBe(0);
    expect(firstToReview([])).toBe(0);
  });
  it("moves on to the next undecided one, wrapping round, and says when all are decided", () => {
    const q = [review, approved, look];
    expect(nextUndecided(q, 0)).toBe(2);
    expect(nextUndecided(q, 2)).toBe(0);
    expect(nextUndecided([review, approved], 0)).toBe(0);
    expect(nextUndecided([{ ...review, approval: "approved" }, approved], 0)).toBe(-1);
  });
});

describe("declining with a reason", () => {
  it("stores the reason as a tag and the dentist's words, trimmed, within the API's 500 characters", () => {
    expect(declineNote("notUs", "  We don't   offer\nimplants ")).toBe("[notUs] We don't offer implants");
    expect(declineNote("wrong", "")).toBe("[wrong]");
    expect(declineNote(null, "Too fast")).toBe("Too fast");
    expect(declineNote(null, "   ")).toBeUndefined();
    expect(declineNote("other", "x".repeat(800))!.length).toBe(500);
  });
});

describe("swipes", () => {
  it("reads a horizontal swipe in the page's direction", () => {
    expect(swipeStep(-120, 10, false)).toBe("next");
    expect(swipeStep(120, 10, false)).toBe("previous");
    expect(swipeStep(120, 10, true)).toBe("next");
    expect(swipeStep(-120, 10, true)).toBe("previous");
  });
  it("ignores taps, short drags and vertical scrolls", () => {
    expect(swipeStep(20, 0, false)).toBeNull();
    expect(swipeStep(-80, 120, false)).toBeNull();
  });
});

describe("the posting checklist", () => {
  it("reads only well-formed marks", () => {
    expect(parsePosted('{"a":"2026-11-09","b":3,"c":"soon"}')).toEqual({ a: "2026-11-09" });
    expect(parsePosted("not json")).toEqual({});
    expect(parsePosted("[1]")).toEqual({});
    expect(parsePosted(null)).toEqual({});
  });
  it("ticks and unticks, keeping the newest weeks when the list grows long", () => {
    const on = togglePosted({}, "a", "2026-11-09", true);
    expect(on).toEqual({ a: "2026-11-09" });
    expect(togglePosted(on, "a", "2026-11-09", false)).toEqual({});
    let many: Record<string, string> = { old: "2020-01-06" };
    for (let n = 0; n < 300; n++) many[`n${n}`] = "2026-11-09";
    many = togglePosted(many, "new", "2026-11-09", true);
    expect(Object.keys(many)).toHaveLength(300);
    expect(many.old).toBeUndefined();
    expect(many.new).toBe("2026-11-09");
  });
  it("counts this week's approved videos and how many are ticked", () => {
    const a = item({ approval: "approved" });
    const b = item({ approval: "approved" });
    const c = item();
    expect(postingProgress([a, b, c], { [a.id]: a.week_of })).toEqual({ total: 2, posted: 1 });
    expect(postingProgress([c], {})).toEqual({ total: 0, posted: 0 });
  });
  it("counts weeks in a row with a post, not losing the streak before this week's first post", () => {
    const now = "2026-11-09";
    expect(postingStreak({}, now)).toBe(0);
    expect(postingStreak({ a: "2026-11-09" }, now)).toBe(1);
    expect(postingStreak({ a: "2026-11-09", b: "2026-11-02", c: "2026-10-26" }, now)).toBe(3);
    // Monday morning, nothing posted yet: last week's run still counts.
    expect(postingStreak({ b: "2026-11-02", c: "2026-10-26" }, now)).toBe(2);
    // A gap ends it.
    expect(postingStreak({ a: "2026-11-09", c: "2026-10-26" }, now)).toBe(1);
    expect(postingStreak({ a: "2026-11-09" }, "nonsense")).toBe(0);
  });
});

describe("the tab title", () => {
  it("shows how many videos are waiting and drops the count when none are", () => {
    expect(titleWithCount("Your videos · DentVideo", 3)).toBe("(3) Your videos · DentVideo");
    expect(titleWithCount("(3) Your videos · DentVideo", 1)).toBe("(1) Your videos · DentVideo");
    expect(titleWithCount("(3) Your videos · DentVideo", 0)).toBe("Your videos · DentVideo");
  });
});
