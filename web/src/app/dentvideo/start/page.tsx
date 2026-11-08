"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser } from "@/lib/dentvid/supabase";

export default function StartPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (!res.ok && res.status !== 409) throw new Error(body.error ?? "Could not create the account.");
        if (res.status === 409) throw new Error(body.error);
      }
      const { error: signInError } = await dvBrowser().auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(mode === "signin" ? "Wrong email or password." : signInError.message);
      router.push("/dentvideo/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {mode === "signup" ? "Start your free first week" : "Welcome back"}
      </h1>
      <p className="mt-2 text-[#4a5a57]">
        {mode === "signup"
          ? "Five videos for your clinic, reviewed for accuracy and advertising rules. No card needed."
          : "Sign in to review this week's videos."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Work email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d9d1c3] bg-white px-4 py-3 outline-none focus:border-[#0f5c5c] focus:ring-2 focus:ring-[#0f5c5c]/20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d9d1c3] bg-white px-4 py-3 outline-none focus:border-[#0f5c5c] focus:ring-2 focus:ring-[#0f5c5c]/20"
          />
          {mode === "signup" && <span className="mt-1 block text-xs text-[#6b7a77]">At least 8 characters.</span>}
        </label>
        {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#0f5c5c] px-6 py-3 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a] disabled:opacity-60"
        >
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
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
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </main>
  );
}
