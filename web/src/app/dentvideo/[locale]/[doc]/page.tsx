import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { LEGAL_KINDS, isLegalKind, type LegalKind } from "@/content/legal";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// Legal pages per language (dentvideo.com/de/imprint …); English lives at /terms, /privacy …
// Any other one-segment address (/de/xyz) reaches notFound(): the DentVideo 404, as before.
export const dynamicParams = true;

export function generateStaticParams() {
  return SHARED_ROUTE_LOCALES.flatMap((locale) => LEGAL_KINDS.map((doc) => ({ locale, doc })));
}

type Props = { params: Promise<{ locale: string; doc: string }> };

function resolve(p: { locale: string; doc: string }): { locale: Locale; kind: LegalKind } | null {
  if (!(SHARED_ROUTE_LOCALES as string[]).includes(p.locale) || !isLegalKind(p.doc)) return null;
  return { locale: p.locale as Locale, kind: p.doc };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = resolve(await params);
  if (!r) notFound();
  return legalMetadata(r.kind, r.locale);
}

export default async function LocalizedLegal({ params }: Props) {
  const r = resolve(await params);
  if (!r) notFound();
  return <LegalPage kind={r.kind} locale={r.locale} />;
}
