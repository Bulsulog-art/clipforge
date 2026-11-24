import type { Locale } from "./dentvideo-locales";

/**
 * Sign-up title and lead when the landing's teaser was filled in this tab.
 * start-form.tsx picks them before the first paint, so they ship with the
 * page; the recap and hint words stay in dentvideo-signup-extra.ts.
 */
export const SIGNUP_SAVED: Readonly<Record<Locale, { titleSaved: string; leadSaved: string }>> = {
  en: {
    titleSaved: "Save your preview",
    leadSaved: "Create an account to keep what you chose. Next you add a few details about your clinic and watch the live preview. You only pay when you choose a plan.",
  },
  de: {
    titleSaved: "Ihre Vorschau speichern",
    leadSaved: "Legen Sie ein Konto an, damit Ihre Auswahl erhalten bleibt. Danach ergänzen Sie ein paar Angaben zu Ihrer Praxis und sehen die Live-Vorschau. Sie zahlen erst, wenn Sie einen Tarif wählen.",
  },
  es: {
    titleSaved: "Guarda tu vista previa",
    leadSaved: "Crea una cuenta para conservar lo que has elegido. Después añades algunos datos de tu clínica y ves la vista previa en directo. Solo pagas cuando eliges un plan.",
  },
  tr: {
    titleSaved: "Önizlemenizi kaydedin",
    leadSaved: "Seçimlerinizi korumak için hesap açın. Ardından kliniğiniz hakkında birkaç bilgi ekler ve canlı önizlemeyi görürsünüz. Yalnızca plan seçtiğinizde ödersiniz.",
  },
  fr: {
    titleSaved: "Enregistrez votre aperçu",
    leadSaved: "Créez un compte pour garder vos choix. Vous ajoutez ensuite quelques informations sur votre cabinet et découvrez l'aperçu en direct. Vous ne payez qu'en choisissant une formule.",
  },
  ja: {
    titleSaved: "プレビューを保存",
    leadSaved: "アカウントを作成すると、選んだ内容が引き継がれます。続いて医院の情報をいくつか入力し、ライブプレビューをご覧いただけます。お支払いはプランを選んだときだけです。",
  },
  ar: {
    titleSaved: "احفظوا معاينتكم",
    leadSaved: "أنشئوا حساباً لتحتفظوا بما اخترتموه. بعد ذلك تضيفون بعض المعلومات عن عيادتكم وتشاهدون المعاينة الحية. لا تدفعون إلا عند اختيار باقة.",
  },
  pl: {
    titleSaved: "Podgląd gotowy do zapisania",
    leadSaved: "Wystarczy założyć konto, by zachować wybrane ustawienia. Potem kilka informacji o gabinecie i podgląd na żywo. Płatność dopiero po wyborze planu.",
  },
};
