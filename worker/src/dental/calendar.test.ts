import { describe, expect, it } from "vitest";
import { OBSERVANCES, SMILE_MONTH, seasonalBrief, upcomingObservances } from "./calendar.js";

/**
 * The US and UK awareness days offered to the weekly strategist: their
 * windows in 2026 and 2027, which clinics see them, the year boundaries
 * (February in a leap year, November into December) and the educational
 * angle. The English calendar guide is checked against this list in
 * web/src/content/guides/calendar.test.ts.
 */

const at = (iso: string) => new Date(`${iso}T08:00:00Z`);
const ids = (country: string, iso: string) => upcomingObservances(country, "en", at(iso)).map((u) => u.id);
const find = (country: string, iso: string, id: string) => upcomingObservances(country, "en", at(iso)).find((u) => u.id === id);
const byId = (id: string) => OBSERVANCES.find((o) => o.id === id)!;

const US_DAYS = ["us-childrens-dental-health-month", "us-oral-cancer-awareness-month", "us-facial-protection-month", "us-dental-hygiene-month"];
const GB_DAYS = ["gb-national-smile-month", "gb-mouth-cancer-action-month"];

describe("US and UK awareness days: windows", () => {
  it.each([
    ["us-childrens-dental-health-month", 2026, "2026-02-01", "2026-02-28"],
    ["us-childrens-dental-health-month", 2027, "2027-02-01", "2027-02-28"],
    ["us-oral-cancer-awareness-month", 2026, "2026-04-01", "2026-04-30"],
    ["us-oral-cancer-awareness-month", 2027, "2027-04-01", "2027-04-30"],
    ["us-facial-protection-month", 2026, "2026-04-01", "2026-04-30"],
    ["us-facial-protection-month", 2027, "2027-04-01", "2027-04-30"],
    ["us-dental-hygiene-month", 2026, "2026-10-01", "2026-10-31"],
    ["us-dental-hygiene-month", 2027, "2027-10-01", "2027-10-31"],
    ["gb-mouth-cancer-action-month", 2026, "2026-11-01", "2026-11-30"],
    ["gb-mouth-cancer-action-month", 2027, "2027-11-01", "2027-11-30"],
    ["gb-national-smile-month", 2026, "2026-05-11", "2026-06-11"],
  ])("%s in %i runs %s to %s", (id, year, start, end) => {
    expect(byId(id).window(year)).toEqual({ start, end });
  });

  it("Smile Month 2026 uses the organiser's published dates; a year not yet announced is the usual span, marked approximate", () => {
    expect(SMILE_MONTH[2026]).toEqual({ start: "2026-05-11", end: "2026-06-11" });
    expect(byId("gb-national-smile-month").window(2026)).not.toHaveProperty("approximate");
    expect(byId("gb-national-smile-month").window(2027)).toEqual({ start: "2027-05-15", end: "2027-06-15", approximate: true });
  });

  it("offers each month-long observance from the planning week before it until its last day, and not after", () => {
    // A plan made in late March (horizon ten days) already sees April.
    expect(ids("US", "2026-03-25")).toEqual(expect.arrayContaining(["us-oral-cancer-awareness-month", "us-facial-protection-month"]));
    expect(ids("US", "2026-03-15")).not.toContain("us-oral-cancer-awareness-month");
    expect(ids("US", "2026-04-30")).toEqual(expect.arrayContaining(["us-oral-cancer-awareness-month", "us-facial-protection-month"]));
    expect(ids("US", "2026-05-01")).not.toContain("us-oral-cancer-awareness-month");
    expect(ids("US", "2026-09-25")).toContain("us-dental-hygiene-month");
    expect(ids("US", "2026-10-20")).toEqual(expect.arrayContaining(["us-dental-hygiene-month", "halloween"]));
    expect(ids("US", "2026-11-01")).not.toContain("us-dental-hygiene-month");
    expect(ids("GB", "2026-05-05")).toContain("gb-national-smile-month");
    expect(find("GB", "2026-06-11", "gb-national-smile-month")).toMatchObject({ start: "2026-05-11", end: "2026-06-11" });
    expect(ids("GB", "2026-06-12")).not.toContain("gb-national-smile-month");
  });
});

describe("US and UK awareness days: year boundaries", () => {
  it("Mouth Cancer Action Month ends with November and never leaks into December or January", () => {
    expect(find("GB", "2026-10-25", "gb-mouth-cancer-action-month")).toMatchObject({ start: "2026-11-01", end: "2026-11-30" });
    expect(find("GB", "2026-11-30", "gb-mouth-cancer-action-month")).toMatchObject({ end: "2026-11-30" });
    for (const day of ["2026-12-01", "2026-12-28", "2026-12-31", "2027-01-04"]) expect(ids("GB", day), day).not.toContain("gb-mouth-cancer-action-month");
    // Next year's month comes back with next year's dates.
    expect(find("GB", "2027-10-28", "gb-mouth-cancer-action-month")).toMatchObject({ start: "2027-11-01", end: "2027-11-30" });
  });

  it("Children's Dental Health Month is seen from late January with the new year's dates, and covers 29 February in a leap year", () => {
    for (const day of ["2026-12-20", "2026-12-31", "2027-01-10"]) expect(ids("US", day), day).not.toContain("us-childrens-dental-health-month");
    expect(find("US", "2027-01-25", "us-childrens-dental-health-month")).toMatchObject({ start: "2027-02-01", end: "2027-02-28" });
    expect(byId("us-childrens-dental-health-month").window(2028)).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(find("US", "2028-02-29", "us-childrens-dental-health-month")).toMatchObject({ end: "2028-02-29" });
    expect(ids("US", "2027-03-01")).not.toContain("us-childrens-dental-health-month");
  });

  it("a plan made over the new year sees January's observances in the new year, and last year's none", () => {
    const up = upcomingObservances("GB", "en", at("2026-12-28"));
    expect(up.map((u) => u.id)).toEqual(expect.arrayContaining(["new-year-habits", "winter-sensitivity"]));
    expect(up.find((u) => u.id === "new-year-habits")).toMatchObject({ start: "2027-01-01", end: "2027-01-14" });
    expect(up.every((u) => u.end >= "2026-12-28")).toBe(true);
  });

  it("every window starts before it ends, in every year from 2026 to 2030", () => {
    for (const o of OBSERVANCES) {
      for (const y of [2026, 2027, 2028, 2029, 2030]) {
        const w = o.window(y);
        if (!w) continue;
        expect(w.start, `${o.id} ${y}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(w.end, `${o.id} ${y}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(w.start <= w.end, `${o.id} ${y}: ${w.start} > ${w.end}`).toBe(true);
        expect(Number.isNaN(Date.parse(w.end)), `${o.id} ${y}`).toBe(false);
      }
    }
  });
});

describe("US and UK awareness days: who sees them", () => {
  it("US days reach US clinics only, UK days UK clinics only", () => {
    const usYear = ["2026-02-10", "2026-04-10", "2026-10-10"].flatMap((day) => ids("US", day));
    const gbYear = ["2026-05-20", "2026-11-10"].flatMap((day) => ids("GB", day));
    for (const id of US_DAYS) expect(usYear, id).toContain(id);
    for (const id of GB_DAYS) expect(gbYear, id).toContain(id);
    for (const id of GB_DAYS) expect(["2026-05-20", "2026-11-10"].flatMap((day) => ids("US", day)), id).not.toContain(id);
    for (const id of US_DAYS) expect(["2026-02-10", "2026-04-10", "2026-10-10"].flatMap((day) => ids("GB", day)), id).not.toContain(id);
    for (const c of ["DE", "TR", "ES", "CA", "IE", "AU"]) {
      const all = ["2026-02-10", "2026-04-10", "2026-05-20", "2026-10-10", "2026-11-10"].flatMap((day) => ids(c, day));
      for (const id of [...US_DAYS, ...GB_DAYS]) expect(all, `${c} ${id}`).not.toContain(id);
    }
  });

  it("a clinic stored as UK, gb or with spaces gets the UK days", () => {
    for (const c of ["UK", "uk", "gb", " GB "]) {
      expect(ids(c, "2026-11-10"), c).toContain("gb-mouth-cancer-action-month");
      expect(ids(c, "2026-05-20"), c).toContain("gb-national-smile-month");
    }
    expect(ids("us", "2026-04-10")).toContain("us-oral-cancer-awareness-month");
  });

  it("each is named once in English, with the organiser's page as its source", () => {
    for (const id of [...US_DAYS, ...GB_DAYS]) {
      const o = byId(id);
      expect(o.name.en, id).toMatch(/\((January|February|March|April|May|June|July|August|September|October|November|December|mid-May to mid-June)\)$/);
      expect(o.source, id).toMatch(/^https:\/\/[^/\s]+\.[a-z]{2,}\//);
    }
    expect(new Set(OBSERVANCES.map((o) => o.id)).size).toBe(OBSERVANCES.length);
  });
});

describe("US and UK awareness days: the strategist's brief", () => {
  it("the angles teach and never sell", () => {
    const selling = /discount|coupon|giveaway|% ?off|\bdeal\b|\bspecial (offer|price)\b|book now|limited time|\bfree\b/i;
    for (const id of [...US_DAYS, ...GB_DAYS]) {
      const a = byId(id).angle;
      expect(a, id).not.toMatch(selling);
      // One angle per observance in a ";"-separated brief: no semicolons inside it.
      expect(a, id).not.toMatch(/—|!|;|\d+ ?%/);
    }
    // The cancer months: no figures and no fear, and in the US no screening offer.
    for (const id of ["us-oral-cancer-awareness-month", "gb-mouth-cancer-action-month"]) expect(byId(id).angle, id).toMatch(/no statistics.*no scare claims/);
    expect(byId("us-oral-cancer-awareness-month").angle).toMatch(/never a screening offer or event/);
  });

  it("names the month and its dates, and keeps the one-video, never-an-offer rule", () => {
    const april = seasonalBrief("US", "en", at("2026-04-06"));
    expect(april).toContain("Oral Cancer Awareness Month (April) (2026-04-01–2026-04-30)");
    expect(april).toContain("National Facial Protection Month (April) (2026-04-01–2026-04-30)");
    expect(april).toMatch(/AT MOST ONE video.*never an offer/);
    const november = seasonalBrief("UK", "en", at("2026-11-09"));
    expect(november).toContain("Mouth Cancer Action Month (November) (2026-11-01–2026-11-30)");
    expect(november).toContain("if in doubt, get checked out");
  });

  it("says when a year's dates are not yet published, so the video never states a guessed date", () => {
    expect(seasonalBrief("GB", "en", at("2026-05-20"))).toContain("National Smile Month (mid-May to mid-June) (2026-05-11–2026-06-11)");
    expect(seasonalBrief("GB", "en", at("2026-05-20"))).not.toMatch(/not published yet/);
    const y2027 = seasonalBrief("GB", "en", at("2027-05-20"));
    expect(find("GB", "2027-05-20", "gb-national-smile-month")).toMatchObject({ approximate: true });
    expect(y2027).toContain("around 2027-05-15–2027-06-15: this year's exact dates are not published yet, so name the season, never a specific date");
  });
});
