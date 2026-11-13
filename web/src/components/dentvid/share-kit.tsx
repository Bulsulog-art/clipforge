"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { postingText } from "@/content/dentvideo-posting";
import { trackDv } from "@/lib/dentvid/events-client";
import { videoFileName } from "@/lib/dentvid/app-ui";
import { sharePayload, shareMethod, type PostTexts, type ShareMethod } from "@/lib/dentvid/posting";

/**
 * "Save video + copy caption" in one tap, shared by the app's post step and
 * the email's approve-and-share page.
 *
 * Phones that can share a file (iOS Safari, Android Chrome): the caption goes
 * to the clipboard and the share sheet opens with the MP4 — "Save Video",
 * Instagram, TikTok, WhatsApp. A phone only opens the sheet straight after a
 * tap, so the file is fetched ahead (`prefetch`) while the dentist watches;
 * if it is not in yet, the button asks for one more tap. Elsewhere the MP4
 * downloads and the caption is copied.
 */
export function useSaveAndCopy(args: { videoUrl?: string; title: string; text: string; prefetch?: boolean; labels: { sharedHint: string; downloadedHint: string; failed: string } }) {
  const [method, setMethod] = useState<ShareMethod>("download");
  const [busy, setBusy] = useState(false);
  const [again, setAgain] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const file = useRef<File | null>(null);
  const loading = useRef<Promise<File> | null>(null);
  const timer = useRef<number | null>(null);
  const name = videoFileName(args.title);

  useEffect(() => {
    setMethod(shareMethod(typeof navigator === "undefined" ? undefined : navigator, () => new File([new Blob()], "x.mp4", { type: "video/mp4" })));
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function load(): Promise<File> {
    if (file.current) return Promise.resolve(file.current);
    if (!loading.current) {
      loading.current = fetch(args.videoUrl!)
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          file.current = new File([blob], name, { type: blob.type || "video/mp4" });
          return file.current;
        })
        .catch((e) => {
          loading.current = null;
          throw e;
        });
    }
    return loading.current;
  }

  // Fetch the file while the video plays, so the tap can open the share sheet at once.
  useEffect(() => {
    if (!args.prefetch || method !== "share-file" || !args.videoUrl) return;
    const t = window.setTimeout(() => void load().catch(() => {}), 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.prefetch, method, args.videoUrl]);

  function flash(n: { kind: "ok" | "error"; text: string }) {
    setNote(n);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(null), 9000);
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

  /** The one tap. `before` runs first, inside the tap (e.g. approving the video). */
  async function run(before?: () => void) {
    if (!args.videoUrl) return;
    before?.();
    trackDv("video_shared", { props: { method: method === "share-file" ? "share" : "download" } });
    // The clipboard first, while the tap still counts — not awaited, so the share sheet can open in the same tap.
    const hasClipboard = !!args.text && typeof navigator.clipboard?.writeText === "function";
    const copied = hasClipboard ? navigator.clipboard.writeText(args.text).then(() => true, () => false) : Promise.resolve(false);
    if (method === "download") {
      setBusy(true);
      try {
        save(await load());
        await copied;
        flash({ kind: "ok", text: args.labels.downloadedHint });
      } catch {
        window.open(args.videoUrl, "_blank", "noopener");
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
        flash({ kind: "error", text: args.labels.failed });
        return;
      }
      setBusy(false);
    }
    try {
      await navigator.share(sharePayload(f, args.text, hasClipboard));
      setAgain(false);
      flash({ kind: "ok", text: args.labels.sharedHint });
    } catch (e) {
      const n = (e as Error).name;
      if (n === "AbortError") setAgain(false);
      // The file came in after the tap stopped counting: one more tap shares it.
      else if (n === "NotAllowedError") setAgain(true);
      else flash({ kind: "error", text: args.labels.failed });
    }
  }

  async function download() {
    trackDv("video_shared", { props: { method: "download" } });
    if (args.text) await navigator.clipboard?.writeText(args.text).catch(() => {});
    try {
      save(await load());
    } catch {
      window.open(args.videoUrl, "_blank", "noopener");
    }
  }

  return { method, busy, again, note, run, download };
}

/** The Instagram caption and the short TikTok / Shorts line, each with its own copy button. */
export function CaptionTabs({ texts, locale, onCopy }: { texts: PostTexts; locale: Locale; onCopy?: (which: "instagram" | "short") => void }) {
  const p = postingText(locale);
  const [tab, setTab] = useState<"instagram" | "short">("instagram");
  const [copied, setCopied] = useState(false);
  const id = useId();
  const tabs = ["instagram", "short"] as const;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const text = texts[tab];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.(tab);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the text is on screen to copy by hand */
    }
  }

  return (
    <div className="mt-3 rounded-2xl bg-dv-sand/60 px-3 pb-3 pt-2 ring-1 ring-inset ring-dv-line">
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label={p.copy} className="flex gap-1 rounded-full bg-white/70 p-0.5">
          {tabs.map((k, n) => (
            <button
              key={k}
              ref={(el) => {
                refs.current[n] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-${k}`}
              aria-selected={tab === k}
              aria-controls={`${id}-panel`}
              tabIndex={tab === k ? 0 : -1}
              onClick={() => {
                setTab(k);
                setCopied(false);
              }}
              onKeyDown={(e) => {
                const rtl = dirOf(locale) === "rtl";
                const step = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
                if (!step) return;
                e.preventDefault();
                const next = tabs[(n + step + tabs.length) % tabs.length];
                setTab(next);
                refs.current[tabs.indexOf(next)]?.focus();
              }}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold sm:text-sm ${tab === k ? "bg-dv-teal text-white" : "text-dv-body hover:text-dv-ink"}`}
            >
              {k === "instagram" ? p.instagram : p.short}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-dv-teal hover:bg-white">
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span aria-live="polite">{copied ? p.copied : p.copy}</span>
        </button>
      </div>
      <p id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} dir="auto" className="mt-1 max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-dv-body">
        {text}
      </p>
    </div>
  );
}
