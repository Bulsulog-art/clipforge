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

/**
 * The signed-in clinic's language (its profile), for what the app's pages
 * show before they render — the browser tab title (generateMetadata). The
 * pages themselves use the clinic's language, so the tab must too; without a
 * session or clinic it is dvLocale() (cookie / browser).
 */
export async function clinicLocale(): Promise<Locale> {
  try {
    const { dvSession } = await import("./auth");
    const { db, user } = await dvSession();
    if (user) {
      const { data } = await db.from("dentvid_clinics").select("profile").eq("owner_id", user.id).maybeSingle();
      return dvLocale((data?.profile as { language?: string } | null | undefined)?.language);
    }
  } catch {
    // no session store / database: the visitor's language
  }
  return dvLocale();
}

/** API error messages in the visitor's language. */
export async function dvErrors(clinicLanguage?: string | null) {
  return appText(await dvLocale(clinicLanguage)).errors;
}
