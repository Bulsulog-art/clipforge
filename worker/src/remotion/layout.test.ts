import { describe, expect, it } from "vitest";
import {
  SAFE_ZONES,
  TEXT_WIDTH,
  brandTheme,
  contrastRatio,
  deepBrand,
  fitText,
  fitsOneLine,
  hue,
  hueDistance,
  hsl,
  mix,
  readableOn,
  safeFrame,
  saturation,
  scrimAlpha,
  theme,
  THEME_LIST,
  TYPE,
} from "./theme.js";
import { emphasisRuns, layoutUnits } from "./script.js";
import { SWEEP_STEP, highlightStarts, sweep } from "./animation.js";
import { photoTheme } from "./photo-overlay.js";

/**
 * Layout helpers behind the video's look: where content may sit on a phone,
 * which text colour reads on any clinic colour, how a brand colour becomes a
 * background, and how emphasis is found and swept in every script.
 */

/** A spread of real-world clinic colours, pale and dark, every hue. */
const CLINIC_COLOURS = [
  "#0E7490", "#F5C2D0", "#F2B705", "#1E3A8A", "#7C3AED", "#059669", "#AFCBE8", "#E11D48",
  "#14286E", "#2563EB", "#16A34A", "#FFFFFF", "#000000", "#808080", "#F2E8D5", "#FF6B00",
  "#00B5AD", "#C0A060", "#6B2D5C", "#FDE68A", "#93C5FD", "#D9F99D", "#111827", "#FFC0CB",
];

describe("safe frame (Reels / TikTok UI)", () => {
  const f = safeFrame(1080, 1920);

  it("keeps content out of every platform keep-out zone of a 9:16 frame", () => {
    expect(f.top).toBeGreaterThanOrEqual(1920 * SAFE_ZONES.top);
    expect(f.bottom).toBeGreaterThanOrEqual(1920 * SAFE_ZONES.bottom);
    expect(f.end).toBeGreaterThanOrEqual(1080 * SAFE_ZONES.end);
    expect(f.start).toBeGreaterThanOrEqual(1080 * SAFE_ZONES.start);
  });

  it("is deeper at the bottom (captions, audio line) than at the top, and wider on the rail side", () => {
    expect(f.bottom).toBeGreaterThan(f.top);
    expect(f.end).toBeGreaterThan(f.start);
  });

  it("puts the content's centre above the frame's, where the platform UI leaves room", () => {
    const centre = (f.top + (1920 - f.bottom)) / 2;
    expect(centre).toBeLessThan(960);
    expect(centre).toBeGreaterThan(820);
  });

  it("leaves a readable column: text width is the frame between the safe sides", () => {
    expect(TEXT_WIDTH).toBe(Math.floor(1080 - f.start - f.end));
    expect(TEXT_WIDTH).toBeGreaterThan(820);
  });

  it("scales with the frame, and gives square and landscape frames a plain even margin", () => {
    const half = safeFrame(540, 960);
    expect(half.top).toBeCloseTo(f.top / 2, 5);
    const land = safeFrame(1920, 1080);
    expect(land.start).toBe(land.end);
    expect(land.top).toBe(land.bottom);
  });

  it("fitText keeps every word inside the narrower safe column", () => {
    for (const text of ["Zahnfleischentzündungsbehandlung", "Temizlenmediğinde", "Missing spots when you brush?"]) {
      for (const size of [TYPE.hook, TYPE.display, TYPE.heading]) {
        const fitted = fitText(size, text);
        for (const w of text.split(" ")) expect(fitsOneLine(fitted, w)).toBe(true);
      }
    }
  });
});

describe("readableOn (text colour on any fill)", () => {
  it("prefers the theme's own colour when it clears the bar", () => {
    expect(readableOn("#FFB454", ["#2A0E2E"])).toBe("#2A0E2E");
  });

  it("falls back to white or near-black when the preferred colour fails", () => {
    expect(readableOn("#0B1020", ["#131A33"])).toBe("#FFFFFF");
    expect(readableOn("#F5F5F5", ["#FFFFFF"])).toBe("#0B0D10");
  });

  it("clears 4.5:1 on every clinic colour", () => {
    for (const c of CLINIC_COLOURS) expect(contrastRatio(readableOn(c), c)).toBeGreaterThanOrEqual(4.5);
  });

  it("returns the best available when nothing clears an impossible bar", () => {
    expect(readableOn("#999999", [], 21)).toBe("#0B0D10");
    expect(readableOn("#555555", [], 21)).toBe("#FFFFFF");
  });
});

describe("scrimAlpha (caption over footage)", () => {
  it("makes white clear 4.5:1 over a pure-white pixel under any brand scrim", () => {
    for (const c of CLINIC_COLOURS) {
      const scrim = brandTheme(theme("midnight"), c).background[0];
      const a = scrimAlpha("#FFFFFF", scrim, "#FFFFFF");
      expect(a).toBeLessThanOrEqual(1);
      expect(contrastRatio("#FFFFFF", mix("#FFFFFF", scrim, a))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("asks for no more than it needs (within the safety margin)", () => {
    const a = scrimAlpha("#FFFFFF", "#000000", "#FFFFFF");
    expect(contrastRatio("#FFFFFF", mix("#FFFFFF", "#000000", a - 0.06))).toBeLessThan(4.5);
  });

  it("is 1 when even a solid scrim cannot make the text readable", () => {
    expect(scrimAlpha("#FFFFFF", "#EEEEEE", "#FFFFFF")).toBe(1);
  });
});

describe("brand colour → background", () => {
  it("hsl round-trips the primaries", () => {
    expect(hsl(0, 1, 0.5)).toBe("#FF0000");
    expect(hsl(120, 1, 0.25)).toBe("#008000");
    expect(hsl(240, 1, 0.5)).toBe("#0000FF");
    expect(saturation("#808080")).toBe(0);
    expect(saturation("#FF0000")).toBeCloseTo(1, 5);
  });

  it("keeps the clinic's hue in the background (pale pink → deep raspberry, not grey)", () => {
    for (const c of ["#F5C2D0", "#AFCBE8", "#0E7490", "#7C3AED", "#E11D48"]) {
      const [from, to] = deepBrand(c);
      expect(hueDistance(from, c)).toBeLessThan(6);
      expect(hueDistance(to, c)).toBeLessThan(6);
      // Visibly coloured, not a tinted grey.
      expect(saturation(to)).toBeGreaterThanOrEqual(0.3);
    }
  });

  it("turns a yellow into warm charcoal, not olive", () => {
    const [, to] = deepBrand("#F2B705");
    expect(saturation(to)).toBeLessThan(0.3);
    expect(hue(to)).toBeGreaterThan(30);
  });

  it("gives a grey brand a neutral background", () => {
    const [from, to] = deepBrand("#808080");
    expect(saturation(from)).toBeLessThan(0.1);
    expect(saturation(to)).toBeLessThan(0.1);
  });

  it("every clinic colour yields a frame where every text role clears its bar, on photos too", () => {
    for (const base of THEME_LIST) {
      for (const c of CLINIC_COLOURS) {
        const t = brandTheme(base, c);
        for (const bg of t.background) {
          expect(contrastRatio(t.foreground, bg)).toBeGreaterThanOrEqual(7);
          expect(contrastRatio(t.accent, bg)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(t.muted, bg)).toBeGreaterThanOrEqual(3);
        }
        // The highlighter: its ink on the accent, plain and over photos.
        for (const th of [t, photoTheme(t)]) {
          expect(contrastRatio(readableOn(th.accent, [th.onAccent, th.foreground]), th.accent)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe("emphasisRuns (highlighted words)", () => {
  const on = (r: { on: boolean }[]) => r.map((x) => (x.on ? 1 : 0));

  it("marks emphasised words in Latin text, ignoring case and punctuation", () => {
    const { units } = layoutUnits("Brush for TWO minutes, twice a day.");
    expect(on(emphasisRuns(units, ["two minutes"], true))).toEqual([0, 0, 1, 1, 0, 0, 0]);
  });

  it("joins consecutive emphasised words into one run", () => {
    const runs = emphasisRuns(["Brush", "for", "two", "minutes", "daily"], ["two minutes"], true);
    expect(runs.map((r) => r.joinNext)).toEqual([false, false, true, false, false]);
  });

  it("matches a phrase as a whole, not each of its words wherever they stand", () => {
    // Arabic, logical order: "لم" also occurs on its own earlier and must stay plain.
    const text = "إذا لم ينتقل التقويم فذلك قد يعني أن الأسنان لم تتحرك كما خُطِّط لها بعد.";
    const { units } = layoutUnits(text);
    const runs = emphasisRuns(units, ["قد يعني", "لم تتحرك كما خُطِّط لها"], true);
    const lit = units.filter((_, i) => runs[i].on);
    expect(lit).toEqual(["قد", "يعني", "لم", "تتحرك", "كما", "خُطِّط", "لها"]);
    expect(runs[units.indexOf("لم")].on).toBe(false);
  });

  it("ignores Arabic diacritics when matching", () => {
    const { units } = layoutUnits("كما خُطِّط لها");
    expect(on(emphasisRuns(units, ["خطط"], true))).toEqual([0, 1, 0]);
  });

  it("treats a glued widow pair as one unit that is lit when any of its words is", () => {
    expect(on(emphasisRuns(["Here's", "a clue."], ["clue"], true))).toEqual([0, 1]);
  });

  it("marks Japanese phrases that contain an emphasis phrase, whatever the segmenter did", () => {
    const { units, spaced } = layoutUnits("知覚過敏のことが多いです。");
    expect(spaced).toBe(false);
    const runs = emphasisRuns(units, ["知覚過敏"], false);
    expect(runs.some((r) => r.on)).toBe(true);
    expect(units.filter((_, i) => runs[i].on).join("")).toContain("知覚過敏");
  });

  it("does not light a one-character Japanese unit just because an emphasis phrase contains it", () => {
    expect(on(emphasisRuns(["の", "知覚過敏"], ["知覚過敏の"], false))).toEqual([0, 1]);
  });

  it("is all off without emphasis", () => {
    expect(on(emphasisRuns(["a", "b"], undefined, true))).toEqual([0, 0]);
  });
});

describe("highlighter timing", () => {
  it("sweeps from 0 to 1, eased, after its start", () => {
    expect(sweep(0, 10)).toBe(0);
    expect(sweep(10, 10)).toBe(0);
    expect(sweep(14, 10, 9)).toBeGreaterThan(0.2);
    expect(sweep(19, 10, 9)).toBe(1);
  });

  it("starts each word once it has landed, and a run as one stroke", () => {
    const runs = [
      { on: false, joinNext: false },
      { on: true, joinNext: true },
      { on: true, joinNext: false },
      { on: false, joinNext: false },
      { on: true, joinNext: false },
    ];
    const starts = highlightStarts(runs, [10, 13, 16, 19, 22]);
    expect(starts).toEqual([undefined, 13, 13 + SWEEP_STEP, undefined, 22]);
  });
});
