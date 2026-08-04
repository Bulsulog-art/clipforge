import { describe, it, expect } from "vitest";
import { THEMES } from "./scene-plan.js";
import {
  THEME_LIST,
  theme,
  contrastRatio,
  worstBackground,
  fitText,
  TYPE,
} from "./theme.js";

/**
 * A theme that fails contrast is not a stylistic choice, it is a video nobody
 * can read on a phone outdoors. These run on every theme so a new one cannot
 * be added without meeting the same bar.
 */

/** WCAG AA for large text. Everything we draw is large text. */
const AA_LARGE = 3.0;
/** Body copy sits smaller than headlines, so it is held to the stricter bar. */
const AA_BODY = 4.5;

describe("theme catalogue", () => {
  it("covers exactly the themes the scene plan allows", () => {
    expect(THEME_LIST.map((t) => t.id).sort()).toEqual([...THEMES].sort());
  });

  it("looks up by id", () => {
    for (const id of THEMES) expect(theme(id).id).toBe(id);
  });

  it("throws on an unknown id rather than rendering something wrong", () => {
    expect(() => theme("vaporwave" as never)).toThrow(/unknown theme/);
  });

  it("gives every theme a name a person could choose from", () => {
    for (const t of THEME_LIST) expect(t.name.length).toBeGreaterThan(2);
  });
});

describe("every theme is readable", () => {
  for (const t of THEME_LIST) {
    describe(t.name, () => {
      const bg = worstBackground(t);

      it("body text clears AA against the background", () => {
        expect(contrastRatio(t.foreground, bg)).toBeGreaterThanOrEqual(AA_BODY);
      });

      it("secondary text clears AA-large against the background", () => {
        expect(contrastRatio(t.muted, bg)).toBeGreaterThanOrEqual(AA_LARGE);
      });

      it("the accent is legible as text on the background", () => {
        expect(contrastRatio(t.accent, bg)).toBeGreaterThanOrEqual(AA_LARGE);
      });

      it("text on an accent fill is legible", () => {
        expect(contrastRatio(t.onAccent, t.accent)).toBeGreaterThanOrEqual(AA_LARGE);
      });

      it("secondary text is quieter than primary, not louder", () => {
        expect(contrastRatio(t.muted, bg)).toBeLessThan(contrastRatio(t.foreground, bg));
      });
    });
  }
});

describe("contrast maths", () => {
  it("black on white is the maximum 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("a colour against itself is 1:1", () => {
    expect(contrastRatio("#6C8CFF", "#6C8CFF")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#123456", "#EEEEEE")).toBeCloseTo(
      contrastRatio("#EEEEEE", "#123456"), 5);
  });

  it("understands three-digit hex", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 1);
  });
});

describe("type fitting", () => {
  it("leaves short lines at full size", () => {
    expect(fitText(TYPE.hook, "Nobody tells you this")).toBe(TYPE.hook);
  });

  it("steps long lines down", () => {
    const long = "This is a considerably longer hook that will not fit on one line at full size";
    expect(fitText(TYPE.hook, long)).toBeLessThan(TYPE.hook);
  });

  it("never shrinks past the point where shrinking is the problem", () => {
    const absurd = "x".repeat(400);
    expect(fitText(TYPE.hook, absurd)).toBeGreaterThanOrEqual(Math.round(TYPE.hook * 0.58));
  });

  it("shrinks monotonically with length", () => {
    const a = fitText(TYPE.body, "x".repeat(60));
    const b = fitText(TYPE.body, "x".repeat(120));
    expect(b).toBeLessThanOrEqual(a);
  });
});

describe("type scale", () => {
  it("keeps the hierarchy that makes a frame readable at a glance", () => {
    expect(TYPE.statValue).toBeGreaterThan(TYPE.hook);
    expect(TYPE.hook).toBeGreaterThan(TYPE.heading);
    expect(TYPE.heading).toBeGreaterThan(TYPE.body);
    expect(TYPE.body).toBeGreaterThan(TYPE.label);
  });

  it("never goes below what is legible on a phone", () => {
    for (const size of Object.values(TYPE)) expect(size).toBeGreaterThanOrEqual(30);
  });
});
