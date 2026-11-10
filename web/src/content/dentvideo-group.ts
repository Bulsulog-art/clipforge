import type { Locale } from "./dentvideo";
import { DV_SUPPORT_EMAIL, mailtoHref } from "@/lib/dentvid/app-ui";

/**
 * Group (groups and multi-location practices) is not sold self-serve: there
 * is no multi-location product to sell yet, so no price, no checkout and no
 * feature list. Every place that shows the Group tier — the landing pricing,
 * the in-app plan picker, settings, About / llms.txt — shows this instead: a
 * "Contact us" mail with a subject in the page's language.
 *
 * Only what is true: no number of locations, no multi-location dashboard.
 */
export type GroupContact = {
  /** The tier's name, as on the other cards. */
  name: string;
  /** Where the price would be: "custom", never a number. */
  price: string;
  /** One honest sentence. */
  text: string;
  /** The button. */
  cta: string;
  /** The prefilled email subject. */
  subject: string;
};

export const GROUP_CONTACT: Record<Locale, GroupContact> = {
  en: {
    name: "Group",
    price: "Custom pricing",
    text: "For groups and multi-location practices — tell us your locations and we'll set it up with you.",
    cta: "Contact us",
    subject: "DentVideo for multiple practices",
  },
  de: {
    name: "Group",
    price: "Individueller Preis",
    text: "Für Praxisgruppen und Praxen mit mehreren Standorten – nennen Sie uns Ihre Standorte, und wir richten es gemeinsam mit Ihnen ein.",
    cta: "Kontakt aufnehmen",
    subject: "DentVideo für mehrere Praxen",
  },
  es: {
    name: "Group",
    price: "Precio a medida",
    text: "Para grupos y clínicas con varias sedes: cuéntanos qué sedes tienes y lo configuramos contigo.",
    cta: "Contáctanos",
    subject: "DentVideo para varias clínicas",
  },
  tr: {
    name: "Group",
    price: "Size özel fiyat",
    text: "Gruplar ve birden fazla şubesi olan klinikler için: şubelerinizi bize yazın, kurulumu sizinle birlikte yapalım.",
    cta: "Bize ulaşın",
    subject: "Birden fazla klinik için DentVideo",
  },
  fr: {
    name: "Group",
    price: "Tarif sur mesure",
    text: "Pour les groupes et les cabinets à plusieurs sites : indiquez-nous vos sites et nous le mettons en place avec vous.",
    cta: "Nous contacter",
    subject: "DentVideo pour plusieurs cabinets",
  },
  ja: {
    name: "Group",
    price: "個別のお見積もり",
    text: "グループや複数の拠点をお持ちの医院向け。拠点についてお知らせいただければ、一緒に設定を進めます。",
    cta: "お問い合わせ",
    subject: "複数医院でのDentVideo導入について",
  },
  ar: {
    name: "Group",
    price: "سعر حسب الطلب",
    text: "للمجموعات والعيادات متعددة الفروع: أخبرونا بفروعكم وسنُعِدّ الخدمة معكم.",
    cta: "تواصلوا معنا",
    subject: "DentVideo لعدة عيادات",
  },
  pl: {
    name: "Group",
    price: "Wycena indywidualna",
    text: "Dla sieci i gabinetów z kilkoma placówkami: prosimy napisać nam o swoich placówkach, a skonfigurujemy wszystko razem z Państwem.",
    cta: "Skontaktuj się z nami",
    subject: "DentVideo dla kilku gabinetów",
  },
};

/** The address Group enquiries go to. */
export const GROUP_CONTACT_EMAIL = DV_SUPPORT_EMAIL;

/** mailto:hello@dentvideo.com with the subject in the page's language. */
export function groupMailto(locale: Locale): string {
  return mailtoHref(GROUP_CONTACT[locale].subject);
}
