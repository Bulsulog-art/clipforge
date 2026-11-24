import type { ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Locale } from "@/content/dentvideo-locales";
import { HELP } from "@/content/help";
import { CHECKER_SOURCES, type Source } from "@/content/dentvideo-checker";
import { MARKET_SOURCES, isCheckerMarket } from "@/lib/dentvid/checker-markets";
import { marketName, ruleMarketsFor, type RuleMarket } from "@/content/dentvideo-showcase";
import { CLINICAL_CHECKED, CLINICAL_SOURCE_LIST } from "@/lib/dentvid/clinical-sources";

/**
 * Under the help answer "How does DentVideo check a video": the sources of
 * both software checks, as links, folded so the answer stays short on a phone.
 *
 * - Clinical: the public patient pages the clinical reviewer's aftercare rules
 *   agree with (lib/dentvid/clinical-sources.ts, a copy of the worker's list).
 * - Advertising: only the countries whose own rules the reviewer is given
 *   (content/dentvideo-showcase.ts RULE_MARKETS, kept in step with the worker),
 *   each with the official texts the free ad checker cites for it
 *   (content/dentvideo-checker.ts). A country the reviewer has no rules for is
 *   not listed, even when the ad checker knows it.
 */

/** One country in the advertising list: its name, its official texts, or the rule's name where we link none. */
export type CheckMarket = { code: RuleMarket["code"]; name: string; sources: Source[]; rule?: string };

/** The countries with their own rules in the advertising check, the page's own first. */
export function checkMarkets(locale: Locale): CheckMarket[] {
  return ruleMarketsFor(locale).map((m) => {
    // The Gulf rules are one set for six states; the checker has official texts for two of them.
    // Singapore has rules in the reviewer but no page on the checker: its rule's name is shown instead.
    const keys = m.code === "GULF" ? [...MARKET_SOURCES.AE, ...MARKET_SOURCES.SA] : isCheckerMarket(m.code) ? MARKET_SOURCES[m.code] : [];
    const sources = keys.map((k) => CHECKER_SOURCES[k]);
    return { code: m.code, name: marketName(locale, m.code), sources, ...(sources.length ? {} : { rule: m.rule }) };
  });
}

/** "24 November 2026" in the page's language. */
export function checkedDate(locale: Locale, day = CLINICAL_CHECKED): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

const linkClass = "text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] hover:decoration-dv-teal";

export function HelpCheckSources({ locale }: { locale: Locale }) {
  const t = HELP[locale].checkSources;
  const markets = checkMarkets(locale);
  return (
    <div className="space-y-2" data-help-sources>
      <Fold title={t.clinical} testId="help-sources-clinical">
        <ul className="space-y-2">
          {CLINICAL_SOURCE_LIST.map((s) => (
            <li key={s.url} className="flex gap-2.5">
              <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-dv-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 rtl:text-right" dir="ltr">
                <span className="text-dv-muted">{s.body}: </span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={linkClass} data-help-source="clinical">
                  {s.title}
                </a>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-dv-muted">{t.checked.replace("{date}", checkedDate(locale))}</p>
      </Fold>
      <Fold title={t.advertising} testId="help-sources-advertising">
        <ul className="space-y-3">
          {markets.map((m) => (
            <li key={m.code} data-help-market={m.code}>
              <span className="font-medium text-dv-ink">{m.name}</span>
              <ul className="mt-1 space-y-1">
                {m.sources.map((s) => (
                  <li key={s.url} className="flex gap-2.5">
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-dv-muted" aria-hidden="true" />
                    <a href={s.url} target="_blank" rel="noopener noreferrer" dir="auto" className={`min-w-0 flex-1 break-words rtl:text-right ${linkClass}`} data-help-source="advertising">
                      {s.label}
                    </a>
                  </li>
                ))}
                {m.rule && (
                  <li className="flex gap-2.5 text-dv-body">
                    <span aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0" />
                    <span dir="auto">{m.rule}</span>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </Fold>
    </div>
  );
}

function Fold({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl bg-white/70 ring-1 ring-inset ring-dv-line" data-testid={testId}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-start text-sm font-semibold leading-snug text-dv-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-dv-teal transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-dv-line px-4 pb-4 pt-3 text-sm leading-relaxed">
        {children}
      </div>
    </details>
  );
}
