"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANDING_PATH, LOCALES, type Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { asLocale } from "@/lib/dentvid/locale";
import { rememberedLocale, rememberLocale } from "@/lib/dentvid/lang-cookie";
import { DvMark } from "./mark";

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
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "dentvideo") return null;
  if (parts.length === 1) return "en";
  if (parts[1] === "guides") return guideLocales[parts[2] ?? ""] ?? null;
  return parts.length === 2 && (LOCALES as readonly string[]).includes(parts[1]) ? (parts[1] as Locale) : null;
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
  return (
    <header className="border-b border-[#e8e1d5] bg-[#faf7f2]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={home} className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0f5c5c]/40">
          <DvMark className="text-lg" />
        </Link>
        <nav className={`flex items-center gap-5 text-sm ${hide}`}>
          <Link href={`${home}#how`} className="hidden text-[#4a5a57] hover:text-[#14211f] sm:inline">{t.howItWorks}</Link>
          <Link href={`${home}#pricing`} className="hidden text-[#4a5a57] hover:text-[#14211f] sm:inline">{t.pricing}</Link>
          <Link href="/dentvideo/app" className="whitespace-nowrap rounded-full bg-[#0f5c5c] px-4 py-2 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a]">
            {t.openApp}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function DvFooter({ guideLocales }: Props) {
  const { locale, ready } = useDvLocale(guideLocales);
  return (
    <footer className="border-t border-[#e8e1d5]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[#4a5a57] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <DvMark />
        <p className={ready ? "" : "invisible"}>
          © {new Date().getFullYear()} Bulsu Labs. {appText(locale).chrome.footer}
        </p>
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
