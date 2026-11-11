import { describe, it, expect } from "vitest";
import { addressFor, captionRules, hookLimit, marketLanguage, marketLanguages, marketRules, speechRate, speechTarget, speechUnits } from "./locale.js";
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
    expect(marketRules("US")).toBe("");
    expect(captionRules("JP")).toMatch(/自由診療/);
    expect(captionRules("AE")).toBe("");
  });
  it("has the market's own rules for every launch market", () => {
    for (const c of ["TR", "DE", "AT", "CH", "ES", "MX", "tr", "mx"]) expect(marketRules(c), c).not.toBe("");
    expect(marketRules("TR")).toMatch(/33075/);
    expect(marketRules("TR")).toMatch(/öncesi-sonrası/);
    expect(marketRules("TR")).toMatch(/fear-inducing/);
    expect(marketRules("DE")).toMatch(/§ 11 HWG/);
    expect(marketRules("DE")).toMatch(/I ZR 170\/24/);
    expect(marketRules("DE")).toMatch(/Berufsordnung/);
    expect(marketRules("AT")).toMatch(/§ 35 Zahnärztegesetz/);
    expect(marketRules("CH")).toMatch(/Art\. 40 Medizinalberufegesetz/);
    expect(marketRules("CH")).toMatch(/French or Italian/);
    expect(marketRules("ES")).toMatch(/Real Decreto 1907\/1996/);
    expect(marketRules("ES")).toMatch(/celebrities/);
    expect(marketRules("MX")).toMatch(/COFEPRIS/);
    expect(marketRules("MX")).toMatch(/never write, invent or imply a COFEPRIS permit/);
    expect(captionRules("MX")).toMatch(/COFEPRIS/);
    expect(captionRules("ES")).toBe("");
  });
  it("maps each launch market to the languages its clinics write in", () => {
    expect(marketLanguages("TR")).toEqual(["tr"]);
    expect(marketLanguages("AT")).toEqual(["de"]);
    expect(marketLanguages("CH")).toEqual(["de", "fr", "it"]);
    expect(marketLanguages("MX")).toEqual(["es"]);
    // The clinic's own language wins when its market speaks it…
    expect(marketLanguage("CH", "fr")).toBe("fr");
    expect(marketLanguage("CH", "it")).toBe("it");
    expect(marketLanguage("ch", "de")).toBe("de");
    // …otherwise the market's main language.
    expect(marketLanguage("AT", "en")).toBe("de");
    expect(marketLanguage("MX")).toBe("es");
    expect(marketLanguage("ZZ", "pt")).toBe("pt");
  });
  it("has avoid-words and native-language checks for every launch-market language", async () => {
    const { AVOID_WORDS, scanHardRules } = await import("./compliance.js");
    const guarantee: Record<string, string> = {
      tr: "garantili sonuç", de: "Erfolg garantiert", es: "resultado garantizado", fr: "résultat garanti", it: "risultato garantito",
    };
    for (const c of ["TR", "DE", "AT", "CH", "ES", "MX"])
      for (const l of marketLanguages(c)) {
        expect(AVOID_WORDS[l], `avoid words for ${c}/${l}`).toBeTruthy();
        expect(scanHardRules(guarantee[l]).map((h) => h.rule), `${c}/${l}`).toContain("guarantee");
      }
  });
});
