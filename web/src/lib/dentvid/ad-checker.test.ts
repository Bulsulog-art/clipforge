import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo-locales";
import { CHECKER } from "@/content/dentvideo-checker";
import { CHECKER_MAX_CHARS, CHECKER_RULE_IDS, REWRITES, checkText, checkerEventProps, guessLanguage, segments, suggestRewrite, widenNumber } from "./ad-checker";
import { CHECKER_RULES, HARD_RULES, findHardSpans } from "./hard-rules";
import { parseClientEvent, sanitizeProps } from "./events";

describe("ad checker: engine", () => {
  it("runs the compliance agent's hard rules plus fear, in the engine's order", () => {
    expect(CHECKER_RULE_IDS).toEqual([...HARD_RULES.map((r) => r.id), "fear"]);
  });

  it("flags the classic risky post and offers a fix in its language", () => {
    const hits = checkText("Guaranteed painless whitening, 50% off! The best dentist in town.");
    expect(hits.map((h) => h.rule)).toEqual(["guarantee", "absolute", "price", "superlative"]);
    expect(hits.find((h) => h.rule === "absolute")?.fix).toBe("comfortable for most patients, with local anaesthesia");
  });

  it("flags a plain call to book now in English and German, as it does in Turkish", () => {
    for (const [t, match] of [
      ["The best dentist in town — book now, results guaranteed.", "book now"],
      ["Book today!", "Book today"],
      ["Der beste Zahnarzt der Stadt — jetzt buchen.", "jetzt buchen"],
      ["Jetzt Termin vereinbaren!", "Jetzt Termin vereinbaren"],
      ["Garantili sonuç — hemen randevu alın.", "hemen randevu alın"],
    ] as const) {
      const fear = checkText(t).find((h) => h.rule === "fear");
      expect(fear?.match, t).toBe(match);
      expect(fear?.fix, t).toBeTruthy();
    }
  });

  it("leaves hedged, educational text alone", () => {
    for (const t of [
      "Whitening can make teeth a few shades lighter for many people; ask your dentist whether it suits you.",
      "Diş taşı temizliği diş eti sağlığını korumaya yardımcı olabilir; hekiminize danışın.",
      "Brush before and after meals.",
      "永久歯は6歳頃から生えてきます。",
      "",
    ]) expect(checkText(t), t).toEqual([]);
  });

  it("highlights a whole price, not one digit of it", () => {
    const t = "Only $1,299 today, or 1500 TL.";
    const hits = checkText(t);
    expect(hits.map((h) => h.match)).toEqual(["$1,299", "1500 TL"]);
    for (const h of hits) expect(t.slice(h.start, h.end)).toBe(h.match);
    // Not a price: left as the engine found it.
    const s = { rule: "absolute" as const, start: 0, end: 4, match: "100%" };
    expect(widenNumber("100% sure", s)).toBe(s);
  });

  it("reads only the first CHECKER_MAX_CHARS characters", () => {
    const t = `${"a ".repeat(CHECKER_MAX_CHARS)} painless`;
    expect(checkText(t)).toEqual([]);
  });

  it("cuts the text into plain runs and hits that add back up to it", () => {
    const t = "Painless and guaranteed, see our before and after photos.";
    const hits = checkText(t);
    const segs = segments(t, hits);
    expect(segs.map((s) => s.text).join("")).toBe(t);
    expect(segs.filter((s) => s.hit).map((s) => s.index)).toEqual(hits.map((_, i) => i));
  });

  it("answers in the language of the post, not of the page", () => {
    expect(suggestRewrite("garantiert", "guarantee", guessLanguage("Die Behandlung ist garantiert erfolgreich für Ihre Zähne"))).toBe("Ergebnisse sind individuell verschieden");
    expect(suggestRewrite("garantili", "guarantee", guessLanguage("Garantili sonuç ve bir diş hekimi"))).toBe("sonuçlar kişiden kişiye değişebilir");
    expect(suggestRewrite("ağrısız", "absolute")).toBe("lokal anestezi altında, çoğu hasta için konforlu");
    expect(suggestRewrite("بدون ألم", "absolute")).toMatch(/التخدير/);
    expect(suggestRewrite("無痛", "absolute")).toMatch(/局所麻酔/);
    // A bare figure has no language: the UI shows the rule's tip instead.
    expect(suggestRewrite("100%", "absolute")).toBeNull();
    expect(suggestRewrite("$99", "price")).toBeNull();
  });

  it("guesses the language of a post", () => {
    expect(guessLanguage("Our team and your smile")).toBe("en");
    expect(guessLanguage("Diş hekimi ile bir kontrol ve tedavi")).toBe("tr");
    expect(guessLanguage("Die Praxis und Ihre Zähne")).toBe("de");
    expect(guessLanguage("La clínica y los dientes")).toBe("es");
    expect(guessLanguage("Le cabinet et vos dents")).toBe("fr");
    expect(guessLanguage("Gabinet i zęby, nie się")).toBe("pl");
    expect(guessLanguage("عيادة الأسنان")).toBe("ar");
    expect(guessLanguage("歯科医院")).toBe("ja");
  });

  it("never suggests a wording the checker itself would flag", () => {
    for (const [lang, list] of Object.entries(REWRITES)) {
      for (const r of list) expect(findHardSpans(r.fix, CHECKER_RULES), `${lang}: ${r.fix}`).toEqual([]);
    }
    for (const l of LOCALES) {
      for (const [rule, t] of Object.entries(CHECKER[l].ui.rules)) expect(findHardSpans(t.tip, CHECKER_RULES), `${l}/${rule} tip`).toEqual([]);
    }
  });

  it.each(LOCALES)("%s: the example post trips most rules, each with a fix or a tip", (l) => {
    const hits = checkText(CHECKER[l].ui.sample);
    expect(new Set(hits.map((h) => h.rule)).size, l).toBeGreaterThanOrEqual(5);
    for (const h of hits) expect(h.fix ?? CHECKER[l].ui.rules[h.rule].tip, `${l}: ${h.match}`).toBeTruthy();
    // A fix is in the post's language: no Latin-script fix for an Arabic or Japanese post.
    if (l === "ar") for (const h of hits) if (h.fix) expect(h.fix).toMatch(/[؀-ۿ]/);
    if (l === "ja") for (const h of hits) if (h.fix) expect(h.fix).toMatch(/[぀-ヿ一-鿿]/);
  });
});

describe("ad checker: analytics never carry the text", () => {
  it("counts only", () => {
    const hits = checkText("Painless whitening, guaranteed. Painless again.");
    expect(checkerEventProps(hits)).toEqual({ hits: 3, rules: 2, clean: false });
    expect(checkerEventProps([])).toEqual({ hits: 0, rules: 0, clean: true });
  });

  it("the event allow-list drops anything that is not a count", () => {
    expect(sanitizeProps("checker_used", { hits: 4, rules: 3, clean: false, text: "Painless whitening", match: "painless", lang: "en" })).toEqual({ hits: 4, rules: 3, clean: false });
    expect(sanitizeProps("checker_used", { hits: "4", rules: 99, clean: "no" })).toEqual({});
    expect(sanitizeProps("checker_cta_clicked", { where: "result", text: "x" })).toEqual({ where: "result" });
    expect(sanitizeProps("checker_cta_clicked", { where: "Painless whitening" })).toEqual({});
  });

  it("a browser may send both checker events", () => {
    expect(parseClientEvent(JSON.stringify({ name: "checker_used", locale: "tr", props: { hits: 2, rules: 2, clean: false } }))?.props).toEqual({ hits: 2, rules: 2, clean: false });
    expect(parseClientEvent(JSON.stringify({ name: "checker_cta_clicked", locale: "ar", props: { where: "clean" } }))?.props).toEqual({ where: "clean" });
  });
});
