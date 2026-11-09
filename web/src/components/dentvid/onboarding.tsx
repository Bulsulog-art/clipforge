"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Check, Pencil } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import type { ClinicProfile } from "@/lib/dentvid/profile";
import { ONBOARDING_STEPS, STEP_COOKIE, TEASER_KEY, stepIndex, type OnboardingStep } from "@/lib/dentvid/onboarding";
import { BrandFields, ClinicDetailsFields, HandleField, LanguageField, useClinicDraft, type ClinicDraft } from "./clinic-form";
import { PlanPanel, type PlanOption } from "./plan-panel";
import { VerifiedNote, VerifyCard, type VerifyCardHandle } from "./verify-email";
import type { PreviewProfile } from "./live-preview";
import { trackDv } from "@/lib/dentvid/events-client";

/** The live preview runs only in the browser (canvas/video, object URLs): load it there, lazily. */
const LivePreview = dynamic(() => import("./live-preview").then((m) => m.LivePreview), {
  ssr: false,
  loading: () => <PhoneSkeleton />,
});

function PhoneSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto aspect-[9/19.5] w-full max-w-[18rem] animate-pulse rounded-[2.6rem] bg-[#1b2523] p-[10px]">
      <div className="h-full rounded-[2.1rem] bg-[#0b3f3e]" />
    </div>
  );
}

/** "Step 2 of 4": numbered steps on wide screens, a slim progress bar on phones. */
export function Stepper({ locale, current }: { locale: Locale; current: OnboardingStep }) {
  const t = appText(locale).onboarding;
  const at = stepIndex(current);
  return (
    <nav aria-label={fmt(t.stepOf, { n: at + 1, total: ONBOARDING_STEPS.length })} className="mx-auto w-full max-w-3xl">
      {/* phones */}
      <div className="sm:hidden">
        <p className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-dv-ink">{t.steps[current]}</span>
          <span className="text-dv-muted">{fmt(t.stepOf, { n: at + 1, total: ONBOARDING_STEPS.length })}</span>
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {ONBOARDING_STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 rounded-full ${i <= at ? "bg-dv-teal" : "bg-dv-line"}`} />
          ))}
        </div>
      </div>
      {/* tablets and up */}
      <ol className="hidden items-center sm:flex">
        {ONBOARDING_STEPS.map((s, i) => {
          const done = i < at;
          const here = i === at;
          return (
            <li key={s} className={`flex items-center ${i < ONBOARDING_STEPS.length - 1 ? "flex-1" : ""}`} aria-current={here ? "step" : undefined}>
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    done ? "bg-dv-teal text-white" : here ? "bg-white text-dv-teal ring-2 ring-dv-teal" : "bg-white text-dv-muted ring-1 ring-dv-line"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span className={`whitespace-nowrap text-sm ${here ? "font-semibold text-dv-ink" : done ? "font-medium text-dv-body" : "text-dv-muted"}`}>{t.steps[s]}</span>
              </span>
              {i < ONBOARDING_STEPS.length - 1 && <span aria-hidden="true" className={`mx-4 h-px flex-1 ${done ? "bg-dv-teal" : "bg-dv-line"}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function rememberStep(step: OnboardingStep) {
  try {
    const now = document.cookie.match(new RegExp(`(?:^|; )${STEP_COOKIE}=([^;]*)`))?.[1];
    // Remember the furthest step only: going back to edit does not lose "plan".
    if (now === "plan" && step !== "plan") return;
    document.cookie = `${STEP_COOKIE}=${step}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  } catch {
    // cookies blocked: the server falls back to the preview step
  }
}

type Props = {
  locale: Locale;
  step: Exclude<OnboardingStep, "account">;
  initial?: Partial<ClinicProfile>;
  /** Signed URL of the saved logo. */
  logoUrl?: string | null;
  plans: PlanOption[];
  founding: { priceUsd: number; code?: string } | null;
  /** Back from Dodo without paying. */
  checkoutCancelled?: boolean;
  /** The signed-in account's address and whether it is confirmed (lib/dentvid/verify-email). */
  account?: { email: string; verified: boolean };
  /** Dev harness: show the code card without asking the server for a code. */
  autoSendCode?: boolean;
};

/**
 * Steps 2–4 of the paid funnel — clinic details, live preview, plan — in one
 * client component, so the profile being edited (and a logo not uploaded
 * yet) carries from step to step without a round trip. Each step's position
 * is kept in the URL (?step=) and the furthest one in a cookie, so a
 * returning visitor lands where they left off (lib/dentvid/onboarding.ts).
 */
export function Onboarding({ locale, step: initialStep, initial, logoUrl, plans, founding, checkoutCancelled, account, autoSendCode = true }: Props) {
  const t = appText(locale).onboarding;
  const draft = useClinicDraft({ locale, initial, logoUrl });
  const [step, setStep] = useState(initialStep);

  useEffect(() => rememberStep(initialStep), [initialStep]);
  // Funnel (once per tab): the wizard's first live preview, and the preview step itself.
  useEffect(() => {
    if (step === "clinic" || step === "preview") trackDv("preview_started", { locale, props: { where: "wizard" }, once: "preview:wizard" });
    if (step === "preview") trackDv("preview_step_viewed", { locale, once: "preview-step" });
  }, [step, locale]);

  // Arrived from the landing's "Try it with your logo": carry the name,
  // colour, language and logo over (a new clinic only).
  useEffect(() => {
    if (initial?.name) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(TEASER_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const seed = JSON.parse(raw) as { name?: string; brandColor?: string; logo?: string; logoName?: string };
      if (seed.name) draft.update("name", seed.name.slice(0, 80));
      if (seed.brandColor && /^#[0-9a-f]{6}$/i.test(seed.brandColor)) draft.update("brandColor", seed.brandColor.toLowerCase());
      if (seed.logo?.startsWith("data:image/")) {
        void fetch(seed.logo)
          .then((r) => r.blob())
          .then((b) => draft.chooseLogo(new File([b], seed.logoName || "logo.png", { type: b.type || "image/png" })))
          .catch(() => {});
      }
    } catch {
      // ignore a malformed seed
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(next: Exclude<OnboardingStep, "account">) {
    setStep(next);
    rememberStep(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("step", next);
      url.searchParams.delete("billing");
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main lang={locale} dir={dirOf(locale)} className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-x-0 top-0 -z-10 h-[40rem]" />
      <div aria-hidden="true" className="absolute -end-40 top-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <Stepper locale={locale} current={step} />
        {step === "clinic" && <ClinicStep locale={locale} draft={draft} onDone={() => go("preview")} />}
        {step === "preview" && <PreviewStep locale={locale} draft={draft} onBack={() => go("clinic")} onDone={() => go("plan")} />}
        {step === "plan" && (
          <PlanStep
            locale={locale}
            preview={draft.preview}
            plans={plans}
            founding={founding}
            cancelled={!!checkoutCancelled}
            onEdit={() => go("preview")}
            account={account}
            autoSendCode={autoSendCode}
          />
        )}
      </div>
    </main>
  );
}

function StepHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header className="mx-auto mt-10 max-w-3xl text-center sm:mt-14">
      <h1 className="dv-display text-balance text-[2.5rem] leading-[1.04] text-dv-ink sm:text-[3.25rem]">{title}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-[1.0625rem] leading-relaxed text-dv-body">{lead}</p>
    </header>
  );
}

function useSave(draft: ClinicDraft, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await draft.save();
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, submit };
}

function ClinicStep({ locale, draft, onDone }: { locale: Locale; draft: ClinicDraft; onDone: () => void }) {
  const text = appText(locale);
  const t = text.onboarding;
  const { busy, error, submit } = useSave(draft, onDone);
  return (
    <>
      <StepHeader title={t.clinicTitle} lead={t.clinicLead} />
      <form onSubmit={submit} className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        <div className="dv-card p-5 sm:p-8">
          <ClinicDetailsFields draft={draft} locale={locale} />
          <div className="mt-8 border-t border-dv-line pt-7">
            <h2 className="text-base font-semibold text-dv-ink">{t.brandHeading}</h2>
            <p className="mt-1 text-sm text-dv-muted">{t.brandHint}</p>
            <div className="mt-5">
              <BrandFields draft={draft} locale={locale} />
            </div>
          </div>
          {error && <p className="mt-6 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="dv-btn dv-btn-primary group mt-8 w-full px-7 py-4 text-base sm:w-auto">
            {busy ? text.form.saving : t.clinicNext}
            {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />}
          </button>
        </div>
        {/* A first glimpse while typing; the next step is the full preview. */}
        <aside className="hidden lg:block" aria-hidden="true" inert>
          <div className="sticky top-24">
            <LivePreview profile={draft.preview} />
          </div>
        </aside>
      </form>
    </>
  );
}

function PreviewStep({ locale, draft, onBack, onDone }: { locale: Locale; draft: ClinicDraft; onBack: () => void; onDone: () => void }) {
  const text = appText(locale);
  const t = text.onboarding;
  const f = text.form;
  // Unchanged since the last save: nothing to upload, just move on.
  const { busy, error, submit } = useSave(draft, onDone);
  const next = (e: React.FormEvent) => (draft.dirty ? submit(e) : (e.preventDefault(), onDone()));
  return (
    <>
      <StepHeader title={t.previewTitle} lead={t.previewLead} />
      <div className="mt-10 grid items-start gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="relative lg:sticky lg:top-24">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl" style={{ background: draft.p.brandColor }} />
          <div className="mx-auto w-full max-w-[14.5rem] sm:max-w-[19rem] lg:max-w-[21rem]">
            <LivePreview profile={draft.preview} />
          </div>
          <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-relaxed text-dv-muted">{t.previewNote}</p>
        </div>

        <form onSubmit={next} className="dv-card p-5 sm:p-8">
          <h2 className="dv-display text-[1.875rem] leading-tight">{t.previewControls}</h2>
          <div className="mt-6 grid gap-5">
            <label className="block text-sm font-semibold text-dv-ink">
              {f.clinicName}
              <input required value={draft.p.name} onChange={draft.set("name")} className="dv-field" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <HandleField draft={draft} t={f} />
              <LanguageField draft={draft} t={f} />
            </div>
            <div className="border-t border-dv-line pt-5">
              <BrandFields draft={draft} locale={locale} />
            </div>
          </div>
          {error && <p className="mt-6 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="dv-btn dv-btn-primary group mt-8 w-full px-7 py-4 text-base">
            {busy ? f.saving : t.previewNext}
            {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />}
          </button>
          <button type="button" onClick={onBack} className="mx-auto mt-3 flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {t.editDetails}
          </button>
        </form>
      </div>
    </>
  );
}

function PlanStep({
  locale,
  preview,
  plans,
  founding,
  cancelled,
  onEdit,
  account,
  autoSendCode,
}: {
  locale: Locale;
  preview: PreviewProfile;
  plans: PlanOption[];
  founding: { priceUsd: number; code?: string } | null;
  cancelled: boolean;
  onEdit: () => void;
  account?: { email: string; verified: boolean };
  autoSendCode: boolean;
}) {
  const t = appText(locale).onboarding;
  // Checkout waits for a confirmed address; the clinic and preview steps never do.
  const [verified, setVerified] = useState(account?.verified ?? true);
  const [justVerified, setJustVerified] = useState(false);
  const card = useRef<VerifyCardHandle>(null);
  return (
    <>
      <StepHeader title={t.planTitle} lead={t.planLead} />
      {cancelled && (
        <p role="status" className="mx-auto mt-8 max-w-3xl rounded-xl bg-[#fdf1dc] px-4 py-3 text-center text-sm text-[#7a4b00]">
          {t.cancelled}
        </p>
      )}
      <div className="mx-auto mt-10 flex max-w-3xl items-center gap-4 rounded-2xl bg-white/80 p-3 pe-4 ring-1 ring-dv-line backdrop-blur">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: preview.brandColor }}>
          {preview.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL or signed URL
            <img src={preview.logoUrl} alt="" className="max-h-9 max-w-9 rounded bg-white/90 object-contain p-0.5" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium uppercase tracking-[0.08em] text-dv-muted">{t.planRecap}</span>
          <span className="line-clamp-2 block font-semibold leading-snug text-dv-ink [overflow-wrap:anywhere]">{preview.name || "—"}</span>
        </span>
        <button type="button" onClick={onEdit} className="dv-btn dv-btn-secondary shrink-0 px-4 py-2 text-sm !text-dv-teal">
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t.back}
        </button>
      </div>
      {account && !verified && (
        <div className="mt-6">
          <VerifyCard
            ref={card}
            locale={locale}
            email={account.email}
            autoSend={autoSendCode}
            onVerified={() => {
              setVerified(true);
              setJustVerified(true);
            }}
          />
        </div>
      )}
      {justVerified && (
        <div className="mt-6">
          <VerifiedNote locale={locale} />
        </div>
      )}
      <div className="mt-6">
        <PlanPanel
          locale={locale}
          state="trial"
          options={plans}
          founding={founding}
          bare
          onNeedsVerification={
            account
              ? () => {
                  setVerified(false);
                  setJustVerified(false);
                  setTimeout(() => card.current?.focus(), 0);
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
