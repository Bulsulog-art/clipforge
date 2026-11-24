import { describe, it, expect } from "vitest";
import { THEME_LIST, brandTheme, contrastRatio, mix, scrimAlpha, theme } from "../theme.js";
import { captionScrim } from "./footage-scene.js";

/**
 * A footage caption is always white (footage-scene.tsx), over a clip or, when
 * no clip was found, over the video's library photos. Its scrim has to let
 * white clear 4.5:1 on a white pixel. On the light Editorial theme without a
 * clinic colour the scrim used to be the cream background: white on cream,
 * unreadable at any opacity.
 */
describe("the scrim under a footage caption", () => {
  const cases = [
    ...THEME_LIST.map((t) => ({ label: t.name, t })),
    ...THEME_LIST.flatMap((base) =>
      ["#1A7F8C", "#1E3A8A", "#D97706", "#E91E63", "#A7D8F0"].map((b) => ({ label: `${base.name} + ${b}`, t: brandTheme(base, b) })),
    ),
  ];
  for (const { label, t } of cases) {
    it(`${label}: white caption clears 4.5:1 over a white pixel`, () => {
      const scrim = captionScrim(t);
      const alpha = scrimAlpha("#FFFFFF", scrim, "#FFFFFF");
      expect(alpha).toBeLessThan(1);
      expect(contrastRatio("#FFFFFF", mix("#FFFFFF", scrim, alpha))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("is unchanged for dark themes: the background's first stop", () => {
    for (const id of ["midnight", "sunrise", "mono", "candy"] as const) expect(captionScrim(theme(id))).toBe(theme(id).background[0]);
    expect(captionScrim(brandTheme(theme("editorial"), "#D97706"))).toBe(brandTheme(theme("editorial"), "#D97706").background[0]);
  });

  it("uses the ink colour on the light Editorial theme", () => {
    expect(captionScrim(theme("editorial"))).toBe(theme("editorial").foreground);
  });
});
