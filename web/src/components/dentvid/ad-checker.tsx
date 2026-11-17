"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, Sparkles } from "lucide-react";
import type { CheckerUi } from "@/content/dentvideo-checker";
import type { CheckerHit } from "@/lib/dentvid/ad-checker";
import { CHECKER_MAX_CHARS } from "@/lib/dentvid/ad-checker-limits";
import { trackDv } from "@/lib/dentvid/events-client";
import { dvHref } from "@/lib/dentvid/host";

/**
 * The interactive part of the free ad checker. Everything happens here, in
 * the browser: the text is checked as it is typed or pasted, against the
 * compliance agent's own hard rules (lib/dentvid/hard-rules.ts), and never
 * sent anywhere. Analytics get counts only (checker_used: hits, rules,
 * clean), never a word of the text.
 *
 * The rules themselves (every language's patterns and rewrites) are a chunk
 * of their own, fetched right after the page paints, so they never delay it.
 */

/** How long typing must pause before a check is counted (not before it is shown). */
const COUNT_AFTER_MS = 1500;
/** At most this many checker_used events per page view. */
const MAX_COUNTED = 20;

type Engine = typeof import("@/lib/dentvid/ad-checker");

export function AdChecker({ locale, ui, landingPath }: { locale: string; ui: CheckerUi; landingPath: string }) {
  const id = useId();
  const [text, setText] = useState("");
  const [engine, setEngine] = useState<Engine | null>(null);
  useEffect(() => {
    let live = true;
    void import("@/lib/dentvid/ad-checker").then((m) => live && setEngine(m));
    return () => {
      live = false;
    };
  }, []);
  const deferred = useDeferredValue(text);
  const hits = useMemo(() => (engine ? engine.checkText(deferred) : []), [engine, deferred]);
  const shown = deferred.slice(0, CHECKER_MAX_CHARS);
  // Results wait for the engine (a moment after the page loads), never show a false "clean".
  const hasText = !!engine && shown.trim().length > 0;
  const results = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // Count a check once the visitor stops typing: the result's shape, never its words.
  const counted = useRef({ n: 0, last: "" });
  useEffect(() => {
    if (!hasText || !engine) return;
    const props = engine.checkerEventProps(hits);
    const sig = JSON.stringify(props);
    const t = window.setTimeout(() => {
      const c = counted.current;
      if (c.n >= MAX_COUNTED || c.last === sig) return;
      c.n++;
      c.last = sig;
      trackDv("checker_used", { locale, props });
    }, COUNT_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [engine, hits, hasText, locale]);

  const showResults = () => {
    const el = results.current;
    if (!el) return;
    // On a phone the results are below the box: bring them into view.
    if (el.getBoundingClientRect().top > window.innerHeight * 0.6) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <form
        className="dv-card rounded-[1.25rem] bg-white p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          showResults();
        }}
      >
        <label htmlFor={`${id}-text`} className="block text-sm font-semibold text-dv-ink">
          {ui.label}
        </label>
        <textarea
          id={`${id}-text`}
          ref={area}
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={ui.placeholder}
          rows={8}
          spellCheck={false}
          className="dv-field min-h-[11rem] resize-y text-[1rem] leading-relaxed"
          data-testid="checker-input"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-dv-muted">
          <p className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {ui.privacy}
          </p>
          <p className="tabular-nums" dir="ltr">
            {Math.min(text.length, CHECKER_MAX_CHARS)} / {CHECKER_MAX_CHARS}
          </p>
        </div>
        {text.length > CHECKER_MAX_CHARS && <p className="mt-1 text-xs font-medium text-[#8a4b0f]">{ui.tooLong.replace("{max}", String(CHECKER_MAX_CHARS))}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="dv-btn dv-btn-primary px-5 py-3" disabled={!text.trim()}>
            {ui.check}
          </button>
          <button
            type="button"
            className="dv-btn dv-btn-secondary px-5 py-3"
            data-testid="checker-sample"
            onClick={() => {
              setText(ui.sample);
              area.current?.focus();
            }}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {ui.trySample}
          </button>
          {text && (
            <button type="button" className="rounded-full px-3 py-3 text-sm font-semibold text-dv-muted underline-offset-4 hover:text-dv-ink hover:underline" onClick={() => setText("")}>
              {ui.clear}
            </button>
          )}
        </div>
      </form>

      <div ref={results} className="scroll-mt-24" aria-live="polite" data-testid="checker-results">
        {hasText ? (
          <Results ui={ui} text={shown} hits={hits} segments={engine.segments} locale={locale} landingPath={landingPath} />
        ) : (
          <RuleList ui={ui} />
        )}
      </div>
    </div>
  );
}

/** Before anything is pasted: what the checker looks for. */
function RuleList({ ui }: { ui: CheckerUi }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {Object.entries(ui.rules).map(([rule, r]) => (
        <li key={rule} className="rounded-2xl bg-white/70 p-4 ring-1 ring-dv-line">
          <p className="text-sm font-semibold text-dv-ink">{r.name}</p>
          <p className="mt-1 text-sm leading-snug text-dv-muted">{r.why}</p>
        </li>
      ))}
    </ul>
  );
}

function Results({
  ui,
  text,
  hits,
  segments,
  locale,
  landingPath,
}: {
  ui: CheckerUi;
  text: string;
  hits: CheckerHit[];
  segments: Engine["segments"];
  locale: string;
  landingPath: string;
}) {
  const clean = hits.length === 0;
  return (
    <section aria-labelledby="checker-result" className="space-y-5">
      <h2 id="checker-result" className="sr-only">
        {ui.resultsHeading}
      </h2>
      {clean ? (
        <div className="rounded-[1.25rem] bg-dv-teal-50 p-5 ring-1 ring-dv-teal-100 sm:p-6" data-testid="checker-clean">
          <p className="flex items-center gap-2 text-lg font-semibold text-dv-teal">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            {ui.cleanTitle}
          </p>
          <p className="mt-2 leading-relaxed text-dv-body">{ui.cleanText}</p>
        </div>
      ) : (
        <>
          <p className="text-lg font-semibold text-dv-ink" data-testid="checker-count">
            {ui.found.replace("{n}", String(hits.length))}
          </p>
          <figure className="rounded-[1.25rem] bg-white p-4 ring-1 ring-dv-line sm:p-5">
            <figcaption className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted rtl:tracking-normal">{ui.yourText}</figcaption>
            <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-[1rem] leading-[1.9] text-dv-body">
              {segments(text, hits).map((s, i) =>
                s.hit ? (
                  <mark key={i} className="rounded-[0.3rem] bg-[#fde3c2] px-0.5 text-dv-ink underline decoration-[#c2410c] decoration-2 underline-offset-[3px] [box-decoration-break:clone]">
                    {s.text}
                    <sup className="ms-0.5 text-[0.65rem] font-bold text-[#9a3412]" aria-hidden="true">
                      {(s.index ?? 0) + 1}
                    </sup>
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </p>
          </figure>
          <ol className="space-y-3" data-testid="checker-hits">
            {hits.map((h, i) => {
              const r = ui.rules[h.rule];
              return (
                <li key={`${h.start}-${h.rule}`} className="rounded-2xl bg-white p-4 ring-1 ring-dv-line sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#fde3c2] px-1.5 text-xs font-bold text-[#9a3412]">{i + 1}</span>
                    <span className="rounded-full bg-dv-sand px-2.5 py-0.5 text-xs font-semibold text-dv-ink ring-1 ring-dv-line">{r.name}</span>
                    <span className="font-semibold text-dv-ink">
                      {ui.quotes[0]}
                      <bdi>{h.match}</bdi>
                      {ui.quotes[1]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-dv-body">
                    <span className="font-semibold text-dv-ink">{ui.why}: </span>
                    {r.why}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-dv-body">
                    <span className="font-semibold text-dv-teal">{h.fix ? ui.instead : ui.tip}: </span>
                    {h.fix ? (
                      <>
                        {ui.quotes[0]}
                        <bdi>{h.fix}</bdi>
                        {ui.quotes[1]}
                      </>
                    ) : (
                      r.tip
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <CheckerCta ui={ui} locale={locale} where={clean ? "clean" : "result"} landingPath={landingPath} />
    </section>
  );
}

/** The honest next step: DentVideo's videos pass these same rules before a clinic sees them. */
function CheckerCta({ ui, locale, where, landingPath }: { ui: CheckerUi; locale: string; where: "result" | "clean"; landingPath: string }) {
  return (
    <aside className="dv-on-dark relative isolate overflow-hidden rounded-[1.25rem] bg-dv-teal-900 p-5 text-[#f7f1e7] sm:p-6" data-testid="checker-cta">
      <p className="text-balance text-lg font-semibold leading-snug text-white">{ui.cta.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-[#cfe2df]">{ui.cta.text}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={dvHref(`/dentvideo/start?lang=${locale}`)}
          className="dv-btn dv-btn-light group px-5 py-3"
          data-cta="checker"
          onClick={() => trackDv("checker_cta_clicked", { locale, props: { where } })}
        >
          {ui.cta.button}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
        </Link>
        <Link href={dvHref(`${landingPath}#how`)} className="rounded-md text-sm font-semibold text-[#8fd1c6] underline-offset-4 hover:underline">
          {ui.cta.secondary}
        </Link>
      </div>
    </aside>
  );
}
