import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage, legalMetadata } from "@/components/dentvid/legal";

// Only Turkish has its own text; other languages link to the English page.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "tr" }];
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return (await params).locale === "tr" ? legalMetadata("terms", "tr") : {};
}

export default async function TermsLocalized({ params }: Props) {
  if ((await params).locale !== "tr") notFound();
  return <LegalPage kind="terms" locale="tr" />;
}
