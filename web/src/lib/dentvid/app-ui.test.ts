import { describe, expect, it } from "vitest";
import type { LibraryItem } from "@/components/dentvid/library";
import {
  appTab,
  approvableIds,
  cardState,
  checkRecording,
  dateLocale,
  deleteConfirmOk,
  deletePhrase,
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
import { addDays, clampWeeks, earlierWeeksHref, LIBRARY_WEEKS, LIBRARY_WEEKS_MAX, nextDeliveryWeek, notMadeTopics, usableVideos } from "./library-weeks";
import { twelveHourClock } from "./posting";

const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: Math.random().toString(36).slice(2),
  kind: "generated",
  status: "ready",
  approval: "pending",
  title: "t",
  week_of: "2026-11-02",
  reasons: [],
  videoUrl: "/v.mp4",
  ...over,
});

describe("delete confirmation (mirrors lib/dentvid/account.ts confirmAccepted)", () => {
  it("asks for the clinic name, or the email when the profile has none", () => {
    expect(deletePhrase("Sample Dental Practice", "a@b.example")).toBe("Sample Dental Practice");
    expect(deletePhrase("   ", "a@b.example")).toBe("a@b.example");
    expect(deletePhrase(undefined, null)).toBe("");
  });
  it("accepts the name or the email, ignoring case, spacing and Unicode form", () => {
    expect(deleteConfirmOk("  sample   dental   PRACTICE ", "Sample Dental Practice", "a@b.example")).toBe(true);
    expect(deleteConfirmOk("A@B.example", "Sample Dental Practice", "a@b.example")).toBe(true);
    expect(deleteConfirmOk("ＳＡＭＰＬＥ Dental Practice", "Sample Dental Practice", null)).toBe(true);
    expect(deleteConfirmOk("Sample Dental", "Sample Dental Practice", "a@b.example")).toBe(false);
  });
  it("can still be confirmed when the clinic has no name (it used to be impossible)", () => {
    expect(deleteConfirmOk("a@b.example", "", "a@b.example")).toBe(true);
    expect(deleteConfirmOk("", "", "a@b.example")).toBe(false);
    expect(deleteConfirmOk("x", "", null)).toBe(false);
  });
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
  it("US and Canadian clinics read the month first; the UK, the rest and clinics without a country are unchanged", () => {
    expect(weekLabelDate("2026-11-23", "en", "US")).toBe("November 23");
    expect(weekLabelDate("2026-11-23", "en", "us ")).toBe("November 23");
    expect(weekLabelDate("2026-11-23", "en", "CA")).toBe("November 23");
    expect(weekLabelDate("2026-11-23", "en", "AU")).toBe("23 November");
    expect(weekLabelDate("2026-11-23", "en", "NZ")).toBe("23 November");
    expect(weekLabelDate("2026-11-23", "en", "GB")).toBe("23 November");
    expect(weekLabelDate("2026-11-23", "en", "IE")).toBe("23 November");
    expect(weekLabelDate("2026-11-23", "en")).toBe("23 November");
    expect(weekLabelDate("2026-11-23", "en", null)).toBe("23 November");
    expect(weekLabelDate("2026-11-23", "en", "")).toBe("23 November");
    // The country only picks among Englishes: a Spanish-speaking clinic in the US keeps Spanish dates.
    expect(weekLabelDate("2026-11-23", "es", "US")).toBe(weekLabelDate("2026-11-23", "es"));
    expect(weekLabelDate("2026-11-23", "de", "US")).toBe("23. November");
  });
  it("dateLocale keeps every existing answer when no country is given", () => {
    expect(dateLocale("en")).toBe("en-GB");
    expect(dateLocale("ar")).toBe("ar-u-nu-latn");
    expect(dateLocale("tr")).toBe("tr");
    expect(dateLocale("en", "US")).toBe("en-US");
    expect(dateLocale("en", "CA")).toBe("en-CA");
    expect(dateLocale("en", "AU")).toBe("en-AU");
    expect(dateLocale("en", "NZ")).toBe("en-NZ");
    expect(dateLocale("en", "ZA")).toBe("en-GB");
    expect(dateLocale("ar", "US")).toBe("ar-u-nu-latn");
  });
  it("a 12-hour clock only for English clinics in the US, Canada, Australia and New Zealand", () => {
    for (const c of ["US", "CA", "AU", "NZ", "us"]) expect(twelveHourClock("en", c), c).toBe(true);
    for (const c of ["GB", "IE", "ZA", "DE", "", null, undefined]) expect(twelveHourClock("en", c), String(c)).toBe(false);
    expect(twelveHourClock("es", "US")).toBe(false);
  });
  it("moves a date by whole days across months and years", () => {
    expect(addDays("2026-11-23", 7)).toBe("2026-11-30");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2026-11-23", -84)).toBe("2026-08-31");
    expect(addDays("nope", 7)).toBe("nope");
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
    expect(quote("fr", "Bonjour")).toBe("«\u00a0Bonjour\u00a0»");
    expect(quote("en", "Hi")).toBe("“Hi”");
  });
  it("builds a mailto link", () => {
    expect(mailtoHref("Plan ändern", "Praxis: Demo Zahnarztpraxis")).toBe("mailto:hello@dentvideo.com?subject=Plan%20%C3%A4ndern&body=Praxis%3A%20Demo%20Zahnarztpraxis");
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

describe("library weeks", () => {
  it("?weeks= is held to 12..520, whatever the address bar says", () => {
    expect(clampWeeks(undefined)).toBe(LIBRARY_WEEKS);
    expect(clampWeeks("24")).toBe(24);
    expect(clampWeeks(" 36 ")).toBe(36);
    expect(clampWeeks(["48", "60"])).toBe(48);
    expect(clampWeeks("5")).toBe(12);
    expect(clampWeeks("0")).toBe(12);
    expect(clampWeeks("-24")).toBe(12);
    expect(clampWeeks("24abc")).toBe(12);
    expect(clampWeeks("1e3")).toBe(12);
    expect(clampWeeks("99999")).toBe(LIBRARY_WEEKS_MAX);
    expect(clampWeeks(30.7)).toBe(30);
    expect(clampWeeks(Number.POSITIVE_INFINITY)).toBe(12);
  });
  it("'Show earlier weeks' asks for 12 more, and stops at the most it can show", () => {
    expect(earlierWeeksHref(12)).toBe("?weeks=24");
    expect(earlierWeeksHref(24)).toBe("?weeks=36");
    expect(earlierWeeksHref(515)).toBe("?weeks=520");
    expect(earlierWeeksHref(520)).toBeNull();
  });

  const W = "2026-11-23";
  const five = () => Array.from({ length: 5 }, (_, n) => item({ id: `v${n}`, week_of: W }));
  const skipped = (week = W) => item({ status: "rejected", week_of: week, videoUrl: undefined });

  it("counts a week's usable videos: made (ready or flagged), generated, with a video", () => {
    const items = [
      item({ week_of: W }),
      item({ week_of: W, status: "flagged" }),
      item({ week_of: W, approval: "rejected" }),
      item({ week_of: W, status: "working", videoUrl: undefined }),
      item({ week_of: W, status: "failed", videoUrl: undefined }),
      skipped(),
      item({ week_of: W, kind: "recording" }),
      item({ week_of: "2026-11-16" }),
    ];
    expect(usableVideos(items, W)).toBe(3);
  });

  it("'Topics we did not make' shows this week's skipped topics while the week is short of five", () => {
    const a = skipped();
    const old = skipped("2026-11-16");
    const short = [...five().slice(0, 4), a, old];
    expect(notMadeTopics(short, W)).toEqual([a]);
  });

  it("…and hides them once the week was topped up to five, and never lists an earlier week's", () => {
    expect(notMadeTopics([...five(), skipped(), skipped()], W)).toEqual([]);
    // Last week was short, but it is last week: nothing to explain on this week's page.
    const lastWeek = [...five().slice(0, 2).map((i) => ({ ...i, week_of: "2026-11-16" })), skipped("2026-11-16")];
    expect(notMadeTopics(lastWeek, W)).toEqual([]);
    // Five made, one declined by the dentist: still five made, so still hidden.
    expect(notMadeTopics([...five().slice(0, 4), item({ week_of: W, approval: "rejected" }), skipped()], W)).toEqual([]);
  });

  it("the next five arrive the Monday after the latest delivered week", () => {
    expect(nextDeliveryWeek(five(), W)).toBe("2026-11-30");
    // Paid on Sunday: the coming Monday's week is already here, so the next five come a week later.
    const sunday = "2026-11-30";
    expect(nextDeliveryWeek([item({ week_of: sunday })], sunday)).toBe("2026-12-07");
    // A week that only made topics it could not use, or nothing yet: still the Monday after this week, never a past one.
    expect(nextDeliveryWeek([skipped(), item({ week_of: "2026-10-05" })], W)).toBe("2026-11-30");
    expect(nextDeliveryWeek([], W)).toBe("2026-11-30");
    // A week already made ahead of the calendar moves it on.
    expect(nextDeliveryWeek([item({ week_of: "2026-11-30" })], W)).toBe("2026-12-07");
    expect(nextDeliveryWeek([item({ week_of: "2026-12-28" })], "2026-12-21")).toBe("2027-01-04");
  });
});
