"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser } from "@/lib/dentvid/supabase";
import type { Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { announceLocale } from "./chrome";
import { DvIcon } from "./mark";
import { Stepper } from "./onboarding";

export function StartForm({ locale, remember }: { locale: Locale; remember: boolean }) {
  const t = appText(locale).start;
  const errors = appText(locale).errors;
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bot brakes (lib/dentvid/bot-check): a honeypot field people never see,
  // and how long the form was open before it was sent.
  const [website, setWebsite] = useState("");
  const openedAt = useRef<number>(Date.now());

  // Arrived from a localized landing (?lang=tr): keep that language for the
  // rest of the visit, including the API's messages.
  useEffect(() => {
    if (remember) announceLocale(locale);
  }, [remember, locale]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/dentvideo/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, website, elapsedMs: Math.max(0, Math.round(Date.now() - openedAt.current)) }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? errors.createFailed);
      }
      const { error: signInError } = await dvBrowser().auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(t.wrongPassword);
      // Into the funnel: a new account describes its clinic next; a returning
      // one lands where it left off (or in the app, once it pays).
      router.push(mode === "signup" ? "/dentvideo/start?step=clinic" : "/dentvideo/start");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = "dv-field";

  return (
    <main lang={locale} className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-80 w-[44rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#cfe6e0] opacity-70 blur-3xl" />
      {mode === "signup" && (
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
          <Stepper locale={locale} current="account" />
        </div>
      )}
      <div className={`mx-auto flex max-w-md flex-col px-4 pb-24 sm:px-6 ${mode === "signup" ? "pt-10" : "pt-10 sm:pt-16"}`}>
        <DvIcon className="mx-auto h-14 w-14 drop-shadow-[0_12px_20px_rgba(15,92,92,0.35)]" />
        <h1 className="dv-display mt-6 text-center text-[2.5rem] leading-[1.05] sm:text-5xl">{mode === "signup" ? t.titleSignup : t.titleSignin}</h1>
        <p className="mt-3 text-center leading-relaxed text-dv-body">{mode === "signup" ? t.leadSignup : t.leadSignin}</p>

        <form onSubmit={submit} className="dv-card mt-9 space-y-5 p-6 sm:p-8">
          <label className="block">
            <span className="text-sm font-semibold text-dv-ink">{t.email}</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-dv-ink">{t.password}</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
            {mode === "signup" && <span className="mt-2 block text-xs text-dv-muted">{t.passwordHint}</span>}
          </label>
          {mode === "signup" && (
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>
          )}
          {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="dv-btn dv-btn-primary w-full px-6 py-3.5 text-base">
            {busy ? t.busy : mode === "signup" ? t.submitSignup : t.submitSignin}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
          className="mx-auto mt-6 rounded-md text-sm font-medium text-dv-teal underline-offset-4 hover:underline"
        >
          {mode === "signup" ? t.toSignin : t.toSignup}
        </button>
      </div>
    </main>
  );
}
