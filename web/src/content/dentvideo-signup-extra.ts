/**
 * The sign-up page's extra words: the "save your preview" variant shown when
 * the visitor filled the landing's teaser in this tab (name, logo, colour),
 * the recap of what they chose, and the "did you mean …?" hint under the
 * email field (lib/dentvid/email-typo). Kept apart from dentvideo-app.ts.
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
  /** Sign-up title when the teaser was filled (instead of start.titleSignup). */
  titleSaved: string;
  /** Sign-up lead in that case (instead of start.leadSignup): still says payment only comes with a plan. */
  leadSaved: string;
  /** Small label above the clinic's name in the recap. */
  recapLabel: string;
  /** The recap's one line: what happens to these choices. */
  recapLine: string;
  /** Under the email field; {email} becomes a button that puts that address in the field. */
  didYouMean: string;
};

export const SIGNUP_EXTRA: Readonly<Record<Locale, SignupExtraCopy>> = {
  en: {
    titleSaved: "Save your preview",
    leadSaved: "Create an account to keep what you chose. Next you add a few details about your clinic and watch the live preview. You only pay when you choose a plan.",
    recapLabel: "Your preview",
    recapLine: "Create your account and these are already filled in for you.",
    didYouMean: "Did you mean {email}?",
  },
  de: {
    titleSaved: "Ihre Vorschau speichern",
    leadSaved: "Legen Sie ein Konto an, damit Ihre Auswahl erhalten bleibt. Danach ergänzen Sie ein paar Angaben zu Ihrer Praxis und sehen die Live-Vorschau. Sie zahlen erst, wenn Sie einen Tarif wählen.",
    recapLabel: "Ihre Vorschau",
    recapLine: "Nach dem Anlegen Ihres Kontos ist das bereits für Sie eingetragen.",
    didYouMean: "Meinten Sie {email}?",
  },
  es: {
    titleSaved: "Guarda tu vista previa",
    leadSaved: "Crea una cuenta para conservar lo que has elegido. Después añades algunos datos de tu clínica y ves la vista previa en directo. Solo pagas cuando eliges un plan.",
    recapLabel: "Tu vista previa",
    recapLine: "Crea tu cuenta y esto ya estará rellenado.",
    didYouMean: "¿Quisiste decir {email}?",
  },
  tr: {
    titleSaved: "Önizlemenizi kaydedin",
    leadSaved: "Seçimlerinizi korumak için hesap açın. Ardından kliniğiniz hakkında birkaç bilgi ekler ve canlı önizlemeyi görürsünüz. Yalnızca plan seçtiğinizde ödersiniz.",
    recapLabel: "Önizlemeniz",
    recapLine: "Hesabınızı açtığınızda bunlar sizin için hazır olacak.",
    didYouMean: "Bunu mu demek istediniz: {email}",
  },
  fr: {
    titleSaved: "Enregistrez votre aperçu",
    leadSaved: "Créez un compte pour garder vos choix. Vous ajoutez ensuite quelques informations sur votre cabinet et découvrez l'aperçu en direct. Vous ne payez qu'en choisissant une formule.",
    recapLabel: "Votre aperçu",
    recapLine: "Une fois votre compte créé, tout cela est déjà rempli pour vous.",
    didYouMean: "Vouliez-vous dire {email} ?",
  },
  ja: {
    titleSaved: "プレビューを保存",
    leadSaved: "アカウントを作成すると、選んだ内容が引き継がれます。続いて医院の情報をいくつか入力し、ライブプレビューをご覧いただけます。お支払いはプランを選んだときだけです。",
    recapLabel: "プレビュー",
    recapLine: "アカウントを作成すると、これらが入力済みの状態で始まります。",
    didYouMean: "{email} のお間違いではありませんか？",
  },
  ar: {
    titleSaved: "احفظوا معاينتكم",
    leadSaved: "أنشئوا حساباً لتحتفظوا بما اخترتموه. بعد ذلك تضيفون بعض المعلومات عن عيادتكم وتشاهدون المعاينة الحية. لا تدفعون إلا عند اختيار باقة.",
    recapLabel: "معاينتكم",
    recapLine: "عند إنشاء حسابكم ستجدون هذه البيانات معبأة مسبقاً.",
    didYouMean: "هل تقصدون {email}؟",
  },
  pl: {
    titleSaved: "Podgląd gotowy do zapisania",
    leadSaved: "Wystarczy założyć konto, by zachować wybrane ustawienia. Potem kilka informacji o gabinecie i podgląd na żywo. Płatność dopiero po wyborze planu.",
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
