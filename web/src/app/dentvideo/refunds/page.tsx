import type { Metadata } from "next";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/refunds (English, authoritative); other languages: [locale]/[doc], ar/[doc], ja/[doc].
export const metadata: Metadata = legalMetadata("refunds", "en");
export const dynamic = "force-static";

export default function EnglishRefunds() {
  return <LegalPage kind="refunds" locale="en" />;
}
