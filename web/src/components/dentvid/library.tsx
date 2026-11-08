"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CheckCheck, Download, Loader2, Play, RotateCcw, Share2, Sparkles, X } from "lucide-react";
import { BackgroundPicker } from "./background-picker";
import { trackDv } from "@/lib/dentvid/events-client";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt, type AppText } from "@/content/dentvideo-app";
import {
  approvableIds,
  cardState,
  groupByWeek,
  nextAction,
  videoFileName,
  weekLabelDate,
  weekSummary,
  delayNote,
  weeksAgo,
  type CardState,
} from "@/lib/dentvid/app-ui";

export type LibraryItem = {
  id: string;
  kind: "generated" | "recording";
  status: "queued" | "working" | "ready" | "flagged" | "rejected" | "failed";
  approval: "pending" | "approved" | "rejected";
  title: string;
  week_of: string;
  caption?: string;
  hashtags?: string[];
  findings: string[];
  videoUrl?: string;
  thumbUrl?: string;
  /** Background photos (generated videos only): library ids offered, those in use, and a pending re-render. */
  photos?: { suggested: string[]; chosen: string[]; status?: "queued" | "failed" };
};

const CHIP: Record<Exclude<CardState, "notMade">, string> = {
  look: "bg-[#fdf1dc] text-[#7a4b00] ring-[#f0dcb5]",
  review: "bg-dv-teal-50 text-dv-teal ring-dv-teal/20",
  making: "bg-dv-sand text-dv-body ring-dv-line",
  updating: "bg-dv-sand text-dv-body ring-dv-line",
  failed: "bg-[#fbeaea] text-[#8a1f1f] ring-[#f2cfcf]",
  approved: "bg-dv-teal text-white ring-dv-teal",
  declined: "bg-dv-sand text-dv-muted ring-dv-line",
};

async function patchApproval(id: string, approval: LibraryItem["approval"]): Promise<boolean> {
  try {
    const res = await fetch(`/api/dentvideo/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approval }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * The clinic's videos, week by week. At the top, the one thing to do now
 * (approve, wait, start the week, or post); below, a compact card per video
 * with its state, the reason when it needs a look, and its one action.
 * Videos play in a full-screen player, so a phone does not scroll past five
 * full-height players.
 */
export function Library({
  items,
  canStartWeek,
  locale,
  locked = false,
  currentWeek,
  weekDelay = null,
}: {
  items: LibraryItem[];
  canStartWeek: boolean;
  locale: Locale;
  /** No active plan (not paid yet, paused or cancelled): new videos wait for a plan. */
  locked?: boolean;
  /** Monday of this week (YYYY-MM-DD), from the server. */
  currentWeek: string;
  /** This week's run is being retried / is delayed (worker → Redis): a calm note, never an error. */
  weekDelay?: "retrying" | "delayed" | null;
}) {
  const text = appText(locale);
  const t = text.library;
  const router = useRouter();
  const [playing, setPlaying] = useState<LibraryItem | null>(null);

  const groups = groupByWeek(items);
  const thisWeek = items.filter((i) => i.week_of === currentWeek);
  const notMade = items.filter((i) => i.status === "rejected");
  const delay = delayNote(weekDelay, thisWeek);
  const action = nextAction({ locked, canStartWeek, thisWeek, delayed: !!delay });

  // While anything is being made or re-made, look again every 20 s so cards
  // change by themselves.
  const busy = items.some((i) => {
    const c = cardState(i);
    return c === "making" || c === "updating";
  }) || !!delay;
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(timer);
  }, [busy, router]);

  return (
    <div>
      {action !== "locked" && <NextStep locale={locale} action={action} thisWeek={thisWeek} delay={delay} />}

      {groups.length === 0 && action === "locked" && (
        <p className="mt-8 rounded-2xl border border-dashed border-dv-edge p-8 text-center text-dv-body">{text.home.emptyTitle}</p>
      )}

      {groups.map((g) => {
        const ago = weeksAgo(g.week, currentWeek);
        const label = ago === 0 ? text.home.thisWeek : ago === 1 ? text.home.lastWeek : fmt(text.home.weekOf, { date: weekLabelDate(g.week, locale) });
        return (
          <section key={g.week} aria-labelledby={`week-${g.week}`} className="mt-10 first:mt-8">
            <h2 id={`week-${g.week}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-dv-line pb-3">
              <span className="text-lg font-semibold text-dv-ink">{label}</span>
              {ago <= 1 && <span className="text-sm text-dv-muted">{weekLabelDate(g.week, locale)}</span>}
            </h2>
            <ul className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map((item) => (
                <ItemCard key={item.id} item={item} t={t} onChanged={() => router.refresh()} onPlay={() => setPlaying(item)} />
              ))}
            </ul>
          </section>
        );
      })}

      {notMade.length > 0 && (
        <details className="group mt-10 rounded-2xl bg-white/60 ring-1 ring-dv-line">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-dv-body hover:text-dv-ink">
            {fmt(t.notMadeHeading, { n: notMade.length })}
            <span aria-hidden="true" className="text-dv-muted transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm text-dv-muted">{t.notMadeLead}</p>
            <ul className="mt-3 space-y-3">
              {notMade.map((i) => (
                <li key={i.id} className="rounded-xl bg-white p-4 ring-1 ring-dv-line">
                  <p className="font-medium text-dv-ink">{i.title}</p>
                  {i.findings.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-1 ps-5 text-sm text-dv-body">
                      {i.findings.slice(0, 4).map((f, n) => (
                        <li key={n}>{f}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <Player item={playing} t={t} onClose={() => setPlaying(null)} />
    </div>
  );
}

/** "3 videos are waiting for your approval" — the one thing to do now, with its button. */
function NextStep({
  locale,
  action,
  thisWeek,
  delay = null,
}: {
  locale: Locale;
  action: Exclude<ReturnType<typeof nextAction>, "locked">;
  thisWeek: LibraryItem[];
  delay?: "retrying" | "delayed" | null;
}) {
  const text = appText(locale);
  const h = text.home;
  const t = text.library;
  const router = useRouter();
  const s = weekSummary(thisWeek);
  const toApprove = approvableIds(thisWeek);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function startWeek() {
    setWorking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dentvideo/week", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(res.ok ? { kind: "ok", text: t.started } : { kind: "error", text: body.error ?? text.errors.couldNotStart });
      if (res.ok) router.refresh();
    } catch {
      setMessage({ kind: "error", text: text.errors.couldNotStart });
    }
    setWorking(false);
  }

  async function approveAll() {
    setWorking(true);
    setMessage(null);
    const results = await Promise.all(toApprove.map((id) => patchApproval(id, "approved")));
    setWorking(false);
    if (results.some((ok) => !ok)) setMessage({ kind: "error", text: t.actionFailed });
    router.refresh();
  }

  const pending = s.look + s.review;
  const title =
    action === "review" ? (pending === 1 ? h.reviewOne : fmt(h.reviewMany, { n: pending }))
    : action === "making" ? h.makingTitle
    : action === "start" ? h.startTitle
    : action === "share" ? h.shareTitle
    : h.idleTitle;
  const lead =
    // Japanese runs sentences together without a space.
    action === "review" ? `${h.reviewLead}${s.look > 0 ? `${locale === "ja" ? "" : " "}${h.lookLead}` : ""}`
    : action === "making" ? h.makingLead
    : action === "start" ? h.startLead
    : action === "share" ? h.shareLead
    : h.idleLead;

  const chips = (
    [
      ["look", s.look, "bg-[#fdf1dc] text-[#7a4b00]"],
      ["review", s.review, "bg-dv-teal-50 text-dv-teal"],
      ["making", s.making + s.updating, "bg-dv-sand text-dv-body"],
      ["approved", s.approved, "bg-dv-sand text-dv-body"],
    ] as const
  ).filter(([, n]) => n > 0);

  return (
    <section aria-live="polite" className={`dv-card relative overflow-hidden p-5 sm:p-7 ${action === "review" ? "ring-1 ring-dv-teal/25" : ""}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-dv-teal">
            {action === "making" ? (
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dv-teal opacity-50 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-dv-teal" />
              </span>
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {h.thisWeek}
          </p>
          <h2 className="dv-display mt-2 text-balance text-[1.75rem] leading-[1.1] text-dv-ink sm:text-[2.125rem]">{title}</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-dv-body">{delay ? (delay === "delayed" ? h.delayDelayed : h.delayRetrying) : lead}</p>
          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {chips.map(([k, n, cls]) => (
                <li key={k} className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
                  {fmt(h.summary[k], { n })}
                </li>
              ))}
            </ul>
          )}
        </div>
        {action === "review" && toApprove.length > 1 && (
          <button type="button" onClick={approveAll} disabled={working} className="dv-btn dv-btn-primary w-full shrink-0 px-6 py-3 lg:w-auto">
            {working ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CheckCheck className="h-4 w-4" aria-hidden="true" />}
            {working ? t.approving : fmt(t.approveAll, { n: toApprove.length })}
          </button>
        )}
        {action === "start" && (
          <button type="button" onClick={startWeek} disabled={working} className="dv-btn dv-btn-primary w-full shrink-0 px-6 py-3 lg:w-auto">
            {working && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {working ? t.starting : t.makeWeek}
          </button>
        )}
      </div>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.kind === "error" ? "bg-[#fbeaea] text-[#8a1f1f]" : "bg-dv-teal-50 text-dv-teal"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

function ItemCard({ item, t, onChanged, onPlay }: { item: LibraryItem; t: AppText["library"]; onChanged: () => void; onPlay: () => void }) {
  // Optimistic: the card shows the decision at once and goes back if it did not save.
  const [approval, setApproval] = useState(item.approval);
  useEffect(() => setApproval(item.approval), [item.approval]);
  const view = { ...item, approval };
  const state = cardState(view) as Exclude<CardState, "notMade">;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const share = useShare(item, t);

  async function decide(next: LibraryItem["approval"]) {
    const before = approval;
    setApproval(next);
    setBusy(true);
    setError(null);
    const ok = await patchApproval(item.id, next);
    setBusy(false);
    if (!ok) {
      setApproval(before);
      setError(t.actionFailed);
      return;
    }
    onChanged();
  }

  const post = postText(item);
  const playable = !!item.videoUrl && state !== "making" && state !== "failed";

  return (
    <li className="dv-card flex flex-col overflow-hidden">
      <div className="flex gap-4 p-3 sm:p-4">
        {playable ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label={fmt(t.play, { title: item.title })}
            className="group relative aspect-[9/16] w-[6.5rem] shrink-0 overflow-hidden rounded-xl bg-dv-teal-950 sm:w-28"
          >
            {item.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL
              <img src={item.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
            ) : (
              <video src={item.videoUrl} preload="metadata" muted playsInline className="h-full w-full object-cover" aria-hidden="true" tabIndex={-1} />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/35 to-transparent">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-dv-teal shadow-lg transition group-hover:scale-105">
                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
              </span>
            </span>
          </button>
        ) : (
          <div className="flex aspect-[9/16] w-[6.5rem] shrink-0 items-center justify-center rounded-xl bg-dv-sand ring-1 ring-inset ring-dv-line sm:w-28">
            {state === "failed" ? (
              <AlertTriangle className="h-6 w-6 text-[#8a1f1f]" aria-hidden="true" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-dv-teal motion-reduce:animate-none" aria-hidden="true" />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1 py-0.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${CHIP[state]}`}>
            {state === "approved" && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
            {state === "look" && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
            {state === "updating" && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {t.state[state]}
          </span>
          <h3 className="mt-2 text-[0.9375rem] font-semibold leading-snug text-dv-ink [overflow-wrap:anywhere]">{item.title}</h3>
          <p className="mt-1 text-xs text-dv-muted">{item.kind === "recording" ? t.fromRecording : t.madeForYou}</p>
          {state === "making" && <p className="mt-2 text-sm text-dv-body">{t.makingNote}</p>}
          {state === "updating" && <p className="mt-2 text-sm text-dv-body">{t.photos.updating}</p>}
          {state === "failed" && <p className="mt-2 text-sm text-dv-body">{t.failedNote}</p>}
        </div>
      </div>

      {item.findings.length > 0 && state !== "making" && state !== "failed" && (
        <div className={`mx-3 mb-3 rounded-xl p-3 text-sm sm:mx-4 ${state === "look" ? "bg-[#fdf6ea]" : "bg-dv-sand/70"}`}>
          <p className="font-semibold text-[#7a4b00]">{t.whatToCheck}</p>
          <ul className="mt-1.5 list-disc space-y-1 ps-5 text-[#5c4a2a]">
            {item.findings.slice(0, 6).map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {playable && (
        <div className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4">
          {state === "review" || state === "look" ? (
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => decide("approved")} className="dv-btn dv-btn-primary flex-1 px-4 py-2.5 text-sm">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t.approve}
              </button>
              <button type="button" disabled={busy} onClick={() => decide("rejected")} className="dv-btn dv-btn-secondary px-4 py-2.5 text-sm">
                {t.decline}
              </button>
            </div>
          ) : state === "declined" ? (
            <button type="button" disabled={busy} onClick={() => decide("pending")} className="dv-btn dv-btn-secondary w-full px-4 py-2.5 text-sm">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t.undo}
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" disabled={share.busy} onClick={share.run} className="dv-btn dv-btn-primary flex-1 px-4 py-2.5 text-sm">
                {share.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : share.mode === "desktop" ? (
                  <Download className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                )}
                {share.busy ? t.preparing : share.state === "again" ? t.tapAgain : share.mode === "desktop" ? t.shareDesktop : t.share}
              </button>
              {share.mode === "phone" && (
                <button type="button" onClick={share.download} aria-label={t.download} title={t.download} className="dv-btn dv-btn-secondary w-11 shrink-0 px-0 !text-dv-teal">
                  <Download className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => decide("pending")} aria-label={t.undo} title={t.undo} className="dv-btn dv-btn-secondary w-11 shrink-0 px-0 text-dv-muted">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          {(share.note || error) && (
            <p role={error || share.note?.kind === "error" ? "alert" : "status"} className={`mt-2 rounded-xl px-3 py-2 text-sm ${error || share.note?.kind === "error" ? "bg-[#fbeaea] text-[#8a1f1f]" : "bg-dv-teal-50 text-dv-teal"}`}>
              {error ?? share.note?.text}
            </p>
          )}
        </div>
      )}

      {(item.caption || (item.photos && playable)) && (
        <div className="divide-y divide-dv-line border-t border-dv-line">
          {item.caption && <CaptionDetails post={post} t={t} />}
          {item.photos && playable && state !== "declined" && (
            <div className="px-3 sm:px-4">
              <BackgroundPicker itemId={item.id} photos={item.photos} t={t.photos} onChanged={onChanged} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function postText(item: LibraryItem) {
  return [item.caption ?? "", (item.hashtags ?? []).map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");
}

function CaptionDetails({ post, t }: { post: string; t: AppText["library"] }) {
  const [copied, setCopied] = useState(false);
  return (
    <details className="group px-3 text-sm sm:px-4">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-dv-teal">
        {t.captionAndHashtags}
        <span aria-hidden="true" className="text-dv-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="whitespace-pre-line text-dv-body">{post}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(post);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* the text is on screen to copy by hand */
          }
        }}
        className="mb-2 mt-1 inline-flex min-h-11 items-center gap-1.5 font-medium text-dv-teal underline-offset-4 hover:underline"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
        {copied ? t.copied : t.copyCaption}
      </button>
    </details>
  );
}

/**
 * Posting is the step dentists skip, so it is one tap. On a phone that can
 * share files: the caption goes to the clipboard and the share sheet opens
 * with the video attached (Instagram, TikTok, WhatsApp…). Phones only open
 * the sheet straight after a tap; when fetching the video took too long, the
 * button asks for one more tap. Elsewhere: the video downloads and the
 * caption is copied.
 */
function useShare(item: LibraryItem, t: AppText["library"]) {
  const [mode, setMode] = useState<"phone" | "desktop">("desktop");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "again">("idle");
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const file = useRef<File | null>(null);
  const timer = useRef<number | null>(null);
  const name = videoFileName(item.title);
  const post = postText(item);

  useEffect(() => {
    try {
      const probe = new File([new Blob()], "x.mp4", { type: "video/mp4" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] })) setMode("phone");
    } catch {
      /* desktop */
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function flash(n: { kind: "ok" | "error"; text: string }) {
    setNote(n);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(null), 8000);
  }

  async function load(): Promise<File> {
    if (file.current) return file.current;
    const blob = await (await fetch(item.videoUrl!)).blob();
    file.current = new File([blob], name, { type: blob.type || "video/mp4" });
    return file.current;
  }

  function save(f: File) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function run() {
    if (!item.videoUrl) return;
    trackDv("video_shared", { props: { method: mode === "phone" ? "share" : "download" } });
    // The clipboard first, while the tap still counts.
    if (post) await navigator.clipboard?.writeText(post).catch(() => {});
    if (mode === "desktop") {
      setBusy(true);
      try {
        save(await load());
        flash({ kind: "ok", text: t.shareDesktopHint });
      } catch {
        window.open(item.videoUrl, "_blank", "noopener");
      }
      setBusy(false);
      return;
    }
    let f = file.current;
    if (!f) {
      setBusy(true);
      try {
        f = await load();
      } catch {
        setBusy(false);
        flash({ kind: "error", text: t.shareFailed });
        return;
      }
      setBusy(false);
    }
    try {
      await navigator.share({ files: [f], text: post });
      setState("idle");
      flash({ kind: "ok", text: t.shareHint });
    } catch (e) {
      const n = (e as Error).name;
      if (n === "AbortError") setState("idle");
      else if (n === "NotAllowedError") setState("again");
      else flash({ kind: "error", text: t.shareFailed });
    }
  }

  async function download() {
    trackDv("video_shared", { props: { method: "download" } });
    try {
      save(await load());
    } catch {
      window.open(item.videoUrl, "_blank", "noopener");
    }
  }

  return { mode, busy, state, note, run, download };
}

/** A full-screen player for one video; Escape, the close button or a tap outside closes it. */
function Player({ item, t, onClose }: { item: LibraryItem | null; t: AppText["library"]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={item?.title}
      className="m-auto max-h-[100dvh] w-full max-w-[min(26rem,100vw)] bg-transparent p-0 backdrop:bg-[#08201f]/85 backdrop:backdrop-blur-sm"
    >
      {item?.videoUrl && (
        <div className="relative flex flex-col items-center gap-3 p-3">
          <div className="flex w-full items-center justify-between gap-3 text-white">
            <p className="min-w-0 truncate text-sm font-semibold">{item.title}</p>
            <button type="button" onClick={onClose} aria-label={t.close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <video
            key={item.id}
            src={item.videoUrl}
            poster={item.thumbUrl}
            controls
            autoPlay
            playsInline
            className="aspect-[9/16] h-[min(calc(100dvh-6rem),46rem)] w-auto max-w-full rounded-2xl bg-black object-contain"
          />
        </div>
      )}
    </dialog>
  );
}
