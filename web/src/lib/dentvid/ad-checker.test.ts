import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo-locales";
import { CHECKER } from "@/content/dentvideo-checker";
import { CHECKER_MAX_CHARS, CHECKER_RULE_IDS, REWRITES, checkText, checkerEventProps, guessLanguage, segments, sentencesOf, suggestRewrite, widenNumber } from "./ad-checker";
import { CHECKER_RULES, HARD_RULES, findHardSpans, type RuleId } from "./hard-rules";
import { parseClientEvent, sanitizeProps } from "./events";

describe("ad checker: engine", () => {
  it("runs the compliance agent's hard rules plus fear, in the engine's order", () => {
    expect(CHECKER_RULE_IDS).toEqual([...HARD_RULES.map((r) => r.id), "fear"]);
  });

  it("flags the classic risky post and offers a fix in its language", () => {
    const hits = checkText("Guaranteed painless whitening, 50% off! The best dentist in town.");
    expect(hits.map((h) => h.rule)).toEqual(["guarantee", "absolute", "price", "superlative"]);
    expect(hits.find((h) => h.rule === "absolute")?.fix).toBe("comfortable for most patients, with local anesthesia");
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

  it("flags false urgency (a made-up deadline) in every language, with a calm fix", () => {
    for (const [t, match, lang] of [
      ["Whitening, this month only!", "this month only", "en"],
      ["Limited time only: implant consultations.", "Limited time only", "en"],
      ["Our offer ends soon, so call us.", "offer ends soon", "en"],
      ["Last chance for a spring check-up.", "Last chance", "en"],
      ["Only 3 spots left this week.", "Only 3 spots left", "en"],
      ["Hurry, the deal expires tomorrow.", "Hurry", "en"],
      ["Beyazlatmada son fırsat, sadece bu ay.", "son fırsat", "tr"],
      ["Nur heute: Prophylaxe in unserer Praxis.", "Nur heute", "de"],
      ["Última oportunidad para tu limpieza dental.", "Última oportunidad", "es"],
      ["Dernière chance pour votre détartrage.", "Dernière chance", "fr"],
      ["Ostatnia szansa na przegląd w gabinecie.", "Ostatnia szansa", "pl"],
      ["آخر فرصة لتبييض الأسنان.", "آخر فرصة", "ar"],
      ["期間限定のホワイトニング。", "期間限定", "ja"],
    ] as const) {
      const fear = checkText(t).find((h) => h.rule === "fear");
      expect(fear?.match, t).toBe(match);
      expect(fear?.fix, t).toBeTruthy();
      expect(guessLanguage(fear!.fix!), `${t} → ${fear!.fix}`).toBe(lang);
    }
  });

  it("a push to book or call gets the appointment sentence, not the symptom sentence", () => {
    const appointment = "Whenever it suits you, ask us about an appointment.";
    for (const t of ["Book now.", "Book today!", "Call now.", "Call us today to book your check-up.", "Book now before the offer ends."]) {
      const fear = checkText(t).find((h) => h.rule === "fear");
      expect(fear?.fix, t).toBe(appointment);
      const [s] = sentencesOf(t, checkText(t));
      expect(s.safer, t).toBe(appointment);
    }
    // A symptom someone should not sit on still gets the pointer to their dentist.
    expect(checkText("Don't wait until it's too late.").find((h) => h.rule === "fear")?.fix).toBe("If you notice this, ask your dentist at your next visit.");
    // Advice to call one's own dentist is not pressure.
    expect(checkText("Call your dentist if your gums bleed.")).toEqual([]);
  });

  it("catches the US and UK promo phrases, each with a safer wording or the rule's tip", () => {
    const tips = CHECKER.en.ui.rules;
    for (const [t, want] of [
      ["Best dentist in Austin, rated 5 stars by our happy patients.", ["superlative:Best dentist", "testimonial:rated 5 stars", "testimonial:happy patients"]],
      ["Read our five-star Google reviews.", ["testimonial:five-star", "testimonial:Google reviews"]],
      ["Award-winning dental care in Leeds.", ["superlative:Award-winning"]],
      ["Voted top dentist in Manchester.", ["superlative:Voted top dentist"]],
      ["London's leading implant clinic.", ["superlative:leading implant clinic"]],
      ["Patients love our gentle hygienists.", ["testimonial:Patients love"]],
      ["No pain, no fuss.", ["absolute:No pain, no fuss"]],
      ["Completely pain-free fillings.", ["absolute:Completely pain-free"]],
      ["Get the perfect smile you deserve.", ["absolute:Get the perfect smile"]],
      ["Call now to book.", ["fear:Call now"]],
    ] as const) {
      const hits = checkText(t);
      expect(hits.map((h) => `${h.rule}:${h.match}`), t).toEqual(want);
      for (const h of hits) {
        expect(h.fix ?? tips[h.rule as RuleId].tip, `${t}: ${h.match}`).toBeTruthy();
        if (h.fix) expect(guessLanguage(h.fix), `${t}: ${h.fix}`).toBe("en");
      }
    }
    expect(checkText("No pain, no fuss.")[0].fix).toBe("comfortable for most patients, with local anesthesia");
    expect(checkText("London's leading implant clinic.")[0].fix).toBe("our team (say what you do, not that you are the best)");
    expect(checkText("Read our five-star Google reviews.").map((h) => h.fix)).toEqual(["questions our patients often ask", "questions our patients often ask"]);
  });

  it("leaves the education the new English patterns could be confused with alone", () => {
    for (const t of [
      "Gum disease often causes no pain in its early stages.",
      "No pain doesn't mean no problem.",
      "Gum disease is a leading cause of tooth loss.",
      "Call your dentist if your gums bleed.",
      "Top practices for healthy gums: brush twice a day and floss.",
      "Braces will not give you a perfect smile overnight, but they can straighten crowded teeth.",
    ]) expect(checkText(t), t).toEqual([]);
  });

  it("does not mistake ordinary time words for pressure", () => {
    for (const t of [
      "The numbness ends soon after the appointment.",
      "Don't hurry your brushing: two minutes, twice a day.",
      "Only this tooth needs a filling.",
      "Die Wirkung ist zeitlich begrenzt.",
      "Last week we talked about flossing.",
    ]) expect(checkText(t).filter((h) => h.rule === "fear"), t).toEqual([]);
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
    for (const h of hits) expect(h.fix ?? CHECKER[l].ui.rules[h.rule as RuleId].tip, `${l}: ${h.match}`).toBeTruthy();
    // A fix is in the post's language: no Latin-script fix for an Arabic or Japanese post.
    if (l === "ar") for (const h of hits) if (h.fix) expect(h.fix).toMatch(/[؀-ۿ]/);
    if (l === "ja") for (const h of hits) if (h.fix) expect(h.fix).toMatch(/[぀-ヿ一-鿿]/);
  });
});

describe("ad checker: analytics never carry the text", () => {
  it("counts only", () => {
    const hits = checkText("Painless whitening, guaranteed. Painless again.");
    expect(checkerEventProps(hits)).toEqual({ hits: 3, rules: 2, clean: false, banned: 0 });
    expect(checkerEventProps([])).toEqual({ hits: 0, rules: 0, clean: true, banned: 0 });
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
