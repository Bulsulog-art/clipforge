import type { Metadata } from "next";
import { GUIDES, type Locale } from "@/content/dentvideo";
import { DvFooter, DvHeader } from "@/components/dentvid/chrome";

export const metadata: Metadata = {
  title: { default: "DentVideo — patient-education videos for dental clinics", template: "%s · DentVideo" },
  description:
    "DentVideo turns a dentist's five-minute phone recording into a week of captioned, compliant short videos — and writes, narrates and checks educational videos when there is no time to film.",
};

// Each guide is written in one language; the header and footer follow it.
const GUIDE_LOCALES: Record<string, Locale> = Object.fromEntries(GUIDES.map((g) => [g.slug, g.locale]));

export default function DentVideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#14211f] antialiased">
      <DvHeader guideLocales={GUIDE_LOCALES} />
      {children}
      <DvFooter guideLocales={GUIDE_LOCALES} />
    </div>
  );
}
