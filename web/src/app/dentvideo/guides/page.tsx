import type { Metadata } from "next";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// English guides hub (dentvideo.com/guides); other languages: [locale]/guides.
export const metadata: Metadata = guidesIndexMetadata("en");
// The same HTML for every visitor: prerendered once at build (the DentVideo 404
// boundary reads a cookie, which would otherwise render this page per request).
export const dynamic = "force-static";

export default function EnglishGuidesIndex() {
  return <GuidesIndex locale="en" />;
}
