import Link from "next/link";
import type { Metadata } from "next";
import { Scissors, Sparkles, Apple } from "lucide-react";

/**
 * Web fallback for the Universal Link  `https://clipforge.bulsulabs.xyz/clips/<id>`.
 *
 * When the iOS app is installed, Apple routes the user straight there
 * via the AASA file and this page never renders. When it isn't, we
 * land here — so the surface needs to be a useful marketing landing,
 * not a clip preview (clip media is RLS-locked anyway).
 *
 * We intentionally don't expose the clip id beyond what the URL
 * already shows: there's no privacy gain from hiding it, and surfacing
 * "this is a real clip that exists" gives the visitor confidence the
 * app actually does what we promise.
 */
export const dynamic = "force-static";

export function generateMetadata({
  params,
}: {
  params: Promise<{ clipId: string }>;
}): Metadata {
  // We don't fetch the clip server-side — it's RLS-locked behind the
  // owner's session, and the visitor here is almost certainly NOT the
  // owner (otherwise the app would have caught the link). Use generic
  // copy that still feels personal.
  return {
    title: "View this ClipForge clip",
    description:
      "Open this clip in the ClipForge app — the AI viral clip studio for creators.",
    openGraph: {
      title: "ClipForge — AI viral clip studio",
      description: "Drop a long video. Get 100+ viral clips, captioned and ready.",
    },
  };
}

export default async function ClipFallbackPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const { clipId } = await params;
  return <FallbackLanding kind="clip" id={clipId} />;
}

// MARK: - Shared fallback UI (also used by /jobs/[jobId]/page.tsx)

export function FallbackLanding({
  kind,
  id,
}: {
  kind: "clip" | "job";
  id: string;
}) {
  const headline =
    kind === "clip"
      ? "Open this clip in ClipForge"
      : "Open this render in ClipForge";
  const subline =
    kind === "clip"
      ? "The clip you're trying to view lives in the ClipForge iOS app. Install ClipForge and tap the link again to open it instantly."
      : "The render you're trying to view lives in the ClipForge iOS app. Install ClipForge and tap the link again to open it instantly.";

  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center space-y-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          ClipForge · AI viral clip studio
        </div>

        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <Scissors className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{headline}</h1>
          <p className="text-muted-foreground">{subline}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://apps.apple.com/app/clipforge/id0"
            aria-label="Get ClipForge on the App Store"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-glow focus-visible:ring-2 focus-visible:ring-brand/40 outline-none"
          >
            <Apple className="h-4 w-4" />
            Get ClipForge on the App Store
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40 outline-none"
          >
            Learn more about ClipForge
          </Link>
        </div>

        <p className="text-xs text-muted-foreground break-all">
          Direct link reference · {kind}/{id}
        </p>
      </div>
    </main>
  );
}
