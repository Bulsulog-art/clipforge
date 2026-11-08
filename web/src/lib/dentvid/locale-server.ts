import { cookies, headers } from "next/headers";
import type { Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { LANG_COOKIE, resolveLocale } from "./locale";

/** The interface language for this request (see resolveLocale). */
export async function dvLocale(clinicLanguage?: string | null): Promise<Locale> {
  const [store, h] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    clinicLanguage,
    cookie: store.get(LANG_COOKIE)?.value,
    acceptLanguage: h.get("accept-language"),
  });
}

/** API error messages in the visitor's language. */
export async function dvErrors(clinicLanguage?: string | null) {
  return appText(await dvLocale(clinicLanguage)).errors;
}
