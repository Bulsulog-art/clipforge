import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, AlertTriangle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import { ClipsGrid } from "@/components/clips-grid";
import { JobStatusBar } from "@/components/job-status-bar";
import { JobRetryButton } from "@/components/job-retry-button";

export default async function StudioJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: job }, { data: clips }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("video_jobs").select("*").eq("id", jobId).eq("user_id", user.id).single(),
    supabase.from("clips").select("*").eq("job_id", jobId).order("viral_score", { ascending: false }),
  ]);

  if (!job) notFound();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav profile={profile ?? null} />

      <main className="container py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to studio
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{job.title ?? "Untitled project"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Niche: <span className="text-foreground">{job.niche ?? "—"}</span> ·{" "}
              Language: <span className="text-foreground">{job.language}</span>
            </p>
          </div>

          {clips && clips.length > 0 && (
            <Link
              href={`/studio/${jobId}/schedule`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white outline-none transition hover:bg-brand-glow focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Send className="h-4 w-4" /> Schedule clips
            </Link>
          )}
        </div>

        <JobStatusBar job={job} />

        {clips && clips.length > 0 ? (
          <>
            <h2 className="mt-10 text-lg font-semibold">{clips.length} clips · sorted by viral score</h2>
            <ClipsGrid clips={clips} />
          </>
        ) : job.status === "failed" ? (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
              <p className="font-medium text-red-600">Render failed</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{job.error_message ?? "Unknown error"}</p>
            <JobRetryButton jobId={jobId} />
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-6 w-6 text-brand" aria-hidden="true" />
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">Finding your best moments</p>
            <p className="mt-1 text-sm text-muted-foreground">Clips appear here as soon as the render finishes (~ 2–6 minutes).</p>
          </div>
        )}
      </main>
    </div>
  );
}
