import { describe, it, expect } from "vitest";
import { SEEDS, cleanSuggestions, patientSearches } from "./questions.js";

const reply = (list: string[]) => new Response(JSON.stringify(["q", list]), { status: 200 });

describe("patient searches", () => {
  it("has question prompts for every language a clinic can choose", () => {
    for (const l of ["en", "de", "es", "fr", "it", "pt", "tr", "ja", "ar", "pl"]) expect(SEEDS[l]?.length).toBeGreaterThanOrEqual(3);
  });
  it("drops price searches and fragments", () => {
    expect(cleanSuggestions(["diş beyazlatma zararlı mı", "diş beyazlatma fiyatları 2026", "diş beyazlatma zararlı mı ekşi", "diş"], "diş beyazlatma zararlı mı")).toEqual(["diş beyazlatma zararlı mı"]);
  });
  it("asks in the clinic's language and country, and dedupes", async () => {
    const urls: string[] = [];
    const f = (async (u: string) => {
      urls.push(u);
      return reply(["implant ne kadar sürer", "implant ne kadar sürer acır mı", "implant fiyat"]);
    }) as unknown as typeof fetch;
    const out = await patientSearches(["İmplant"], "tr", "TR", { fetchImpl: f });
    expect(urls[0]).toContain("hl=tr");
    expect(urls[0]).toContain("gl=tr");
    expect(urls[0]).toContain(encodeURIComponent("implant zararlı mı"));
    expect(out).toEqual(["implant ne kadar sürer", "implant ne kadar sürer acır mı"]);
  });
  it("returns nothing (never throws) when the network is blocked", async () => {
    const f = (async () => { throw new Error("blocked"); }) as unknown as typeof fetch;
    expect(await patientSearches(["Implants"], "en", "US", { fetchImpl: f })).toEqual([]);
  });
  it("keeps Japanese suggestions that have no spaces, and still drops prices", () => {
    expect(cleanSuggestions(["インプラント痛い", "インプラント 痛い 期間", "インプラント 費用", "インプラント 知恵袋"], "インプラント 痛い")).toEqual(["インプラント痛い", "インプラント 痛い 期間"]);
    expect(cleanSuggestions(["تبييض الاسنان اضرار", "تبييض الاسنان سعر"], "اضرار تبييض")).toEqual(["تبييض الاسنان اضرار"]);
    expect(cleanSuggestions(["wybielanie zębów boli", "wybielanie zębów cena"], "wybielanie zębów boli")).toEqual(["wybielanie zębów boli"]);
  });
});
