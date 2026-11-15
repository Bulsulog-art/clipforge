import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AttributionCapture } from "@/components/AttributionCapture";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { CHUNK_RELOAD_SCRIPT } from "@/lib/chunk-reload";
import { PRICE_BOOT_SCRIPT } from "@/lib/dentvid/price-boot";
import { HtmlRoot } from "@/components/html-root";
import { GUIDES } from "@/content/dentvideo";
import { SOLUTIONS } from "@/content/solutions";

// <html lang dir> is server-rendered from the page's path (components/html-root, lib/dentvid/html-lang):
// DentVideo's /de pages say lang="de", the Arabic ones lang="ar" dir="rtl", ClipForge stays "en".
// This layout is shared by both apps and must never read headers() or cookies(): that would render
// every prerendered page per request and lose the CDN caching (lib/dentvid/cache-policy). The path is
// known while a page is prerendered, so it decides. After the first render DentVideo's header keeps
// <html> in step on client-side navigation (it also knows a signed-in clinic's language).
// PAGE_LOCALES: DentVideo's guides and commercial pages not written in English (slug → language).
const PAGE_LOCALES: Record<string, string> = Object.fromEntries(
  [...GUIDES, ...SOLUTIONS].filter((p) => p.locale !== "en").map((p) => [p.slug, p.locale]),
);

// Not preloaded: this layout is shared with DentVideo, whose pages use their own faces (app/dentvideo/layout)
// and would otherwise fetch Inter first, ahead of the fonts they actually paint with. ClipForge's
// stylesheet still names Inter, so its pages load it as soon as the CSS arrives.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap", preload: false });

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
    <HtmlRoot pageLocales={PAGE_LOCALES}>
      <head>
        {/* Reloads once when this page's chunks are gone after a deploy (lib/chunk-reload). Before Next's scripts. */}
        <script id="chunk-reload" dangerouslySetInnerHTML={{ __html: CHUNK_RELOAD_SCRIPT }} />
        {/* DentVideo's prices: the likely currency on <html> before the first paint (lib/dentvid/price-boot). */}
        <script id="dv-price-boot" dangerouslySetInnerHTML={{ __html: PRICE_BOOT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {/* Captures UTM params + referrer at first landing and POSTs
            to /api/account/attribution once the user has a session.
            Renders nothing visible. */}
        <AttributionCapture />
        {children}
        {/* ClipForge's toasts; nothing (and no sonner download) on DentVideo pages. */}
        <AppToaster />
      </body>
    </HtmlRoot>
  );
}
