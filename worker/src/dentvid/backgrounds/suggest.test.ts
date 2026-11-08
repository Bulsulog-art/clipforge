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
    expect(["food-01", "whitening-15"]).toContain(suggestBackgrounds({ topic: "Café et taches" })[0]); // a coffee cup
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
    // "enamel" also (rightly) brings in sensitivity photos; never an unrelated treatment.
    expect([...m].some((id) => category(id) === "whitening")).toBe(true);
    for (const id of m) expect(["whitening", "sensitivity"]).toContain(category(id));
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
 * Every category the library covers must be reachable from a topic in each
 * of the seven languages — otherwise a clinic writing in that language never
 * gets those photos by default.
 */
const TOPICS: Record<string, Record<string, string>> = {
  cleaning: { en: "Professional cleaning: how often should tartar be removed?", tr: "Diş taşı temizliği ne sıklıkla yapılmalı?", de: "Professionelle Zahnreinigung: Wie oft Zahnstein entfernen?", es: "Limpieza dental: ¿cada cuánto quitar el sarro?", fr: "Détartrage : à quelle fréquence enlever le tartre ?", it: "Pulizia dei denti: ogni quanto rimuovere il tartaro?", pt: "Limpeza dentária: com que frequência remover o tártaro?" },
  rootcanal: { en: "Does a root canal hurt?", tr: "Kanal tedavisi acıtır mı?", de: "Tut eine Wurzelbehandlung weh?", es: "¿Duele una endodoncia?", fr: "Un traitement de canal fait-il mal ?", it: "La devitalizzazione fa male?", pt: "O tratamento de canal dói?" },
  kids: { en: "Your child's first dental visit", tr: "Çocuğunuzun ilk diş hekimi ziyareti", de: "Der erste Zahnarztbesuch Ihres Kindes", es: "La primera visita al dentista de su niño", fr: "La première visite chez le dentiste de votre enfant", it: "La prima visita dal dentista del vostro bambino", pt: "A primeira consulta da sua criança no dentista" },
  hygiene: { en: "How to brush and floss properly", tr: "Dişler nasıl doğru fırçalanır, diş ipi nasıl kullanılır?", de: "Richtig Zähne putzen und Zahnseide benutzen", es: "Cómo cepillarse y usar hilo dental", fr: "Bien se brosser les dents et utiliser le fil dentaire", it: "Come spazzolare i denti e usare il filo interdentale", pt: "Como escovar os dentes e usar fio dental" },
  food: { en: "Sugar, soda and your teeth", tr: "Şeker, gazlı içecekler ve dişleriniz", de: "Zucker, Limonade und Ihre Zähne", es: "El azúcar, los refrescos y sus dientes", fr: "Le sucre, les sodas et vos dents", it: "Lo zucchero, le bibite e i tuoi denti", pt: "O açúcar, os refrigerantes e os seus dentes" },
  sensitivity: { en: "Why are my teeth sensitive to cold?", tr: "Dişlerim soğuğa neden hassas?", de: "Warum sind meine Zähne kälteempfindlich?", es: "¿Por qué mis dientes son sensibles al frío?", fr: "Pourquoi mes dents sont-elles sensibles au froid ?", it: "Perché i miei denti sono sensibili al freddo?", pt: "Porque é que os meus dentes são sensíveis ao frio?" },
  breath: { en: "What causes bad breath?", tr: "Ağız kokusunun nedeni nedir?", de: "Was verursacht Mundgeruch?", es: "¿Qué causa el mal aliento?", fr: "Qu'est-ce qui cause la mauvaise haleine ?", it: "Cosa causa l'alito cattivo?", pt: "O que causa o mau hálito?" },
  clinic: { en: "What happens at your dental appointment", tr: "Diş hekimi randevunuzda neler olur?", de: "Was beim Termin in der Zahnarztpraxis passiert", es: "Qué pasa en su cita con el dentista", fr: "Ce qui se passe à votre rendez-vous chez le dentiste", it: "Cosa succede al tuo appuntamento dal dentista", pt: "O que acontece na sua consulta no dentista" },
  calm: { en: "Afraid of the dentist? How to stay calm", tr: "Diş hekimi korkusu: nasıl sakin kalınır?", de: "Angst vor dem Zahnarzt? So bleiben Sie ruhig", es: "¿Miedo al dentista? Cómo mantener la calma", fr: "Peur du dentiste ? Comment rester calme", it: "Paura del dentista? Come restare calmi", pt: "Medo do dentista? Como manter a calma" },
};

describe("matchingBackgrounds: every category, every language", () => {
  for (const [cat, langs] of Object.entries(TOPICS)) {
    it(`${cat}: matched in en/tr/de/es/fr/it/pt and leads the suggestions`, () => {
      expect(BACKGROUND_LIBRARY.filter((i) => i.category === cat).length).toBeGreaterThanOrEqual(6);
      for (const [language, topic] of Object.entries(langs)) {
        const matched = [...matchingBackgrounds({ topic, language })].map(category);
        expect(matched, `${language}: ${topic}`).toContain(cat);
        expect(category(suggestBackgrounds({ topic, language })[0]), `${language}: ${topic}`).toBe(cat);
      }
    });
  }

  it("service names reach their category on their own", () => {
    const services: [string, string][] = [
      ["Diş taşı temizliği", "cleaning"],
      ["Professionelle Zahnreinigung", "cleaning"],
      ["Kanal tedavisi", "rootcanal"],
      ["Endodoncia", "rootcanal"],
      ["Kinderzahnheilkunde", "kids"],
      ["Odontopediatría", "kids"],
      ["Çocuk diş hekimliği", "kids"],
      ["Traitement de la sensibilité", "sensitivity"],
      ["Halitosis", "breath"],
    ];
    for (const [service, cat] of services) {
      expect([...matchingBackgrounds({ service })].map(category), service).toContain(cat);
    }
  });
});
