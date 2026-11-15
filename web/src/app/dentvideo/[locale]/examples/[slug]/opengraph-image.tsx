import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { EXAMPLES, examplesFor, findExample } from "@/content/dentvideo-examples";
import { OG_SIZE } from "@/lib/dentvid/og";
import { exampleCard, pageOgImage } from "@/lib/dentvid/og-page";

// One share card per example video page, in its language, rendered at build time.
const OTHER = SHARED_ROUTE_LOCALES;
export const dynamicParams = false;

export function generateStaticParams() {
  return OTHER.flatMap((locale) => examplesFor(locale).map((e) => ({ locale, slug: e.slug })));
}

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { locale: string; slug: string };

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const { locale, slug } = await params;
  const e = ((OTHER as string[]).includes(locale) ? findExample(locale as Locale, slug) : undefined) ?? EXAMPLES[0];
  return pageOgImage(exampleCard(e));
}
