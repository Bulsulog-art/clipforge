import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// next/font only works inside Next's compiler; the footer and sign-up form read the path and router.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
const nav = vi.hoisted(() => ({ path: "/dentvideo" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("notFound");
  },
}));

import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "./dentvideo";
import { OPERATOR } from "./guides/entity";
import { LEGAL, LEGAL_KINDS, LEGAL_NAV, LEGAL_PAGES, LEGAL_UPDATED, SUBPROCESSOR_IDS, legalPath, legalPlain, parseLegal, type LegalBlock, type LegalKind } from "./legal";
import { LegalPage } from "@/components/dentvid/legal-page";
import { DvFooter, pathLocale } from "@/components/dentvid/chrome";
import { chromeText } from "@/lib/dentvid/chrome-text";
import { StartForm } from "@/components/dentvid/start-form";
import { PlanPanel } from "@/components/dentvid/plan-panel";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import { legalPagesOn } from "@/lib/dentvid/legal";
import { legalJsonLd, legalMetadata, organizationNode } from "@/lib/dentvid/seo-guides";
import { sitemapUrls, sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";
import { dentvideoHref } from "@/lib/dentvid/host";

(globalThis as { React?: typeof React }).React = React;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);
/** Visible text: tags dropped, entities decoded. */
const text = (h: string) =>
  h
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");

const page = (kind: LegalKind, locale: Locale) => html(createElement(LegalPage, { kind, locale }));

const APP = path.resolve(__dirname, "../app/dentvideo");

/** Personal data that must never be published: passport-like numbers, 13-digit JMB, birth dates. */
const FORBIDDEN: RegExp[] = [
  /\bU\d{8}\b/,
  /(?<!\d)\d{13}(?!\d)/,
  /\bJMB(G)?\b/,
  // Birth-date-like dates (anything before 2020; the site's own dates are review and update dates).
  /\b\d{1,2}[./]\d{1,2}[./](19\d{2}|20[01]\d)\b/,
  /\b(19\d{2}|20[01]\d)-\d{2}-\d{2}\b/,
  /\b(born|geboren|rođen|doğum|né le|urodzon)/i,
  /passport|pasoš|Reisepass|pasaport/i,
];
const forbiddenIn = (s: string) => {
  // Source links in the guides carry numbers of their own (e.g. a law's URL); dates of this site are allowed.
  const clean = s.split(LEGAL_UPDATED).join("").replace(/https?:\/\/[^\s)"'<>]+/g, " ");
  return FORBIDDEN.map((re) => re.exec(clean)?.[0]).filter((m): m is string => !!m);
};

function blockShape(b: LegalBlock): string {
  if (typeof b === "string") return "p";
  if ("list" in b) return `list${b.list.length}`;
  return "operator" in b ? "operator" : "subprocessors";
}

describe("legal pages", () => {
  it("every language has every document with the English structure", () => {
    for (const l of LOCALES) {
      for (const k of LEGAL_KINDS) {
        const en = LEGAL.en.docs[k];
        const doc = LEGAL[l].docs[k];
        expect(doc.title.trim(), `${l} ${k}`).not.toBe("");
        expect(doc.sections.length, `${l} ${k} sections`).toBe(en.sections.length);
        expect(doc.intro.length, `${l} ${k} intro`).toBe(en.intro.length);
        doc.sections.forEach((s, i) => expect(s.blocks.map(blockShape), `${l} ${k} §${i + 1}`).toEqual(en.sections[i].blocks.map(blockShape)));
        if (l !== "en") expect(doc.title, `${l} ${k} translated`).not.toBe(en.title);
      }
      for (const id of SUBPROCESSOR_IDS) expect(LEGAL[l].subprocessors[id].purpose.trim(), `${l} ${id}`).not.toBe("");
    }
  });

  it("uses only known tokens and links, and the same set as English", () => {
    const used = (l: Locale, k: LegalKind) => {
      const doc = LEGAL[l].docs[k];
      const strings = [...doc.intro, ...doc.sections.flatMap((s) => s.blocks.flatMap((b) => (typeof b === "string" ? [b] : "list" in b ? b.list : [])))];
      // parseLegal throws on an unknown {token}.
      const parts = strings.flatMap((s) => parseLegal(s, l));
      return {
        tokens: [...new Set(parts.filter((p) => p.kind === "token").map((p) => (p as { name: string }).name))].sort(),
        links: [...new Set(parts.filter((p) => p.kind === "link").map((p) => (p as { to: string }).to))].sort(),
      };
    };
    for (const l of LOCALES) for (const k of LEGAL_KINDS) expect(used(l, k), `${l} ${k}`).toEqual(used("en", k));
  });

  it("renders in every language, right to left in Arabic, with the translation notice", () => {
    for (const [l, k] of LEGAL_PAGES) {
      const h = page(k, l);
      expect(h, `${l} ${k}`).toContain(`lang="${l}"`);
      expect(text(h), `${l} ${k}`).toContain(LEGAL[l].docs[k].title);
      expect(h).not.toMatch(/\{[A-Za-z]+\}/);
      if (l === "ar") expect(h).toContain('dir="rtl"');
      if (l === "en") expect(h).not.toContain('data-testid="prevails"');
      else {
        expect(h, `${l} ${k}`).toContain('data-testid="prevails"');
        expect(h).toContain(`href="${legalPath(k, "en")}"`);
      }
    }
  });

  it("shows the operator's register data exactly", () => {
    for (const [l, k] of LEGAL_PAGES) {
      if (!LEGAL[l].docs[k].sections.some((s) => s.blocks.some((b) => typeof b === "object" && "operator" in b))) continue;
      const t = text(page(k, l));
      expect(t, `${l} ${k}`).toContain('"BLS AI AUTOMATION" DOO PODGORICA');
      expect(t).toContain("Neznanih Junaka 60, 81000 Podgorica");
      expect(t).toContain("5-1333594");
      expect(t).toContain("03784410");
      expect(t).toContain("Berke Bulsu");
      expect(t).toContain("hello@dentvideo.com");
      expect(t).toContain("info@bulsulabs.com");
      expect(t).toContain("društvo sa ograničenom odgovornošću");
    }
    expect(OPERATOR).toMatchObject({ registrationNumber: "5-1333594", taxId: "03784410", street: "Neznanih Junaka 60", postalCode: "81000", city: "Podgorica" });
  });

  it("has an Imprint, Terms, Privacy, Refunds and DPA in every language; the German imprint is German", () => {
    const de = text(page("imprint", "de"));
    expect(de).toContain("Impressum");
    expect(de).toContain("Angaben gemäß § 5 Digitale-Dienste-Gesetz");
    expect(de).toContain("Geschäftsführer");
    expect(de).toContain("Registernummer");
    expect(de).toContain("Steuernummer (PIB)");
    for (const l of LOCALES) expect(text(page("terms", l)), l).toMatch(/Podgorica|Подгорица|ポドゴリツァ|بودغوريتسا/);
  });

  it("prints no VAT number, no phone number and no other personal data", () => {
    const all = [
      ...LEGAL_PAGES.map(([l, k]) => page(k, l)),
      JSON.stringify(LEGAL),
      llmsTxt(),
      llmsFullTxt(),
      JSON.stringify(organizationNode()),
    ];
    for (const s of all) {
      expect(forbiddenIn(s)).toEqual([]);
      expect(text(s)).not.toMatch(/\b(VAT|USt-IdNr|PDV)\s*(no|number|ID|-ID)?[:.]?\s*[A-Z]{0,2}\d/i);
      expect(text(s)).not.toMatch(/\+\s?382|\btel(efon|ephone)?[.:]/i);
    }
  });

  it("states prices from billing and the founding offer plainly", () => {
    const t = text(page("refunds", "en")) + text(page("terms", "en"));
    expect(t).toContain("Starter: $49 per month");
    expect(t).toContain("Practice: $99 per month, or $990 per year");
    expect(t).toContain("$49 per month for 12 months");
    expect(t).toContain("first 100 clinics");
    expect(t).toContain("regular Practice price of $99 per month");
    expect(t).toMatch(/Group cannot be bought on the website/);
    expect(t).toMatch(/merchant of record/);
  });

  it("makes no certification claims", () => {
    for (const [l, k] of LEGAL_PAGES) {
      const t = text(page(k, l));
      expect(t, `${l} ${k}`).not.toMatch(/ISO\s?27001|SOC\s?2|GDPR[- ]certified|HIPAA[- ]compliant|DSGVO-zertifiziert/i);
    }
    expect(text(page("terms", "en"))).toContain("not designed to act as a HIPAA business associate");
  });

  it("lists the sub-processors, and says what is not one", () => {
    const t = text(page("dpa", "en"));
    for (const n of ["Hostinger", "OpenAI", "Resend", "Dodo Payments"]) expect(t).toContain(n);
    expect(t).not.toContain("Sentry"); // not enabled in production
    expect(t).toContain("Supabase Inc. receives no data");
    expect(t).toContain("standard contractual clauses");
    expect(t).not.toMatch(/fal\.ai|Cloudflare|Google Analytics/);
  });
});

describe("legal pages: routes, links, sitemap, metadata", () => {
  it("every legal path has a route", () => {
    for (const k of LEGAL_KINDS) expect(fs.existsSync(path.join(APP, k, "page.tsx")), k).toBe(true);
    expect(fs.existsSync(path.join(APP, "[locale]", "[doc]", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(APP, "ar", "[doc]", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(APP, "ja", "[doc]", "page.tsx"))).toBe(true);
    for (const [l, k] of LEGAL_PAGES) {
      const p = legalPath(k, l);
      expect(p).toBe(l === "en" ? `/dentvideo/${k}` : `/dentvideo/${l}/${k}`);
      // On dentvideo.com the clean path: /terms, /de/imprint.
      expect(dentvideoHref(p, "https://dentvideo.com")).toBe(l === "en" ? `/${k}` : `/${l}/${k}`);
      // The header and footer follow the page's language.
      expect(pathLocale(p, {}), p).toBe(l);
      expect(pathLocale(dentvideoHref(p, "https://dentvideo.com"), {}), p).toBe(l);
    }
  });

  it("the footer links all five legal pages in the page's language, on site and app pages", async () => {
    for (const l of LOCALES) {
      nav.path = l === "en" ? "/dentvideo" : `/dentvideo/${l}`;
      const h = html(createElement(DvFooter, { guideLocales: {}, text: chromeText() }));
      for (const k of LEGAL_KINDS) {
        expect(h, `${l} ${k}`).toContain(`href="${legalPath(k, l)}"`);
        expect(text(h)).toContain(LEGAL_NAV[l].nav[k]);
      }
      expect(text(h)).toContain(OPERATOR.shortName);
    }
    nav.path = "/dentvideo/app";
    const app = html(createElement(DvFooter, { guideLocales: {}, text: chromeText() }));
    for (const k of LEGAL_KINDS) expect(app).toContain(`href="${legalPath(k, "en")}"`);
  });

  it("the sitemap lists every legal page with its translations", () => {
    const urls = sitemapUrls();
    for (const [l, k] of LEGAL_PAGES) expect(urls, `${l} ${k}`).toContain(`https://dentvideo.com${l === "en" ? "" : `/${l}`}/${k}`);
    const xml = sitemapXml();
    expect(xml).toContain('hreflang="de" href="https://dentvideo.com/de/imprint"');
    expect(xml).toContain('hreflang="x-default" href="https://dentvideo.com/terms"');
  });

  it("llms.txt links the legal pages and names the operator", () => {
    const t = llmsTxt();
    expect(t).toContain("## Legal");
    for (const k of LEGAL_KINDS) expect(t).toContain(`(https://dentvideo.com/${k})`);
    expect(t).toContain("(https://dentvideo.com/de/imprint)");
    expect(t).toContain("5-1333594");
    expect(t).toContain("03784410");
  });

  it("metadata: canonical, hreflang for all eight languages, indexable", () => {
    for (const [l, k] of LEGAL_PAGES) {
      const m = legalMetadata(k, l);
      expect(m.robots, `${l} ${k}`).toBeUndefined();
      const langs = (m.alternates?.languages ?? {}) as Record<string, string>;
      expect(Object.keys(langs).length).toBe(LOCALES.length + 1);
      expect(String(m.alternates?.canonical)).toMatch(new RegExp(`/${k}$`));
      expect(m.description).toBe(LEGAL[l].docs[k].description);
    }
  });

  it("JSON-LD is valid and carries the organisation's legal fields", () => {
    for (const [l, k] of LEGAL_PAGES) {
      const h = page(k, l);
      const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(h);
      expect(m, `${l} ${k}`).not.toBeNull();
      const ld = JSON.parse(m![1]) as { "@context": string; "@graph": Record<string, unknown>[] };
      expect(ld["@context"]).toBe("https://schema.org");
      const org = ld["@graph"].find((n) => n["@type"] === "Organization")!;
      expect(org).toMatchObject({
        name: "Bulsu Labs",
        legalName: '"BLS AI AUTOMATION" DOO PODGORICA',
        taxID: "03784410",
        address: { "@type": "PostalAddress", streetAddress: "Neznanih Junaka 60", postalCode: "81000", addressLocality: "Podgorica", addressCountry: "ME" },
      });
      expect(JSON.stringify(org)).toContain("5-1333594");
      expect(ld["@graph"].some((n) => n["@type"] === "BreadcrumbList")).toBe(true);
    }
    expect(legalJsonLd("imprint", "de")["@graph"][0]).toMatchObject({ "@type": "AboutPage", inLanguage: "de" });
  });
});

describe("consent", () => {
  it("the sign-up consent line is on by default and links the page language's Terms and Privacy", () => {
    expect(legalPagesOn({})).toBe(true);
    for (const l of LOCALES) {
      const h = html(createElement(StartForm, { locale: l, remember: false }));
      expect(h, l).toContain('data-testid="dv-consent"');
      expect(h).toContain(`href="${legalPath("terms", l)}"`);
      expect(h).toContain(`href="${legalPath("privacy", l)}"`);
    }
    expect(html(createElement(StartForm, { locale: "en", remember: false, legal: false }))).not.toContain('data-testid="dv-consent"');
  });

  it("the plan step (checkout) names the Terms, the Refund Policy and the merchant of record", () => {
    for (const l of LOCALES) {
      const h = html(createElement(PlanPanel, { locale: l, state: "trial", options: dvAvailablePlans({}), founding: { priceUsd: 49 } }));
      expect(h, l).toContain('data-testid="dv-checkout-consent"');
      expect(h).toContain(`href="${legalPath("terms", l)}"`);
      expect(h).toContain(`href="${legalPath("refunds", l)}"`);
      expect(text(h)).toContain("Dodo Payments");
      expect(LEGAL_NAV[l].checkoutConsent).toContain("{terms}");
      expect(LEGAL_NAV[l].checkoutConsent).toContain("{refunds}");
    }
  });

  it("plain text resolves tokens and links", () => {
    expect(legalPlain("See the [Refund Policy](refunds), {email}.", "en")).toBe("See the Refund Policy, hello@dentvideo.com.");
    expect(() => parseLegal("{nope}", "en")).toThrow();
  });
});
