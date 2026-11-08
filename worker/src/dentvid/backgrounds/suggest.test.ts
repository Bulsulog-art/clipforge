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

/**
 * The new pipeline languages (docs/MARKETS.md). One topic per photo category
 * per language, written the way a clinic in that market would title it. The
 * shipped library only holds whitening, implant and aligner photos today, so
 * the other categories are checked against a one-photo-per-category library:
 * the day photos for them are added, these languages already find them.
 */
describe("new languages find every photo category", () => {
  const CATS = ["whitening", "implants", "aligners", "cleaning", "rootcanal", "kids", "sensitivity", "breath", "food", "hygiene", "calm", "clinic"];
  const lib = CATS.map((c) => ({ id: `${c}-01`, category: c, tags: [], luminance: 0.5 }));
  const TOPICS: Record<string, Record<string, string>> = {
    ja: {
      whitening: "ホワイトニングの効果", implants: "インプラントの流れ", aligners: "マウスピース矯正の装着時間",
      cleaning: "歯石とクリーニング", rootcanal: "根管治療とは", kids: "子どもの乳歯ケア", sensitivity: "知覚過敏でしみる",
      breath: "口臭の原因", food: "砂糖と虫歯", hygiene: "歯ブラシとフロスの使い方", calm: "歯医者が怖い・不安", clinic: "歯科医院の定期検診",
    },
    ar: {
      whitening: "تبييض الأسنان", implants: "زراعة الأسنان", aligners: "التقويم الشفاف",
      cleaning: "تنظيف الجير", rootcanal: "علاج العصب", kids: "أسنان الأطفال", sensitivity: "حساسية الأسنان",
      breath: "رائحة الفم", food: "السكر والتسوس", hygiene: "فرشاة الأسنان وخيط الأسنان", calm: "الخوف من طبيب الأسنان", clinic: "موعد في العيادة",
    },
    pl: {
      whitening: "Wybielanie zębów", implants: "Implanty zębowe", aligners: "Nakładki ortodontyczne",
      cleaning: "Skaling i kamień nazębny", rootcanal: "Leczenie kanałowe", kids: "Zęby mleczne u dzieci", sensitivity: "Nadwrażliwość zębów",
      breath: "Nieświeży oddech", food: "Cukier i próchnica", hygiene: "Szczoteczka i nitka", calm: "Strach przed dentystą", clinic: "Wizyta w gabinecie",
    },
  };
  for (const [lang, topics] of Object.entries(TOPICS))
    for (const cat of CATS)
      it(`${lang} ${cat}`, () => {
        expect([...matchingBackgrounds({ topic: topics[cat], language: lang }, lib)]).toContain(`${cat}-01`);
      });

  it("leads with the right shipped photos from a new-language service name", () => {
    expect(category(suggestBackgrounds({ service: "インプラント" })[0])).toBe("implants");
    expect(category(suggestBackgrounds({ service: "تبييض الأسنان" })[0])).toBe("whitening");
    expect(category(suggestBackgrounds({ service: "Nakładki ortodontyczne" })[0])).toBe("aligners");
  });
});
