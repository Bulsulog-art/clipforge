import { describe, expect, it, vi } from "vitest";
import { civilTime, clinicTimeZone, COUNTRY_TIME_ZONE, isTimeZone, localParts, mondayMorning, readyEmailAt, zonedTime } from "./timezone.js";
import { readyMailJobId, sendReadyAtCivilHour } from "./notify.js";

const iso = (d: Date) => d.toISOString();

describe("a clinic's time zone", () => {
  it("comes from its country; a multi-zone country takes its earliest mainland morning", () => {
    expect(clinicTimeZone("TR")).toBe("Europe/Istanbul");
    expect(clinicTimeZone("jp")).toBe("Asia/Tokyo");
    expect(clinicTimeZone("US")).toBe("America/New_York");
    expect(clinicTimeZone("AU")).toBe("Australia/Sydney");
  });
  it("an explicit valid zone wins; an unknown country or a bogus zone falls back to UTC", () => {
    expect(clinicTimeZone("US", "America/Los_Angeles")).toBe("America/Los_Angeles");
    expect(clinicTimeZone("US", "Mars/Olympus")).toBe("America/New_York");
    expect(clinicTimeZone("ZZ")).toBe("UTC");
    expect(clinicTimeZone(null)).toBe("UTC");
  });
  it("every zone in the map is one Intl knows", () => {
    for (const [country, tz] of Object.entries(COUNTRY_TIME_ZONE)) expect(isTimeZone(tz), `${country} → ${tz}`).toBe(true);
  });
});

describe("Monday 07:00 in the clinic's own zone", () => {
  // Week of Monday 2026-11-16: southern-hemisphere summer time, northern winter time.
  it.each([
    ["Pacific/Auckland", "2026-11-15T18:00:00.000Z"], // NZDT +13
    ["Australia/Sydney", "2026-11-15T20:00:00.000Z"], // AEDT +11
    ["Asia/Tokyo", "2026-11-15T22:00:00.000Z"], // +9
    ["Asia/Dubai", "2026-11-16T03:00:00.000Z"], // +4
    ["Europe/Istanbul", "2026-11-16T04:00:00.000Z"], // +3
    ["Europe/Berlin", "2026-11-16T06:00:00.000Z"], // CET +1
    ["Europe/London", "2026-11-16T07:00:00.000Z"], // GMT
    ["America/New_York", "2026-11-16T12:00:00.000Z"], // EST -5
    ["America/Mexico_City", "2026-11-16T13:00:00.000Z"], // -6, no DST
  ])("%s → %s", (tz, utc) => {
    expect(iso(mondayMorning("2026-11-16", tz))).toBe(utc);
  });

  it("follows daylight saving: the first Monday after the clocks change", () => {
    expect(iso(mondayMorning("2027-03-29", "Europe/Berlin"))).toBe("2027-03-29T05:00:00.000Z"); // CEST +2
    expect(iso(mondayMorning("2027-03-15", "America/New_York"))).toBe("2027-03-15T11:00:00.000Z"); // EDT -4
    expect(iso(mondayMorning("2027-04-05", "Pacific/Auckland"))).toBe("2027-04-04T19:00:00.000Z"); // back to NZST +12
  });

  it("round-trips wall time", () => {
    const d = zonedTime("2026-11-16", 7, 30, "Asia/Kolkata");
    expect(localParts(d, "Asia/Kolkata")).toMatchObject({ year: 2026, month: 11, day: 16, hour: 7, minute: 30, weekday: 1 });
  });
});

describe("civil hours", () => {
  it("07:00–21:00 local passes; earlier waits for 07:00 the same day; later for 07:00 the next day", () => {
    expect(iso(civilTime(new Date("2026-11-16T09:00:00Z"), "Europe/Berlin"))).toBe("2026-11-16T09:00:00.000Z"); // 10:00 local
    expect(iso(civilTime(new Date("2026-11-16T03:00:00Z"), "Europe/Berlin"))).toBe("2026-11-16T06:00:00.000Z"); // 04:00 → 07:00
    expect(iso(civilTime(new Date("2026-11-16T21:30:00Z"), "Europe/Berlin"))).toBe("2026-11-17T06:00:00.000Z"); // 22:30 → next 07:00
    expect(iso(civilTime(new Date("2026-11-30T23:30:00Z"), "Asia/Tokyo"))).toBe("2026-11-30T23:30:00.000Z"); // 08:30 Tue local: fine
    expect(iso(civilTime(new Date("2026-12-31T22:30:00Z"), "UTC"))).toBe("2027-01-01T07:00:00.000Z"); // across a year
  });
});

describe("when the 'videos ready' email goes out", () => {
  const WEEK = "2026-11-16";
  it("a batch week finished on Saturday night waits for Monday 07:00 in the clinic's zone", () => {
    const now = new Date("2026-11-14T20:00:00Z");
    expect(iso(readyEmailAt({ now, week: WEEK, tz: "Asia/Tokyo", batch: true }))).toBe("2026-11-15T22:00:00.000Z");
    expect(iso(readyEmailAt({ now, week: WEEK, tz: "Europe/Istanbul", batch: true }))).toBe("2026-11-16T04:00:00.000Z");
    expect(iso(readyEmailAt({ now, week: WEEK, tz: "America/New_York", batch: true }))).toBe("2026-11-16T12:00:00.000Z");
  });
  it("a batch week finished after the clinic's Monday morning goes out at once — unless that is the middle of its night", () => {
    expect(iso(readyEmailAt({ now: new Date("2026-11-16T09:30:00Z"), week: WEEK, tz: "Europe/London", batch: true }))).toBe("2026-11-16T09:30:00.000Z");
    expect(iso(readyEmailAt({ now: new Date("2026-11-16T21:30:00Z"), week: WEEK, tz: "Europe/Berlin", batch: true }))).toBe("2026-11-17T06:00:00.000Z");
  });
  it("a week someone is waiting for (first week, the button) is announced at once, whatever the hour", () => {
    const now = new Date("2026-11-16T01:00:00Z");
    expect(readyEmailAt({ now, week: WEEK, tz: "Europe/Berlin", batch: false })).toBe(now);
  });
});

describe("sendReadyAtCivilHour", () => {
  const base = { clinicId: "c1", week: "2026-11-16", tz: "Asia/Tokyo", counts: { ready: 4, flagged: 1 } };

  it("holds a batch email as a delayed job with a fixed id (a re-run never sends two)", async () => {
    const add = vi.fn(async () => ({}));
    const send = vi.fn(async () => true);
    const now = new Date("2026-11-14T20:00:00Z");
    const r = await sendReadyAtCivilHour({ ...base, batch: true, now }, { queue: { add }, send });
    expect(r).toMatchObject({ held: true, sent: false });
    expect(iso(r.at)).toBe("2026-11-15T22:00:00.000Z");
    expect(send).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith(
      "notify",
      { clinicId: "c1", kind: "week", week: "2026-11-16", ready: 4, flagged: 1 },
      expect.objectContaining({ jobId: readyMailJobId("c1", "2026-11-16"), delay: 26 * 3_600_000 }),
    );
  });

  it("sends at once when nobody needs to wait, when there is no mail queue, or when holding fails", async () => {
    const now = new Date("2026-11-14T20:00:00Z");
    const send = vi.fn(async () => true);
    await sendReadyAtCivilHour({ ...base, batch: false, now }, { queue: { add: vi.fn() }, send });
    await sendReadyAtCivilHour({ ...base, batch: true, now }, { queue: null, send });
    await sendReadyAtCivilHour({ ...base, batch: true, now }, { queue: { add: vi.fn(async () => Promise.reject(new Error("redis down"))) }, send });
    expect(send).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledWith("c1", "week", { ready: 4, flagged: 1 });
  });
});
