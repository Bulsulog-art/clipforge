import type { Locale } from "./dentvideo-locales";

/**
 * One quiet line under an error at the moments a failure costs the most: creating the account,
 * saving the clinic, opening checkout, the billing portal, a plan change, deleting the account
 * (components/dentvid/help-line.tsx). Without it those screens ended in "Please try again" with
 * nowhere to go.
 *
 * It names the support address (a mailto with the subject and a short reference filled in) and
 * the help center. It promises no response time: like every DentVideo email, it says only that a
 * person reads the message (content/dentvideo-support.ts). Kept apart from dentvideo-app.ts so the
 * sign-up page loads it only when an error is shown.
 *
 * Placeholders: `line` has {email} and {help} (the two links); `subject` has {ref}; `body` has
 * {message} (what the screen said) and {ref}.
 */

export const HELP_LINE_EMAIL = "hello@dentvideo.com";

export type HelpLineCopy = {
  /** The line itself: {email} is the address, {help} the help center link. */
  line: string;
  /** The help center link's words. */
  help: string;
  /** The prefilled subject, as the in-app help card writes it, with the reference. */
  subject: string;
  /** The prefilled body: what the screen said, and the reference. */
  body: string;
};

export const HELP_LINE: Record<Locale, HelpLineCopy> = {
  en: {
    line: "If it keeps happening, write to {email}. A person reads every message, and the {help} answers common questions.",
    help: "help center",
    subject: "DentVideo help · {ref}",
    body: "Hello DentVideo team,\n\nThis is what I saw:\n{message}\n\nWhat I was trying to do:\n\n\n(Reference: {ref}. Please keep this line so we know where to look.)",
  },
  de: {
    line: "Wenn es weiterhin nicht klappt, schreiben Sie an {email}. Jede Nachricht liest ein Mensch, und im {help} finden Sie Antworten auf häufige Fragen.",
    help: "Hilfe-Center",
    subject: "DentVideo Hilfe · {ref}",
    body: "Hallo DentVideo-Team,\n\ndiese Meldung habe ich gesehen:\n{message}\n\nDas wollte ich gerade tun:\n\n\n(Referenz: {ref}. Bitte diese Zeile stehen lassen, damit wir wissen, wo wir nachsehen müssen.)",
  },
  es: {
    line: "Si vuelve a pasar, escríbenos a {email}. Cada mensaje lo lee una persona, y en el {help} encontrarás respuestas a las dudas más comunes.",
    help: "centro de ayuda",
    subject: "Ayuda DentVideo · {ref}",
    body: "Hola, equipo de DentVideo:\n\nEste es el mensaje que he visto:\n{message}\n\nLo que intentaba hacer:\n\n\n(Referencia: {ref}. Deja esta línea para que sepamos dónde mirar.)",
  },
  tr: {
    line: "Sorun devam ederse {email} adresine yazın. Her mesajı bir ekip üyemiz okur. Sık sorulan soruların yanıtları için {help} sayfasına da bakabilirsiniz.",
    help: "yardım merkezi",
    subject: "DentVideo yardım · {ref}",
    body: "Merhaba DentVideo ekibi,\n\nGördüğüm mesaj:\n{message}\n\nYapmaya çalıştığım şey:\n\n\n(Referans: {ref}. Nereye bakacağımızı bilmemiz için lütfen bu satırı silmeyin.)",
  },
  fr: {
    line: "Si le problème persiste, écrivez à {email}. Chaque message est lu par une personne, et le {help} répond aux questions les plus fréquentes.",
    help: "centre d'aide",
    subject: "Aide DentVideo · {ref}",
    body: "Bonjour l'équipe DentVideo,\n\nVoici le message que j'ai vu :\n{message}\n\nCe que j'essayais de faire :\n\n\n(Référence : {ref}. Merci de garder cette ligne pour que nous sachions où regarder.)",
  },
  ja: {
    line: "問題が続く場合は {email} までご連絡ください。すべてのメッセージをスタッフが拝読します。よくあるご質問への回答は{help}でご案内しています。",
    help: "ヘルプセンター",
    subject: "DentVideo お問い合わせ · {ref}",
    body: "DentVideo ご担当者様\n\n表示されたメッセージ：\n{message}\n\nしようとしていたこと：\n\n\n（参照番号：{ref}。確認のため、この行は消さずにお送りください。）",
  },
  ar: {
    line: "إذا تكررت المشكلة، فراسلونا على {email}. يقرأ أحد أفراد فريقنا كل رسالة، وفي {help} إجابات عن الأسئلة الشائعة.",
    help: "مركز المساعدة",
    subject: "مساعدة DentVideo · {ref}",
    body: "مرحباً فريق DentVideo،\n\nهذه هي الرسالة التي ظهرت لي:\n{message}\n\nما كنت أحاول القيام به:\n\n\n(المرجع: {ref}. يُرجى إبقاء هذا السطر لنعرف أين نبحث.)",
  },
  pl: {
    line: "Jeśli problem się powtarza, prosimy napisać na {email}. Każdą wiadomość czyta człowiek, a odpowiedzi na częste pytania są w {help}.",
    help: "centrum pomocy",
    subject: "Pomoc DentVideo · {ref}",
    body: "Dzień dobry, zespole DentVideo,\n\nTaki komunikat się pojawił:\n{message}\n\nOpis sytuacji:\n\n\n(Numer referencyjny: {ref}. Prosimy zostawić tę linię, abyśmy wiedzieli, gdzie szukać.)",
  },
};

export function helpLineText(locale: string | null | undefined): HelpLineCopy {
  return HELP_LINE[(locale && Object.prototype.hasOwnProperty.call(HELP_LINE, locale) ? locale : "en") as Locale];
}

/** A short reference for where it went wrong: "signup-500", "checkout-network". Lowercase letters, digits and hyphens only. */
export function helpRef(where: string, status?: number | "network" | null): string {
  const parts = [where, status === undefined || status === null ? "" : String(status)]
    .map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);
  return parts.join("-").slice(0, 40) || "app";
}

/** mailto:hello@dentvideo.com with the subject and body filled in, in the clinic's language. */
export function helpLineMailto(locale: string | null | undefined, ref: string, message?: string | null): string {
  const t = helpLineText(locale);
  const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
  const shown = (message ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const body = shown ? fill(t.body, { message: shown, ref }) : fill(t.body.replace(/\n[^\n]*\n\{message\}\n/, "\n"), { ref });
  return `mailto:${HELP_LINE_EMAIL}?subject=${encodeURIComponent(fill(t.subject, { ref }))}&body=${encodeURIComponent(body)}`;
}
