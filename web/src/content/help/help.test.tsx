import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { HELP, HELP_ARTICLE_META, HELP_CATEGORIES, HELP_IDS, HELP_PATH, helpArticlesIn, type HelpId } from "@/content/help";
import { helpHref } from "@/content/dentvideo-help-links";
import { dentvideoSitemapEntries, helpJsonLd, helpMetadata } from "@/lib/dentvid/seo-guides";
import { sitemapXml } from "@/lib/dentvid/sitemap";
import { dvUrl } from "@/lib/dentvid/host";
import { equivalentPath } from "@/lib/dentvid/lang-switch";
import { readyEmail } from "@/lib/dentvid/email";
import { notPostedEmail, paymentProblemEmail, welcomeEmail } from "@/lib/dentvid/lifecycle-email";
import { HelpCenter } from "@/components/dentvid/help-center";
import { foldText, matchesQuery } from "@/components/dentvid/help-search";

(globalThis as { React?: typeof React }).React = React;

const SRC = join(__dirname, "../..");
const decode = (h: string) =>
  h
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const graphOf = (ld: unknown) => (ld as { "@graph": Record<string, unknown>[] })["@graph"];

describe("help content: every answer in every language", () => {
  it("has the same answers, under the same anchors, in all eight site languages", () => {
    expect(Object.keys(HELP).sort()).toEqual([...LOCALES].sort());
    expect(Object.keys(HELP_ARTICLE_META).sort()).toEqual([...HELP_IDS].sort());
    for (const l of LOCALES) {
      expect(Object.keys(HELP[l].articles).sort(), l).toEqual([...HELP_IDS].sort());
      expect(Object.keys(HELP[l].categories).sort(), l).toEqual([...HELP_CATEGORIES].sort());
    }
  });

  it("gives every answer a question and an answer, with as many steps as in English", () => {
    for (const l of LOCALES) {
      for (const id of HELP_IDS) {
        const a = HELP[l].articles[id];
        expect(a.q.trim(), `${l} ${id}`).not.toBe("");
        expect(a.a.trim(), `${l} ${id}`).not.toBe("");
        expect(a.steps?.length ?? 0, `${l} ${id} steps`).toBe(HELP.en.articles[id].steps?.length ?? 0);
        // The only placeholder is {email}; nothing left over from a template.
        for (const s of [a.q, a.a, ...(a.steps ?? [])]) expect(s.replace(/\{email\}/g, ""), `${l} ${id}`).not.toMatch(/[{}]|TODO|undefined/);
      }
    }
  });

  it("asks a different question in every answer of a language (search and FAQ need them distinct)", () => {
    for (const l of LOCALES) {
      const qs = HELP_IDS.map((id) => HELP[l].articles[id].q.trim().toLowerCase());
      expect(new Set(qs).size, l).toBe(qs.length);
    }
  });

  it("puts every category to use", () => {
    for (const c of HELP_CATEGORIES) expect(helpArticlesIn(c).length, c).toBeGreaterThan(0);
  });

  it("uses no banned words: no guarantees, discounts, 'best' or '#1' in any language", () => {
    const BANNED: Record<Locale, RegExp> = {
      en: /guarant|discount|\bbest\b|#1|number one/i,
      de: /garantie|garantiert|rabatt|\bbeste[nrms]?\b|nummer eins|#1/i,
      es: /garant[ií]a|garantiza|descuento|\bmejor(es)?\b|n[uú]mero uno|#1/i,
      tr: /garanti|indirim|en iyi|bir numara|#1/i,
      fr: /garanti|remise|r[ée]duction|meilleur|num[ée]ro un|#1/i,
      ja: /保証|割引|最高|一番|ナンバーワン|No\.?1|ベスト|#1/i,
      ar: /ضمان|مضمون|خصم|أفضل|رقم واحد|#1/,
      pl: /gwaranc|gwarant|rabat|zni[żz]k|najlepsz|numer jeden|#1/i,
    };
    for (const l of LOCALES) {
      const h = HELP[l];
      const all = [h.meta.title, h.meta.description, h.h1, h.lead, h.stuck.title, h.stuck.body, ...Object.values(h.categories), ...Object.values(h.shots)];
      for (const id of HELP_IDS) all.push(h.articles[id].q, h.articles[id].a, ...(h.articles[id].steps ?? []));
      for (const s of all) expect(s, `${l}: ${s.slice(0, 60)}`).not.toMatch(BANNED[l]);
    }
  });

  it("never says a video is legally approved and never quotes a price", () => {
    for (const l of LOCALES) {
      for (const id of HELP_IDS) {
        const a = HELP[l].articles[id];
        const text = [a.q, a.a, ...(a.steps ?? [])].join(" ");
        expect(text, `${l} ${id}`).not.toMatch(/[$€£]\s?\d|\d\s?(€|TL|USD|EUR)\b/);
        if (l === "en") expect(text, id).not.toMatch(/legally approved|compliant|100%/i);
      }
    }
  });

  it("keeps titles and descriptions short enough to show in search results", () => {
    for (const l of LOCALES) {
      expect(HELP[l].meta.title.length, l).toBeLessThanOrEqual(60);
      expect(HELP[l].meta.description.length, l).toBeLessThanOrEqual(160);
    }
  });
});

describe("help pages: SEO", () => {
  it("each language has a self-canonical page with reciprocal hreflang and x-default", () => {
    for (const l of LOCALES) {
      const m = helpMetadata(l);
      expect(m.alternates?.canonical, l).toBe(dvUrl(HELP_PATH[l]));
      const langs = m.alternates?.languages as Record<string, string>;
      expect(Object.keys(langs).sort(), l).toEqual([...LOCALES, "x-default"].sort());
      for (const o of LOCALES) expect(langs[o], `${l} → ${o}`).toBe(dvUrl(HELP_PATH[o]));
      expect(langs["x-default"]).toBe(dvUrl(HELP_PATH.en));
      // Reciprocity: every alternate names this page back.
      for (const o of LOCALES) expect((helpMetadata(o).alternates?.languages as Record<string, string>)[l]).toBe(dvUrl(HELP_PATH[l]));
    }
  });

  it("is in the sitemap in every language, with its alternates", () => {
    const entries = dentvideoSitemapEntries();
    for (const l of LOCALES) {
      const e = entries.find((x) => x.path === HELP_PATH[l]);
      expect(e, l).toBeTruthy();
      expect(Object.keys(e!.alternates ?? {}).length, l).toBe(LOCALES.length + 1);
    }
    const xml = sitemapXml();
    for (const l of LOCALES) expect(xml).toContain(`<loc>https://dentvideo.com${HELP_PATH[l].replace(/^\/dentvideo/, "")}</loc>`);
  });

  it("the language switcher keeps a reader on the help center", () => {
    for (const l of LOCALES) for (const t of LOCALES) expect(equivalentPath(HELP_PATH[l], t)).toBe(HELP_PATH[t]);
  });

  it("emits an FAQPage built only from the questions and answers the page shows", () => {
    for (const l of LOCALES) {
      const html = decode(renderToStaticMarkup(<HelpCenter locale={l} />));
      const faq = graphOf(helpJsonLd(l)).find((n) => n["@type"] === "FAQPage")!;
      const qs = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(qs.length, l).toBe(HELP_IDS.length);
      for (const [i, q] of qs.entries()) {
        const id = HELP_IDS[i];
        expect(html, `${l} ${id} anchor`).toContain(`id="${id}"`);
        expect(html, `${l} ${id} question`).toContain(q.name);
        // Every line of the structured answer is on the page (steps without their numbers).
        for (const line of q.acceptedAnswer.text.split("\n")) {
          const shown = line.replace(/^\d+\. /, "");
          for (const part of shown.split(/hello@dentvideo\.com/)) if (part.trim()) expect(html, `${l} ${id}: ${part.slice(0, 50)}`).toContain(part.trim().slice(0, 40));
        }
      }
      // The page says where to write when the answers run out.
      expect(html).toContain("mailto:hello@dentvideo.com");
      expect(html).toContain(HELP[l].stuck.title);
      // Right to left where the language is.
      expect(html).toContain(`dir="${l === "ar" ? "rtl" : "ltr"}"`);
    }
  });

  it("shows only screenshots that exist in that language", () => {
    for (const l of LOCALES) {
      const html = renderToStaticMarkup(<HelpCenter locale={l} />);
      for (const m of html.matchAll(/src="(\/dentvideo\/landing\/[^"]+)"/g)) {
        expect(() => readFileSync(join(SRC, "../public", m[1])), m[1]).not.toThrow();
      }
    }
  });
});

describe("help search", () => {
  it("ignores case and accents, and needs every word", () => {
    expect(foldText("İptal Facturación")).toBe("iptal facturacion");
    expect(matchesQuery("Wie kündigen wir?", "KUNDIGEN")).toBe(true);
    expect(matchesQuery("¿Dónde encuentro las facturas?", "factura donde")).toBe(true);
    expect(matchesQuery("How do we cancel?", "cancel invoice")).toBe(false);
    expect(matchesQuery("anything", "  ")).toBe(true);
    expect(matchesQuery("解約するには？", "解約")).toBe(true);
  });
});

/** Every help anchor a source file links to: HelpLink ids (also inside ternaries), helpCenterLink ids, heroHelp's answers. */
function anchorsIn(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of src.matchAll(/<HelpLink\b[^>]*?\bid=(?:"([^"]+)"|\{([^}]*)\})/gs)) {
    if (m[1]) out.push(m[1]);
    else for (const s of m[2].matchAll(/"([a-z][a-z-]*)"/g)) if (!["instagram", "tiktok", "facebook", "whatsapp"].includes(s[1]) || HELP_IDS.includes(s[1] as HelpId)) out.push(s[1]);
  }
  for (const m of src.matchAll(/helpCenterLink\([^)]*?"([a-z-]+)"[^)]*\)/g)) out.push(m[1]);
  for (const m of src.matchAll(/helpCenterLink\([^)]*?\?\s*"([a-z-]+)"\s*:\s*"([a-z-]+)"/g)) out.push(m[1], m[2]);
  const hero = src.match(/function heroHelp[\s\S]*?\n\}/);
  if (hero) for (const m of hero[0].matchAll(/return "([a-z-]+)"/g)) out.push(m[1]);
  return out;
}

describe("links into the help center from the app and the emails", () => {
  const files = [
    ...readdirSync(join(SRC, "components/dentvid")).map((f) => join(SRC, "components/dentvid", f)),
    ...readdirSync(join(SRC, "lib/dentvid")).map((f) => join(SRC, "lib/dentvid", f)),
  ].filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
  const linked = files.flatMap((f) => anchorsIn(f).map((id) => ({ f, id })));

  it("finds the links (the app links settings, recording, empty weeks, billing states, the post sheet; the emails link too)", () => {
    const ids = new Set(linked.map((x) => x.id));
    for (const id of ["services", "closing-line", "narrator-voice", "record", "plans", "no-videos-this-week", "needs-a-look", "topics", "payment-failed", "after-cancel", "instagram", "tiktok-shorts", "facebook", "share", "invoices", "cancel", "first-videos", "approve"] as HelpId[]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("only to answers that exist", () => {
    for (const { f, id } of linked) expect(HELP_IDS as readonly string[], `${f}: #${id}`).toContain(id);
  });

  it("emails link the matching answer in the clinic's language (English for Italian and Portuguese)", () => {
    const base = { clinicName: "Klinik", appUrl: "https://dentvideo.com/app" };
    for (const lang of [...LOCALES, "it", "pt"]) {
      const helpLocale = ((LOCALES as readonly string[]).includes(lang) ? lang : "en") as Locale;
      const url = (id?: HelpId) => `https://dentvideo.com${helpHref(helpLocale, id).replace(/^\/dentvideo/, "")}`;
      const cases: [string, string][] = [
        [welcomeEmail({ ...base, language: lang }).html, url()],
        [readyEmail({ ...base, kind: "week", counts: { ready: 3, flagged: 1 }, language: lang })!.html, url("approve")],
        [readyEmail({ ...base, kind: "week", counts: { ready: 0, flagged: 2 }, language: lang })!.html, url("needs-a-look")],
        [paymentProblemEmail({ ...base, language: lang, kind: "failed", fix: "portal" }).html, url("payment-failed")],
        [paymentProblemEmail({ ...base, language: lang, kind: "on_hold", fix: "email" }).html, url("payment-failed")],
        [notPostedEmail({ ...base, language: lang, url: "https://dentvideo.com/app", unsubscribeUrl: "https://dentvideo.com/u", approved: 2, pending: 1 }).html, url("share")],
      ];
      for (const [html, href] of cases) {
        expect(html, `${lang} ${href}`).toContain(`href="${href}"`);
        const anchor = href.split("#")[1];
        if (anchor) expect(decode(html), `${lang} ${anchor}`).toContain(HELP[helpLocale].articles[anchor as HelpId].q);
      }
    }
  });

  it("the text part of an email carries the link too", () => {
    const m = paymentProblemEmail({ language: "de", clinicName: "Praxis", kind: "failed", fix: "portal", appUrl: "https://dentvideo.com/app" });
    expect(m.text).toContain("https://dentvideo.com/de/help#payment-failed");
  });
});
