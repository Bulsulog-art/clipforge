import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// Guides hub per language (dentvideo.com/de/guides …); English lives at /guides.
const OTHER = LOCALES.filter((l) => l !== "en");
export const dynamicParams = false;

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
