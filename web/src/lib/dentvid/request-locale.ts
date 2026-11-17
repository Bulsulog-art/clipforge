import type { Locale } from "@/content/dentvideo";
import { LANG_COOKIE, resolveLocale } from "./locale";

/**
 * The visitor's language from a raw request (middleware, route handlers that
 * have no clinic yet): the dv-lang cookie, else Accept-Language, else English.
 * Small on purpose — the middleware imports it, so no content files here.
 */
export function requestLocale(cookieHeader: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  const m = (cookieHeader ?? "").match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`));
  let cookie: string | null = null;
  try {
    cookie = m ? decodeURIComponent(m[1]) : null;
  } catch {
    cookie = null;
  }
  return resolveLocale({ cookie, acceptLanguage });
}

/**
 * The middleware's per-IP flood limit, said in the visitor's language. The
 * same sentences as appText(locale).errors.tooMany (request-locale.test.ts
 * keeps them equal), copied so the middleware bundle stays small.
 */
export const TOO_MANY: Record<Locale, string> = {
  en: "Too many attempts. Please wait a few minutes and try again.",
  de: "Zu viele Versuche. Bitte warten Sie einige Minuten und versuchen Sie es erneut.",
  es: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
  tr: "Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.",
  fr: "Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.",
  ja: "短時間に試行が多すぎます。数分おいてから、もう一度お試しください。",
  ar: "محاولات كثيرة خلال وقت قصير. انتظروا بضع دقائق ثم حاولوا مرة أخرى.",
  pl: "Zbyt wiele prób w krótkim czasie. Prosimy odczekać kilka minut i spróbować ponownie.",
};
