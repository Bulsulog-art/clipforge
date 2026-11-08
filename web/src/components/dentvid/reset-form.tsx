"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser } from "@/lib/dentvid/supabase";
import { authText } from "@/content/dentvideo-auth";
import { DvIcon } from "./mark";

type Phase = "checking" | "ready" | "invalid" | "saving" | "saved";

/** Opened from the reset email: exchange the token for a session, then set a new password. */
export function ResetForm({ tokenHash, locale }: { tokenHash: string | null; locale: string }) {
  const t = authText(locale);
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenHash) return setPhase("invalid");
      const { error: e } = await dvBrowser().auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      if (!cancelled) setPhase(e ? "invalid" : "ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenHash]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t.tooShort);
    setError(null);
    setPhase("saving");
    const { error: e2 } = await dvBrowser().auth.updateUser({ password });
    if (e2) {
      setError(t.linkInvalid);
      setPhase("ready");
      return;
    }
    setPhase("saved");
    router.push("/dentvideo/start");
    router.refresh();
  }

  return (
    <main lang={locale} className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
        <DvIcon className="mx-auto h-14 w-14 drop-shadow-[0_12px_20px_rgba(15,92,92,0.35)]" />
        <h1 className="dv-display mt-6 text-center text-[2.5rem] leading-[1.05] sm:text-5xl">{t.resetTitle}</h1>
        {phase === "invalid" ? (
          <div className="dv-card mt-9 space-y-4 p-6 sm:p-8">
            <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{t.linkInvalid}</p>
            <a href={`/dentvideo/start?mode=forgot&lang=${encodeURIComponent(locale)}`} className="dv-btn dv-btn-primary w-full px-6 py-3.5 text-base">
              {t.forgot}
            </a>
          </div>
        ) : (
          <>
            <p className="mt-3 text-center leading-relaxed text-dv-body">{t.resetLead}</p>
            <form onSubmit={submit} className="dv-card mt-9 space-y-5 p-6 sm:p-8">
              <label className="block">
                <span className="text-sm font-semibold text-dv-ink">{t.newPassword}</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="dv-field"
                  disabled={phase !== "ready"}
                />
              </label>
              {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
              {phase === "saved" && <p className="rounded-xl bg-[#e6f2ef] px-4 py-3 text-sm text-[#0f5c5c]" role="status">{t.saved}</p>}
              <button type="submit" disabled={phase !== "ready"} className="dv-btn dv-btn-primary w-full px-6 py-3.5 text-base">
                {t.savePassword}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
