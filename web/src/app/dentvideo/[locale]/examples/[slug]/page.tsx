import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { examplesFor, findExample } from "@/content/dentvideo-examples";
import { ExampleView } from "@/components/dentvid/examples-page";
import { exampleMetadata } from "@/lib/dentvid/seo-guides";

// One sample video per page (dentvideo.com/de/examples/<slug> …); English at /examples/<slug>, ja and ar in their own folders.
const OTHER = SHARED_ROUTE_LOCALES;
export const dynamicParams = true;

export function generateStaticParams() {
  return OTHER.flatMap((locale) => examplesFor(locale).map((e) => ({ locale, slug: e.slug })));
}

type Props = { params: Promise<{ locale: string; slug: string }> };

async function load(params: Props["params"]) {
  const { locale, slug } = await params;
  return (OTHER as string[]).includes(locale) ? findExample(locale as Locale, slug) : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await load(params);
  if (!e) notFound();
  return exampleMetadata(e);
}

export default async function LocalizedExample({ params }: Props) {
  const e = await load(params);
  if (!e) notFound();
  return <ExampleView e={e} />;
}
