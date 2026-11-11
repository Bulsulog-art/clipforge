"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink } from "lucide-react";

/**
 * The owner's "new demo link" form and the copy / switch-off buttons of the
 * demo list (/admin/demos). Posts to /api/dentvideo/admin/demos.
 */

export type LanguageOption = { code: string; label: string };

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Older browsers / denied permission: select-and-copy fallback.
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={`dv-btn dv-btn-secondary min-h-9 px-3 py-1.5 text-sm ${className}`}
    >
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {done ? "Copied" : label}
    </button>
  );
}

export function DisableButton({ token, disabled }: { token: string; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/dentvideo/admin/demos", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, disabled: !disabled }),
        }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
      className="text-sm font-medium text-dv-teal underline-offset-4 hover:underline disabled:opacity-50"
    >
      {disabled ? "Turn on" : "Turn off"}
    </button>
  );
}

type Created = { token: string; url: string; expiresAt: string; messages: { ask: string; link: string } };

export function DemoForm({ languages, palette, defaultCampaign }: { languages: LanguageOption[]; palette: string[]; defaultCampaign: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [colour, setColour] = useState("");
  const [logoMode, setLogoMode] = useState<"none" | "upload" | "url">("none");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    const fd = new FormData(e.currentTarget);
    if (logoMode !== "upload") fd.delete("logo");
    if (logoMode !== "url") fd.delete("logoUrl");
    const file = fd.get("logo");
    if (file && typeof file !== "string" && file.size > 2 * 1024 * 1024) {
      setBusy(false);
      setError("The logo is larger than 2 MB.");
      return;
    }
    try {
      const res = await fetch("/api/dentvideo/admin/demos", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Could not create the demo (${res.status}).`);
      setCreated(body as Created);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const label = "block text-sm font-semibold text-dv-ink";
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={submit} className="dv-card space-y-4 p-5 sm:p-6" data-testid="demo-form">
        <label className={label}>
          Clinic name *
          <input name="clinicName" required maxLength={80} className="dv-field" autoComplete="off" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            City
            <input name="city" maxLength={60} className="dv-field" autoComplete="off" />
          </label>
          <label className={label}>
            Country (ISO code)
            <input name="country" maxLength={2} placeholder="TR" className="dv-field uppercase" autoComplete="off" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Language
            <select name="language" defaultValue="tr" className="dv-field">
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Campaign tag
            <input name="campaign" defaultValue={defaultCampaign} maxLength={40} pattern="[a-z0-9][a-z0-9._\-]{0,39}" className="dv-field" />
          </label>
        </div>
        <fieldset>
          <legend className={label}>Brand colour (optional — a calm default is picked from the name)</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {palette.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColour(c)}
                aria-label={`Use ${c}`}
                aria-pressed={colour === c}
                className={`h-8 w-8 rounded-full ring-offset-2 ${colour === c ? "ring-2 ring-dv-ink" : "ring-1 ring-black/10"}`}
                style={{ background: c }}
              />
            ))}
            <input name="colour" value={colour} onChange={(e) => setColour(e.target.value)} placeholder="#0f5c5c" maxLength={7} className="dv-field !mt-0 w-32" />
          </div>
        </fieldset>
        <fieldset>
          <legend className={label}>Logo (optional)</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-dv-body">
            {(["none", "upload", "url"] as const).map((m) => (
              <label key={m} className="inline-flex items-center gap-2">
                <input type="radio" name="logoMode" checked={logoMode === m} onChange={() => setLogoMode(m)} />
                {m === "none" ? "No logo" : m === "upload" ? "Upload a file" : "From a URL"}
              </label>
            ))}
          </div>
          {logoMode === "upload" && <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block text-sm" />}
          {logoMode === "url" && <input name="logoUrl" type="url" placeholder="https://clinic.example/logo.png" className="dv-field" />}
          <p className="mt-2 text-xs text-dv-muted">PNG, JPEG or WebP, up to 2 MB. A URL is fetched once and a copy is stored — never hotlinked.</p>
        </fieldset>
        <label className={label}>
          Note (only you see it)
          <textarea name="note" maxLength={500} rows={2} className="dv-field" />
        </label>
        <p className="text-xs leading-relaxed text-dv-muted">
          Use only public business information (the clinic&apos;s own website or profile). The link expires after 60 days; expired demos and their logos are deleted.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="dv-btn dv-btn-primary w-full px-6 py-3 text-base">
          {busy ? "Creating…" : "Create demo link"}
        </button>
      </form>

      <div className="dv-card p-5 sm:p-6" aria-live="polite" data-testid="demo-created">
        {created ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Share link</p>
              <p className="mt-2 break-all font-mono text-sm text-dv-ink">{created.url}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={created.url} label="Copy link" />
                <a href={created.url} target="_blank" rel="noopener" className="dv-btn dv-btn-secondary min-h-9 px-3 py-1.5 text-sm">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open
                </a>
              </div>
            </div>
            <MessageBox title="1 · First message (asks permission — no link yet)" text={created.messages.ask} />
            <MessageBox title="2 · After a yes: the link" text={created.messages.link} />
            <p className="text-xs text-dv-muted">Expires {new Date(created.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.</p>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-dv-body">
            <p className="font-semibold text-dv-ink">How to send it</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5">
              <li>Create the demo; open the link once to check it looks right.</li>
              <li>Send message 1 — it only asks whether you may send the preview.</li>
              <li>Only after a yes, send message 2 with the link.</li>
              <li>A no, or no answer: do not write again.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageBox({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">{title}</p>
      <p dir="auto" className="mt-2 whitespace-pre-line rounded-xl bg-dv-sand/60 p-3 text-sm leading-relaxed text-dv-ink">{text}</p>
      <CopyButton text={text} label="Copy message" className="mt-2" />
    </div>
  );
}
