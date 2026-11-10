import type { Metadata } from "next";
import { LegalPage } from "@/components/dentvid/legal-page";
import { legalMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/privacy (English, authoritative); other languages: [locale]/[doc], ar/[doc], ja/[doc].
export const metadata: Metadata = legalMetadata("privacy", "en");
export const dynamic = "force-static";

export default function EnglishPrivacy() {
  return <LegalPage kind="privacy" locale="en" />;
}
