"use client";

import type { Locale } from "@/content/dentvideo-locales";
import { aroundEmail, signupExtraText } from "@/content/dentvideo-signup-extra";
import { TEASER_KEY } from "@/lib/dentvid/onboarding";
import { clinicInitial, inkOn, readTeaserSeed, type TeaserSeed } from "@/lib/dentvid/teaser-seed";
import { suggestDomain } from "@/lib/dentvid/email-typo";
// The hint waits for a press to end before it appears (see the module).
export { pressWatch } from "@/lib/dentvid/after-press";

/**
 * The sign-up page's extras, loaded by start-form.tsx after the page is up
 * (a dynamic import, so the account form's first load stays as it was): the
 * recap of what the landing's teaser chose, its "save your preview" words,
 * and the email typo check. If this chunk never loads, the plain form works.
 */

export { signupExtraText };

/** What the landing's teaser left in this tab, if anything usable. Never throws: touching storage can. */
export function teaserFromSession(): TeaserSeed | null {
  try {
    return readTeaserSeed(window.sessionStorage, TEASER_KEY);
  } catch {
    return null;
  }
}

/**
 * Above the sign-up form: logo on the brand colour (or the initial), name, what happens next. As the plan step's recap.
 * It fills the box start-form.tsx keeps for it from the first paint: the same min-height (min-h-[6.75rem]) on both, so
 * the form does not move when this arrives.
 */
export function TeaserRecap({ locale, seed }: { locale: Locale; seed: TeaserSeed }) {
  const x = signupExtraText(locale);
  return (
    <div data-teaser-recap className="flex min-h-[6.75rem] items-center gap-4 rounded-2xl bg-white/80 p-3 pe-4 shadow-[var(--dv-shadow-1)] backdrop-blur">
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: seed.brandColor }}>
        {seed.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL from this browser
          <img src={seed.logo} alt="" className="max-h-9 max-w-9 rounded bg-white/90 object-contain p-0.5" />
        ) : (
          <span className="text-lg font-semibold" style={{ color: inkOn(seed.brandColor) }}>
            {clinicInitial(seed.name, locale)}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium uppercase tracking-[0.08em] text-dv-muted">{x.recapLabel}</span>
        {seed.name && (
          <span dir="auto" className="line-clamp-2 block font-semibold leading-snug text-dv-ink [overflow-wrap:anywhere]">
            {seed.name}
          </span>
        )}
        <span className="mt-0.5 block text-sm leading-snug text-dv-body">{x.recapLine}</span>
      </span>
    </div>
  );
}

/** The hint paragraph's id: the button points at it, so it is announced as "Did you mean …?", not as a bare address. */
export const EMAIL_HINT_ID = "dv-email-hint";

/**
 * Under the sign-up's email field: "Did you mean <button>address</button>?"
 * when `email` looks like a slip of a common provider. start-form.tsx passes
 * the address as it was when the field was left, and "" while it is being
 * typed, so nothing is suggested mid-word. One tap puts the address in the
 * field; it is never a submit, and ignoring it is fine. The paragraph is
 * there while empty, so screen readers announce the hint when it appears.
 */
export function EmailHint({ locale, email, onFix }: { locale: Locale; email: string; onFix: (address: string) => void }) {
  const suggestion = suggestDomain(email);
  const [before, after] = aroundEmail(signupExtraText(locale).didYouMean);
  return (
    <p id={EMAIL_HINT_ID} aria-live="polite" data-email-hint className="mt-2 text-sm leading-relaxed text-dv-body empty:mt-0">
      {suggestion && (
        <>
          {before}
          <button
            type="button"
            dir="ltr"
            aria-describedby={EMAIL_HINT_ID}
            onClick={(e) => {
              onFix(suggestion);
              // Back to the field it fixed (the button itself goes away).
              e.currentTarget.form?.querySelector<HTMLInputElement>('[data-field="email"]')?.focus();
            }}
            className="rounded-md py-2 font-semibold text-dv-teal underline decoration-dv-teal/40 underline-offset-4 [overflow-wrap:anywhere] hover:decoration-dv-teal"
          >
            {suggestion}
          </button>
          {after}
        </>
      )}
    </p>
  );
}
