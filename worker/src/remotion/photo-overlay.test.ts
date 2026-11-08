import { describe, it, expect } from "vitest";
import { THEME_LIST, brandTheme, contrastRatio, mix, theme } from "./theme.js";
import { PHOTO_LARGE_MIN, PHOTO_TEXT_MIN, composite, overlayCss, photoOverlay, photoTheme, worstPixel } from "./photo-overlay.js";
import { photoFrame } from "./background-layer.js";
import { scenePlanSchema } from "./scene-plan.js";

/**
 * Text over a photo has to clear the same bars as text over the theme
 * (theme.test.ts) on the WORST photo: a white pixel under light text, a black
 * one under dark text, on the bare frame and inside a surface card.
 */

const BRANDS = ["#0F5C5C", "#1A7F8C", "#2B4C7E", "#C0392B", "#8E44AD", "#F4D03F", "#A3E4D7", "#FFFFFF", "#111111", "#B6774F"];
const themes = [
  ...THEME_LIST.map((t) => ({ label: t.name, t })),
  ...BRANDS.map((b) => ({ label: `brand ${b}`, t: brandTheme(theme("sunrise"), b) })),
  { label: "navy + gold logo", t: brandTheme(theme("midnight"), "#2B4C7E", "#C9A44C") },
];

describe("photo overlay keeps text readable on any photo", () => {
  for (const { label, t } of themes) {
    describe(label, () => {
      const o = photoOverlay(t);
      const pt = photoTheme(t);
      const pixel = worstPixel(t);
      for (const onSurface of [false, true]) {
        const where = onSurface ? "in a card" : "on the frame";
        const bg = composite(t, o, pixel, onSurface);
        it(`body text clears ${PHOTO_TEXT_MIN}:1 ${where}`, () => {
          expect(contrastRatio(t.foreground, bg)).toBeGreaterThanOrEqual(PHOTO_TEXT_MIN);
        });
        it(`secondary text and accent clear ${PHOTO_LARGE_MIN}:1 ${where}`, () => {
          expect(contrastRatio(pt.muted, bg)).toBeGreaterThanOrEqual(PHOTO_LARGE_MIN);
          expect(contrastRatio(pt.accent, bg)).toBeGreaterThanOrEqual(PHOTO_LARGE_MIN);
        });
      }
      it("also holds for the opposite extreme pixel", () => {
        const other = pixel === "#FFFFFF" ? "#000000" : "#FFFFFF";
        expect(contrastRatio(t.foreground, composite(t, o, other))).toBeGreaterThanOrEqual(PHOTO_TEXT_MIN);
      });
      it("keeps text on an accent fill legible and the body text untouched", () => {
        expect(contrastRatio(pt.onAccent, pt.accent)).toBeGreaterThanOrEqual(PHOTO_LARGE_MIN);
        expect(pt.foreground).toBe(t.foreground);
        expect(pt.background).toEqual(t.background);
      });
      it("tints in the theme's own colour and still lets the photo through", () => {
        expect(t.background).toContain(o.color);
        expect(o.alpha).toBeLessThanOrEqual(0.97);
        expect(o.edgeAlpha).toBeLessThan(o.alpha);
      });
    });
  }

  it("is not heavier than it needs to be on the clinic's default teal", () => {
    // A photo that is all tint is a coloured card; this keeps the photo visible.
    expect(photoOverlay(brandTheme(theme("sunrise"), "#0F5C5C")).alpha).toBeLessThanOrEqual(0.75);
  });

  it("matches the browser's rgba compositing", () => {
    const o = { color: "#000000", alpha: 0.5 };
    expect(composite(theme("mono"), o, "#FFFFFF")).toBe(mix("#FFFFFF", "#000000", 0.5));
    expect(overlayCss({ color: "#0b1020", alpha: 0.8, edgeAlpha: 0.64 })).toContain("rgba(11,16,32,0.8) 12%");
  });
});

describe("photo rotation", () => {
  const total = 900;
  it("always has a photo fully up, outside the cross-fades", () => {
    for (const n of [1, 2, 3, 4]) {
      for (let f = 0; f < total; f += 7) {
        const sum = Array.from({ length: n }, (_, i) => photoFrame(i, n, f, total).opacity).reduce((a, b) => a + b, 0);
        expect(sum).toBeGreaterThanOrEqual(0.99);
      }
    }
  });
  it("shows each photo in its own slot and zooms gently", () => {
    expect(photoFrame(0, 3, 10, total).opacity).toBe(1);
    expect(photoFrame(1, 3, 10, total).opacity).toBe(0);
    expect(photoFrame(1, 3, 450, total).opacity).toBe(1);
    expect(photoFrame(2, 3, 899, total).opacity).toBe(1);
    for (const f of [0, 300, 600, 899]) {
      const { scale } = photoFrame(1, 3, f, total);
      expect(scale).toBeGreaterThanOrEqual(1.04);
      expect(scale).toBeLessThanOrEqual(1.12);
    }
  });
});

describe("plan.backgrounds", () => {
  const base = { title: "t", aspect: "9:16", theme: "midnight", scenes: [{ kind: "hook", text: "Hello there", seconds: 3 }] };
  it("is optional, and a plan without it is unchanged", () => {
    const parsed = scenePlanSchema.parse(base);
    expect("backgrounds" in parsed).toBe(false);
  });
  it("accepts library paths only", () => {
    expect(scenePlanSchema.safeParse({ ...base, backgrounds: ["/dentvideo/backgrounds/implants-03.jpg"] }).success).toBe(true);
    for (const bad of ["https://example.com/x.jpg", "/dentvideo/backgrounds/../secret.jpg", "implants-03.jpg"]) {
      expect(scenePlanSchema.safeParse({ ...base, backgrounds: [bad] }).success).toBe(false);
    }
    expect(scenePlanSchema.safeParse({ ...base, backgrounds: [] }).success).toBe(false);
    const five = Array.from({ length: 5 }, (_, i) => `/dentvideo/backgrounds/whitening-0${i + 1}.jpg`);
    expect(scenePlanSchema.safeParse({ ...base, backgrounds: five }).success).toBe(false);
  });
});
