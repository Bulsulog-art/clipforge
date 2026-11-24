"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// Ships on every DentVideo page: small modules only; the content modules stay on the server.
import { HELP_PATH, LANDING_PATH, LANGUAGE_NAME, LOCALES, dirOf, hasGuideHub as hasGuides, type Locale } from "@/content/dentvideo-locales";
import type { ChromeText, ChromeWords } from "@/lib/dentvid/chrome-text";
import { asLocale } from "@/lib/dentvid/locale";
import { rememberedLocale, rememberLocale } from "@/lib/dentvid/lang-cookie";
import { ABOUT_PATH, CHECKER_PATH, EXAMPLES_PATH, GUIDES_INDEX_PATH } from "@/content/guides/ui";
import { dvHref } from "@/lib/dentvid/host";
import { equivalentPath } from "@/lib/dentvid/lang-switch";
import { isLegalKind, legalPath } from "@/content/legal/nav";
import { LEGAL_KINDS } from "@/content/legal/types";
import { OPERATOR } from "@/content/guides/operator";
import { DvLogo } from "./mark";
import { Check, Clapperboard, LogOut, Menu, Settings, Video, X } from "lucide-react";
import { appTab, isFunnel, isPostPage, DV_SUPPORT_EMAIL, mailtoHref, type AppTab } from "@/lib/dentvid/app-ui";
import { hasDvSessionCookie } from "@/lib/dentvid/session-cookie";
import { trackDv } from "@/lib/dentvid/events-client";

/** Fired when a page sets the interface language, so the header follows at once. */
const LANG_EVENT = "dv-lang";

export function announceLocale(locale: Locale) {
  rememberLocale(locale);
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: locale }));
}

/** The page's language when its address says so (/tr, a guide); null on the app and sign-up screens (per visitor). */
export function pathLocale(pathname: string, guideLocales: Record<string, Locale>): Locale | null {
  // "/tr" on dentvideo.com, "/dentvideo/tr" elsewhere.
  const all = pathname.split("/").filter(Boolean);
  const parts = all[0] === "dentvideo" ? all.slice(1) : all;
  if (parts.length === 0) return "en";
  // A personalised demo page: /d/<token> (English) or /<lang>/d/<token>.
  if (parts[0] === "d" && parts.length === 2) return "en";
  if (parts[1] === "d" && parts.length === 3 && (LOCALES as readonly string[]).includes(parts[0])) return parts[0] as Locale;
  // English guides hub and About: /guides, /about.
  if (parts.length === 1 && (parts[0] === "guides" || parts[0] === "about" || parts[0] === CHECKER_SLUG || parts[0] === EXAMPLES_SLUG || isLegalKind(parts[0]))) return "en";
  // English example videos: /examples/<slug>.
  if (parts.length === 2 && parts[0] === EXAMPLES_SLUG) return "en";
  // Guides (/guides/<slug>) and commercial pages (/videos/<slug>) each have one language.
  if (parts[0] === "guides" || parts[0] === "videos") return guideLocales[parts[1] ?? ""] ?? null;
  if (!(LOCALES as readonly string[]).includes(parts[0])) return null;
  // Everything under a language prefix is in that language, the 404 for a mistyped /tr/… address included.
  return parts[0] as Locale;
}

/** The free ad checker's last path segment, the same in every language. */
const CHECKER_SLUG = CHECKER_PATH.en.split("/").pop();
/** The examples showcase's segment, the same in every language. */
const EXAMPLES_SLUG = EXAMPLES_PATH.en.split("/").pop();

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

/** A DentVideo session cookie in this browser? Read in the browser only (pages stay static); false on first paint. */
function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    try {
      setSignedIn(hasDvSessionCookie(document.cookie));
    } catch {
      // cookies blocked: treat as signed out
    }
  }, []);
  return signedIn;
}

/** "Open app" with a session; else "Sign in" to the sign-in form ("Open app" read like an app download to new visitors). */
export function accountLink(signedIn: boolean, locale: Locale, t: Pick<ChromeWords, "openApp" | "signIn">): Item {
  return signedIn
    ? { href: "/dentvideo/app", label: t.openApp }
    : { href: `/dentvideo/start?mode=signin&lang=${locale}`, label: t.signIn };
}

/** Signed out, the filled button goes to the landing's no-account logo preview (#try), as the hero's does. */
export function startLink(signedIn: boolean, locale: Locale, t: Pick<ChromeWords, "start">): Item | null {
  return signedIn ? null : { href: dvHref(`${LANDING_PATH[locale]}#try`), label: t.start };
}

type Item = { href: string; label: string };
const BUTTON = "dv-btn dv-btn-primary ms-2 whitespace-nowrap py-2.5 sm:px-5";

/** The start button: to the no-account preview, so try_clicked as the hero's (cta_clicked means into the sign-up). */
export function Start({ to, locale, className, onNav }: { to: Item; locale: Locale; className: string; onNav?: (e: React.MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <Link href={to.href} data-cta="header" className={className} onClick={(e) => (trackDv("try_clicked", { locale, props: { where: "header" } }), onNav?.(e))}>
      {to.label}
    </Link>
  );
}

/** `text`: every language's chrome words (lib/dentvid/chrome-text, built by the layout). */
type Props = { guideLocales: Record<string, Locale>; text: ChromeText };

export function DvHeader({ guideLocales, text }: Props) {
  const { locale, ready } = useDvLocale(guideLocales);
  const path = usePathname() ?? "";
  const tab = appTab(path);
  const t = text[locale];
  const signedIn = useSignedIn();
  // Skip link (on focus) to the mark where <main> begins; as the nav, not before the language is known.
  return (
    <>
      {ready && <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-dv-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white">
        {t.skip}
      </a>}
      {tab ? <AppHeader t={t} locale={locale} ready={ready} tab={tab} /> : <SiteHeader t={t} locale={locale} ready={ready} quiet={isFunnel(path) || isPostPage(path)} signedIn={signedIn} />}
      <div id="main" className="scroll-mt-40" />
    </>
  );
}

/** `quiet` (the sign-up wizard): only the logo, so the next step is the only way on. */
export function SiteHeader({ t, locale, ready, quiet, signedIn }: { t: ChromeWords; locale: Locale; ready: boolean; quiet: boolean; signedIn: boolean }) {
  const home = LANDING_PATH[locale];
  // Until the visitor's language is known, keep the space but not the English words.
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
  const [open, setOpen] = useState(false);
  const account = accountLink(signedIn, locale, t);
  const start = startLink(signedIn, locale, t);
  const navLink =
    "hidden whitespace-nowrap rounded-full px-3.5 py-2 font-medium text-dv-body transition-colors hover:bg-dv-sand-200/70 hover:text-dv-ink md:inline-block";
  // In the bar from md; beside the start button "How it works" and guides from lg, the ad checker from xl.
  // All are in the phone menu and the footer.
  const lg = start ? "lg:inline-block" : undefined;
  const links: (Item & { at?: string; account?: true })[] = [
    { href: dvHref(`${home}#how`), label: t.howItWorks, at: lg },
    { href: dvHref(`${home}#pricing`), label: t.pricing },
    ...(hasGuides(locale) ? [{ href: dvHref(GUIDES_INDEX_PATH[locale]), label: t.guides, at: lg }] : []),
    { href: dvHref(EXAMPLES_PATH[locale]), label: t.examples },
    { href: dvHref(CHECKER_PATH[locale]), label: t.checker, at: start ? "xl:inline-block" : "lg:inline-block" },
    ...(start ? [{ href: dvHref(account.href), label: account.label, account: true as const }] : []),
  ];
  return (
    <header
      lang={locale}
      dir={dirOf(locale)}
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        open
          ? "border-dv-line/80 bg-dv-paper"
          : scrolled
            ? "border-dv-line/80 bg-dv-paper/80 shadow-[0_10px_30px_-24px_rgba(20,33,31,0.45)] backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-dv-paper/0"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:h-[4.5rem] sm:gap-4 sm:px-6">
        <Link href={dvHref(home)} className="-m-1 inline-flex min-h-11 shrink-0 items-center rounded-lg p-1" aria-label="DentVideo">
          <DvLogo className="h-6 w-auto min-[380px]:h-7 sm:h-8" />
        </Link>
        {!quiet && (
          <nav className={`flex items-center gap-1 text-[0.9375rem] ${hide}`}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} data-account-link={l.account} className={l.at ? navLink.replace("md:inline-block", l.at) : navLink}>{l.label}</Link>
            ))}
            {start ? (
              <Start to={start} locale={locale} className={`${BUTTON} px-3 text-[0.8125rem] max-[359px]:!hidden sm:text-sm ${open ? "invisible" : ""}`} />
            ) : (
              <Link href={dvHref(account.href)} data-account-link className={`${BUTTON} px-4 text-sm`}>
                {account.label}
              </Link>
            )}
            <MobileMenu locale={locale} links={links} start={start} label={t.menu} languageLabel={t.language} open={open} setOpen={setOpen} />
          </nav>
        )}
      </div>
    </header>
  );
}

/**
 * Below md: the links and languages open as a sheet under the header, the start button at its top.
 * Escape or the button closes it and refocuses the button; Tab stays inside; any link closes it.
 */
function MobileMenu({
  locale,
  links,
  start,
  label,
  languageLabel,
  open,
  setOpen,
}: {
  locale: Locale;
  links: Item[];
  start: Item | null;
  label: string;
  languageLabel: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const path = usePathname();

  // A new page closes it; so does a window that grows to the desktop layout.
  useEffect(() => setOpen(false), [path, setOpen]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => mq.matches && setOpen(false);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const sheet = panel.current;
    sheet?.querySelector<HTMLElement>("a[href]")?.focus();
    // The page under the sheet stays put.
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !sheet) return;
      const items = [button.current, ...sheet.querySelectorAll<HTMLElement>("a[href]")].filter((x): x is HTMLElement => !!x);
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === -1 || i === items.length - 1 ? 0 : i + 1;
      e.preventDefault();
      items[next].focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
    };
  }, [open, setOpen]);

  const close = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // The page must scroll again before the link moves it.
    document.documentElement.style.overflow = "";
    setOpen(false);
    // A section of this same page (#how, #pricing): go there directly; the
    // router would not scroll a page that was locked a moment ago.
    const to = new URL(e.currentTarget.href);
    const target = to.hash && to.pathname === window.location.pathname ? document.getElementById(to.hash.slice(1)) : null;
    if (target && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      window.history.pushState(window.history.state, "", to.hash);
      target.scrollIntoView();
    }
  };
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="-me-1.5 ms-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dv-ink transition-colors hover:bg-dv-sand-200/70 md:hidden"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
      </button>
      <div
        id={id}
        ref={panel}
        hidden={!open}
        className="absolute inset-x-0 top-full h-[calc(100dvh-4rem)] overflow-y-auto sm:h-[calc(100dvh-4.5rem)] overscroll-contain border-t border-dv-line/80 bg-dv-paper md:hidden"
      >
        <div className="px-4 pb-10 pt-3">
          {start && <Start to={start} locale={locale} onNav={close} className="dv-btn dv-btn-primary mb-3 mt-2 flex w-full px-6 py-3.5 text-base" />}
          <ul className="divide-y divide-dv-line/80">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="flex min-h-14 items-center text-lg font-semibold text-dv-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">{languageLabel}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {LOCALES.map((l) => (
              <li key={l}>
                <Link
                  href={dvHref(equivalentPath(path ?? "", l))}
                  hrefLang={l}
                  lang={l}
                  onClick={close}
                  aria-current={l === locale ? "true" : undefined}
                  className={`flex min-h-12 items-center justify-between gap-2 rounded-2xl px-4 text-[0.9375rem] ring-1 transition-colors ${
                    l === locale ? "bg-dv-teal font-semibold text-white ring-dv-teal" : "bg-white font-medium text-dv-body ring-dv-line hover:text-dv-ink"
                  }`}
                >
                  {/* The name has its own direction, the pill the page's: every name starts on the same side. */}
                  <span dir={dirOf(l)}>{LANGUAGE_NAME[l]}</span>
                  {l === locale ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/** The commercial pages per language, as href/label pairs from the layout. */
export type CommercialNav = Partial<Record<Locale, { href: string; label: string }[]>>;

export function DvFooter({ guideLocales, text, commercial }: Props & { commercial?: CommercialNav }) {
  const { locale, ready } = useDvLocale(guideLocales);
  const signedIn = useSignedIn();
  const path = usePathname() ?? "";
  const t = text[locale];
  // On sign-up only the browser knows the language: keep the space, send no words (no English footer under a Turkish form).
  if (isFunnel(path) && !ready) return <footer aria-hidden="true" className="invisible min-h-40 border-t border-dv-line bg-dv-sand/60" />;
  if (appTab(path) || isFunnel(path)) return <AppFooter t={t} locale={locale} ready={ready} />;
  const home = LANDING_PATH[locale];
  // Touch (below lg): 44px rows.
  const tap = "inline-flex min-h-11 min-w-11 items-center lg:min-h-0 lg:min-w-0";
  const link = `${tap} rounded-md text-[#c9d9d5] transition-colors hover:text-white`;
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
          <div className={`grid grid-cols-2 gap-x-8 text-sm sm:gap-x-16 ${ready ? "" : "invisible"}`}>
            <ul className="lg:space-y-3.5">
              <li><Link href={dvHref(`${home}#how`)} className={link}>{t.howItWorks}</Link></li>
              <li><Link href={dvHref(`${home}#pricing`)} className={link}>{t.pricing}</Link></li>
              {hasGuides(locale) && <li><Link href={dvHref(GUIDES_INDEX_PATH[locale])} className={link}>{t.guides}</Link></li>}
              <li><Link href={dvHref(EXAMPLES_PATH[locale])} className={link}>{t.examples}</Link></li>
              <li><Link href={dvHref(CHECKER_PATH[locale])} className={link}>{t.checker}</Link></li>
              {(commercial?.[locale] ?? []).map((p) => (
                <li key={p.href}><Link href={dvHref(p.href)} className={link}>{p.label}</Link></li>
              ))}
              <li><Link href={dvHref(ABOUT_PATH[locale])} className={link}>{t.about}</Link></li>
              <li><Link href={dvHref(HELP_PATH[locale])} className={link}>{t.helpCenter}</Link></li>
              {signedIn && <li><Link href={dvHref("/dentvideo/app")} className={link}>{t.openApp}</Link></li>}
              <li><Link href={dvHref(`/dentvideo/start?mode=signin&lang=${locale}`)} className={link}>{t.signIn}</Link></li>
            </ul>
            <ul className="lg:space-y-3.5">
              {LOCALES.map((l) => (
                <li key={l}>
                  {/* The name has its own direction, the link the page's: a short RTL name starts on the same edge. */}
                  <Link href={dvHref(equivalentPath(path, l))} hrefLang={l} lang={l} className={l === locale ? `${tap} rounded-md font-semibold text-white` : link}>
                    <span dir={dirOf(l)}>{LANGUAGE_NAME[l]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <nav aria-label={t.legal} className={`mt-12 border-t border-white/10 pt-4 lg:mt-14 lg:pt-6 ${ready ? "" : "invisible"}`}>
          <ul className="flex flex-wrap gap-x-5 text-[0.8125rem] lg:gap-y-2 lg:text-xs" data-testid="dv-legal-links">
            {LEGAL_KINDS.map((k) => (
              <li key={k}>
                <Link href={dvHref(legalPath(k, locale))} className={link}>{t.legalNav[k]}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-4 flex flex-col gap-2 text-xs text-[#8fb0aa] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {OPERATOR.brand} · <bdi>{OPERATOR.shortName}</bdi>
          </p>
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

/** Inside the app: the logo, the three screens and sign-out; on a phone the screens are equal tabs under the logo. */
function AppHeader({ t, locale, ready, tab }: { t: ChromeWords; locale: Locale; ready: boolean; tab: AppTab }) {
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
    // Everywhere, by the server (lib/dentvid/sign-out-client); loaded on click, not with every page's header.
    const { signOutDentvideo } = await import("@/lib/dentvid/sign-out-client");
    await signOutDentvideo();
    window.location.assign(dvHref("/dentvideo/start"));
  }

  const tabLink = (key: AppTab) =>
    `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
      key === tab ? "bg-dv-teal text-white" : "text-dv-body hover:bg-dv-sand-200/70 hover:text-dv-ink"
    }`;

  return (
    <header lang={locale} dir={dirOf(locale)} className="sticky top-0 z-40 border-b border-dv-line/80 bg-dv-paper/90 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link href={dvHref("/dentvideo/app")} className="-m-1 inline-flex min-h-11 shrink-0 items-center rounded-lg p-1" aria-label="DentVideo">
          <DvLogo className="h-7 w-auto" />
        </Link>
        <nav aria-label={t.appNav} className={`hidden items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-dv-line md:flex ${hide}`}>
          {TABS.map(({ key, href, Icon }) => (
            <Link key={key} href={dvHref(href)} aria-current={key === tab ? "page" : undefined} className={tabLink(key)}>
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
                href={dvHref(href)}
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
function AppFooter({ t, locale, ready }: { t: ChromeWords; locale: Locale; ready: boolean }) {
  return (
    <footer lang={locale} dir={dirOf(locale)} className={`border-t border-dv-line bg-dv-sand/60 ${ready ? "" : "invisible"}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-dv-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-xl">{t.footer}</p>
        <p>
          <Link href={dvHref(HELP_PATH[locale])} className="font-medium text-dv-teal underline-offset-4 hover:underline" data-testid="dv-app-help-center">
            {t.helpCenter}
          </Link>
          <span aria-hidden="true"> · </span>
          {t.help}{" "}
          <a dir="ltr" href={mailtoHref("DentVideo help")} className="font-medium text-dv-teal underline-offset-4 hover:underline">
            {DV_SUPPORT_EMAIL}
          </a>
        </p>
      </div>
      <nav aria-label={t.legal} className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:pb-8">
        <ul className="flex flex-wrap gap-x-4 text-[0.8125rem] text-dv-muted lg:gap-y-1.5 lg:text-xs" data-testid="dv-legal-links">
          {LEGAL_KINDS.map((k) => (
            <li key={k}>
              <Link href={dvHref(legalPath(k, locale))} className="inline-flex min-h-11 items-center rounded-md underline-offset-4 hover:text-dv-ink hover:underline lg:min-h-0">{t.legalNav[k]}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
