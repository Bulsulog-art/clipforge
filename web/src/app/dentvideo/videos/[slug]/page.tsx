import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SOLUTIONS, findSolution } from "@/content/solutions";
import { solutionMetadata } from "@/lib/dentvid/seo-guides";
import { SolutionView } from "@/components/dentvid/solution-page";

// dentvideo.com/videos/<slug>: what DentVideo does for one search, per language.
// Unknown values reach notFound(), so they get the DentVideo 404 inside the header and footer.
export const dynamicParams = true;

export function generateStaticParams() {
  return SOLUTIONS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = findSolution((await params).slug);
  if (!p) notFound();
  return solutionMetadata(p);
}

export default async function SolutionRoute({ params }: Props) {
  const p = findSolution((await params).slug);
  if (!p) notFound();
  return <SolutionView p={p} />;
}
