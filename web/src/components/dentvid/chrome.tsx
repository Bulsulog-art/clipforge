"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANDING_PATH, LANGUAGE_NAME, LOCALES, dirOf, hasGuides, type Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { asLocale } from "@/lib/dentvid/locale";
import { rememberedLocale, rememberLocale } from "@/lib/dentvid/lang-cookie";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { dvHref } from "@/lib/dentvid/host";
import { DvLogo } from "./mark";
import { Clapperboard, LogOut, Settings, Video } from "lucide-react";
import { appTab, isFunnel, DV_SUPPORT_EMAIL, type AppTab } from "@/lib/dentvid/app-ui";
import { dvBrowser } from "@/lib/dentvid/supabase";

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
  const path = usePathname() ?? "";
  const tab = appTab(path);
  if (tab) return <AppHeader locale={locale} ready={ready} tab={tab} />;
  return <SiteHeader locale={locale} ready={ready} quiet={isFunnel(path)} />;
}

/** The site header; `quiet` (the sign-up wizard) keeps only the logo, so the next step is the only way on. */
function SiteHeader({ locale, ready, quiet }: { locale: Locale; ready: boolean; quiet: boolean }) {
  const t = appText(locale).chrome;
  const home = LANDING_PATH[locale];
  // Until the visitor's language is known on the app screens, keep the space
  // but not the English words.
  const hide = ready ? "" : "invisible";
  // <html lang> follows the page on client-side navigation (HtmlLang sets it on first load).
  useEffect(() => {
    if (ready) {
      document.documentElement.lang = locale;
      document.documentElement.dir = dirOf(locale);
    }
  }, [locale, ready]);
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
      lang={locale}
      dir={dirOf(locale)}
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-dv-line/80 bg-dv-paper/80 shadow-[0_10px_30px_-24px_rgba(20,33,31,0.45)] backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-dv-paper/0"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
        <Link href={dvHref(home)} className="-m-1 shrink-0 rounded-lg p-1" aria-label="DentVideo">
          <DvLogo className="h-7 w-auto sm:h-8" />
        </Link>
        {!quiet && (
          <nav className={`flex items-center gap-1 text-[0.9375rem] ${hide}`}>
            <Link href={dvHref(`${home}#how`)} className={navLink}>{t.howItWorks}</Link>
            <Link href={dvHref(`${home}#pricing`)} className={navLink}>{t.pricing}</Link>
            {hasGuides(locale) && <Link href={dvHref(GUIDES_INDEX_PATH[locale])} className={navLink}>{GUIDE_UI[locale].guides}</Link>}
            <Link href={dvHref("/dentvideo/app")} className="dv-btn dv-btn-primary ms-2 whitespace-nowrap px-4 py-2.5 text-sm sm:px-5">
              {t.openApp}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function DvFooter({ guideLocales }: Props) {
  const { locale, ready } = useDvLocale(guideLocales);
  const path = usePathname() ?? "";
  if (appTab(path) || isFunnel(path)) return <AppFooter locale={locale} ready={ready} />;
  const t = appText(locale).chrome;
  const home = LANDING_PATH[locale];
  const link = "rounded-md text-[#c9d9d5] transition-colors hover:text-white";
  return (
    <footer lang={locale} dir={dirOf(locale)} className="dv-on-dark dv-grain relative overflow-hidden bg-dv-teal-950 text-[#c9d9d5]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[64rem] -translate-x-1/2 rounded-full bg-[#167269]/30 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href={dvHref(home)} className="-m-1 inline-block rounded-lg p-1" aria-label="DentVideo">
              <DvLogo tone="dark" className="h-9 w-auto" />
            </Link>
            <p className={`mt-6 text-sm leading-relaxed text-[#a9c3be] ${ready ? "" : "invisible"}`}>{t.footer}</p>
          </div>
          <div className={`grid grid-cols-2 gap-x-16 text-sm ${ready ? "" : "invisible"}`}>
            <ul className="space-y-3.5">
              <li><Link href={dvHref(`${home}#how`)} className={link}>{t.howItWorks}</Link></li>
              <li><Link href={dvHref(`${home}#pricing`)} className={link}>{t.pricing}</Link></li>
              {hasGuides(locale) && <li><Link href={dvHref(GUIDES_INDEX_PATH[locale])} className={link}>{GUIDE_UI[locale].guides}</Link></li>}
              <li><Link href={dvHref(ABOUT_PATH[locale])} className={link}>{GUIDE_UI[locale].about}</Link></li>
              <li><Link href={dvHref("/dentvideo/app")} className={link}>{t.openApp}</Link></li>
            </ul>
            <ul className="space-y-3.5">
              {LOCALES.map((l) => (
                <li key={l}>
                  <Link href={dvHref(LANDING_PATH[l])} hrefLang={l} lang={l} dir={dirOf(l)} className={l === locale ? "rounded-md font-semibold text-white" : link}>
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

const TABS: { key: AppTab; href: string; Icon: typeof Video }[] = [
  { key: "videos", href: "/dentvideo/app", Icon: Video },
  { key: "record", href: "/dentvideo/app/record", Icon: Clapperboard },
  { key: "settings", href: "/dentvideo/app/settings", Icon: Settings },
];

/**
 * Inside the app: the logo, the three screens (Videos, Record, Settings) and
 * sign-out. On a phone the screens sit in a row of equal tabs under the logo,
 * each a full thumb's width.
 */
function AppHeader({ locale, ready, tab }: { locale: Locale; ready: boolean; tab: AppTab }) {
  const t = appText(locale).chrome;
  const [leaving, setLeaving] = useState(false);
  // As on the site: <html> speaks the app's language, right to left in Arabic.
  useEffect(() => {
    if (ready) {
      document.documentElement.lang = locale;
      document.documentElement.dir = dirOf(locale);
    }
  }, [locale, ready]);
  const hide = ready ? "" : "invisible";

  async function signOut() {
    setLeaving(true);
    try {
      await dvBrowser().auth.signOut();
    } catch {
      /* signed out locally either way */
    }
    window.location.assign("/dentvideo/start");
  }

  const tabLink = (key: AppTab) =>
    `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
      key === tab ? "bg-dv-teal text-white" : "text-dv-body hover:bg-dv-sand-200/70 hover:text-dv-ink"
    }`;

  return (
    <header lang={locale} dir={dirOf(locale)} className="sticky top-0 z-40 border-b border-dv-line/80 bg-dv-paper/90 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link href="/dentvideo/app" className="-m-1 shrink-0 rounded-lg p-1" aria-label="DentVideo">
          <DvLogo className="h-7 w-auto" />
        </Link>
        <nav aria-label={t.appNav} className={`hidden items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-dv-line md:flex ${hide}`}>
          {TABS.map(({ key, href, Icon }) => (
            <Link key={key} href={href} aria-current={key === tab ? "page" : undefined} className={tabLink(key)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t[key]}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          disabled={leaving}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-dv-body transition-colors hover:bg-dv-sand-200/70 hover:text-dv-ink disabled:opacity-60 ${hide}`}
        >
          <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {leaving ? t.signingOut : t.signOut}
        </button>
      </div>
      <nav aria-label={t.appNav} className={`border-t border-dv-line/70 px-2 py-1.5 md:hidden ${hide}`}>
        <ul className="grid grid-cols-3 gap-1">
          {TABS.map(({ key, href, Icon }) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={key === tab ? "page" : undefined}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[0.8125rem] font-semibold leading-tight transition-colors ${
                  key === tab ? "bg-dv-teal text-white" : "text-dv-body hover:bg-dv-sand-200/70 hover:text-dv-ink"
                }`}
              >
                <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true" />
                <span className="max-w-full text-center [overflow-wrap:anywhere]">{t[key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

/** Inside the app: one calm line — the compliance promise and where to write. */
function AppFooter({ locale, ready }: { locale: Locale; ready: boolean }) {
  const t = appText(locale).chrome;
  return (
    <footer lang={locale} dir={dirOf(locale)} className={`border-t border-dv-line bg-dv-sand/60 ${ready ? "" : "invisible"}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-dv-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-xl">{t.footer}</p>
        <p>
          {t.help}{" "}
          <a dir="ltr" href={`mailto:${DV_SUPPORT_EMAIL}`} className="font-medium text-dv-teal underline-offset-4 hover:underline">
            {DV_SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
