import { describe, it, expect } from "vitest";
import { isRtl, layoutUnits, scriptOfLanguage, scriptOfText, visualLength, fontStackFor } from "./script.js";
import { fitText, localizeTheme, theme, tracking, leading } from "./theme.js";

describe("scripts", () => {
  it("knows which languages are CJK and right-to-left", () => {
    expect(scriptOfLanguage("ja")).toBe("cjk");
    expect(scriptOfLanguage("ar-AE")).toBe("arabic");
    expect(scriptOfLanguage("pl")).toBe("latin");
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("ja")).toBe(false);
    expect(scriptOfText("こんにちは")).toBe("cjk");
    expect(scriptOfText("مرحبا")).toBe("arabic");
  });

  it("splits a Japanese headline into phrases, never starting one with punctuation or a particle", () => {
    const { units, spaced } = layoutUnits("その歯ぐきの出血、放っておいて大丈夫？");
    expect(spaced).toBe(false);
    expect(units.length).toBeGreaterThan(2);
    expect(units.join("")).toBe("その歯ぐきの出血、放っておいて大丈夫？");
    for (const u of units) expect(u).not.toMatch(/^[、。？！のはがをにで]/);
  });

  it("never splits a compound or a verb (seen on a render: 一時|的, 落ち|着いて, ご|相談)", () => {
    expect(layoutUnits("多くの場合は一時的で、数日で落ち着いていきます。").units).toEqual(expect.arrayContaining(["一時的で、", "落ち着いていきます。"]));
    expect(layoutUnits("気になるときは当院にご相談ください").units).toContain("ご相談ください");
  });

  it("keeps opening brackets with the word after them", () => {
    const { units } = layoutUnits("「フロス」は毎日");
    expect(units[0].startsWith("「フロス")).toBe(true);
  });

  it("splits Latin and Arabic on spaces, as before", () => {
    expect(layoutUnits("مرحبا بكم في العيادة")).toEqual({ units: ["مرحبا", "بكم", "في", "العيادة"], spaced: true });
    expect(layoutUnits("Zęby stałe")).toEqual({ units: ["Zęby", "stałe"], spaced: true });
  });

  it("measures full-width characters wider than Latin ones", () => {
    expect(visualLength("ああ")).toBeGreaterThan(visualLength("aa"));
  });

  it("does not shrink a Japanese line to nothing because it has no spaces", () => {
    // Before: the whole sentence was one "word" and fitText sized it to fit
    // across the frame on one line — about 40px for a 132px hook.
    const hook = "ホワイトニング後のしみる感じ、実はよくあること";
    expect(fitText(132, hook)).toBeGreaterThanOrEqual(76);
  });

  it("localises the theme: script fonts first, no letter-spacing for Arabic", () => {
    const base = theme("editorial");
    const ja = localizeTheme(base, "ja");
    expect(ja.displayFont.startsWith('"Noto Sans CJK JP"')).toBe(true);
    expect(ja.bodyFont).toContain("Inter");
    const ar = localizeTheme(base, "ar");
    expect(ar.script).toBe("arabic");
    expect(ar.displayFont).toContain("Noto Kufi Arabic");
    expect(tracking(ar, "0.14em")).toBe("0");
    expect(leading(ar, 1.08)).toBeGreaterThan(1.3);
    expect(localizeTheme(base, "pl")).toBe(base);
    expect(fontStackFor("en", "body")).toBeUndefined();
  });
});
