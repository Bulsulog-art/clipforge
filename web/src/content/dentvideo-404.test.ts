import { describe, expect, it } from "vitest";
import { LOCALES } from "./dentvideo";
import { NOT_FOUND_COPY } from "./dentvideo-404";
import { GUIDE_UI } from "./guides/ui";

describe("404 copy", () => {
  it("is complete and translated in every language", () => {
    const en = NOT_FOUND_COPY.en;
    for (const l of LOCALES) {
      const t = NOT_FOUND_COPY[l];
      for (const k of Object.keys(en) as (keyof typeof en)[]) {
        expect(t[k].trim(), `${l}.${k}`).not.toBe("");
        if (l !== "en") expect(t[k], `${l}.${k} is still English`).not.toBe(en[k]);
      }
      expect(t.home, `${l}.home names the brand`).toContain("DentVideo");
    }
  });

  it("calls guides what the site's navigation calls them", () => {
    // Not the exact word everywhere (the button says whose guides), but never a different term.
    expect(NOT_FOUND_COPY.de.guides).toContain(GUIDE_UI.de.guides);
    expect(NOT_FOUND_COPY.tr.guides.toLowerCase()).toContain(GUIDE_UI.tr.guides.toLowerCase());
  });
});
