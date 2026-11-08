import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AttributionCapture } from "@/components/AttributionCapture";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ClipForge — Turn one long video into ten captioned vertical clips",
    template: "%s · ClipForge",
  },
  description:
    "ClipForge turns one long video or podcast into up to ten vertical short clips: it picks the strongest moments, burns in word-by-word captions, writes a hook for each and generates a thumbnail. Download and post in a minute. Mobile-first.",
  keywords: [
    "AI video clipping", "viral clips", "podcast to clips", "long video to shorts",
    "AI captions", "vertical clips for TikTok Reels Shorts", "clip maker", "OpusClip alternative",
    "Klap alternative", "AI short-form video editor", "viral score", "repurpose video",
  ],
  applicationName: "ClipForge",
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true, "max-image-preview": "large" } as Metadata["robots"],
  openGraph: {
    title: "ClipForge — Turn long videos into viral clips",
    description:
      "One long video → up to ten captioned, ranked vertical clips, ready to download and post. Mobile-first AI clip studio.",
    url: SITE_URL,
    siteName: "ClipForge",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ClipForge — AI viral clip studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipForge — Turn long videos into viral clips",
    description: "AI finds your most viral moments, captions them and frames the speaker in 9:16. Ready for TikTok, Reels and Shorts.",
    creator: "@bulsulabs",
  },
};

// ClipForge's SoftwareApplication JSON-LD lives in
// components/clipforge-jsonld.tsx and is rendered by ClipForge pages only.

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
