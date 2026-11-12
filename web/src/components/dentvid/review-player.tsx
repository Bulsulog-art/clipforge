"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleCheck, Copy, Download, Loader2, RotateCcw, Share2, X } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { appText, fmt, type AppText } from "@/content/dentvideo-app";
import { trackDv } from "@/lib/dentvid/events-client";
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
  videoFileName,
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

export function postText(item: Pick<LibraryItem, "caption" | "hashtags">): string {
  return [item.caption ?? "", (item.hashtags ?? []).map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");
}

/** The posted ticks, kept in this browser (they are the clinic's own checklist, not a record anyone else needs). */
export function usePosted() {
  const [marks, setMarks] = useState<PostedMarks>({});
  useEffect(() => {
    try {
      setMarks(parsePosted(localStorage.getItem(POSTED_KEY)));
    } catch {
      /* storage unavailable: ticks last for this visit */
    }
  }, []);
  function toggle(id: string, week: string, on: boolean) {
    setMarks((cur) => {
      const next = togglePosted(cur, id, week, on);
      try {
        localStorage.setItem(POSTED_KEY, JSON.stringify(next));
      } catch {
        /* keep it in memory */
      }
      return next;
    });
  }
  return { marks, toggle };
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
}: {
  locale: Locale;
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
}: {
  locale: Locale;
  item: LibraryItem;
  queue: LibraryItem[];
  index: number;
  onIndex: (n: number) => void;
  decide: Decide;
  posted: boolean;
  onPosted: (on: boolean) => void;
}) {
  const text = appText(locale);
  const t = text.library;
  const state = cardState(item);
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // "Every video is decided" only right after the decision that made it so, not whenever a decided video is opened.
  const [justDecided, setJustDecided] = useState(false);
  const decided = state === "approved" || state === "declined" || state === "updating";
  const allDone = justDecided && decided && queue.length > 1 && nextUndecided(queue, index) < 0;

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
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="dv-btn dv-btn-secondary px-5 py-3">
                {t.decline}
              </button>
              <button type="button" disabled={busy} onClick={() => choose("approved")} className="dv-btn dv-btn-primary flex-1 px-5 py-3">
                {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {t.approve}
              </button>
            </div>
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
          <PostPanel locale={locale} item={item} posted={posted} onPosted={onPosted} onUndo={() => choose("pending")} undoBusy={busy} />
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

/** "Post it": the file, the words and the steps, then a tick for the week's checklist. */
export function PostPanel({
  locale,
  item,
  posted,
  onPosted,
  onUndo,
  undoBusy = false,
}: {
  locale: Locale;
  item: LibraryItem;
  posted: boolean;
  onPosted: (on: boolean) => void;
  onUndo?: () => void;
  undoBusy?: boolean;
}) {
  const text = appText(locale);
  const t = text.library;
  const p = t.post;
  const share = useShare(item, t);
  const post = postText(item);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<PostPlatform>("instagram");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  async function copy() {
    try {
      await navigator.clipboard.writeText(post);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the text is on screen to copy by hand */
    }
  }

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
        <button type="button" disabled={share.busy || !item.videoUrl} onClick={share.run} className="dv-btn dv-btn-primary flex-1 px-5 py-3">
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

      {post && (
        <div className="mt-3 rounded-2xl bg-dv-sand/60 px-3 pb-3 pt-1 ring-1 ring-inset ring-dv-line">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{p.captionLabel}</p>
            <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-dv-teal hover:bg-white">
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              <span aria-live="polite">{copied ? t.copied : t.copyCaption}</span>
            </button>
          </div>
          <p className="max-h-24 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-dv-body">{post}</p>
        </div>
      )}

      <button
        type="button"
        aria-pressed={posted}
        onClick={() => onPosted(!posted)}
        className={`dv-btn mt-3 w-full px-5 py-3 ${posted ? "bg-dv-teal-50 text-dv-teal ring-1 ring-inset ring-dv-teal/30" : "dv-btn-secondary"}`}
      >
        <CircleCheck className={`h-5 w-5 ${posted ? "fill-dv-teal text-white" : "text-dv-muted"}`} aria-hidden="true" />
        {posted ? p.posted : p.markPosted}
      </button>

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
              className={`min-h-11 grow rounded-full px-3 text-sm font-medium ${tab === k ? "bg-white text-dv-ink shadow-sm" : "text-dv-body hover:text-dv-ink"}`}
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

/**
 * Sharing the file itself. On a phone that can share files: the caption goes
 * to the clipboard and the share sheet opens with the video attached
 * (Instagram, TikTok, WhatsApp…). Phones only open the sheet straight after a
 * tap; when fetching the video took too long, the button asks for one more
 * tap. Elsewhere: the MP4 downloads and the caption is copied.
 */
export function useShare(item: LibraryItem, t: AppText["library"]) {
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
    const res = await fetch(item.videoUrl!);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
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
