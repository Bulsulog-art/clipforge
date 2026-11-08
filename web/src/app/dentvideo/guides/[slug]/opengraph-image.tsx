import { GUIDES, findGuide } from "@/content/dentvideo";
import { OG_SIZE } from "@/lib/dentvid/og";
import { guideOgImage } from "@/lib/dentvid/og-guide";

// One share card per guide, rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { slug: string };

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const g = findGuide((await params).slug) ?? GUIDES[0];
  return guideOgImage(g);
}
