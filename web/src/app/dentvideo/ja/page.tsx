import type { Metadata } from "next";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { landingMetadata } from "@/lib/dentvid/seo";

export const metadata: Metadata = landingMetadata("ja");

export default function JapaneseLanding() {
  return <DentVideoLanding locale="ja" />;
}
