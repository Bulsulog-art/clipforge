import { describe, it, expect } from "vitest";
import { brandTheme, contrastRatio, theme } from "@/remotion/theme";

/**
 * Whatever colour a clinic picks in the preview — the teaser's colour wheel
 * allows anything — the videos stay readable: white type on the brand frame
 * and the accent both clear WCAG AA (4.5:1), on both background stops.
 * (The composition is mirrored from the worker; this pins the promise the
 * preview makes to a clinic choosing an extreme colour.)
 */
const TORTURE = {
  white: "#FFFFFF",
  veryLight: "#FFF8DC",
  pastelPink: "#F8D7E3",
  pastelBlue: "#D6E9FF",
  yellow: "#FFFF00",
  lime: "#B7FF00",
  midGrey: "#9A9A9A",
  greyLowContrast: "#777777",
  veryDark: "#050505",
  black: "#000000",
  navy: "#0A1A3F",
  red: "#FF0000",
  teal: "#0F5C5C",
};
const LOGO_ACCENTS = [undefined, "#FFD400", "#FFFFFF", "#000000", "#E11D48", "#0EA5E9"];

describe("brand colour contrast in the preview's videos", () => {
  const base = theme("midnight");
  for (const [name, hex] of Object.entries(TORTURE))
    for (const accent of LOGO_ACCENTS)
      it(`${name} ${hex}${accent ? ` with logo accent ${accent}` : ""}`, () => {
        const t = brandTheme(base, hex, accent);
        for (const stop of t.background) {
          expect(contrastRatio(t.foreground, stop), `text on ${stop}`).toBeGreaterThanOrEqual(7);
          expect(contrastRatio(t.accent, stop), `accent ${t.accent} on ${stop}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrastRatio(t.onAccent, t.accent), `onAccent on accent`).toBeGreaterThanOrEqual(4.5);
      });
});
