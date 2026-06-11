"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { VideoJob } from "@/lib/supabase/types";

const LABELS: Record<string, string> = {
  queued: "Queued · waiting for worker",
  transcribing: "Transcribing audio with Whisper",
  scoring: "Scoring viral moments",
  rendering: "Rendering clips",
  ready: "Ready",
  failed: "Failed",
};

export function JobStatusBar({ job }: { job: VideoJob }) {
  const supabase = createClient();
  const router = useRouter();
  const [current, setCurrent] = useState(job);

  useEffect(() => {
    if (current.status === "ready" || current.status === "failed") return;

    // Realtime (best-effort). NOTE: the schema must match where the table
    // actually lives — these tables are in the `clipforge` schema, not
    // `public`, so the previous "public" filter never delivered events and
    // the bar appeared frozen. Even with the right schema, realtime only
    // fires if the table is in the `supabase_realtime` publication, so we
    // ALSO poll below as a guaranteed fallback.
    const onUpdate = (next: VideoJob) => {
      setCurrent(next);
      // Refresh the server component on ANY terminal state so the clips grid
      // (ready) or the error panel + retry button (failed) actually render.
      if (next.status === "ready" || next.status === "failed") router.refresh();
    };

    const ch = supabase
      .channel(`job-${current.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "clipforge", table: "video_jobs", filter: `id=eq.${current.id}` },
        (payload) => onUpdate(payload.new as VideoJob),
      )
      .subscribe();

    // Poll fallback: re-fetch the job row every 4s until it reaches a terminal
    // state. Guarantees the UI advances even when realtime isn't wired.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("video_jobs")
        .select("*")
        .eq("id", current.id)
        .single();
      if (data) onUpdate(data as VideoJob);
    }, 4000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(ch);
    };
  }, [current.id, current.status, supabase, router]);

  if (current.status === "ready") return null;

  const isFailed = current.status === "failed";

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          {!isFailed && (
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
          )}
          {LABELS[current.status] ?? current.status}
        </span>
        <span className="text-muted-foreground">{current.progress}%</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={current.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={LABELS[current.status] ?? current.status}
      >
        <div
          className={`h-full transition-all duration-500 ${isFailed ? "bg-red-500" : "bg-brand"}`}
          style={{ width: `${Math.max(5, current.progress)}%` }}
        />
      </div>
    </div>
  );
}
