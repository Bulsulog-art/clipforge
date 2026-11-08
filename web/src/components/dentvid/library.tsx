"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const STATUS: Record<LibraryItem["status"], { label: string; cls: string }> = {
  ready: { label: "Ready for your review", cls: "bg-[#e6efed] text-[#0f5c5c]" },
  flagged: { label: "Needs your attention", cls: "bg-[#fdf1dc] text-[#7a4b00]" },
  rejected: { label: "Not made — see why", cls: "bg-[#f1ece4] text-[#6b7a77]" },
  queued: { label: "Queued", cls: "bg-[#f1ece4] text-[#4a5a57]" },
  working: { label: "In progress", cls: "bg-[#f1ece4] text-[#4a5a57]" },
  failed: { label: "Failed", cls: "bg-[#fbeaea] text-[#8a1f1f]" },
};

export function Library({ items, canStartWeek }: { items: LibraryItem[]; canStartWeek: boolean }) {
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
    setMessage(res.ok ? "This week's videos are being made. It takes about 15 minutes — they will appear here." : body.error ?? "Could not start.");
  }

  const visible = items.filter((i) => showRejected || i.status !== "rejected");
  const rejectedCount = items.filter((i) => i.status === "rejected").length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={startWeek}
          disabled={starting || !canStartWeek}
          className="rounded-full bg-[#0f5c5c] px-6 py-3 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a] disabled:opacity-60"
        >
          {starting ? "Starting…" : canStartWeek ? "Make this week's videos" : "This week's videos are made"}
        </button>
        <a href="/dentvideo/app/record" className="rounded-full border border-[#0f5c5c] px-6 py-3 font-medium text-[#0f5c5c] transition hover:bg-[#e6efed]">
          Upload your own recording
        </a>
        <button onClick={() => router.refresh()} className="text-sm text-[#4a5a57] underline-offset-4 hover:underline">
          Refresh
        </button>
      </div>
      {message && <p className="mt-4 rounded-xl bg-[#e6efed] px-4 py-3 text-sm text-[#0f5c5c]">{message}</p>}

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d9d1c3] p-10 text-center text-[#4a5a57]">
          No videos yet. Press “Make this week's videos”, or upload a short recording of yourself.
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}
      {rejectedCount > 0 && (
        <button onClick={() => setShowRejected(!showRejected)} className="mt-6 text-sm text-[#4a5a57] underline-offset-4 hover:underline">
          {showRejected ? "Hide" : "Show"} {rejectedCount} topic{rejectedCount === 1 ? "" : "s"} we did not make, and why
        </button>
      )}
    </div>
  );
}

function ItemCard({ item, onChanged }: { item: LibraryItem; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const status = STATUS[item.status];

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
    <li className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e1d5] bg-white shadow-sm">
      {item.videoUrl ? (
        <video src={item.videoUrl} poster={item.thumbUrl} controls playsInline preload="none" className="aspect-[9/16] w-full bg-[#14211f] object-cover" />
      ) : (
        <div className="flex aspect-[9/16] w-full items-center justify-center bg-[#f1ece4] px-6 text-center text-sm text-[#6b7a77]">
          {item.status === "rejected" ? "This topic was not made." : "No video file."}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${status.cls}`}>
          {item.approval === "approved" ? "Approved by you" : item.approval === "rejected" ? "Declined by you" : status.label}
        </span>
        <h3 className="font-semibold leading-snug">{item.title}</h3>
        <p className="text-xs text-[#6b7a77]">{item.kind === "recording" ? "From your recording" : "Made for you"} · week of {item.week_of}</p>

        {item.findings.length > 0 && (
          <details className="rounded-xl bg-[#fdf6ea] p-3 text-sm" open={item.status === "flagged"}>
            <summary className="cursor-pointer font-medium text-[#7a4b00]">
              {item.status === "rejected" ? "Why we did not make it" : "What to check before posting"}
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
            <summary className="cursor-pointer text-[#0f5c5c]">Caption and hashtags</summary>
            <p className="mt-2 whitespace-pre-line text-[#33423f]">{post}</p>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(post);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="mt-2 text-xs text-[#0f5c5c] underline-offset-4 hover:underline"
            >
              {copied ? "Copied" : "Copy caption"}
            </button>
          </details>
        )}

        {item.status !== "rejected" && item.videoUrl && (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {item.approval !== "approved" ? (
              <button disabled={busy} onClick={() => decide("approved")} className="rounded-full bg-[#0f5c5c] px-4 py-2 text-sm font-medium text-[#f5efe6] hover:bg-[#0c4a4a] disabled:opacity-60">
                Approve
              </button>
            ) : (
              <a href={item.videoUrl} download className="rounded-full bg-[#0f5c5c] px-4 py-2 text-sm font-medium text-[#f5efe6] hover:bg-[#0c4a4a]">
                Download
              </a>
            )}
            {item.approval !== "rejected" ? (
              <button disabled={busy} onClick={() => decide("rejected")} className="rounded-full border border-[#d9d1c3] px-4 py-2 text-sm hover:bg-[#f1ece4] disabled:opacity-60">
                Decline
              </button>
            ) : (
              <button disabled={busy} onClick={() => decide("pending")} className="rounded-full border border-[#d9d1c3] px-4 py-2 text-sm hover:bg-[#f1ece4] disabled:opacity-60">
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
