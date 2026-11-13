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
import { APP_TEXT } from "./dentvideo-app";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { DV_PRICES_USD } from "@/lib/dentvid/billing";
import { LEGAL_KINDS } from "./legal/types";
import { legalPath } from "./legal/nav";

/**
 * The conversion pass: a first screen that says what you get, for whom,
 * and three true risk-reducers; honest trust facts; the FAQ objections a
 * dentist has before paying. Copy is checked in every language for presence,
 * length, banned words and the facts it must not drift from.
 */

// The components use the classic JSX runtime under vitest.
(globalThis as { React?: typeof React }).React = React;

const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const NEW_FAQ = 3;

/** The new copy only: hero, the "from" price, trust, and the three new FAQ entries (before the last one). */
function newCopy(l: Locale): string[] {
  const c = LANDING[l];
  const faq = c.faq.slice(-1 - NEW_FAQ, -1).flatMap((f) => [f.q, f.a]);
  return [c.hero.h1, c.hero.lead, ...c.hero.points, c.pricing.from, c.trust.heading, c.trust.legal, ...c.trust.items.flatMap((i) => [i.title, i.text]), ...faq];
}

/**
 * Health-advertising and consumer-law red flags, per language: superlatives,
 * guarantees, "painless", rankings, promised results, testimonials or ratings.
 * (The landing's "what we catch" section names some of these on purpose; the
 * new copy must not use them.)
 */
const BANNED: Record<Locale, RegExp[]> = {
  en: [/\bbest\b/i, /\bguarantee/i, /\bpainless\b/i, /#1|number one/i, /\bcheapest\b/i, /\bresults?\b/i, /testimonial|review(ed)? by|\brated\b|\bstars?\b/i, /\bfree\b/i],
  de: [/\bbeste/i, /garantie|garantiert/i, /schmerzfrei/i, /nr\.?\s?1/i, /ergebnis/i, /bewertung|erfahrungsbericht/i, /kostenlos|gratis/i],
  es: [/\bmejor(es)?\b/i, /garantiza/i, /sin dolor/i, /\bresultado/i, /testimonio|reseña|valoraci/i, /gratis/i],
  tr: [/en iyi/i, /garanti/i, /ağrısız|acısız/i, /sonuç/i, /yorum|referans/i, /ücretsiz|bedava/i],
  fr: [/meilleur/i, /garanti/i, /indolore|sans douleur/i, /résultat/i, /témoignage|avis client/i, /gratuit/i],
  ja: [/最高/, /一番|日本一|No\.?1/i, /絶対|必ず/, /無痛|痛くない/, /効果/, /口コミ|体験談/, /無料/],
  ar: [/الأفضل|أفضل/, /مضمون|نضمن|ضمان/, /بدون ألم|بلا ألم/, /نتائج/, /شهادات|تقييم/, /مجان/],
  pl: [/najlepsz/i, /gwarant/i, /bezbolesn/i, /efekt/i, /opini|referencj/i, /bezpłatn|darmow|za darmo/i],
};

/** The words for "cancel" that a risk-reducer must contain, per language. */
const CANCEL: Record<Locale, RegExp> = {
  en: /cancel/i,
  de: /kündbar|kündigen/i,
  es: /cancela/i,
  tr: /iptal/i,
  fr: /résili/i,
  ja: /解約/,
  ar: /إلغاء|إلغاؤه/,
  pl: /rezygnacj/i,
};

describe("conversion copy, every language", () => {
  it.each(LOCALES)("%s: hero, risk-reducers, trust and the new FAQ are all there", (l) => {
    const c = LANDING[l];
    expect(c.hero.points).toHaveLength(3);
    expect(c.trust.items).toHaveLength(4);
    expect(c.faq).toHaveLength(LANDING.en.faq.length);
    for (const s of newCopy(l)) expect(s.trim().length, `${l}: ${s}`).toBeGreaterThan(0);
    expect(APP_TEXT[l].onboarding.moreDetails.trim().length).toBeGreaterThan(0);
  });

  it.each(LOCALES)("%s: the first screen stays short", (l) => {
    const h = LANDING[l].hero;
    if (l === "ja") {
      expect(h.h1.length).toBeLessThanOrEqual(30);
      expect(h.lead.length).toBeLessThanOrEqual(110);
      for (const p of h.points) expect(p.length, p).toBeLessThanOrEqual(26);
    } else {
      expect(h.h1.length, h.h1).toBeLessThanOrEqual(72);
      expect(words(h.lead), h.lead).toBeLessThanOrEqual(32);
      for (const p of h.points) expect(p.length, p).toBeLessThanOrEqual(66);
    }
  });

  it.each(LOCALES)("%s: no banned words in the new copy", (l) => {
    for (const s of newCopy(l)) for (const re of BANNED[l]) expect(s, `${l} ${re}`).not.toMatch(re);
  });

  it.each(LOCALES)("%s: the risk-reducers are the true ones — cancel anytime, preview before paying; no founding offer any more", (l) => {
    const c = LANDING[l];
    expect(c.hero.points[0]).toMatch(CANCEL[l]);
    expect(c.hero).not.toHaveProperty("note");
    // No figure that is not a fact we state elsewhere: the 15 minutes is the plan step's own promise
    // (Japanese also writes "1週間分", one week's worth).
    for (const m of c.hero.points.join(" ").match(/\d+/g) ?? []) expect(["15", "1"]).toContain(m);
    expect(APP_TEXT[l].onboarding.planLead).toContain("15");
  });

  it.each(LOCALES)("%s: the starting price is Starter's monthly list price", (l) => {
    const figures = (LANDING[l].pricing.from.match(/\d+/g) ?? []).map(Number);
    expect(figures).toEqual([DV_PRICES_USD.starter.month]);
  });

  it.each(LOCALES)("%s: trust facts match the legal pages", (l) => {
    const text = LANDING[l].trust.items.map((i) => `${i.title} ${i.text}`).join(" ");
    for (const fact of ["BLS AI Automation DOO", "Bulsu Labs", "Dodo Payments", "hello@dentvideo.com", "30"]) expect(text, `${l}: ${fact}`).toContain(fact);
  });

  it.each(LOCALES)("%s: the new FAQ answers time to first videos, who approves, and cancelling", (l) => {
    const [first, approve, cancel] = LANDING[l].faq.slice(-1 - NEW_FAQ, -1);
    expect(first.a).toContain("15");
    expect(approve.q.length).toBeGreaterThan(5);
    expect(`${cancel.q} ${cancel.a}`).toMatch(CANCEL[l]);
    // The former founding offer ("price fixed for 12 months") is gone from the answer.
    expect(cancel.a).not.toMatch(/12/);
  });
});

describe("landing page structure", () => {
  const html = (l: Locale) => renderToStaticMarkup(createElement(DentVideoLanding, { locale: l }));

  it.each(LOCALES)("%s: h1 → CTA → risk-reducers → sample video in the hero, in that order", (l) => {
    const page = html(l);
    const h1 = page.indexOf("<h1");
    const cta = page.indexOf('data-cta="hero"');
    const points = page.indexOf("data-hero-points");
    const video = page.indexOf("<video");
    expect(h1).toBeGreaterThan(-1);
    expect(cta).toBeGreaterThan(h1);
    expect(points).toBeGreaterThan(cta);
    expect(video).toBeGreaterThan(points);
    // The hero CTA goes to the sign-up in the page's language; so does every pricing CTA.
    const heroLink = page.slice(page.lastIndexOf("<a ", cta), page.indexOf(">", cta));
    expect(heroLink).toMatch(new RegExp(`href="[^"]*/start\\?lang=${l}"`));
    expect((page.match(/data-cta="pricing"/g) ?? []).length).toBe(2);
    expect(page).toContain(LANDING[l].pricing.from.replace(/'/g, "&#x27;"));
  });

  it.each(LOCALES)("%s: the trust section links every legal page and sits after pricing, before the FAQ", (l) => {
    const page = html(l);
    const trust = page.indexOf('id="trust"');
    expect(trust).toBeGreaterThan(page.indexOf('id="pricing"'));
    expect(page.indexOf(LANDING[l].faqHeading, trust)).toBeGreaterThan(trust);
    const section = page.slice(trust, page.indexOf("</section>", trust));
    for (const k of LEGAL_KINDS) expect(section, k).toContain(`href="${legalPath(k, l)}"`);
  });

  it("no exit-intent, countdown or fake scarcity widgets", () => {
    for (const l of LOCALES) {
      const page = html(l);
      expect(page).not.toMatch(/exit-intent|countdown|beforeunload|only \d+ left/i);
    }
  });
});
