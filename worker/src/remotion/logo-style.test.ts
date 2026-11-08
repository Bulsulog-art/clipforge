import { describe, it, expect } from "vitest";
import { chipLook, logoBox, CORNER_LOGO, CTA_LOGO, logoStyleSchema, signOffTreatment } from "./logo-style.js";
import { brandTheme, theme } from "./theme.js";

describe("logoBox", () => {
  it("gives wide and square logos the same visual weight", () => {
    const square = logoBox(1, CORNER_LOGO);
    const wide = logoBox(3, CORNER_LOGO);
    expect(square).toEqual({ width: 110, height: 110 });
    expect((wide.width * wide.height) / (square.width * square.height)).toBeCloseTo(1, 1);
    expect(wide.width / wide.height).toBeCloseTo(3, 1);
  });

  it("caps a very wide wordmark by width and a tall emblem by height", () => {
    const sliver = logoBox(12, CORNER_LOGO);
    expect(sliver.width).toBe(CORNER_LOGO.maxWidth);
    const tall = logoBox(0.4, CORNER_LOGO);
    expect(tall.height).toBe(CORNER_LOGO.maxHeight);
    expect(tall.width).toBe(44);
  });

  it("is larger on the sign-off than in the corner", () => {
    for (const a of [0.5, 1, 3.5, 8]) expect(logoBox(a, CTA_LOGO).height).toBeGreaterThan(logoBox(a, CORNER_LOGO).height);
  });

  it("survives a nonsense aspect", () => {
    const box = logoBox(0, CORNER_LOGO);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

describe("chipLook", () => {
  const t = brandTheme(theme("sunrise"), "#1A7F8C");
  it("draws a dark mark on a light chip", () => {
    expect(chipLook("light", t, 80).background).toBe("#FFFFFF");
  });
  it("draws a white mark on the deep brand colour", () => {
    expect(chipLook("dark", t, 80).background).toBe(t.background[0]);
  });
  it("adds nothing around a logo that has its own background", () => {
    const c = chipLook("none", t, 80);
    expect(c.padX + c.padY).toBe(0);
    expect(c.radius).toBeGreaterThan(0);
  });
  it("pads in proportion to the logo, within bounds", () => {
    expect(chipLook("light", t, 40).padY).toBe(12);
    expect(chipLook("light", t, 100).padY).toBe(24);
    expect(chipLook("light", t, 400).padY).toBe(30);
  });
});

describe("signOffTreatment", () => {
  it("draws a white mark bare on a dark sign-off", () => {
    expect(signOffTreatment("dark", brandTheme(theme("sunrise"), "#1A7F8C"))).toBe("bare");
  });
  it("keeps the dark chip when the frame is light", () => {
    expect(signOffTreatment("dark", theme("editorial"))).toBe("dark");
  });
  it("leaves other treatments alone", () => {
    expect(signOffTreatment("light", theme("midnight"))).toBe("light");
    expect(signOffTreatment("none", theme("midnight"))).toBe("none");
  });
});

describe("logoStyleSchema", () => {
  it("accepts what the analysis produces and rejects junk", () => {
    expect(logoStyleSchema.parse({ treatment: "dark", aspect: 3.5 })).toEqual({ treatment: "dark", aspect: 3.5 });
    expect(() => logoStyleSchema.parse({ treatment: "glow", aspect: 1 })).toThrow();
    expect(() => logoStyleSchema.parse({ treatment: "light", aspect: 0 })).toThrow();
  });
});
