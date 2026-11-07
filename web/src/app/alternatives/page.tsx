import type { Metadata } from "next";
import { SeoIndex } from "@/components/seo/seo-landing";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI clipping tool alternatives",
  description: "How ClipForge compares as an alternative to OpusClip, Klap and Vizard for turning long videos into short clips.",
  alternates: { canonical: absoluteUrl("/alternatives") },
};

export default function AlternativesIndex() {
  return (
    <SeoIndex
      section="alternatives"
      title="ClipForge as an alternative"
      intro="If you are comparing AI clipping tools, here is what ClipForge does and what it costs. Run the same video through each tool and judge by the clips."
    />
  );
}
