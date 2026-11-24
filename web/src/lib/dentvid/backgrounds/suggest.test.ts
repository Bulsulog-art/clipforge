import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import fixtures from "./fixtures.json";
import { BACKGROUND_LIBRARY } from "./library";
import { backgroundSrc, defaultBackgrounds, startingBackgrounds, suggestBackgrounds } from "./suggest";

/**
 * The browser preview ranks photos with this copy of the worker's engine
 * (worker/src/dentvid/backgrounds). Same fixtures, same answers — and, in the
 * monorepo, the same source.
 */
describe("suggestBackgrounds (web copy): shared fixtures", () => {
  for (const f of fixtures) {
    it(f.name, () => {
      expect(suggestBackgrounds(f.input, f.count)).toEqual(f.expected);
    });
  }
});

/**
 * A week's options (the worker's produceWeek passes them; the live preview
 * does not): the same answers as the worker's suggest.test.ts, so the two
 * copies rotate a week identically.
 */
describe("defaultBackgrounds / startingBackgrounds with a week's options (web copy)", () => {
  const implant = { topic: "İmplant tedavisinin aşamaları", service: "İmplant", language: "tr" };
  const brushing = { topic: "How to brush and floss properly", language: "en" };

  it("without options: the live preview's list, unchanged", () => {
    expect(startingBackgrounds(brushing, 60)).toEqual(["hygiene-01", "hygiene-04", "hygiene-05", "hygiene-08"]);
    expect(defaultBackgrounds([], 30)).toEqual(["clinic-13", "cleaning-02", "hygiene-13"]);
  });

  it("avoids recent photos softly and rotates by the seed, exactly as the worker does", () => {
    expect(startingBackgrounds(brushing, 60, undefined, { avoid: new Set(["hygiene-01", "hygiene-04"]), seed: "x" })).toEqual(["hygiene-05", "hygiene-08", "hygiene-13", "hygiene-17"]);
    expect(startingBackgrounds(implant, 30, undefined, { avoid: new Set(["implants-03", "clinic-01", "implants-04"]), seed: "Sample Dental|2026-11-23" })).toEqual([
      "implants-03",
      "hygiene-05",
      "kids-18",
    ]);
    expect(startingBackgrounds({ topic: "xyzzy" }, 30, undefined, { seed: "Sample Dental|2026-11-23" })).toEqual(["hygiene-05", "clinic-01", "kids-18"]);
    expect(startingBackgrounds({ topic: "xyzzy" }, 30, undefined, { seed: "Sample Dental|2026-11-30" })).toEqual(["clinic-07", "hygiene-05", "clinic-01"]);
  });
});

const here = path.resolve(__dirname);
const workerDir = path.resolve(here, "../../../../../worker/src/dentvid/backgrounds");

describe.runIf(fs.existsSync(workerDir))("web and worker copies are identical", () => {
  const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, f), "utf8").replace(/from "(\.\/[^"]+)\.js"/g, 'from "$1"');
  for (const f of ["suggest.ts", "library.ts", "fixtures.json"]) {
    it(f, () => {
      expect(read(here, f)).toBe(read(workerDir, f));
    });
  }
});

describe("every library photo ships in public/", () => {
  it.each(BACKGROUND_LIBRARY.map((i) => i.id))("%s", (id) => {
    const file = path.resolve(here, "../../../../public", backgroundSrc(id).slice(1));
    expect(fs.statSync(file).size).toBeGreaterThan(20_000);
    expect(fs.statSync(file).size).toBeLessThanOrEqual(92 * 1024);
  });
});
