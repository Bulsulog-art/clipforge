import { describe, expect, it, vi } from "vitest";

// next/font only works inside Next's compiler: any font is a class name here.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
import { dvTierPrice } from "@/lib/dentvid/pricing";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LOCALES, type Locale } from "./dentvideo";
import { APP_TEXT } from "./dentvideo-app";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { LEGAL_KINDS } from "./legal/types";
import { legalPath } from "./legal/nav";
import { OPERATOR } from "./guides/operator";

/**
 * The premium landing (2026-11-15): what arrives, the logo preview right
 * under the hero, the deliverable, the value, control, the rules, fit, the
 * alternatives, plans with what is and is not included, before you decide,
 * who is behind it, ten questions, one last action. Copy is checked in every
 * language for presence, length, banned words and the facts it must not
 * drift from; the page for its order.
 */

// The components use the classic JSX runtime under vitest.
(globalThis as { React?: typeof React }).React = React;

const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/**
 * The selling copy: hero, preview, value, control, fit, scope, before-you-decide,
 * trust and the final action. The rules section, the comparison and the FAQ
 * name restricted claims on purpose (“painless”, before-and-after…), so they
 * are not scanned here.
 */
function sellingCopy(l: Locale): string[] {
  const c = LANDING[l];
  return [
    c.hero.eyebrow,
    c.hero.h1,
    c.hero.lead,
    c.hero.cta,
    c.hero.ctaHint,
    c.hero.priceNote,
    ...c.hero.facts,
    c.teaser.heading,
    c.teaser.text,
    c.teaser.cta,
    ...c.value.items.flatMap((i) => [i.title, i.text]),
    c.control.heading,
    ...c.control.points.flatMap((i) => [i.title, i.text]),
    ...c.fit.yes,
    ...c.scope.included,
    ...c.before.items.map((i) => i.title),
    ...c.trust.items.flatMap((i) => [i.title, i.text]),
    c.final.heading,
    c.final.cta,
  ];
}

/**
 * Health-advertising and consumer-law red flags, per language: superlatives,
 * guarantees, "painless", rankings, promised results, testimonials or ratings.
 */
const BANNED: Record<Locale, RegExp[]> = {
  en: [/\bbest\b/i, /\bguarantee/i, /\bpainless\b/i, /#1|number one/i, /\bcheapest\b/i, /\bresults?\b/i, /testimonial|review(ed)? by|\brated\b|\bstars?\b/i, /\brefund/i, /money[- ]back/i, /\bdiscount/i],
  de: [/\bbeste/i, /garantie|garantiert/i, /schmerzfrei/i, /nr\.?\s?1/i, /ergebnis/i, /bewertung|erfahrungsbericht/i, /erstattung|geld[- ]zurück/i, /rabatt/i],
  es: [/\bmejor(es)?\b/i, /garantiza/i, /sin dolor/i, /\bresultado/i, /testimonio|reseña|valoraci/i, /gratis/i, /reembols/i, /descuento/i],
  tr: [/en iyi/i, /garanti/i, /ağrısız|acısız/i, /sonuç/i, /hasta yorum|referans/i, /bedava/i, /para iadesi|iade/i, /indirim/i],
  fr: [/meilleur/i, /garanti/i, /indolore|sans douleur/i, /résultat/i, /témoignage|avis client/i, /gratuit/i, /rembours/i, /réduction/i],
  ja: [/最高/, /一番|日本一|No\.?1/i, /絶対|必ず/, /無痛|痛くない/, /効果/, /口コミ|体験談/, /無料/, /返金/, /割引/],
  ar: [/الأفضل|أفضل/, /مضمون|نضمن|ضمان/, /بدون ألم|بلا ألم/, /نتائج/, /شهادات|تقييم/, /مجان/, /استرداد/, /خصم/],
  pl: [/najlepsz/i, /gwarant/i, /bezbolesn/i, /efekt/i, /opini|referencj/i, /bezpłatn|darmow|za darmo/i, /zwrot pieniędzy/i, /rabat/i],
};

/** The words for "cancel" that the price line and the cancel answer must contain, per language. */
const CANCEL: Record<Locale, RegExp> = {
  en: /cancel/i,
  de: /kündbar|kündigen/i,
  es: /cancela/i,
  tr: /iptal|İptal/,
  fr: /résili/i,
  ja: /解約/,
  ar: /إلغاء|إلغاؤه/,
  pl: /rezygnacj|zrezygnować/i,
};

describe("landing copy, every language", () => {
  it.each(LOCALES)("%s: every section is there, with the brief's counts", (l) => {
    const c = LANDING[l];
    expect(c.hero.facts).toHaveLength(3);
    expect(c.monday.items).toHaveLength(7);
    expect(c.value.items).toHaveLength(4);
    expect(c.how.steps).toHaveLength(3);
    expect(c.control.points).toHaveLength(6);
    expect(c.trust.items).toHaveLength(4);
    expect(c.trust.data).toHaveLength(3);
    expect(c.faq).toHaveLength(10);
    for (const s of sellingCopy(l)) expect(s.trim().length, `${l}: ${s}`).toBeGreaterThan(0);
  });

  it.each(LOCALES)("%s: the first screen stays short", (l) => {
    const h = LANDING[l].hero;
    if (l === "ja") {
      expect(h.h1.length).toBeLessThanOrEqual(30);
      expect(h.lead.length).toBeLessThanOrEqual(110);
      for (const p of h.facts) expect(p.length, p).toBeLessThanOrEqual(26);
    } else {
      expect(h.h1.length, h.h1).toBeLessThanOrEqual(72);
      expect(words(h.lead), h.lead).toBeLessThanOrEqual(45);
      for (const p of h.facts) expect(p.length, p).toBeLessThanOrEqual(72);
    }
  });

  it.each(LOCALES)("%s: no banned words, no refund, guarantee or discount offer in the selling copy", (l) => {
    for (const s of sellingCopy(l)) for (const re of BANNED[l]) expect(s, `${l} ${re}`).not.toMatch(re);
  });

  it.each(LOCALES)("%s: no guarantee, refund or satisfaction offer anywhere on the landing (owner decision 2026-11-15)", (l) => {
    const OFFER = /money[- ]back|satisfaction guarantee|risk[- ]free|geld[- ]zurück|zufriedenheitsgarantie|devoluci[oó]n del dinero|para iade garantisi|satisfait ou rembours|返金保証|ضمان استرداد|gwarancj\S* zwrotu/i;
    expect(JSON.stringify(LANDING[l])).not.toMatch(OFFER);
  });

  it.each(LOCALES)("%s: the facts are the true ones — approval, no fake people, the 15 minutes the plan step promises", (l) => {
    const c = LANDING[l];
    // The only figure in the facts is the plan step's own promise (Japanese also writes 1週間分).
    for (const m of c.hero.facts.join(" ").match(/\d+/g) ?? []) expect(["15", "1"]).toContain(m);
    expect(APP_TEXT[l].onboarding.planLead).toContain("15");
    expect(c.hero.priceNote).toMatch(CANCEL[l]);
    expect(`${c.faq[9].q} ${c.faq[9].a}`).toMatch(CANCEL[l]);
  });

  it.each(LOCALES)("%s: prices are slots, never typed", (l) => {
    const c = LANDING[l];
    for (const t of [c.pricing.from, c.final.small]) {
      expect(t.match(/\d+/g), t).toBeNull();
      expect(t).toContain("{price}");
    }
    expect(c.compare.cost.ours).toContain("{starter}");
    expect(c.compare.cost.ours).toContain("{practice}");
    expect(c.compare.cost.ours.match(/\d/)).toBeNull();
  });

  it.each(LOCALES)("%s: trust facts match the legal pages", (l) => {
    const text = LANDING[l].trust.items.map((i) => `${i.title} ${i.text}`).join(" ");
    for (const fact of ["BLS AI Automation DOO", "Bulsu Labs", "Dodo Payments", "hello@dentvideo.com", "30"]) expect(text, `${l}: ${fact}`).toContain(fact);
    // The DPA facts: concluded with the Terms, OpenAI named as the sub-processor for scripts and narration.
    expect(LANDING[l].trust.data[1].text).toContain("OpenAI");
  });
});

describe("landing page structure", () => {
  const html = (l: Locale) => renderToStaticMarkup(createElement(DentVideoLanding, { locale: l }));

  it.each(LOCALES)("%s: h1 → CTA → facts → the hero video, then the logo preview straight after the hero", (l) => {
    const page = html(l);
    const h1 = page.indexOf("<h1");
    const cta = page.indexOf('data-cta="hero"');
    const facts = page.indexOf("data-hero-points");
    const video = page.indexOf("<video");
    expect(h1).toBeGreaterThan(-1);
    expect(cta).toBeGreaterThan(h1);
    expect(facts).toBeGreaterThan(cta);
    expect(video).toBeGreaterThan(facts);
    // The hero CTA goes down to the no-account preview, which is the section right after the hero.
    const heroLink = page.slice(page.lastIndexOf("<a ", cta), page.indexOf(">", cta));
    expect(heroLink).toContain('href="#try"');
    const tryAt = page.indexOf('id="try"');
    expect(tryAt).toBeGreaterThan(video);
    expect(page.indexOf("<section", page.indexOf("</section>", video))).toBe(page.lastIndexOf("<section", tryAt));
    const teaser = page.indexOf('data-cta="teaser"');
    const teaserLink = page.slice(page.lastIndexOf("<a ", teaser), page.indexOf(">", teaser));
    expect(teaserLink).toMatch(new RegExp(`href="[^"]*/start\\?lang=${l}"`));
    expect(page).toContain(LANDING[l].hero.ctaHint);
    expect((page.match(/data-cta="pricing"/g) ?? []).length).toBe(2);
    // The hero's "from" line: the template around Starter's server-rendered USD price.
    const [before] = LANDING[l].pricing.from.split("{price}");
    if (before) expect(page).toContain(before.replace(/'/g, "&#x27;").trim());
    expect(page).toContain(dvTierPrice(l, "starter", "USD"));
  });

  // The brief's order, with "who it is for" moved after the plans so pricing comes sooner on a phone.
  it.each(LOCALES)("%s: the fifteen sections, in order", (l) => {
    const page = html(l);
    const at = (needle: string) => {
      const i = page.indexOf(needle, page.indexOf("<h1"));
      expect(i, `${l}: ${needle}`).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at("<h1"),
      at('id="try"'),
      at('id="monday"'),
      at('id="samples"'),
      at('id="value"'),
      at('id="how"'),
      at('id="control"'),
      at('id="rules"'),
      at('id="compare"'),
      at('id="pricing"'),
      at("data-scope"),
      at("data-before"),
      at('id="fit"'),
      at('id="trust"'),
      at('id="faq"'),
      at("data-final"),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it.each(LOCALES)("%s: the trust section names the company, a person and the support address, and links every legal page and the DPA", (l) => {
    const page = html(l);
    const trust = page.indexOf('id="trust"');
    expect(trust).toBeGreaterThan(page.indexOf('id="pricing"'));
    const section = page.slice(trust, page.indexOf("</section>", trust));
    expect(section).toContain(OPERATOR.director);
    expect(section).toContain(`mailto:${OPERATOR.productEmail}`);
    for (const k of LEGAL_KINDS) expect(section, k).toContain(`href="${legalPath(k, l)}"`);
    expect(section).toContain(LANDING[l].trust.dpaLink);
  });

  it.each(LOCALES)("%s: the scope says plainly what is not included, right after the plans", (l) => {
    const page = html(l);
    const scope = page.slice(page.indexOf("data-scope"), page.indexOf("data-before"));
    for (const x of LANDING[l].scope.excluded) expect(scope).toContain(x.replace(/'/g, "&#x27;"));
  });

  it.each(LOCALES)("%s: the app screens are real, sized and lazy", (l) => {
    const imgs = html(l).match(/<img[^>]*\/dentvideo\/landing\/[^>]*>/g) ?? [];
    expect(imgs.length).toBe(4);
    for (const i of imgs) {
      expect(i).toContain(`/dentvideo/landing/${l}/`);
      expect(i).toMatch(/width="540"/);
      expect(i).toMatch(/height="960"/);
      expect(i).toContain('loading="lazy"');
    }
  });

  it("no exit-intent, countdown, fake scarcity, flags or drawn mock-ups", () => {
    for (const l of LOCALES) {
      const page = html(l);
      expect(page).not.toMatch(/exit-intent|countdown|beforeunload|only \d+ left/i);
      expect(page).not.toContain("data-flag=");
      expect(page).not.toContain("data-feed-story");
      expect(page).not.toMatch(/dv-float|dv-reveal|dv-grid/);
    }
  });
});
