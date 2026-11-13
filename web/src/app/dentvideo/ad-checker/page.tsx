import type { Metadata } from "next";
import { CheckerPage } from "@/components/dentvid/checker-page";
import { checkerMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/ad-checker: the free ad checker ("Is my post allowed?"); other languages: [locale]/ad-checker, ja/, ar/.
export const metadata: Metadata = checkerMetadata("en");
// The same HTML for every visitor: prerendered once at build. The check itself runs in the browser.
export const dynamic = "force-static";

export default function EnglishChecker() {
  return <CheckerPage locale="en" />;
}
