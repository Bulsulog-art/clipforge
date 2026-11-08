"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { dvBrowser, BUCKET } from "@/lib/dentvid/supabase";
import { LANGUAGES, type ClinicProfile } from "@/lib/dentvid/profile";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt, type AppText } from "@/content/dentvideo-app";
import { accentFor, analyseLogoFile, type LogoColors } from "@/lib/dentvid/logo-colors";
import { LogoPreview } from "./logo-preview";
import type { PreviewProfile } from "./live-preview";
import { SERVICE_HINTS, exampleServices, splitServices } from "@/lib/dentvid/service-hints";

const COUNTRIES = ["US", "GB", "DE", "AT", "CH", "ES", "MX", "FR", "IT", "PT", "BR", "TR", "NL", "AE", "CA", "AU"];

/** A new clinic starts in the country and language the visitor came in with. */
const DEFAULT_COUNTRY: Record<Locale, string> = { en: "US", de: "DE", es: "ES", tr: "TR", fr: "FR" };

/** Brand colours to try when the logo gives none (or there is no logo yet). */
const PRESET_COLOURS = ["#0f5c5c", "#1f4e79", "#2e7d6b", "#b6774f", "#8a3b4a", "#24303a"];

/** Country names in the interface's language, from the browser's own data. */
function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export type DraftFields = {
  name: string;
  city: string;
  country: string;
  language: ClinicProfile["language"];
  services: string;
  tone: ClinicProfile["tone"];
  address: ClinicProfile["address"];
  handle: string;
  bookingUrl: string;
  brandColor: string;
};

/**
 * One clinic profile being edited: the fields, the logo (shown at once from
 * an object URL, uploaded only on save) and the colours read from it. Shared
 * by the settings form and every step of the onboarding wizard, so the live
 * preview always shows exactly what will be saved.
 */
export function useClinicDraft({
  locale,
  initial,
  logoUrl: savedLogoUrl,
}: {
  locale: Locale;
  initial?: Partial<ClinicProfile>;
  /** A signed URL of the clinic's saved logo, to preview it before any change. */
  logoUrl?: string | null;
}) {
  const text = appText(locale);
  const [p, setP] = useState<DraftFields>({
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? DEFAULT_COUNTRY[locale],
    language: initial?.language ?? locale,
    services: (initial?.services ?? []).join(", "),
    tone: initial?.tone ?? "warm",
    address: initial?.address ?? "formal",
    handle: initial?.handle ?? "",
    bookingUrl: initial?.bookingUrl ?? "",
    brandColor: initial?.brandColor ? `#${initial.brandColor.replace(/^#/, "").toLowerCase()}` : "#0f5c5c",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(savedLogoUrl ?? null);
  const [colors, setColors] = useState<LogoColors | null>(null);
  const [dirty, setDirty] = useState(false);
  const latest = useRef<File | null>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  // A saved logo: read its colours too, so the swatches are there on return.
  useEffect(() => {
    if (!savedLogoUrl) return;
    let live = true;
    fetch(savedLogoUrl)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? analyseLogoFile(b) : undefined))
      .then((found) => {
        if (live && found && !latest.current) setColors(found);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [savedLogoUrl]);

  const update = useCallback(<K extends keyof DraftFields>(k: K, v: DraftFields[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  }, []);
  const set = (k: keyof DraftFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update(k, e.target.value as never);

  /** A new logo: show it now, read its colours and suggest the brand colour from it. The clinic can still pick any. */
  const chooseLogo = useCallback(async (file: File | null) => {
    latest.current = file;
    setLogo(file);
    setColors(null);
    setDirty(true);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = file ? URL.createObjectURL(file) : null;
    setLogoUrl(objectUrl.current ?? savedLogoUrl ?? null);
    if (!file) return;
    const found = await analyseLogoFile(file);
    // A second file chosen while the first was being read wins.
    if (!found || latest.current !== file) return;
    setColors(found);
    if (found.suggested) setP((prev) => ({ ...prev, brandColor: found.suggested! }));
  }, [savedLogoUrl]);

  /** Upload a new logo (if any) and save the profile. Throws with a message for the clinic. */
  async function save(): Promise<void> {
    let newLogo: string | undefined;
    if (logo) {
      const db = dvBrowser();
      const { data: u } = await db.auth.getUser();
      if (!u.user) throw new Error(text.errors.signIn);
      const ext = (logo.name.split(".").pop() ?? "png").toLowerCase().slice(0, 4);
      newLogo = `${u.user.id}/logo.${ext}`;
      const { error: upErr } = await db.storage.from(BUCKET).upload(newLogo, logo, { upsert: true, contentType: logo.type });
      if (upErr) throw new Error(fmt(text.form.logoFailed, { message: upErr.message }));
    }
    const profile = {
      name: p.name,
      city: p.city || undefined,
      country: p.country,
      language: p.language,
      services: splitServices(p.services),
      tone: p.tone,
      address: p.address,
      handle: p.handle || undefined,
      bookingUrl: p.bookingUrl || undefined,
      brandColor: p.brandColor,
    };
    const res = await fetch("/api/dentvideo/clinic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile, ...(newLogo ? { logoPath: newLogo } : {}) }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? text.errors.saveFailed);
    // Saved: the object URL stays on screen; the file is no longer pending.
    latest.current = null;
    setLogo(null);
    setDirty(false);
  }

  const preview: PreviewProfile = {
    name: p.name.trim(),
    language: p.language,
    services: splitServices(p.services).length ? splitServices(p.services) : exampleServices(p.language),
    brandColor: p.brandColor,
    logoUrl: logoUrl ?? undefined,
    handle: p.handle.replace(/^@/, "") || undefined,
    tone: p.tone,
  };

  return { p, set, update, logo, logoUrl, colors, chooseLogo, save, dirty, preview, savedLogo: !!savedLogoUrl };
}

export type ClinicDraft = ReturnType<typeof useClinicDraft>;

const label = "block text-sm font-semibold text-dv-ink";

/** Name, place, language, address, services, tone, handle, booking link. */
export function ClinicDetailsFields({ draft, locale }: { draft: ClinicDraft; locale: Locale }) {
  const t = appText(locale).form;
  const { p, set } = draft;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        {t.clinicName}
        <input required value={p.name} onChange={set("name")} autoComplete="organization" className="dv-field" />
      </label>
      <label className={label}>
        {t.city}
        <input value={p.city} onChange={set("city")} autoComplete="address-level2" className="dv-field" />
      </label>
      <label className={label}>
        {t.country}
        <select value={p.country} onChange={set("country")} className="dv-field">
          {COUNTRIES.map((code) => (
            <option key={code} value={code} suppressHydrationWarning>{countryName(code, locale)}</option>
          ))}
        </select>
      </label>
      <LanguageField draft={draft} t={t} />
      <label className={label}>
        {t.address}
        <select value={p.address} onChange={set("address")} className="dv-field">
          <option value="formal">{t.formal}</option>
          <option value="informal">{t.informal}</option>
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        {t.services}
        <textarea required rows={3} value={p.services} onChange={set("services")} placeholder={SERVICE_HINTS[p.language]} className="dv-field" />
        <span className="mt-1.5 block text-xs font-normal text-dv-muted">{t.servicesHelp}</span>
      </label>
      <label className={label}>
        {t.tone}
        <select value={p.tone} onChange={set("tone")} className="dv-field">
          <option value="warm">{t.tones.warm}</option>
          <option value="expert">{t.tones.expert}</option>
          <option value="calm">{t.tones.calm}</option>
          <option value="playful">{t.tones.playful}</option>
        </select>
      </label>
      <HandleField draft={draft} t={t} />
      <label className={`${label} sm:col-span-2`}>
        {t.booking}
        <input type="url" value={p.bookingUrl} onChange={set("bookingUrl")} placeholder="https://" className="dv-field" />
      </label>
    </div>
  );
}

export function LanguageField({ draft, t }: { draft: ClinicDraft; t: AppText["form"] }) {
  return (
    <label className={label}>
      {t.language}
      <select value={draft.p.language} onChange={draft.set("language")} className="dv-field">
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}

export function HandleField({ draft, t }: { draft: ClinicDraft; t: AppText["form"] }) {
  return (
    <label className={label}>
      {t.handle}
      <span className="relative mt-0 block">
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 mt-[3px] -translate-y-1/2 text-dv-muted">@</span>
        <input
          value={draft.p.handle.replace(/^@/, "")}
          onChange={(e) => draft.update("handle", e.target.value.replace(/^@/, "").replace(/\s/g, ""))}
          autoCapitalize="none"
          spellCheck={false}
          className="dv-field !pl-8"
        />
      </span>
    </label>
  );
}

/** Logo upload, brand colour, the logo's own colours as one-tap swatches. */
export function BrandFields({ draft, locale, showLogoPreview = false }: { draft: ClinicDraft; locale: Locale; showLogoPreview?: boolean }) {
  const t = appText(locale).form;
  const { p, colors, logoUrl, logo } = draft;
  const swatches = colors && colors.swatches.length > 0 ? colors.swatches : PRESET_COLOURS;
  const fromLogo = !!colors && colors.swatches.length > 0;
  return (
    <div className="grid gap-5">
      <div className={label}>
        <label htmlFor="dv-logo">{t.logo}</label>
        <span className="mt-2 flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-dv-line">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- an object URL or a short-lived signed URL
              <img src={logoUrl} alt="" className="max-h-12 max-w-12 object-contain" />
            ) : (
              <span aria-hidden="true" className="h-6 w-6 rounded-full" style={{ background: p.brandColor }} />
            )}
          </span>
          {/* A styled picker: the native control would speak the browser's language, not the clinic's. */}
          <label htmlFor="dv-logo" className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[0.875rem] border border-dashed border-dv-edge bg-white px-4 py-3 transition focus-within:border-dv-teal focus-within:shadow-[0_0_0_4px_rgba(15,92,92,0.14)] hover:border-dv-teal">
            <ImagePlus className="h-5 w-5 shrink-0 text-dv-teal" aria-hidden="true" />
            <span className="min-w-0 truncate text-sm font-normal text-dv-body">{logo ? logo.name : "PNG · JPG · WEBP"}</span>
            <input
              id="dv-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void draft.chooseLogo(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </span>
        {draft.savedLogo && !logo && <span className="mt-1.5 block text-xs font-normal text-dv-muted">{t.logoSaved}</span>}
      </div>

      <div className={label}>
        <label htmlFor="dv-brand-color">{t.brandColor}</label>
        <span className="mt-2 flex flex-wrap items-center gap-3">
          <span className="relative inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 shadow-sm">
            <input
              id="dv-brand-color"
              type="color"
              value={p.brandColor}
              onChange={draft.set("brandColor")}
              className="absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] cursor-pointer border-0 p-0"
            />
          </span>
          <span className="font-mono text-sm font-normal text-dv-body">{p.brandColor}</span>
          <span className="flex flex-wrap items-center gap-2" role="group" aria-label={fromLogo ? t.logoSwatches : t.brandColor}>
            {swatches.map((c) => {
              const on = p.brandColor.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => draft.update("brandColor", c.toLowerCase())}
                  title={c}
                  aria-label={c}
                  aria-pressed={on}
                  className={`h-8 w-8 rounded-full border border-black/10 shadow-sm transition hover:scale-110 ${on ? "ring-2 ring-dv-teal ring-offset-2 ring-offset-white" : ""}`}
                  style={{ background: c }}
                />
              );
            })}
          </span>
        </span>
        {colors && <span className="mt-1.5 block text-xs font-normal text-dv-muted">{colors.suggested ? t.logoSuggested : t.logoNoColour}</span>}
      </div>

      {showLogoPreview && logoUrl && colors && (
        <LogoPreview
          src={logoUrl}
          brandColor={p.brandColor}
          colors={colors}
          accent={accentFor(p.brandColor, colors)}
          label={t.logoPreview}
          name={p.name || "—"}
          handle={p.handle || undefined}
        />
      )}
    </div>
  );
}

type Props = { locale: Locale; initial?: Partial<ClinicProfile>; logoPath?: string | null; logoUrl?: string | null; submitLabel?: string };

/** Clinic settings: every field on one page, saved together. */
export function ClinicForm({ locale, initial, logoUrl, submitLabel }: Props) {
  const text = appText(locale);
  const t = text.form;
  const router = useRouter();
  const draft = useClinicDraft({ locale, initial, logoUrl });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await draft.save();
      router.push("/dentvideo/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-8">
      <ClinicDetailsFields draft={draft} locale={locale} />
      <BrandFields draft={draft} locale={locale} showLogoPreview />
      {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]" role="alert">{error}</p>}
      <div>
        <button type="submit" disabled={busy} className="dv-btn dv-btn-primary px-8 py-3">
          {busy ? t.saving : submitLabel ?? t.save}
        </button>
      </div>
    </form>
  );
}
