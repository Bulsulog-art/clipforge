"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { CheckCircle2, MailCheck } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { fmtAuth, verifyText } from "@/content/dentvideo-auth";
import { readAttribution } from "@/lib/dentvid/attribution";

export type VerifyCardHandle = { focus: () => void };

type Props = {
  locale: Locale;
  email: string;
  /** Called once the code matched (or the server says the account is already verified). */
  onVerified: (email: string) => void;
  /** Ask the server for a code on mount if none is waiting (accounts created before codes existed). */
  autoSend?: boolean;
};

const DIGITS = 6;

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/dentvideo/verify-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    verified?: boolean;
    email?: string;
    error?: string;
    retryAfter?: number;
    resendInSec?: number;
  };
  return { status: res.status, ...data };
}

/**
 * "Enter the 6-digit code we sent to x@y" — the plan step's gate before
 * checkout (lib/dentvid/verify-email). One numeric field the phone can fill
 * from the message (autocomplete="one-time-code"), a resend button with a
 * 60-second cooldown and a way to correct a mistyped address.
 */
export const VerifyCard = forwardRef<VerifyCardHandle, Props>(function VerifyCard({ locale, email: initialEmail, onVerified, autoSend = true }, ref) {
  const v = verifyText(locale);
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"confirm" | "send" | "change" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  useImperativeHandle(ref, () => ({
    focus: () => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current?.focus({ preventScroll: true });
    },
  }));

  // The resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // A code is sent at sign-up; older accounts (or an expired code) get one here.
  useEffect(() => {
    if (!autoSend) return;
    let cancelled = false;
    post({ action: "send", onlyIfNone: true, locale })
      .then((r) => {
        if (cancelled) return;
        if (r.verified) return onVerified(r.email ?? initialEmail);
        if (typeof r.resendInSec === "number") setCooldown(r.resendInSec);
        else if (typeof r.retryAfter === "number") setCooldown(r.retryAfter);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm(value: string) {
    if (busy) return;
    const digits = value.replace(/\D/g, "");
    if (digits.length !== DIGITS) {
      setError(v.malformed);
      inputRef.current?.focus();
      return;
    }
    setBusy("confirm");
    setError(null);
    setNotice(null);
    try {
      // The tab's first-touch source, so the confirmed step counts for the right campaign on /admin.
      const r = await post({ action: "confirm", code: digits, attribution: readAttribution() });
      if (r.ok && r.verified) {
        onVerified(r.email ?? email);
        return;
      }
      setError(r.error ?? v.failed);
      setCode("");
      inputRef.current?.focus();
    } catch {
      setError(v.failed);
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setBusy("send");
    setError(null);
    setNotice(null);
    try {
      const r = await post({ action: "send", locale });
      if (r.verified) return onVerified(r.email ?? email);
      if (r.ok) {
        setNotice(fmtAuth(v.resent, { email }));
        setCooldown(r.resendInSec ?? 60);
        setCode("");
        inputRef.current?.focus();
      } else {
        if (typeof r.retryAfter === "number") setCooldown(r.retryAfter);
        else setError(r.error ?? v.failed);
      }
    } catch {
      setError(v.failed);
    } finally {
      setBusy(null);
    }
  }

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const addr = newEmail.trim().toLowerCase();
    if (!addr) return;
    setBusy("change");
    setError(null);
    setNotice(null);
    try {
      const r = await post({ action: "change", email: addr, locale });
      if (r.verified) return onVerified(r.email ?? email);
      if (r.ok) {
        setEmail(addr);
        setChanging(false);
        setNewEmail("");
        setNotice(fmtAuth(v.resent, { email: addr }));
        setCooldown(r.resendInSec ?? 60);
        setCode("");
        setTimeout(() => inputRef.current?.focus(), 0);
      } else setError(r.error ?? v.failed);
    } catch {
      setError(v.failed);
    } finally {
      setBusy(null);
    }
  }

  const leadParts = v.lead.split("{email}");
  const errId = `${ids}-err`;
  const hintId = `${ids}-hint`;

  return (
    <section ref={cardRef} aria-labelledby={`${ids}-title`} className="dv-card mx-auto max-w-3xl scroll-mt-24 p-5 ring-2 ring-dv-teal/30 sm:p-7">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-dv-teal-50 text-dv-teal">
          <MailCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${ids}-title`} className="text-lg font-semibold leading-snug text-dv-ink">
            {v.title}
          </h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-dv-body">
            {leadParts[0]}
            {/* An address is left to right inside any sentence; kept on one line unless too long for a phone. */}
            <bdi dir="ltr" className={`font-semibold text-dv-ink ${email.length <= 26 ? "whitespace-nowrap" : "[overflow-wrap:anywhere]"}`}>
              {email}
            </bdi>
            {leadParts[1] ?? ""}
          </p>
        </div>
      </div>

      {!changing ? (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm(code);
          }}
        >
          <label htmlFor={`${ids}-code`} className="block text-sm font-semibold text-dv-ink">
            {v.codeLabel}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:w-64">
            <input
              ref={inputRef}
              id={`${ids}-code`}
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={DIGITS + 1}
              dir="ltr"
              spellCheck={false}
              value={code}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${error ? `${errId} ` : ""}${hintId}`}
              onChange={(e) => {
                // Phone keyboards may give Arabic-Indic or full-width digits; keep plain ones.
                const raw = e.target.value
                  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
                  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
                  .replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10))
                  .replace(/\D/g, "")
                  .slice(0, DIGITS);
                setCode(raw);
                if (error) setError(null);
                if (raw.length === DIGITS && code.length < DIGITS) void confirm(raw);
              }}
              placeholder="······"
              className="dv-field !mt-0 h-14 text-center font-mono text-2xl font-semibold !tracking-[0.4em] placeholder:text-dv-line"
            />
            </div>
            <button type="submit" disabled={busy !== null} className="dv-btn dv-btn-primary h-14 px-7 text-base">
              {busy === "confirm" ? v.checking : v.submit}
            </button>
          </div>
          <p id={hintId} className="mt-2 text-xs text-dv-muted">
            {v.codeHint}
          </p>
        </form>
      ) : (
        <form className="mt-5" onSubmit={change}>
          <label className="block text-sm font-semibold text-dv-ink">
            {v.newEmailLabel}
            <input
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="dv-field"
              autoFocus
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="submit" disabled={busy !== null} className="dv-btn dv-btn-primary px-6 py-3 text-sm">
              {v.saveEmail}
            </button>
            <button
              type="button"
              onClick={() => {
                setChanging(false);
                setError(null);
              }}
              className="dv-btn dv-btn-secondary px-6 py-3 text-sm !text-dv-teal"
            >
              {v.cancel}
            </button>
          </div>
        </form>
      )}

      <div aria-live="polite" className="empty:hidden">
        {error && (
          <p id={errId} role="alert" className="mt-4 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]">
            {error}
          </p>
        )}
        {notice && !error && <p className="mt-4 rounded-xl bg-[#e6f2ef] px-4 py-3 text-sm text-[#0f5c5c]">{notice}</p>}
      </div>

      {!changing && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-dv-line pt-3 text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={busy !== null || cooldown > 0}
            className="min-h-11 rounded-md font-medium text-dv-teal underline-offset-4 hover:underline disabled:cursor-default disabled:text-dv-muted disabled:no-underline"
          >
            {cooldown > 0 ? fmtAuth(v.resendIn, { s: cooldown }) : v.resend}
          </button>
          <button
            type="button"
            onClick={() => {
              setChanging(true);
              setError(null);
              setNotice(null);
            }}
            disabled={busy !== null}
            className="min-h-11 rounded-md font-medium text-dv-teal underline-offset-4 hover:underline"
          >
            {v.changeEmail}
          </button>
        </div>
      )}
    </section>
  );
});

/** The card's place once the code matched. */
export function VerifiedNote({ locale }: { locale: Locale }) {
  return (
    <p role="status" className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl bg-[#e6f2ef] px-4 py-3 text-sm font-medium text-[#0f5c5c]">
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      {verifyText(locale).done}
    </p>
  );
}
