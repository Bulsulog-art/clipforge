import { SOLUTIONS, findSolution } from "@/content/solutions";
import { OG_SIZE } from "@/lib/dentvid/og";
import { pageOgImage, solutionCard } from "@/lib/dentvid/og-page";

// One share card per commercial page, in its language, rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return SOLUTIONS.map((p) => ({ slug: p.slug }));
}

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { slug: string };

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const p = findSolution((await params).slug) ?? SOLUTIONS[0];
  return pageOgImage(solutionCard(p));
}
