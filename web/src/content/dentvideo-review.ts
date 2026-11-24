/**
 * Words only the full-screen review (components/dentvid/review-player.tsx) uses: asking for a
 * change instead of declining, the "Posted it?" question after a share, and the "More options"
 * fold of the post sheet. Kept apart from dentvideo-app.ts, which also ships with the sign-up
 * page and is held to that page's size budget (lib/dentvid/client-bundle.test.ts).
 *
 * Forms of address follow dentvideo-app.ts: German Sie, Spanish tú, French vous, Turkish siz,
 * Japanese です・ます, Arabic plural أنتم, Polish Państwo.
 */
import type { Locale } from "./dentvideo";

export type ReviewText = {
  /** The decline form's first offer for "wrong" and "look" when the video can be changed: keep the video, ask for a change. */
  changeInstead: string;
  /** Under it: the video stays in the week, and the typed words go into the change form. */
  changeInsteadHint: string;
  /** After the video was saved or shared, the posted tick asks this; postedYes answers it and ticks the video as posted. */
  postedPrompt: string;
  postedYes: string;
  /** The post sheet's fold: the caption texts, the subtitles and the steps for each app. */
  moreOptions: string;
};

export const REVIEW_TEXT: Record<Locale, ReviewText> = {
  en: {
    changeInstead: "Ask for a change instead",
    changeInsteadHint: "The video stays in your week, and your note carries over.",
    postedPrompt: "Posted it?",
    postedYes: "Yes, posted",
    moreOptions: "More options",
  },
  de: {
    changeInstead: "Lieber eine Änderung anfragen",
    changeInsteadHint: "Das Video bleibt in Ihrer Woche, und Ihre Notiz wird übernommen.",
    postedPrompt: "Schon gepostet?",
    postedYes: "Ja, gepostet",
    moreOptions: "Weitere Optionen",
  },
  es: {
    changeInstead: "Mejor pedir un cambio",
    changeInsteadHint: "El vídeo sigue en tu semana y tu nota se conserva.",
    postedPrompt: "¿Ya lo publicaste?",
    postedYes: "Sí, publicado",
    moreOptions: "Más opciones",
  },
  tr: {
    changeInstead: "Bunun yerine değişiklik isteyin",
    changeInsteadHint: "Video bu haftanızda kalır, notunuz da korunur.",
    postedPrompt: "Paylaştınız mı?",
    postedYes: "Evet, paylaştım",
    moreOptions: "Diğer seçenekler",
  },
  fr: {
    changeInstead: "Demander plutôt une modification",
    changeInsteadHint: "La vidéo reste dans votre semaine, et votre note est conservée.",
    postedPrompt: "Vous l'avez publiée ?",
    postedYes: "Oui, publiée",
    moreOptions: "Plus d'options",
  },
  ja: {
    changeInstead: "代わりに修正を依頼する",
    changeInsteadHint: "この動画は今週分に残り、メモもそのまま引き継がれます。",
    postedPrompt: "投稿しましたか？",
    postedYes: "はい、投稿しました",
    moreOptions: "その他のオプション",
  },
  ar: {
    changeInstead: "طلب تعديل بدلًا من ذلك",
    changeInsteadHint: "يبقى الفيديو ضمن فيديوهات أسبوعكم، وتُحفظ ملاحظتكم.",
    postedPrompt: "هل نشرتموه؟",
    postedYes: "نعم، نشرناه",
    moreOptions: "خيارات أخرى",
  },
  pl: {
    changeInstead: "Zamiast tego poproś o zmianę",
    changeInsteadHint: "Film zostaje w tym tygodniu, a Państwa notatka nie przepadnie.",
    postedPrompt: "Opublikowali go Państwo?",
    postedYes: "Tak, opublikowany",
    moreOptions: "Więcej opcji",
  },
};

export function reviewText(locale: Locale): ReviewText {
  return REVIEW_TEXT[locale] ?? REVIEW_TEXT.en;
}
