"use client";

import { useState } from "react";
import { dateLocale } from "@/lib/dentvid/app-ui";
import { ArrowRight, BadgeCheck, Check } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import { DV_FOUNDING, type DvInterval, type DvPlanState, type DvTier } from "@/lib/dentvid/billing";
import { billingText } from "@/content/dentvideo-billing";
import { VerifyCard } from "./verify-email";
import { trackDv } from "@/lib/dentvid/events-client";

export type PlanOption = { tier: DvTier; interval: DvInterval; priceUsd: number };

const TIERS: DvTier[] = ["starter", "practice", "group"];

export function usd(locale: Locale, amount: number) {
  // Arabic pages write "$39" as the landing does (Western digits, no right-to-left marks to reorder it).
  return new Intl.NumberFormat(locale === "ar" ? "en-US" : locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

/** A price inside a sentence, isolated so right-to-left text cannot reorder it ("US$ 39", not "$US 39"). */
const inText = (s: string) => `\u2068${s}\u2069`;

/** "Choose your plan": the three tiers, a monthly/yearly toggle, the founding offer. */
export function PlanPanel({
  locale,
  state,
  options,
  founding,
  bare = false,
  keepVideos = false,
  onNeedsVerification,
}: {
  locale: Locale;
  state: DvPlanState;
  options: PlanOption[];
  /** Founding price when the offer is open (Practice monthly), else null; `left` only when counted reliably. */
  founding: { priceUsd: number; code?: string; left?: number } | null;
  /** Inside the onboarding wizard the step has its own heading: keep the panel's title for screen readers only. */
  bare?: boolean;
  /** Paused or cancelled with videos in the library: say they stay, and can still be shared. */
  keepVideos?: boolean;
  /** Checkout refused an unconfirmed address and the page shows its own code card (the onboarding plan step). */
  onNeedsVerification?: () => void;
}) {
  const text = appText(locale);
  const t = text.billing;
  const hasYearly = options.some((o) => o.interval === "year");
  const [interval, setIv] = useState<DvInterval>("month");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<DvTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Inline code card (in the app, where the page has none): the address to confirm. */
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  /** The plan that was chosen when checkout asked for the code: checkout resumes with it once confirmed. */
  const [pending, setPending] = useState<{ tier: DvTier; interval: DvInterval } | null>(null);

  const lead = state === "paused" ? t.leadPaused : state === "cancelled" ? t.leadCancelled : t.leadTrial;

  async function choose(tier: DvTier, chosen: DvInterval) {
    setBusy(tier);
    setError(null);
    trackDv("plan_clicked", { locale, props: { tier, interval: chosen, where: bare ? "onboarding" : "app" } });
    try {
      const res = await fetch("/api/dentvideo/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: tier, interval: chosen, ...(code.trim() ? { code: code.trim() } : {}) }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string; email?: string };
      if (res.ok && body.url) {
        window.location.href = body.url;
        return;
      }
      // The address is not confirmed yet (lib/dentvid/verify-email): the code card.
      if (res.status === 403 && body.code === "email_unverified") {
        setBusy(null);
        if (onNeedsVerification) {
          setError(null);
          onNeedsVerification();
        } else {
          // The code card says what to do; the server's sentence would only repeat it.
          setError(null);
          setPending({ tier, interval: chosen });
          setVerifyFor(body.email ?? "");
        }
        return;
      }
      setError(body.error ?? text.errors.checkoutFailed);
    } catch {
      setError(text.errors.checkoutFailed);
    }
    setBusy(null);
  }

  return (
    <section id="plans" aria-labelledby="plans-title" className="dv-card relative isolate scroll-mt-24 overflow-hidden p-6 sm:p-8">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10 opacity-60" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className={bare ? "sr-only" : "max-w-2xl"}>
          <h2 id="plans-title" className="dv-display text-[2rem] leading-tight sm:text-[2.5rem]">{t.chooseTitle}</h2>
          <p className="mt-2 text-dv-body">{lead}</p>
          {keepVideos && state !== "trial" && <p className="mt-2 text-sm text-dv-muted">{t.keepVideos}</p>}
        </div>
        {hasYearly && (
          <div role="group" aria-label={`${t.monthly} / ${t.yearly}`} className="inline-flex rounded-full bg-dv-sand p-1 ring-1 ring-inset ring-dv-line">
            {(["month", "year"] as const).map((iv) => (
              <button
                key={iv}
                type="button"
                aria-pressed={interval === iv}
                onClick={() => setIv(iv)}
                className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition ${interval === iv ? "bg-white text-dv-ink shadow-[0_1px_3px_rgba(20,33,31,0.12)]" : "text-dv-muted hover:text-dv-ink"}`}
              >
                {iv === "month" ? t.monthly : t.yearly}
                {iv === "year" && <span className="ms-1.5 text-xs font-medium text-dv-teal">{t.yearlySave}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {founding && interval === "month" && (
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-dv-teal px-4 py-3 text-sm font-semibold text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f1e7] px-2.5 py-0.5 text-xs uppercase tracking-[0.08em] text-dv-teal-900">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t.foundingBadge}
          </span>
          {fmt(t.foundingLine, { price: inText(usd(locale, founding.priceUsd)) })}
          {founding.code && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
              {/* Only the code is monospaced: a monospace face has no Japanese or Arabic. */}
              {t.foundingCodeLine.split("{code}")[0]}
              <code dir="ltr" className="font-mono">{founding.code}</code>
              {t.foundingCodeLine.split("{code}")[1] ?? ""}
            </span>
          )}
          {typeof founding.left === "number" && founding.left > 0 && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
              {billingText(locale).copy.seatsLeft.replace("{left}", String(founding.left)).replace("{total}", String(DV_FOUNDING.clinics))}
            </span>
          )}
        </p>
      )}

      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const exact = options.find((o) => o.tier === tier && o.interval === interval);
          const monthly = options.find((o) => o.tier === tier && o.interval === "month");
          const opt = exact ?? monthly;
          if (!opt) return null;
          const featured = tier === "practice";
          const foundingHere = !!founding && featured && opt.interval === "month";
          const copy = t.tiers[tier];
          return (
            <li key={tier} className={`relative flex flex-col rounded-[1.25rem] bg-white p-6 ring-1 ring-dv-line ${featured ? "ring-2 ring-dv-teal" : ""}`}>
              {featured && (
                <span className="absolute -top-3 start-6 rounded-full bg-dv-teal px-3 py-1 text-xs font-semibold text-white">{foundingHere ? t.foundingBadge : t.recommended}</span>
              )}
              <h3 className="font-semibold text-dv-ink">{copy.name}</h3>
              <p className="mt-1 text-sm text-dv-muted">{copy.blurb}</p>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
                {foundingHere && founding ? (
                  <>
                    <span dir="ltr" className="dv-display dv-figure text-[2.75rem] leading-none text-dv-ink">{usd(locale, founding.priceUsd)}</span>
                    <span className="text-sm font-medium text-dv-muted">{t.perMonth}</span>
                    <s className="text-sm text-dv-muted">{usd(locale, opt.priceUsd)}</s>
                  </>
                ) : (
                  <>
                    <span dir="ltr" className="dv-display dv-figure text-[2.75rem] leading-none text-dv-ink">{usd(locale, opt.priceUsd)}</span>
                    <span className="text-sm font-medium text-dv-muted">{opt.interval === "year" ? t.perYear : t.perMonth}</span>
                  </>
                )}
              </p>
              <p className="mt-1 min-h-[1.25rem] text-xs text-dv-muted">
                {foundingHere ? fmt(t.foundingThen, { price: inText(usd(locale, opt.priceUsd)) }) : interval === "year" && opt.interval === "month" ? t.monthlyOnly : ""}
              </p>
              <ul className="mt-4 space-y-2.5 border-t border-dv-line pt-4">
                {copy.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm leading-snug text-dv-body">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => choose(tier, opt.interval)}
                  className={`dv-btn group w-full px-5 py-3 text-sm ${featured ? "dv-btn-primary" : "dv-btn-secondary !text-dv-teal"}`}
                >
                  {busy === tier ? t.opening : fmt(t.choose, { tier: copy.name })}
                  {busy !== tier && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]">
          {error}
        </p>
      )}
      {verifyFor !== null && (
        <div className="mt-5">
          <VerifyCard
            locale={locale}
            email={verifyFor}
            onVerified={() => {
              setVerifyFor(null);
              setError(null);
              // Straight on to the checkout the clinic had asked for.
              if (pending) void choose(pending.tier, pending.interval);
              setPending(null);
            }}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <details className="text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center text-dv-teal">{t.haveCode}</summary>
          <label className="mt-2 block max-w-xs text-xs font-medium text-dv-muted">
            {t.codeLabel}
            <input
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              className="dv-field font-mono text-sm uppercase tracking-wider"
            />
          </label>
        </details>
        <p className="text-xs text-dv-muted">{interval === "year" ? t.fineprintYearly : t.fineprint}</p>
      </div>
    </section>
  );
}

/** A small badge with the clinic's plan, e.g. "Practice plan · Renews on 8 December 2026". */
export function PlanStatus({
  locale,
  state,
  tier,
  renewsAt,
}: {
  locale: Locale;
  state: DvPlanState;
  tier: DvTier | null;
  renewsAt: string | null;
}) {
  const t = appText(locale).billing;
  const tone =
    state === "active"
      ? "bg-dv-teal-50 text-dv-teal ring-dv-teal/20"
      : state === "trial"
        ? "bg-white text-dv-body ring-dv-line"
        : "bg-[#fdf1dc] text-[#7a4b00] ring-[#f0dcb5]";
  const label = state === "active" && tier ? fmt(t.activeTier, { tier: t.tiers[tier].name }) : t.state[state];
  const date = renewsAt && state === "active" ? new Date(renewsAt) : null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-dv-muted">{t.heading}:</span>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
        {state === "active" && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-dv-teal" />}
        {label}
      </span>
      {date && !Number.isNaN(date.getTime()) && (
        <span className="text-xs text-dv-muted">{fmt(t.renews, { date: new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "long" }).format(date) })}</span>
      )}
    </p>
  );
}
