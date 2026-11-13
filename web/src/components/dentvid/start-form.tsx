"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dvHref } from "@/lib/dentvid/host";
import { dirOf, type Locale } from "@/content/dentvideo-locales";
import { appText } from "@/content/dentvideo-app";
import { authText } from "@/content/dentvideo-auth";
import { announceLocale } from "./chrome";
import { DvIcon } from "./mark";
import { Stepper } from "./stepper";
import { TURNSTILE_SITE_KEY, TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";
import { ConsentLine } from "./consent-line";
import { trackDv } from "@/lib/dentvid/events-client";
import { captureFromLocation, readAttribution } from "@/lib/dentvid/attribution";
import { rememberDemo } from "@/lib/dentvid/demo-cookie";

/**
 * `legal`: show the consent line linking to the Terms and Privacy Policy (on
 * by default; DENTVIDEO_LEGAL_PAGES=off hides it, read by the server page).
 */
export function StartForm({ locale, remember, legal = true }: { locale: Locale; remember: boolean; legal?: boolean }) {
  const t = appText(locale).start;
  const errors = appText(locale).errors;
  const a = authText(locale);
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin" | "forgot">("signup");
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bot brakes (lib/dentvid/bot-check): a honeypot field people never see,
  // and how long the form was open before it was sent.
  const [website, setWebsite] = useState("");
  const openedAt = useRef<number>(Date.now());
  // Cloudflare Turnstile, when configured (NEXT_PUBLIC_TURNSTILE_SITE_KEY).
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaBox = useRef<TurnstileHandle>(null);

  // Arrived from a localized landing (?lang=tr): keep that language for the
  // rest of the visit, including the API's messages.
  useEffect(() => {
    if (remember) announceLocale(locale);
  }, [remember, locale]);

  // /start?mode=signin or ?mode=forgot (e.g. from an expired reset link).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const m = q.get("mode");
    if (m === "signin" || m === "forgot") setMode(m);
    // From a demo link ("Start with these settings"): the clinic step fills itself from it after sign-up.
    const demo = q.get("demo");
    if (demo) rememberDemo(demo);
    // A link straight to /start?utm_…: keep its source for the tab, as a landing would.
    captureFromLocation();
  }, []);

  /** Funnel: the first keystroke in the sign-up form (once per tab). */
  const started = useRef(false);
  const startTyping = () => {
    if (started.current || mode !== "signup") return;
    started.current = true;
    trackDv("signup_started", { locale, once: "signup-start" });
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function signIn(addr: string): Promise<boolean> {
    // The Supabase client is loaded when it is needed, not with the page.
    const { dvBrowser } = await import("@/lib/dentvid/supabase");
    const { error: e } = await dvBrowser().auth.signInWithPassword({ email: addr, password });
    if (e) return false;
    // An account another app made with this address joins DentVideo now that
    // its password is proven (api/dentvideo/join; a no-op for DentVideo accounts).
    await fetch("/api/dentvideo/join", { method: "POST" }).catch(() => null);
    return true;
  }

  function goIn(isNew: boolean) {
    // Into the funnel: a new account describes its clinic next; a returning
    // one lands where it left off (or in the app, once it pays).
    router.push(dvHref(isNew ? "/dentvideo/start?step=clinic" : "/dentvideo/start"));
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    // Phones add spaces and capitals; the account is stored trimmed and lower-case.
    const addr = email.trim().toLowerCase();
    try {
      if (mode === "forgot") {
        await fetch("/api/dentvideo/password-reset", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: addr, locale }),
        }).catch(() => null);
        setNotice(a.sent);
        return;
      }
      if (mode === "signup") {
        // Password managers fill the form instantly; wait out the bot brake
        // instead of refusing a real person.
        const elapsed = Date.now() - openedAt.current;
        if (elapsed < 2700) await wait(2700 - elapsed);
        const res = await fetch("/api/dentvideo/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: addr,
            password,
            website,
            elapsedMs: Math.max(0, Math.round(Date.now() - openedAt.current)),
            locale,
            attribution: readAttribution(),
            ...(captcha ? { turnstile: captcha } : {}),
          }),
        });
        // A Turnstile token is good for one try.
        captchaBox.current?.reset();
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? errors.createFailed);
        // A new account comes back already signed in (the server set the
        // session cookie). An address that already had an account: try its
        // password, else say plainly that the account exists.
        if (body.signedIn) return goIn(!body.existing);
        if ((await signIn(addr)) || (await wait(1200).then(() => signIn(addr)))) return goIn(!body.existing);
        setMode("signin");
        throw new Error(body.existing ? a.accountExists : a.signInFailedAfterSignup);
      }
      if (!(await signIn(addr))) throw new Error(t.wrongPassword);
      goIn(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = "dv-field";

  return (
    <main lang={locale} dir={dirOf(locale)} className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-80 w-[44rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#cfe6e0] opacity-70 blur-3xl" />
      {mode === "signup" && (
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
          <Stepper locale={locale} current="account" />
        </div>
      )}
      <div className={`mx-auto flex max-w-md flex-col px-4 pb-24 sm:px-6 ${mode === "signup" ? "pt-10" : "pt-10 sm:pt-16"}`}>
        <DvIcon className="mx-auto h-14 w-14 drop-shadow-[0_12px_20px_rgba(15,92,92,0.35)]" />
        <h1 className="dv-display mt-6 text-center text-[2.5rem] leading-[1.05] sm:text-5xl">{mode === "signup" ? t.titleSignup : mode === "forgot" ? a.forgotTitle : t.titleSignin}</h1>
        <p className="mt-3 text-center leading-relaxed text-dv-body">{mode === "signup" ? t.leadSignup : mode === "forgot" ? a.forgotLead : t.leadSignin}</p>

        <form onSubmit={submit} className="dv-card mt-9 space-y-5 p-6 sm:p-8">
          <label className="block">
            <span className="text-sm font-semibold text-dv-ink">{t.email}</span>
            <input
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                startTyping();
                setEmail(e.target.value);
              }}
              className={field}
            />
          </label>
          {mode !== "forgot" && (
          <label className="block">
            <span className="text-sm font-semibold text-dv-ink">{t.password}</span>
            <input
              type="password"
              dir="ltr"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
            {mode === "signup" && <span className="mt-2 block text-xs text-dv-muted">{t.passwordHint}</span>}
          </label>
          )}
          {mode === "signup" && (
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
              <label>
                Website
                <input type="text" name="dv_hp_7f3" tabIndex={-1} autoComplete="off" data-1p-ignore data-lpignore="true" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>
          )}
          {mode === "signup" && TURNSTILE_SITE_KEY && <TurnstileWidget ref={captchaBox} locale={locale} onToken={setCaptcha} />}
          {mode === "signup" && legal && <ConsentLine locale={locale} />}
          {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
          {notice && <p className="rounded-xl bg-[#e6f2ef] px-4 py-3 text-sm text-[#0f5c5c]" role="status">{notice}</p>}
          <button type="submit" disabled={busy || (mode === "signup" && !!TURNSTILE_SITE_KEY && !captcha)} className="dv-btn dv-btn-primary w-full px-6 py-3.5 text-base">
            {busy ? t.busy : mode === "signup" ? t.submitSignup : mode === "forgot" ? a.sendLink : t.submitSignin}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setNotice(null);
              }}
              className="flex min-h-11 w-full items-center justify-center rounded-md text-center text-sm font-medium text-dv-teal underline-offset-4 hover:underline"
            >
              {a.forgot}
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : mode === "forgot" ? "signin" : "signup");
            setError(null);
            setNotice(null);
          }}
          className="mx-auto mt-4 inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium text-dv-teal underline-offset-4 hover:underline"
        >
          {mode === "signup" ? t.toSignin : mode === "forgot" ? a.backToSignIn : t.toSignup}
        </button>
      </div>
    </main>
  );
}
