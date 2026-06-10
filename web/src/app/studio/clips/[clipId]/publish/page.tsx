import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PublishForm } from "@/components/publish-form";

export const dynamic = "force-dynamic";

type Platform = "tiktok" | "instagram" | "youtube";

export default async function PublishClipPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const { clipId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: clip }, { data: profile }, { data: accounts }] = await Promise.all([
    supabase
      .from("clips")
      .select("id, job_id, hook, caption, thumbnail_path, status")
      .eq("id", clipId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("tier").eq("id", user.id).single(),
    supabase.from("social_accounts").select("platform, username, display_name").eq("user_id", user.id),
  ]);

  if (!clip) {
    return (
      <div className="container max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">Clip not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This clip doesn’t exist or isn’t yours.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-brand hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const connected = new Set<string>((accounts ?? []).map((a) => a.platform as string));
  const channels: { platform: Platform; handle: string | null; connected: boolean }[] = (
    ["tiktok", "instagram", "youtube"] as Platform[]
  ).map((p) => {
    const acc = (accounts ?? []).find((a) => a.platform === p);
    return { platform: p, handle: acc ? (acc.username ?? acc.display_name) : null, connected: connected.has(p) };
  });

  const backHref = clip.job_id ? `/studio/${clip.job_id}` : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-xl py-10">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="mt-4 text-3xl font-semibold">Publish clip</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Post this clip to your connected channels — now or on a schedule.
        </p>

        <div className="mt-6 flex gap-4 rounded-xl border border-border/50 bg-card/40 p-4">
          <div className="relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {clip.thumbnail_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/storage/sign?path=${encodeURIComponent(clip.thumbnail_path)}&bucket=clipforge-thumbnails`}
                alt={clip.hook ?? ""}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-medium">{clip.hook ?? "Untitled clip"}</p>
            {clip.caption && (
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{clip.caption}</p>
            )}
          </div>
        </div>

        <PublishForm
          clipId={clip.id}
          channels={channels}
          isReady={clip.status === "ready"}
          tier={profile?.tier ?? "free"}
          backHref={backHref}
        />
      </main>
    </div>
  );
}
