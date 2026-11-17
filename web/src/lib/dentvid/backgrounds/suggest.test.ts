import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import fixtures from "./fixtures.json";
import { BACKGROUND_LIBRARY } from "./library";
import { backgroundSrc, suggestBackgrounds } from "./suggest";

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
