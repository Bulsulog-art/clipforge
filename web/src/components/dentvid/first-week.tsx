"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";

/**
 * Right after payment: "your first week is being made". The payment webhook
 * activates the plan and queues the week; this page refreshes itself until
 * the videos are in the library. Once the plan shows as active it also asks
 * for the week once more — idempotent (same job id), and a safety net if the
 * webhook could not reach the queue.
 */
export function FirstWeek({ locale, paid, pollMs = 10_000 }: { locale: Locale; paid: boolean; pollMs?: number }) {
  const t = appText(locale).onboarding;
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

  const steps: { key: keyof typeof t.firstWeekSteps; state: "done" | "now" | "next" }[] = [
    { key: "paid", state: paid ? "done" : "now" },
    { key: "writing", state: paid ? "now" : "next" },
    { key: "rendering", state: paid ? "now" : "next" },
    { key: "email", state: "next" },
  ];

  return (
    <section aria-live="polite" className="dv-card relative isolate overflow-hidden p-6 sm:p-10">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10 opacity-70" />
      <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#cfe6e0] opacity-70 blur-3xl" />
      <p className="inline-flex items-center gap-2 rounded-full bg-dv-teal-50 px-3 py-1 text-xs font-semibold text-dv-teal ring-1 ring-inset ring-dv-teal/15">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dv-teal opacity-50 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-dv-teal" />
        </span>
        {paid ? t.firstWeekStill : t.firstWeekActivating}
      </p>
      <h1 className="dv-display mt-5 text-balance text-[2.5rem] leading-[1.04] text-dv-ink sm:text-[3.25rem]">{t.firstWeekTitle}</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-dv-body">{t.firstWeekLead}</p>
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
