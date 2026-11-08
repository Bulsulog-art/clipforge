"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser } from "@/lib/dentvid/supabase";
import type { Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { announceLocale } from "./chrome";

export function StartForm({ locale, remember }: { locale: Locale; remember: boolean }) {
  const t = appText(locale).start;
  const errors = appText(locale).errors;
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          body: JSON.stringify({ email, password }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? errors.createFailed);
      }
      const { error: signInError } = await dvBrowser().auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(t.wrongPassword);
      router.push("/dentvideo/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-xl border border-[#d9d1c3] bg-white px-4 py-3 outline-none focus:border-[#0f5c5c] focus:ring-2 focus:ring-[#0f5c5c]/20";

  return (
    <main lang={locale} className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{mode === "signup" ? t.titleSignup : t.titleSignin}</h1>
      <p className="mt-2 text-[#4a5a57]">{mode === "signup" ? t.leadSignup : t.leadSignin}</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">{t.email}</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t.password}</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          {mode === "signup" && <span className="mt-1 block text-xs text-[#6b7a77]">{t.passwordHint}</span>}
        </label>
        {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#0f5c5c] px-6 py-3 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a] disabled:opacity-60"
        >
          {busy ? t.busy : mode === "signup" ? t.submitSignup : t.submitSignin}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signup" ? "signin" : "signup");
          setError(null);
        }}
        className="mt-6 text-sm text-[#0f5c5c] underline-offset-4 hover:underline"
      >
        {mode === "signup" ? t.toSignin : t.toSignup}
      </button>
    </main>
  );
}
