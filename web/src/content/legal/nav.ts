import type { Locale } from "../dentvideo";
import { LEGAL_KINDS, type LegalKind } from "./types";

/**
 * The few legal strings the browser needs (footer links, the checkout consent
 * line), kept apart from the full texts so client components stay small.
 */

/** The in-app path of a legal page: /dentvideo/terms (English), /dentvideo/de/terms … */
export function legalPath(kind: LegalKind, locale: Locale): string {
  return locale === "en" ? `/dentvideo/${kind}` : `/dentvideo/${locale}/${kind}`;
}

export function isLegalKind(v: string): v is LegalKind {
  return (LEGAL_KINDS as readonly string[]).includes(v);
}

export type LegalNav = {
  /** "Legal": the footer group and the breadcrumb. */
  legal: string;
  /** Short link labels. */
  nav: Record<LegalKind, string>;
  /** Under the plan cards: {terms} and {refunds} become links (labels: termsLink, refundsLink). */
  checkoutConsent: string;
  termsLink: string;
  refundsLink: string;
};

export const LEGAL_NAV: Record<Locale, LegalNav> = {
  en: {
    legal: "Legal",
    nav: { terms: "Terms", privacy: "Privacy", refunds: "Refunds", dpa: "Data processing (DPA)", imprint: "Imprint" },
    checkoutConsent:
      "By choosing a plan you agree to the {terms} and the {refunds}. Dodo Payments is the merchant of record: it sells you the subscription, charges your card and issues your invoice.",
    termsLink: "Terms of Service",
    refundsLink: "Refund Policy",
  },
  de: {
    legal: "Rechtliches",
    nav: { terms: "Nutzungsbedingungen", privacy: "Datenschutz", refunds: "Erstattungen", dpa: "Auftragsverarbeitung (AVV)", imprint: "Impressum" },
    checkoutConsent:
      "Mit der Wahl eines Tarifs stimmen Sie den {terms} und der {refunds} zu. Dodo Payments ist Händler (Merchant of Record): Es verkauft Ihnen das Abonnement, belastet Ihre Karte und stellt Ihre Rechnung aus.",
    termsLink: "Nutzungsbedingungen",
    refundsLink: "Erstattungsrichtlinie",
  },
  es: {
    legal: "Legal",
    nav: { terms: "Términos", privacy: "Privacidad", refunds: "Reembolsos", dpa: "Encargo de tratamiento (DPA)", imprint: "Aviso legal" },
    checkoutConsent:
      "Al elegir un plan aceptas los {terms} y la {refunds}. Dodo Payments es el comerciante registrado (merchant of record): te vende la suscripción, cobra tu tarjeta y emite tu factura.",
    termsLink: "Términos del servicio",
    refundsLink: "Política de reembolsos",
  },
  tr: {
    legal: "Yasal",
    nav: { terms: "Kullanım Koşulları", privacy: "Gizlilik", refunds: "İadeler", dpa: "Veri işleme sözleşmesi (DPA)", imprint: "Künye" },
    checkoutConsent:
      "Bir plan seçerek {terms} ve {refunds} metinlerini kabul etmiş olursunuz. Satıcı (merchant of record) Dodo Payments'tır: aboneliği size o satar, kartınızdan tahsil eder ve faturanızı düzenler.",
    termsLink: "Kullanım Koşulları",
    refundsLink: "İade Politikası",
  },
  fr: {
    legal: "Mentions légales",
    nav: { terms: "Conditions", privacy: "Confidentialité", refunds: "Remboursements", dpa: "Sous-traitance (DPA)", imprint: "Mentions légales" },
    checkoutConsent:
      "En choisissant une formule, vous acceptez les {terms} et la {refunds}. Dodo Payments est le marchand officiel (merchant of record) : il vous vend l'abonnement, débite votre carte et émet votre facture.",
    termsLink: "Conditions d'utilisation",
    refundsLink: "Politique de remboursement",
  },
  ja: {
    legal: "法的情報",
    nav: { terms: "利用規約", privacy: "プライバシー", refunds: "返金", dpa: "データ処理契約（DPA）", imprint: "運営者情報" },
    checkoutConsent:
      "プランを選択すると、{terms}と{refunds}に同意したものとみなされます。販売者（Merchant of Record）はDodo Paymentsで、サブスクリプションの販売、カードへの請求、請求書の発行を行います。",
    termsLink: "利用規約",
    refundsLink: "返金ポリシー",
  },
  ar: {
    legal: "معلومات قانونية",
    nav: { terms: "الشروط", privacy: "الخصوصية", refunds: "الاسترداد", dpa: "اتفاقية معالجة البيانات", imprint: "بيانات الناشر" },
    checkoutConsent:
      "باختيار باقة، توافقون على {terms} و{refunds}. Dodo Payments هي البائع المسجّل (Merchant of Record): تبيعكم الاشتراك وتخصم المبلغ من بطاقتكم وتصدر فاتورتكم.",
    termsLink: "شروط الخدمة",
    refundsLink: "سياسة الاسترداد",
  },
  pl: {
    legal: "Informacje prawne",
    nav: { terms: "Regulamin", privacy: "Prywatność", refunds: "Zwroty", dpa: "Powierzenie danych (DPA)", imprint: "Nota prawna" },
    checkoutConsent:
      "Wybierając plan, akceptują Państwo {terms} oraz {refunds}. Sprzedawcą (merchant of record) jest Dodo Payments: sprzedaje subskrypcję, obciąża kartę i wystawia fakturę.",
    termsLink: "Regulamin",
    refundsLink: "Politykę zwrotów",
  },
};
