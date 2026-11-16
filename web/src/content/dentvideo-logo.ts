import type { Locale } from "./dentvideo-locales";
import type { LogoProblem, PreparedLogo } from "@/lib/dentvid/logo-prepare";

/**
 * What a clinic is told about the logo it just chose (lib/dentvid/logo-prepare.ts),
 * in its own language. Small on purpose: the landing's "try it with your logo"
 * loads it only once a file is chosen, together with the preparation code.
 */
export type LogoText = {
  /** While the file is decoded and cleaned. */
  reading: string;
  /** {mb}: the limit. */
  tooBig: string;
  heic: string;
  notImage: string;
  unreadable: string;
  /** A white background was removed. */
  cleaned: string;
  keepOriginal: string;
  removeBackground: string;
  /** {w}×{h}: the file's size in pixels. */
  small: string;
  animated: string;
  /** The live preview could not load: a button to try again. */
  retry: string;
};

export const LOGO_TEXT: Record<Locale, LogoText> = {
  en: {
    reading: "Reading your logo…",
    tooBig: "This file is larger than {mb} MB. Please choose a smaller logo file.",
    heic: "This is an iPhone photo format (HEIC) that this browser cannot open. Please choose a PNG or JPG version of your logo.",
    notImage: "This file is not an image. Please choose your logo as PNG, JPG, WebP or SVG.",
    unreadable: "This image could not be opened; the file may be damaged. Please try another copy of your logo.",
    cleaned: "We removed the white background so your logo sits cleanly in the videos.",
    keepOriginal: "Keep the white background",
    removeBackground: "Remove the white background",
    small: "This logo is small ({w}×{h} px). A larger file will look sharper in your videos.",
    animated: "This is an animated image: the videos use its first frame.",
    retry: "Try again",
  },
  de: {
    reading: "Ihr Logo wird gelesen…",
    tooBig: "Diese Datei ist größer als {mb} MB. Bitte wählen Sie eine kleinere Logodatei.",
    heic: "Das ist ein iPhone-Fotoformat (HEIC), das dieser Browser nicht öffnen kann. Bitte wählen Sie Ihr Logo als PNG oder JPG.",
    notImage: "Diese Datei ist kein Bild. Bitte wählen Sie Ihr Logo als PNG, JPG, WebP oder SVG.",
    unreadable: "Dieses Bild ließ sich nicht öffnen, die Datei ist vielleicht beschädigt. Bitte versuchen Sie eine andere Kopie Ihres Logos.",
    cleaned: "Wir haben den weißen Hintergrund entfernt, damit Ihr Logo sauber im Video steht.",
    keepOriginal: "Weißen Hintergrund behalten",
    removeBackground: "Weißen Hintergrund entfernen",
    small: "Dieses Logo ist klein ({w}×{h} px). Eine größere Datei wirkt in Ihren Videos schärfer.",
    animated: "Das ist ein animiertes Bild: In den Videos erscheint sein erstes Bild.",
    retry: "Erneut versuchen",
  },
  es: {
    reading: "Leyendo tu logo…",
    tooBig: "Este archivo pesa más de {mb} MB. Elige un archivo de logo más pequeño.",
    heic: "Es un formato de foto de iPhone (HEIC) que este navegador no puede abrir. Elige tu logo en PNG o JPG.",
    notImage: "Este archivo no es una imagen. Elige tu logo en PNG, JPG, WebP o SVG.",
    unreadable: "No pudimos abrir esta imagen; puede que el archivo esté dañado. Prueba con otra copia de tu logo.",
    cleaned: "Quitamos el fondo blanco para que tu logo quede limpio en los vídeos.",
    keepOriginal: "Mantener el fondo blanco",
    removeBackground: "Quitar el fondo blanco",
    small: "Este logo es pequeño ({w}×{h} px). Un archivo más grande se verá más nítido en tus vídeos.",
    animated: "Es una imagen animada: los vídeos usan su primer fotograma.",
    retry: "Reintentar",
  },
  tr: {
    reading: "Logonuz okunuyor…",
    tooBig: "Bu dosya {mb} MB'tan büyük. Lütfen daha küçük bir logo dosyası seçin.",
    heic: "Bu, bu tarayıcının açamadığı bir iPhone fotoğraf biçimi (HEIC). Lütfen logonuzun PNG veya JPG halini seçin.",
    notImage: "Bu dosya bir görsel değil. Lütfen logonuzu PNG, JPG, WebP veya SVG olarak seçin.",
    unreadable: "Bu görsel açılamadı, dosya bozuk olabilir. Lütfen logonuzun başka bir kopyasını deneyin.",
    cleaned: "Logonuz videolarda temiz dursun diye beyaz arka planı kaldırdık.",
    keepOriginal: "Beyaz arka plan kalsın",
    removeBackground: "Beyaz arka planı kaldır",
    small: "Bu logo küçük ({w}×{h} px). Daha büyük bir dosya videolarınızda daha net görünür.",
    animated: "Bu hareketli bir görsel: videolarda ilk karesi kullanılır.",
    retry: "Tekrar dene",
  },
  fr: {
    reading: "Lecture de votre logo…",
    tooBig: "Ce fichier dépasse {mb} Mo. Merci de choisir un fichier de logo plus léger.",
    heic: "C'est un format photo d'iPhone (HEIC) que ce navigateur ne sait pas ouvrir. Merci de choisir votre logo en PNG ou JPG.",
    notImage: "Ce fichier n'est pas une image. Merci de choisir votre logo en PNG, JPG, WebP ou SVG.",
    unreadable: "Cette image n'a pas pu être ouverte ; le fichier est peut-être abîmé. Essayez une autre copie de votre logo.",
    cleaned: "Nous avons retiré le fond blanc pour que votre logo s'affiche proprement dans les vidéos.",
    keepOriginal: "Garder le fond blanc",
    removeBackground: "Retirer le fond blanc",
    small: "Ce logo est petit ({w}×{h} px). Un fichier plus grand sera plus net dans vos vidéos.",
    animated: "C'est une image animée : les vidéos utilisent sa première image.",
    retry: "Réessayer",
  },
  ja: {
    reading: "ロゴを読み込んでいます…",
    tooBig: "このファイルは{mb}MBを超えています。もっと小さいロゴファイルを選んでください。",
    heic: "このブラウザでは開けないiPhoneの写真形式（HEIC）です。PNGまたはJPGのロゴを選んでください。",
    notImage: "このファイルは画像ではありません。PNG・JPG・WebP・SVGのロゴを選んでください。",
    unreadable: "この画像を開けませんでした。ファイルが壊れている可能性があります。別のロゴファイルをお試しください。",
    cleaned: "動画の中でロゴがきれいに見えるよう、白い背景を取り除きました。",
    keepOriginal: "白い背景を残す",
    removeBackground: "白い背景を取り除く",
    small: "このロゴは小さめです（{w}×{h} px）。大きいファイルのほうが動画で鮮明に見えます。",
    animated: "アニメーション画像のため、動画では最初のコマを使います。",
    retry: "もう一度試す",
  },
  ar: {
    reading: "جارٍ قراءة شعارك…",
    tooBig: "حجم هذا الملف أكبر من {mb} ميغابايت. يُرجى اختيار ملف شعار أصغر.",
    heic: "هذه صيغة صور من iPhone (HEIC) لا يستطيع هذا المتصفح فتحها. يُرجى اختيار شعارك بصيغة PNG أو JPG.",
    notImage: "هذا الملف ليس صورة. يُرجى اختيار شعارك بصيغة PNG أو JPG أو WebP أو SVG.",
    unreadable: "تعذّر فتح هذه الصورة، وقد يكون الملف تالفًا. يُرجى تجربة نسخة أخرى من شعارك.",
    cleaned: "أزلنا الخلفية البيضاء ليظهر شعارك بوضوح في الفيديوهات.",
    keepOriginal: "الإبقاء على الخلفية البيضاء",
    removeBackground: "إزالة الخلفية البيضاء",
    small: "هذا الشعار صغير ({w}×{h} بكسل). سيبدو الملف الأكبر أوضح في فيديوهاتك.",
    animated: "هذه صورة متحركة: تستخدم الفيديوهات إطارها الأول.",
    retry: "إعادة المحاولة",
  },
  pl: {
    reading: "Wczytujemy logo…",
    tooBig: "Ten plik jest większy niż {mb} MB. Prosimy wybrać mniejszy plik z logo.",
    heic: "To format zdjęć z iPhone'a (HEIC), którego ta przeglądarka nie otworzy. Prosimy wybrać logo w PNG lub JPG.",
    notImage: "Ten plik nie jest obrazem. Prosimy wybrać logo w formacie PNG, JPG, WebP lub SVG.",
    unreadable: "Nie udało się otworzyć tego obrazu, plik może być uszkodzony. Prosimy spróbować innej kopii logo.",
    cleaned: "Usunęliśmy białe tło, żeby logo wyglądało czysto w filmach.",
    keepOriginal: "Zostaw białe tło",
    removeBackground: "Usuń białe tło",
    small: "To logo jest małe ({w}×{h} px). Większy plik będzie ostrzejszy w filmach.",
    animated: "To animowany obraz: w filmach użyta jest jego pierwsza klatka.",
    retry: "Spróbuj ponownie",
  },
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

/** The refusal message for a logo that cannot be used. */
export function logoProblemText(t: LogoText, problem: LogoProblem, maxMb = 25): string {
  switch (problem) {
    case "too-big":
      return fill(t.tooBig, { mb: maxMb });
    case "heic":
      return t.heic;
    case "not-an-image":
      return t.notImage;
    default:
      return t.unreadable;
  }
}

/** Gentle notes about a logo that was accepted (not errors). */
export function logoNotes(t: LogoText, p: Pick<PreparedLogo, "small" | "animated" | "sourceWidth" | "sourceHeight">): string[] {
  const out: string[] = [];
  if (p.small) out.push(fill(t.small, { w: p.sourceWidth, h: p.sourceHeight }));
  if (p.animated) out.push(t.animated);
  return out;
}
