import type { Metadata } from "next";
import { ExamplesHub } from "@/components/dentvid/examples-page";
import { examplesHubMetadata } from "@/lib/dentvid/seo-guides";

// The examples hub in Japanese (own folder, so it gets the Japanese web font from ja/layout).
export const metadata: Metadata = examplesHubMetadata("ja");
export const dynamic = "force-static";

export default function JapaneseExamples() {
  return <ExamplesHub locale="ja" />;
}
