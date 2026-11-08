import type { Metadata } from "next";
import { dvUrl as absoluteUrl } from "@/lib/dentvid/host";
import { GUIDES, HREFLANG, LANDING_PATH, LOCALES, guidePath, guidesFor, type Guide, type Locale } from "@/content/dentvideo";
import { ENTITY, PUBLISHER_NAME, PUBLISHER_URL, VIDEO_LANGUAGES } from "@/content/guides/entity";
import { plainText, translationsOf } from "@/content/guides/text";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";

/**
 * Metadata, structured data and sitemap entries for the guide library, the
 * guides indexes and the About pages. Everything reads content/ so the pages,
 * the JSON-LD, llms.txt and the sitemap state the same facts.
 */

export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  de: "de_DE",
  es: "es_ES",
  tr: "tr_TR",
  fr: "fr_FR",
  ja: "ja_JP",
  // The Arabic pages are written for the Gulf: the UAE first, Saudi Arabia as an alternate.
  ar: "ar_AE",
  pl: "pl_PL",
};

/** Further og:locale values a landing also serves (the Arabic one is for the whole Gulf). */
export const OG_ALTERNATE_LOCALES: Partial<Record<Locale, string[]>> = { ar: ["ar_SA"] };

/** The date the site's non-guide pages last changed in substance. */
export const SITE_UPDATED = "2026-11-08";

// Stable node ids, so every page's graph describes the same organisation and product.
const ORG_ID = `${PUBLISHER_URL}/#organization`;
const softwareId = () => `${absoluteUrl(LANDING_PATH.en)}#software`;

export function organizationNode() {
  return { "@type": "Organization", "@id": ORG_ID, name: PUBLISHER_NAME, url: PUBLISHER_URL };
}

const PRICE_LABELS = ["Price", "Preis", "Precio", "Ücret", "Prix", "料金", "السعر", "Cena"];

export function softwareNode(locale: Locale) {
  const e = ENTITY[locale];
  return {
    "@type": "SoftwareApplication",
    "@id": softwareId(),
    name: "DentVideo",
    url: absoluteUrl(LANDING_PATH.en),
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Patient-education video for dental clinics",
    operatingSystem: "Web",
    description: e.definition,
    inLanguage: [...VIDEO_LANGUAGES],
    audience: { "@type": "BusinessAudience", audienceType: "Dental clinics and dentists" },
    publisher: { "@id": ORG_ID },
    offers: { "@type": "Offer", name: "Monthly plan", description: e.facts.find((f) => PRICE_LABELS.includes(f.label))?.value },
  };
}

function faqNode(faq: { q: string; a: string }[], locale: Locale) {
  return {
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plainText(f.a) } })),
  };
}

function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

/* ---------- Guides ---------- */

/** hreflang for a guide: only its true translations (same topic key), never a country-specific guide. */
export function guideAltPaths(g: Guide): Record<string, string> | undefined {
  const group = translationsOf(g);
  if (group.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const o of group) languages[HREFLANG[o.locale]] = guidePath(o);
  const en = group.find((o) => o.locale === "en");
  if (en) languages["x-default"] = guidePath(en);
  return languages;
}

/** A language → path map as absolute URLs. */
function absolute(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([k, p]) => [k, absoluteUrl(p)]));
}

/** One page per language (landing, guides index, About): every locale plus x-default (English). */
function perLocaleAltPaths(paths: Record<Locale, string>): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = paths[l];
  languages["x-default"] = paths.en;
  return languages;
}

export function guideAlternates(g: Guide): Record<string, string> | undefined {
  const paths = guideAltPaths(g);
  return paths && absolute(paths);
}

/** The landing's share card for a language (hubs and About pages reuse it). */
function landingOgImage(locale: Locale): string {
  return absoluteUrl(`${LANDING_PATH[locale]}/opengraph-image`);
}

export function guideOgImagePath(g: Guide): string {
  return `${guidePath(g)}/opengraph-image`;
}

export function guideMetadata(g: Guide): Metadata {
  const url = absoluteUrl(guidePath(g));
  const languages = guideAlternates(g);
  return {
    title: { absolute: `${g.title} · DentVideo` },
    description: g.description,
    alternates: { canonical: url, ...(languages ? { languages } : {}) },
    openGraph: {
      title: g.title,
      description: g.description,
      url,
      type: "article",
      siteName: "DentVideo",
      locale: OG_LOCALE[g.locale],
      ...(g.published ? { publishedTime: g.published } : {}),
      ...(g.updated ? { modifiedTime: g.updated } : {}),
    },
    // The layout's generic X card text would otherwise apply; the image comes from opengraph-image.tsx.
    twitter: { card: "summary_large_image", title: g.title, description: g.description },
  };
}

export function guideJsonLd(g: Guide) {
  const url = absoluteUrl(guidePath(g));
  const ui = GUIDE_UI[g.locale];
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: g.h1,
      description: g.description,
      abstract: plainText(g.intro),
      inLanguage: g.locale,
      url,
      mainEntityOfPage: url,
      image: absoluteUrl(guideOgImagePath(g)),
      ...(g.published ? { datePublished: g.published } : {}),
      ...(g.updated || g.published ? { dateModified: g.updated ?? g.published } : {}),
      author: { "@type": "Organization", name: "DentVideo", url: absoluteUrl(LANDING_PATH[g.locale]) },
      publisher: organizationNode(),
      about: { "@id": softwareId() },
      isPartOf: { "@type": "CollectionPage", "@id": absoluteUrl(GUIDES_INDEX_PATH[g.locale]), name: ui.index.h1 },
      ...(g.sources?.length ? { citation: g.sources.map((s) => ({ "@type": "CreativeWork", name: s.label, url: s.url })) } : {}),
    },
    faqNode(g.faq, g.locale),
    breadcrumb([
      { name: "DentVideo", path: LANDING_PATH[g.locale] },
      { name: ui.breadcrumbGuides, path: GUIDES_INDEX_PATH[g.locale] },
      { name: g.h1, path: guidePath(g) },
    ]),
  ];
  if (g.howTo) {
    graph.push({
      "@type": "HowTo",
      name: g.howTo.name,
      inLanguage: g.locale,
      step: g.howTo.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: plainText(s.text) })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/* ---------- Guides index ---------- */

export function guidesIndexAlternates(): Record<string, string> {
  return absolute(perLocaleAltPaths(GUIDES_INDEX_PATH));
}

export function guidesIndexMetadata(locale: Locale): Metadata {
  const ui = GUIDE_UI[locale];
  const url = absoluteUrl(GUIDES_INDEX_PATH[locale]);
  return {
    title: { absolute: ui.index.title },
    description: ui.index.description,
    alternates: { canonical: url, languages: guidesIndexAlternates() },
    openGraph: { title: ui.index.h1, description: ui.index.description, url, type: "website", siteName: "DentVideo", locale: OG_LOCALE[locale], images: [landingOgImage(locale)] },
    twitter: { card: "summary_large_image", title: ui.index.h1, description: ui.index.description, images: [landingOgImage(locale)] },
  };
}

export function guidesIndexJsonLd(locale: Locale) {
  const ui = GUIDE_UI[locale];
  const url = absoluteUrl(GUIDES_INDEX_PATH[locale]);
  const guides = guidesFor(locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        name: ui.index.h1,
        description: ui.index.description,
        inLanguage: locale,
        url,
        publisher: organizationNode(),
        about: { "@id": softwareId() },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: guides.length,
          itemListElement: guides.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(guidePath(g)), name: g.h1 })),
        },
      },
      breadcrumb([
        { name: "DentVideo", path: LANDING_PATH[locale] },
        { name: ui.breadcrumbGuides, path: GUIDES_INDEX_PATH[locale] },
      ]),
    ],
  };
}

/* ---------- About ---------- */

export function aboutAlternates(): Record<string, string> {
  return absolute(perLocaleAltPaths(ABOUT_PATH));
}

export function aboutMetadata(locale: Locale): Metadata {
  const e = ENTITY[locale];
  const url = absoluteUrl(ABOUT_PATH[locale]);
  return {
    title: { absolute: e.meta.title },
    description: e.meta.description,
    alternates: { canonical: url, languages: aboutAlternates() },
    openGraph: { title: e.meta.title, description: e.meta.description, url, type: "website", siteName: "DentVideo", locale: OG_LOCALE[locale], images: [landingOgImage(locale)] },
    twitter: { card: "summary_large_image", title: e.meta.title, description: e.meta.description, images: [landingOgImage(locale)] },
  };
}

export function aboutJsonLd(locale: Locale) {
  const e = ENTITY[locale];
  const url = absoluteUrl(ABOUT_PATH[locale]);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": url,
        name: e.h1,
        description: e.meta.description,
        inLanguage: locale,
        url,
        mainEntity: { "@id": softwareId() },
        publisher: { "@id": ORG_ID },
      },
      { ...organizationNode(), brand: { "@type": "Brand", name: "DentVideo" } },
      softwareNode(locale),
      faqNode(e.faq, locale),
      breadcrumb([
        { name: "DentVideo", path: LANDING_PATH[locale] },
        { name: GUIDE_UI[locale].about, path: ABOUT_PATH[locale] },
      ]),
    ],
  };
}

/* ---------- Sitemap ---------- */

/** A sitemap entry; `alternates` maps hreflang codes to in-app paths of true translations. */
export type SitemapEntry = { path: string; lastmod: string; priority: string; alternates?: Record<string, string> };

/** Every public DentVideo page, with its last change and its true translations. */
export function dentvideoSitemapEntries(): SitemapEntry[] {
  const dateOf = (g: Guide) => g.updated ?? g.published ?? SITE_UPDATED;
  const latestGuide = (l: Locale) => guidesFor(l).map(dateOf).reduce((a, b) => (b > a ? b : a), SITE_UPDATED);
  return [
    ...LOCALES.map((l) => ({ path: LANDING_PATH[l], lastmod: SITE_UPDATED, priority: l === "en" ? "1.0" : "0.9", alternates: perLocaleAltPaths(LANDING_PATH) })),
    ...LOCALES.map((l) => ({ path: GUIDES_INDEX_PATH[l], lastmod: latestGuide(l), priority: "0.8", alternates: perLocaleAltPaths(GUIDES_INDEX_PATH) })),
    ...LOCALES.map((l) => ({ path: ABOUT_PATH[l], lastmod: SITE_UPDATED, priority: "0.6", alternates: perLocaleAltPaths(ABOUT_PATH) })),
    ...GUIDES.map((g) => ({ path: guidePath(g), lastmod: dateOf(g), priority: "0.7", alternates: guideAltPaths(g) })),
  ];
}
