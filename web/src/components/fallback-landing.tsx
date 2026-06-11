import Link from "next/link";
import { Scissors, Sparkles, Apple } from "lucide-react";

/**
 * Web fallback for the Universal Links
 *   https://clipforge.bulsulabs.xyz/clips/<id>  and  /jobs/<id>
 * When the iOS app is installed Apple deep-links straight in and this never
 * renders; otherwise the visitor lands here, so it's a marketing surface, not a
 * (RLS-locked) clip preview. Shared by both route pages — kept in its own module
 * because Next.js page files may only export `default` + page config fields.
 */
export function FallbackLanding({
  kind,
  id,
}: {
  kind: "clip" | "job";
  id: string;
}) {
  const headline =
    kind === "clip" ? "Open this clip in ClipForge" : "Open this render in ClipForge";
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
