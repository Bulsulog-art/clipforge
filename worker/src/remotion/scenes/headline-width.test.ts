import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { guardWidow } from "./primitives.js";
import { TYPE, fitText, fitsOneLine } from "../theme.js";
import { layoutUnits } from "../script.js";

/**
 * A headline (DisplayText) wraps only between its units — words, Japanese
 * phrases, and the last pair the widow guard glues together. No unit may be
 * wider than the frame at the size the line is set, or it runs off the edge
 * (seen in Polish: "znów krwawią?" glued at hook size overran by 15 px).
 */

const SIZES = [TYPE.hook, TYPE.display, TYPE.heading];

/** The units DisplayText lays out for a text at a size. */
function units(text: string, size: number): string[] {
  const fitted = fitText(size, text);
  const { units: words, spaced } = layoutUnits(text);
  return (spaced ? guardWidow(words, fitted) : words.map((t, index) => ({ text: t, index }))).map((u) => u.text);
}

function overflowing(text: string): string[] {
  const out: string[] = [];
  for (const size of SIZES) {
    const fitted = fitText(size, text);
    for (const u of units(text, size)) if (!fitsOneLine(fitted, u)) out.push(`${size}px "${u}" in "${text}"`);
  }
  return out;
}

describe("headline units fit the frame", () => {
  it("does not glue a widow pair that would overrun a large hook (Polish render)", () => {
    const text = "Raz w roku i dziąsła znów krwawią?";
    expect(units(text, TYPE.hook).at(-1)).toBe("krwawią?");
    expect(overflowing(text)).toEqual([]);
  });

  it("still glues a short pair that fits", () => {
    expect(units("Your morning is deciding your day before you are", TYPE.hook).at(-1)).toBe("you are");
  });

  it("holds for long words in every script", () => {
    for (const text of [
      "Sie kann helfen, Karies und Zahnfleischprobleme zu vermeiden.",
      "Temizlenmediğinde, diş eti hastalığına yol açabilir.",
      "Blanqueamiento: ¿causa sensibilidad o es un mito?",
      "Wybielanie zębów: czy szkliwo naprawdę cierpi?",
      "Les gencives qui saignent, est-ce grave ?",
      "هل يسبب تبييض الأسنان حساسية دائمة؟",
      "歯ぐきからの出血、放っておいて大丈夫？",
    ]) {
      expect(overflowing(text)).toEqual([]);
    }
  });

  // Every sample plan the site previews, in all eight languages.
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../web/public/dentvideo/preview");
  it.skipIf(!fs.existsSync(dir))("holds for every headline in the preview library", () => {
    const bad: string[] = [];
    for (const lang of fs.readdirSync(dir)) {
      const sub = path.join(dir, lang);
      if (!fs.statSync(sub).isDirectory()) continue;
      for (const f of fs.readdirSync(sub).filter((x) => x.endsWith(".json"))) {
        const plan = JSON.parse(fs.readFileSync(path.join(sub, f), "utf8")) as { scenes?: { text?: unknown }[] };
        for (const s of plan.scenes ?? []) if (typeof s.text === "string") bad.push(...overflowing(s.text).map((m) => `${lang}/${f}: ${m}`));
      }
    }
    expect(bad).toEqual([]);
  });
});
