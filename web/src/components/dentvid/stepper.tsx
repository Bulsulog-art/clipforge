"use client";

import { Check } from "lucide-react";
import type { Locale } from "@/content/dentvideo-locales";
import { appText, fmt } from "@/content/dentvideo-app";
import { ONBOARDING_STEPS, stepIndex, type OnboardingStep } from "@/lib/dentvid/onboarding";

// Its own module (onboarding.tsx re-exports it): the sign-up form shows the stepper too, and importing it
// from onboarding.tsx pulled the whole wizard (clinic form, plans, checkout) into the sign-up page.

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
