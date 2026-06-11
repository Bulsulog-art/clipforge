import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Film, Sparkles, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: jobs }, { data: clips }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("video_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("clips").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
  ]);

  const totalClips = clips?.length ?? 0;
  const readyClips = clips?.filter((c) => c.status === "ready" || c.status === "published").length ?? 0;
  const tier = profile?.tier ?? "free";

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav profile={profile ?? null} />

      <main className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tier === "free"
                ? "Free plan · upgrade to Pro for auto-posting and unlimited clips"
                : `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan`}
            </p>
          </div>
          <Link
            href="/studio/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Videos this month" value={`${jobs?.length ?? 0}`} icon={<Film />} />
          <Stat label="Clips generated" value={totalClips.toString()} icon={<Sparkles />} />
          <Stat label="Ready / published" value={readyClips.toString()} icon={<BarChart3 />} />
        </div>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Recent projects</h2>
        {jobs && jobs.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-border transition hover:bg-accent">
                    <td className="px-4 py-3 font-medium text-foreground">{j.title ?? "Untitled"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{j.source_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {j.duration_seconds ? formatDuration(j.duration_seconds) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={j.status} progress={j.progress} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/studio/${j.id}`} className="text-sm font-medium text-brand transition hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="text-brand">{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  const map: Record<string, string> = {
    queued: "bg-muted text-muted-foreground",
    transcribing: "bg-blue-500/15 text-blue-700",
    scoring: "bg-purple-500/15 text-purple-700",
    rendering: "bg-amber-500/15 text-amber-700",
    ready: "bg-green-500/15 text-green-700",
    failed: "bg-red-500/15 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? "bg-muted"}`}>
      {status}
      {progress > 0 && progress < 100 && status !== "ready" && status !== "failed" && (
        <span className="text-[10px] opacity-70">{progress}%</span>
      )}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
      <Film className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 font-semibold text-foreground">No projects yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">Drop a YouTube link or upload a video to get started.</p>
      <Link
        href="/studio/new"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <Plus className="h-4 w-4" /> New project
      </Link>
    </div>
  );
}
