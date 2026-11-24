"use client";

import { useEffect, useState } from "react";
import { dateLocale } from "@/lib/dentvid/app-ui";
import { ArrowRight, Check, Loader2, Lock, Mail } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import { DV_SELF_SERVE_TIERS, type DvInterval, type DvPlanOption, type DvPlanState, type DvTier } from "@/lib/dentvid/billing";
import { DV_TAX_LABEL, dvPriceContext, formatDvPrice } from "@/lib/dentvid/pricing";
import { GROUP_CONTACT, groupMailto } from "@/content/dentvideo-group";
import { VerifyCard } from "./verify-email";
import { CheckoutConsent } from "./consent-line";
import { HelpLine } from "./help-line";
import { trackDv } from "@/lib/dentvid/events-client";

/** A plan on sale, with its list price in every currency (billing.ts dvAvailablePlans). */
export type PlanOption = DvPlanOption;

/** The cards a clinic can buy itself; Group follows them as a "Contact us" card. */
const TIERS = DV_SELF_SERVE_TIERS;

/** A tier's display name — Group included (a legacy Group subscription still shows its name). */
export function tierName(locale: Locale, tier: DvTier): string {
  return tier === "group" ? GROUP_CONTACT[locale].name : appText(locale).billing.tiers[tier].name;
}

/**
 * A plan's monthly list price in the currency the clinic is charged in — its
 * country picks it, exactly as the checkout tells Dodo (billing.ts
 * buildDvCheckout) — e.g. "$49", "79 €", "1.490 TL".
 */
export function planPrice(locale: Locale, opt: Pick<PlanOption, "prices">, country: string | null | undefined): string {
  const { currency } = dvPriceContext(country);
  return formatDvPrice(locale, currency, opt.prices[currency]);
}

/** "+ VAT", "+ KDV", "+ applicable tax" for the clinic's country. */
export function planTax(locale: Locale, country: string | null | undefined): string {
  return DV_TAX_LABEL[locale][dvPriceContext(country).tax];
}

/** "USD", "EUR" or "TL" for the clinic's country: fills {currency} in the fine print. */
export function planCurrencyWord(country: string | null | undefined): string {
  const { currency } = dvPriceContext(country);
  return currency === "TRY" ? "TL" : currency;
}

/** "Choose your plan": Starter and Practice (monthly), Group as Contact us. */
export function PlanPanel({
  locale,
  state,
  options,
  country,
  bare = false,
  keepVideos = false,
  onNeedsVerification,
}: {
  locale: Locale;
  state: DvPlanState;
  /** The monthly plans on sale (billing.ts dvAvailablePlans). */
  options: PlanOption[];
  /** The clinic's country (profile.country): the currency shown is the one the checkout charges. */
  country?: string | null;
  /** Inside the onboarding wizard the step has its own heading: keep the panel's title for screen readers only. */
  bare?: boolean;
  /** Paused or cancelled with videos in the library: say they stay, and can still be shared. */
  keepVideos?: boolean;
  /** Checkout refused an unconfirmed address and the page shows its own code card (the onboarding plan step). */
  onNeedsVerification?: () => void;
}) {
  const text = appText(locale);
  const t = text.billing;
  const [busy, setBusy] = useState<DvTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The reference the support line under the error carries ("checkout-502"). */
  const [errorCode, setErrorCode] = useState("checkout");
  /** Inline code card (in the app, where the page has none): the address to confirm. */
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  /** The plan that was chosen when checkout asked for the code: checkout resumes with it once confirmed. */
  const [pending, setPending] = useState<{ tier: DvTier; interval: DvInterval } | null>(null);

  const lead = state === "paused" ? t.leadPaused : state === "cancelled" ? t.leadCancelled : t.leadTrial;

  // Back from Dodo with the browser's Back button: Safari (and Chrome, where it may) restores this page
  // from the back-forward cache as it was left — "Opening checkout…" with every button disabled.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function choose(tier: DvTier, chosen: DvInterval) {
    setBusy(tier);
    setError(null);
    trackDv("plan_clicked", { locale, props: { tier, interval: chosen, where: bare ? "onboarding" : "app" } });
    try {
      const res = await fetch("/api/dentvideo/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: tier, interval: chosen }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string; email?: string };
      // Only ever a Dodo https URL: straight on to the payment page.
      if (res.ok && typeof body.url === "string" && /^https:\/\//.test(body.url)) {
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
      setErrorCode(`checkout-${res.status}`);
      setError(body.error ?? text.errors.checkoutFailed);
    } catch {
      setErrorCode("checkout-network");
      setError(text.errors.checkoutFailed);
    }
    setBusy(null);
  }

  return (
    // In the app the plans sit on a soft panel of their own; in the wizard the step is the panel.
    <section
      id="plans"
      aria-labelledby="plans-title"
      className={`relative isolate scroll-mt-24 ${bare ? "" : "overflow-hidden rounded-[var(--dv-radius-lg)] bg-gradient-to-b from-white/70 to-[#f6f1e9] px-3 py-5 ring-1 ring-inset ring-dv-line sm:p-8"}`}
    >
      <div className={bare ? "sr-only" : "max-w-2xl px-2 sm:px-0"}>
        <h2 id="plans-title" className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{t.chooseTitle}</h2>
        <p className="mt-2 leading-relaxed text-dv-body">{lead}</p>
        {keepVideos && state !== "trial" && <p className="mt-2 text-sm text-dv-muted">{t.keepVideos}</p>}
      </div>

      {/* As on the landing: the two plans side by side from md, the recommended one with a gradient hairline,
          Group as a slim row under them (it has no price to compare). */}
      <ul className={`mx-auto grid max-w-[60rem] gap-4 md:grid-cols-2 md:items-stretch lg:gap-6 ${bare ? "" : "mt-6 sm:mt-8"}`}>
        {TIERS.map((tier) => {
          const opt = options.find((o) => o.tier === tier && o.interval === "month");
          if (!opt) return null;
          const featured = tier === "practice";
          const copy = t.tiers[tier];
          return (
            <li key={tier} data-tier={tier} className={`relative flex flex-col rounded-[1.5rem] p-5 sm:p-8 ${featured ? "dv-featured" : "dv-card"}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h3 className="text-lg font-semibold text-dv-ink">{copy.name}</h3>
                {featured && (
                  <span className="rounded-full bg-dv-teal-50 px-3 py-1 text-xs font-semibold text-dv-teal ring-1 ring-inset ring-dv-teal/25">{t.recommended}</span>
                )}
              </div>
              {/* Held to two lines from md up, so the prices of the side-by-side plans sit on one line. */}
              <p className="mt-1 text-sm leading-relaxed text-dv-muted md:min-h-[2lh]">{copy.blurb}</p>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-1.5">
                <span dir="ltr" className="dv-price text-[2.75rem] font-semibold leading-none tracking-tight text-dv-ink sm:text-[3rem]" data-price={tier}>{planPrice(locale, opt, country)}</span>
                <span className="text-[0.9375rem] font-medium text-dv-muted">{t.perMonth}</span>
                <span className="text-xs font-medium text-dv-muted" data-tax>{planTax(locale, country)}</span>
              </p>
              <ul className="mt-6 space-y-3 border-t border-dv-line pt-6">
                {copy.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-dv-body">
                    <span aria-hidden="true" className="mt-[0.2rem] flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-dv-teal-50 text-dv-teal ring-1 ring-inset ring-dv-teal/20">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => choose(tier, opt.interval)}
                  aria-busy={busy === tier}
                  className={`dv-btn w-full px-5 py-3.5 text-[0.9375rem] ${featured ? "dv-btn-primary" : "dv-btn-secondary !text-dv-teal"}`}
                >
                  {busy === tier && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  {busy === tier ? t.opening : fmt(t.choose, { tier: copy.name })}
                  {busy !== tier && <ArrowRight className="dv-nudge h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />}
                </button>
              </div>
            </li>
          );
        })}
        <li className="dv-card relative flex flex-col gap-5 p-5 sm:p-8 md:col-span-2 md:flex-row md:items-center md:gap-8" data-tier="group">
          <div className="md:w-48 md:shrink-0">
            <h3 className="text-lg font-semibold text-dv-ink">{GROUP_CONTACT[locale].name}</h3>
            <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-dv-teal">{GROUP_CONTACT[locale].price}</p>
          </div>
          <p className="border-t border-dv-line pt-5 text-[0.9375rem] leading-relaxed text-dv-body md:flex-1 md:border-s md:border-t-0 md:ps-8 md:pt-0">{GROUP_CONTACT[locale].text}</p>
          <div className="md:shrink-0">
            <a
              href={groupMailto(locale)}
              onClick={() => trackDv("plan_clicked", { locale, props: { tier: "group", interval: "month", where: bare ? "onboarding" : "app" } })}
              className="dv-btn dv-btn-secondary w-full px-6 py-3 text-[0.9375rem] !text-dv-teal md:w-auto"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {GROUP_CONTACT[locale].cta}
            </a>
          </div>
        </li>
      </ul>

      <div className={`mx-auto max-w-[60rem] ${bare ? "" : "px-2 sm:px-0"}`}>
        {error && (
          <>
            <p role="alert" className="mt-5 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]">
              {error}
            </p>
            {/* Paying is where a dead end costs the most: a person to write to, never just "try again". */}
            <HelpLine locale={locale} code={errorCode} message={error} />
          </>
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

        <div className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-dv-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dv-teal" aria-hidden="true" />
          <p>{t.fineprint.replace("{currency}", planCurrencyWord(country))}</p>
        </div>
        <div className="mt-3">
          <CheckoutConsent locale={locale} />
        </div>
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
  endsAt = null,
}: {
  locale: Locale;
  state: DvPlanState;
  tier: DvTier | null;
  renewsAt: string | null;
  /** Cancelled, still in its paid period: "ends on" instead of "renews on" (lib/dentvid/billing.ts planEndsAt). */
  endsAt?: string | null;
}) {
  const t = appText(locale).billing;
  const tone =
    state === "active"
      ? "bg-dv-teal-50 text-dv-teal ring-dv-teal/20"
      : state === "trial"
        ? "bg-white text-dv-body ring-dv-line"
        : "bg-[#fdf1dc] text-[#7a4b00] ring-[#f0dcb5]";
  const label = state === "active" && tier ? fmt(t.activeTier, { tier: tierName(locale, tier) }) : t.state[state];
  const date = (endsAt ?? renewsAt) && state === "active" ? new Date((endsAt ?? renewsAt)!) : null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-dv-muted">{t.heading}:</span>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
        {state === "active" && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-dv-teal" />}
        {label}
      </span>
      {date && !Number.isNaN(date.getTime()) && (
        <span className="text-xs text-dv-muted">{fmt(endsAt ? t.ends : t.renews, { date: new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "long" }).format(date) })}</span>
      )}
    </p>
  );
}
