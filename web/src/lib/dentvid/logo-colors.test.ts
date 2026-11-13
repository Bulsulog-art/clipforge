import { describe, it, expect } from "vitest";
import { accentFor, isDecodableImage, logoColors } from "./logo-colors";

describe("a chosen logo file that is not a picture", () => {
  const blob = new Blob(["this is not an image"], { type: "image/png" });

  it("is refused when the browser cannot decode it (a renamed document keeps the old logo)", async () => {
    expect(await isDecodableImage(blob, async () => Promise.reject(new Error("The source image could not be decoded.")))).toBe(false);
    expect(await isDecodableImage(blob, async () => ({ width: 0, height: 0 }))).toBe(false);
  });

  it("is accepted when it decodes, and the bitmap is released", async () => {
    let closed = false;
    expect(await isDecodableImage(blob, async () => ({ width: 400, height: 200, close: () => (closed = true) }))).toBe(true);
    expect(closed).toBe(true);
  });

  it("gives a browser without createImageBitmap the benefit of the doubt", async () => {
    expect(await isDecodableImage(blob, undefined)).toBe(true);
  });
});

type Rgba = [number, number, number, number];

function image(w: number, h: number, bg: Rgba, shapes: { x: number; y: number; w: number; h: number; c: Rgba }[] = []) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(bg, i * 4);
  for (const s of shapes) for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) data.set(s.c, (y * w + x) * 4);
  return [data, w, h] as const;
}

const CLEAR: Rgba = [0, 0, 0, 0];
const NAVY: Rgba = [20, 40, 110, 255];
const GOLD: Rgba = [222, 170, 40, 255];
const WHITE: Rgba = [255, 255, 255, 255];

describe("logoColors", () => {
  it("suggests the navy of a dark logo and draws it on a light chip", () => {
    const out = logoColors(...image(120, 40, CLEAR, [{ x: 0, y: 0, w: 80, h: 40, c: NAVY }, { x: 80, y: 0, w: 30, h: 40, c: GOLD }]));
    expect(out.suggested).toBe("#14286e");
    expect(out.swatches).toEqual(["#14286e", "#deaa28"]);
    expect(out.treatment).toBe("light");
  });

  it("has nothing to suggest for a white logo, which goes on a dark chip", () => {
    const out = logoColors(...image(100, 40, CLEAR, [{ x: 10, y: 10, w: 80, h: 20, c: WHITE }]));
    expect(out.suggested).toBeUndefined();
    expect(out.swatches).toEqual([]);
    expect(out.treatment).toBe("dark");
  });

  it("takes a solid background as the brand and draws no chip", () => {
    const out = logoColors(...image(100, 100, [26, 127, 140, 255], [{ x: 30, y: 30, w: 40, h: 40, c: WHITE }]));
    expect(out.treatment).toBe("none");
    expect(out.background).toBe("#1a7f8c");
    expect(out.suggested).toBe("#1a7f8c");
  });

  it("finds the second colour and trims transparent margins", () => {
    const out = logoColors(...image(200, 100, CLEAR, [{ x: 20, y: 20, w: 60, h: 40, c: NAVY }, { x: 80, y: 20, w: 20, h: 40, c: GOLD }]));
    expect(out.accent).toBe("#deaa28");
    expect(out.crop).toEqual({ x: 0.1, y: 0.2, w: 0.4, h: 0.4 });
    expect(out.aspect).toBeCloseTo(2, 5);
  });

  it("picks the logo colour that differs from the brand as the accent", () => {
    const colors = { suggested: "#14286e", accent: "#deaa28" };
    expect(accentFor("#14286e", colors)).toBe("#deaa28");
    expect(accentFor("#c81414", colors)).toBe("#14286e");
    expect(accentFor("#14286e", { suggested: "#14286e" })).toBeUndefined();
  });

  it("does not suggest a grey", () => {
    const out = logoColors(...image(60, 20, CLEAR, [{ x: 0, y: 0, w: 60, h: 20, c: [120, 120, 125, 255] }]));
    expect(out.suggested).toBeUndefined();
    expect(out.swatches).toHaveLength(1);
  });
});
