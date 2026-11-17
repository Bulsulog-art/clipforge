import type { Metadata } from "next";
import { ExamplesHub } from "@/components/dentvid/examples-page";
import { examplesHubMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/examples: the English sample videos (and links to every other language's); others: [locale]/examples, ja/, ar/.
export const metadata: Metadata = examplesHubMetadata("en");
export const dynamic = "force-static";

export default function EnglishExamples() {
  return <ExamplesHub locale="en" />;
}
