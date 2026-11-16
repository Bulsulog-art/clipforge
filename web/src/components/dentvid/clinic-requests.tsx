"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Captions, Lightbulb, Loader2, PencilLine, X } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { CHANGE_NOTE_MAX, CHANGES_PER_WEEK, TOPIC_MAX, fillRequests, requestsText, type ChangeReason, type ChangeStatus, type TopicRefusal } from "@/content/dentvideo-requests";
import { dateLocale, videoFileName, weekLabelDate } from "@/lib/dentvid/app-ui";
import { HelpLink } from "./help-link";

/**
 * The clinic's own requests, in the library and in settings:
 *   TopicRequests   "Suggest a topic for next week" and what became of each suggestion
 *   ChangeRequest   "Ask for a change" on one video, and its status on the card
 *   SubtitlesLink   "Download subtitles (.srt)" next to the video download
 * The rules (lengths, caps, owner scope) are on the server: lib/dentvid/clinic-requests.ts.
 */

export type TopicView = { id: string; text: string; status: "pending" | "used" | "refused"; reason: TopicRefusal | null; week_of: string | null };
export type ChangeView = { status: ChangeStatus; reason: ChangeReason | null; at?: string };

/** How long a finished change's outcome stays on the card. */
export const CHANGE_NOTE_DAYS = 7;

const ERROR = "rounded-xl bg-[#fbeaea] px-3 py-2 text-sm text-[#8a1f1f]";
const OK = "rounded-xl bg-dv-teal-50 px-3 py-2 text-sm text-dv-teal";

export function TopicRequests({ locale, initial, compact = false }: { locale: Locale; initial: TopicView[] | null; compact?: boolean }) {
  const t = requestsText(locale).topics;
  const router = useRouter();
  const id = useId();
  const [topics, setTopics] = useState<TopicView[]>(initial ?? []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  useEffect(() => setTopics(initial ?? []), [initial]);
  // Before migration 0024 the server has nowhere to keep suggestions: say how to reach us instead.
  if (initial === null) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/dentvideo/topic-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string; topic?: TopicView };
      if (res.ok && body.topic) {
        setTopics((list) => [body.topic!, ...list]);
        setText("");
        setNote({ kind: "ok", text: body.message ?? t.sent });
        router.refresh();
      } else setNote({ kind: "error", text: body.error ?? t.errors.unavailable });
    } catch {
      setNote({ kind: "error", text: t.errors.unavailable });
    }
    setBusy(false);
  }

  async function withdraw(topicId: string) {
    const res = await fetch(`/api/dentvideo/topic-requests/${topicId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setTopics((list) => list.filter((x) => x.id !== topicId));
  }

  const length = [...text].length;
  return (
    <section aria-labelledby={`${id}-title`} className={compact ? "" : "dv-card p-5 sm:p-6"}>
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-semibold text-dv-ink">
        <Lightbulb className="h-5 w-5 shrink-0 text-dv-teal" aria-hidden="true" />
        {t.title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-dv-body">{t.lead}</p>
      <form onSubmit={send} className="mt-4">
        <label htmlFor={`${id}-text`} className="block text-sm font-medium text-dv-ink">
          {t.label}
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id={`${id}-text`}
            type="text"
            dir="auto"
            value={text}
            maxLength={TOPIC_MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            aria-describedby={`${id}-count`}
            className="dv-field min-w-0 flex-1 text-sm"
          />
          <button type="submit" disabled={busy || length < 3} className="dv-btn dv-btn-primary shrink-0 px-5 py-2.5 text-sm">
            {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? t.sending : t.submit}
          </button>
        </div>
        <p id={`${id}-count`} className="mt-1 text-xs tabular-nums text-dv-muted">
          {length}/{TOPIC_MAX}
        </p>
      </form>
      {note && (
        <p role={note.kind === "error" ? "alert" : "status"} className={`mt-2 ${note.kind === "error" ? ERROR : OK}`}>
          {note.text}
        </p>
      )}
      {topics.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-dv-ink">{t.listTitle}</h3>
          <ul className="mt-2 divide-y divide-dv-line rounded-2xl bg-white/70 ring-1 ring-inset ring-dv-line">
            {topics.slice(0, 12).map((x) => (
              <li key={x.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="text-start font-medium text-dv-ink [overflow-wrap:anywhere]">{x.text}</p>
                  <p className={`mt-0.5 text-xs ${x.status === "refused" ? "text-[#7a4b00]" : "text-dv-muted"}`}>
                    {t.status[x.status]}
                    {x.status === "used" && x.week_of ? ` · ${fillRequests(t.usedIn, { date: weekLabelDate(x.week_of, locale) })}` : ""}
                  </p>
                  {x.status === "refused" && x.reason && <p className="mt-0.5 text-xs text-dv-body">{t.reasons[x.reason]}</p>}
                </div>
                {x.status === "pending" && (
                  <button type="button" onClick={() => void withdraw(x.id)} aria-label={`${t.withdraw}: ${x.text}`} title={t.withdraw} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dv-muted hover:bg-dv-sand hover:text-dv-ink">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <HelpLink locale={locale} id="topics" className="mt-2" />
    </section>
  );
}

/** A change still running shows on the card as "updating"; a finished one says what happened, once. */
export function ChangeNote({ locale, change, approval }: { locale: Locale; change?: ChangeView; approval?: string }) {
  if (!change) return null;
  const t = requestsText(locale).change;
  if (change.status === "queued" || change.status === "working") return <p className="mt-2 text-sm text-dv-body">{t.status[change.status]}</p>;
  // An outcome is news for a week; a changed video's note goes once it is decided on.
  const at = Date.parse(change.at ?? "");
  if (Number.isFinite(at) && Date.now() - at > CHANGE_NOTE_DAYS * 86_400_000) return null;
  if (change.status === "done") return approval === "pending" ? <p className="mt-2 text-sm font-medium text-dv-teal">{t.status.done}</p> : null;
  return (
    <p className="mt-2 text-sm text-[#7a4b00]">
      <span className="font-semibold">{t.status[change.status]}.</span> {change.reason ? t.reasons[change.reason] : ""}
    </p>
  );
}

export function ChangeRequest({ locale, itemId, onQueued }: { locale: Locale; itemId: string; onQueued: () => void }) {
  const t = requestsText(locale).change;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) area.current?.focus();
  }, [open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/dentvideo/items/${itemId}/change`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string; left?: number };
      if (res.ok) {
        setOpen(false);
        setNote("");
        setMessage({ kind: "ok", text: `${t.status.queued}. ${fillRequests(t.left, { n: body.left ?? 0, max: CHANGES_PER_WEEK })}` });
        onQueued();
      } else setMessage({ kind: "error", text: body.error ?? t.errors.unavailable });
    } catch {
      setMessage({ kind: "error", text: t.errors.unavailable });
    }
    setBusy(false);
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="-ms-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          {t.button}
        </button>
      ) : (
        <form onSubmit={send} className="mt-2 rounded-2xl bg-dv-sand/60 p-4 ring-1 ring-inset ring-dv-line">
          <p className="font-semibold text-dv-ink">{t.title}</p>
          <p className="mt-1 text-sm text-dv-body">{t.lead}</p>
          <label htmlFor={`${id}-note`} className="mt-3 block text-sm font-medium text-dv-ink">
            {t.label}
          </label>
          <textarea ref={area} id={`${id}-note`} dir="auto" rows={3} maxLength={CHANGE_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.placeholder} className="dv-field resize-none text-sm" />
          <p className="mt-1 text-xs tabular-nums text-dv-muted">
            {[...note].length}/{CHANGE_NOTE_MAX}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="dv-btn dv-btn-secondary px-5 py-2.5 text-sm">
              {t.cancel}
            </button>
            <button type="submit" disabled={busy || [...note].length < 3} className="dv-btn dv-btn-primary flex-1 px-5 py-2.5 text-sm">
              {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {busy ? t.sending : t.submit}
            </button>
          </div>
          <HelpLink locale={locale} id="wrong-video" className="mt-2" />
        </form>
      )}
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-2 ${message.kind === "error" ? ERROR : OK}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** "Download subtitles (.srt)": the narration, timed, for YouTube and Facebook (lib/dentvid/subtitles.ts). */
export function SubtitlesLink({ locale, itemId, className = "" }: { locale: Locale; itemId: string; className?: string }) {
  const t = requestsText(locale).subtitles;
  return (
    <p className={className}>
      <a href={`/api/dentvideo/items/${itemId}/subtitles?format=srt`} download className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
        <Captions className="h-4 w-4" aria-hidden="true" />
        {t.download}
      </a>
      <span className="block text-xs text-dv-muted">{t.hint}</span>
    </p>
  );
}

/** The same download for a page that has the file's text but no session (the email's share page). */
export function SubtitlesFileButton({ locale, title, srt }: { locale: Locale; title: string; srt: string }) {
  const t = requestsText(locale).subtitles;
  function save() {
    const url = URL.createObjectURL(new Blob([srt], { type: "application/x-subrip;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = videoFileName(title).replace(/\.mp4$/, ".srt");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return (
    <p className="mt-2">
      <button type="button" onClick={save} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
        <Captions className="h-4 w-4" aria-hidden="true" />
        {t.download}
      </button>
      <span className="block text-xs text-dv-muted">{t.hint}</span>
    </p>
  );
}

/** A cancelled plan: until when the library stays, and that it goes after that. */
export function RetentionNotice({ locale, endedAt, deleteOn }: { locale: Locale; endedAt: string; deleteOn: string }) {
  const t = requestsText(locale).retention;
  const date = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long", year: "numeric" }).format(d);
  };
  return (
    <div role="status" className="rounded-xl bg-[#fdf6ea] px-4 py-3 text-sm text-[#5c4a2a] ring-1 ring-inset ring-[#f0dcb5]">
      <p>{fillRequests(t.notice, { ended: date(endedAt), date: date(deleteOn) })}</p>
      <HelpLink locale={locale} id="after-cancel" className="mt-1" />
    </div>
  );
}
