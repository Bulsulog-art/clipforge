"use client";

import { useEffect, useRef, useState } from "react";
import { CHECKOUT_CODE, DODO_DISCOUNT_BUTTON, checkoutNext } from "@/content/dentvideo-checkout-code";
import { dateLocale } from "@/lib/dentvid/app-ui";
import { ArrowRight, Check, Mail } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import { DV_SELF_SERVE_TIERS, type DvInterval, type DvPlanState, type DvTier } from "@/lib/dentvid/billing";
import { GROUP_CONTACT, groupMailto } from "@/content/dentvideo-group";
import { VerifyCard } from "./verify-email";
import { CheckoutConsent } from "./consent-line";
import { trackDv } from "@/lib/dentvid/events-client";

export type PlanOption = { tier: DvTier; interval: DvInterval; priceUsd: number };

/** The cards a clinic can buy itself; Group follows them as a "Contact us" card. */
const TIERS = DV_SELF_SERVE_TIERS;

/** A tier's display name — Group included (a legacy Group subscription still shows its name). */
export function tierName(locale: Locale, tier: DvTier): string {
  return tier === "group" ? GROUP_CONTACT[locale].name : appText(locale).billing.tiers[tier].name;
}

export function usd(locale: Locale, amount: number) {
  // Arabic pages write "$39" as the landing does (Western digits, no right-to-left marks to reorder it).
  return new Intl.NumberFormat(locale === "ar" ? "en-US" : locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

/** "Choose your plan": Starter and Practice (monthly), Group as Contact us. */
export function PlanPanel({
  locale,
  state,
  options,
  bare = false,
  keepVideos = false,
  onNeedsVerification,
}: {
  locale: Locale;
  state: DvPlanState;
  /** The monthly plans on sale (billing.ts dvAvailablePlans). */
  options: PlanOption[];
  /** Inside the onboarding wizard the step has its own heading: keep the panel's title for screen readers only. */
  bare?: boolean;
  /** Paused or cancelled with videos in the library: say they stay, and can still be shared. */
  keepVideos?: boolean;
  /** Checkout refused an unconfirmed address and the page shows its own code card (the onboarding plan step). */
  onNeedsVerification?: () => void;
}) {
  const text = appText(locale);
  const t = text.billing;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<DvTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Inline code card (in the app, where the page has none): the address to confirm. */
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  /** The plan that was chosen when checkout asked for the code: checkout resumes with it once confirmed. */
  const [pending, setPending] = useState<{ tier: DvTier; interval: DvInterval } | null>(null);
  /** A payment link that needs the code typed on Dodo's page (no API checkout): shown before leaving. */
  const [typeCode, setTypeCode] = useState<{ url: string; code: string; copied: boolean } | null>(null);

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
      const next = res.ok ? checkoutNext(body) : { kind: "none" as const };
      if (next.kind === "go") {
        window.location.href = next.url;
        return;
      }
      // A payment link cannot carry the discount: say how to apply it there before leaving.
      if (next.kind === "typeCode") {
        setTypeCode({ url: next.url, code: next.code, copied: false });
        void navigator.clipboard?.writeText(next.code).then(
          () => setTypeCode((s) => (s ? { ...s, copied: true } : s)),
          () => {},
        );
        setBusy(null);
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
      </div>

      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const opt = options.find((o) => o.tier === tier && o.interval === "month");
          if (!opt) return null;
          const featured = tier === "practice";
          const copy = t.tiers[tier];
          return (
            <li key={tier} className={`relative flex flex-col rounded-[1.25rem] bg-white p-6 ring-1 ring-dv-line ${featured ? "ring-2 ring-dv-teal" : ""}`}>
              {featured && (
                <span className="absolute -top-3 start-6 rounded-full bg-dv-teal px-3 py-1 text-xs font-semibold text-white">{t.recommended}</span>
              )}
              <h3 className="font-semibold text-dv-ink">{copy.name}</h3>
              <p className="mt-1 text-sm text-dv-muted">{copy.blurb}</p>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
                <span dir="ltr" className="dv-display dv-figure text-[2.75rem] leading-none text-dv-ink">{usd(locale, opt.priceUsd)}</span>
                <span className="text-sm font-medium text-dv-muted">{t.perMonth}</span>
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
        <li className="relative flex flex-col rounded-[1.25rem] bg-white p-6 ring-1 ring-dv-line" data-tier="group">
          <h3 className="font-semibold text-dv-ink">{GROUP_CONTACT[locale].name}</h3>
          <p className="mt-5 dv-display text-[1.5rem] leading-tight text-dv-ink">{GROUP_CONTACT[locale].price}</p>
          <p className="mt-4 border-t border-dv-line pt-4 text-sm leading-relaxed text-dv-body">{GROUP_CONTACT[locale].text}</p>
          <div className="mt-auto pt-6">
            <a
              href={groupMailto(locale)}
              onClick={() => trackDv("plan_clicked", { locale, props: { tier: "group", interval: "month", where: bare ? "onboarding" : "app" } })}
              className="dv-btn dv-btn-secondary w-full px-5 py-3 text-sm !text-dv-teal"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {GROUP_CONTACT[locale].cta}
            </a>
          </div>
        </li>
      </ul>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]">
          {error}
        </p>
      )}
      {typeCode && <TypeCodeCard locale={locale} {...typeCode} onCopied={() => setTypeCode({ ...typeCode, copied: true })} onBack={() => setTypeCode(null)} />}
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
        <p className="text-xs text-dv-muted">{t.fineprint}</p>
      </div>
      <div className="mt-3">
        <CheckoutConsent locale={locale} />
      </div>
    </section>
  );
}

/** Before a payment link that cannot carry the discount: the code, how to apply it on Dodo's page, and the way on. */
function TypeCodeCard({
  locale,
  url,
  code,
  copied,
  onCopied,
  onBack,
}: {
  locale: Locale;
  url: string;
  code: string;
  copied: boolean;
  onCopied: () => void;
  onBack: () => void;
}) {
  const c = CHECKOUT_CODE[locale];
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    card.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    card.current?.focus();
  }, []);
  const [before, after = ""] = c.body.replace("{button}", DODO_DISCOUNT_BUTTON).split("{code}");
  return (
    <div ref={card} tabIndex={-1} role="region" aria-labelledby="dv-type-code-title" className="mt-5 rounded-2xl bg-[#fdf1dc] p-5 ring-1 ring-[#f0dcb5] outline-none sm:p-6" data-testid="dv-type-code">
      <h3 id="dv-type-code-title" className="font-semibold text-dv-ink">{c.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-dv-body">
        {before}
        <code dir="ltr" className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-dv-ink">{code}</code>
        {after}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(code).then(onCopied, () => {})}
          className="dv-btn dv-btn-secondary px-5 py-3 text-sm !text-dv-teal"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
          {copied ? c.copied : c.copy}
        </button>
        <a href={url} className="dv-btn dv-btn-primary group px-5 py-3 text-sm">
          {c.go}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        </a>
        <button type="button" onClick={onBack} className="min-h-11 rounded-md px-1 text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
          {c.back}
        </button>
      </div>
    </div>
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
  const label = state === "active" && tier ? fmt(t.activeTier, { tier: tierName(locale, tier) }) : t.state[state];
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
