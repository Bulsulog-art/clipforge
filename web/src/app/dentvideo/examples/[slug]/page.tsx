import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { examplesFor, findExample } from "@/content/dentvideo-examples";
import { ExampleView } from "@/components/dentvid/examples-page";
import { exampleMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/examples/<slug>: one English sample video. Unknown slugs get the DentVideo 404.
export const dynamicParams = true;

export function generateStaticParams() {
  return examplesFor("en").map((e) => ({ slug: e.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = findExample("en", (await params).slug);
  if (!e) notFound();
  return exampleMetadata(e);
}

export default async function EnglishExample({ params }: Props) {
  const e = findExample("en", (await params).slug);
  if (!e) notFound();
  return <ExampleView e={e} />;
}
