import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CALENDAR_EN } from "./calendar";
import type { SectionTable } from "./types";

/**
 * The English content calendar and the worker's awareness days
 * (worker/src/dental/calendar.ts) must tell a US or UK clinic the same
 * thing: every organised observance the weekly planner may tie a video to is
 * in the guide's table, with the same organiser page, country and months, and
 * every organised date in the table is one the planner knows. Without this,
 * the site could promise a date the videos never use, or the other way round.
 */

type WorkerObservance = {
  id: string;
  countries: string[] | "*";
  name: { en: string };
  window: (year: number) => { start: string; end: string; approximate?: true } | undefined;
  source?: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${monthOf(iso)}`;
/** "National Smile Month (mid-May to mid-June)" → "National Smile Month". */
const plainName = (o: WorkerObservance) => o.name.en.replace(/\s*\([^)]*\)\s*$/, "");
const NO_ORGANIZER = "No official organizer";

const table = CALENDAR_EN.sections.find((s) => s.table?.caption.includes("US and UK"))?.table as SectionTable;
const rowFor = (name: string) => table.rows.find((r) => r[1] === name);
const where = (o: WorkerObservance) => (o.countries === "*" ? "Worldwide" : o.countries.includes("GB") ? "United Kingdom" : "United States");
const quarterOf = (iso: string) => {
  const q = Math.ceil(Number(iso.slice(5, 7)) / 3);
  return CALENDAR_EN.sections.find((s) => s.heading.startsWith(`Weeks ${13 * (q - 1) + 1}`))!;
};

const workerFile = path.resolve(__dirname, "../../../../worker/src/dental/calendar.ts");

/**
 * Some organisers publish exact dates year by year (National Smile Month); the
 * worker keeps them in a table and treats a year without an entry as
 * `approximate`. For such an observance the table row must print the latest
 * year the worker has exact dates for, and those dates, so adding next year's
 * dates to the worker cannot leave the guide on last year's. Returns what is
 * wrong, or undefined. Observances with the same dates every year are skipped.
 */
function printedYearProblem(o: WorkerObservance, when: string): string | undefined {
  const years = Array.from({ length: 15 }, (_, i) => 2026 + i);
  if (!years.some((y) => o.window(y)?.approximate)) return undefined;
  const published = years.filter((y) => {
    const w = o.window(y);
    return w !== undefined && !w.approximate;
  });
  const printed = when.match(/in (\d{4})\)/)?.[1];
  if (!published.length) return printed ? `${o.id}: the guide prints ${printed}, but the worker has no published dates` : undefined;
  const latest = Math.max(...published);
  if (printed !== String(latest)) return `${o.id}: the guide prints ${printed ?? "no year"}, but the worker has the dates for ${latest}`;
  const w = o.window(latest)!;
  const expected = `${dayMonth(w.start)}–${dayMonth(w.end)} in ${latest}`;
  return when.includes(expected) ? undefined : `${o.id}: the guide should print "${expected}"`;
}

describe("the English calendar guide on its own", () => {
  it("has one table of US and UK dates with an organizer column", () => {
    expect(table, "table").toBeDefined();
    expect(table.columns).toEqual(["When", "Observance", "Organizer", "Where"]);
  });

  it("lists each organised date once, and cites a page for every organizer", () => {
    const organised = table.rows.filter((r) => r[2] !== NO_ORGANIZER);
    expect(new Set(organised.map((r) => r[1])).size).toBe(organised.length);
    expect(organised.map((r) => r[1])).toEqual(
      expect.arrayContaining(["National Children's Dental Health Month", "Oral Cancer Awareness Month", "National Facial Protection Month", "National Dental Hygiene Month", "National Smile Month", "Mouth Cancer Action Month"]),
    );
    const labels = (CALENDAR_EN.sources ?? []).map((s) => s.label);
    for (const r of organised) expect(labels.some((l) => l.includes(r[1])), r[1]).toBe(true);
  });

  it("answers the dates question in the FAQ with every organised US and UK date", () => {
    const answer = CALENDAR_EN.faq.find((f) => /which dates/i.test(f.q))!.a;
    for (const r of table.rows.filter((x) => x[2] !== NO_ORGANIZER)) expect(answer, r[1]).toContain(r[1]);
  });
});

describe("the check that keeps a year's printed dates current", () => {
  const SMILE_ROW = "Mid-May to mid-June (11 May–11 June in 2026)";
  const tableOf = (published: Record<number, { start: string; end: string }>): WorkerObservance => ({
    id: "gb-national-smile-month",
    countries: ["GB"],
    name: { en: "National Smile Month (mid-May to mid-June)" },
    window: (y) => published[y] ?? { start: `${y}-05-15`, end: `${y}-06-15`, approximate: true },
    source: "https://www.dentalhealth.org/smilemonth",
  });
  const y2026 = { 2026: { start: "2026-05-11", end: "2026-06-11" } };
  const y2027 = { ...y2026, 2027: { start: "2027-05-17", end: "2027-06-17" } };

  it("passes when the guide prints the latest year the worker has dates for", () => {
    expect(printedYearProblem(tableOf(y2026), SMILE_ROW)).toBeUndefined();
    expect(printedYearProblem(tableOf(y2027), "Mid-May to mid-June (17 May–17 June in 2027)")).toBeUndefined();
  });

  it("fails when next year's dates reach the worker and the guide still prints last year's", () => {
    expect(printedYearProblem(tableOf(y2027), SMILE_ROW)).toMatch(/prints 2026, but the worker has the dates for 2027/);
  });

  it("fails when the year is right but the dates are not, or the guide prints no year at all", () => {
    expect(printedYearProblem(tableOf(y2027), "Mid-May to mid-June (11 May–11 June in 2027)")).toMatch(/should print "17 May–17 June in 2027"/);
    expect(printedYearProblem(tableOf(y2026), "Mid-May to mid-June")).toMatch(/prints no year/);
    expect(printedYearProblem(tableOf({}), SMILE_ROW)).toMatch(/no published dates/);
  });

  it("leaves alone an observance with the same dates every year", () => {
    const february: WorkerObservance = { id: "x", countries: ["US"], name: { en: "X (February)" }, window: (y) => ({ start: `${y}-02-01`, end: `${y}-02-28` }) };
    expect(printedYearProblem(february, "February")).toBeUndefined();
  });
});

describe.runIf(fs.existsSync(workerFile))("the English calendar guide and the worker's awareness days agree", () => {
  let organised: WorkerObservance[] = [];

  beforeAll(async () => {
    const mod = (await import(/* @vite-ignore */ workerFile)) as { OBSERVANCES: WorkerObservance[] };
    organised = mod.OBSERVANCES.filter((o) => o.source && (o.countries === "*" || o.countries.includes("US") || o.countries.includes("GB")));
  });

  it("the worker has the US and UK days this guide is built around", () => {
    expect(organised.map((o) => o.id)).toEqual(
      expect.arrayContaining([
        "world-oral-health-day",
        "us-childrens-dental-health-month",
        "us-oral-cancer-awareness-month",
        "us-facial-protection-month",
        "us-dental-hygiene-month",
        "gb-national-smile-month",
        "gb-mouth-cancer-action-month",
      ]),
    );
  });

  it("every organised US, UK or worldwide day in the worker is a row of the table, with the same source, country and months", () => {
    const sources = (CALENDAR_EN.sources ?? []).map((s) => s.url);
    for (const o of organised) {
      const row = rowFor(plainName(o));
      expect(row, `${o.id}: no row named "${plainName(o)}"`).toBeDefined();
      expect(sources, o.id).toContain(o.source);
      expect(row![3].startsWith(where(o)), `${o.id}: ${row![3]}`).toBe(true);
      for (const y of [2026, 2027]) {
        const w = o.window(y)!;
        expect(row![0].toLowerCase(), `${o.id} ${y}`).toContain(monthOf(w.start).toLowerCase());
        expect(row![0].toLowerCase(), `${o.id} ${y}`).toContain(monthOf(w.end).toLowerCase());
      }
    }
  });

  it("exact dates printed for a year are the worker's dates for that year", () => {
    for (const o of organised) {
      const row = rowFor(plainName(o))!;
      const m = row[0].match(/in (\d{4})\)/);
      if (!m) continue;
      const w = o.window(Number(m[1]))!;
      expect(w.approximate, o.id).toBeUndefined();
      expect(row[0], o.id).toContain(`${dayMonth(w.start)}–${dayMonth(w.end)} in ${m[1]}`);
    }
  });

  it("a row with dates published year by year prints the latest year the worker has, so the guide is updated with the worker", () => {
    const yearly = organised.filter((o) => Array.from({ length: 15 }, (_, i) => o.window(2026 + i)).some((w) => w?.approximate));
    expect(yearly.map((o) => o.id)).toContain("gb-national-smile-month");
    for (const o of yearly) expect(printedYearProblem(o, rowFor(plainName(o))![0])).toBeUndefined();
  });

  it("every organised date in the table is one the worker offers", () => {
    const names = organised.map(plainName);
    for (const r of table.rows.filter((x) => x[2] !== NO_ORGANIZER)) expect(names, r[1]).toContain(r[1]);
  });

  it("each US and UK day is named in the quarter of the calendar it falls in", () => {
    for (const o of organised.filter((x) => x.countries !== "*")) {
      const section = quarterOf(o.window(2026)!.start);
      const text = [...section.paragraphs, ...(section.list ?? [])].join(" ");
      expect(text, `${o.id} in "${section.heading}"`).toContain(plainName(o));
    }
  });
});
