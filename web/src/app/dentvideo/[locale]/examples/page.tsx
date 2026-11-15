import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { ExamplesHub } from "@/components/dentvid/examples-page";
import { examplesHubMetadata } from "@/lib/dentvid/seo-guides";

// The examples hub per language (dentvideo.com/de/examples …); English lives at /examples, ja and ar in their own folders.
const OTHER = SHARED_ROUTE_LOCALES;
// Unknown values reach notFound(), so they get the DentVideo 404 inside the header and footer.
export const dynamicParams = true;

export function generateStaticParams() {
  return OTHER.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

const asLocale = (v: string): Locale | null => ((OTHER as string[]).includes(v) ? (v as Locale) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return examplesHubMetadata(locale);
}

export default async function LocalizedExamples({ params }: Props) {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return <ExamplesHub locale={locale} />;
}
