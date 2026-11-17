"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, ImageDown, Link2, Lock } from "lucide-react";
import type { CheckerUi, Source } from "@/content/dentvideo-checker";
import type { CheckerHit, Sentence } from "@/lib/dentvid/ad-checker";
import { CHECKER_MAX_CHARS } from "@/lib/dentvid/ad-checker-limits";
import {
  DEFAULT_MARKET,
  OTHER_MARKET,
  PAGE_MARKETS,
  marketFromLanguageTag,
  sourceFor,
  type CheckerMarket,
  type CheckerRuleId,
  type SourceKey,
  type Verdict,
} from "@/lib/dentvid/checker-markets";
import { readShareFragment, shareUrl } from "@/lib/dentvid/checker-share";
import type { Locale } from "@/content/dentvideo-locales";
import { trackDv } from "@/lib/dentvid/events-client";
import { dvHref } from "@/lib/dentvid/host";

/**
 * The interactive part of the free ad checker. Everything happens here, in
 * the browser: the text is checked as it is typed or pasted, sentence by
 * sentence, against the compliance agent's own hard rules plus the chosen
 * market's pack (lib/dentvid/hard-rules.ts), and never sent anywhere.
 * Analytics get counts only (checker_used: hits, rules, clean, banned and the
 * market picked), never a word of the text.
 *
 * Sharing keeps that promise: a link carries the text in its #fragment,
 * which browsers never send to a server, and the result image is drawn on a
 * canvas in this tab (components/dentvid/checker-card.ts, loaded on demand).
 *
 * The rules themselves (every language's patterns and rewrites) are a chunk
 * of their own, fetched right after the page paints, so they never delay it.
 */

/** How long typing must pause before a check is counted (not before it is shown). */
const COUNT_AFTER_MS = 1500;
/** At most this many checker_used events per page view. */
const MAX_COUNTED = 20;

type Engine = typeof import("@/lib/dentvid/ad-checker");

export type CheckerMarketOption = { id: CheckerMarket; name: string };

type Props = {
  locale: Locale;
  ui: CheckerUi;
  landingPath: string;
  /** Every market, in the page's order, with its name in the page's language. */
  markets: CheckerMarketOption[];
  /** The official texts the results may cite. */
  sources: Record<SourceKey, Source>;
  /** This page's route (CHECKER_PATH), for the canonical address on the result image. */
  checkerPath: string;
};

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

export function AdChecker({ locale, ui, landingPath, markets, sources, checkerPath }: Props) {
  const id = useId();
  const [text, setText] = useState("");
  const [market, setMarket] = useState<CheckerMarket>(DEFAULT_MARKET[locale]);
  const [shared, setShared] = useState(false);
  const [engine, setEngine] = useState<Engine | null>(null);
  useEffect(() => {
    let live = true;
    void import("@/lib/dentvid/ad-checker").then((m) => live && setEngine(m));
    return () => {
      live = false;
    };
  }, []);

  // A shared link (#m=TR&t=…) fills the checker; otherwise the browser's region may pick a closer market.
  useEffect(() => {
    const fromLink = readShareFragment(window.location.hash);
    if (fromLink) {
      setText(fromLink.text);
      if (fromLink.market) setMarket(fromLink.market);
      setShared(true);
      return;
    }
    const guess = marketFromLanguageTag(navigator.language);
    if (guess && PAGE_MARKETS[locale].includes(guess)) setMarket(guess);
  }, [locale]);

  const deferred = useDeferredValue(text);
  const hits = useMemo(() => (engine ? engine.checkText(deferred, market) : []), [engine, deferred, market]);
  const sentences = useMemo(() => (engine ? engine.sentencesOf(deferred, hits) : []), [engine, deferred, hits]);
  const shown = deferred.slice(0, CHECKER_MAX_CHARS);
  // Results wait for the engine (a moment after the page loads), never show a false "clean".
  const hasText = !!engine && shown.trim().length > 0;
  const results = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const marketName = markets.find((m) => m.id === market)?.name ?? "";

  // Count a check once the visitor stops typing: the result's shape, never its words.
  const counted = useRef({ n: 0, last: "" });
  useEffect(() => {
    if (!hasText || !engine) return;
    const props = engine.checkerEventProps(hits, market);
    const sig = JSON.stringify(props);
    const t = window.setTimeout(() => {
      const c = counted.current;
      if (c.n >= MAX_COUNTED || c.last === sig) return;
      c.n++;
      c.last = sig;
      trackDv("checker_used", { locale, props });
    }, COUNT_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [engine, hits, hasText, locale, market]);

  const edit = (next: string) => {
    setText(next);
    // The address no longer matches what is on screen: drop the shared text from it.
    if (shared) {
      setShared(false);
      if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  };

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
        className="dv-card min-w-0 rounded-[1.25rem] bg-white p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          showResults();
        }}
      >
        <label htmlFor={`${id}-market`} className="block text-sm font-semibold text-dv-ink">
          {ui.market.label}
        </label>
        <select
          id={`${id}-market`}
          value={market}
          onChange={(e) => setMarket(e.target.value as CheckerMarket)}
          aria-describedby={`${id}-market-hint`}
          className="dv-field mt-1.5 h-12 cursor-pointer"
          data-testid="checker-market"
        >
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <p id={`${id}-market-hint`} className="mt-1.5 text-xs leading-relaxed text-dv-muted">
          {ui.market.hint}
        </p>

        <label htmlFor={`${id}-text`} className="mt-5 block text-sm font-semibold text-dv-ink">
          {ui.label}
        </label>
        <textarea
          id={`${id}-text`}
          ref={area}
          dir="auto"
          value={text}
          onChange={(e) => edit(e.target.value)}
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
          {text && (
            <button type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold text-dv-muted underline-offset-4 hover:text-dv-ink hover:underline" onClick={() => edit("")}>
              {ui.clear}
            </button>
          )}
        </div>

        <fieldset className="mt-5 border-t border-dv-line pt-4">
          <legend className="sr-only">{ui.examples.label}</legend>
          <p aria-hidden="true" className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted rtl:tracking-normal">
            {ui.examples.label}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ui.examples.items.map((ex, i) => (
              <button
                key={ex.label}
                type="button"
                className="min-h-11 rounded-full bg-dv-sand px-4 py-2 text-start text-sm font-semibold text-dv-ink ring-1 ring-dv-line transition hover:ring-dv-teal"
                data-testid={i === 0 ? "checker-sample" : "checker-example"}
                onClick={() => {
                  edit(ex.text);
                  area.current?.focus();
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      <div ref={results} className="min-w-0 scroll-mt-24" aria-live="polite" data-testid="checker-results">
        {hasText ? (
          <Results
            ui={ui}
            locale={locale}
            text={shown}
            hits={hits}
            sentences={sentences}
            market={market}
            marketName={marketName}
            sources={sources}
            shared={shared}
            landingPath={landingPath}
            checkerPath={checkerPath}
          />
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

const BADGE: Record<Verdict, string> = {
  ok: "bg-dv-teal-50 text-dv-teal ring-dv-teal-100",
  risky: "bg-[#fde3c2] text-[#9a3412] ring-[#f6c58f]",
  banned: "bg-[#fee4e2] text-[#b42318] ring-[#fbb4ae]",
};
const MARK: Record<Exclude<Verdict, "ok">, string> = {
  risky: "bg-[#fde3c2] decoration-[#c2410c]",
  banned: "bg-[#fee4e2] decoration-[#b42318]",
};

function verdictLabel(ui: CheckerUi, v: Verdict, marketName: string) {
  return v === "banned" ? fill(ui.verdicts.banned, { market: marketName }) : ui.verdicts[v];
}

function ruleText(ui: CheckerUi, rule: CheckerRuleId) {
  return rule in ui.rules ? ui.rules[rule as keyof CheckerUi["rules"]] : ui.marketRules[rule as keyof CheckerUi["marketRules"]];
}

export type ResultsProps = {
  ui: CheckerUi;
  locale: Locale;
  text: string;
  hits: CheckerHit[];
  sentences: Sentence[];
  market: CheckerMarket;
  marketName: string;
  sources: Record<SourceKey, Source>;
  shared: boolean;
  landingPath: string;
  checkerPath: string;
};

export function Results(p: ResultsProps) {
  const { ui, hits, sentences } = p;
  const clean = hits.length === 0;
  const count = (v: Verdict) => sentences.filter((s) => s.verdict === v).length;
  const summary = fill(ui.summary, { ok: count("ok"), risky: count("risky"), banned: count("banned") });
  // Hit numbers run across the whole text: where each sentence's first hit starts counting.
  const first = sentences.map((_, k) => sentences.slice(0, k).reduce((sum, s) => sum + s.hits.length, 0));
  return (
    <section aria-labelledby="checker-result" className="space-y-5">
      <h2 id="checker-result" className="sr-only">
        {ui.resultsHeading}
      </h2>
      {p.shared && (
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm leading-relaxed text-dv-body ring-1 ring-dv-line" data-testid="checker-shared">
          {ui.shared}
        </p>
      )}
      {clean ? (
        <div className="rounded-[1.25rem] bg-dv-teal-50 p-5 ring-1 ring-dv-teal-100 sm:p-6" data-testid="checker-clean">
          <p className="flex items-center gap-2 text-lg font-semibold text-dv-teal">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            {ui.cleanTitle}
          </p>
          <p className="mt-2 leading-relaxed text-dv-body">{ui.cleanText}</p>
        </div>
      ) : (
        <div>
          <p className="text-lg font-semibold text-dv-ink" data-testid="checker-count">
            {ui.found.replace("{n}", String(hits.length))}
          </p>
          <p className="mt-1 text-sm text-dv-muted" data-testid="checker-summary">
            {summary}
          </p>
        </div>
      )}

      {!clean && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted rtl:tracking-normal">{ui.bySentence}</h3>
          <ol className="mt-3 space-y-3" data-testid="checker-sentences">
            {sentences.map((s, k) => (
              <li key={`${s.start}-${s.end}`} className="rounded-2xl bg-white p-4 ring-1 ring-dv-line sm:p-5" data-verdict={s.verdict}>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${BADGE[s.verdict]}`}>{verdictLabel(ui, s.verdict, p.marketName)}</span>
                <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-[1rem] leading-[1.85] text-dv-body">
                  <SentenceText s={s} start={first[k]} />
                </p>
                {s.hits.length > 0 && (
                  <ul className="mt-3 space-y-3 border-t border-dv-line pt-3">
                    {groupHits(s.hits).map((g) => (
                      <RuleNote key={g.rule} group={g} start={first[k]} safer={s.safer} ui={ui} />
                    ))}
                  </ul>
                )}
                {s.hits.length > 0 && <SourceLine ui={ui} keys={[...new Set(s.hits.map((h) => sourceFor(h.rule, p.market)))]} sources={p.sources} />}
                {s.safer && (
                  <p className="mt-3 rounded-xl bg-dv-teal-50 px-3.5 py-2.5 text-sm leading-relaxed text-dv-body ring-1 ring-dv-teal-100" data-testid="checker-safer">
                    <span className="font-semibold text-dv-teal">{ui.saferSentence}: </span>
                    <bdi>{s.safer}</bdi>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-sm text-dv-muted">{ui.disclaimer}</p>
      <ShareBar {...p} summary={summary} />
      <Bridge ui={ui} locale={p.locale} where={clean ? "clean" : "result"} landingPath={p.landingPath} />
    </section>
  );
}

/** A sentence with its flagged phrases marked and numbered (numbers run across the whole text). */
function SentenceText({ s, start }: { s: Sentence; start: number }) {
  const out: ReactNode[] = [];
  let at = s.start;
  s.hits.forEach((h, k) => {
    if (h.start > at) out.push(<span key={`t${k}`}>{s.text.slice(at - s.start, h.start - s.start)}</span>);
    out.push(
      <mark key={`m${k}`} className={`rounded-[0.3rem] px-0.5 text-dv-ink underline decoration-2 underline-offset-[3px] [box-decoration-break:clone] rtl:no-underline ${MARK[h.verdict]}`}>
        {s.text.slice(h.start - s.start, Math.min(h.end, s.end) - s.start)}
        <sup className="ms-0.5 text-[0.65rem] font-bold text-[#9a3412]" aria-hidden="true">
          {start + k + 1}
        </sup>
      </mark>,
    );
    at = Math.min(h.end, s.end);
  });
  if (at < s.end) out.push(<span key="end">{s.text.slice(at - s.start)}</span>);
  return <>{out}</>;
}

/** A sentence's hits grouped by rule, in reading order; `index` is each hit's place in the sentence (0-based). */
export type RuleGroup = { rule: CheckerRuleId; hits: { hit: CheckerHit; index: number }[] };

export function groupHits(hits: readonly CheckerHit[]): RuleGroup[] {
  const out: RuleGroup[] = [];
  hits.forEach((hit, index) => {
    const g = out.find((x) => x.rule === hit.rule);
    if (g) g.hits.push({ hit, index });
    else out.push({ rule: hit.rule, hits: [{ hit, index }] });
  });
  return out;
}

/**
 * One rule's note for a sentence: every phrase it flagged there, listed
 * together, then the explanation once and each distinct fix once. A fix that
 * is the sentence's safer version is shown under the sentence instead.
 */
function RuleNote({ group, start, safer, ui }: { group: RuleGroup; start: number; safer: string | null; ui: CheckerUi }) {
  const r = ruleText(ui, group.rule);
  const fixes = [...new Set(group.hits.map(({ hit }) => hit.fix).filter((f): f is string => !!f && f !== safer))];
  const needsTip = group.hits.some(({ hit }) => !hit.fix);
  return (
    <li className="text-sm leading-relaxed text-dv-body" data-rule={group.rule} data-verdict={group.hits[0].hit.verdict} data-testid="checker-rule-note">
      <div className="flex flex-wrap items-center gap-2">
        {group.hits.map(({ hit, index }) => (
          <span key={hit.start} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#fde3c2] px-1.5 text-xs font-bold text-[#9a3412]">
            {start + index + 1}
          </span>
        ))}
        <span className="rounded-full bg-dv-sand px-2.5 py-0.5 text-xs font-semibold text-dv-ink ring-1 ring-dv-line">{r.name}</span>
      </div>
      <p className="mt-1.5 font-semibold text-dv-ink">
        {group.hits.map(({ hit }, j) => (
          <span key={hit.start}>
            {j > 0 && ", "}
            {ui.quotes[0]}
            <bdi>{hit.match}</bdi>
            {ui.quotes[1]}
          </span>
        ))}
      </p>
      <p className="mt-1.5">
        <span className="font-semibold text-dv-ink">{ui.why}: </span>
        {r.why}
      </p>
      {fixes.map((fix) => (
        <p key={fix} className="mt-1">
          <span className="font-semibold text-dv-teal">{ui.instead}: </span>
          {ui.quotes[0]}
          <bdi>{fix}</bdi>
          {ui.quotes[1]}
        </p>
      ))}
      {needsTip && (
        <p className="mt-1">
          <span className="font-semibold text-dv-teal">{ui.tip}: </span>
          {r.tip}
        </p>
      )}
    </li>
  );
}

/** The official texts behind a sentence's verdicts, each once. */
function SourceLine({ ui, keys, sources }: { ui: CheckerUi; keys: (SourceKey | null)[]; sources: Record<SourceKey, Source> }) {
  const list = keys.filter((k): k is SourceKey => !!k).map((k) => sources[k]);
  return (
    <p className="mt-3 flex gap-1.5 text-xs leading-relaxed text-dv-muted">
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {list.length ? (
        <span>
          {ui.source}:{" "}
          {list.map((src, j) => (
            <span key={src.url}>
              {j > 0 && " · "}
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] hover:decoration-dv-teal" data-testid="checker-source">
                {src.label}
              </a>
            </span>
          ))}
        </span>
      ) : (
        <span>{ui.noSource}</span>
      )}
    </p>
  );
}

/** Pass the check on: a link with the text in its #fragment, or an image drawn here. Nothing reaches our server. */
function ShareBar({ ui, locale, text, sentences, market, marketName, summary, checkerPath }: ResultsProps & { summary: string }) {
  const [link, setLink] = useState<"idle" | "copied" | "failed">("idle");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<"idle" | "making" | "failed">("idle");
  const props: Record<string, string> = market === OTHER_MARKET ? {} : { market };

  const copy = async () => {
    const u = shareUrl(window.location.href, text, market);
    setUrl(u);
    try {
      await navigator.clipboard.writeText(u);
      setLink("copied");
      trackDv("checker_shared", { locale, props: { method: "link", ...props } });
    } catch {
      setLink("failed");
    }
  };

  const save = async () => {
    setImage("making");
    try {
      const { cardBlob, cardFooter } = await import("./checker-card");
      const flagged = sentences.filter((s) => s.verdict !== "ok");
      const rows = (flagged.length ? flagged : sentences).map((s) => ({ verdict: s.verdict, label: verdictLabel(ui, s.verdict, marketName), text: s.text }));
      const blob = await cardBlob({
        dir: document.documentElement.dir === "rtl" ? "rtl" : "ltr",
        title: `${ui.cardTitle} · ${marketName}`,
        summary,
        rows: rows.slice(0, 5),
        more: Math.max(0, rows.length - 5),
        // Where to run it yourself: the canonical address (dentvideo.com/tr/ad-checker), never the host it was opened on.
        footer: cardFooter(checkerPath, ui.disclaimer),
        font: getComputedStyle(document.body).fontFamily || "system-ui, sans-serif",
      });
      const file = new File([blob], "dentvideo-ad-check.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
        await nav.share({ files: [file] });
        trackDv("checker_shared", { locale, props: { method: "share", ...props } });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        trackDv("checker_shared", { locale, props: { method: "image", ...props } });
      }
      setImage("idle");
    } catch (e) {
      // Closing the share sheet is not a failure.
      setImage((e as Error)?.name === "AbortError" ? "idle" : "failed");
    }
  };

  return (
    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-dv-line" data-testid="checker-share">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className="dv-btn dv-btn-secondary min-h-11 px-4 py-2.5 text-sm" data-testid="checker-copy-link">
          <Link2 className="h-4 w-4" aria-hidden="true" />
          {link === "copied" ? ui.share.copied : ui.share.copy}
        </button>
        <button type="button" onClick={() => void save()} disabled={image === "making"} className="dv-btn dv-btn-secondary min-h-11 px-4 py-2.5 text-sm" data-testid="checker-save-image">
          <ImageDown className="h-4 w-4" aria-hidden="true" />
          {image === "making" ? ui.share.making : ui.share.image}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-dv-muted">{ui.share.note}</p>
      {(link === "failed" || image === "failed") && (
        <p className="mt-2 text-xs font-medium text-[#8a4b0f]" role="status">
          {ui.share.failed}
        </p>
      )}
      {link === "failed" && url && (
        <input readOnly value={url} dir="ltr" onFocus={(e) => e.currentTarget.select()} aria-label={ui.share.copy} className="dv-field mt-2 h-11 text-xs" />
      )}
    </div>
  );
}

/** The calm way on: one line, and the free logo preview on the landing. */
function Bridge({ ui, locale, where, landingPath }: { ui: CheckerUi; locale: Locale; where: "result" | "clean"; landingPath: string }) {
  return (
    <aside className="flex flex-col gap-2 border-t border-dv-line pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6" data-testid="checker-cta">
      <p className="text-sm leading-relaxed text-dv-body">{ui.bridge.text}</p>
      <Link
        href={dvHref(`${landingPath}#try`)}
        className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-dv-teal underline-offset-4 hover:underline"
        data-cta="checker"
        onClick={() => trackDv("checker_cta_clicked", { locale, props: { where } })}
      >
        {ui.bridge.link}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
      </Link>
    </aside>
  );
}
