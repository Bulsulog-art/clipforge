"use client";

import Link from "next/link";
import { Play, Download, Send, Sparkles } from "lucide-react";
import type { Clip } from "@/lib/supabase/types";
import { formatDuration } from "@/lib/utils";

export function ClipsGrid({ clips }: { clips: Clip[] }) {
  return (
    <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clips.map((c) => (
        <article key={c.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
          <div className="relative aspect-[9/16] bg-muted">
            {c.thumbnail_path && (
              <img
                src={`/api/storage/sign?path=${encodeURIComponent(c.thumbnail_path)}&bucket=clipforge-thumbnails`}
                alt={c.hook ?? "Clip thumbnail"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
            <Link
              href={`/api/storage/sign?path=${encodeURIComponent(c.storage_path ?? "")}&bucket=clipforge-videos-rendered`}
              target="_blank"
              aria-label={`Play clip${c.hook ? `: ${c.hook}` : ""}`}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30 focus-visible:bg-black/30 focus-visible:outline-none"
            >
              <Play className="h-10 w-10 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
            </Link>

            {c.viral_score !== null && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white backdrop-blur">
                <Sparkles className="h-3 w-3 text-brand" />
                {Math.round((c.viral_score ?? 0) * 10) / 10}
              </span>
            )}
            <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white backdrop-blur">
              {c.duration_seconds ? formatDuration(c.duration_seconds) : "—"}
            </span>
          </div>

          <div className="p-3">
            <p className="line-clamp-2 text-sm font-medium text-foreground">{c.hook ?? "—"}</p>
            {c.caption && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.caption}</p>}

            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/api/storage/sign?path=${encodeURIComponent(c.storage_path ?? "")}&bucket=clipforge-videos-rendered&download=1`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-1.5 text-xs font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <Download className="h-3.5 w-3.5" /> Save
              </Link>
              <Link
                href={`/studio/clips/${c.id}/publish`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-1.5 text-xs font-medium text-white transition hover:bg-brand-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <Send className="h-3.5 w-3.5" /> Post
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
