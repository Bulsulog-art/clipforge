"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarClock, CircleCheck, Download, Loader2, Share2 } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { postingText } from "@/content/dentvideo-posting";
import { appText, fmt } from "@/content/dentvideo-app";
import type { PostView } from "@/lib/dentvid/post-link";
import { deviceKind } from "@/lib/dentvid/events-client";
import { CaptionTabs, useSaveAndCopy } from "./share-kit";
import { SubtitlesFileButton } from "./clinic-requests";

/**
 * The page the email's "Approve & share" opens (dentvideo.com/post): one
 * video, one tap to approve it, save it and copy its caption, then a tick
 * when it is posted. No login — the signed link is the key (post-link.ts).
 *
 * A share or download that went through is counted on the server, with the
 * clinic, once per video ({action:"shared"}); the page sends no browser
 * event of its own. Right after it, "Posted it?" asks for the tick, so the
 * week's reminder and the monthly summary know the video went out.
 */
export function PostNow({ view, token, appUrl, ttlDays, endpoint = "/api/dentvideo/post" }: { view: PostView; token: string; appUrl: string; ttlDays: number; endpoint?: string }) {
  const locale = view.locale;
  const p = postingText(locale);
  const dir = dirOf(locale);
  return (
    <main dir={dir} lang={locale} className="mx-auto max-w-md px-4 pb-10 pt-2">
      {view.state === "ready" ? (
        <Ready view={view} token={token} appUrl={appUrl} endpoint={endpoint} />
      ) : (
        <section className="dv-card p-6">
          <h1 className="text-xl font-semibold text-dv-ink">{view.state === "invalid" ? p.page.invalidTitle : p.page.nothingTitle}</h1>
          <p className="mt-2 text-dv-body">{view.state === "invalid" ? fmt(p.page.invalidBody, { days: ttlDays }) : p.page.nothingBody}</p>
          <a href={appUrl} className="dv-btn dv-btn-primary mt-5 w-full px-5 py-3">
            {p.page.openApp}
          </a>
        </section>
      )}
    </main>
  );
}

function Ready({ view, token, appUrl, endpoint }: { view: Extract<PostView, { state: "ready" }>; token: string; appUrl: string; endpoint: string }) {
  const locale: Locale = view.locale;
  const p = postingText(locale);
  const t = appText(locale).library;
  const item = view.item;
  const [approval, setApproval] = useState(item.approval);
  const [posted, setPosted] = useState(item.posted);
  const [error, setError] = useState<string | null>(null);
  // "Posted it?" after a share that went through; `marked` once it was answered with the tick.
  const [asked, setAsked] = useState(false);
  const [marked, setMarked] = useState(false);
  const done = useRef<HTMLParagraphElement>(null);
  const share = useSaveAndCopy({
    videoUrl: item.videoUrl,
    title: item.title,
    text: item.texts?.instagram ?? "",
    prefetch: true,
    // Counted on the server instead (action "shared"), with the clinic the link belongs to.
    track: false,
    labels: { sharedHint: p.sharedHint, downloadedHint: p.downloadedHint, failed: t.shareFailed },
  });

  const call = (action: "approve" | "posted" | "shared", extra: Record<string, unknown> = {}) =>
    fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: token, v: item.id, action, ...extra }), keepalive: true })
      .then((r) => r.ok)
      .catch(() => false);

  function go() {
    void share
      .run(
        approval === "pending"
          ? () => {
              // Approve on the tap itself; the share sheet opens in the same tap.
              setApproval("approved");
              void call("approve").then((ok) => {
                if (!ok) {
                  setApproval("pending");
                  setError(p.page.approveFailed);
                }
              });
            }
          : undefined,
      )
      .then((method) => {
        if (!method) return;
        void call("shared", { method, device: deviceKind() });
        setAsked(true);
      });
  }

  async function setPostedTo(next: boolean): Promise<boolean> {
    setPosted(next);
    if (await call("posted", { on: next })) {
      setError(null);
      return true;
    }
    setPosted(!next);
    setError(p.page.approveFailed);
    return false;
  }

  function tick() {
    void setPostedTo(!posted);
  }

  async function yesPosted() {
    if (await setPostedTo(true)) setMarked(true);
  }

  // The button just pressed is gone: keep focus on its answer, not lost on the page.
  useEffect(() => {
    if (marked) done.current?.focus();
  }, [marked]);

  const ask = asked && !marked && approval === "approved" && !posted;

  const label = share.busy ? t.preparing : share.again ? t.tapAgain : approval === "pending" ? p.approveSaveCopy : share.method === "download" ? p.downloadAndCopy : p.saveAndCopy;

  return (
    <section>
      <h1 className="text-xl font-semibold leading-tight text-dv-ink">{p.page.title}</h1>
      <p className="mt-1 text-sm text-dv-body">{approval === "pending" ? p.page.pendingLead : p.page.approvedLead}</p>
      <div className="mt-3 overflow-hidden rounded-2xl bg-black">
        <video src={item.videoUrl} poster={item.thumbUrl} controls playsInline preload="metadata" aria-label={item.title} className="mx-auto aspect-[9/16] max-h-[42dvh] w-auto object-contain" />
      </div>
      <h2 dir="auto" className="mt-3 font-semibold text-dv-ink [overflow-wrap:anywhere]">{item.title}</h2>
      {item.slot && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-dv-body">
          <CalendarClock className="h-4 w-4 text-dv-teal" aria-hidden="true" />
          {fmt(p.suggested, { slot: item.slot })}
        </p>
      )}
      <button type="button" disabled={share.busy} onClick={go} className="dv-btn dv-btn-primary mt-4 w-full px-5 py-3.5 text-base">
        {share.busy ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : share.method === "download" && approval !== "pending" ? (
          <Download className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        )}
        {label}
      </button>
      {share.note && (
        <p role={share.note.kind === "error" ? "alert" : "status"} className={`mt-2 rounded-xl px-3 py-2 text-sm ${share.note.kind === "error" ? "bg-[#fbeaea] text-[#8a1f1f]" : "bg-dv-teal-50 text-dv-teal"}`}>
          {share.note.text}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-2 rounded-xl bg-[#fbeaea] px-3 py-2 text-sm text-[#8a1f1f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <div aria-live="polite">
        {ask && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl bg-dv-teal-50 px-4 py-3 ring-1 ring-inset ring-dv-teal/20">
            <p className="font-semibold text-dv-ink">{p.page.postedAsk}</p>
            <button type="button" onClick={yesPosted} className="dv-btn dv-btn-primary px-4 py-2.5 text-sm">
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              {p.page.postedYes}
            </button>
          </div>
        )}
        {marked && posted && (
          <p ref={done} tabIndex={-1} className="mt-3 flex items-center gap-2 rounded-xl bg-dv-teal-50 px-3 py-2 text-sm font-medium text-dv-teal outline-none">
            <CircleCheck className="h-4 w-4 shrink-0 fill-dv-teal text-white" aria-hidden="true" />
            {p.page.postedDone}
          </p>
        )}
      </div>
      {item.srt && <SubtitlesFileButton locale={locale} title={item.title} srt={item.srt} />}
      {item.texts && <CaptionTabs texts={item.texts} locale={locale} />}
      {/* While "Posted it?" asks, its button is the tick: one control, not two. */}
      {approval === "approved" && !ask && (
        <button
          type="button"
          aria-pressed={posted}
          onClick={tick}
          className={`dv-btn mt-3 w-full px-5 py-3 ${posted ? "bg-dv-teal-50 text-dv-teal ring-1 ring-inset ring-dv-teal/30" : "dv-btn-secondary"}`}
        >
          <CircleCheck className={`h-5 w-5 ${posted ? "fill-dv-teal text-white" : "text-dv-muted"}`} aria-hidden="true" />
          {posted ? t.post.posted : t.post.markPosted}
        </button>
      )}
      <p className="mt-4 text-xs text-dv-muted">{p.page.approvedNote}</p>
      <a href={appUrl} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
        {p.page.openApp}
      </a>
    </section>
  );
}
