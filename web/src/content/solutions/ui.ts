import type { Locale } from "../dentvideo";

/** Interface words for the commercial pages and the links to them. */
export type SolutionUi = {
  /** Above the sample videos. */
  samplesHeading: string;
  samplesNote: string;
  /** Primary button: the live preview. */
  preview: string;
  /** Secondary link: the landing's plans. */
  pricing: string;
  /** Heading above the related guides. */
  readNext: string;
  /** Heading of the block that links the commercial pages (hubs, About, guides). */
  forClinics: string;
  /** Footer link for returning clinics. */
  signIn: string;
  /** Trademark note under comparison tables. */
  trademarks: string;
};

export const SOLUTION_UI: Record<Locale, SolutionUi> = {
  en: {
    samplesHeading: "Three videos DentVideo made for a demo clinic",
    samplesNote: "Demo clinic. Real DentVideo output, unedited. Yours are made in your language, colours and tone.",
    preview: "See your preview",
    pricing: "Plans and pricing",
    readNext: "Guides to read next",
    forClinics: "DentVideo for dental clinics",
    signIn: "Sign in",
    trademarks: "Canva and ChatGPT are trademarks of their owners. DentVideo is not affiliated with them. Their features change; check their current plans.",
  },
  de: {
    samplesHeading: "Drei Videos, die DentVideo für eine Demo-Praxis erstellt hat",
    samplesNote: "Demo-Praxis. Echte DentVideo-Videos, unbearbeitet. Ihre entstehen in Ihrer Sprache, Ihren Farben und Ihrem Ton.",
    preview: "Ihre Vorschau ansehen",
    pricing: "Tarife und Preise",
    readNext: "Passende Ratgeber",
    forClinics: "DentVideo für Zahnarztpraxen",
    signIn: "Anmelden",
    trademarks: "Canva und ChatGPT sind Marken ihrer Inhaber. DentVideo steht in keiner Verbindung zu ihnen. Funktionen ändern sich; prüfen Sie die aktuellen Angebote.",
  },
  es: {
    samplesHeading: "Tres vídeos que DentVideo hizo para una clínica de demostración",
    samplesNote: "Clínica de demostración. Vídeos reales de DentVideo, sin editar. Los tuyos se hacen en tu idioma, colores y tono.",
    preview: "Ver tu vista previa",
    pricing: "Planes y precios",
    readNext: "Guías relacionadas",
    forClinics: "DentVideo para clínicas dentales",
    signIn: "Iniciar sesión",
    trademarks: "Canva y ChatGPT son marcas de sus respectivos titulares. DentVideo no tiene relación con ellos. Sus funciones cambian; consulta sus planes actuales.",
  },
  tr: {
    samplesHeading: "DentVideo'nun bir demo klinik için hazırladığı üç video",
    samplesNote: "Demo klinik. Gerçek DentVideo videoları, düzenlenmeden. Sizinkiler kendi dilinizde, renklerinizde ve üslubunuzda hazırlanır.",
    preview: "Önizlemenizi görün",
    pricing: "Planlar ve fiyatlar",
    readNext: "İlgili rehberler",
    forClinics: "Diş klinikleri için DentVideo",
    signIn: "Giriş yap",
    trademarks: "Canva ve ChatGPT sahiplerinin ticari markalarıdır. DentVideo'nun bu şirketlerle bir bağlantısı yoktur. Özellikleri değişebilir; güncel planlarını kontrol edin.",
  },
  fr: {
    samplesHeading: "Trois vidéos réalisées par DentVideo pour un cabinet de démonstration",
    samplesNote: "Cabinet de démonstration. Vidéos DentVideo réelles, non retouchées. Les vôtres sont faites dans votre langue, vos couleurs et votre ton.",
    preview: "Voir votre aperçu",
    pricing: "Formules et tarifs",
    readNext: "Guides à lire ensuite",
    forClinics: "DentVideo pour les cabinets dentaires",
    signIn: "Se connecter",
    trademarks: "Canva et ChatGPT sont des marques de leurs propriétaires. DentVideo n'a aucun lien avec eux. Leurs fonctions évoluent ; vérifiez leurs offres actuelles.",
  },
  ja: {
    samplesHeading: "DentVideoがデモ医院のために作成した3本の動画",
    samplesNote: "デモ医院の動画です。DentVideoが作成したものを無編集で掲載しています。貴院の動画は、貴院の言語・カラー・話し方で作成されます。",
    preview: "プレビューを見る",
    pricing: "プランと料金",
    readNext: "あわせて読みたいガイド",
    forClinics: "歯科医院のためのDentVideo",
    signIn: "ログイン",
    trademarks: "Canva、ChatGPTは各社の商標です。DentVideoはこれらの企業と提携していません。機能は変わることがあるため、最新の情報をご確認ください。",
  },
  ar: {
    samplesHeading: "ثلاثة فيديوهات أعدّتها DentVideo لعيادة تجريبية",
    samplesNote: "عيادة تجريبية. فيديوهات حقيقية من DentVideo دون أي تعديل. فيديوهاتكم تُعَدّ بلغتكم وألوانكم وأسلوبكم.",
    preview: "شاهدوا المعاينة",
    pricing: "الخطط والأسعار",
    readNext: "أدلة ذات صلة",
    forClinics: "DentVideo لعيادات الأسنان",
    signIn: "تسجيل الدخول",
    trademarks: "Canva وChatGPT علامتان تجاريتان لمالكيهما، ولا ترتبط DentVideo بهما. ميزاتهما تتغير، فراجعوا خططهما الحالية.",
  },
  pl: {
    samplesHeading: "Trzy filmy, które DentVideo przygotowało dla gabinetu demonstracyjnego",
    samplesNote: "Gabinet demonstracyjny. Prawdziwe filmy DentVideo, bez obróbki. Państwa filmy powstają w Państwa języku, kolorach i tonie.",
    preview: "Pokaż mój podgląd",
    pricing: "Plany i ceny",
    readNext: "Poradniki na dalszą lekturę",
    forClinics: "DentVideo dla gabinetów stomatologicznych",
    signIn: "Zaloguj się",
    trademarks: "Canva i ChatGPT są znakami towarowymi ich właścicieli. DentVideo nie jest z nimi powiązane. Ich funkcje się zmieniają; prosimy sprawdzić aktualną ofertę.",
  },
};
