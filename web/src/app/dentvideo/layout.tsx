import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { GUIDES, LOCALES, type Locale } from "@/content/dentvideo";
import { SOLUTIONS, solutionPath, solutionsFor } from "@/content/solutions";
import { DvFooter, DvHeader, type CommercialNav } from "@/components/dentvid/chrome";
import { chromeText } from "@/lib/dentvid/chrome-text";
import "./dentvideo.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--dv-font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--dv-font-serif", display: "swap" });

export const metadata: Metadata = {
  // Share images and other relative URLs resolve on dentvideo.com, not the ClipForge host.
  ...(process.env.NEXT_PUBLIC_DENTVIDEO_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_DENTVIDEO_URL) } : {}),
  // Without this, DentVideo pages inherited ClipForge's Twitter/X card text.
  twitter: {
    card: "summary_large_image",
    title: "DentVideo — patient-education videos for dental clinics",
    description: "Your dentist's own voice, cut into captioned short videos. Checked before you see them. Approved by you.",
  },
  // The root layout's ClipForge canonical and share card must not leak onto
  // DentVideo pages that set none of their own (sign-up, app, 404): pages
  // with a canonical set it themselves.
  alternates: {},
  openGraph: {
    siteName: "DentVideo",
    type: "website",
    title: "DentVideo — patient-education videos for dental clinics",
    description: "Five patient videos every Monday, checked before you see them. You just approve.",
  },
  title: { absolute: "DentVideo — patient-education videos for dental clinics", template: "%s · DentVideo" },
  description:
    "DentVideo turns a dentist's five-minute phone recording into a week of captioned, compliant short videos — and writes, narrates and checks educational videos when there is no time to film.",
  applicationName: "DentVideo",
  // Optional search-console verification by meta tag (DNS TXT records are the preferred route; see docs/SEO_PLAN.md).
  ...(process.env.DENTVIDEO_GOOGLE_SITE_VERIFICATION || process.env.DENTVIDEO_BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.DENTVIDEO_GOOGLE_SITE_VERIFICATION ? { google: process.env.DENTVIDEO_GOOGLE_SITE_VERIFICATION } : {}),
          ...(process.env.DENTVIDEO_BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.DENTVIDEO_BING_SITE_VERIFICATION } } : {}),
        },
      }
    : {}),
  icons: {
    icon: [
      { url: "/dentvideo/icon.svg", type: "image/svg+xml" },
      { url: "/dentvideo/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/dentvideo/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#faf7f2" };

// Each guide and each commercial page is written in one language; the header and footer follow it.
const GUIDE_LOCALES: Record<string, Locale> = Object.fromEntries([...GUIDES, ...SOLUTIONS].map((g) => [g.slug, g.locale]));

// The header's and footer's words in every language: passed down, so the content modules they come from stay on the server.
const CHROME_TEXT = chromeText();

// The footer links every language's commercial pages (only their paths and short labels reach the browser).
const COMMERCIAL: CommercialNav = Object.fromEntries(LOCALES.map((l) => [l, solutionsFor(l).map((p) => ({ href: solutionPath(p), label: p.nav }))]));

export default function DentVideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`dv ${sans.variable} ${serif.variable} flex min-h-screen flex-col bg-dv-paper text-dv-ink antialiased`}>
      <DvHeader guideLocales={GUIDE_LOCALES} text={CHROME_TEXT} />
      <div className="flex-1">{children}</div>
      <DvFooter guideLocales={GUIDE_LOCALES} text={CHROME_TEXT} commercial={COMMERCIAL} />
    </div>
  );
}
