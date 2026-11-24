import type { Locale } from "./dentvideo";

/**
 * What our software checked on a video, said quietly on its card and in the
 * review (components/dentvid/video-checks.tsx), and the words of the "Script
 * and caption" fold in the review.
 *
 * The line names only what the stored results prove (lib/dentvid/item-checks.ts):
 * both reviews passed on the script and the caption, and, when the picture and
 * sound measurement ran clean on the file the clinic sees, that too. It never
 * says "approved", "compliant" or "guaranteed": the checks are software, the
 * dentist's approval is the final say, and "How we check" opens the help
 * answer that says exactly what they do and do not do (help #how-we-check).
 *
 * `{country}` is the clinic's country in the page's language, named only when
 * the advertising reviewer is given that country's own rules
 * (lib/dentvid/rule-countries.ts); elsewhere the line says the general rules.
 * `{parts}` is the list, joined with `sep`. `{time}` is "0:14".
 *
 * Kept apart from dentvideo-app.ts, which also ships with the sign-up page
 * and is held to that page's size budget (lib/dentvid/client-bundle.test.ts).
 * Forms of address as in dentvideo-app.ts: German Sie, Spanish tú, French
 * vous, Turkish siz, Japanese です・ます, Arabic plural, Polish Państwo.
 */
export type CheckedText = {
  /** "Software-checked: {parts}." */
  line: string;
  /** Between the parts of the list. */
  sep: string;
  accuracy: string;
  /** The advertising review with the clinic's own country's rules. */
  adsIn: string;
  /** The advertising review where we have no country rules: the general ones only. */
  adsGeneral: string;
  /** The picture and sound measurement of the rendered file. */
  picture: string;
  /** The link to the help answer on how a video is checked. */
  how: string;
  /** The review's fold, for a video we wrote: the narration, then the caption. */
  scriptAndCaption: string;
  /** The same fold for a clip from the dentist's own recording. */
  wordsAndCaption: string;
  /** Inside the fold, over the narration of a video we wrote. */
  narration: string;
  /** Inside the fold, over what the dentist says in a recorded clip. */
  spoken: string;
  /** The name of a time button in the script: it plays the video from there. */
  playFrom: string;
  /** On a sentence our check marked (the reason is in "What to check before posting"). */
  marked: string;
};

export const CHECKED_TEXT: Record<Locale, CheckedText> = {
  en: {
    line: "Software-checked: {parts}.",
    sep: ", ",
    accuracy: "clinical accuracy",
    adsIn: "advertising rules ({country})",
    adsGeneral: "general advertising rules",
    picture: "picture and sound",
    how: "How we check",
    scriptAndCaption: "Script and caption",
    wordsAndCaption: "Your words and caption",
    narration: "Narration",
    spoken: "What you say",
    playFrom: "Play from {time}",
    marked: "Marked by our check",
  },
  de: {
    line: "Von der Software geprüft: {parts}.",
    sep: ", ",
    accuracy: "fachliche Richtigkeit",
    adsIn: "Werberegeln ({country})",
    adsGeneral: "allgemeine Werberegeln",
    picture: "Bild und Ton",
    how: "So prüfen wir",
    scriptAndCaption: "Skript und Beitragstext",
    wordsAndCaption: "Ihre Worte und Beitragstext",
    narration: "Sprechertext",
    spoken: "Was Sie sagen",
    playFrom: "Ab {time} abspielen",
    marked: "Von unserer Prüfung markiert",
  },
  es: {
    line: "Revisado por software: {parts}.",
    sep: ", ",
    accuracy: "exactitud clínica",
    adsIn: "normas de publicidad ({country})",
    adsGeneral: "normas generales de publicidad",
    picture: "imagen y sonido",
    how: "Cómo lo revisamos",
    scriptAndCaption: "Guion y texto",
    wordsAndCaption: "Tus palabras y el texto",
    narration: "Narración",
    spoken: "Lo que dices",
    playFrom: "Reproducir desde {time}",
    marked: "Marcado por nuestra revisión",
  },
  fr: {
    line: "Vérifié par logiciel : {parts}.",
    sep: ", ",
    accuracy: "exactitude clinique",
    adsIn: "règles de publicité ({country})",
    adsGeneral: "règles générales de publicité",
    picture: "image et son",
    how: "Comment nous vérifions",
    scriptAndCaption: "Script et texte",
    wordsAndCaption: "Vos paroles et le texte",
    narration: "Narration",
    spoken: "Ce que vous dites",
    playFrom: "Lire à partir de {time}",
    marked: "Signalé par notre contrôle",
  },
  tr: {
    line: "Yazılımla kontrol edildi: {parts}.",
    sep: ", ",
    accuracy: "klinik doğruluk",
    adsIn: "reklam kuralları ({country})",
    adsGeneral: "genel reklam kuralları",
    picture: "görüntü ve ses",
    how: "Nasıl kontrol ediyoruz?",
    scriptAndCaption: "Video metni ve açıklama",
    wordsAndCaption: "Sözleriniz ve açıklama",
    narration: "Seslendirme metni",
    spoken: "Söyledikleriniz",
    playFrom: "{time} anından oynat",
    marked: "Kontrolümüzün işaretlediği yer",
  },
  ja: {
    line: "ソフトウェアでチェック済み：{parts}。",
    sep: "、",
    accuracy: "臨床的な正確さ",
    adsIn: "広告ルール（{country}）",
    adsGeneral: "一般的な広告ルール",
    picture: "映像と音声",
    how: "チェックの方法",
    scriptAndCaption: "原稿とキャプション",
    wordsAndCaption: "お話しになった内容とキャプション",
    narration: "ナレーション",
    spoken: "お話しになった内容",
    playFrom: "{time}から再生",
    marked: "チェックで印が付いた箇所",
  },
  ar: {
    line: "فحصه البرنامج: {parts}.",
    sep: "، ",
    accuracy: "الدقة السريرية",
    adsIn: "قواعد الإعلان ({country})",
    adsGeneral: "قواعد الإعلان العامة",
    picture: "الصورة والصوت",
    how: "كيف نفحص",
    scriptAndCaption: "نص الفيديو والنص المرافق",
    wordsAndCaption: "كلماتكم والنص المرافق",
    narration: "التعليق الصوتي",
    spoken: "ما تقولونه",
    playFrom: "تشغيل من {time}",
    marked: "علّمه فحصنا",
  },
  pl: {
    line: "Sprawdzone przez oprogramowanie: {parts}.",
    sep: ", ",
    accuracy: "poprawność kliniczna",
    adsIn: "zasady reklamy ({country})",
    adsGeneral: "ogólne zasady reklamy",
    picture: "obraz i dźwięk",
    how: "Jak sprawdzamy",
    scriptAndCaption: "Scenariusz i opis",
    wordsAndCaption: "Państwa słowa i opis",
    narration: "Narracja",
    spoken: "Co Państwo mówią",
    playFrom: "Odtwórz od {time}",
    marked: "Oznaczone przez naszą kontrolę",
  },
};

export function checkedText(locale: Locale): CheckedText {
  return CHECKED_TEXT[locale] ?? CHECKED_TEXT.en;
}

/** Fills `{name}` placeholders (the same rule as dentvideo-app.ts fmt, without importing that module). */
export function fillChecked(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
