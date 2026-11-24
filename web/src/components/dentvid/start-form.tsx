"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Eye, EyeOff } from "lucide-react";
import { dvHref } from "@/lib/dentvid/host";
import { dirOf, type Locale } from "@/content/dentvideo-locales";
import { appText } from "@/content/dentvideo-app";
import { authText, verifyText } from "@/content/dentvideo-auth";
import { announceLocale } from "./chrome";
import { DvIcon } from "./mark";
import { Stepper } from "./stepper";
import { TURNSTILE_SITE_KEY, TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";
import { ConsentLine } from "./consent-line";
import { FieldError, ValidatingForm } from "./validating-form";
import { trackDv } from "@/lib/dentvid/events-client";
import { captureFromLocation, readAttribution } from "@/lib/dentvid/attribution";
import { isInternalBrowser } from "@/lib/dentvid/internal-flag";
import { passwordTooLong } from "@/lib/dentvid/password";
import { resetRequestOutcome, signedOutMode, stepAfterSignIn } from "@/lib/dentvid/start-mode";
import { TEASER_KEY } from "@/lib/dentvid/onboarding";
import { SIGNUP_SAVED } from "@/content/dentvideo-signup-saved";
type Extras = typeof import("./signup-extras");
// Needed only when the form is sent; loaded after the page is up (the send reuses that load, or retries a failed one).
let adClickLoad: Promise<typeof import("@/lib/dentvid/ad-click") | null> | null = null;
const adClickRules = () => (adClickLoad ??= import("@/lib/dentvid/ad-click").catch(() => ((adClickLoad = null), null)));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// At most this long for those rules (a stalled chunk); then the sign-up goes without the click.
const AD_CLICK_WAIT_MS = 1500;
// The line under an error with a person to write to (8 languages): its own chunk, loaded only when an error shows.
const HelpLine = dynamic(() => import("./help-line").then((m) => m.HelpLine), { ssr: false });
/** An error the form shows. `help`: the reference for the support line under it ("signup-500"), or null for a slip the person fixes. */
const fail = (message: string, help: string | null) => Object.assign(new Error(message), { help });

/**
 * `legal`: show the consent line linking to the Terms and Privacy Policy (on
 * by default; DENTVIDEO_LEGAL_PAGES=off hides it, read by the server page).
 */
export function StartForm({ locale, remember, legal = true, initialMode = "signup" }: { locale: Locale; remember: boolean; legal?: boolean; initialMode?: "signup" | "signin" | "forgot" }) {
  const t = appText(locale).start;
  const errors = appText(locale).errors;
  const a = authText(locale);
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin" | "forgot">(initialMode);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  // The email as it was when the field was left ("" while typing: no hint mid-word).
  const [checked, setChecked] = useState("");
  // The teaser left a name or logo in this tab. The recap and typo hint load after mount, for sign-up only.
  const [seeded, setSeeded] = useState(false);
  const [extras, setExtras] = useState<Extras | null>(null);
  const [teaser, setTeaser] = useState<ReturnType<Extras["teaserFromSession"]>>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState<string | null>(null);
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
    // A link into the funnel or the app (an email's "choose your plan", a
    // bookmark of /app) is followed by someone who already has an account.
    setMode(signedOutMode(q));
    // From a demo link ("Start with these settings"): the clinic step fills itself from it after sign-up.
    const demo = q.get("demo");
    if (demo) import("@/lib/dentvid/demo-cookie").then((m) => m.rememberDemo(demo), () => {});
    // A link straight to /start?utm_…: keep its source for the tab, as a landing would.
    captureFromLocation();
  }, []);

  // Before the first paint, so nothing moves when the recap arrives.
  useLayoutEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(TEASER_KEY) ?? "0");
      setSeeded(!!s && !!(`${s.name ?? ""}`.trim() || s.logo));
    } catch {}
    void adClickRules();
  }, []);

  // The typo hint never appears between a press and its release: its line would move the pressed button and lose the click.
  const press = useRef<ReturnType<Extras["pressWatch"]> | null>(null);
  useEffect(() => {
    if (!extras) return;
    const w = extras.pressWatch(document);
    press.current = w;
    return () => {
      w.stop();
      press.current = null;
    };
  }, [extras]);
  // Bumped by each change to the field, so a held-back hint never shows an address that is gone.
  const edits = useRef(0);

  useEffect(() => {
    if (mode !== "signup" || extras) return;
    // It checks the seed in full; a bad seed or no chunk: the plain sign-up.
    import("./signup-extras").then(
      (m) => {
        const s = m.teaserFromSession();
        setExtras(m);
        setTeaser(s);
        if (!s) setSeeded(false);
      },
      () => setSeeded(false),
    );
  }, [mode, extras]);

  /** Funnel: the first keystroke in the sign-up form (once per tab). */
  const started = useRef(false);
  const startTyping = () => {
    if (started.current || mode !== "signup") return;
    started.current = true;
    trackDv("signup_started", { locale, once: "signup-start" });
  };

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
    const step = isNew ? "clinic" : stepAfterSignIn(new URLSearchParams(window.location.search));
    router.push(dvHref(step ? `/dentvideo/start?step=${step}` : "/dentvideo/start"));
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
        const res = await fetch("/api/dentvideo/password-reset", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: addr, locale }),
        }).catch(() => null);
        // "The link is on its way" only when it is (lib/dentvid/start-mode).
        const sent = await resetRequestOutcome(res, verifyText(locale).failed);
        if (!sent.ok) throw fail(sent.error, `reset-${res?.status ?? "network"}`);
        setNotice(a.sent);
        return;
      }
      if (mode === "signup") {
        if (passwordTooLong(password)) throw fail(a.passwordTooLong, null);
        // Internal traffic (owner, QA, e2e): the account is marked internal and no ad click is sent (lib/dentvid/internal-flag).
        const internal = isInternalBrowser();
        const rules = internal ? null : Promise.race([adClickRules(), wait(AD_CLICK_WAIT_MS).then(() => null)]);
        // Password managers fill the form instantly; wait out the bot brake
        // instead of refusing a real person.
        const elapsed = Date.now() - openedAt.current;
        if (elapsed < 2700) await wait(2700 - elapsed);
        const adClick = (await rules)?.readAdClick() ?? null;
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
            // A Google ad click we may keep (consented, or no consent needed): see lib/dentvid/ad-click.
            ...(adClick ? { adClick } : {}),
            ...(internal ? { internal: true } : {}),
            ...(captcha ? { turnstile: captcha } : {}),
          }),
        });
        // A Turnstile token is good for one try.
        captchaBox.current?.reset();
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw fail(body.error ?? errors.createFailed, `signup-${res.status}`);
        // A new account comes back already signed in (the server set the
        // session cookie). An address that already had an account: try its
        // password, else say plainly that the account exists.
        if (body.signedIn) return goIn(!body.existing);
        if ((await signIn(addr)) || (await wait(1200).then(() => signIn(addr)))) return goIn(!body.existing);
        setMode("signin");
        throw body.existing ? fail(a.accountExists, null) : fail(a.signInFailedAfterSignup, "signup-signin");
      }
      if (!(await signIn(addr))) throw fail(t.wrongPassword, null);
      goIn(false);
    } catch (err) {
      const e = err as Error & { help?: string | null };
      setError(e.message);
      // Anything unplanned (the network dropped, a page that did not answer) gets the support line too.
      setHelp(e.help === undefined ? `${mode}-network` : e.help);
    } finally {
      setBusy(false);
    }
  }

  const field = "dv-field";
  const saved = mode === "signup" && seeded ? (SIGNUP_SAVED[locale] ?? SIGNUP_SAVED.en) : null;
  const typed = (v: string) => {
    edits.current++;
    setEmail(v);
    setChecked("");
  };
  const left = (v: string) => {
    const n = edits.current;
    const show = () => {
      if (edits.current === n) setChecked(v);
    };
    if (press.current) press.current.after(show);
    else show();
  };

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
        <h1 className="dv-display dv-h-page mt-6 text-center text-dv-ink">{saved ? saved.titleSaved : mode === "signup" ? t.titleSignup : mode === "forgot" ? a.forgotTitle : t.titleSignin}</h1>
        <p className="mt-3 text-pretty text-center leading-relaxed text-dv-body">{saved ? saved.leadSaved : mode === "signup" ? t.leadSignup : mode === "forgot" ? a.forgotLead : t.leadSignin}</p>
        {/* Same min-height as signup-extras TeaserRecap. */}
        {saved && <div data-recap-box className="mt-7 min-h-[6.75rem]">{extras && teaser && <extras.TeaserRecap locale={locale} seed={teaser} />}</div>}

        {/* method/action only matter when this page's JS never ran (chunks gone after a deploy): reload, never a GET with the fields in the URL. */}
        {/* The form checks its fields itself and says what is wrong in the page's language (not the browser's bubble). */}
        <ValidatingForm locale={locale} onSubmit={submit} method="post" action="/api/dentvideo/reload" className="dv-card mt-9 space-y-5 p-6 sm:p-8">
          <div>
          <label className="block">
            <span className="text-sm font-semibold text-dv-ink">{t.email}</span>
            <input
              type="email"
              dir="ltr"
              required
              data-field="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                startTyping();
                typed(e.target.value);
              }}
              onBlur={(e) => left(e.target.value)}
              className={field}
            />
            <FieldError name="email" />
          </label>
          {mode === "signup" && extras && <extras.EmailHint locale={locale} email={checked} onFix={typed} />}
          </div>
          {mode !== "forgot" && (
          <div>
            {/* On a phone a mistyped new password only shows up at the next sign-in: let them look at it. */}
            <div className="relative">
            <label className="block">
              <span className="text-sm font-semibold text-dv-ink">{t.password}</span>
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  required
                  minLength={8}
                  data-field="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${field} !pr-12`}
                />
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              aria-label={showPassword ? a.hidePassword : a.showPassword}
              title={showPassword ? a.hidePassword : a.showPassword}
              className="absolute bottom-[3px] right-1 flex h-11 w-11 items-center justify-center rounded-full text-dv-muted hover:text-dv-teal"
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
            </div>
            {/* Under the field, outside the box the eye button is anchored to. */}
            <FieldError name="password" />
            {mode === "signup" && <span className="mt-2 block text-xs text-dv-muted">{t.passwordHint}</span>}
          </div>
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
          {error && (
            <div>
              <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>
              {help && <HelpLine locale={locale} code={help} message={error} />}
            </div>
          )}
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
        </ValidatingForm>

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
