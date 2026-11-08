import { LegalPage, legalMetadata } from "@/components/dentvid/legal";

// dentvideo.com/privacy (English, binding); Turkish at /tr/privacy.
export const metadata = legalMetadata("privacy", "en");

export default function PrivacyEn() {
  return <LegalPage kind="privacy" locale="en" />;
}
