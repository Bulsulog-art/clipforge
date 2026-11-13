"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CalendarClock, Check, ChevronLeft, ChevronRight, CircleCheck, Download, Loader2, RotateCcw, Share2, X } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { appText, fmt, type AppText } from "@/content/dentvideo-app";
import { postingText } from "@/content/dentvideo-posting";
import { postTexts, type PostTexts } from "@/lib/dentvid/posting";
import { CaptionTabs, useSaveAndCopy } from "./share-kit";
import {
  cardState,
  DECLINE_REASONS,
  declineNote,
  nextUndecided,
  POST_PLATFORMS,
  POSTED_KEY,
  parsePosted,
  swipeStep,
  togglePosted,
  type DeclineReason,
  type PostedMarks,
  type PostPlatform,
} from "@/lib/dentvid/app-ui";
import type { LibraryItem } from "./library";

/**
 * The Monday review, on a phone: one big vertical player per video, swipe
 * (or the arrows, or the keyboard) between the week's videos, and decide in
 * place — approve, or decline with a reason the team reads. An approved video
 * turns into its "post it" step: share or download the MP4, copy the caption
 * and hashtags, follow the steps for the app, tick it as posted.
 */

export type Decide = (id: string, approval: LibraryItem["approval"], note?: string) => Promise<boolean>;

/** The Instagram caption for a video: the worker's post kit, or the caption and hashtags of older videos. */
export function postText(item: Pick<LibraryItem, "caption" | "hashtags" | "post">): string {
  if (item.post?.instagram) return item.post.instagram;
  return [item.caption ?? "", (item.hashtags ?? []).map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");
}

/** Both texts for the caption tabs (Instagram, TikTok / Shorts), or null when the video has none. */
export function postTextsOf(item: Pick<LibraryItem, "caption" | "hashtags" | "post">): PostTexts | null {
  if (item.post) return item.post;
  return postTexts({ caption: item.caption, hashtags: item.hashtags });
}

/**
 * The posted ticks. Kept on the clinic's account (dentvid_items.posted_at,
 * 0012) so the phone and the desktop agree, and in this browser too — which
 * is all there is on a database without 0012 (`synced` stays false).
 */
export function usePosted(items: Pick<LibraryItem, "id" | "week_of" | "postedAt">[] = []) {
  const [local, setLocal] = useState<PostedMarks>({});
  const [off, setOff] = useState<Record<string, true>>({});
  const [stored, setStored] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setLocal(parsePosted(localStorage.getItem(POSTED_KEY)));
    } catch {
      /* storage unavailable: ticks last for this visit */
    }
  }, []);
  const server: PostedMarks = {};
  for (const i of items) if (i.postedAt) server[i.id] = i.week_of;
  const marks: PostedMarks = Object.fromEntries(Object.entries({ ...server, ...local }).filter(([id]) => !off[id]));
  const synced = stored ?? items.some((i) => i.postedAt !== undefined);
  function toggle(id: string, week: string, on: boolean) {
    setOff((o) => {
      const next = { ...o };
      if (on) delete next[id];
      else next[id] = true;
      return next;
    });
    setLocal((cur) => {
      const next = togglePosted(cur, id, week, on);
      try {
        localStorage.setItem(POSTED_KEY, JSON.stringify(next));
      } catch {
        /* keep it in memory */
      }
      return next;
    });
    void fetch(`/api/dentvideo/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ posted: on }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { stored?: boolean } | null) => {
        if (b && typeof b.stored === "boolean") setStored(b.stored);
      })
      .catch(() => {});
  }
  return { marks, toggle, synced };
}

export function ReviewPlayer({
  locale,
  queue,
  index,
  onIndex,
  onClose,
  decide,
  posted,
  onPosted,
  slots,
}: {
  locale: Locale;
  /** Suggested posting day and time per video id ("Tue 12:30"). */
  slots?: Map<string, string>;
  /** The videos stepped through (one week's), already showing any decision made here. */
  queue: LibraryItem[];
  /** The one on screen; -1 when the player is closed. */
  index: number;
  onIndex: (n: number) => void;
  onClose: () => void;
  decide: Decide;
  posted: PostedMarks;
  onPosted: (item: LibraryItem, on: boolean) => void;
}) {
  const text = appText(locale);
  const t = text.library;
  const r = t.review;
  const rtl = dirOf(locale) === "rtl";
  const ref = useRef<HTMLDialogElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const item = index >= 0 ? queue[index] : undefined;
  const open = !!item;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);

  const go = (step: "next" | "previous") => {
    const n = step === "next" ? index + 1 : index - 1;
    if (n >= 0 && n < queue.length) onIndex(n);
  };

  function onKeyDown(e: React.KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (["TEXTAREA", "INPUT", "VIDEO"].includes(el.tagName) || el.getAttribute("role") === "tab") return;
    if (e.key === "ArrowRight") go(rtl ? "previous" : "next");
    else if (e.key === "ArrowLeft") go(rtl ? "next" : "previous");
    else return;
    e.preventDefault();
  }

  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < queue.length - 1;
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={onKeyDown}
      aria-label={item ? `${r.title}: ${item.title}` : r.title}
      dir={dirOf(locale)}
      lang={locale}
      className="dv-on-dark fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden bg-[#061918] p-0 text-white backdrop:bg-[#061918]"
    >
      {item && (
        <div className="flex h-full flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_27rem]">
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex items-center gap-3 px-3 pb-2 pt-3 sm:px-5">
              <button type="button" onClick={onClose} aria-label={t.close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-white/75" aria-live="polite">
                  {fmt(r.position, { n: index + 1, total: queue.length })}
                </p>
              </div>
            </header>
            {queue.length > 1 && (
              <ol className="flex gap-1 px-3 sm:px-5" aria-hidden="true">
                {queue.map((q, n) => {
                  const c = cardState(q);
                  const tone = c === "approved" || c === "updating" ? "bg-dv-teal-300" : c === "declined" ? "bg-white/30" : "bg-white/55";
                  return <li key={q.id} className={`h-1 flex-1 rounded-full ${tone} ${n === index ? "outline outline-2 outline-offset-1 outline-white" : "opacity-80"}`} />;
                })}
              </ol>
            )}
            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-3 py-3 sm:px-5"
              onPointerDown={(e) => {
                start.current = null;
                // Touch only, and never from the player's own control bar (scrubbing is a horizontal drag too).
                if (e.pointerType === "mouse") return;
                const el = e.target as HTMLElement;
                if (el.tagName === "VIDEO" && e.clientY > el.getBoundingClientRect().bottom - 72) return;
                start.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                const s = start.current;
                start.current = null;
                if (!s) return;
                const step = swipeStep(e.clientX - s.x, e.clientY - s.y, rtl);
                if (step) go(step);
              }}
            >
              {item.videoUrl ? (
                <video
                  key={item.id}
                  src={item.videoUrl}
                  poster={item.thumbUrl}
                  controls
                  autoPlay
                  playsInline
                  aria-label={item.title}
                  className="aspect-[9/16] h-full max-h-full w-auto max-w-full rounded-2xl bg-black object-contain"
                />
              ) : (
                <div className="flex aspect-[9/16] h-full items-center justify-center rounded-2xl bg-white/5">
                  <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                </div>
              )}
              {hasPrev && (
                <button type="button" onClick={() => go("previous")} aria-label={r.previous} className="absolute start-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 sm:start-4">
                  <Prev className="h-6 w-6" aria-hidden="true" />
                </button>
              )}
              {hasNext && (
                <button type="button" onClick={() => go("next")} aria-label={r.next} className="absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 sm:end-4">
                  <Next className="h-6 w-6" aria-hidden="true" />
                </button>
              )}
            </div>
            {queue.length > 1 && <p className="pb-2 text-center text-xs text-white/70 lg:hidden">{r.swipeHint}</p>}
          </div>
          <ReviewPanel
            key={item.id}
            locale={locale}
            item={item}
            queue={queue}
            index={index}
            onIndex={onIndex}
            decide={decide}
            posted={!!posted[item.id]}
            onPosted={(on) => onPosted(item, on)}
            slot={slots?.get(item.id)}
          />
        </div>
      )}
    </dialog>
  );
}

/** The decision (or, once approved, the posting) under the player: a sheet on a phone, a side column on a desktop. */
export function ReviewPanel({
  locale,
  item,
  queue,
  index,
  onIndex,
  decide,
  posted,
  onPosted,
  slot,
}: {
  locale: Locale;
  item: LibraryItem;
  queue: LibraryItem[];
  index: number;
  onIndex: (n: number) => void;
  decide: Decide;
  posted: boolean;
  onPosted: (on: boolean) => void;
  slot?: string;
}) {
  const text = appText(locale);
  const t = text.library;
  const p = postingText(locale);
  const state = cardState(item);
  // One share for the panel, so "Approve + save" and the post step after it are the same tap and the same file.
  const share = useSaveAndCopy({
    videoUrl: item.videoUrl,
    title: item.title,
    text: postText(item),
    prefetch: state === "review" || state === "approved",
    labels: { sharedHint: p.sharedHint, downloadedHint: p.downloadedHint, failed: t.shareFailed },
  });
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // "Every video is decided" only right after the decision that made it so, not whenever a decided video is opened.
  const [justDecided, setJustDecided] = useState(false);
  const decided = state === "approved" || state === "declined" || state === "updating";
  const allDone = justDecided && decided && queue.length > 1 && nextUndecided(queue, index) < 0;

  /** Approve and share in the same tap: the decision saves in the background while the share sheet opens. */
  function approveAndShare() {
    void share.run(() => {
      setJustDecided(true);
      void decide(item.id, "approved").then((ok) => {
        if (!ok) setMessage({ kind: "error", text: t.actionFailed });
      });
    });
  }

  async function choose(approval: LibraryItem["approval"], note?: string) {
    setBusy(true);
    setMessage(null);
    const ok = await decide(item.id, approval, note);
    setBusy(false);
    if (!ok) {
      setMessage({ kind: "error", text: t.actionFailed });
      return;
    }
    setDeclining(false);
    setJustDecided(approval !== "pending");
    if (approval === "rejected") setMessage({ kind: "ok", text: t.declineForm.done });
    if (approval === "pending") return;
    // On to the next video still waiting, after a beat so the change is seen.
    const updated = queue.map((q) => (q.id === item.id ? { ...q, approval } : q));
    const n = nextUndecided(updated, index);
    if (n >= 0) window.setTimeout(() => onIndex(n), approval === "approved" ? 450 : 1100);
  }

  return (
    <section className={`${declining ? "max-h-[72dvh]" : "max-h-[48dvh]"} shrink-0 overflow-y-auto rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-dv-ink sm:px-6 lg:max-h-none lg:rounded-none lg:py-8`}>
      <div className="mx-auto max-w-xl">
        <StateChip state={state} posted={posted} t={t} />
        <h2 className="sr-only text-lg font-semibold leading-snug [overflow-wrap:anywhere] lg:not-sr-only lg:mt-2">{item.title}</h2>

        {item.findings.length > 0 && (state === "look" || state === "review") && (
          <div className="mt-3 rounded-xl bg-[#fdf6ea] p-3 text-sm">
            <p className="font-semibold text-[#7a4b00]">{t.whatToCheck}</p>
            <ul className="mt-1 list-disc space-y-1 ps-5 text-[#5c4a2a]">
              {item.findings.slice(0, 6).map((f, n) => (
                <li key={n}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {(state === "look" || state === "review") &&
          (declining ? (
            <DeclineForm t={t.declineForm} busy={busy} onCancel={() => setDeclining(false)} onSubmit={(note) => choose("rejected", note)} />
          ) : (
            <>
              {state === "review" && item.videoUrl && (
                <button type="button" disabled={busy || share.busy} onClick={approveAndShare} className="dv-btn dv-btn-primary mt-4 w-full px-5 py-3">
                  {share.busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Share2 className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />}
                  {p.approveSaveCopy}
                </button>
              )}
              <div className={`${state === "review" && item.videoUrl ? "mt-2" : "mt-4"} flex gap-2`}>
                <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="dv-btn dv-btn-secondary px-5 py-3">
                  {t.decline}
                </button>
                <button type="button" disabled={busy} onClick={() => choose("approved")} className={`dv-btn flex-1 px-5 py-3 ${state === "review" && item.videoUrl ? "dv-btn-secondary !text-dv-teal" : "dv-btn-primary"}`}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  {t.approve}
                </button>
              </div>
              {slot && <SlotLine label={fmt(p.suggested, { slot })} />}
            </>
          ))}

        {state === "declined" && (
          <button type="button" disabled={busy} onClick={() => choose("pending")} className="dv-btn dv-btn-secondary mt-4 w-full px-5 py-3">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.undo}
          </button>
        )}

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`mt-3 rounded-xl px-3 py-2 text-sm ${message.kind === "error" ? "bg-[#fbeaea] text-[#8a1f1f]" : "bg-dv-teal-50 text-dv-teal"}`}>
            {message.text}
          </p>
        )}

        {allDone && (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-dv-teal-50 px-3 py-2 text-sm text-dv-teal">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.review.allDone}
          </p>
        )}

        {(state === "approved" || state === "updating") && (
          <PostPanel
            locale={locale}
            item={item}
            posted={posted}
            onPosted={onPosted}
            onUndo={() => choose("pending")}
            undoBusy={busy}
            share={share}
            slot={slot}
            onNext={queue.length > 1 && index < queue.length - 1 ? () => onIndex(index + 1) : undefined}
          />
        )}
      </div>
    </section>
  );
}

function StateChip({ state, posted, t }: { state: ReturnType<typeof cardState>; posted: boolean; t: AppText["library"] }) {
  if (state === "notMade" || state === "making" || state === "failed") return null;
  const tone =
    state === "look" ? "bg-[#fdf1dc] text-[#7a4b00]" : state === "review" ? "bg-dv-teal-50 text-dv-teal" : state === "declined" ? "bg-dv-sand text-dv-muted" : "bg-dv-teal text-white";
  return (
    <p className="flex flex-wrap gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
        {state === "look" && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
        {state === "approved" && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
        {t.state[state]}
      </span>
      {posted && (
        <span className="inline-flex items-center gap-1 rounded-full bg-dv-sand px-2.5 py-1 text-xs font-semibold text-dv-ink">
          <CircleCheck className="h-3.5 w-3.5 text-dv-teal" aria-hidden="true" />
          {t.review.postedBadge}
        </span>
      )}
    </p>
  );
}

/** Decline with a reason: one tap for the usual ones, and room to say what should change. */
export function DeclineForm({ t, busy, onCancel, onSubmit }: { t: AppText["library"]["declineForm"]; busy: boolean; onCancel: () => void; onSubmit: (note: string | undefined) => void }) {
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [words, setWords] = useState("");
  const id = useId();
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <form
      className="mt-4 rounded-2xl bg-dv-sand/60 p-4 ring-1 ring-inset ring-dv-line"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(declineNote(reason, words));
      }}
    >
      <fieldset>
        <legend className="font-semibold text-dv-ink">{t.title}</legend>
        <p className="mt-1 text-sm text-dv-body">{t.lead}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DECLINE_REASONS.map((k, n) => (
            <label key={k} className="cursor-pointer">
              <input ref={n === 0 ? first : undefined} type="radio" name={`${id}-reason`} value={k} checked={reason === k} onChange={() => setReason(k)} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-dv-ink ring-1 ring-inset ring-dv-edge peer-checked:bg-dv-teal peer-checked:text-white peer-checked:ring-dv-teal peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-dv-teal">
                {t.reasons[k]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${id}-note`} className="mt-4 block text-sm font-medium text-dv-ink">
        {t.noteLabel}
      </label>
      <textarea id={`${id}-note`} rows={2} maxLength={400} value={words} onChange={(e) => setWords(e.target.value)} placeholder={t.notePlaceholder} className="dv-field resize-none text-sm" />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} className="dv-btn dv-btn-secondary px-5 py-2.5 text-sm">
          {t.cancel}
        </button>
        <button type="submit" disabled={busy} className="dv-btn dv-btn-primary flex-1 px-5 py-2.5 text-sm">
          {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {t.submit}
        </button>
      </div>
    </form>
  );
}

/** "Best time: Tue 12:30" — when this video is suggested to go out, in the clinic's local time. */
export function SlotLine({ label }: { label: string }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 text-sm text-dv-body">
      <CalendarClock className="h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
      {label}
    </p>
  );
}

type Share = ReturnType<typeof useSaveAndCopy>;

/**
 * "Post it": one tap saves the video and copies the caption, the Instagram
 * and TikTok / Shorts texts, the suggested time, then a tick for the week's
 * checklist.
 */
export function PostPanel({
  locale,
  item,
  posted,
  onPosted,
  onUndo,
  undoBusy = false,
  share: given,
  slot,
  onNext,
}: {
  locale: Locale;
  item: LibraryItem;
  posted: boolean;
  onPosted: (on: boolean) => void;
  onUndo?: () => void;
  undoBusy?: boolean;
  /** The panel's share (ReviewPanel), so a file fetched for "approve + save" is reused. */
  share?: Share;
  slot?: string;
  onNext?: () => void;
}) {
  const text = appText(locale);
  const t = text.library;
  const p = t.post;
  const ps = postingText(locale);
  const own = useSaveAndCopy({
    videoUrl: item.videoUrl,
    title: item.title,
    text: postText(item),
    prefetch: !given,
    labels: { sharedHint: ps.sharedHint, downloadedHint: ps.downloadedHint, failed: t.shareFailed },
  });
  const share = given ?? own;
  const texts = postTextsOf(item);
  const [tab, setTab] = useState<PostPlatform>("instagram");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function onTabKey(e: React.KeyboardEvent, n: number) {
    const rtl = dirOf(locale) === "rtl";
    const step = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
    if (!step) return;
    e.preventDefault();
    const k = (n + step + POST_PLATFORMS.length) % POST_PLATFORMS.length;
    setTab(POST_PLATFORMS[k]);
    tabs.current[k]?.focus();
  }

  return (
    <div className="mt-3">
      <h3 className="sr-only lg:not-sr-only lg:font-dv-serif lg:font-normal lg:mb-3 lg:text-[1.75rem] lg:leading-tight">{p.title}</h3>

      <div className="flex gap-2">
        <button type="button" disabled={share.busy || !item.videoUrl} onClick={() => void share.run()} className="dv-btn dv-btn-primary flex-1 px-5 py-3">
          {share.busy ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : share.method === "download" ? (
            <Download className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Share2 className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          )}
          {share.busy ? t.preparing : share.again ? t.tapAgain : share.method === "download" ? ps.downloadAndCopy : ps.saveAndCopy}
        </button>
        {share.method === "share-file" && (
          <button type="button" onClick={share.download} aria-label={t.download} title={t.download} className="dv-btn dv-btn-secondary w-12 shrink-0 px-0 !text-dv-teal">
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-dv-muted">{p.format}</p>
      {share.note && (
        <p role={share.note.kind === "error" ? "alert" : "status"} className={`mt-2 rounded-xl px-3 py-2 text-sm ${share.note.kind === "error" ? "bg-[#fbeaea] text-[#8a1f1f]" : "bg-dv-teal-50 text-dv-teal"}`}>
          {share.note.text}
        </p>
      )}
      {slot && <SlotLine label={fmt(ps.suggested, { slot })} />}

      {texts && <CaptionTabs texts={texts} locale={locale} />}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-pressed={posted}
          onClick={() => onPosted(!posted)}
          className={`dv-btn flex-1 px-5 py-3 ${posted ? "bg-dv-teal-50 text-dv-teal ring-1 ring-inset ring-dv-teal/30" : "dv-btn-secondary"}`}
        >
          <CircleCheck className={`h-5 w-5 ${posted ? "fill-dv-teal text-white" : "text-dv-muted"}`} aria-hidden="true" />
          {posted ? p.posted : p.markPosted}
        </button>
        {onNext && (
          <button type="button" onClick={onNext} className="dv-btn dv-btn-secondary shrink-0 px-4 py-3 !text-dv-teal">
            {ps.nextVideo}
            <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold" id={`${id}-tips`}>
          {p.tipsTitle}
        </p>
        <div role="tablist" aria-labelledby={`${id}-tips`} className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-dv-sand p-1 sm:flex sm:rounded-full">
          {POST_PLATFORMS.map((k, n) => (
            <button
              key={k}
              ref={(el) => {
                tabs.current[n] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${k}`}
              aria-selected={tab === k}
              aria-controls={`${id}-panel`}
              tabIndex={tab === k ? 0 : -1}
              onClick={() => setTab(k)}
              onKeyDown={(e) => onTabKey(e, n)}
              className={`min-h-11 grow rounded-full px-3 text-sm font-medium sm:whitespace-nowrap ${tab === k ? "bg-white text-dv-ink shadow-sm" : "text-dv-body hover:text-dv-ink"}`}
            >
              {p.platforms[k]}
            </button>
          ))}
        </div>
        <ol id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="mt-3 space-y-2">
          {p.tips[tab].map((s, n) => (
            <li key={n} className="flex gap-3 text-sm leading-relaxed text-dv-body">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dv-teal-50 text-xs font-semibold text-dv-teal">
                {n + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {onUndo && (
        <button type="button" disabled={undoBusy} onClick={onUndo} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-dv-muted underline-offset-4 hover:text-dv-ink hover:underline">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t.undo}
        </button>
      )}
    </div>
  );
}
