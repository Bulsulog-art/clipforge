"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Camera, Play, Plug, Loader2, CheckCircle2, AlertCircle, Send, Clock } from "lucide-react";

type Platform = "tiktok" | "instagram" | "youtube";

const PLATFORM_META: Record<Platform, { name: string; icon: React.ReactNode }> = {
  tiktok: { name: "TikTok", icon: <Music className="h-5 w-5" /> },
  instagram: { name: "Instagram Reels", icon: <Camera className="h-5 w-5" /> },
  youtube: { name: "YouTube Shorts", icon: <Play className="h-5 w-5" /> },
};

type Channel = { platform: Platform; handle: string | null; connected: boolean };

// Default the schedule picker to a round, near-future time so the input is
// never pre-filled with a past value the server would reject.
function defaultScheduleLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000); // +1h
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublishForm({
  clipId,
  channels,
  isReady,
  tier,
  backHref,
}: {
  clipId: string;
  channels: Channel[];
  isReady: boolean;
  tier: string;
  backHref: string;
}) {
  const router = useRouter();
  const isPaid = tier !== "free";
  const [selected, setSelected] = useState<Set<Platform>>(
    () => new Set(channels.filter((c) => c.connected).map((c) => c.platform)),
  );
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleLocal, setScheduleLocal] = useState<string>(defaultScheduleLocal);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ msg: string; cta?: { href: string; label: string } } | null>(null);
  const [done, setDone] = useState<null | { scheduled: boolean }>(null);

  const anyConnected = channels.some((c) => c.connected);

  function toggle(p: Platform) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
    setError(null);
  }

  async function submit() {
    setError(null);
    if (selected.size === 0) {
      setError({ msg: "Pick at least one channel to post to." });
      return;
    }
    let scheduleFor: string | undefined;
    if (mode === "schedule") {
      const t = new Date(scheduleLocal).getTime();
      if (Number.isNaN(t)) {
        setError({ msg: "Choose a valid date and time." });
        return;
      }
      if (t <= Date.now()) {
        setError({ msg: "Pick a time in the future." });
        return;
      }
      scheduleFor = new Date(t).toISOString();
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/clips/${clipId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: [...selected], scheduleFor }),
      });
      if (res.ok) {
        setDone({ scheduled: mode === "schedule" });
        setTimeout(() => router.push(backHref), 1400);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 402) {
        setError({
          msg: data.error ?? "Auto-posting is a Plus feature.",
          cta: { href: "/dashboard/billing", label: "Upgrade to Plus" },
        });
      } else if (res.status === 412) {
        setError({
          msg: data.error ?? "Connect your channels first.",
          cta: { href: "/dashboard/social", label: "Connect channels" },
        });
      } else {
        setError({ msg: data.error ?? "Something went wrong. Please try again." });
      }
    } catch {
      setError({ msg: "Network error — check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400" />
        <p className="text-lg font-medium text-green-200">
          {done.scheduled ? "Scheduled!" : "Publishing started!"}
        </p>
        <p className="text-sm text-green-300/80">
          {done.scheduled
            ? "Your clip will post at the time you picked."
            : "Your clip is on its way to your channels."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {!isReady && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle className="h-4 w-4" /> This clip isn’t finished rendering yet — you can publish once it’s ready.
        </div>
      )}

      {!isPaid && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3">
          <p className="text-sm text-brand-foreground">
            Auto-posting to your channels is a <strong>Plus</strong> feature.
          </p>
          <Link
            href="/dashboard/billing"
            className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-glow"
          >
            Upgrade
          </Link>
        </div>
      )}

      <p className="mb-2 text-sm font-medium">Choose channels</p>
      <div className="space-y-2.5">
        {channels.map((c) => {
          const meta = PLATFORM_META[c.platform];
          const isSel = selected.has(c.platform);
          if (!c.connected) {
            return (
              <div
                key={c.platform}
                className="flex items-center justify-between rounded-xl border border-border/40 bg-card/20 p-3.5 opacity-70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {meta.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{meta.name}</div>
                    <div className="text-xs text-muted-foreground">Not connected</div>
                  </div>
                </div>
                <Link
                  href="/dashboard/social"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Plug className="h-3.5 w-3.5" /> Connect
                </Link>
              </div>
            );
          }
          return (
            <button
              key={c.platform}
              type="button"
              onClick={() => toggle(c.platform)}
              aria-pressed={isSel}
              className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${
                isSel ? "border-brand bg-brand/10" : "border-border/50 bg-card/40 hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  {meta.icon}
                </div>
                <div>
                  <div className="text-sm font-medium">{meta.name}</div>
                  <div className="text-xs text-muted-foreground">{c.handle ? `@${c.handle}` : "Connected"}</div>
                </div>
              </div>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                  isSel ? "border-brand bg-brand text-white" : "border-border"
                }`}
              >
                {isSel && <CheckCircle2 className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-6 text-sm font-medium">When</p>
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
        <input
          type="datetime-local"
          value={scheduleLocal}
          onChange={(e) => setScheduleLocal(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      )}

      {error && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
        disabled={submitting || !isReady || !isPaid || !anyConnected}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {mode === "schedule" ? "Scheduling…" : "Publishing…"}
          </>
        ) : (
          <>
            {mode === "schedule" ? <Clock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {mode === "schedule" ? "Schedule post" : "Post now"}
          </>
        )}
      </button>
      {!anyConnected && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No channels connected yet.{" "}
          <Link href="/dashboard/social" className="text-brand hover:underline">
            Connect a channel
          </Link>{" "}
          to start posting.
        </p>
      )}
    </div>
  );
}
