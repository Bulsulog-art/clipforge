import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AttributionCapture } from "@/components/AttributionCapture";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://clipforge.bulsulabs.xyz"),
  title: {
    default: "ClipForge — Turn long videos into viral clips, captioned & auto-posted",
    template: "%s · ClipForge",
  },
  description:
    "ClipForge turns one long video or podcast into a dozen viral short clips — AI picks the best moments, scores them, adds animated word-by-word captions and hooks, and auto-posts to TikTok, Reels and Shorts. Mobile-first.",
  keywords: [
    "AI video clipping", "viral clips", "podcast to clips", "long video to shorts",
    "AI captions", "auto-post TikTok Reels Shorts", "clip maker", "OpusClip alternative",
    "Klap alternative", "AI short-form video editor", "viral score", "repurpose video",
  ],
  applicationName: "ClipForge",
  alternates: { canonical: "https://clipforge.bulsulabs.xyz" },
  robots: { index: true, follow: true, "max-image-preview": "large" } as Metadata["robots"],
  openGraph: {
    title: "ClipForge — Turn long videos into viral clips",
    description:
      "One long video → a dozen captioned, viral-scored clips, auto-posted to TikTok, Reels and Shorts. Mobile-first AI clip studio.",
    url: "https://clipforge.bulsulabs.xyz",
    siteName: "ClipForge",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ClipForge — AI viral clip studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipForge — Turn long videos into viral clips",
    description: "AI finds your most viral moments, captions them, and posts to TikTok/Reels/Shorts. Mobile-first.",
    creator: "@bulsulabs",
  },
};

// SoftwareApplication structured data — earns rich results in search + helps
// the page describe itself to AI search engines. No fake ratings.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClipForge",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "iOS, Web",
  description:
    "AI viral clip studio: turn a long video or podcast into a dozen captioned, viral-scored short clips and auto-post them to TikTok, Reels and Shorts.",
  url: "https://clipforge.bulsulabs.xyz",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Plus (weekly)", price: "5.99", priceCurrency: "USD" },
    { "@type": "Offer", name: "Plus (monthly)", price: "14.99", priceCurrency: "USD" },
    { "@type": "Offer", name: "Plus (yearly)", price: "59.99", priceCurrency: "USD" },
  ],
  publisher: { "@type": "Organization", name: "Bulsu Labs", url: "https://bulsulabs.com" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* Captures UTM params + referrer at first landing and POSTs
            to /api/account/attribution once the user has a session.
            Renders nothing visible. */}
        <AttributionCapture />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
