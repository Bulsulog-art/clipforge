import type { Metadata } from "next";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/imprint (English, authoritative); other languages: [locale]/[doc], ar/[doc], ja/[doc].
export const metadata: Metadata = legalMetadata("imprint", "en");
export const dynamic = "force-static";

export default function EnglishImprint() {
  return <LegalPage kind="imprint" locale="en" />;
}
