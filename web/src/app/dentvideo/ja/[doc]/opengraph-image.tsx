import { LEGAL_KINDS, isLegalKind } from "@/content/legal";
import { OG_SIZE } from "@/lib/dentvid/og";
import { legalCard, pageOgImage } from "@/lib/dentvid/og-page";

// One share card per legal page, rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_KINDS.map((doc) => ({ doc }));
}

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { doc: string };

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const { doc } = await params;
  return pageOgImage(legalCard(isLegalKind(doc) ? doc : "terms", "ja"));
}
