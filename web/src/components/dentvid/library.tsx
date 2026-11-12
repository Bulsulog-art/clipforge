"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CheckCheck, CircleCheck, Flame, Loader2, Play, RotateCcw, Send, Sparkles } from "lucide-react";
import { BackgroundPicker } from "./background-picker";
import { DeclineForm, postText, ReviewPlayer, usePosted, type Decide } from "./review-player";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt, type AppText } from "@/content/dentvideo-app";
import {
  approvableIds,
  cardState,
  firstToReview,
  groupByWeek,
  nextAction,
  postingProgress,
  postingStreak,
  reviewQueue,
  titleWithCount,
  weekLabelDate,
  weekSummary,
  delayNote,
  weeksAgo,
  type CardState,
  type PostedMarks,
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

async function patchApproval(id: string, approval: LibraryItem["approval"], note?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/dentvideo/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(note ? { approval, note } : { approval }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * The clinic's videos, week by week. At the top, the one thing to do now
 * (watch and approve, wait, start the week, or post — with the week's posting
 * checklist); below, a compact card per video with its state, the reason when
 * it needs a look, and its one action. Videos open in the full-screen review
 * (components/dentvid/review-player), which steps through the week's videos,
 * so a phone never scrolls past five full-height players.
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
  const posted = usePosted();

  // Decisions show at once (optimistic) and go back if they did not save; a refresh brings the server's word.
  const [decided, setDecided] = useState<Record<string, LibraryItem["approval"]>>({});
  useEffect(() => {
    // Once the server's rows agree, the local decision has done its job.
    setDecided((d) => Object.fromEntries(Object.entries(d).filter(([id, a]) => items.find((i) => i.id === id)?.approval !== a)));
  }, [items]);
  const view = useMemo(() => items.map((i) => (decided[i.id] ? { ...i, approval: decided[i.id] } : i)), [items, decided]);

  const decide: Decide = async (id, approval, note) => {
    const before = decided[id];
    setDecided((d) => ({ ...d, [id]: approval }));
    const ok = await patchApproval(id, approval, note);
    if (!ok) {
      setDecided((d) => {
        const next = { ...d };
        if (before) next[id] = before;
        else delete next[id];
        return next;
      });
      return false;
    }
    router.refresh();
    return true;
  };

  // The review steps through one week's videos in the order it opened with (the cards re-sort as
  // decisions are made; the player must not), by id, so a refresh keeps its place.
  const [review, setReview] = useState<{ ids: string[]; id: string } | null>(null);
  const queue = review ? review.ids.map((id) => view.find((i) => i.id === id)).filter((i): i is LibraryItem => !!i) : [];
  const index = review ? queue.findIndex((i) => i.id === review.id) : -1;
  const openReview = (week: string, id?: string) => {
    const q = reviewQueue(groupByWeek(view).find((g) => g.week === week)?.items ?? []);
    const target = id ?? q[firstToReview(q)]?.id;
    if (target) setReview({ ids: q.map((i) => i.id), id: target });
  };

  const groups = groupByWeek(view);
  const thisWeek = view.filter((i) => i.week_of === currentWeek);
  const notMade = view.filter((i) => i.status === "rejected");
  const delay = delayNote(weekDelay, thisWeek);
  const action = nextAction({ locked, canStartWeek, thisWeek, delayed: !!delay });
  const s = weekSummary(thisWeek);

  // The tab says how many videos are waiting, so a pinned tab (or the home-screen app) shows there is something to do.
  useEffect(() => {
    document.title = titleWithCount(document.title, s.look + s.review);
  }, [s.look, s.review]);

  // While anything is being made or re-made, look again every 20 s so cards
  // change by themselves (not while the review is open: the video would reload).
  const busy = items.some((i) => {
    const c = cardState(i);
    return c === "making" || c === "updating";
  }) || !!delay;
  useEffect(() => {
    if (!busy || review) return;
    const timer = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(timer);
  }, [busy, review, router]);

  return (
    <div>
      {action !== "locked" && (
        <NextStep
          locale={locale}
          action={action}
          thisWeek={thisWeek}
          delay={delay}
          marks={posted.marks}
          currentWeek={currentWeek}
          onReview={() => openReview(currentWeek)}
          onPost={(id) => openReview(currentWeek, id)}
        />
      )}

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
                <ItemCard
                  key={item.id}
                  item={item}
                  t={t}
                  posted={!!posted.marks[item.id]}
                  decide={decide}
                  onChanged={() => router.refresh()}
                  onOpen={() => openReview(g.week, item.id)}
                />
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

      <ReviewPlayer
        locale={locale}
        queue={queue}
        index={index}
        onIndex={(n) => review && queue[n] && setReview({ ids: review.ids, id: queue[n].id })}
        onClose={() => setReview(null)}
        decide={decide}
        posted={posted.marks}
        onPosted={(item, on) => posted.toggle(item.id, item.week_of, on)}
      />
    </div>
  );
}

/** "3 videos are waiting for your approval" — the one thing to do now, with its button. */
export function NextStep({
  locale,
  action,
  thisWeek,
  delay = null,
  marks = {},
  currentWeek,
  onReview,
  onPost,
}: {
  locale: Locale;
  action: Exclude<ReturnType<typeof nextAction>, "locked">;
  thisWeek: LibraryItem[];
  delay?: "retrying" | "delayed" | null;
  marks?: PostedMarks;
  currentWeek: string;
  onReview: () => void;
  onPost: (id: string) => void;
}) {
  const text = appText(locale);
  const h = text.home;
  const t = text.library;
  const router = useRouter();
  const s = weekSummary(thisWeek);
  const toApprove = approvableIds(thisWeek);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const progress = postingProgress(thisWeek, marks);
  const streak = postingStreak(marks, currentWeek);
  const nextToPost = thisWeek.find((i) => cardState(i) === "approved" && !marks[i.id]) ?? thisWeek.find((i) => cardState(i) === "approved");

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
    : action === "share" ? (progress.total > 0 && progress.posted === progress.total ? t.post.allPosted : h.shareTitle)
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
          {chips.length > 0 && action !== "share" && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {chips.map(([k, n, cls]) => (
                <li key={k} className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
                  {fmt(h.summary[k], { n })}
                </li>
              ))}
            </ul>
          )}
        </div>
        {action === "review" && (
          <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto">
            <button type="button" onClick={onReview} className="dv-btn dv-btn-primary w-full px-6 py-3.5 text-base">
              <Play className="h-4 w-4 fill-current rtl:-scale-x-100" aria-hidden="true" />
              {t.review.start}
            </button>
            {toApprove.length > 1 && (
              <button type="button" onClick={approveAll} disabled={working} className="dv-btn dv-btn-secondary w-full px-6 py-2.5 text-sm !text-dv-teal">
                {working ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CheckCheck className="h-4 w-4" aria-hidden="true" />}
                {working ? t.approving : fmt(t.approveAll, { n: toApprove.length })}
              </button>
            )}
          </div>
        )}
        {action === "start" && (
          <button type="button" onClick={startWeek} disabled={working} className="dv-btn dv-btn-primary w-full shrink-0 px-6 py-3 lg:w-auto">
            {working && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {working ? t.starting : t.makeWeek}
          </button>
        )}
        {action === "share" && nextToPost && (
          <button type="button" onClick={() => onPost(nextToPost.id)} className="dv-btn dv-btn-primary w-full shrink-0 px-6 py-3.5 text-base lg:w-auto">
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {progress.posted > 0 && progress.posted < progress.total ? t.post.postNext : t.review.openPost}
          </button>
        )}
      </div>
      {action === "share" && progress.total > 0 && <PostingChecklist t={t.post} progress={progress} streak={streak} />}
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.kind === "error" ? "bg-[#fbeaea] text-[#8a1f1f]" : "bg-dv-teal-50 text-dv-teal"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

/** The week's posting checklist: a bar, "2 of 4 posted this week", and the streak once there is one. */
function PostingChecklist({ t, progress, streak }: { t: AppText["library"]["post"]; progress: { total: number; posted: number }; streak: number }) {
  const label = fmt(t.progress, { n: progress.posted, total: progress.total });
  return (
    <div className="mt-5 border-t border-dv-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-semibold text-dv-ink">{label}</p>
        {streak > 0 && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf1dc] px-3 py-1 text-xs font-semibold text-[#7a4b00]">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {streak === 1 ? t.streakOne : fmt(t.streak, { n: streak })}
          </p>
        )}
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.posted} className="mt-2 flex gap-1">
        {Array.from({ length: progress.total }, (_, n) => (
          <span key={n} className={`h-2 flex-1 rounded-full ${n < progress.posted ? "bg-dv-teal" : "bg-dv-sand-200"}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-dv-muted">{t.deviceNote}</p>
    </div>
  );
}

function ItemCard({
  item,
  t,
  posted,
  decide,
  onChanged,
  onOpen,
}: {
  item: LibraryItem;
  t: AppText["library"];
  posted: boolean;
  decide: Decide;
  onChanged: () => void;
  onOpen: () => void;
}) {
  const state = cardState(item) as Exclude<CardState, "notMade">;
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: LibraryItem["approval"], note?: string) {
    setBusy(true);
    setError(null);
    const ok = await decide(item.id, next, note);
    setBusy(false);
    if (!ok) setError(t.actionFailed);
    else setDeclining(false);
  }

  const playable = !!item.videoUrl && state !== "making" && state !== "failed";

  return (
    <li className="dv-card flex flex-col overflow-hidden">
      <div className="flex gap-4 p-3 sm:p-4">
        {playable ? (
          <button
            type="button"
            onClick={onOpen}
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
                <Play className="ms-0.5 h-5 w-5 fill-current rtl:-scale-x-100" aria-hidden="true" />
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
          <p className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${CHIP[state]}`}>
              {state === "approved" && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
              {state === "look" && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
              {state === "updating" && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {t.state[state]}
            </span>
            {posted && (state === "approved" || state === "updating") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-dv-sand px-2.5 py-1 text-xs font-semibold text-dv-ink ring-1 ring-inset ring-dv-line">
                <CircleCheck className="h-3.5 w-3.5 text-dv-teal" aria-hidden="true" />
                {t.review.postedBadge}
              </span>
            )}
          </p>
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
            declining ? (
              <DeclineForm t={t.declineForm} busy={busy} onCancel={() => setDeclining(false)} onSubmit={(note) => choose("rejected", note)} />
            ) : (
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => choose("approved")} className="dv-btn dv-btn-primary flex-1 px-4 py-2.5 text-sm">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t.approve}
                </button>
                <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="dv-btn dv-btn-secondary px-4 py-2.5 text-sm">
                  {t.decline}
                </button>
              </div>
            )
          ) : state === "declined" ? (
            <button type="button" disabled={busy} onClick={() => choose("pending")} className="dv-btn dv-btn-secondary w-full px-4 py-2.5 text-sm">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t.undo}
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={onOpen} className="dv-btn dv-btn-primary flex-1 px-4 py-2.5 text-sm">
                <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                {t.review.openPost}
              </button>
              <button type="button" disabled={busy} onClick={() => choose("pending")} aria-label={t.undo} title={t.undo} className="dv-btn dv-btn-secondary w-11 shrink-0 px-0 text-dv-muted">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 rounded-xl bg-[#fbeaea] px-3 py-2 text-sm text-[#8a1f1f]">
              {error}
            </p>
          )}
        </div>
      )}

      {(item.caption || (item.photos && playable)) && (
        <div className="divide-y divide-dv-line border-t border-dv-line">
          {item.caption && <CaptionDetails post={postText(item)} t={t} />}
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
