"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANDING_PATH, LANGUAGE_NAME, LOCALES, type Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { asLocale } from "@/lib/dentvid/locale";
import { rememberedLocale, rememberLocale } from "@/lib/dentvid/lang-cookie";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { DvLogo } from "./mark";

/** Fired when a page sets the interface language, so the header follows at once. */
const LANG_EVENT = "dv-lang";

export function announceLocale(locale: Locale) {
  rememberLocale(locale);
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: locale }));
}

/**
 * The language the page itself is in, when its address says so: a localized
 * landing (/dentvideo/tr) or a guide (each guide has one language). Null for
 * the app and sign-up screens, whose language is per visitor.
 */
export function pathLocale(pathname: string, guideLocales: Record<string, Locale>): Locale | null {
  // On dentvideo.com the address is "/tr" (the middleware serves the
  // /dentvideo section there); elsewhere it is "/dentvideo/tr". Read both.
  const all = pathname.split("/").filter(Boolean);
  const parts = all[0] === "dentvideo" ? all.slice(1) : all;
  if (parts.length === 0) return "en";
  // English guides hub and About: /guides, /about.
  if (parts.length === 1 && (parts[0] === "guides" || parts[0] === "about")) return "en";
  if (parts[0] === "guides") return guideLocales[parts[1] ?? ""] ?? null;
  if (!(LOCALES as readonly string[]).includes(parts[0])) return null;
  // A landing (/tr), or its guides hub or About page (/tr/guides).
  return parts.length === 1 || (parts.length === 2 && (parts[1] === "guides" || parts[1] === "about")) ? (parts[0] as Locale) : null;
}

function useDvLocale(guideLocales: Record<string, Locale>): { locale: Locale; ready: boolean } {
  const fromPath = pathLocale(usePathname() ?? "", guideLocales);
  const [remembered, setRemembered] = useState<Locale | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setRemembered(asLocale(rememberedLocale()));
    setReady(true);
    const on = (e: Event) => setRemembered(asLocale((e as CustomEvent<string>).detail));
    window.addEventListener(LANG_EVENT, on);
    return () => window.removeEventListener(LANG_EVENT, on);
  }, []);
  if (fromPath) return { locale: fromPath, ready: true };
  return { locale: remembered ?? "en", ready };
}

type Props = { guideLocales: Record<string, Locale> };

export function DvHeader({ guideLocales }: Props) {
  const { locale, ready } = useDvLocale(guideLocales);
  const t = appText(locale).chrome;
  const home = LANDING_PATH[locale];
  // Until the visitor's language is known on the app screens, keep the space
  // but not the English words.
  const hide = ready ? "" : "invisible";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const navLink =
    "hidden rounded-full px-3.5 py-2 font-medium text-dv-body transition-colors hover:bg-dv-sand-200/70 hover:text-dv-ink md:inline-block";
  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-dv-line/80 bg-dv-paper/80 shadow-[0_10px_30px_-24px_rgba(20,33,31,0.45)] backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-dv-paper/0"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
        <Link href={home} className="-m-1 shrink-0 rounded-lg p-1" aria-label="DentVideo">
          <DvLogo className="h-7 w-auto sm:h-8" />
        </Link>
        <nav className={`flex items-center gap-1 text-[0.9375rem] ${hide}`}>
          <Link href={`${home}#how`} className={navLink}>{t.howItWorks}</Link>
          <Link href={`${home}#pricing`} className={navLink}>{t.pricing}</Link>
          <Link href={GUIDES_INDEX_PATH[locale]} className={navLink}>{GUIDE_UI[locale].guides}</Link>
          <Link href="/dentvideo/app" className="dv-btn dv-btn-primary ml-2 whitespace-nowrap px-4 py-2.5 text-sm sm:px-5">
            {t.openApp}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function DvFooter({ guideLocales }: Props) {
  const { locale, ready } = useDvLocale(guideLocales);
  const t = appText(locale).chrome;
  const home = LANDING_PATH[locale];
  const link = "rounded-md text-[#c9d9d5] transition-colors hover:text-white";
  return (
    <footer className="dv-on-dark dv-grain relative overflow-hidden bg-dv-teal-950 text-[#c9d9d5]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[64rem] -translate-x-1/2 rounded-full bg-[#167269]/30 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href={home} className="-m-1 inline-block rounded-lg p-1" aria-label="DentVideo">
              <DvLogo tone="dark" className="h-9 w-auto" />
            </Link>
            <p className={`mt-6 text-sm leading-relaxed text-[#a9c3be] ${ready ? "" : "invisible"}`}>{t.footer}</p>
          </div>
          <div className={`grid grid-cols-2 gap-x-16 text-sm ${ready ? "" : "invisible"}`}>
            <ul className="space-y-3.5">
              <li><Link href={`${home}#how`} className={link}>{t.howItWorks}</Link></li>
              <li><Link href={`${home}#pricing`} className={link}>{t.pricing}</Link></li>
              <li><Link href={GUIDES_INDEX_PATH[locale]} className={link}>{GUIDE_UI[locale].guides}</Link></li>
              <li><Link href={ABOUT_PATH[locale]} className={link}>{GUIDE_UI[locale].about}</Link></li>
              <li><Link href="/dentvideo/app" className={link}>{t.openApp}</Link></li>
            </ul>
            <ul className="space-y-3.5">
              {LOCALES.map((l) => (
                <li key={l}>
                  <Link href={LANDING_PATH[l]} hrefLang={l} lang={l} className={l === locale ? "rounded-md font-semibold text-white" : link}>
                    {LANGUAGE_NAME[l]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[#8fb0aa] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bulsu Labs</p>
          <p className="tracking-wide">dentvideo.com</p>
        </div>
      </div>
    </footer>
  );
}

/** Placed on a page whose language is known on the server (the clinic's). */
export function RememberLocale({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (asLocale(rememberedLocale()) !== locale) announceLocale(locale);
  }, [locale]);
  return null;
}
