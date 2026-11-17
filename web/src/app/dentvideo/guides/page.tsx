import type { Metadata } from "next";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// English guides hub (dentvideo.com/guides); other languages: [locale]/guides.
export const metadata: Metadata = guidesIndexMetadata("en");
// The same HTML for every visitor: prerendered once at build (kept explicit; the DentVideo 404
// boundary no longer reads request data, see app/dentvideo/not-found.tsx).
export const dynamic = "force-static";

export default function EnglishGuidesIndex() {
  return <GuidesIndex locale="en" />;
}
