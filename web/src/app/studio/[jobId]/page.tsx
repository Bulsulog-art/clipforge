import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import { ClipsGrid } from "@/components/clips-grid";
import { JobStatusBar } from "@/components/job-status-bar";

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{job.title ?? "Untitled project"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Niche: <span className="text-foreground">{job.niche ?? "—"}</span> ·{" "}
              Language: <span className="text-foreground">{job.language}</span>
            </p>
          </div>

          {clips && clips.length > 0 && (
            <Link
              href={`/studio/${jobId}/schedule`}
              className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-glow"
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
          <div className="mt-10 rounded-xl border border-red-500/30 bg-red-500/5 p-6">
            <p className="font-medium text-red-300">Render failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{job.error_message ?? "Unknown error"}</p>
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-border/50 bg-card/40 p-12 text-center">
            <p className="text-muted-foreground">Clips appear here as soon as the render finishes (~ 2–6 minutes).</p>
          </div>
        )}
      </main>
    </div>
  );
}
