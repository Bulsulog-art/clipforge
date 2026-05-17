import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://clipforge.bulsulabs.com"),
  title: { default: "ClipForge — AI viral clip studio", template: "%s · ClipForge" },
  description: "Drop a long video. Get 50+ viral short clips, captioned and ready for TikTok, Reels and Shorts in minutes.",
  openGraph: {
    title: "ClipForge — AI viral clip studio",
    description: "From one long video to 100+ viral clips, posted everywhere.",
    url: "https://clipforge.bulsulabs.com",
    siteName: "ClipForge",
    type: "website",
  },
  twitter: { card: "summary_large_image", creator: "@bulsulabs" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
