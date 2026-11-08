import { describe, expect, it } from "vitest";
import type { LibraryItem } from "@/components/dentvid/library";
import {
  appTab,
  approvableIds,
  cardState,
  checkRecording,
  fileSize,
  groupByWeek,
  isFunnel,
  mailtoHref,
  nextAction,
  quote,
  videoFileName,
  weekLabelDate,
  weekSummary,
  weeksAgo,
} from "./app-ui";

const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: Math.random().toString(36).slice(2),
  kind: "generated",
  status: "ready",
  approval: "pending",
  title: "t",
  week_of: "2026-11-02",
  findings: [],
  videoUrl: "/v.mp4",
  ...over,
});

describe("cardState", () => {
  it("reads status, approval and a pending photo update", () => {
    expect(cardState(item())).toBe("review");
    expect(cardState(item({ status: "flagged" }))).toBe("look");
    expect(cardState(item({ status: "working", videoUrl: undefined }))).toBe("making");
    expect(cardState(item({ status: "queued" }))).toBe("making");
    expect(cardState(item({ status: "failed" }))).toBe("failed");
    expect(cardState(item({ status: "rejected" }))).toBe("notMade");
    expect(cardState(item({ approval: "approved" }))).toBe("approved");
    expect(cardState(item({ approval: "rejected" }))).toBe("declined");
    expect(cardState(item({ approval: "approved", photos: { suggested: [], chosen: [], status: "queued" } }))).toBe("updating");
    // A ready row whose file has not been signed yet is still "being made" to the clinic.
    expect(cardState(item({ videoUrl: undefined }))).toBe("making");
  });
});

describe("groupByWeek", () => {
  it("puts the newest week first, what needs the dentist first, and leaves out topics not made", () => {
    const a = item({ id: "a", week_of: "2026-10-26", approval: "approved" });
    const b = item({ id: "b", approval: "approved" });
    const c = item({ id: "c", status: "flagged" });
    const d = item({ id: "d" });
    const e = item({ id: "e", status: "rejected" });
    const g = groupByWeek([a, b, c, d, e]);
    expect(g.map((w) => w.week)).toEqual(["2026-11-02", "2026-10-26"]);
    expect(g[0].items.map((i) => i.id)).toEqual(["c", "d", "b"]);
    expect(g[1].items.map((i) => i.id)).toEqual(["a"]);
  });
});

describe("nextAction and approvable", () => {
  it("asks for one thing at a time", () => {
    expect(nextAction({ locked: true, canStartWeek: false, thisWeek: [item()] })).toBe("locked");
    expect(nextAction({ locked: false, canStartWeek: false, thisWeek: [item(), item({ approval: "approved" })] })).toBe("review");
    expect(nextAction({ locked: false, canStartWeek: false, thisWeek: [item({ status: "working" })] })).toBe("making");
    expect(nextAction({ locked: false, canStartWeek: true, thisWeek: [] })).toBe("start");
    expect(nextAction({ locked: false, canStartWeek: false, thisWeek: [item({ approval: "approved" })] })).toBe("share");
    expect(nextAction({ locked: false, canStartWeek: false, thisWeek: [item({ approval: "rejected" })] })).toBe("idle");
  });
  it("approves all only the plain ready ones, never those marked for a look", () => {
    const ids = approvableIds([item({ id: "r" }), item({ id: "f", status: "flagged" }), item({ id: "x", approval: "approved" })]);
    expect(ids).toEqual(["r"]);
    expect(weekSummary([item(), item({ status: "flagged" }), item({ status: "rejected" })])).toMatchObject({ review: 1, look: 1 });
  });
});

describe("dates", () => {
  it("labels a week by its Monday in the clinic's language, without shifting a day", () => {
    expect(weekLabelDate("2026-11-02", "en")).toBe("2 November");
    expect(weekLabelDate("2026-11-02", "de")).toBe("2. November");
    expect(weekLabelDate("2026-11-02", "tr")).toBe("2 Kasım");
    expect(weekLabelDate("nope", "en")).toBe("nope");
  });
  it("counts weeks back", () => {
    expect(weeksAgo("2026-11-02", "2026-11-02")).toBe(0);
    expect(weeksAgo("2026-10-26", "2026-11-02")).toBe(1);
    expect(weeksAgo("2026-10-05", "2026-11-02")).toBe(4);
  });
});

describe("text helpers", () => {
  it("quotes as each language does", () => {
    expect(quote("de", "Hallo")).toBe("„Hallo“");
    expect(quote("fr", "Bonjour")).toBe("« Bonjour »");
    expect(quote("en", "Hi")).toBe("“Hi”");
  });
  it("builds a mailto link", () => {
    expect(mailtoHref("Plan ändern", "Praxis: Am Park")).toBe("mailto:hello@dentvideo.com?subject=Plan%20%C3%A4ndern&body=Praxis%3A%20Am%20Park");
    expect(mailtoHref("Hi")).toBe("mailto:hello@dentvideo.com?subject=Hi");
  });
  it("names downloads readably, Turkish and German letters included", () => {
    expect(videoFileName("Diş taşı temizliği neden önemli?")).toBe("dentvideo-dis-tasi-temizligi-neden-onemli.mp4");
    expect(videoFileName("Große Füllung")).toBe("dentvideo-grosse-fullung.mp4");
    expect(videoFileName("???")).toBe("dentvideo.mp4");
  });
  it("finds the app tab from the address", () => {
    expect(appTab("/app")).toBe("videos");
    expect(appTab("/dentvideo/app/settings")).toBe("settings");
    expect(appTab("/app/record")).toBe("record");
    expect(appTab("/dentvideo/dev/app")).toBe("videos");
    expect(appTab("/dentvideo/tr")).toBeNull();
    expect(appTab("/start")).toBeNull();
  });
  it("knows the sign-up wizard", () => {
    expect(isFunnel("/start")).toBe(true);
    expect(isFunnel("/dentvideo/start")).toBe(true);
    expect(isFunnel("/dentvideo/dev/funnel")).toBe(true);
    expect(isFunnel("/dentvideo/app")).toBe(false);
    expect(isFunnel("/de")).toBe(false);
  });
});

describe("recording checks", () => {
  it("accepts phone videos up to the limit", () => {
    expect(checkRecording({ name: "IMG_0001.MOV", size: 80e6, type: "video/quicktime" })).toBeNull();
    expect(checkRecording({ name: "clip.mp4", size: 1e6, type: "" })).toBeNull();
    expect(checkRecording({ name: "photo.jpg", size: 1e6, type: "image/jpeg" })).toBe("format");
    expect(checkRecording({ name: "big.mp4", size: 600 * 1024 * 1024, type: "video/mp4" })).toBe("size");
    expect(checkRecording({ name: "e.mp4", size: 0, type: "video/mp4" })).toBe("empty");
  });
  it("formats sizes", () => {
    expect(fileSize(84 * 1024 * 1024, "en")).toBe("84 MB");
    expect(fileSize(1.5 * 1024 * 1024, "de")).toBe("1,5 MB");
    expect(fileSize(2048, "en")).toBe("2 KB");
  });
});
