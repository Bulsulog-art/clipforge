import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_KINDS, isLegalKind } from "@/content/legal";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// Japanese legal pages (dentvideo.com/ja/terms …), with the Japanese font (ja/layout).
export const dynamicParams = true;

export function generateStaticParams() {
  return LEGAL_KINDS.map((doc) => ({ doc }));
}

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalKind(doc)) notFound();
  return legalMetadata(doc, "ja");
}

export default async function JapaneseLegal({ params }: Props) {
  const { doc } = await params;
  if (!isLegalKind(doc)) notFound();
  return <LegalPage kind={doc} locale="ja" />;
}
