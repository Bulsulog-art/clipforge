import type { Metadata } from "next";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/terms (English, authoritative); other languages: [locale]/[doc], ar/[doc], ja/[doc].
export const metadata: Metadata = legalMetadata("terms", "en");
export const dynamic = "force-static";

export default function EnglishTerms() {
  return <LegalPage kind="terms" locale="en" />;
}
