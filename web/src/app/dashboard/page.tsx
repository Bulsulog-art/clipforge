import Link from "next/link";
import { redirect } from "next/navigation";
import { Film, Sparkles, BarChart3, Wand2, Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import { DashboardNav } from "@/components/dashboard-nav";
import { ShowcaseStrip } from "@/components/generate/showcase-strip";

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
                ? "Free plan · upgrade to Plus for unlimited clips and no watermark"
                : `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan`}
            </p>
          </div>
          {/* Two doors, named by what they do. The old single "New project"
              button hid the fact that the app does two different things. */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/studio/create"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Make a video
            </Link>
            <Link
              href="/studio/new"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Scissors className="h-4 w-4" aria-hidden="true" />
              Clip a long video
            </Link>
          </div>
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
                    <td className="px-4 py-3 text-muted-foreground">{SOURCE_LABELS[j.source_type] ?? j.source_type}</td>
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

/** The raw column values are database words. These are the ones people use. */
const SOURCE_LABELS: Record<string, string> = {
  generate: "From a prompt",
  upload: "Uploaded file",
  youtube: "YouTube link",
  tiktok_url: "TikTok link",
};

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
    planning: "bg-blue-500/15 text-blue-700",
    gathering: "bg-purple-500/15 text-purple-700",
    transcribing: "bg-blue-500/15 text-blue-700",
    scoring: "bg-purple-500/15 text-purple-700",
    rendering: "bg-amber-500/15 text-amber-700",
    uploading: "bg-amber-500/15 text-amber-700",
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

/**
 * The first thing a new account sees, so it has one job: say what this app is
 * for. It does two things, and naming both plainly beats one clever headline
 * that covers neither.
 */
function EmptyState() {
  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Door
        href="/studio/create"
        icon={<Wand2 className="h-5 w-5" aria-hidden="true" />}
        title="Make a video from a sentence"
        body="Describe what it should say. We write the shots, pull the footage, animate the type and hand you an mp4. Add your own clips if you have them."
        cta="Describe your first video"
        primary
      />
      <Door
        href="/studio/new"
        icon={<Scissors className="h-5 w-5" aria-hidden="true" />}
        title="Cut a long video into clips"
        body="Paste a YouTube or TikTok link, or upload a file. We find the moments worth posting, caption them and get them ready to publish."
        cta="Paste a link"
      />
      </div>

      {/* Nothing explains the first door like watching it. */}
      <div className="mt-14">
        <ShowcaseStrip
          heading="This is what a sentence turns into"
          sub="Three real renders. Each one started as a single line of text."
        />
      </div>
    </>
  );
}

function Door({
  href,
  icon,
  title,
  body,
  cta,
  primary = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm outline-none transition hover:border-brand/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          primary ? "bg-brand text-white" : "bg-muted text-brand"
        }`}
      >
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <span className="mt-4 text-sm font-semibold text-brand transition group-hover:underline">{cta} →</span>
    </Link>
  );
}
