import type { Metadata } from "next";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { landingMetadata } from "@/lib/dentvid/seo";

export const metadata: Metadata = landingMetadata("en");

export default function DentVideoHome() {
  return <DentVideoLanding locale="en" />;
}
