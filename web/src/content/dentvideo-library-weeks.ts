import type { Locale } from "./dentvideo";

/**
 * Words for the library's weeks: the quiet link under the folded weeks that
 * loads twelve more, and the line that says when the next five videos
 * arrive. Same forms of address as the rest of the app (dentvideo-app.ts):
 * German Sie, Spanish tú, French vous, Turkish siz, Japanese です・ます,
 * Arabic plural, Polish Państwo.
 *
 * `{date}` is the Monday as weekLabelDate prints it in the clinic's language
 * and country ("December 7", "7 December", "7. Dezember", "12月7日"), filled
 * by fmt().
 */
export type LibraryWeeksText = {
  /** Under the last folded week, when older weeks exist. */
  showEarlier: string;
  /** The week card when there is nothing left to do this week. */
  nextDelivery: string;
};

export const LIBRARY_WEEKS_TEXT: Record<Locale, LibraryWeeksText> = {
  en: {
    showEarlier: "Show earlier weeks",
    nextDelivery: "Your next five videos arrive on Monday, {date}.",
  },
  de: {
    showEarlier: "Frühere Wochen anzeigen",
    nextDelivery: "Ihre nächsten fünf Videos kommen am Montag, {date}.",
  },
  es: {
    showEarlier: "Ver semanas anteriores",
    nextDelivery: "Tus próximos cinco vídeos llegan el lunes {date}.",
  },
  tr: {
    showEarlier: "Önceki haftaları göster",
    nextDelivery: "Sonraki beş videonuz {date} Pazartesi günü gelir.",
  },
  fr: {
    showEarlier: "Afficher les semaines précédentes",
    nextDelivery: "Vos cinq prochaines vidéos arrivent le lundi {date}.",
  },
  ja: {
    showEarlier: "以前の週を表示",
    nextDelivery: "次の5本の動画は{date}（月）に届きます。",
  },
  ar: {
    showEarlier: "عرض الأسابيع السابقة",
    nextDelivery: "تصل فيديوهاتكم الخمسة التالية يوم الاثنين {date}.",
  },
  pl: {
    showEarlier: "Pokaż wcześniejsze tygodnie",
    nextDelivery: "Kolejnych pięć filmów otrzymają Państwo w poniedziałek, {date}.",
  },
};

export function libraryWeeksText(locale: string): LibraryWeeksText {
  return LIBRARY_WEEKS_TEXT[locale as Locale] ?? LIBRARY_WEEKS_TEXT.en;
}
