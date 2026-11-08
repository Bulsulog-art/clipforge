import type { Locale } from "../dentvideo";
import type { GuideCategory } from "./types";

/**
 * Interface words for the guide pages, the guides index and the About page.
 * Independent of the landing copy, so either can change without the other.
 */
export type GuideUi = {
  guides: string;
  about: string;
  index: { title: string; description: string; h1: string; lead: string };
  categories: Record<GuideCategory, string>;
  breadcrumbGuides: string;
  onThisPage: string;
  updated: string;
  readingTime: (minutes: number) => string;
  sources: string;
  sourcesNote: string;
  notLegalAdvice: string;
  faq: string;
  related: string;
  allGuides: string;
  cta: { title: string; text: string; button: string; more: string };
};

export const GUIDE_UI: Record<Locale, GuideUi> = {
  en: {
    guides: "Guides",
    about: "About",
    index: {
      title: "Guides for dental clinics: social media, patient videos and advertising rules · DentVideo",
      description:
        "Practical guides for dentists: what to post on Instagram and TikTok, how to film patient-education videos, and what health-advertising rules allow in the UK, the US and elsewhere.",
      h1: "Guides for dental clinics",
      lead: "Practical, hedged and sourced: what to post, how to film it in five minutes, and which advertising rules to check before you publish.",
    },
    categories: { rules: "Advertising rules and consent", ideas: "What to post", video: "Patient-education videos", tools: "Agency, freelancer or software" },
    breadcrumbGuides: "Guides",
    onThisPage: "On this page",
    updated: "Updated",
    readingTime: (m) => `${m} min read`,
    sources: "Sources and official texts",
    sourcesNote: "Rules change. Check the current text with your regulator or professional body before you rely on it.",
    notLegalAdvice: "General information, not legal advice.",
    faq: "Questions",
    related: "Related guides",
    allGuides: "All guides",
    cta: {
      title: "A week of patient-education videos, checked before you see them",
      text: "DentVideo writes, narrates and captions five short videos a week in your language and colours, checks each one for clinical accuracy and advertising rules, and waits for your approval. See a live preview with your own logo and colours before you pay.",
      button: "See your preview",
      more: "How DentVideo works",
    },
  },
  de: {
    guides: "Ratgeber",
    about: "Über DentVideo",
    index: {
      title: "Ratgeber für Zahnarztpraxen: Social Media, Aufklärungsvideos und Werberecht · DentVideo",
      description:
        "Praktische Ratgeber für Zahnärztinnen und Zahnärzte: was Sie auf Instagram posten, wie Sie Aufklärungsvideos drehen und was HWG und Berufsordnung in Deutschland, Österreich und der Schweiz erlauben.",
      h1: "Ratgeber für Zahnarztpraxen",
      lead: "Praktisch, vorsichtig formuliert und mit Quellen: was Sie posten, wie Sie es in fünf Minuten drehen und welche Werberegeln Sie vorher prüfen sollten.",
    },
    categories: { rules: "Werberecht und Einwilligung", ideas: "Was posten?", video: "Aufklärungsvideos", tools: "Agentur, Freelancer oder Software" },
    breadcrumbGuides: "Ratgeber",
    onThisPage: "Auf dieser Seite",
    updated: "Aktualisiert",
    readingTime: (m) => `${m} Min. Lesezeit`,
    sources: "Quellen und amtliche Texte",
    sourcesNote: "Regeln ändern sich. Prüfen Sie den aktuellen Wortlaut bei Ihrer Kammer oder Behörde, bevor Sie sich darauf stützen.",
    notLegalAdvice: "Allgemeine Information, keine Rechtsberatung.",
    faq: "Häufige Fragen",
    related: "Weitere Ratgeber",
    allGuides: "Alle Ratgeber",
    cta: {
      title: "Eine Woche Aufklärungsvideos, geprüft, bevor Sie sie sehen",
      text: "DentVideo schreibt, vertont und untertitelt fünf kurze Videos pro Woche in Ihrer Sprache und Ihren Farben, prüft jedes auf fachliche Richtigkeit und Werberecht und wartet auf Ihre Freigabe. Sehen Sie vor der Zahlung eine Live-Vorschau mit Ihrem Logo und Ihren Farben.",
      button: "Ihre Vorschau ansehen",
      more: "So funktioniert DentVideo",
    },
  },
  es: {
    guides: "Guías",
    about: "Sobre DentVideo",
    index: {
      title: "Guías para clínicas dentales: redes sociales, vídeos para pacientes y publicidad sanitaria · DentVideo",
      description:
        "Guías prácticas para dentistas: qué publicar en Instagram y TikTok, cómo grabar vídeos educativos para pacientes y qué permite la normativa de publicidad sanitaria en España.",
      h1: "Guías para clínicas dentales",
      lead: "Prácticas, prudentes y con fuentes: qué publicar, cómo grabarlo en cinco minutos y qué normas de publicidad revisar antes de publicar.",
    },
    categories: { rules: "Publicidad sanitaria y consentimiento", ideas: "Qué publicar", video: "Vídeos educativos", tools: "Agencia, freelance o herramienta" },
    breadcrumbGuides: "Guías",
    onThisPage: "En esta página",
    updated: "Actualizado",
    readingTime: (m) => `${m} min de lectura`,
    sources: "Fuentes y textos oficiales",
    sourcesNote: "Las normas cambian. Comprueba el texto vigente con tu colegio o la autoridad sanitaria antes de basarte en él.",
    notLegalAdvice: "Información general, no asesoramiento jurídico.",
    faq: "Preguntas frecuentes",
    related: "Guías relacionadas",
    allGuides: "Todas las guías",
    cta: {
      title: "Una semana de vídeos educativos, revisados antes de que los veas",
      text: "DentVideo escribe, pone voz y subtitula cinco vídeos cortos a la semana en tu idioma y tus colores, revisa cada uno en precisión clínica y normas de publicidad y espera tu aprobación. Antes de pagar, ves una vista previa en directo con tu logo y tus colores.",
      button: "Ver tu vista previa",
      more: "Cómo funciona DentVideo",
    },
  },
  tr: {
    guides: "Rehberler",
    about: "DentVideo hakkında",
    index: {
      title: "Diş klinikleri için rehberler: sosyal medya, hasta bilgilendirme videoları ve tanıtım kuralları · DentVideo",
      description:
        "Diş hekimleri için pratik rehberler: Instagram ve TikTok'ta ne paylaşılır, hasta bilgilendirme videosu nasıl çekilir ve Türkiye'deki sağlık tanıtım yönetmeliği neye izin verir.",
      h1: "Diş klinikleri için rehberler",
      lead: "Pratik, temkinli ve kaynaklı: ne paylaşacağınız, beş dakikada nasıl çekeceğiniz ve yayınlamadan önce hangi tanıtım kurallarını kontrol etmeniz gerektiği.",
    },
    categories: { rules: "Tanıtım kuralları ve onam", ideas: "Ne paylaşmalı", video: "Hasta bilgilendirme videoları", tools: "Ajans, serbest çalışan ya da yazılım" },
    breadcrumbGuides: "Rehberler",
    onThisPage: "Bu sayfada",
    updated: "Güncellendi",
    readingTime: (m) => `${m} dk okuma`,
    sources: "Kaynaklar ve resmî metinler",
    sourcesNote: "Kurallar değişir. Güvenmeden önce güncel metni Resmî Gazete'den, meslek odanızdan ya da il sağlık müdürlüğünden kontrol edin.",
    notLegalAdvice: "Genel bilgidir, hukuki danışmanlık değildir.",
    faq: "Sık sorulan sorular",
    related: "İlgili rehberler",
    allGuides: "Tüm rehberler",
    cta: {
      title: "Bir haftalık hasta bilgilendirme videosu, siz görmeden önce denetlenmiş",
      text: "DentVideo, haftada beş kısa videoyu sizin dilinizde ve renklerinizde yazar, seslendirir ve altyazılar; her birini klinik doğruluk ve tanıtım kurallarına göre denetler ve sizin onayınızı bekler. Ödeme yapmadan önce logonuz ve renklerinizle canlı önizlemeyi görün.",
      button: "Önizlemenizi görün",
      more: "DentVideo nasıl çalışır",
    },
  },
  fr: {
    guides: "Guides",
    about: "À propos de DentVideo",
    index: {
      title: "Guides pour cabinets dentaires : réseaux sociaux, vidéos patients et règles de communication · DentVideo",
      description:
        "Guides pratiques pour chirurgiens-dentistes : quoi publier sur Instagram et TikTok, comment tourner des vidéos d'information patient et ce que permet le code de déontologie en France.",
      h1: "Guides pour cabinets dentaires",
      lead: "Pratiques, prudents et sourcés : quoi publier, comment le tourner en cinq minutes et quelles règles de communication vérifier avant de publier.",
    },
    categories: { rules: "Règles de communication et consentement", ideas: "Quoi publier", video: "Vidéos d'information patient", tools: "Agence, freelance ou outil" },
    breadcrumbGuides: "Guides",
    onThisPage: "Sur cette page",
    updated: "Mis à jour",
    readingTime: (m) => `${m} min de lecture`,
    sources: "Sources et textes officiels",
    sourcesNote: "Les règles évoluent. Vérifiez le texte en vigueur auprès de votre conseil de l'Ordre avant de vous y fier.",
    notLegalAdvice: "Information générale, pas un conseil juridique.",
    faq: "Questions fréquentes",
    related: "Guides associés",
    allGuides: "Tous les guides",
    cta: {
      title: "Une semaine de vidéos d'information patient, vérifiées avant que vous les voyiez",
      text: "DentVideo rédige, met en voix et sous-titre cinq vidéos courtes par semaine dans votre langue et vos couleurs, vérifie chacune pour l'exactitude clinique et les règles de communication, puis attend votre validation. Voyez un aperçu en direct à votre logo et vos couleurs avant de payer.",
      button: "Voir votre aperçu",
      more: "Comment fonctionne DentVideo",
    },
  },
};

export const GUIDES_INDEX_PATH: Record<Locale, string> = {
  en: "/dentvideo/guides",
  de: "/dentvideo/de/guides",
  es: "/dentvideo/es/guides",
  tr: "/dentvideo/tr/guides",
  fr: "/dentvideo/fr/guides",
};

export const ABOUT_PATH: Record<Locale, string> = {
  en: "/dentvideo/about",
  de: "/dentvideo/de/about",
  es: "/dentvideo/es/about",
  tr: "/dentvideo/tr/about",
  fr: "/dentvideo/fr/about",
};
