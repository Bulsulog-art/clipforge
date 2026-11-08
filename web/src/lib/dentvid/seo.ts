import type { Metadata } from "next";
import { dvUrl as absoluteUrl } from "@/lib/dentvid/host";
import { LANDING, LANDING_PATH, LOCALES, HREFLANG, type Locale } from "@/content/dentvideo";
import { sampleSrc, samplesFor } from "@/content/dentvideo-samples";
import { dentvideoSitemapEntries } from "./seo-guides";
import { DV_PRICES_USD, DV_TIERS } from "./billing";

/** hreflang map for the landings: every locale plus x-default (English). */
export function landingAlternates(): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = absoluteUrl(LANDING_PATH[l]);
  languages["x-default"] = absoluteUrl(LANDING_PATH.en);
  return languages;
}

import { OG_ALTERNATE_LOCALES, OG_LOCALE } from "./seo-guides";

export function landingMetadata(locale: Locale): Metadata {
  const c = LANDING[locale];
  const url = absoluteUrl(LANDING_PATH[locale]);
  return {
    title: { absolute: c.meta.title },
    description: c.meta.description,
    alternates: { canonical: url, languages: landingAlternates() },
    openGraph: {
      title: c.meta.title,
      description: c.meta.ogDescription,
      url,
      type: "website",
      siteName: "DentVideo",
      locale: OG_LOCALE[locale],
      ...(OG_ALTERNATE_LOCALES[locale] ? { alternateLocale: OG_ALTERNATE_LOCALES[locale] } : {}),
    },
    // Otherwise the layout's English X card text would apply to every language.
    twitter: { card: "summary_large_image", title: c.meta.title, description: c.meta.ogDescription },
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
        offers: DV_TIERS.map((tier, i) => ({
          "@type": "Offer",
          name: c.pricing.tiers[i].name,
          price: DV_PRICES_USD[tier].month,
          priceCurrency: "USD",
          description: c.pricing.text,
        })),
        publisher: PUBLISHER,
      },
      { ...faqPage(c.faq), inLanguage: locale },
      // The sample week shown on this landing, in this landing's language.
      ...(samplesFor(locale) ?? []).map((v) => ({
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
