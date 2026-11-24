"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarClock, CircleCheck, Download, Loader2, Share2 } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { postingText } from "@/content/dentvideo-posting";
import { appText, fmt } from "@/content/dentvideo-app";
import type { PostView } from "@/lib/dentvid/post-link";
import { deviceKind } from "@/lib/dentvid/events-client";
import { isInternalBrowser } from "@/lib/dentvid/internal-flag";
import { CaptionTabs, useSaveAndCopy, type ShareOutcome } from "./share-kit";
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

/** Where the page stands: what the server holds, and where "Posted it?" is. */
export type PostState = { approval: "pending" | "approved"; posted: boolean; asked: boolean; marked: boolean; error: string | null };

/**
 * What shows for a state. "Posted it?" asks only after a share or download
 * went through, for an approved video not ticked yet; while it asks, its
 * button is the tick, so the plain tick lower down is hidden. Pure.
 */
export function postControls(s: PostState): { ask: boolean; tick: boolean; done: boolean } {
  const ask = s.asked && !s.marked && s.approval === "approved" && !s.posted;
  return { ask, tick: s.approval === "approved" && !ask, done: s.marked && s.posted };
}

export type PostCall = (action: "approve" | "posted" | "shared", extra?: Record<string, unknown>) => Promise<boolean>;

/** The page's calls to /api/dentvideo/post: true when the server took it. keepalive, so a share sheet taking the page away does not drop it. */
export function postCaller(endpoint: string, token: string, itemId: string, send: typeof fetch = (...a) => fetch(...a)): PostCall {
  return (action, extra = {}) =>
    send(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: token, v: itemId, action, ...extra }), keepalive: true })
      .then((r) => r.ok)
      .catch(() => false);
}

/**
 * The page's three buttons, apart from React (the tests drive them with a
 * stubbed share kit and server):
 *   tap   approves a pending video inside the tap, then shares or downloads.
 *         Only a share or download that went through is counted ("shared",
 *         with the device, and `internal` for a browser flagged as ours) and
 *         asks "Posted it?"; a cancelled or failed one sends and asks nothing.
 *   tick  the plain posted toggle.
 *   yes   "Yes, mark as posted": the tick, then the thank-you.
 * A tick the server did not take is undone and says so; "Posted it?" stays.
 */
export function postActions(deps: {
  get: () => PostState;
  set: (patch: Partial<PostState>) => void;
  run: (before?: () => void) => Promise<ShareOutcome>;
  call: PostCall;
  device: () => string | undefined;
  internal: () => boolean;
  failed: string;
}) {
  async function postedTo(next: boolean): Promise<boolean> {
    deps.set({ posted: next });
    if (await deps.call("posted", { on: next })) {
      deps.set({ error: null });
      return true;
    }
    deps.set({ posted: !next, error: deps.failed });
    return false;
  }
  return {
    async tap(): Promise<ShareOutcome> {
      const before =
        deps.get().approval === "pending"
          ? () => {
              // Approve on the tap itself; the share sheet opens in the same tap.
              deps.set({ approval: "approved" });
              void deps.call("approve").then((ok) => {
                if (!ok) deps.set({ approval: "pending", error: deps.failed });
              });
            }
          : undefined;
      const method = await deps.run(before);
      if (!method) return null;
      void deps.call("shared", { method, device: deps.device(), ...(deps.internal() ? { internal: true } : {}) });
      deps.set({ asked: true });
      return method;
    },
    tick: () => postedTo(!deps.get().posted),
    async yes(): Promise<void> {
      if (await postedTo(true)) deps.set({ marked: true });
    },
  };
}

function Ready({ view, token, appUrl, endpoint }: { view: Extract<PostView, { state: "ready" }>; token: string; appUrl: string; endpoint: string }) {
  const locale: Locale = view.locale;
  const p = postingText(locale);
  const t = appText(locale).library;
  const item = view.item;
  // `asked`: "Posted it?" after a share that went through; `marked` once it was answered with the tick.
  const [state, setState] = useState<PostState>({ approval: item.approval, posted: item.posted, asked: false, marked: false, error: null });
  const { approval, posted, error, marked } = state;
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
  const actions = postActions({
    get: () => state,
    set: (patch) => setState((prev) => ({ ...prev, ...patch })),
    run: share.run,
    call: postCaller(endpoint, token, item.id),
    device: () => deviceKind(),
    internal: () => isInternalBrowser(),
    failed: p.page.approveFailed,
  });

  // The button just pressed is gone: keep focus on its answer, not lost on the page.
  useEffect(() => {
    if (marked) done.current?.focus();
  }, [marked]);

  const controls = postControls(state);
  const ask = controls.ask;

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
      <button type="button" disabled={share.busy} onClick={() => void actions.tap()} className="dv-btn dv-btn-primary mt-4 w-full px-5 py-3.5 text-base">
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
            <button type="button" onClick={() => void actions.yes()} className="dv-btn dv-btn-primary px-4 py-2.5 text-sm">
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              {p.page.postedYes}
            </button>
          </div>
        )}
        {controls.done && (
          <p ref={done} tabIndex={-1} className="mt-3 flex items-center gap-2 rounded-xl bg-dv-teal-50 px-3 py-2 text-sm font-medium text-dv-teal outline-none">
            <CircleCheck className="h-4 w-4 shrink-0 fill-dv-teal text-white" aria-hidden="true" />
            {p.page.postedDone}
          </p>
        )}
      </div>
      {item.srt && <SubtitlesFileButton locale={locale} title={item.title} srt={item.srt} />}
      {item.texts && <CaptionTabs texts={item.texts} locale={locale} />}
      {/* While "Posted it?" asks, its button is the tick: one control, not two. */}
      {controls.tick && (
        <button
          type="button"
          aria-pressed={posted}
          onClick={() => void actions.tick()}
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
