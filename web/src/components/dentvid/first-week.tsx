"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, RotateCcw } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { firstWeekStuck, type FirstWeekJob } from "@/lib/dentvid/first-week-state";

/**
 * Right after payment: "your first week is being made". The payment webhook
 * activates the plan and queues the week; this page refreshes itself until
 * the videos are in the library. Once the plan shows as active it also asks
 * for the week once more — idempotent (same job id), and a safety net if the
 * webhook could not reach the queue.
 */
export function FirstWeek({
  locale,
  paid,
  pollMs = 10_000,
  delay = null,
  week,
  job,
}: {
  locale: Locale;
  paid: boolean;
  pollMs?: number;
  /** The first week's run is being retried / is delayed: one calm, honest line. */
  delay?: "retrying" | "delayed" | null;
  /** The week being made (YYYY-MM-DD): this browser remembers when it first showed the card for it. */
  week?: string;
  /** The week's job as the server saw it (state null = not in the queue; undefined = the queue could not be asked). */
  job?: FirstWeekJob;
}) {
  const t = appText(locale).onboarding;
  const h = appText(locale).home;
  const router = useRouter();
  const asked = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), paid ? pollMs : Math.min(pollMs, 4_000));
    return () => window.clearInterval(id);
  }, [router, paid, pollMs]);

  useEffect(() => {
    if (!paid || asked.current) return;
    asked.current = true;
    void fetch("/api/dentvideo/week", { method: "POST" }).catch(() => {});
  }, [paid]);

  // Every attempt failed ("delayed"): the clinic may queue it again (api/dentvideo/week re-queues a failed run).
  const [retrying, setRetrying] = useState(false);
  async function retry() {
    setRetrying(true);
    await fetch("/api/dentvideo/week", { method: "POST" }).catch(() => null);
    // A fresh wait starts now: the "try again" goes away until it is slow again.
    seenSince.current = Date.now();
    remember(week, seenSince.current);
    setStuck(false);
    router.refresh();
    setRetrying(false);
  }

  // Much longer than the ~15 minutes promised, or the job went missing: a calm
  // note and the same "try again" (lib/dentvid/onboarding firstWeekStuck).
  // Worked out after mount (it depends on the clock and this browser's memory).
  const seenSince = useRef<number | null>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (seenSince.current === null) seenSince.current = recall(week) ?? remember(week, Date.now());
    const check = () => setStuck(firstWeekStuck({ paid, job, seenSince: seenSince.current ?? Date.now(), now: Date.now() }));
    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [paid, job, week]);
  const showSlow = paid && stuck && delay !== "delayed";

  const steps: { key: keyof typeof t.firstWeekSteps; state: "done" | "now" | "next" }[] = [
    { key: "paid", state: paid ? "done" : "now" },
    { key: "writing", state: paid ? "now" : "next" },
    { key: "rendering", state: paid ? "now" : "next" },
    { key: "email", state: "next" },
  ];

  return (
    <section aria-live="polite" className="dv-card relative isolate overflow-hidden p-6 sm:p-10">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10 opacity-70" />
      <div aria-hidden="true" className="absolute -end-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#cfe6e0] opacity-70 blur-3xl" />
      <p className="inline-flex items-center gap-2 rounded-full bg-dv-teal-50 px-3 py-1 text-xs font-semibold text-dv-teal ring-1 ring-inset ring-dv-teal/15">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dv-teal opacity-50 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-dv-teal" />
        </span>
        {paid ? t.firstWeekStill : t.firstWeekActivating}
      </p>
      <h1 className="dv-display mt-5 text-balance text-[2.5rem] leading-[1.04] text-dv-ink sm:text-[3.25rem]">{t.firstWeekTitle}</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-dv-body">{t.firstWeekLead}</p>
      {paid && delay && (
        <div role="status" className="mt-4 flex max-w-2xl flex-col gap-3 rounded-xl bg-dv-sand px-4 py-3 text-sm leading-relaxed text-dv-body ring-1 ring-inset ring-dv-line sm:flex-row sm:items-center sm:justify-between">
          <p>{delay === "delayed" ? h.delayDelayed : h.delayRetrying}</p>
          {delay === "delayed" && (
            <button type="button" onClick={retry} disabled={retrying} className="dv-btn dv-btn-secondary shrink-0 px-4 py-2 text-sm !text-dv-teal">
              {retrying ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RotateCcw className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />}
              {h.retryNow}
            </button>
          )}
        </div>
      )}
      {showSlow && (
        <div role="status" data-testid="first-week-slow" className="mt-4 flex max-w-2xl flex-col gap-3 rounded-xl bg-dv-sand px-4 py-3 text-sm leading-relaxed text-dv-body ring-1 ring-inset ring-dv-line sm:flex-row sm:items-center sm:justify-between">
          <p>{t.firstWeekSlow}</p>
          <button type="button" onClick={retry} disabled={retrying} className="dv-btn dv-btn-secondary shrink-0 px-4 py-2 text-sm !text-dv-teal">
            {retrying ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RotateCcw className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />}
            {h.retryNow}
          </button>
        </div>
      )}
      <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ key, state }) => (
          <li
            key={key}
            className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${state === "done" ? "bg-dv-teal-50 ring-dv-teal/20" : state === "now" ? "bg-white ring-dv-line" : "bg-white/60 ring-dv-line"}`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                state === "done" ? "bg-dv-teal text-white" : state === "now" ? "bg-white ring-2 ring-dv-teal" : "bg-white text-dv-muted ring-1 ring-dv-line"
              }`}
            >
              {state === "done" ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
              ) : key === "email" ? (
                <Mail className="h-3 w-3" aria-hidden="true" />
              ) : state === "now" ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-dv-teal motion-reduce:animate-none" />
              ) : null}
            </span>
            <span className={`text-sm leading-snug ${state === "next" ? "text-dv-muted" : "font-medium text-dv-ink"}`}>{t.firstWeekSteps[key]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** When this browser first showed the card for this week (per-browser convenience; the clock fallback is the mount). */
const SEEN_KEY = "dv-first-week-seen";
function recall(week: string | undefined): number | null {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const v = raw ? (JSON.parse(raw) as { week?: string; at?: number }) : null;
    return v && v.week === (week ?? "") && typeof v.at === "number" ? v.at : null;
  } catch {
    return null;
  }
}
function remember(week: string | undefined, at: number): number {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify({ week: week ?? "", at }));
  } catch {
    // storage blocked: the mount time is used
  }
  return at;
}
