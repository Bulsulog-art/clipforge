import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { CheckerPage } from "@/components/dentvid/checker-page";
import { checkerMetadata } from "@/lib/dentvid/seo-guides";

// The free ad checker per language (dentvideo.com/tr/ad-checker …); English lives at /ad-checker, ja and ar in their own folders.
const OTHER = SHARED_ROUTE_LOCALES;
// Unknown values reach the page and its notFound(), so they get the DentVideo 404 inside the header and footer.
export const dynamicParams = true;

export function generateStaticParams() {
  return OTHER.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

const asLocale = (v: string): Locale | null => ((OTHER as string[]).includes(v) ? (v as Locale) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return checkerMetadata(locale);
}

export default async function LocalizedChecker({ params }: Props) {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return <CheckerPage locale={locale} />;
}
