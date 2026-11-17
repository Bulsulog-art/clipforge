import type { Metadata } from "next";
import { ArabicFont } from "@/components/dentvid/font-ar";
import { JapaneseFont } from "@/components/dentvid/font-ja";
import { NotFoundBody } from "@/components/dentvid/not-found-body";

// A DentVideo 404 inside the DentVideo header and footer, instead of Next's
// unbranded default, in the language of the address or the visitor's
// remembered one (components/dentvid/not-found-body).
//
// Nothing here may read cookies() or headers(): this boundary sits above every
// DentVideo page, and a request-time read in it makes all the pages with
// generateStaticParams (/de, /tr/guides, every guide …) render per request
// instead of being prerendered — with their metadata streamed into the body.
export const metadata: Metadata = {
  title: { absolute: "Page not found · DentVideo" },
  robots: { index: false, follow: true },
};

export default function DentVideoNotFound() {
  return <NotFoundBody fonts={{ ja: <JapaneseFont />, ar: <ArabicFont /> }} />;
}
