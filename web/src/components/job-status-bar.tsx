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
    const ch = supabase
      .channel(`job-${current.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "video_jobs", filter: `id=eq.${current.id}` },
        (payload) => {
          setCurrent(payload.new as VideoJob);
          if ((payload.new as VideoJob).status === "ready") router.refresh();
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [current.id, current.status, supabase, router]);

  if (current.status === "ready") return null;

  return (
    <div className="mt-6 rounded-xl border border-border/50 bg-card/40 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{LABELS[current.status] ?? current.status}</span>
        <span className="text-muted-foreground">{current.progress}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-brand transition-all duration-500"
          style={{ width: `${Math.max(5, current.progress)}%` }}
        />
      </div>
    </div>
  );
}
