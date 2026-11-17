import type { Locale } from "./dentvideo";

/** The DentVideo 404 page, in every interface language (app/dentvideo/not-found.tsx). */
export type NotFoundCopy = {
  /** Browser tab, before " · DentVideo". */
  meta: string;
  title: string;
  body: string;
  home: string;
  /** "Guides for dental clinics" — shown only where the language has guides. */
  guides: string;
  /** Accessible name of the language list. */
  languages: string;
};

export const NOT_FOUND_COPY: Record<Locale, NotFoundCopy> = {
  en: {
    meta: "Page not found",
    title: "This page doesn't exist.",
    body: "The address may be mistyped, or the page has moved. Everything about DentVideo starts from the home page.",
    home: "DentVideo home",
    guides: "Guides for dental clinics",
    languages: "Language",
  },
  de: {
    meta: "Seite nicht gefunden",
    title: "Diese Seite gibt es nicht.",
    body: "Vielleicht ist die Adresse vertippt, oder die Seite ist umgezogen. Alles über DentVideo finden Sie auf der Startseite.",
    home: "Zur DentVideo-Startseite",
    guides: "Ratgeber für Zahnarztpraxen",
    languages: "Sprache",
  },
  es: {
    meta: "Página no encontrada",
    title: "Esta página no existe.",
    body: "Puede que la dirección tenga un error o que la página se haya movido. Todo sobre DentVideo empieza en la página de inicio.",
    home: "Inicio de DentVideo",
    guides: "Guías para clínicas dentales",
    languages: "Idioma",
  },
  tr: {
    meta: "Sayfa bulunamadı",
    title: "Bu sayfa mevcut değil.",
    body: "Adres yanlış yazılmış ya da sayfa taşınmış olabilir. DentVideo hakkında her şey ana sayfada.",
    home: "DentVideo ana sayfası",
    guides: "Diş klinikleri için rehberler",
    languages: "Dil",
  },
  fr: {
    meta: "Page introuvable",
    title: "Cette page n'existe pas.",
    body: "L'adresse contient peut-être une faute de frappe, ou la page a été déplacée. Tout sur DentVideo commence sur la page d'accueil.",
    home: "Accueil DentVideo",
    guides: "Guides pour les cabinets dentaires",
    languages: "Langue",
  },
  ja: {
    meta: "ページが見つかりません",
    title: "ページが見つかりません。",
    body: "URLが間違っているか、ページが移動した可能性があります。DentVideoについてはトップページからご覧いただけます。",
    home: "DentVideoトップページへ",
    guides: "歯科医院向けガイド",
    languages: "言語",
  },
  ar: {
    meta: "الصفحة غير موجودة",
    title: "هذه الصفحة غير موجودة.",
    body: "ربما كُتب العنوان بشكل خاطئ، أو نُقلت الصفحة. كل ما يخص DentVideo يبدأ من الصفحة الرئيسية.",
    home: "الصفحة الرئيسية لـ DentVideo",
    guides: "أدلة لعيادات الأسنان",
    languages: "اللغة",
  },
  pl: {
    meta: "Nie znaleziono strony",
    title: "Ta strona nie istnieje.",
    body: "Adres mógł zostać błędnie wpisany albo strona została przeniesiona. Wszystko o DentVideo zaczyna się na stronie głównej.",
    home: "Strona główna DentVideo",
    guides: "Poradniki dla gabinetów stomatologicznych",
    languages: "Język",
  },
};
