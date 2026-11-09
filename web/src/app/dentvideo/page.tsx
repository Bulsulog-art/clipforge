import type { Metadata } from "next";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { landingMetadata } from "@/lib/dentvid/seo";

export const metadata: Metadata = landingMetadata("en");
// The same HTML for every visitor: prerendered once at build (the DentVideo 404
// boundary reads a cookie, which would otherwise render this page per request).
export const dynamic = "force-static";

export default function DentVideoHome() {
  return <DentVideoLanding locale="en" />;
}
