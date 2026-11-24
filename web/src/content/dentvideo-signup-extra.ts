/**
 * The sign-up page's extra words, loaded with the extras chunk
 * (components/dentvid/signup-extras): the recap of what the visitor chose in
 * the landing's teaser in this tab (name, logo, colour), and the "did you
 * mean …?" hint under the email field (lib/dentvid/email-typo). The "save
 * your preview" title and lead are in dentvideo-signup-saved.ts, because the
 * page picks them before its first paint. Kept apart from dentvideo-app.ts.
 *
 * Every site language has its own entry (Record<Locale, …>; the test checks
 * keys and placeholders). Tone as in the rest of the funnel (docs/MARKETS.md):
 * "Sie" in German, "tú" in Spanish, "siz" in Turkish, "vous" in French,
 * です・ます and no あなた in Japanese, plural أنتم in Arabic, "Państwo" and
 * no informal forms in Polish.
 *
 * Honest by construction: what the teaser chose is kept in this browser tab
 * and fills in the clinic step after sign-up (components/dentvid/onboarding);
 * nothing here says it is already on the visitor's videos or in an account.
 */
import type { Locale } from "./dentvideo-locales";

export type SignupExtraCopy = {
  /** Small label above the clinic's name in the recap. */
  recapLabel: string;
  /** The recap's one line: what happens to these choices. */
  recapLine: string;
  /** Under the email field; {email} becomes a button that puts that address in the field. */
  didYouMean: string;
};

export const SIGNUP_EXTRA: Readonly<Record<Locale, SignupExtraCopy>> = {
  en: {
    recapLabel: "Your preview",
    recapLine: "Once your account is created, these will already be filled in for you.",
    didYouMean: "Did you mean {email}?",
  },
  de: {
    recapLabel: "Ihre Vorschau",
    recapLine: "Nach dem Anlegen Ihres Kontos ist das bereits für Sie eingetragen.",
    didYouMean: "Meinten Sie {email}?",
  },
  es: {
    recapLabel: "Tu vista previa",
    recapLine: "Crea tu cuenta y esto ya estará rellenado.",
    didYouMean: "¿Quisiste decir {email}?",
  },
  tr: {
    recapLabel: "Önizlemeniz",
    recapLine: "Hesabınızı açtığınızda bunlar sizin için hazır olacak.",
    didYouMean: "Bunu mu demek istediniz: {email}",
  },
  fr: {
    recapLabel: "Votre aperçu",
    recapLine: "Une fois votre compte créé, tout cela est déjà rempli pour vous.",
    didYouMean: "Vouliez-vous dire {email} ?",
  },
  ja: {
    recapLabel: "プレビュー",
    recapLine: "アカウントを作成すると、これらが入力済みの状態で始まります。",
    didYouMean: "{email} のお間違いではありませんか？",
  },
  ar: {
    recapLabel: "معاينتكم",
    recapLine: "عند إنشاء حسابكم ستجدون هذه البيانات معبأة مسبقاً.",
    didYouMean: "هل تقصدون {email}؟",
  },
  pl: {
    recapLabel: "Państwa podgląd",
    recapLine: "Po założeniu konta te dane będą już wpisane.",
    didYouMean: "Czy chodziło o {email}?",
  },
};

export function signupExtraText(locale: string | null | undefined): SignupExtraCopy {
  return (SIGNUP_EXTRA as Record<string, SignupExtraCopy>)[(locale ?? "en").slice(0, 2)] ?? SIGNUP_EXTRA.en;
}

/** "Did you mean {email}?" split around the address, so the address can be a button: [before, after]. */
export function aroundEmail(template: string): [string, string] {
  const i = template.indexOf("{email}");
  return i < 0 ? [template, ""] : [template.slice(0, i), template.slice(i + "{email}".length)];
}
