import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_KINDS, isLegalKind } from "@/content/legal";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// Arabic legal pages (dentvideo.com/ar/terms …), right to left, with the Arabic font (ar/layout).
export const dynamicParams = true;

export function generateStaticParams() {
  return LEGAL_KINDS.map((doc) => ({ doc }));
}

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalKind(doc)) notFound();
  return legalMetadata(doc, "ar");
}

export default async function ArabicLegal({ params }: Props) {
  const { doc } = await params;
  if (!isLegalKind(doc)) notFound();
  return <LegalPage kind={doc} locale="ar" />;
}
