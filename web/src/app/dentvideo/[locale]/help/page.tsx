import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { HelpCenter } from "@/components/dentvid/help-center";
import { helpMetadata } from "@/lib/dentvid/seo-guides";

// The help center per language (dentvideo.com/de/help …); English lives at /help, ja and ar in their own folders.
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
  return helpMetadata(locale);
}

export default async function LocalizedHelp({ params }: Props) {
  const locale = asLocale((await params).locale);
  if (!locale) notFound();
  return <HelpCenter locale={locale} />;
}
