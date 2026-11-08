import type { Metadata } from "next";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { landingMetadata } from "@/lib/dentvid/seo";

export const metadata: Metadata = landingMetadata("ar");

export default function ArabicLanding() {
  return <DentVideoLanding locale="ar" />;
}
