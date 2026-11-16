import type { Metadata } from "next";
import { HelpCenter } from "@/components/dentvid/help-center";
import { helpMetadata } from "@/lib/dentvid/seo-guides";

// Arabic help center (dentvideo.com/ar/help): in the ar folder so it gets the Arabic font from ar/layout; right to left.
export const metadata: Metadata = helpMetadata("ar");
export const dynamic = "force-static";

export default function ArabicHelp() {
  return <HelpCenter locale="ar" />;
}
