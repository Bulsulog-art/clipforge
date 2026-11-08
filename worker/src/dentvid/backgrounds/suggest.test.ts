import { describe, it, expect } from "vitest";
import fixtures from "./fixtures.json" with { type: "json" };
import { BACKGROUND_LIBRARY } from "./library.js";
import {
  SUGGEST_MAX,
  SUGGEST_MIN,
  backgroundId,
  backgroundSrc,
  defaultBackgrounds,
  fold,
  matchingBackgrounds,
  suggestBackgrounds,
} from "./suggest.js";

const category = (id: string) => BACKGROUND_LIBRARY.find((i) => i.id === id)?.category;
const byName = (name: string) => fixtures.find((f) => f.name === name)!;

/**
 * fixtures.json is shared with web/src/lib/dentvid/backgrounds (the browser
 * preview's copy of this engine); both apps must produce exactly these lists.
 * When the library grows, regenerate the expected lists and look at them.
 */
describe("suggestBackgrounds: shared fixtures", () => {
  for (const f of fixtures) {
    it(f.name, () => {
      expect(suggestBackgrounds(f.input, f.count)).toEqual(f.expected);
    });
  }
});

describe("suggestBackgrounds", () => {
  it("leads a Turkish whitening video with whitening photos", () => {
    const top = suggestBackgrounds(byName("tr whitening").input).slice(0, 4);
    expect(top.every((id) => category(id) === "whitening")).toBe(true);
  });

  it("leads a German implant video with implant photos, from the text alone", () => {
    const { plan } = byName("de implant").input as { plan: unknown };
    const top = suggestBackgrounds({ plan: plan as never }).slice(0, 3);
    expect(top.every((id) => category(id) === "implants")).toBe(true);
  });

  it("maps keywords in other languages (es aligners, fr coffee)", () => {
    expect(category(suggestBackgrounds({ topic: "Alineadores invisibles" })[0])).toBe("aligners");
    expect(suggestBackgrounds({ topic: "Café et taches" })[0]).toBe("whitening-15"); // the coffee-stain cup
  });

  it("is deterministic", () => {
    const input = byName("tr tartar cleaning").input;
    expect(suggestBackgrounds(input)).toEqual(suggestBackgrounds(JSON.parse(JSON.stringify(input))));
  });

  it("never returns an empty list, duplicates, or unknown ids", () => {
    for (const input of [{}, { topic: "" }, { plan: { scenes: [] } }, { topic: "xyzzy" }]) {
      const ids = suggestBackgrounds(input);
      expect(ids.length).toBeGreaterThanOrEqual(Math.min(SUGGEST_MIN, BACKGROUND_LIBRARY.length));
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(category(id)).toBeDefined();
    }
  });

  it("keeps the count within 10–20", () => {
    expect(suggestBackgrounds({}, 3)).toHaveLength(Math.min(SUGGEST_MIN, BACKGROUND_LIBRARY.length));
    expect(suggestBackgrounds({}, 99)).toHaveLength(Math.min(SUGGEST_MAX, BACKGROUND_LIBRARY.length));
  });

  it("mixes categories when nothing in the video points anywhere", () => {
    const cats = new Set(suggestBackgrounds({}).map(category));
    expect(cats.size).toBeGreaterThan(1);
  });

  it("does not fire a stem inside another word", () => {
    // "steak" contains "tea"; it must not pull the coffee/tea photos forward.
    expect(suggestBackgrounds({ topic: "steak" })).toEqual(suggestBackgrounds({}));
  });
});

describe("helpers", () => {
  it("folds Turkish and German text", () => {
    expect(fold("Diş TAŞI İçin Zähne Größe")).toBe("dis tasi icin zahne grosse");
  });

  it("round-trips src and id, and rejects anything outside the library", () => {
    const id = BACKGROUND_LIBRARY[0].id;
    expect(backgroundSrc(id)).toBe(`/dentvideo/backgrounds/${id}.jpg`);
    expect(backgroundId(backgroundSrc(id))).toBe(id);
    expect(backgroundId("https://evil.example/x.jpg")).toBeUndefined();
    expect(backgroundId("/dentvideo/backgrounds/nope-99.jpg")).toBeUndefined();
  });

  it("starts a video with three photos, four from 45 seconds", () => {
    const ids = suggestBackgrounds({});
    expect(defaultBackgrounds(ids, 30)).toEqual(ids.slice(0, 3));
    expect(defaultBackgrounds(ids, 60)).toEqual(ids.slice(0, 4));
  });
});

describe("matchingBackgrounds: only on-topic photos go in by default", () => {
  it("a whitening video matches whitening photos", () => {
    const m = matchingBackgrounds({ topic: "Does whitening damage enamel?", service: "Teeth whitening", language: "en" });
    expect(m.size).toBeGreaterThan(0);
    for (const id of m) expect(category(id)).toBe("whitening");
  });
  it("a Turkish implant video matches implant photos", () => {
    const m = matchingBackgrounds({ topic: "İmplant ne kadar sürer?", service: "İmplant", language: "tr" });
    expect([...m].some((id) => category(id) === "implants")).toBe(true);
    expect([...m].every((id) => category(id) !== "whitening")).toBe(true);
  });
  it("a topic with no photos in its category gets none (no unrelated fallback)", () => {
    const m = matchingBackgrounds({ topic: "What happens during a root canal?", service: "Root canal treatment", language: "en" });
    for (const id of m) expect(["whitening", "implants", "aligners"]).not.toContain(category(id));
  });
});
