import type { Locale } from "./dentvideo";

/**
 * Before a Dodo payment link that cannot carry a discount (no DODO_API_KEY:
 * api/dentvideo/checkout answers { url, code }), the plan panel says to type
 * the code there. Dodo's own page is in English, so its button is quoted as
 * it reads: "Apply discount code".
 */
export type CheckoutCodeCopy = {
  title: string;
  /** {code} is the code; {button} is Dodo's button label. */
  body: string;
  copy: string;
  copied: string;
  go: string;
  back: string;
};

export const DODO_DISCOUNT_BUTTON = "Apply discount code";

export const CHECKOUT_CODE: Record<Locale, CheckoutCodeCopy> = {
  en: {
    title: "One step on the payment page",
    body: "The payment page opens at the full price. Tap “{button}” and enter {code} — the total then drops to your discounted price.",
    copy: "Copy code",
    copied: "Copied",
    go: "Continue to payment",
    back: "Back to plans",
  },
  de: {
    title: "Ein Schritt auf der Zahlungsseite",
    body: "Die Zahlungsseite öffnet zum vollen Preis. Tippen Sie auf „{button}“ und geben Sie {code} ein — der Betrag sinkt dann auf Ihren reduzierten Preis.",
    copy: "Code kopieren",
    copied: "Kopiert",
    go: "Weiter zur Zahlung",
    back: "Zurück zu den Plänen",
  },
  es: {
    title: "Un paso en la página de pago",
    body: "La página de pago se abre con el precio completo. Toque «{button}» e introduzca {code}: el total bajará a su precio con descuento.",
    copy: "Copiar código",
    copied: "Copiado",
    go: "Continuar al pago",
    back: "Volver a los planes",
  },
  tr: {
    title: "Ödeme sayfasında tek bir adım",
    body: "Ödeme sayfası tam fiyatla açılır. “{button}” düğmesine dokunup {code} kodunu girin — toplam tutar indirimli fiyatınıza düşer.",
    copy: "Kodu kopyala",
    copied: "Kopyalandı",
    go: "Ödemeye devam et",
    back: "Planlara dön",
  },
  fr: {
    title: "Une étape sur la page de paiement",
    body: "La page de paiement s’ouvre au prix plein. Touchez « {button} » et saisissez {code} : le total passe alors à votre prix réduit.",
    copy: "Copier le code",
    copied: "Copié",
    go: "Continuer vers le paiement",
    back: "Retour aux offres",
  },
  ja: {
    title: "お支払い画面でのひと手間",
    body: "お支払い画面は通常価格で開きます。「{button}」をタップして {code} を入力すると、合計が割引価格になります。",
    copy: "コードをコピー",
    copied: "コピーしました",
    go: "お支払いへ進む",
    back: "プランに戻る",
  },
  ar: {
    title: "خطوة واحدة في صفحة الدفع",
    body: "تُفتح صفحة الدفع بالسعر الكامل. اضغط على «{button}» وأدخل {code}، فينخفض الإجمالي إلى سعرك المخفّض.",
    copy: "نسخ الرمز",
    copied: "تم النسخ",
    go: "المتابعة إلى الدفع",
    back: "العودة إلى الخطط",
  },
  pl: {
    title: "Jeden krok na stronie płatności",
    body: "Strona płatności otwiera się z pełną ceną. Stuknij „{button}” i wpisz {code} — kwota spadnie wtedy do ceny po rabacie.",
    copy: "Kopiuj kod",
    copied: "Skopiowano",
    go: "Przejdź do płatności",
    back: "Wróć do planów",
  },
};

/** What the plan panel does with the checkout answer: go straight on, or first show the code to type. */
export type CheckoutNext = { kind: "go"; url: string } | { kind: "typeCode"; url: string; code: string } | { kind: "none" };

export function checkoutNext(body: { url?: unknown; code?: unknown } | null | undefined): CheckoutNext {
  const url = typeof body?.url === "string" && /^https:\/\//.test(body.url) ? body.url : null;
  if (!url) return { kind: "none" };
  // Only a payment link comes back with a code: the API checkout applies it itself.
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  return code ? { kind: "typeCode", url, code } : { kind: "go", url };
}
