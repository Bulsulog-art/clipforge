import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import { BulkScheduleForm } from "@/components/bulk-schedule-form";

export const dynamic = "force-dynamic";

type Platform = "tiktok" | "instagram" | "youtube";

export default async function ScheduleJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: job }, { data: clips }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("video_jobs").select("id, title").eq("id", jobId).eq("user_id", user.id).single(),
    supabase
      .from("clips")
      .select("id, hook, thumbnail_path, viral_score")
      .eq("job_id", jobId)
      .eq("status", "ready")
      .order("viral_score", { ascending: false }),
    supabase.from("social_accounts").select("platform, username, display_name").eq("user_id", user.id),
  ]);

  if (!job) notFound();

  const connected = new Set<string>((accounts ?? []).map((a) => a.platform as string));
  const channels: { platform: Platform; handle: string | null; connected: boolean }[] = (
    ["tiktok", "instagram", "youtube"] as Platform[]
  ).map((p) => {
    const acc = (accounts ?? []).find((a) => a.platform === p);
    return { platform: p, handle: acc ? (acc.username ?? acc.display_name) : null, connected: connected.has(p) };
  });

  const clipList = (clips ?? []).map((c) => ({
    id: c.id as string,
    hook: (c.hook as string | null) ?? "Untitled clip",
    thumbnailPath: (c.thumbnail_path as string | null) ?? null,
    viralScore: (c.viral_score as number | null) ?? null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav profile={profile ?? null} />
      <main className="container max-w-2xl py-10">
        <Link
          href={`/studio/${jobId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to project
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-foreground">Schedule clips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick clips and channels, then post them now or drip them out on a schedule.
        </p>

        {clipList.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Film className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              No finished clips yet. They’ll appear here once the render completes.
            </p>
            <Link
              href={`/studio/${jobId}`}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <ArrowLeft className="h-4 w-4" /> Back to project
            </Link>
          </div>
        ) : (
          <BulkScheduleForm
            clips={clipList}
            channels={channels}
            tier={profile?.tier ?? "free"}
            backHref={`/studio/${jobId}`}
          />
        )}
      </main>
    </div>
  );
}
