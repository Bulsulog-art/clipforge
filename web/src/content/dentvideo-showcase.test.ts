import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// next/font only works inside Next's compiler: any font is a class name here.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LOCALES, type Locale } from "./dentvideo";
import { RULE_MARKETS, SHOWCASE, marketName, ruleMarketsFor } from "./dentvideo-showcase";
import { samplesFor } from "./dentvideo-samples";
import { DentVideoLanding } from "@/components/dentvid/landing";

/**
 * The landing's visual sections (the profile story, the country rules, the
 * sample week's labels): copy in every language, compliant wording, only true
 * claims — and the page's layout contract (section order, no preloaded video).
 */

// The components use the classic JSX runtime under vitest.
(globalThis as { React?: typeof React }).React = React;

const strings = (v: unknown): string[] =>
  typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
const shape = (v: unknown): unknown =>
  v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort().map(([k, x]) => [k, shape(x)])) : typeof v;

/**
 * Health-advertising and consumer-law red flags, per language (the same lists
 * as conversion.test.ts), plus "before/after" — this section shows a profile
 * over time and must never borrow that phrase — and follower or like counts.
 */
const BANNED: Record<Locale, RegExp[]> = {
  en: [/\bbest\b/i, /\bguarantee/i, /\bpainless\b/i, /#1|number one/i, /\bresults?\b/i, /testimonial|\brated\b|\bstars?\b/i, /\bfree\b/i, /before[- ]?(and|&|\/)[- ]?after/i, /follower|\blikes?\b|\bviral\b/i],
  de: [/\bbeste/i, /garantie|garantiert/i, /schmerzfrei/i, /ergebnis/i, /bewertung|erfahrungsbericht/i, /kostenlos|gratis/i, /vorher[- ]?nachher/i, /follower|likes/i],
  es: [/\bmejor(es)?\b/i, /garantiza/i, /sin dolor/i, /\bresultado/i, /testimonio|reseña|valoraci/i, /gratis/i, /antes y después/i, /seguidores|me gusta/i],
  tr: [/en iyi/i, /garanti/i, /ağrısız|acısız/i, /sonuç/i, /yorum|referans/i, /ücretsiz|bedava/i, /öncesi[- ]?sonrası/i, /takipçi|beğeni/i],
  fr: [/meilleur/i, /garanti/i, /indolore|sans douleur/i, /résultat/i, /témoignage|avis client/i, /gratuit/i, /avant[- ]après/i, /abonnés|j'aime/i],
  ja: [/最高/, /一番|日本一|No\.?1/i, /絶対|必ず/, /無痛|痛くない/, /効果/, /口コミ|体験談/, /無料/, /ビフォーアフター/, /フォロワー|いいね/, /あなた/],
  ar: [/الأفضل|أفضل/, /مضمون|نضمن|ضمان/, /بدون ألم|بلا ألم/, /نتائج/, /شهادات|تقييم/, /مجان/, /قبل وبعد/, /متابع|إعجاب/],
  pl: [/najlepsz/i, /gwarant/i, /bezbolesn/i, /efekt/i, /opini|referencj/i, /bezpłatn|darmow|za darmo/i, /przed i po/i, /obserwuj|polubie/i, /\b[Tt]w(ój|oja|oje|ojego|ojej|oich|oim)\b/],
};

describe("showcase copy, every language", () => {
  it("every language has the same keys as English, and no empty strings", () => {
    for (const l of LOCALES) {
      expect(shape(SHOWCASE[l]), l).toEqual(shape(SHOWCASE.en));
      for (const s of strings(SHOWCASE[l])) expect(s.trim().length, `${l}: ${s}`).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES.filter((l) => l !== "en"))("%s: translated, not English left in place", (l) => {
    const en = SHOWCASE.en;
    const c = SHOWCASE[l];
    for (const [a, b] of [
      [c.feed.heading, en.feed.heading],
      [c.feed.text, en.feed.text],
      [c.feed.laterCaption, en.feed.laterCaption],
      [c.rules.heading, en.rules.heading],
      [c.rules.text, en.rules.text],
      [c.rules.note, en.rules.note],
      [c.videoOf, en.videoOf],
    ]) expect(a, l).not.toBe(b);
  });

  it.each(LOCALES)("%s: no superlatives, guarantees, results, testimonials, free offers, before/after or follower counts", (l) => {
    for (const s of strings(SHOWCASE[l])) for (const re of BANNED[l]) expect(s, `${l} ${re}`).not.toMatch(re);
  });

  it.each(LOCALES)("%s: the only figures are facts — five videos a week, so twenty in four weeks", (l) => {
    const { feed, videoOf } = SHOWCASE[l];
    for (const m of strings(feed).join(" ").match(/\d+/g) ?? []) expect(["4", "20"], `${l}: ${m}`).toContain(m);
    expect(videoOf).toContain("{n}");
    expect(videoOf.replace("{n}", "")).toMatch(/5/);
    // No money, no percentages.
    expect(JSON.stringify(SHOWCASE[l])).not.toMatch(/[$€£₺]\s?\d|\d\s?(%|€|\$|£|TL)/);
  });

  it.each(LOCALES)("%s: the profile story says it is an illustration and leaves the choice to the clinic", (l) => {
    // The note is present and different from the caption lines: it is the disclaimer, not a repeat.
    const f = SHOWCASE[l].feed;
    expect(f.note).not.toBe(f.laterCaption);
    expect(f.note.length).toBeGreaterThan(20);
  });

  it("the demo clinic on the profile is the sample week's own demo clinic name (content/dentvideo-samples.ts)", () => {
    const src = readFileSync(path.resolve(__dirname, "dentvideo-samples.ts"), "utf8");
    for (const l of LOCALES) expect(src, l).toContain(SHOWCASE[l].feed.clinic);
  });
});

describe("country rules: only markets the reviewer is really briefed for", () => {
  // The source of truth: the compliance reviewer's per-country rules in the worker.
  const worker = readFileSync(path.resolve(__dirname, "../../../worker/src/dental/locale.ts"), "utf8");
  const body = worker.slice(worker.indexOf("export function marketRules"), worker.indexOf("export function captionRules"));
  const briefed = new Set([...body.matchAll(/c === "([A-Z]{2})"/g)].map((m) => m[1]));
  const gcc = [...(worker.match(/const GCC = \[([^\]]+)\]/)?.[1] ?? "").matchAll(/"([A-Z]{2})"/g)].map((m) => m[1]);

  it("every badge on the page is a market with its own rules in worker/src/dental/locale.ts, and none is missing", () => {
    expect(body.length).toBeGreaterThan(100);
    expect(gcc).toEqual(["AE", "SA", "QA", "KW", "BH", "OM"]);
    expect(body).toContain("GCC.includes(c)");
    const ours = RULE_MARKETS.map((m) => m.code).filter((c) => c !== "GULF");
    expect(new Set(ours)).toEqual(briefed);
  });

  it("each badge's rule name is the one the reviewer is given", () => {
    const named: Record<string, RegExp> = {
      TR: /Tanıtım ve Bilgilendirme/,
      DE: /Heilmittelwerbegesetz \(HWG\) and the dental Berufsordnung/,
      AT: /§ 35 Zahnärztegesetz \(ZÄG\)/,
      CH: /Art\. 40 Medizinalberufegesetz \(MedBG/,
      ES: /Real Decreto 1907\/1996/,
      MX: /Ley General de Salud[\s\S]*COFEPRIS/,
      JP: /医療法 and the MHLW 医療広告ガイドライン/,
      GULF: /DHA[\s\S]*DoH Abu Dhabi, MOHAP and Saudi MOH/,
      PL: /Kodeks Etyki Lekarskiej \(2025, art\. 71\)/,
      SG: /Healthcare Services \(Advertisement\) Regulations 2021/,
    };
    for (const m of RULE_MARKETS) expect(body, m.code).toMatch(named[m.code]);
  });

  it.each(LOCALES)("%s: every market has a name in the page's language, and the page's own market comes first", (l) => {
    const list = ruleMarketsFor(l);
    expect(list).toHaveLength(RULE_MARKETS.length);
    for (const m of list) expect(marketName(l, m.code).trim(), `${l} ${m.code}`).not.toBe(m.code);
    const first: Partial<Record<Locale, string>> = { de: "DE", es: "ES", tr: "TR", ja: "JP", ar: "GULF", pl: "PL" };
    if (first[l]) expect(list[0].code, l).toBe(first[l]);
  });
});

describe("landing layout contract", () => {
  const html = (l: Locale) => renderToStaticMarkup(createElement(DentVideoLanding, { locale: l }));

  it.each(LOCALES)("%s: hero → problem → samples → profile story → how → … → pricing → trust → FAQ → guides", (l) => {
    const page = html(l);
    // From the h1 on: the JSON-LD above it repeats some of the same words (the FAQ questions).
    const h1 = page.indexOf("<h1");
    const at = (needle: string) => {
      const i = page.indexOf(needle, h1);
      expect(i, `${l}: ${needle}`).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at("<h1"),
      at(LANDING[l].problem[0].title),
      at('id="samples"'),
      at("data-feed-story"),
      at('id="how"'),
      at("data-country-rules"),
      at('id="compare"'),
      at('id="pricing"'),
      at('id="trust"'),
      at(LANDING[l].faq[0].q.replace(/'/g, "&#x27;")),
      at('id="guides"'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it.each(LOCALES)("%s: every country badge is on the page, with a flag", (l) => {
    const page = html(l);
    for (const m of RULE_MARKETS) {
      expect(page, `${l} ${m.code}`).toContain(`data-market="${m.code}"`);
      expect(page, `${l} ${m.code}`).toContain(`data-flag="${m.code}"`);
    }
  });

  it.each(LOCALES)("%s: no video downloads before it is asked for (preload none, poster set)", (l) => {
    const videos = html(l).match(/<video[^>]*>/g) ?? [];
    expect(videos.length).toBe(samplesFor(l) ? 4 : 0);
    for (const v of videos) {
      expect(v, l).toContain('preload="none"');
      expect(v, l).toMatch(/poster="[^"]+\.jpg"/);
      expect(v, l).not.toMatch(/\bautoplay\b/i);
    }
  });

  it.each(LOCALES)("%s: the sample week labels each video as one of the week's five", (l) => {
    const page = html(l);
    if (!samplesFor(l)) return;
    for (const n of [1, 2, 3]) expect(page).toContain(SHOWCASE[l].videoOf.replace("{n}", String(n)));
  });

  it.each(LOCALES)("%s: pricing is clear — the founding card says it is the founding offer, Group is contact-only, no dark patterns", (l) => {
    const page = html(l);
    const pricing = page.slice(page.indexOf('id="pricing"'), page.indexOf('id="trust"'));
    const p = LANDING[l].pricing;
    const practice = pricing.slice(pricing.indexOf('data-tier="practice"'), pricing.indexOf('data-tier="group"'));
    expect(practice).toContain(p.foundingBadge);
    expect(practice).toContain(p.foundingCard.listPrice);
    expect(pricing).toContain('data-tier="group"');
    expect(pricing.slice(pricing.indexOf('data-tier="group"'))).toContain("mailto:hello@dentvideo.com");
    expect(page).not.toMatch(/countdown|only \d+ (left|spots)|hurry|expires in/i);
  });

  it("with the founding offer closed, Practice is simply recommended at its list price", () => {
    vi.stubEnv("DENTVIDEO_FOUNDING_OFFER", "closed");
    try {
      const page = html("en");
      expect(page).not.toContain("data-founding-banner");
      const practice = page.slice(page.indexOf('data-tier="practice"'), page.indexOf('data-tier="group"'));
      expect(practice).toContain(LANDING.en.pricing.recommended);
      expect(practice).not.toContain(LANDING.en.pricing.foundingBadge);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
