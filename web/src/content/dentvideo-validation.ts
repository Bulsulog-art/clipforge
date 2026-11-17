import type { Locale } from "./dentvideo-locales";

/**
 * The funnel forms' own field messages. The browser's validation bubbles
 * ("Please fill out this field.") speak the browser's language, not the
 * page's: a Turkish clinic on an English phone read English, a German
 * browser on the Arabic page German. The forms validate themselves instead
 * (components/dentvid/validating-form.tsx) and show these under the field.
 * Same form of address as the rest of each language's interface.
 */
export type ValidationText = {
  /** An empty required field. */
  required: string;
  /** Not an email address. */
  email: string;
  /** Shorter than the minimum; {n} is the minimum. */
  tooShort: string;
  /** Not a full web address. */
  url: string;
  /** Not digits (the email code). */
  digits: string;
  /** Any other rule the field breaks. */
  invalid: string;
};

export const VALIDATION_TEXT: Record<Locale, ValidationText> = {
  en: {
    required: "Please fill this in.",
    email: "Enter an email address, like name@clinic.com.",
    tooShort: "Use at least {n} characters.",
    url: "Enter a full web address, starting with https://",
    digits: "Use digits only.",
    invalid: "Please check this field.",
  },
  de: {
    required: "Bitte füllen Sie dieses Feld aus.",
    email: "Geben Sie eine E-Mail-Adresse ein, z. B. name@praxis.de.",
    tooShort: "Verwenden Sie mindestens {n} Zeichen.",
    url: "Geben Sie eine vollständige Webadresse ein, beginnend mit https://",
    digits: "Bitte nur Ziffern eingeben.",
    invalid: "Bitte prüfen Sie dieses Feld.",
  },
  es: {
    required: "Rellena este campo.",
    email: "Escribe un correo electrónico, como nombre@clinica.es.",
    tooShort: "Usa al menos {n} caracteres.",
    url: "Escribe una dirección web completa que empiece por https://",
    digits: "Usa solo números.",
    invalid: "Revisa este campo.",
  },
  tr: {
    required: "Lütfen bu alanı doldurun.",
    email: "Bir e-posta adresi girin, örneğin ad@klinik.com.",
    tooShort: "En az {n} karakter kullanın.",
    url: "https:// ile başlayan tam bir web adresi girin.",
    digits: "Yalnızca rakam kullanın.",
    invalid: "Lütfen bu alanı kontrol edin.",
  },
  fr: {
    required: "Veuillez remplir ce champ.",
    email: "Saisissez une adresse e-mail, par exemple nom@cabinet.fr.",
    tooShort: "Utilisez au moins {n} caractères.",
    url: "Saisissez une adresse web complète commençant par https://",
    digits: "Utilisez uniquement des chiffres.",
    invalid: "Veuillez vérifier ce champ.",
  },
  ja: {
    required: "この項目を入力してください。",
    email: "メールアドレスを入力してください（例：name@clinic.jp）。",
    tooShort: "{n}文字以上で入力してください。",
    url: "https:// から始まるURLを入力してください。",
    digits: "数字のみで入力してください。",
    invalid: "この項目をご確認ください。",
  },
  ar: {
    required: "يُرجى ملء هذا الحقل.",
    email: "أدخلوا بريدًا إلكترونيًا صحيحًا، مثل name@clinic.com.",
    tooShort: "استخدموا {n} أحرف على الأقل.",
    url: "أدخلوا عنوان موقع كاملًا يبدأ بـ https://",
    digits: "استخدموا الأرقام فقط.",
    invalid: "يُرجى مراجعة هذا الحقل.",
  },
  pl: {
    required: "Prosimy wypełnić to pole.",
    email: "Prosimy podać adres e-mail, np. nazwa@gabinet.pl.",
    tooShort: "Prosimy użyć co najmniej {n} znaków.",
    url: "Prosimy podać pełny adres strony zaczynający się od https://",
    digits: "Prosimy wpisać same cyfry.",
    invalid: "Prosimy sprawdzić to pole.",
  },
};

export const validationText = (locale: Locale): ValidationText => VALIDATION_TEXT[locale] ?? VALIDATION_TEXT.en;
