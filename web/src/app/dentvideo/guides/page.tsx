import type { Metadata } from "next";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// English guides hub (dentvideo.com/guides); other languages: [locale]/guides.
export const metadata: Metadata = guidesIndexMetadata("en");

export default function EnglishGuidesIndex() {
  return <GuidesIndex locale="en" />;
}
