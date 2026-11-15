import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { examplesFor, findExample } from "@/content/dentvideo-examples";
import { ExampleView } from "@/components/dentvid/examples-page";
import { exampleMetadata } from "@/lib/dentvid/seo-guides";

// One Arabic sample video (own folder, so it gets the Arabic web font from ar/layout; right to left).
export const dynamicParams = true;

export function generateStaticParams() {
  return examplesFor("ar").map((e) => ({ slug: e.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = findExample("ar", (await params).slug);
  if (!e) notFound();
  return exampleMetadata(e);
}

export default async function ArabicExample({ params }: Props) {
  const e = findExample("ar", (await params).slug);
  if (!e) notFound();
  return <ExampleView e={e} />;
}
