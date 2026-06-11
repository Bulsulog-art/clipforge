"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, Heart, MessageCircle, Share2, TrendingUp, ExternalLink } from "lucide-react";

type Totals = { views: number; likes: number; comments: number; shares: number; posts: number; engagementRate: number };
type PlatformAgg = { platform: string; views: number; likes: number; comments: number; shares: number; posts: number };
type TopPost = {
  publishId: string;
  platform: string;
  url: string | null;
  hook: string | null;
  viralScore: number | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
};
type Analytics = { totals: Totals; byPlatform: PlatformAgg[]; topPosts: TopPost[]; updatedAt: string | null };

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Failed to load");
        return r.json();
      })
      .then((d: Analytics) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const t = data?.totals;
  const cards = [
    { label: "Views", value: t?.views ?? 0, icon: <Eye className="h-4 w-4" /> },
    { label: "Likes", value: t?.likes ?? 0, icon: <Heart className="h-4 w-4" /> },
    { label: "Comments", value: t?.comments ?? 0, icon: <MessageCircle className="h-4 w-4" /> },
    { label: "Shares", value: t?.shares ?? 0, icon: <Share2 className="h-4 w-4" /> },
  ];

  return (
    <main className="container max-w-5xl py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <BarChart3 className="h-7 w-7 text-brand" /> Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real performance across your posted clips — refreshed every few hours.
          </p>
        </div>
        {data?.updatedAt ? (
          <span className="text-xs text-muted-foreground">
            Updated {new Date(data.updatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">{error}</div>
      ) : !data || data.totals.posts === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">No analytics yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Connect your TikTok, Instagram and YouTube channels and post some clips. Real views, likes and shares land
            here automatically once they start performing.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Totals */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {c.icon}
                  <span className="text-sm">{c.label}</span>
                </div>
                <div className="mt-2 text-3xl font-bold">{fmt(c.value)}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div>
              <div className="text-sm text-muted-foreground">Posts tracked</div>
              <div className="mt-1 text-2xl font-bold">{data.totals.posts}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Engagement rate
              </div>
              <div className="mt-1 text-2xl font-bold">{(data.totals.engagementRate * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Per platform */}
          {data.byPlatform.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">By platform</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Platform</th>
                      <th className="px-5 py-3 text-right font-medium">Posts</th>
                      <th className="px-5 py-3 text-right font-medium">Views</th>
                      <th className="px-5 py-3 text-right font-medium">Likes</th>
                      <th className="px-5 py-3 text-right font-medium">Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byPlatform.map((p) => (
                      <tr key={p.platform} className="border-b border-border/50 last:border-0">
                        <td className="px-5 py-3 font-medium">{PLATFORM_LABEL[p.platform] ?? p.platform}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{p.posts}</td>
                        <td className="px-5 py-3 text-right font-semibold">{fmt(p.views)}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{fmt(p.likes)}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{fmt(p.shares)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Top performers */}
          {data.topPosts.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Top performers</h2>
              <div className="space-y-3">
                {data.topPosts.map((p, i) => (
                  <div key={p.publishId} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="w-6 text-center text-lg font-bold text-muted-foreground/60">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.hook ?? "Untitled clip"}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {PLATFORM_LABEL[p.platform] ?? p.platform}
                        {p.viralScore != null ? ` · viral score ${p.viralScore}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmt(p.views)} views</div>
                      <div className="text-xs text-muted-foreground">{fmt(p.likes)} likes · {fmt(p.shares)} shares</div>
                    </div>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
