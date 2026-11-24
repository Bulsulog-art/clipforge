import { describe, it, expect } from "vitest";
import { THEME_LIST, brandTheme, contrastRatio, localizeTheme, mix, safeFrame, theme } from "./theme.js";
import {
  PHOTO_LARGE_MIN,
  PHOTO_MARGIN,
  PHOTO_TEXT_MIN,
  PHOTO_TINT_MAX,
  SCRIM_SHAPE,
  composite,
  overlayCss,
  photoCover,
  photoOverlay,
  photoPlate,
  photoTheme,
  plateAlphaAt,
  scrimBox,
  scrimCss,
  scrimInsets,
  worstPixel,
} from "./photo-overlay.js";
import { photoFrame } from "./background-layer.js";
import { scenePlanSchema } from "./scene-plan.js";

/**
 * Text over a photo has to clear the same bars as text over the theme
 * (theme.test.ts) on the WORST photo: a white pixel under light text, a black
 * one under dark text, under the light wash over the whole photo and the
 * plate behind the text block, on the bare plate and inside a surface card.
 */

/** The clinic colours the brief names: teal, navy, amber, pink, pale blue. */
const CLINIC = ["#1A7F8C", "#1E3A8A", "#D97706", "#E91E63", "#A7D8F0"];
const BRANDS = ["#0F5C5C", "#2B4C7E", "#C0392B", "#8E44AD", "#F4D03F", "#A3E4D7", "#FFFFFF", "#111111", "#B6774F"];
const themes = [
  // Every theme as it ships (no brand colour), then every theme in every clinic colour.
  ...THEME_LIST.map((t) => ({ label: t.name, t })),
  ...THEME_LIST.flatMap((base) => CLINIC.map((b) => ({ label: `${base.name} + brand ${b}`, t: brandTheme(base, b) }))),
  ...BRANDS.map((b) => ({ label: `brand ${b}`, t: brandTheme(theme("sunrise"), b) })),
  { label: "navy + gold logo", t: brandTheme(theme("midnight"), "#2B4C7E", "#C9A44C") },
  // Arabic and Japanese change the fonts, never the colours; held to the same bars all the same.
  { label: "Arabic, editorial + brand #D97706", t: localizeTheme(brandTheme(theme("editorial"), "#D97706"), "ar") },
  { label: "Japanese, sunrise + brand #1A7F8C", t: localizeTheme(brandTheme(theme("sunrise"), "#1A7F8C"), "ja") },
];

const alphaOf = (css: string) => Number(/rgba\(\d+,\d+,\d+,([\d.]+)\)/.exec(css)?.[1]);

describe("photo overlay keeps text readable on any photo", () => {
  for (const { label, t } of themes) {
    describe(label, () => {
      const o = photoOverlay(t);
      const pt = photoTheme(t);
      const pixel = worstPixel(t);
      for (const onSurface of [false, true]) {
        const where = onSurface ? "in a card" : "on the plate";
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
        expect(contrastRatio(t.foreground, composite(t, o, other, true))).toBeGreaterThanOrEqual(PHOTO_TEXT_MIN);
      });
      it("keeps text on an accent fill legible and the body text untouched", () => {
        expect(contrastRatio(pt.onAccent, pt.accent)).toBeGreaterThanOrEqual(PHOTO_LARGE_MIN);
        expect(pt.foreground).toBe(t.foreground);
        expect(pt.background).toEqual(t.background);
      });
      it(`washes the whole photo at no more than ${PHOTO_TINT_MAX}, in the theme's own colour`, () => {
        expect(t.background).toContain(o.color);
        expect(o.alpha).toBeGreaterThanOrEqual(0.35);
        expect(o.alpha).toBeLessThanOrEqual(PHOTO_TINT_MAX);
        // What the browser is actually handed.
        expect(alphaOf(overlayCss(o))).toBeLessThanOrEqual(PHOTO_TINT_MAX);
        expect(alphaOf(scrimCss(o))).toBe(o.scrim);
      });
      it("needs the plate: the wash alone is too light to carry text on a worst-case photo", () => {
        expect(contrastRatio(t.foreground, composite(t, { color: o.color, alpha: o.alpha }, pixel))).toBeLessThan(PHOTO_TEXT_MIN);
        expect(o.scrim).toBeGreaterThan(0);
        expect(o.scrim).toBeLessThanOrEqual(0.97);
      });
      it("draws the plate for the colours on screen, and the wash the photo layer draws", () => {
        // Backdrop only sees photoTheme(t) (Video.tsx); BackgroundLayer sees t.
        const plate = photoPlate(pt);
        expect(plate).toEqual(o);
        const bg = composite(pt, plate, pixel, true);
        expect(contrastRatio(pt.foreground, bg)).toBeGreaterThanOrEqual(PHOTO_TEXT_MIN);
        expect(contrastRatio(pt.accent, bg)).toBeGreaterThanOrEqual(PHOTO_LARGE_MIN);
      });
    });
  }

  it(`keeps ${PHOTO_MARGIN} of extra cover over the photo behind the text, as the full-frame tint did`, () => {
    for (const { label, t } of themes) {
      const pt = photoTheme(t);
      const o = photoOverlay(t);
      const pixel = worstPixel(t);
      // The least plate on which every colour drawn clears its bar, found here independently.
      const passes = (scrim: number) =>
        [false, true].every((onSurface) => {
          const bg = composite(pt, { color: o.color, alpha: o.alpha, scrim }, pixel, onSurface);
          return (
            contrastRatio(pt.foreground, bg) >= PHOTO_TEXT_MIN &&
            contrastRatio(pt.muted, bg) >= PHOTO_LARGE_MIN &&
            contrastRatio(pt.accent, bg) >= PHOTO_LARGE_MIN
          );
        });
      let least = 0;
      while (!passes(least)) least = Math.round((least + 0.01) * 100) / 100;
      expect(o.scrim, label).toBeLessThan(0.97);
      expect(photoCover(o.scrim) - photoCover(least), label).toBeGreaterThanOrEqual(PHOTO_MARGIN - 1e-9);
      // The same margin put on the plate alone falls short: under the wash it is worth only 60% of itself.
      expect(photoCover(least + PHOTO_MARGIN) - photoCover(least), label).toBeLessThan(PHOTO_MARGIN - 0.01);
    }
  });

  it("is not heavier than it needs to be on the clinic's default teal", () => {
    // Behind the text the photo still shows through the wash and the plate together.
    const o = photoOverlay(brandTheme(theme("sunrise"), "#0F5C5C"));
    expect(photoCover(o.scrim, o.alpha)).toBeCloseTo(1 - (1 - o.alpha) * (1 - o.scrim), 9);
    expect(photoCover(o.scrim, o.alpha)).toBeLessThanOrEqual(0.75);
  });

  it("matches the browser's rgba compositing, layer over layer", () => {
    const o = { color: "#000000", alpha: 0.5 };
    expect(composite(theme("mono"), o, "#FFFFFF")).toBe(mix("#FFFFFF", "#000000", 0.5));
    expect(composite(theme("mono"), { ...o, scrim: 0.5 }, "#FFFFFF")).toBe(mix(mix("#FFFFFF", "#000000", 0.5), "#000000", 0.5));
    expect(overlayCss({ color: "#0b1020", alpha: 0.4, scrim: 0.5 })).toBe("rgba(11,16,32,0.4)");
    expect(scrimCss({ color: "#0b1020", alpha: 0.4, scrim: 0.5 })).toBe("rgba(11,16,32,0.5)");
  });
});

describe("the plate covers the text block", () => {
  const frames = [
    { label: "9:16", width: 1080, height: 1920 },
    { label: "1:1", width: 1080, height: 1080 },
    { label: "16:9", width: 1920, height: 1080 },
  ];
  for (const { label, width, height } of frames) {
    for (const rtl of [false, true]) {
      it(`${label} ${rtl ? "right to left" : "left to right"}: solid over the whole text column, with room to spare, never cut off by the frame`, () => {
        const scale = width / 1080;
        const safe = safeFrame(width, height, { rtl });
        const box = scrimBox(width, safe, rtl, scale);
        // The block fills the column between the safe paddings.
        expect(box.column.right - box.column.left).toBeCloseTo(width - safe.start - safe.end, 6);
        // Solid at least `pad` past the column on both sides, and at least as far as any line slides in from.
        expect(box.pad).toBeGreaterThanOrEqual(34 * scale);
        expect(box.plate.left).toBeLessThanOrEqual(box.column.left - box.pad + 1e-9);
        expect(box.plate.right).toBeGreaterThanOrEqual(box.column.right + box.pad - 1e-9);
        // Centred on the frame.
        expect(box.plate.left).toBeCloseTo(width - box.plate.right, 6);
        // Never a soft edge the frame cuts off half-way: either the fade dies out inside the frame (a card)...
        const edge = box.plate.left;
        if (edge >= 0) {
          expect(plateAlphaAt(edge, box.feather, 1)).toBeLessThan(0.03);
        } else {
          // ...or the plate runs past both edges, its rounded corners and its fade off-frame (a band).
          expect(box.plate.left + box.radius + box.feather).toBeLessThanOrEqual(1e-9);
          expect(box.plate.right - box.radius - box.feather).toBeGreaterThanOrEqual(width - 1e-9);
        }
        // The offsets Backdrop draws it with: outward on every side of the block.
        const inset = scrimInsets(box);
        for (const side of [inset.top, inset.bottom, inset.left, inset.right]) expect(side).toBeLessThanOrEqual(-box.pad + 1e-9);
        expect(box.column.left + inset.left).toBeCloseTo(box.plate.left, 6);
        expect(box.column.right - inset.right).toBeCloseTo(box.plate.right, 6);
      });
    }
  }

  it("floats as a card where the frame leaves room for its fade, and runs edge to edge where it does not", () => {
    const shape = (width: number, height: number, rtl: boolean) => {
      const box = scrimBox(width, safeFrame(width, height, { rtl }), rtl, width / 1080);
      return box.plate.left >= 0 ? "card" : "band";
    };
    // The Arabic portrait frame keeps clear of the rail on both sides: room for the whole fade.
    expect(shape(1080, 1920, true)).toBe("card");
    // A left-to-right portrait frame starts its lines 81 px from the edge: the fade would be cut off at about half strength.
    expect(shape(1080, 1920, false)).toBe("band");
    expect(shape(1080, 1080, false)).toBe("band");
    expect(shape(1920, 1080, false)).toBe("band");
    // What the band replaces: the solid part 37 px in, still at more than half its opacity where the frame cuts it.
    const ltr = safeFrame(1080, 1920);
    const cut = ltr.start - SCRIM_SHAPE.pad;
    expect(plateAlphaAt(cut, SCRIM_SHAPE.feather, 1)).toBeGreaterThan(0.5);
  });

  it("follows an Arabic block to the right, where its lines start", () => {
    // In a dir=rtl frame the safe padding's inline start is the right edge.
    const width = 1080;
    const safe = { top: 250, bottom: 420, start: 60, end: 140 };
    const ltr = scrimBox(width, safe, false);
    const rtl = scrimBox(width, safe, true);
    expect(ltr.column).toEqual({ left: 60, right: width - 140 });
    expect(rtl.column).toEqual({ left: 140, right: width - 60 });
    // The right-to-left column is the left-to-right one mirrored, and the plate still covers it.
    expect(rtl.column.left).toBe(width - ltr.column.right);
    expect(rtl.plate.right).toBeGreaterThanOrEqual(rtl.column.right + rtl.pad);
    expect(rtl.plate.left).toBeLessThanOrEqual(rtl.column.left - rtl.pad);
    // The real Arabic frame keeps clear of the action rail on both sides (theme.ts safeFrame).
    const ar = scrimBox(1080, safeFrame(1080, 1920, { rtl: true }), true);
    expect(ar.column.right).toBeCloseTo(1080 - safeFrame(1080, 1920, { rtl: true }).start, 6);
    expect(ar.plate.right).toBeGreaterThanOrEqual(ar.column.right + ar.pad);
  });

  it("fades out past the solid part without a visible step", () => {
    const f = SCRIM_SHAPE.feather;
    const a = 0.5;
    // Exactly the computed opacity over the text block and its margin.
    expect(plateAlphaAt(-1, f, a)).toBe(a);
    expect(plateAlphaAt(0, f, a)).toBe(a);
    // Just past the edge it is within 3% of that, then falls away to nothing.
    expect(plateAlphaAt(0.5, f, a)).toBeGreaterThan(0.97 * a);
    expect(plateAlphaAt(f, f, a)).toBeCloseTo(a / 2, 3);
    expect(plateAlphaAt(2 * f, f, a)).toBeLessThan(0.03 * a);
    for (let d = 0; d < 3 * f; d++) expect(plateAlphaAt(d + 1, f, a)).toBeLessThanOrEqual(plateAlphaAt(d, f, a));
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
