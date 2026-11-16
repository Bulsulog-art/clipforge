import type { Metadata } from "next";
import { HelpCenter } from "@/components/dentvid/help-center";
import { helpMetadata } from "@/lib/dentvid/seo-guides";

// Japanese help center (dentvideo.com/ja/help): in the ja folder so it gets the Japanese font from ja/layout.
export const metadata: Metadata = helpMetadata("ja");
export const dynamic = "force-static";

export default function JapaneseHelp() {
  return <HelpCenter locale="ja" />;
}
