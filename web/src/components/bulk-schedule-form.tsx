"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Camera, Play, Loader2, CheckCircle2, AlertCircle, Send, Clock } from "lucide-react";

type Platform = "tiktok" | "instagram" | "youtube";

const PLATFORM_META: Record<Platform, { name: string; icon: React.ReactNode }> = {
  tiktok: { name: "TikTok", icon: <Music className="h-4 w-4" /> },
  instagram: { name: "Reels", icon: <Camera className="h-4 w-4" /> },
  youtube: { name: "Shorts", icon: <Play className="h-4 w-4" /> },
};

type Channel = { platform: Platform; handle: string | null; connected: boolean };
type ClipItem = { id: string; hook: string; thumbnailPath: string | null; viralScore: number | null };

const INTERVALS: { label: string; minutes: number }[] = [
  { label: "All at once", minutes: 0 },
  { label: "Every 30 min", minutes: 30 },
  { label: "Every 1 hour", minutes: 60 },
  { label: "Every 2 hours", minutes: 120 },
  { label: "Every 4 hours", minutes: 240 },
  { label: "Every day", minutes: 1440 },
];

function defaultStartLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BulkScheduleForm({
  clips,
  channels,
  tier,
  backHref,
}: {
  clips: ClipItem[];
  channels: Channel[];
  tier: string;
  backHref: string;
}) {
  const router = useRouter();
  const isPaid = tier !== "free";
  const anyConnected = channels.some((c) => c.connected);

  const [selectedClips, setSelectedClips] = useState<Set<string>>(() => new Set(clips.map((c) => c.id)));
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    () => new Set(channels.filter((c) => c.connected).map((c) => c.platform)),
  );
  const [mode, setMode] = useState<"now" | "schedule">("schedule");
  const [startLocal, setStartLocal] = useState<string>(defaultStartLocal);
  const [intervalMin, setIntervalMin] = useState<number>(120);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<{ msg: string; cta?: { href: string; label: string } } | null>(null);
  const [done, setDone] = useState(false);

  function toggleClip(id: string) {
    setSelectedClips((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function togglePlatform(p: Platform) {
    setSelectedPlatforms((prev) => {
      const n = new Set(prev);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
    setError(null);
  }

  async function submit() {
    setError(null);
    const clipIds = clips.filter((c) => selectedClips.has(c.id)).map((c) => c.id);
    const platforms = [...selectedPlatforms];
    if (clipIds.length === 0) return setError({ msg: "Select at least one clip." });
    if (platforms.length === 0) return setError({ msg: "Select at least one channel." });

    let baseMs = Date.now();
    if (mode === "schedule") {
      const t = new Date(startLocal).getTime();
      if (Number.isNaN(t) || t <= Date.now()) return setError({ msg: "Pick a start time in the future." });
      baseMs = t;
    }

    setSubmitting(true);
    setProgress({ done: 0, total: clipIds.length });
    try {
      for (let i = 0; i < clipIds.length; i++) {
        // "now" posts immediately; schedule drips by the chosen interval.
        const offsetMin = mode === "now" ? 0 : intervalMin * i;
        const scheduleFor =
          mode === "now" && intervalMin === 0
            ? undefined
            : new Date(baseMs + offsetMin * 60_000).toISOString();
        const res = await fetch(`/api/clips/${clipIds[i]}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platforms, scheduleFor }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (res.status === 402)
            return setError({ msg: data.error ?? "Auto-posting is a Plus feature.", cta: { href: "/dashboard/billing", label: "Upgrade" } });
          if (res.status === 412)
            return setError({ msg: data.error ?? "Connect your channels first.", cta: { href: "/dashboard/social", label: "Connect channels" } });
          return setError({ msg: `Clip ${i + 1}: ${data.error ?? "failed"}` });
        }
        setProgress({ done: i + 1, total: clipIds.length });
      }
      setDone(true);
      setTimeout(() => router.push(backHref), 1500);
    } catch {
      setError({ msg: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400" />
        <p className="text-lg font-medium text-green-200">
          {selectedClips.size} {selectedClips.size === 1 ? "clip" : "clips"} {mode === "now" ? "publishing" : "scheduled"}!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-7">
      {!isPaid && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3">
          <p className="text-sm">Auto-posting is a <strong>Plus</strong> feature.</p>
          <Link href="/dashboard/billing" className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-glow">
            Upgrade
          </Link>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Clips ({selectedClips.size}/{clips.length})</p>
          <button
            type="button"
            onClick={() => setSelectedClips((p) => (p.size === clips.length ? new Set() : new Set(clips.map((c) => c.id))))}
            className="text-xs text-brand hover:underline"
          >
            {selectedClips.size === clips.length ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {clips.map((c) => {
            const sel = selectedClips.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleClip(c.id)}
                title={c.hook}
                className={`relative aspect-[9/16] overflow-hidden rounded-lg border-2 transition ${
                  sel ? "border-brand" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                {c.thumbnailPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/storage/sign?path=${encodeURIComponent(c.thumbnailPath)}&bucket=clipforge-thumbnails`}
                    alt={c.hook}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                {sel && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Channels</p>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => {
            const meta = PLATFORM_META[c.platform];
            if (!c.connected)
              return (
                <Link
                  key={c.platform}
                  href="/dashboard/social"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                >
                  {meta.icon} Connect {meta.name}
                </Link>
              );
            const sel = selectedPlatforms.has(c.platform);
            return (
              <button
                key={c.platform}
                type="button"
                onClick={() => togglePlatform(c.platform)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  sel ? "border-brand bg-brand/10 text-brand" : "border-border/50 hover:bg-accent/50"
                }`}
              >
                {meta.icon} {meta.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Timing</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("now")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
              mode === "now" ? "border-brand bg-brand/10 text-brand" : "border-border/50 hover:bg-accent/50"
            }`}
          >
            <Send className="h-4 w-4" /> Post now
          </button>
          <button
            type="button"
            onClick={() => setMode("schedule")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
              mode === "schedule" ? "border-brand bg-brand/10 text-brand" : "border-border/50 hover:bg-accent/50"
            }`}
          >
            <Clock className="h-4 w-4" /> Schedule
          </button>
        </div>
        {mode === "schedule" && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <select
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value))}
              className="w-full rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              {INTERVALS.filter((iv) => iv.minutes > 0).map((iv) => (
                <option key={iv.minutes} value={iv.minutes}>
                  {iv.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === "schedule" && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Clips drip out from your start time, spaced by the interval.
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error.msg}
          </span>
          {error.cta && (
            <Link href={error.cta.href} className="shrink-0 font-medium text-red-100 underline">
              {error.cta.label}
            </Link>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !isPaid || !anyConnected}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress ? `Publishing ${progress.done}/${progress.total}…` : "Working…"}
          </>
        ) : mode === "now" ? (
          <>
            <Send className="h-4 w-4" /> Publish {selectedClips.size} now
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" /> Schedule {selectedClips.size} clips
          </>
        )}
      </button>
      {!anyConnected && (
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/dashboard/social" className="text-brand hover:underline">
            Connect a channel
          </Link>{" "}
          to start posting.
        </p>
      )}
    </div>
  );
}
