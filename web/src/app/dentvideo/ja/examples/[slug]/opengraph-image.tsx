import { examplesFor, findExample } from "@/content/dentvideo-examples";
import { OG_SIZE } from "@/lib/dentvid/og";
import { exampleCard, pageOgImage } from "@/lib/dentvid/og-page";

// One share card per Japanese example video page, rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return examplesFor("ja").map((e) => ({ slug: e.slug }));
}

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { slug: string };

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const e = findExample("ja", (await params).slug) ?? examplesFor("ja")[0];
  return pageOgImage(exampleCard(e));
}
