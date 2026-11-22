import { describe, expect, it } from "vitest";
import { capHashtags, capTagLine, INSTAGRAM_MAX_HASHTAGS, isMissingColumn, leadSentence, postTexts, sharePayload, shareMethod, slotLabel, slotsFor, spreadDays, weekSchedule } from "./posting";
import { samplePostTexts } from "./posting-samples";
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
  it("at most five hashtags (Instagram's cap): a longer list is trimmed, deduplicated, in order", () => {
    expect(INSTAGRAM_MAX_HASHTAGS).toBe(5);
    expect(capHashtags(["#a", "b", "#A", "c", "", "B", "d", "e", "f", "g"])).toEqual(["#a", "b", "c", "d", "e"]);
    const t = postTexts({ caption: "Hi. There.", hashtags: ["a", "b", "#a", "c", "d", "e", "f", "g"] });
    expect(t?.instagram).toBe("Hi. There.\n\n#a #b #c #d #e");
    expect(t?.short).toBe("Hi.\n#a #b #c");
  });
  it("a kit stored before the cap keeps only its first five hashtags; other texts are left alone", () => {
    const old = "Body.\n\nAsk us.\n\n📍 Clinic · City\n\n#own #city #dentistcity #a #b #c #a #d";
    expect(postTexts({ post: { instagram: old, short: "S #own" } })?.instagram).toBe("Body.\n\nAsk us.\n\n📍 Clinic · City\n\n#own #city #dentistcity #a #b");
    expect(capTagLine("Body.\n\n#a #b #c")).toBe("Body.\n\n#a #b #c");
    expect(capTagLine("A line with #one #two #three #four #five #six words")).toBe("A line with #one #two #three #four #five #six words");
  });
  it("the sample kits keep to five hashtags", () => {
    for (const l of LOCALES) {
      const tags = samplePostTexts(l).instagram.split("\n").at(-1)!.split(" ");
      expect(tags.length).toBeLessThanOrEqual(INSTAGRAM_MAX_HASHTAGS);
      expect(tags.every((h) => h.startsWith("#"))).toBe(true);
    }
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

  it("gives each postable video of the week a slot; declined and failed ones get none", () => {
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
    expect([...m.values()].map((s) => s.weekday)).toEqual([0, 1, 4]);
  });

  it("is stable: approving or declining a video, or listing them in another order, moves no other slot", () => {
    const W = "2026-11-09";
    const base = ["e1", "c3", "a9", "b2", "d4"].map((id) => ({ id, status: "ready", approval: "pending", week_of: W }));
    const before = weekSchedule(base, W, { country: "DE", locale: "de" });
    const decided = base.map((i, n) => ({ ...i, approval: n === 0 ? "rejected" : n === 1 ? "approved" : "pending" }));
    const after = weekSchedule([...decided].reverse(), W, { country: "DE", locale: "de" });
    for (const [id, slot] of after) expect(slot).toEqual(before.get(id));
    expect(after.has("e1")).toBe(false);
  });

  it("times follow the clinic's country, not the interface language", () => {
    const W = "2026-11-09";
    const items = [{ id: "a", status: "ready", approval: "pending", week_of: W }, { id: "b", status: "ready", approval: "pending", week_of: W }];
    // A German clinic reading the app in English still gets German times; a Spanish-speaking clinic in the US gets US times.
    expect([...weekSchedule(items, W, { country: "DE", locale: "en" }).values()]).toEqual([...weekSchedule(items, W, { country: "DE", locale: "de" }).values()]);
    expect([...weekSchedule(items, W, { country: "US", locale: "es" }).values()].map((s) => s.time)).toEqual([...weekSchedule(items, W, "en").values()].map((s) => s.time));
    expect([...weekSchedule(items, W, { country: "ES", locale: "en" }).values()]).toEqual([...weekSchedule(items, W, "es").values()]);
    // Unknown country: the language decides.
    expect([...weekSchedule(items, W, { country: "ZZ", locale: "tr" }).values()]).toEqual([...weekSchedule(items, W, "tr").values()]);
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
