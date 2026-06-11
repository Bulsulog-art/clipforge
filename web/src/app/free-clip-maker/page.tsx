import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, Scissors } from "lucide-react";

export const metadata: Metadata = {
  title: "Free AI Clip Maker — turn long videos into viral clips",
  description:
    "ClipForge is a free AI clip maker: paste a YouTube link or podcast and get a dozen captioned, viral-scored short clips auto-posted to TikTok, Reels and Shorts. A mobile-first OpusClip & Klap alternative.",
  keywords: [
    "free clip maker", "AI clip maker free", "free OpusClip alternative", "Klap alternative",
    "podcast to clips free", "long video to shorts", "AI video clipping free", "viral clip generator",
  ],
  alternates: { canonical: "https://clipforge.bulsulabs.xyz/free-clip-maker" },
  openGraph: {
    title: "Free AI Clip Maker — long videos into viral clips",
    description: "Paste a link, get a dozen captioned viral clips, auto-posted. Free to start.",
    url: "https://clipforge.bulsulabs.xyz/free-clip-maker",
    type: "website",
  },
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is ClipForge really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — you get a full clip set free on signup, no credit card. Paste a YouTube link up to 5 minutes and ClipForge cuts and captions it. Plus starts at $5.99/week if you want more.",
      },
    },
    {
      "@type": "Question",
      name: "How is ClipForge different from OpusClip or Klap?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ClipForge is mobile-first (a real iOS app, not just a web tool), lets you prompt exactly what to clip, gives every niche its own caption/thumbnail/music look automatically, and learns which of your clips perform to make the next ones better — at a lower price.",
      },
    },
    {
      "@type": "Question",
      name: "What can I turn into clips?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Any long video or podcast — paste a YouTube or TikTok URL, or upload an MP4/MOV. ClipForge finds the most viral moments, adds animated captions and hooks, and gets them ready to post.",
      },
    },
  ],
};

const POINTS = [
  "Paste a link — no editing software, no timeline",
  "AI scores every moment so you post the winners",
  "Animated word-by-word captions in 5 styles",
  "Each niche gets its own look automatically",
  "Auto-post to TikTok, Reels & Shorts",
  "Free to start — no credit card",
];

export default function FreeClipMakerPage() {
  return (
    <main className="min-h-screen gradient-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />

      <nav className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Scissors className="h-5 w-5 text-brand" aria-hidden="true" /> ClipForge
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-glow"
        >
          Start free
        </Link>
      </nav>

      <section className="container py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          The free AI clip maker that <span className="gradient-text">does the work for you.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Paste a YouTube link or upload a podcast. ClipForge finds your most viral moments, captions them, and gets a
          dozen short clips ready to post to TikTok, Reels and Shorts — free to start.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-medium text-white shadow-lg shadow-brand/30 transition hover:bg-brand-glow"
          >
            Make clips free <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">No credit card · 5-minute setup</p>
      </section>

      <section className="container max-w-2xl pb-16">
        <ul className="grid gap-3 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p} className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="container max-w-2xl pb-20">
        <h2 className="text-center text-2xl font-bold">A free OpusClip & Klap alternative</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          The paid clip tools are powerful — and priced for agencies. ClipForge gives creators the same long-video-to-
          viral-clips workflow, mobile-first, with prompt-driven clipping and niche-native looks, starting free. When
          you&apos;re ready, Plus is $5.99/week.
        </p>
        <div className="mt-8 text-center">
          <Link href="/signup" className="text-sm font-medium text-brand hover:underline">
            Start clipping free →
          </Link>
        </div>
      </section>
    </main>
  );
}
