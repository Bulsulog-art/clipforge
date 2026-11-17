import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALES } from "@/content/dentvideo-locales";
import { CHECKER, CHECKER_SOURCES } from "@/content/dentvideo-checker";
import { CHECKER_MARKET_RULE_IDS, CHECKER_RULE_IDS, MARKET_REWRITES, REWRITES, checkText, checkerEventProps, rulesFor, sentencesOf, splitSentences } from "./ad-checker";
import { CHECKER_MARKETS, DEFAULT_MARKET, MARKET_BANNED, MARKET_SOURCES, OTHER_MARKET, PAGE_MARKETS, marketFromLanguageTag, sourceFor, verdictOf, type CheckerMarket } from "./checker-markets";
import { readShareFragment, shareFragment, shareUrl } from "./checker-share";
import { MARKET_HARD_RULES, findHardSpans } from "./hard-rules";
import { parseClientEvent, sanitizeProps } from "./events";
import { CARD_MAX_ROWS, drawCard, wrapLines, type CardContext } from "@/components/dentvid/checker-card";

const ALL_RULES = new Set<string>([...CHECKER_RULE_IDS, ...CHECKER_MARKET_RULE_IDS]);

/** The verdict of the hit that matched `phrase` in `text`, for `market`. */
function verdictIn(text: string, market: CheckerMarket, phrase: string) {
  const h = checkText(text, market).find((x) => x.match.toLowerCase().includes(phrase.toLowerCase()) || phrase.toLowerCase().includes(x.match.toLowerCase()));
  return h ? `${h.rule}:${h.verdict}` : "none";
}

describe("ad checker markets: the table", () => {
  it("every market names real rules and real sources, and every source is an official https link", () => {
    for (const m of CHECKER_MARKETS) {
      for (const [rule, key] of Object.entries(MARKET_BANNED[m])) {
        expect(ALL_RULES.has(rule), `${m}: ${rule}`).toBe(true);
        expect(CHECKER_SOURCES[key!], `${m}: ${key}`).toBeDefined();
        // A rule is "not allowed" only on the strength of one of that market's own texts.
        expect(MARKET_SOURCES[m], `${m}: ${key}`).toContain(key);
      }
      for (const key of MARKET_SOURCES[m]) expect(CHECKER_SOURCES[key].url).toMatch(/^https:\/\//);
      if (m !== OTHER_MARKET) expect(MARKET_SOURCES[m].length, m).toBeGreaterThan(0);
    }
    expect(MARKET_SOURCES[OTHER_MARKET]).toEqual([]);
    expect(MARKET_BANNED[OTHER_MARKET]).toEqual({});
  });

  it("a market's own deterministic rules are 'not allowed' there, each with its source", () => {
    for (const [code, rules] of Object.entries(MARKET_HARD_RULES)) {
      const m = code as CheckerMarket;
      expect(CHECKER_MARKETS, code).toContain(m);
      for (const r of rules) {
        expect(verdictOf(r.id, m), `${code}: ${r.id}`).toBe("banned");
        expect(sourceFor(r.id, m), `${code}: ${r.id}`).toBeTruthy();
      }
    }
  });

  it("every page language starts with its own market, and lists it first", () => {
    for (const l of LOCALES) {
      expect(PAGE_MARKETS[l][0]).toBe(DEFAULT_MARKET[l]);
      for (const m of PAGE_MARKETS[l]) expect(CHECKER_MARKETS).toContain(m);
    }
  });

  it("reads the market from the browser's language tag only when it knows it", () => {
    expect(marketFromLanguageTag("en-GB")).toBe("GB");
    expect(marketFromLanguageTag("en_UK")).toBe("GB");
    expect(marketFromLanguageTag("de-AT")).toBe("AT");
    expect(marketFromLanguageTag("es-419")).toBeNull();
    expect(marketFromLanguageTag("en")).toBeNull();
    expect(marketFromLanguageTag("pt-BR")).toBeNull();
    expect(marketFromLanguageTag(undefined)).toBeNull();
  });
});

describe("ad checker markets: known examples per market", () => {
  it("Türkiye: the known-mistakes register phrases, and RG 33075's own rules", () => {
    // KM-27: outcome promises.
    for (const p of ["garanti", "kesin sonuç", "acısız", "kalıcı"]) expect(verdictIn(`Bu tedavide ${p} var.`, "TR", p), p).not.toBe("none");
    // KM-28 and KM-50: steering to book, not allowed in Türkiye only.
    expect(verdictIn("Sorularınız için bize ulaşın veya randevu alın!", "TR", "bize ulaşın")).toBe("booking:banned");
    expect(verdictIn("İsterseniz kontrol randevusu planlayabilirsiniz.", "TR", "randevusu planlayabilirsiniz")).toBe("booking:banned");
    expect(verdictIn("Gerekirse muayene planlayabilirsiniz.", "TR", "muayene planlayabilirsiniz")).toBe("booking:banned");
    expect(checkText("Sorularınız için bize ulaşın.", OTHER_MARKET).filter((h) => h.rule === "booking")).toEqual([]);
    expect(checkText("Sorularınız için bize ulaşın.", "DE").filter((h) => h.rule === "booking")).toEqual([]);
    // Fees and campaigns (md. 5/1-m), patient thanks (5/1-e): not allowed. A superlative: risky.
    expect(verdictIn("Bu ay beyazlatmada indirim.", "TR", "indirim")).toBe("price:banned");
    expect(verdictIn("Hasta yorumlarına bakın.", "TR", "hasta yorum")).toBe("testimonial:banned");
    expect(verdictIn("Şehrin en iyi kliniği.", "TR", "en iyi")).toBe("superlative:risky");
    expect(verdictIn("Büyük çekiliş başladı.", "TR", "çekiliş")).toBe("giveaway:banned");
    expect(verdictIn("Bu videoyu paylaşmayı unutmayın.", "TR", "videoyu paylaş")).toBe("engagement:banned");
    // The dental terms that are not promises.
    expect(checkText("Kanal tedavisinden sonra kalıcı dolgu yapılır.", "TR")).toEqual([]);
    expect(checkText("Merak ettiklerinizi bir sonraki kontrolünüzde diş hekiminize danışabilirsiniz.", "TR")).toEqual([]);
  });

  it("Germany, Austria, Switzerland", () => {
    expect(verdictIn("Implantate mit Erfolgsgarantie.", "DE", "Erfolgsgarantie")).toBe("guarantee:banned");
    expect(verdictIn("Die beste Zahnarztpraxis in München.", "DE", "beste")).toBe("superlative:banned");
    expect(verdictIn("Ihr Implantatspezialist in Wien.", "DE", "Implantatspezialist")).toBe("specialist:banned");
    expect(verdictIn("Ihr Implantatspezialist in Wien.", "AT", "Implantatspezialist")).toBe("specialist:banned");
    expect(verdictIn("Ihr Implantatspezialist in Zürich.", "CH", "Implantatspezialist")).toBe("specialist:banned");
    expect(verdictIn("Hallo Kinder, heute putzen wir Zähne!", "DE", "Hallo Kinder")).toBe("children:banned");
    expect(checkText("Hallo Kinder, heute putzen wir Zähne!", "AT").filter((h) => h.rule === "children")).toEqual([]);
    // Prices are allowed in Germany in some forms: risky, not "not allowed".
    expect(verdictIn("Nur diesen Monat 20 % Rabatt.", "DE", "Rabatt")).toBe("price:risky");
    // An honest hedge passes.
    expect(checkText("Die Zähne sind nicht dauerhaft empfindlich.", "DE")).toEqual([]);
  });

  it("United Kingdom and United States", () => {
    expect(verdictIn("Meet our implant specialists.", "GB", "specialists")).toBe("specialist:banned");
    expect(verdictIn("Ask about Botox at your visit.", "GB", "Botox")).toBe("pom:banned");
    expect(verdictIn("Our team is board-certified.", "US", "board-certified")).toBe("specialist:banned");
    expect(verdictIn("Read our patient testimonials.", "GB", "testimonials")).toBe("testimonial:risky");
    expect(verdictIn("Painless whitening.", "US", "Painless")).toBe("absolute:risky");
    // A referral is education, not a claim.
    expect(checkText("Your dentist may refer you to a specialist.", "GB")).toEqual([]);
  });

  it("Spain and Mexico", () => {
    expect(verdictIn("Implantes con resultados garantizados.", "ES", "garantizados")).toBe("guarantee:banned");
    expect(verdictIn("Una cura definitiva para la periodontitis.", "ES", "cura definitiva")).toBe("cure:banned");
    expect(verdictIn("Clínica autorizada por COFEPRIS.", "MX", "COFEPRIS")).toBe("permit:banned");
    expect(checkText("Clínica autorizada por COFEPRIS.", "ES").filter((h) => h.rule === "permit")).toEqual([]);
    // The permanent filling is a dental term.
    expect(checkText("Después se coloca el empaste definitivo.", "ES")).toEqual([]);
  });

  it("France, Poland", () => {
    expect(verdictIn("Découvrez les témoignages de nos patients.", "FR", "témoignages")).toBe("testimonial:banned");
    expect(verdictIn("Le meilleur cabinet dentaire de Lyon.", "FR", "meilleur")).toBe("superlative:banned");
    expect(verdictIn("Najlepszy gabinet w Warszawie.", "PL", "Najlepszy")).toBe("superlative:banned");
    expect(verdictIn("Bezbolesne leczenie kanałowe.", "PL", "Bezbolesne")).toBe("absolute:risky");
  });

  it("Japan", () => {
    expect(verdictIn("無痛治療を行っています。", "JP", "無痛")).toBe("absolute:banned");
    expect(verdictIn("患者様の体験談をご紹介します。", "JP", "体験談")).toBe("testimonial:banned");
    expect(verdictIn("地域No.1の歯科医院です。", "JP", "No.1")).toBe("superlative:banned");
    expect(verdictIn("ビフォーアフター写真をご覧ください。", "JP", "ビフォーアフター")).toBe("before_after:risky");
    expect(checkText("永久歯は6歳頃から生えてきます。", "JP")).toEqual([]);
  });

  it("the Gulf", () => {
    expect(verdictIn("أفضل عيادة أسنان في دبي.", "AE", "أفضل")).toBe("superlative:banned");
    expect(verdictIn("زراعة تدوم مدى الحياة.", "AE", "مدى الحياة")).toBe("absolute:risky");
    // Saudi Arabia: no phrase-level text to cite, so nothing is more than risky.
    expect(checkText("أفضل عيادة أسنان، علاج بدون ألم ونتائج مضمونة.", "SA").every((h) => h.verdict === "risky")).toBe(true);
  });

  it("another country: the rules that apply nearly everywhere, nothing 'not allowed'", () => {
    const hits = checkText(CHECKER.en.ui.sample, OTHER_MARKET);
    expect(hits.length).toBeGreaterThan(4);
    expect(hits.every((h) => h.verdict === "risky")).toBe(true);
  });
});

describe("ad checker: one-tap examples", () => {
  it.each(LOCALES)("%s: three examples: the risky sample, a mixed post and a calm one", (l) => {
    const ui = CHECKER[l].ui;
    const market = DEFAULT_MARKET[l];
    const [promo, mixed, calm] = ui.examples.items;
    expect(ui.examples.items).toHaveLength(3);
    expect(promo.text).toBe(ui.sample);
    expect(new Set(checkText(promo.text, market).map((h) => h.rule)).size, `${l} promo`).toBeGreaterThanOrEqual(5);
    // The mixed post shows every kind of sentence a dentist meets: at least one OK and one flagged.
    const s = sentencesOf(mixed.text, checkText(mixed.text, market));
    expect(s.some((x) => x.verdict === "ok"), `${l} mixed has an OK sentence`).toBe(true);
    expect(s.some((x) => x.verdict !== "ok"), `${l} mixed has a flagged sentence`).toBe(true);
    // The calm post is clean wherever it is posted.
    for (const m of CHECKER_MARKETS) expect(checkText(calm.text, m), `${l} calm in ${m}`).toEqual([]);
    expect(new Set(ui.examples.items.map((e) => e.label)).size).toBe(3);
  });

  it("the mixed posts show a market's own rule where the page's market has one", () => {
    const rules = (l: (typeof LOCALES)[number], m: CheckerMarket) => checkText(CHECKER[l].ui.examples.items[1].text, m).map((h) => `${h.rule}:${h.verdict}`);
    expect(rules("tr", "TR")).toContain("booking:banned");
    expect(rules("de", "DE")).toContain("specialist:banned");
    expect(rules("en", "US")).toContain("specialist:banned");
    expect(rules("en", "GB")).toContain("specialist:banned");
    expect(rules("ar", "AE")).toContain("superlative:banned");
    expect(rules("pl", "PL")).toContain("superlative:banned");
    expect(rules("fr", "FR")).toContain("testimonial:banned");
    expect(rules("ja", "JP")).toContain("absolute:banned");
  });
});

describe("ad checker: sentence by sentence", () => {
  it("cuts after . ! ? … and line breaks, keeps abbreviations and initials", () => {
    const cut = (t: string) => splitSentences(t).map((s) => t.slice(s.start, s.end));
    expect(cut("Painless whitening! The best dentist. Ask us?")).toEqual(["Painless whitening!", "The best dentist.", "Ask us?"]);
    expect(cut("Dr. Ali Yılmaz ve Uzm. Dt. Ayşe bekliyor. Yeni satır\nikinci satır")).toEqual(["Dr. Ali Yılmaz ve Uzm. Dt. Ayşe bekliyor.", "Yeni satır", "ikinci satır"]);
    expect(cut("z. B. Zahnseide. A. Müller erklärt es.")).toEqual(["z. B. Zahnseide.", "A. Müller erklärt es."]);
    expect(cut("無痛治療です。地域No.1！ご予約を。")).toEqual(["無痛治療です。", "地域No.1！", "ご予約を。"]);
    expect(cut("هل تنزف لثتك؟ اذكر ذلك لطبيبك.")).toEqual(["هل تنزف لثتك؟", "اذكر ذلك لطبيبك."]);
    expect(cut("Version 2.5 works. $1,299 now")).toEqual(["Version 2.5 works.", "$1,299 now"]);
    expect(cut("   ")).toEqual([]);
    expect(cut("No stop at the end")).toEqual(["No stop at the end"]);
  });

  it("gives each sentence the worst verdict of its phrases, and a whole safer sentence where one fits", () => {
    const t = "Guaranteed painless whitening, 50% off this month only! An implant replaces the root of a missing tooth. Meet our implant specialists.";
    const s = sentencesOf(t, checkText(t, "GB"));
    expect(s.map((x) => x.verdict)).toEqual(["risky", "ok", "banned"]);
    expect(s[0].safer).toBe("Questions about treatment? Ask us at your next check-up.");
    expect(s[1].safer).toBeNull();
    expect(s[2].safer).toBeNull();
    // Every hit sits in exactly one sentence, in order.
    expect(s.flatMap((x) => x.hits)).toEqual(checkText(t, "GB"));
    for (const x of s) for (const h of x.hits) expect(h.start >= x.start && h.start < x.end).toBe(true);
  });

  it("Türkiye: a push to book becomes a pointer to the patient's own dentist", () => {
    const t = "Sorularınız için bize ulaşın veya randevu alın!";
    const [s] = sentencesOf(t, checkText(t, "TR"));
    expect(s.verdict).toBe("banned");
    expect(s.safer).toBe(MARKET_REWRITES.booking?.tr);
  });
});

describe("ad checker: no suggestion is itself flagged, in any market", () => {
  it("rewrites, market rewrites and safer sentences", () => {
    const fixes = [...Object.values(REWRITES).flatMap((rs) => rs.map((r) => r.fix)), ...Object.values(MARKET_REWRITES).flatMap((m) => Object.values(m ?? {}))];
    for (const m of CHECKER_MARKETS) for (const f of fixes) expect(findHardSpans(f, rulesFor(m)), `${m}: ${f}`).toEqual([]);
  });

  it.each(LOCALES)("%s: every tip, in every market", (l) => {
    const ui = CHECKER[l].ui;
    const tips = [...Object.values(ui.rules), ...Object.values(ui.marketRules)].map((r) => r.tip);
    for (const m of CHECKER_MARKETS) for (const t of tips) expect(findHardSpans(t, rulesFor(m)), `${l}/${m}: ${t}`).toEqual([]);
  });

  it.each(LOCALES)("%s: names, explanations and tips for every rule a market can report", (l) => {
    const ui = CHECKER[l].ui;
    expect(Object.keys(ui.marketRules).sort()).toEqual([...CHECKER_MARKET_RULE_IDS].sort());
    for (const r of Object.values(ui.marketRules)) for (const t of [r.name, r.why, r.tip]) expect(t.length).toBeGreaterThan(2);
    expect(ui.verdicts.banned).toContain("{market}");
    for (const k of ["{ok}", "{risky}", "{banned}"]) expect(ui.summary).toContain(k);
  });
});

describe("ad checker: a shared link carries the text in its fragment", () => {
  it.each([
    ["en", "US", "Guaranteed painless whitening, 50% off! #1 in town & more + 100% = ?"],
    ["tr", "TR", "Ağrısız implant, garantili sonuç!\nŞehrin en iyi kliniği. İğdır, Çanakkale."],
    ["ar", "AE", "أفضل عيادة أسنان في دبي. خصم 50%!"],
    ["ja", "JP", "無痛治療で絶対安心！地域No.1。🦷"],
    ["de", "XX", "Schmerzfreie Implantate — 20 % Rabatt; a=b&c=d#x"],
  ] as const)("%s round trip", (_l, market, text) => {
    const url = shareUrl("https://dentvideo.com/ad-checker?utm_source=x#old", text, market);
    expect(url.startsWith("https://dentvideo.com/ad-checker#m=")).toBe(true);
    const hash = url.slice(url.indexOf("#"));
    // Nothing after the path but the fragment: no query string a server would see.
    expect(url.split("#")[0]).toBe("https://dentvideo.com/ad-checker");
    expect(readShareFragment(hash)).toEqual({ text, market });
    expect(readShareFragment(new URL(url).hash)).toEqual({ text, market });
  });

  it("ignores plain anchors, empty texts and unknown markets, and caps the length", () => {
    expect(readShareFragment("#how")).toBeNull();
    expect(readShareFragment("")).toBeNull();
    expect(readShareFragment("#m=TR&t=")).toBeNull();
    expect(readShareFragment("#m=TR&t=%20%20")).toBeNull();
    expect(readShareFragment("#t=Painless&m=ZZ")).toEqual({ text: "Painless", market: null });
    expect(readShareFragment("#t=Painless&m=tr")).toEqual({ text: "Painless", market: "TR" });
    expect(readShareFragment(`#${shareFragment("a".repeat(9000), "TR")}`)?.text.length).toBe(6000);
  });
});

describe("ad checker: checking makes no network request", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs every example in every market with fetch, XHR and beacons unavailable", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("network");
    });
    const xhr = vi.fn(() => {
      throw new Error("network");
    });
    const beacon = vi.fn(() => false);
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("XMLHttpRequest", xhr);
    vi.stubGlobal("navigator", { sendBeacon: beacon, language: "en-US" });
    for (const l of LOCALES) {
      for (const ex of CHECKER[l].ui.examples.items) {
        for (const m of CHECKER_MARKETS) {
          const hits = checkText(ex.text, m);
          sentencesOf(ex.text, hits);
          checkerEventProps(hits, m);
          readShareFragment(`#${shareFragment(ex.text, m)}`);
        }
      }
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("the engine, the market table, the share link and the card hold no network or storage code", () => {
    const src = path.resolve(__dirname, "../..");
    for (const f of ["lib/dentvid/ad-checker.ts", "lib/dentvid/hard-rules.ts", "lib/dentvid/checker-markets.ts", "lib/dentvid/checker-share.ts", "components/dentvid/checker-card.ts"]) {
      const code = fs.readFileSync(path.join(src, f), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|document\.cookie|new Image\s*\(|\bimport\s*\(/);
    }
  });
});

describe("ad checker: the result image", () => {
  /** A 2D context that records what would be painted; every character is 20 px wide. */
  function recorder() {
    const texts: string[] = [];
    const ctx = {
      fillStyle: "",
      font: "",
      textAlign: "start",
      textBaseline: "top",
      direction: "ltr",
      fillRect: () => {},
      fillText: (t: string) => void texts.push(t),
      measureText: (t: string) => ({ width: [...t].length * 20 }) as TextMetrics,
      beginPath: () => {},
      fill: () => {},
      roundRect: () => {},
    };
    return { ctx: ctx as unknown as CardContext & { direction: string }, texts };
  }

  it("draws the title, the summary, each flagged sentence and the disclaimer, from the data alone", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { ctx, texts } = recorder();
    drawCard(ctx, {
      dir: "ltr",
      title: "Ad check · United Kingdom",
      summary: "OK: 1 · Risky: 1 · Not allowed: 1",
      rows: [
        { verdict: "banned", label: "Not allowed · United Kingdom", text: "Meet our implant specialists." },
        { verdict: "risky", label: "Risky", text: "Painless whitening." },
      ],
      more: 0,
      footer: "dentvideo.com · A careful filter, not legal advice.",
      font: "system-ui",
    });
    const all = texts.join("\n");
    for (const t of ["DentVideo", "Ad check · United Kingdom", "OK: 1 · Risky: 1 · Not allowed: 1", "Not allowed · United Kingdom", "Meet our implant specialists.", "Painless whitening."]) expect(all).toContain(t);
    expect(all).toContain("A careful filter");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("right to left for Arabic, and at most a few rows", () => {
    const { ctx, texts } = recorder();
    const rows = Array.from({ length: 9 }, (_, i) => ({ verdict: "risky" as const, label: "فيه مخاطرة", text: `جملة رقم ${i}` }));
    drawCard(ctx, { dir: "rtl", title: "فحص الإعلان · الإمارات", summary: "s", rows, more: 4, footer: "f", font: "x" });
    expect(ctx.direction).toBe("rtl");
    expect(texts.filter((t) => t.startsWith("جملة")).length).toBeLessThanOrEqual(CARD_MAX_ROWS);
  });

  it("wraps by words, or by characters for Japanese, and cuts with an ellipsis", () => {
    const { ctx } = recorder();
    expect(wrapLines(ctx, "one two three four five six", 260, 2)).toEqual(["one two three", "four five six"]);
    const cut = wrapLines(ctx, "one two three four five six seven eight nine ten", 260, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1].endsWith("…")).toBe(true);
    expect(wrapLines(ctx, "無痛治療で絶対安心地域一番の歯科医院", 200, 2)).toEqual(["無痛治療で絶対安心地", "域一番の歯科医院"]);
  });
});

describe("ad checker: analytics", () => {
  it("counts, the market and how many are not allowed: never the words", () => {
    const hits = checkText("Meet our implant specialists. Painless whitening.", "GB");
    expect(checkerEventProps(hits, "GB")).toEqual({ hits: 2, rules: 2, clean: false, banned: 1, market: "GB" });
    expect(checkerEventProps(hits, OTHER_MARKET)).toEqual({ hits: 2, rules: 2, clean: false, banned: 1 });
    expect(sanitizeProps("checker_used", { hits: 2, rules: 2, clean: false, banned: 1, market: "GB", text: "Painless" })).toEqual({ hits: 2, rules: 2, clean: false, banned: 1, market: "GB" });
    expect(sanitizeProps("checker_shared", { method: "link", market: "TR", url: "https://dentvideo.com/ad-checker#t=Painless" })).toEqual({ method: "link", market: "TR" });
    expect(sanitizeProps("checker_shared", { method: "Painless whitening" })).toEqual({});
    expect(parseClientEvent(JSON.stringify({ name: "checker_shared", locale: "tr", props: { method: "image" } }))?.props).toEqual({ method: "image" });
  });
});
