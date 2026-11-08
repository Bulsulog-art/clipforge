import { describe, it, expect } from "vitest";
import { addressFor, captionRules, hookLimit, marketRules, speechRate, speechTarget, speechUnits } from "./locale.js";
import { addressRule } from "./profile.js";

describe("locale", () => {
  it("measures Japanese speech in characters and the rest in words", () => {
    expect(speechRate("ja").unit).toBe("characters");
    expect(speechUnits("歯ぐきの出血、放っておいて大丈夫？", "ja")).toBe(15);
    expect(speechUnits("Zęby stałe wyrastają", "pl")).toBe(3);
    expect(speechTarget(20, "en")).toBe("46 words");
    expect(speechTarget(20, "ja")).toMatch(/^110 Japanese characters/);
    expect(speechTarget(20, "ar")).toBe("40 words");
  });
  it("limits hooks by characters where there are no spaces", () => {
    expect(hookLimit("ja").max).toBeGreaterThan(20);
    expect(hookLimit("de").text).toBe("under 9 words");
  });
  it("addresses the viewer the way each language does it", () => {
    expect(addressFor("ja", "formal")).toMatch(/です・ます/);
    expect(addressFor("ar", "formal")).toMatch(/أنتم/);
    expect(addressFor("pl", "formal")).toMatch(/Państwo/);
    expect(addressFor("pl", "informal")).toMatch(/"ty"/);
    expect(addressRule({ language: "de", address: "formal" })).toMatch(/Sie/);
  });
  it("has the market's own rules for the new markets and Singapore", () => {
    expect(marketRules("JP")).toMatch(/医療広告ガイドライン/);
    expect(marketRules("JP")).toMatch(/体験談/);
    expect(marketRules("AE")).toMatch(/no side effects/);
    expect(marketRules("SA")).toMatch(/Saudi Arabia/);
    expect(marketRules("PL")).toMatch(/Kodeks Etyki Lekarskiej/);
    expect(marketRules("SG")).toMatch(/testimonials/);
    expect(marketRules("DE")).toBe("");
    expect(captionRules("JP")).toMatch(/自由診療/);
    expect(captionRules("AE")).toBe("");
  });
});
