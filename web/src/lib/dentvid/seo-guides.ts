import type { Metadata } from "next";
import { dvUrl as absoluteUrl } from "@/lib/dentvid/host";
import { GUIDES, GUIDE_HUB_LOCALES, HREFLANG, LANDING_PATH, LOCALES, guidePath, guidesFor, type Guide, type Locale } from "@/content/dentvideo";
import { ALTERNATE_NAMES, ENTITY, OPERATOR, PUBLISHER_NAME, PUBLISHER_URL, SAME_AS, VIDEO_LANGUAGES } from "@/content/guides/entity";
import { SOLUTIONS, solutionPath, solutionTranslations, type SolutionPage } from "@/content/solutions";
import { SOLUTION_UI } from "@/content/solutions/ui";
import { sampleSrc, samplesFor } from "@/content/dentvideo-samples";
import { plainText, reviewedDate, translationsOf } from "@/content/guides/text";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { DV_PRICES_USD, DV_SELF_SERVE_TIERS } from "./billing";
import { LEGAL, LEGAL_KINDS, LEGAL_UPDATED, legalPath, type LegalKind } from "@/content/legal";

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
export const ORG_ID = `${PUBLISHER_URL}/#organization`;
export const softwareId = () => `${absoluteUrl(LANDING_PATH.en)}#software`;
export const websiteId = () => `${absoluteUrl(LANDING_PATH.en)}#website`;

/** The publisher: Bulsu Labs, with the legal fields of the company that trades under it (content/guides/entity OPERATOR). */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: PUBLISHER_NAME,
    legalName: OPERATOR.legalName,
    url: PUBLISHER_URL,
    email: OPERATOR.companyEmail,
    taxID: OPERATOR.taxId,
    identifier: { "@type": "PropertyValue", propertyID: "CRPS registration number (Montenegro)", value: OPERATOR.registrationNumber },
    address: {
      "@type": "PostalAddress",
      streetAddress: OPERATOR.street,
      postalCode: OPERATOR.postalCode,
      addressLocality: OPERATOR.city,
      addressCountry: OPERATOR.countryCode,
    },
    foundingLocation: { "@type": "Place", name: `${OPERATOR.city}, ${OPERATOR.country}` },
  };
}

/** The guides' author and reviewer: a team at Bulsu Labs (no invented individual credentials). */
export function editorialTeam(locale: Locale) {
  return {
    "@type": "Organization",
    name: "DentVideo editorial team",
    url: absoluteUrl(ABOUT_PATH[locale]),
    parentOrganization: { "@id": ORG_ID },
  };
}

/**
 * The site itself, so search engines can show "DentVideo" as the site name
 * and know the brand's other spellings ("Dent Video").
 */
export function websiteNode(locale: Locale) {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    name: "DentVideo",
    alternateName: [...ALTERNATE_NAMES],
    url: absoluteUrl(LANDING_PATH.en),
    inLanguage: [...LOCALES],
    description: ENTITY[locale].definition,
    publisher: { "@id": ORG_ID },
    about: { "@id": softwareId() },
  };
}

const PRICE_LABELS = ["Price", "Preis", "Precio", "Ücret", "Prix", "料金", "السعر", "Cena"];

/** Self-serve monthly list prices only: Group is "Contact us" and is not an offer. */
const monthlyPrices = () => DV_SELF_SERVE_TIERS.map((t) => DV_PRICES_USD[t].month).filter((p): p is number => typeof p === "number");

export function softwareNode(locale: Locale) {
  const e = ENTITY[locale];
  return {
    "@type": "SoftwareApplication",
    "@id": softwareId(),
    name: "DentVideo",
    alternateName: [...ALTERNATE_NAMES],
    url: absoluteUrl(LANDING_PATH.en),
    // Only profiles that exist (content/guides/entity.ts); none is invented.
    ...(SAME_AS.length ? { sameAs: [...SAME_AS] } : {}),
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Patient-education video for dental clinics",
    operatingSystem: "Web",
    description: e.definition,
    inLanguage: [...VIDEO_LANGUAGES],
    audience: { "@type": "BusinessAudience", audienceType: "Dental clinics and dentists" },
    publisher: { "@id": ORG_ID },
    // Google requires a price on a SoftwareApplication offer: the plans' monthly range, from billing.
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...monthlyPrices()),
      highPrice: Math.max(...monthlyPrices()),
      offerCount: monthlyPrices().length,
      description: e.facts.find((f) => PRICE_LABELS.includes(f.label))?.value,
    },
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
function perLocaleAltPaths(paths: Record<Locale, string>, locales: readonly Locale[] = LOCALES): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[HREFLANG[l]] = paths[l];
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

/** Longest title Google shows untruncated, in characters (roughly 600px). */
export const SEO_TITLE_MAX = 60;
/** Longest meta description Google shows untruncated, in characters. */
export const SEO_DESCRIPTION_MAX = 155;
const BRAND_SUFFIX = " · DentVideo";

/**
 * A guide's <title>: its short SEO title (or, without one, its full title)
 * plus " · DentVideo" when that still fits in SEO_TITLE_MAX characters.
 */
export function guideSeoTitle(g: Guide): string {
  if (!g.seoTitle) return `${g.title}${BRAND_SUFFIX}`;
  const branded = `${g.seoTitle}${BRAND_SUFFIX}`;
  return branded.length <= SEO_TITLE_MAX ? branded : g.seoTitle;
}

/** A guide's meta description: the short SEO one, falling back to the full description. */
export function guideSeoDescription(g: Guide): string {
  return g.seoDescription ?? g.description;
}

export function guideMetadata(g: Guide): Metadata {
  const url = absoluteUrl(guidePath(g));
  const languages = guideAlternates(g);
  const title = guideSeoTitle(g);
  const shareTitle = g.seoTitle ?? g.title;
  const description = guideSeoDescription(g);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, ...(languages ? { languages } : {}) },
    openGraph: {
      title: shareTitle,
      description,
      url,
      type: "article",
      siteName: "DentVideo",
      locale: OG_LOCALE[g.locale],
      ...(g.published ? { publishedTime: g.published } : {}),
      ...(g.updated ? { modifiedTime: g.updated } : {}),
    },
    // The layout's generic X card text would otherwise apply; the image comes from opengraph-image.tsx.
    twitter: { card: "summary_large_image", title: shareTitle, description },
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
      author: editorialTeam(g.locale),
      publisher: organizationNode(),
      about: { "@id": softwareId() },
      isPartOf: { "@type": "CollectionPage", "@id": absoluteUrl(GUIDES_INDEX_PATH[g.locale]), name: ui.index.h1 },
      ...(g.sources?.length ? { citation: g.sources.map((s) => ({ "@type": "CreativeWork", name: s.label, url: s.url })) } : {}),
    },
    {
      // The page around the article: when its facts were last checked, and by whom.
      "@type": "WebPage",
      "@id": url,
      url,
      name: g.h1,
      inLanguage: g.locale,
      mainEntity: { "@id": `${url}#article` },
      ...(reviewedDate(g) ? { lastReviewed: reviewedDate(g) } : {}),
      reviewedBy: editorialTeam(g.locale),
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
  // Only languages that have a hub (see hasGuides).
  return absolute(perLocaleAltPaths(GUIDES_INDEX_PATH, GUIDE_HUB_LOCALES));
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

/* ---------- Legal pages (/terms, /privacy, /refunds, /dpa, /imprint) ---------- */

const legalPaths = (kind: LegalKind) => Object.fromEntries(LOCALES.map((l) => [l, legalPath(kind, l)])) as Record<Locale, string>;

export function legalAlternates(kind: LegalKind): Record<string, string> {
  return absolute(perLocaleAltPaths(legalPaths(kind)));
}

export function legalMetadata(kind: LegalKind, locale: Locale): Metadata {
  const doc = LEGAL[locale].docs[kind];
  const url = absoluteUrl(legalPath(kind, locale));
  const title = `${doc.title}${BRAND_SUFFIX}`;
  return {
    title: { absolute: title },
    description: doc.description,
    alternates: { canonical: url, languages: legalAlternates(kind) },
    openGraph: { title, description: doc.description, url, type: "website", siteName: "DentVideo", locale: OG_LOCALE[locale], images: [landingOgImage(locale)] },
    twitter: { card: "summary_large_image", title, description: doc.description, images: [landingOgImage(locale)] },
  };
}

export function legalJsonLd(kind: LegalKind, locale: Locale) {
  const doc = LEGAL[locale].docs[kind];
  const url = absoluteUrl(legalPath(kind, locale));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": kind === "imprint" ? "AboutPage" : "WebPage",
        "@id": url,
        name: doc.title,
        description: doc.description,
        inLanguage: locale,
        url,
        dateModified: LEGAL_UPDATED,
        isPartOf: { "@id": websiteId() },
        publisher: { "@id": ORG_ID },
        ...(kind === "imprint" ? { mainEntity: { "@id": ORG_ID } } : {}),
      },
      organizationNode(),
      breadcrumb([
        { name: "DentVideo", path: LANDING_PATH[locale] },
        { name: doc.title, path: legalPath(kind, locale) },
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
    ...GUIDE_HUB_LOCALES.map((l) => ({ path: GUIDES_INDEX_PATH[l], lastmod: latestGuide(l), priority: "0.8", alternates: perLocaleAltPaths(GUIDES_INDEX_PATH, GUIDE_HUB_LOCALES) })),
    ...LOCALES.map((l) => ({ path: ABOUT_PATH[l], lastmod: SITE_UPDATED, priority: "0.6", alternates: perLocaleAltPaths(ABOUT_PATH) })),
    ...GUIDES.map((g) => ({ path: guidePath(g), lastmod: dateOf(g), priority: "0.7", alternates: guideAltPaths(g) })),
    ...SOLUTIONS.map((p) => ({ path: solutionPath(p), lastmod: p.updated ?? p.published, priority: "0.8", alternates: solutionAltPaths(p) })),
    ...LEGAL_KINDS.flatMap((k) => LOCALES.map((l) => ({ path: legalPath(k, l), lastmod: LEGAL_UPDATED, priority: "0.3", alternates: perLocaleAltPaths(legalPaths(k)) }))),
  ];
}

/* ---------- Commercial pages (/videos/<slug>) ---------- */

/** A commercial page's <title>: its SEO title, plus " · DentVideo" unless it already names the brand. */
export function solutionSeoTitle(p: SolutionPage): string {
  return p.seoTitle.includes("DentVideo") ? p.seoTitle : `${p.seoTitle}${BRAND_SUFFIX}`;
}

/** hreflang for a commercial page: the pages of the same kind, one per language. */
export function solutionAltPaths(p: SolutionPage): Record<string, string> | undefined {
  const group = solutionTranslations(p);
  if (group.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const o of group) languages[HREFLANG[o.locale]] = solutionPath(o);
  const en = group.find((o) => o.locale === "en");
  if (en) languages["x-default"] = solutionPath(en);
  return languages;
}

export function solutionMetadata(p: SolutionPage): Metadata {
  const url = absoluteUrl(solutionPath(p));
  const alt = solutionAltPaths(p);
  const title = solutionSeoTitle(p);
  return {
    title: { absolute: title },
    description: p.seoDescription,
    alternates: { canonical: url, ...(alt ? { languages: absolute(alt) } : {}) },
    openGraph: {
      title,
      description: p.seoDescription,
      url,
      type: "website",
      siteName: "DentVideo",
      locale: OG_LOCALE[p.locale],
      ...(OG_ALTERNATE_LOCALES[p.locale] ? { alternateLocale: OG_ALTERNATE_LOCALES[p.locale] } : {}),
      images: [landingOgImage(p.locale)],
    },
    twitter: { card: "summary_large_image", title, description: p.seoDescription, images: [landingOgImage(p.locale)] },
  };
}

export function solutionJsonLd(p: SolutionPage) {
  const url = absoluteUrl(solutionPath(p));
  const ui = SOLUTION_UI[p.locale];
  const samples = p.kind === "product" ? (samplesFor(p.locale) ?? []) : [];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: p.h1,
        description: p.seoDescription,
        inLanguage: p.locale,
        datePublished: p.published,
        dateModified: p.updated ?? p.published,
        lastReviewed: reviewedDate(p),
        reviewedBy: editorialTeam(p.locale),
        isPartOf: { "@id": websiteId() },
        about: { "@id": softwareId() },
        publisher: { "@id": ORG_ID },
      },
      organizationNode(),
      softwareNode(p.locale),
      faqNode(p.faq, p.locale),
      breadcrumb([
        { name: "DentVideo", path: LANDING_PATH[p.locale] },
        { name: p.nav, path: solutionPath(p) },
      ]),
      // The sample videos shown on the page: real DentVideo output for a demo clinic in this language.
      ...samples.map((v) => ({
        "@type": "VideoObject",
        name: v.name,
        description: `${ui.samplesHeading}. ${ui.samplesNote}`,
        thumbnailUrl: absoluteUrl(sampleSrc(p.locale, v.slug, "jpg")),
        contentUrl: absoluteUrl(sampleSrc(p.locale, v.slug, "mp4")),
        uploadDate: "2026-11-08",
        duration: `PT${v.seconds}S`,
        inLanguage: p.locale,
        publisher: { "@id": ORG_ID },
      })),
    ],
  };
}
