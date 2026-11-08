import type { Metadata } from "next";
import { dvUrl as absoluteUrl } from "@/lib/dentvid/host";
import { LANDING, LANDING_PATH, LOCALES, HREFLANG, type Locale } from "@/content/dentvideo";
import { SAMPLE_VIDEOS, sampleSrc } from "@/content/dentvideo-samples";
import { dentvideoSitemapEntries } from "./seo-guides";

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
      // The sample week shown on this landing, in this landing's language.
      ...SAMPLE_VIDEOS[locale].map((v) => ({
        "@type": "VideoObject",
        name: v.name,
        description: `${c.samples.heading} — DentVideo`,
        thumbnailUrl: absoluteUrl(sampleSrc(locale, v.slug, "jpg")),
        contentUrl: absoluteUrl(sampleSrc(locale, v.slug, "mp4")),
        uploadDate: "2026-11-08",
        duration: `PT${v.seconds}S`,
        inLanguage: locale,
        publisher: PUBLISHER,
      })),
    ],
  };
}

// Guides, guides indexes, About pages and the sitemap live in seo-guides.ts.
export { guideJsonLd, guideMetadata } from "./seo-guides";

/** Every public DentVideo path, for the sitemap. */
export function dentvideoPaths(): string[] {
  return dentvideoSitemapEntries().map((e) => e.path);
}
