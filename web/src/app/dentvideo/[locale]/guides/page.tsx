import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, hasGuides, type Locale } from "@/content/dentvideo";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// Guides hub per language (dentvideo.com/de/guides …); English lives at /guides.
// Only languages that have guides get a hub (Polish has none yet; ja and ar live in their own folders).
const OTHER = SHARED_ROUTE_LOCALES.filter(hasGuides);
// Unknown values reach the page and its notFound(), so they get the DentVideo 404 (not-found.tsx)
// inside the header and footer rather than Next's bare default.
export const dynamicParams = true;

export function generateStaticParams() {
  return OTHER.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

const asLocale = (v: string): Locale | null => ((OTHER as string[]).includes(v) ? (v as Locale) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return locale ? guidesIndexMetadata(locale) : {};
}

export default async function LocalizedGuidesIndex({ params }: Props) {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return <GuidesIndex locale={locale} />;
}
