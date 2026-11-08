import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { logoOverlayFilters } from "./logo-overlay.js";

const XY = "x=W-w-24:y=24";

describe("logoOverlayFilters", () => {
  it("keeps the original bare overlay when there is no style", () => {
    expect(logoOverlayFilters({ input: 1, position: XY, opacity: 0.9 })).toEqual([
      "[1:v]format=rgba,scale=216:-1,colorchannelmixer=aa=0.90[logo]",
      `[v_base][logo]overlay=${XY}[v]`,
    ]);
  });

  it("puts a dark mark on a white rounded chip, sized by area", () => {
    const f = logoOverlayFilters({ input: 2, position: XY, opacity: 1, style: { treatment: "light", aspect: 3 } });
    expect(f.join(";")).toContain("[2:v]format=rgba,scale=192:64");
    expect(f.join(";")).toContain("color=c=0xFFFFFF:s=");
    expect(f.join(";")).toMatch(/a='255\*lte\(hypot/);
    expect(f.at(-1)).toBe(`[v_base][logo]overlay=${XY}[v]`);
  });

  it("draws a white mark on the deep brand colour", () => {
    const f = logoOverlayFilters({ input: 1, position: XY, opacity: 1, style: { treatment: "dark", aspect: 1 }, brandHex: "1A7F8C" });
    const chip = f.find((l) => l.startsWith("color="))!;
    expect(chip).toMatch(/color=c=0x[0-9A-F]{6}:/);
    expect(chip).not.toContain("0xFFFFFF");
  });

  it("only rounds a logo that brings its own background", () => {
    const f = logoOverlayFilters({ input: 1, position: XY, opacity: 1, style: { treatment: "none", aspect: 1 } });
    expect(f.some((l) => l.startsWith("color="))).toBe(false);
    expect(f[0]).toContain("alpha(X,Y)*lte(");
  });

  it("trims transparent margins before scaling", () => {
    const f = logoOverlayFilters({
      input: 1, position: XY, opacity: 1,
      style: { treatment: "light", aspect: 2.5, crop: { x: 0.1, y: 0.05, w: 0.8, h: 0.9 } },
    });
    expect(f[0]).toContain("crop=iw*0.8:ih*0.9:iw*0.1:ih*0.05,scale=");
  });
});

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasFfmpeg)("logoOverlayFilters through ffmpeg", () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "logo-overlay-"));
    // A navy wordmark-shaped block on transparency.
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x14286E:s=300x100",
      "-vf", "format=rgba,pad=360:120:30:10:color=black@0", "-frames:v", "1", path.join(dir, "logo.png")]);
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  for (const treatment of ["light", "dark", "none"] as const) {
    it(`renders a ${treatment} chip that ffmpeg accepts and that lands where it should`, () => {
      const filters = logoOverlayFilters({
        input: 1, position: XY, opacity: 1,
        style: { treatment, aspect: 3, crop: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 } },
        brandHex: "1A7F8C",
      });
      const out = path.join(dir, `${treatment}.png`);
      execFileSync("ffmpeg", [
        "-v", "error", "-y",
        "-f", "lavfi", "-i", "color=c=0x808080:s=1080x1920:d=1",
        "-i", path.join(dir, "logo.png"),
        "-filter_complex", ["[0:v]null[v_base]", ...filters].join(";"),
        "-map", "[v]", "-frames:v", "1", out,
      ]);
      // Sample just inside the logo's top-right corner area: no longer the grey background.
      const raw = execFileSync("ffmpeg", ["-v", "error", "-i", out, "-vf", "crop=1:1:1080-24-100:60", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]);
      expect([...raw]).not.toEqual([128, 128, 128]);
    });
  }
});
