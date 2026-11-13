import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyseLogo, analyseLogoPixels, brandFromLogo, dominantColours, logoStyleOf, readyLogo, sniffLogo, type Rgba } from "./logo.js";
import { hueDistance } from "../remotion/theme.js";

/** A synthetic logo: a background, and rectangles of colour drawn on it. */
function image(
  w: number,
  h: number,
  bg: [number, number, number, number],
  shapes: { x: number; y: number; w: number; h: number; c: [number, number, number, number] }[] = [],
): Rgba {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(bg, i * 4);
  for (const s of shapes)
    for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) data.set(s.c, (y * w + x) * 4);
  return { width: w, height: h, data };
}

const CLEAR: [number, number, number, number] = [0, 0, 0, 0];
const NAVY: [number, number, number, number] = [20, 40, 110, 255];
const GOLD: [number, number, number, number] = [222, 170, 40, 255];
const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const TEAL: [number, number, number, number] = [26, 127, 140, 255];

const near = (hex: string | undefined, rgb: number[], tol = 18) => {
  expect(hex).toBeDefined();
  const v = [1, 3, 5].map((i) => parseInt(hex!.slice(i, i + 2), 16));
  v.forEach((c, i) => expect(Math.abs(c - rgb[i])).toBeLessThanOrEqual(tol));
};

describe("analyseLogoPixels", () => {
  it("a dark mark on transparency: light chip, its colour as the brand", () => {
    const a = analyseLogoPixels(image(160, 50, CLEAR, [{ x: 10, y: 10, w: 140, h: 30, c: NAVY }]));
    expect(a.hasTransparency).toBe(true);
    expect(a.background).toBeNull();
    expect(a.treatment).toBe("light");
    expect(a.luminance).toBeLessThan(0.1);
    near(a.brandColor, [20, 40, 110]);
    expect(a.aspect).toBeCloseTo(3.2, 5);
  });

  it("a white mark on transparency: dark chip, no brand colour to take", () => {
    const a = analyseLogoPixels(image(160, 50, CLEAR, [{ x: 10, y: 10, w: 140, h: 30, c: WHITE }]));
    expect(a.treatment).toBe("dark");
    expect(a.luminance).toBeGreaterThan(0.9);
    expect(a.palette).toEqual([]);
    expect(a.brandColor).toBeUndefined();
  });

  it("a pale yellow mark on transparency also needs the dark chip", () => {
    const a = analyseLogoPixels(image(100, 100, CLEAR, [{ x: 20, y: 20, w: 60, h: 60, c: [255, 220, 60, 255] }]));
    expect(a.treatment).toBe("dark");
  });

  it("a wordmark on its own solid block: no chip, and the block is the brand", () => {
    const a = analyseLogoPixels(image(140, 40, TEAL, [{ x: 20, y: 12, w: 100, h: 16, c: WHITE }]));
    expect(a.hasTransparency).toBe(false);
    near(a.background ?? undefined, [26, 127, 140], 4);
    expect(a.treatment).toBe("none");
    near(a.brandColor, [26, 127, 140]);
    // The mark is the white text, not the block it sits on.
    expect(a.luminance).toBeGreaterThan(0.9);
  });

  it("a JPEG-style logo on white keeps the white as its own background and ignores it for colour", () => {
    const a = analyseLogoPixels(image(100, 100, WHITE, [{ x: 25, y: 25, w: 50, h: 50, c: [200, 30, 60, 255] }]));
    expect(a.treatment).toBe("none");
    expect(a.background).toBe("#FFFFFF");
    expect(a.palette).toHaveLength(1);
    near(a.brandColor, [200, 30, 60]);
  });

  it("two-colour logo: the larger saturated colour is the brand, the other the accent", () => {
    const a = analyseLogoPixels(
      image(200, 60, CLEAR, [
        { x: 0, y: 0, w: 120, h: 60, c: NAVY },
        { x: 130, y: 10, w: 50, h: 40, c: GOLD },
      ]),
    );
    near(a.brandColor, [20, 40, 110]);
    near(a.accentColor, [222, 170, 40]);
    expect(a.palette.map((c) => c.share).reduce((s, x) => s + x, 0)).toBeCloseTo(1, 5);
  });

  it("a grey and black logo has no brand colour — greys are not characterful", () => {
    const a = analyseLogoPixels(
      image(100, 40, CLEAR, [
        { x: 0, y: 0, w: 60, h: 40, c: [110, 110, 110, 255] },
        { x: 60, y: 0, w: 40, h: 40, c: [0, 0, 0, 255] },
      ]),
    );
    expect(a.brandColor).toBeUndefined();
    expect(a.palette).toHaveLength(1); // the black is ink and is left out
    expect(a.treatment).toBe("light");
  });

  it("prefers a saturated colour over a larger dull one", () => {
    const a = analyseLogoPixels(
      image(100, 40, CLEAR, [
        { x: 0, y: 0, w: 70, h: 40, c: [120, 125, 130, 255] },
        { x: 70, y: 0, w: 30, h: 40, c: [0, 160, 120, 255] },
      ]),
    );
    near(a.brandColor, [0, 160, 120]);
  });

  it("ignores a speck too small to be the brand", () => {
    const a = analyseLogoPixels(
      image(100, 100, CLEAR, [
        { x: 0, y: 0, w: 100, h: 60, c: NAVY },
        { x: 0, y: 99, w: 3, h: 1, c: [255, 0, 0, 255] },
      ]),
    );
    near(a.brandColor, [20, 40, 110]);
    expect(a.accentColor).toBeUndefined();
  });

  it("trims transparent margins so the visible logo is what gets sized", () => {
    // 200x100 image, the mark only in the left 100x50 block.
    const a = analyseLogoPixels(image(200, 100, CLEAR, [{ x: 20, y: 25, w: 80, h: 50, c: NAVY }]));
    expect(a.aspect).toBe(2);
    expect(a.crop).toBeDefined();
    expect(a.crop!.x).toBeCloseTo(0.085, 2);
    expect(a.crop!.w).toBeCloseTo(0.43, 2);
    // The visible block is 80x50 plus 3px padding each side: ~86x56.
    expect(a.contentAspect).toBeCloseTo(86 / 56, 1);
    expect(logoStyleOf(a)).toEqual({ treatment: "light", aspect: expect.closeTo(86 / 56, 1), crop: a.crop });
  });

  it("does not crop a logo that already fills its image, nor one with its own background", () => {
    expect(analyseLogoPixels(image(100, 50, NAVY)).crop).toBeUndefined();
    const full = analyseLogoPixels(image(100, 50, CLEAR, [{ x: 0, y: 0, w: 100, h: 50, c: NAVY }]));
    expect(full.crop).toBeUndefined();
    expect(analyseLogoPixels(image(140, 40, TEAL, [{ x: 20, y: 12, w: 30, h: 16, c: WHITE }])).crop).toBeUndefined();
  });

  it("is deterministic", () => {
    const img = image(120, 60, CLEAR, [
      { x: 0, y: 0, w: 60, h: 60, c: NAVY },
      { x: 60, y: 0, w: 60, h: 60, c: GOLD },
    ]);
    expect(analyseLogoPixels(img)).toEqual(analyseLogoPixels(img));
  });
});

describe("dominantColours", () => {
  it("separates distinct colours and orders them by share", () => {
    const px = [...Array(300).fill([200, 20, 20]), ...Array(100).fill([20, 20, 200])];
    const out = dominantColours(px, 5);
    expect(out).toHaveLength(2);
    expect(out[0].share).toBeCloseTo(0.75, 5);
    expect(out[0].hex).toBe("#C81414");
  });
  it("is empty for no pixels", () => {
    expect(dominantColours([])).toEqual([]);
  });
});

describe("brandFromLogo", () => {
  const analysis = { brandColor: "#14286E", accentColor: "#DEAA28", palette: [] };
  it("keeps the clinic's own colour", () => {
    expect(brandFromLogo("#00AA55", analysis).brandColor).toBe("00AA55");
  });
  it("fills an empty brand colour from the logo", () => {
    expect(brandFromLogo(undefined, analysis)).toEqual({ brandColor: "14286E", brandAccent: "DEAA28" });
  });
  it("uses the logo's main colour as the accent when the clinic picked a different hue", () => {
    const out = brandFromLogo("C81414", analysis);
    expect(out.brandAccent).toBe("14286E");
  });
  it("adds no accent of the same hue as the brand", () => {
    const out = brandFromLogo("1A3080", { brandColor: "#14286E", palette: [] });
    expect(out.brandAccent).toBeUndefined();
    expect(hueDistance("#1A3080", "#14286E")).toBeLessThan(25);
  });
  it("does nothing without a logo or colour", () => {
    expect(brandFromLogo(undefined, undefined)).toEqual({ brandColor: undefined });
    expect(brandFromLogo(undefined, { palette: [] })).toEqual({ brandColor: undefined });
  });
});

/** Real files through the real decoder, made by ffmpeg itself. */
const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasFfmpeg)("analyseLogo (ffmpeg decode)", () => {
  let dir: string;
  const make = (name: string, args: string[]) => {
    const out = path.join(dir, name);
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args, "-frames:v", "1", out]);
    return out;
  };
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "logo-test-"));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("reads a dark mark on a transparent PNG", async () => {
    const file = make("dark.png", [
      "-f", "lavfi", "-i", "color=c=0x14286E:s=480x100",
      "-vf", "format=rgba,pad=600:200:60:50:color=black@0",
    ]);
    const a = await analyseLogo(file);
    expect(a.hasTransparency).toBe(true);
    expect(a.treatment).toBe("light");
    expect(a.aspect).toBeCloseTo(3, 5);
    near(a.brandColor, [20, 40, 110], 10);
  });

  it("reads a white mark on a transparent PNG", async () => {
    const file = make("white.png", [
      "-f", "lavfi", "-i", "color=c=white:s=240x240",
      "-vf", "format=rgba,pad=400:400:80:80:color=black@0",
    ]);
    const a = await analyseLogo(file);
    expect(a.treatment).toBe("dark");
    expect(a.aspect).toBe(1);
  });

  it("reads a square JPEG with its own solid background", async () => {
    const file = make("solid.jpg", [
      "-f", "lavfi", "-i", "color=c=0x1A7F8C:s=300x300",
      "-vf", "drawbox=x=90:y=90:w=120:h=120:color=white:t=fill",
    ]);
    const a = await analyseLogo(file);
    expect(a.hasTransparency).toBe(false);
    expect(a.treatment).toBe("none");
    near(a.background ?? undefined, [26, 127, 140], 10);
    near(a.brandColor, [26, 127, 140], 10);
  });

  it("fails loudly on something that is not an image", async () => {
    const file = path.join(dir, "nope.png");
    fs.writeFileSync(file, "not an image");
    await expect(analyseLogo(file)).rejects.toThrow();
  });
});

describe("sniffLogo", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);
  it("knows PNG, JPEG and WebP by their first bytes, and nothing else", () => {
    expect(sniffLogo(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe("png");
    expect(sniffLogo(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffLogo(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("webp");
    // A WAV is RIFF too.
    expect(sniffLogo(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull();
    expect(sniffLogo(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffLogo(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(sniffLogo(new TextEncoder().encode("<!DOCTYPE html>"))).toBeNull();
    expect(sniffLogo(bytes())).toBeNull();
  });
});

describe("readyLogo", () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ready-logo-"));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  const never = async (): Promise<never> => {
    throw new Error("must not be analysed");
  };

  it("writes nothing for bytes that are not an image (an HTML page saved as logo.png)", async () => {
    const r = await readyLogo(new TextEncoder().encode("<html>not a logo</html>"), dir, never);
    expect(r).toEqual({ ok: false, reason: "not-an-image" });
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("drops a file with image magic bytes that does not decode, and removes it", async () => {
    const r = await readyLogo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]), dir, async () => {
      throw new Error("Invalid data found when processing input");
    });
    expect(r).toMatchObject({ ok: false, reason: "undecodable" });
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it.skipIf(!hasFfmpeg)("names the file by what it is: a JPEG uploaded as logo.png is kept as logo.jpg", async () => {
    const src = path.join(dir, "src.jpg");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x1A7F8C:s=120x60", "-frames:v", "1", src]);
    const bytes = fs.readFileSync(src);
    fs.rmSync(src);
    const r = await readyLogo(bytes, dir);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(path.basename(r.file)).toBe("logo.jpg");
    expect(r.analysis.aspect).toBeCloseTo(2, 5);
    fs.rmSync(r.file);
  });

  it.skipIf(!hasFfmpeg)("drops a truncated PNG ffmpeg cannot decode", async () => {
    const src = path.join(dir, "src.png");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=64x64", "-frames:v", "1", src]);
    const bytes = fs.readFileSync(src).subarray(0, 20);
    fs.rmSync(src);
    const r = await readyLogo(bytes, dir);
    expect(r).toMatchObject({ ok: false, reason: "undecodable" });
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
