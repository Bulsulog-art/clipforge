import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as light from "./dentvideo-locales";
import * as content from "./dentvideo";

describe("content/dentvideo-locales (the browser's copy of the language facts)", () => {
  it("is the same set of facts content/dentvideo exports", () => {
    expect(content.LOCALES).toBe(light.LOCALES);
    expect(content.LANDING_PATH).toBe(light.LANDING_PATH);
    expect(content.LANGUAGE_NAME).toBe(light.LANGUAGE_NAME);
    expect(content.dirOf).toBe(light.dirOf);
  });

  it("lists exactly the languages that have guides", () => {
    expect([...light.GUIDE_HUBS]).toEqual(content.GUIDE_HUB_LOCALES);
    for (const l of light.LOCALES) expect(light.hasGuideHub(l), l).toBe(content.hasGuides(l));
  });

  it("imports nothing (so it never drags content into a client bundle)", () => {
    const src = fs.readFileSync(path.join(__dirname, "dentvideo-locales.ts"), "utf8");
    expect(src).not.toMatch(/^\s*import\s/m);
  });
});
