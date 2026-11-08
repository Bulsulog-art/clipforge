import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { landingMetadata } from "@/lib/dentvid/seo";

// English lives at /dentvideo; the other languages are static pages here.
// Static siblings (app, start, guides, llms.txt) take precedence over this
// dynamic segment, and anything else 404s.
const OTHER = LOCALES.filter((l) => l !== "en");
export const dynamicParams = false;

export function generateStaticParams() {
  return OTHER.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

function asLocale(v: string): Locale | null {
  return (OTHER as string[]).includes(v) ? (v as Locale) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return locale ? landingMetadata(locale) : {};
}

export default async function LocalizedLanding({ params }: Props) {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return <DentVideoLanding locale={locale} />;
}
