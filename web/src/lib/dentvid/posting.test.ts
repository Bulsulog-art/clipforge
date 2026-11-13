import { describe, expect, it } from "vitest";
import { isMissingColumn, leadSentence, postTexts, sharePayload, shareMethod, slotLabel, slotsFor, spreadDays, weekSchedule } from "./posting";
import { POSTING_TEXT } from "@/content/dentvideo-posting";
import { LOCALES } from "@/content/dentvideo";

describe("postTexts", () => {
  it("prefers the worker's post kit", () => {
    expect(postTexts({ caption: "c", hashtags: ["a"], post: { instagram: "IG", short: "S" } })).toEqual({ instagram: "IG", short: "S" });
  });
  it("falls back to caption + hashtags for older videos, with a one-line short version", () => {
    const t = postTexts({ caption: "First sentence here. Second one.", hashtags: ["a", "#b", "c", "d", "bad tag"] });
    expect(t).toEqual({ instagram: "First sentence here. Second one.\n\n#a #b #c #d", short: "First sentence here.\n#a #b #c" });
  });
  it("ignores a malformed or oversized kit, and has nothing for an empty copy", () => {
    expect(postTexts({ caption: "c", post: { instagram: 5, short: "S" } })?.instagram).toBe("c");
    expect(postTexts({ caption: "c", post: { instagram: "x".repeat(2201), short: "S" } })?.instagram).toBe("c");
    expect(postTexts(null)).toBeNull();
    expect(postTexts({})).toBeNull();
  });
  it("cuts a long lead sentence at a word", () => {
    const s = leadSentence(`${"word ".repeat(50)}.`, 40);
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith("…")).toBe(true);
    expect(leadSentence("歯石は取れません。次に。")).toBe("歯石は取れません。");
  });
});

describe("schedule", () => {
  it("spreads the week's videos over Monday–Friday", () => {
    expect(spreadDays(5)).toEqual([0, 1, 2, 3, 4]);
    expect(spreadDays(4)).toEqual([0, 1, 3, 4]);
    expect(spreadDays(3)).toEqual([0, 2, 4]);
    expect(spreadDays(2)).toEqual([1, 3]);
    expect(spreadDays(1)).toEqual([1]);
    expect(spreadDays(0)).toEqual([]);
    expect(spreadDays(7)).toEqual([0, 1, 2, 3, 4, 0, 1]);
    for (let n = 1; n <= 10; n++) for (const d of spreadDays(n)) expect(d >= 0 && d <= 4).toBe(true);
  });

  it("dates from the week's Monday, local clock times, lunch and evening alternating, never two at one time", () => {
    const s = slotsFor("2026-11-09", 5, "tr");
    expect(s.map((x) => x.date)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]);
    expect(s.map((x) => x.time)).toEqual(["20:00", "12:30", "20:00", "12:30", "20:00"]);
    const seven = slotsFor("2026-11-09", 7, "en");
    const keys = seven.map((x) => `${x.date} ${x.time}`);
    expect(new Set(keys).size).toBe(7);
    expect(slotsFor("bad", 3, "en")).toEqual([]);
  });

  it("gives each postable video of the week a slot, in the order they were made; declined and failed ones get none", () => {
    const items = [
      { id: "a", status: "ready", approval: "pending", week_of: "2026-11-09" },
      { id: "b", status: "flagged", approval: "pending", week_of: "2026-11-09" },
      { id: "x", status: "rejected", approval: "pending", week_of: "2026-11-09" },
      { id: "c", status: "ready", approval: "rejected", week_of: "2026-11-09" },
      { id: "d", status: "ready", approval: "approved", week_of: "2026-11-09" },
      { id: "old", status: "ready", approval: "approved", week_of: "2026-11-02" },
    ];
    const m = weekSchedule(items, "2026-11-09", "en");
    expect([...m.keys()]).toEqual(["a", "b", "d"]);
    expect([...m.values()].map((s) => s.weekday)).toEqual([0, 2, 4]);
  });

  it("labels a slot with the weekday in the clinic's language", () => {
    const slot = { date: "2026-11-10", weekday: 1, time: "12:30" };
    expect(slotLabel(slot, "en")).toBe("Tue 12:30");
    expect(slotLabel(slot, "de")).toBe("Di 12:30");
    expect(slotLabel(slot, "tr")).toBe("Sal 12:30");
    expect(slotLabel(slot, "ja")).toBe("火 12:30");
    for (const l of LOCALES) expect(slotLabel(slot, l)).toMatch(/12:30$/);
  });
});

describe("share fallback", () => {
  const probe = () => ({ name: "x.mp4" }) as File;
  it("shares the file where the phone can (iOS Safari, Android Chrome)", () => {
    expect(shareMethod({ share: () => {}, canShare: () => true }, probe)).toBe("share-file");
  });
  it("downloads + copies everywhere else", () => {
    expect(shareMethod(undefined, probe)).toBe("download");
    expect(shareMethod({}, probe)).toBe("download");
    // Desktop Chrome: share() exists but cannot take a file.
    expect(shareMethod({ share: () => {}, canShare: () => false }, probe)).toBe("download");
    // Old Safari: share() without canShare().
    expect(shareMethod({ share: () => {} }, probe)).toBe("download");
    expect(shareMethod({ share: () => {}, canShare: () => { throw new Error("x"); } }, probe)).toBe("download");
    expect(shareMethod({ share: () => {}, canShare: () => true }, () => null)).toBe("download");
  });
  it("sends the file alone when the caption is on the clipboard, with the text only when it is not", () => {
    const f = { name: "v.mp4" } as File;
    expect(sharePayload(f, "caption", true)).toEqual({ files: [f] });
    expect(sharePayload(f, "caption", false)).toEqual({ files: [f], text: "caption" });
    expect(sharePayload(f, "", false)).toEqual({ files: [f] });
  });
});

describe("missing column", () => {
  it("recognises 'column not there yet' and nothing else", () => {
    expect(isMissingColumn({ code: "42703", message: 'column "posted_at" does not exist' }, "posted_at")).toBe(true);
    expect(isMissingColumn({ code: "PGRST204", message: "Could not find the 'posted_at' column" }, "posted_at")).toBe(true);
    expect(isMissingColumn({ message: "Could not find the 'posted_at' column of 'dentvid_items' in the schema cache" }, "posted_at")).toBe(true);
    expect(isMissingColumn({ code: "42501", message: "permission denied" }, "posted_at")).toBe(false);
    expect(isMissingColumn(null, "posted_at")).toBe(false);
  });
});

describe("posting words", () => {
  it.each(LOCALES)("%s: every string is there and translated, placeholders kept", (l) => {
    const t = POSTING_TEXT[l];
    const flat = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : flat(v)));
    for (const s of flat(t)) expect(s.trim().length).toBeGreaterThan(0);
    expect(t.suggested).toContain("{slot}");
    expect(t.email.postOn).toContain("{slot}");
    expect(t.page.invalidBody).toContain("{days}");
    if (l !== "en") expect(t.saveAndCopy).not.toBe(POSTING_TEXT.en.saveAndCopy);
  });
});
