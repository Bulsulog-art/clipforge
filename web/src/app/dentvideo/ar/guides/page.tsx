import type { Metadata } from "next";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// Arabic guides hub (dentvideo.com/ar/guides): in the ar folder so it gets the Arabic font from ar/layout.
export const metadata: Metadata = guidesIndexMetadata("ar");
// The same HTML for every visitor: prerendered once at build (the DentVideo 404
// boundary reads a cookie, which would otherwise render this page per request).
export const dynamic = "force-static";

export default function ArabicGuidesIndex() {
  return <GuidesIndex locale="ar" />;
}
