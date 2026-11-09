import type { Metadata } from "next";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// Japanese guides hub (dentvideo.com/ja/guides): in the ja folder so it gets the Japanese font from ja/layout.
export const metadata: Metadata = guidesIndexMetadata("ja");

export default function JapaneseGuidesIndex() {
  return <GuidesIndex locale="ja" />;
}
