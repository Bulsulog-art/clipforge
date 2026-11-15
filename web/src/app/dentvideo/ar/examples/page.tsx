import type { Metadata } from "next";
import { ExamplesHub } from "@/components/dentvid/examples-page";
import { examplesHubMetadata } from "@/lib/dentvid/seo-guides";

// The examples hub in Arabic (own folder, so it gets the Arabic web font from ar/layout; right to left).
export const metadata: Metadata = examplesHubMetadata("ar");
export const dynamic = "force-static";

export default function ArabicExamples() {
  return <ExamplesHub locale="ar" />;
}
