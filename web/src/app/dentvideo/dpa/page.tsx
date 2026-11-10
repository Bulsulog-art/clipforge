import type { Metadata } from "next";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/dpa (English, authoritative); other languages: [locale]/[doc], ar/[doc], ja/[doc].
export const metadata: Metadata = legalMetadata("dpa", "en");
export const dynamic = "force-static";

export default function EnglishDpa() {
  return <LegalPage kind="dpa" locale="en" />;
}
