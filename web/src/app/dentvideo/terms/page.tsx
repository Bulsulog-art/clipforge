import { LegalPage, legalMetadata } from "@/components/dentvid/legal";

// dentvideo.com/terms (English, binding); Turkish at /tr/terms.
export const metadata = legalMetadata("terms", "en");

export default function TermsEn() {
  return <LegalPage kind="terms" locale="en" />;
}
