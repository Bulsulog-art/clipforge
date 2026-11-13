"use client";

import { useState } from "react";
import { AlertTriangle, CalendarClock, CircleCheck, Download, Loader2, Share2 } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { postingText } from "@/content/dentvideo-posting";
import { appText, fmt } from "@/content/dentvideo-app";
import type { PostView } from "@/lib/dentvid/post-link";
import { CaptionTabs, useSaveAndCopy } from "./share-kit";

/**
 * The page the email's "Approve & share" opens (dentvideo.com/post): one
 * video, one tap to approve it, save it and copy its caption, then a tick
 * when it is posted. No login — the signed link is the key (post-link.ts).
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
  const share = useSaveAndCopy({
    videoUrl: item.videoUrl,
    title: item.title,
    text: item.texts?.instagram ?? "",
    prefetch: true,
    labels: { sharedHint: p.sharedHint, downloadedHint: p.downloadedHint, failed: t.shareFailed },
  });

  const call = (action: "approve" | "posted", on?: boolean) =>
    fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: token, v: item.id, action, on }), keepalive: true })
      .then((r) => r.ok)
      .catch(() => false);

  function go() {
    void share.run(
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
    );
  }

  async function tick() {
    const next = !posted;
    setPosted(next);
    if (!(await call("posted", next))) setPosted(!next);
  }

  const label = share.busy ? t.preparing : share.again ? t.tapAgain : approval === "pending" ? p.approveSaveCopy : share.method === "download" ? p.downloadAndCopy : p.saveAndCopy;

  return (
    <section>
      <h1 className="text-xl font-semibold leading-tight text-dv-ink">{p.page.title}</h1>
      <p className="mt-1 text-sm text-dv-body">{approval === "pending" ? p.page.pendingLead : p.page.approvedLead}</p>
      <div className="mt-3 overflow-hidden rounded-2xl bg-black">
        <video src={item.videoUrl} poster={item.thumbUrl} controls playsInline preload="metadata" aria-label={item.title} className="mx-auto aspect-[9/16] max-h-[42dvh] w-auto object-contain" />
      </div>
      <h2 className="mt-3 font-semibold text-dv-ink [overflow-wrap:anywhere]">{item.title}</h2>
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
      {item.texts && <CaptionTabs texts={item.texts} locale={locale} />}
      {approval === "approved" && (
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
