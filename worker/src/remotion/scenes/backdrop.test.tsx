import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { THEME_LIST, brandTheme, localizeTheme, safeFrame, theme } from "../theme.js";
import { photoPlate, photoTheme, scrimBox, scrimCss, scrimInsets } from "../photo-overlay.js";
import { PhotoBackdrop } from "../background-layer.js";
import { Backdrop } from "./primitives.js";

/**
 * The plate's arithmetic is tested in photo-overlay.test.ts. This renders
 * Backdrop itself and checks the plate is drawn where that arithmetic says:
 * inside the text block, behind it, with the insets scrimBox works out, in
 * the colour photoPlate works out, and only over photos. A change that drops
 * the insets, moves the safe padding onto the block, loses the block's
 * stacking context or draws the plate without photos fails here.
 */

const config = vi.hoisted(() => ({ width: 1080, height: 1920, fps: 30, durationInFrames: 300, id: "test" }));
vi.mock("remotion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("remotion")>();
  return { ...actual, useVideoConfig: () => config };
});

type Tag = { attrs: string; style: Record<string, string>; ariaHidden: boolean; index: number; end: number };

/** The opening <div> tags of the markup, in document order, with their inline styles. */
function divs(html: string): Tag[] {
  return [...html.matchAll(/<div([^>]*)>/g)].map((m) => {
    const attrs = m[1] ?? "";
    const css = (/style="([^"]*)"/.exec(attrs)?.[1] ?? "").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    const style: Record<string, string> = {};
    // Split on ; outside parentheses (rgba(...) and gradients hold commas, never semicolons).
    for (const decl of css.split(";")) {
      const i = decl.indexOf(":");
      if (i > 0) style[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
    return { attrs, style, ariaHidden: /aria-hidden="true"/.test(attrs), index: m.index!, end: m.index! + m[0].length };
  });
}

const px = (v: string | undefined) => {
  expect(v, "a px length").toMatch(/^-?[\d.e-]+px$/);
  return parseFloat(v!);
};

function render(t: ReturnType<typeof theme>, photos: boolean, lift?: number): string {
  return renderToStaticMarkup(
    <PhotoBackdrop.Provider value={photos}>
      <Backdrop theme={t} lift={lift}>
        <div data-probe="text">Brush twice a day</div>
      </Backdrop>
    </PhotoBackdrop.Provider>,
  );
}

const frames = [
  { label: "9:16", width: 1080, height: 1920 },
  { label: "1:1", width: 1080, height: 1080 },
  { label: "16:9", width: 1920, height: 1080 },
];
const cases = [
  { label: "sunrise, no brand", t: theme("sunrise") },
  { label: "editorial + #D97706", t: brandTheme(theme("editorial"), "#D97706") },
  { label: "Arabic, midnight + #1A7F8C", t: localizeTheme(brandTheme(theme("midnight"), "#1A7F8C"), "ar") },
  { label: "Japanese, mono", t: localizeTheme(theme("mono"), "ja") },
];

beforeEach(() => {
  Object.assign(config, { width: 1080, height: 1920 });
});

describe("Backdrop over photos draws the plate where the text block is", () => {
  for (const { label: frameLabel, width, height } of frames) {
    for (const { label, t } of cases) {
      it(`${frameLabel}, ${label}`, () => {
        Object.assign(config, { width, height });
        // Over photos the scenes are handed the photo variant of the theme (Video.tsx).
        const pt = photoTheme(t);
        const rtl = t.script === "arabic";
        const scale = width / 1080;
        const safe = safeFrame(width, height, { rtl });
        const html = render(pt, true);
        const tags = divs(html);

        // The frame is see-through, and the accent glow is not drawn over the photo.
        expect(tags[0]!.style.background).toBe("transparent");
        expect(html).not.toContain("radial-gradient");

        // Exactly one plate.
        const plates = tags.filter((d) => d.ariaHidden);
        expect(plates).toHaveLength(1);
        const plate = plates[0]!;
        const at = tags.indexOf(plate);

        // It is the first child of the text block, which is its own stacking context, so it sits under the text only.
        const block = tags[at - 1]!;
        expect(html.slice(block.end, plate.index)).toBe("");
        expect(block.style.position).toBe("relative");
        expect(block.style.isolation).toBe("isolate");
        expect(plate.style.position).toBe("absolute");
        expect(plate.style["z-index"]).toBe("-1");
        // The text comes after it, inside the same block.
        expect(html.indexOf('data-probe="text"')).toBeGreaterThan(plate.index);

        // The block fills the safe column: the safe padding sits on its parent, not on the block.
        const column = tags[at - 2]!;
        expect(px(column.style["padding-inline-start"])).toBeCloseTo(safe.start, 6);
        expect(px(column.style["padding-inline-end"])).toBeCloseTo(safe.end, 6);
        expect(px(column.style["padding-top"])).toBeCloseTo(safe.top, 6);
        expect(px(column.style["padding-bottom"])).toBeCloseTo(safe.bottom, 6);
        expect(Object.keys(block.style).filter((k) => k.startsWith("padding"))).toEqual([]);

        // Placed exactly where scrimBox puts it for this frame and direction.
        const box = scrimBox(width, safe, rtl, scale);
        const want = scrimInsets(box);
        expect(px(plate.style.top)).toBeCloseTo(want.top, 6);
        expect(px(plate.style.bottom)).toBeCloseTo(want.bottom, 6);
        expect(px(plate.style.left)).toBeCloseTo(want.left, 6);
        expect(px(plate.style.right)).toBeCloseTo(want.right, 6);
        expect(px(plate.style["border-radius"])).toBeCloseTo(box.radius, 6);

        // In the colour and opacity photoPlate works out for the colours drawn on it, solid and feathered alike.
        const color = scrimCss(photoPlate(pt));
        expect(plate.style.background).toBe(color);
        expect(plate.style["box-shadow"]).toBe(`0 0 ${box.feather}px ${box.feather}px ${color}`);
      });
    }
  }

  it("keeps a market's notice room under the block, not under the plate", () => {
    const pt = photoTheme(theme("editorial"));
    const tags = divs(render(pt, true, 300));
    const at = tags.findIndex((d) => d.ariaHidden);
    expect(px(tags[at - 1]!.style["margin-bottom"])).toBe(300);
    // The plate still hugs the block: the lift moves the block up and the plate with it.
    expect(px(tags[at]!.style.bottom)).toBeCloseTo(-scrimBox(1080, safeFrame(1080, 1920), false).pad, 6);
  });

  it("follows the Arabic column to the right: the insets differ from the left-to-right ones where the safe frame does", () => {
    const t = brandTheme(theme("sunrise"), "#1A7F8C");
    const plateOf = (th: typeof t) => divs(render(photoTheme(th), true)).find((d) => d.ariaHidden)!;
    const ltr = plateOf(t);
    const rtl = plateOf(localizeTheme(t, "ar"));
    const want = scrimInsets(scrimBox(1080, safeFrame(1080, 1920, { rtl: true }), true));
    expect(px(rtl.style.left)).toBeCloseTo(want.left, 6);
    expect(px(rtl.style.right)).toBeCloseTo(want.right, 6);
    expect(px(rtl.style.left)).not.toBeCloseTo(px(ltr.style.left), 1);
  });
});

describe("Backdrop without photos", () => {
  for (const t of THEME_LIST) {
    it(`${t.name}: no plate, the theme's own background and its glow, as before`, () => {
      const html = render(t, false);
      const tags = divs(html);
      expect(tags.some((d) => d.ariaHidden)).toBe(false);
      expect(tags[0]!.style.background).not.toBe("transparent");
      expect(tags[0]!.style.background).toContain("gradient");
      expect(html).toContain("radial-gradient");
      expect(html).toContain('data-probe="text"');
    });
  }
});
