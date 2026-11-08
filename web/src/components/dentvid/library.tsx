"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt, type AppText } from "@/content/dentvideo-app";

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
};

const STATUS_CLS: Record<LibraryItem["status"], string> = {
  ready: "bg-[#e6efed] text-[#0f5c5c]",
  flagged: "bg-[#fdf1dc] text-[#7a4b00]",
  rejected: "bg-[#f1ece4] text-dv-muted",
  queued: "bg-[#f1ece4] text-dv-body",
  working: "bg-[#f1ece4] text-dv-body",
  failed: "bg-[#fbeaea] text-[#8a1f1f]",
};

export function Library({
  items,
  canStartWeek,
  locale,
  locked = false,
}: {
  items: LibraryItem[];
  canStartWeek: boolean;
  locale: Locale;
  /** No active plan (not paid yet, paused or cancelled): new videos wait for a plan. */
  locked?: boolean;
}) {
  const text = appText(locale);
  const t = text.library;
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  async function startWeek() {
    setStarting(true);
    setMessage(null);
    const res = await fetch("/api/dentvideo/week", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setStarting(false);
    setMessage(res.ok ? t.started : body.error ?? text.errors.couldNotStart);
  }

  // Most weeks every ready video is fine; one tap approves them all. Flagged
  // ones are left out on purpose — they need the dentist's eyes.
  const approvable = items.filter((i) => i.status === "ready" && i.approval === "pending" && i.videoUrl);
  const [approving, setApproving] = useState(false);
  async function approveAll() {
    setApproving(true);
    await Promise.all(
      approvable.map((i) =>
        fetch(`/api/dentvideo/items/${i.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ approval: "approved" }) }),
      ),
    );
    setApproving(false);
    router.refresh();
  }

  const visible = items.filter((i) => showRejected || i.status !== "rejected");
  const rejectedCount = items.filter((i) => i.status === "rejected").length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {locked ? (
          <a href="#plans" className="dv-btn dv-btn-primary px-6 py-3">
            {text.billing.needPlan}
          </a>
        ) : (
          <>
            <button
              onClick={startWeek}
              disabled={starting || !canStartWeek}
              className="dv-btn dv-btn-primary px-6 py-3"
            >
              {starting ? t.starting : canStartWeek ? t.makeWeek : t.weekMade}
            </button>
            <a href="/dentvideo/app/record" className="dv-btn dv-btn-secondary px-6 py-3 !text-dv-teal">
              {t.uploadOwn}
            </a>
          </>
        )}
        {approvable.length > 1 && (
          <button onClick={approveAll} disabled={approving} className="dv-btn px-6 py-3 bg-dv-teal-50 text-dv-teal ring-1 ring-dv-teal/40 hover:bg-dv-teal-100">
            {fmt(t.approveAll, { n: String(approvable.length) })}
          </button>
        )}
        <button onClick={() => router.refresh()} className="text-sm text-dv-body underline-offset-4 hover:underline">
          {t.refresh}
        </button>
      </div>
      {message && <p className="mt-4 rounded-xl bg-[#e6efed] px-4 py-3 text-sm text-[#0f5c5c]">{message}</p>}

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d9d1c3] p-10 text-center text-dv-body">{t.empty}</div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} t={t} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}
      {rejectedCount > 0 && (
        <button onClick={() => setShowRejected(!showRejected)} className="mt-6 text-sm text-dv-body underline-offset-4 hover:underline">
          {showRejected ? t.hideRejected : fmt(t.showRejected, { n: rejectedCount })}
        </button>
      )}
    </div>
  );
}

function ItemCard({ item, t, onChanged }: { item: LibraryItem; t: AppText["library"]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareHint, setShareHint] = useState(false);

  // Posting is the step dentists skip. On a phone this opens the share sheet
  // with the video attached (Instagram, TikTok, WhatsApp…) and the caption
  // already on the clipboard to paste; elsewhere it downloads the file.
  async function share() {
    if (!item.videoUrl) return;
    setSharing(true);
    try {
      await navigator.clipboard?.writeText(post).catch(() => {});
      const blob = await (await fetch(item.videoUrl)).blob();
      const file = new File([blob], "dentvideo.mp4", { type: "video/mp4" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: post });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dentvideo.mp4";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      setShareHint(true);
      setTimeout(() => setShareHint(false), 6000);
    } catch (e) {
      if ((e as Error).name !== "AbortError") window.open(item.videoUrl, "_blank");
    } finally {
      setSharing(false);
    }
  }

  async function decide(approval: "approved" | "rejected" | "pending") {
    setBusy(true);
    await fetch(`/api/dentvideo/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approval }),
    });
    setBusy(false);
    onChanged();
  }

  const post = [item.caption ?? "", (item.hashtags ?? []).map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");

  return (
    <li className="dv-card flex flex-col overflow-hidden">
      {item.videoUrl ? (
        <video src={item.videoUrl} poster={item.thumbUrl} controls playsInline preload="none" className="aspect-[9/16] w-full bg-[#14211f] object-cover" />
      ) : (
        <div className="flex aspect-[9/16] w-full items-center justify-center bg-[#f1ece4] px-6 text-center text-sm text-dv-muted">
          {item.status === "rejected" ? t.notMade : t.noVideo}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLS[item.status]}`}>
          {item.approval === "approved" ? t.approvedByYou : item.approval === "rejected" ? t.declinedByYou : t.status[item.status]}
        </span>
        <h3 className="font-semibold leading-snug">{item.title}</h3>
        <p className="text-xs text-dv-muted">
          {item.kind === "recording" ? t.fromRecording : t.madeForYou} · {fmt(t.weekOf, { date: item.week_of })}
        </p>

        {item.findings.length > 0 && (
          <details className="rounded-xl bg-[#fdf6ea] p-3 text-sm" open={item.status === "flagged"}>
            <summary className="cursor-pointer font-medium text-[#7a4b00]">
              {item.status === "rejected" ? t.whyNotMade : t.whatToCheck}
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[#5c4a2a]">
              {item.findings.slice(0, 6).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </details>
        )}

        {item.caption && (
          <details className="text-sm">
            <summary className="cursor-pointer text-[#0f5c5c]">{t.captionAndHashtags}</summary>
            <p className="mt-2 whitespace-pre-line text-[#33423f]">{post}</p>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(post);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="mt-2 text-xs text-[#0f5c5c] underline-offset-4 hover:underline"
            >
              {copied ? t.copied : t.copyCaption}
            </button>
          </details>
        )}

        {shareHint && <p className="rounded-xl bg-[#e6efed] px-3 py-2 text-sm text-[#0f5c5c]" role="status">{t.shareHint}</p>}

        {item.status !== "rejected" && item.videoUrl && (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {item.approval !== "approved" ? (
              <button disabled={busy} onClick={() => decide("approved")} className="dv-btn dv-btn-primary px-4 py-2 text-sm">
                {t.approve}
              </button>
            ) : (
              <>
                <button disabled={sharing} onClick={share} className="dv-btn dv-btn-primary px-4 py-2 text-sm">
                  {t.share}
                </button>
                <a href={item.videoUrl} download className="dv-btn dv-btn-secondary px-4 py-2 text-sm">
                  {t.download}
                </a>
              </>
            )}
            {item.approval !== "rejected" ? (
              <button disabled={busy} onClick={() => decide("rejected")} className="dv-btn dv-btn-secondary px-4 py-2 text-sm">
                {t.decline}
              </button>
            ) : (
              <button disabled={busy} onClick={() => decide("pending")} className="dv-btn dv-btn-secondary px-4 py-2 text-sm">
                {t.undo}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
