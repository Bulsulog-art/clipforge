import { describe, expect, it } from "vitest";
import { SERVICE_HINTS, hasService, splitServices, suggestedServices, toggleService } from "./service-hints";

describe("service suggestions", () => {
  it("offers every example service of the language, falling back to English", () => {
    expect(suggestedServices("tr")).toEqual(splitServices(SERVICE_HINTS.tr));
    expect(suggestedServices("tr")).toContain("İmplant");
    expect(suggestedServices("xx")).toEqual(splitServices(SERVICE_HINTS.en));
  });

  it("adds a service to an empty field and after what was typed", () => {
    expect(toggleService("", "İmplant", "tr")).toBe("İmplant");
    expect(toggleService("Ortodonti", "İmplant", "tr")).toBe("Ortodonti, İmplant");
    expect(toggleService("Ortodonti,  ", "İmplant", "tr")).toBe("Ortodonti, İmplant");
  });

  it("takes a service out again, whatever its case, and keeps the rest", () => {
    expect(toggleService("Ortodonti, implant, Kanal tedavisi", "İmplant", "tr")).toBe("Ortodonti, Kanal tedavisi");
    expect(toggleService("Ortodonti, Implants, Root canal", "implants", "en")).toBe("Ortodonti, Root canal");
    expect(toggleService("Implants", "Implants", "en")).toBe("");
  });

  it("knows whether a service is already there", () => {
    expect(hasService("Cleanings, implants", "Implants")).toBe(true);
    expect(hasService("diş taşı temizliği", "Diş taşı temizliği")).toBe(true);
    expect(hasService("Cleanings", "Implants")).toBe(false);
    expect(hasService("", "Implants")).toBe(false);
  });

  it("joins with the language's own comma, which the field reads back", () => {
    expect(toggleService("ホワイトニング", "インプラント", "ja")).toBe("ホワイトニング、インプラント");
    expect(toggleService("تبييض الأسنان", "زراعة الأسنان", "ar")).toBe("تبييض الأسنان، زراعة الأسنان");
    expect(splitServices(toggleService("ホワイトニング", "インプラント", "ja"))).toEqual(["ホワイトニング", "インプラント"]);
    expect(splitServices(toggleService("تبييض الأسنان", "زراعة الأسنان", "ar"))).toEqual(["تبييض الأسنان", "زراعة الأسنان"]);
  });
});
