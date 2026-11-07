import type { Metadata } from "next";
import { SeoIndex } from "@/components/seo/seo-landing";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Use cases: podcasts, YouTube, webinars into short clips",
  description: "What ClipForge is used for: turning podcasts, long YouTube videos and webinars into captioned vertical clips.",
  alternates: { canonical: absoluteUrl("/use-cases") },
};

export default function UseCasesIndex() {
  return (
    <SeoIndex
      section="use-cases"
      title="What people make with ClipForge"
      intro="One long recording in, a set of short, captioned, speaker-framed clips out. Pick your starting point."
    />
  );
}
