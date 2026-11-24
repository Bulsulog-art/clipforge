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
