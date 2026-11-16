import type { Metadata } from "next";
import { HelpCenter } from "@/components/dentvid/help-center";
import { helpMetadata } from "@/lib/dentvid/seo-guides";

// English help center (dentvideo.com/help); other languages: [locale]/help, ja/help, ar/help.
export const metadata: Metadata = helpMetadata("en");
export const dynamic = "force-static";

export default function EnglishHelp() {
  return <HelpCenter locale="en" />;
}
