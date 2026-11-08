import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { GUIDES, LANDING, LANDING_PATH, LOCALES, HREFLANG, guidePath, type Guide, type Locale } from "@/content/dentvideo";

/** hreflang map for the landings: every locale plus x-default (English). */
export function landingAlternates(): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = absoluteUrl(LANDING_PATH[l]);
  languages["x-default"] = absoluteUrl(LANDING_PATH.en);
  return languages;
}

const OG_LOCALE: Record<Locale, string> = { en: "en_US", de: "de_DE", es: "es_ES", tr: "tr_TR", fr: "fr_FR" };

export function landingMetadata(locale: Locale): Metadata {
  const c = LANDING[locale];
  const url = absoluteUrl(LANDING_PATH[locale]);
  return {
    title: { absolute: c.meta.title },
    description: c.meta.description,
    alternates: { canonical: url, languages: landingAlternates() },
    openGraph: { title: c.meta.title, description: c.meta.ogDescription, url, type: "website", siteName: "DentVideo", locale: OG_LOCALE[locale] },
  };
}

const PUBLISHER = { "@type": "Organization", name: "Bulsu Labs", url: "https://bulsulabs.com" };

function faqPage(faq: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function landingJsonLd(locale: Locale) {
  const c = LANDING[locale];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "DentVideo",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        description: c.meta.description,
        url: absoluteUrl(LANDING_PATH[locale]),
        offers: { "@type": "Offer", description: c.pricing.text },
        publisher: PUBLISHER,
      },
      { ...faqPage(c.faq), inLanguage: locale },
    ],
  };
}

export function guideMetadata(g: Guide): Metadata {
  const url = absoluteUrl(guidePath(g));
  return {
    title: { absolute: `${g.title} · DentVideo` },
    description: g.description,
    alternates: { canonical: url },
    openGraph: { title: g.title, description: g.description, url, type: "article", siteName: "DentVideo", locale: OG_LOCALE[g.locale] },
  };
}

export function guideJsonLd(g: Guide) {
  const url = absoluteUrl(guidePath(g));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: g.h1,
        description: g.description,
        inLanguage: g.locale,
        url,
        mainEntityOfPage: url,
        publisher: PUBLISHER,
      },
      { ...faqPage(g.faq), inLanguage: g.locale },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "DentVideo", item: absoluteUrl(LANDING_PATH[g.locale]) },
          { "@type": "ListItem", position: 2, name: g.h1, item: url },
        ],
      },
    ],
  };
}

/** Every public DentVideo path, for the sitemap. */
export function dentvideoPaths(): string[] {
  return [...LOCALES.map((l) => LANDING_PATH[l]), ...GUIDES.map(guidePath)];
}
