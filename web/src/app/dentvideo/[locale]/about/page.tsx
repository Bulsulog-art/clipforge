import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { AboutPage } from "@/components/dentvid/about";
import { aboutMetadata } from "@/lib/dentvid/seo-guides";

// About DentVideo per language (dentvideo.com/de/about …); English lives at /about.
const OTHER = SHARED_ROUTE_LOCALES;
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
  return locale ? aboutMetadata(locale) : {};
}

export default async function LocalizedAbout({ params }: Props) {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return <AboutPage locale={locale} />;
}
