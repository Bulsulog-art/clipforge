import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { examplesFor, findExample } from "@/content/dentvideo-examples";
import { ExampleView } from "@/components/dentvid/examples-page";
import { exampleMetadata } from "@/lib/dentvid/seo-guides";

// One Japanese sample video (own folder, so it gets the Japanese web font from ja/layout).
export const dynamicParams = true;

export function generateStaticParams() {
  return examplesFor("ja").map((e) => ({ slug: e.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = findExample("ja", (await params).slug);
  if (!e) notFound();
  return exampleMetadata(e);
}

export default async function JapaneseExample({ params }: Props) {
  const e = findExample("ja", (await params).slug);
  if (!e) notFound();
  return <ExampleView e={e} />;
}
