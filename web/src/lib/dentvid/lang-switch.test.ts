import { describe, expect, it } from "vitest";
import { equivalentPath } from "./lang-switch";

describe("equivalentPath (language switcher)", () => {
  it("keeps a legal page", () => {
    expect(equivalentPath("/tr/privacy", "en")).toBe("/dentvideo/privacy");
    expect(equivalentPath("/privacy", "de")).toBe("/dentvideo/de/privacy");
    expect(equivalentPath("/dentvideo/ar/terms", "ja")).toBe("/dentvideo/ja/terms");
  });

  it("keeps the guides hub and About", () => {
    expect(equivalentPath("/tr/guides", "en")).toBe("/dentvideo/guides");
    expect(equivalentPath("/guides", "tr")).toBe("/dentvideo/tr/guides");
    expect(equivalentPath("/de/about", "ar")).toBe("/dentvideo/ar/about");
    expect(equivalentPath("/about", "pl")).toBe("/dentvideo/pl/about");
  });

  it("sends a single guide to the guides hub (slugs differ per language)", () => {
    expect(equivalentPath("/guides/patient-education-videos", "tr")).toBe("/dentvideo/tr/guides");
  });

  it("goes to the landing from a landing or a page without an equivalent", () => {
    expect(equivalentPath("/", "tr")).toBe("/dentvideo/tr");
    expect(equivalentPath("/de", "en")).toBe("/dentvideo");
    expect(equivalentPath("/videos/dis-klinigi-sosyal-medya-videolari", "en")).toBe("/dentvideo");
    expect(equivalentPath("/tr/d/QaDemo12345", "en")).toBe("/dentvideo");
    expect(equivalentPath("/tr/privacy?x=1#top", "en")).toBe("/dentvideo/privacy");
  });
});
