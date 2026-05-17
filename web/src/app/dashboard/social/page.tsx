import Link from "next/link";
import { redirect } from "next/navigation";
import { Music, Camera, Play, Bolt, Plug, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";

type Platform = "tiktok" | "instagram" | "youtube" | "x";

const PLATFORMS: { id: Platform; name: string; icon: React.ReactNode; available: boolean }[] = [
  { id: "tiktok", name: "TikTok", icon: <Music className="h-5 w-5" />, available: true },
  { id: "instagram", name: "Instagram Reels", icon: <Camera className="h-5 w-5" />, available: true },
  { id: "youtube", name: "YouTube Shorts", icon: <Play className="h-5 w-5" />, available: true },
  { id: "x", name: "X (Twitter)", icon: <Bolt className="h-5 w-5" />, available: false },
];

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("social_accounts").select("*").eq("user_id", user.id),
  ]);

  const byPlatform = new Map<string, { username: string | null; display_name: string | null }>();
  for (const a of accounts ?? []) {
    byPlatform.set(a.platform as string, { username: a.username, display_name: a.display_name });
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav profile={profile ?? null} />

      <main className="container max-w-3xl py-10">
        <h1 className="text-3xl font-semibold">Channels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your accounts so ClipForge can publish clips on your behalf.
        </p>

        {sp.connected && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            <CheckCircle2 className="h-4 w-4" /> Connected {sp.connected} successfully.
          </div>
        )}
        {sp.error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Connection failed: {sp.error}. Try again.
          </div>
        )}

        <div className="mt-8 space-y-3">
          {PLATFORMS.map((p) => {
            const acc = byPlatform.get(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    {p.icon}
                  </div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {acc
                        ? `@${acc.username ?? acc.display_name}`
                        : p.available ? "Not connected" : "Coming soon"}
                    </div>
                  </div>
                </div>
                {p.available ? (
                  acc ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <Link
                      href={`/api/auth/${p.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-glow"
                    >
                      <Plug className="h-3.5 w-3.5" /> Connect
                    </Link>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">soon</span>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
