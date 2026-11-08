"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser, BUCKET } from "@/lib/dentvid/supabase";
import { LANGUAGES, type ClinicProfile } from "@/lib/dentvid/profile";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";

const COUNTRIES = ["US", "GB", "DE", "AT", "CH", "ES", "MX", "FR", "IT", "PT", "BR", "TR", "NL", "AE", "CA", "AU"];

/** A new clinic starts in the country and language the visitor came in with. */
const DEFAULT_COUNTRY: Record<Locale, string> = { en: "US", de: "DE", es: "ES", tr: "TR", fr: "FR" };

/** Country names in the interface's language, from the browser's own data. */
function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const SERVICE_HINTS: Record<string, string> = {
  en: "Cleanings, Teeth whitening, Implants, Clear aligners, Root canal treatment, Children's dentistry",
  de: "Professionelle Zahnreinigung, Bleaching, Implantate, Aligner, Wurzelbehandlung, Kinderzahnheilkunde",
  es: "Limpieza dental, Blanqueamiento, Implantes, Ortodoncia invisible, Endodoncia, Odontopediatría",
  fr: "Détartrage, Blanchiment, Implants, Aligneurs, Traitement de canal, Pédodontie",
  it: "Igiene dentale, Sbiancamento, Impianti, Allineatori, Devitalizzazione, Odontoiatria pediatrica",
  pt: "Limpeza, Clareamento, Implantes, Alinhadores, Tratamento de canal, Odontopediatria",
  tr: "Diş taşı temizliği, Diş beyazlatma, İmplant, Şeffaf plak, Kanal tedavisi, Çocuk diş hekimliği",
};

type Props = { locale: Locale; initial?: Partial<ClinicProfile>; logoPath?: string | null; submitLabel?: string };

export function ClinicForm({ locale, initial, logoPath, submitLabel }: Props) {
  const text = appText(locale);
  const t = text.form;
  const router = useRouter();
  const [p, setP] = useState({
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? DEFAULT_COUNTRY[locale],
    language: initial?.language ?? locale,
    services: (initial?.services ?? []).join(", "),
    tone: initial?.tone ?? "warm",
    address: initial?.address ?? "formal",
    handle: initial?.handle ?? "",
    bookingUrl: initial?.bookingUrl ?? "",
    brandColor: initial?.brandColor ? `#${initial.brandColor}` : "#0f5c5c",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setP({ ...p, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let newLogo: string | undefined;
      if (logo) {
        const db = dvBrowser();
        const { data: u } = await db.auth.getUser();
        if (!u.user) throw new Error(text.errors.signIn);
        const ext = (logo.name.split(".").pop() ?? "png").toLowerCase().slice(0, 4);
        newLogo = `${u.user.id}/logo.${ext}`;
        const { error: upErr } = await db.storage.from(BUCKET).upload(newLogo, logo, { upsert: true, contentType: logo.type });
        if (upErr) throw new Error(fmt(t.logoFailed, { message: upErr.message }));
      }
      const profile = {
        name: p.name,
        city: p.city || undefined,
        country: p.country,
        language: p.language,
        services: p.services.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
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
      router.push("/dentvideo/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-xl border border-[#d9d1c3] bg-white px-4 py-3 outline-none focus:border-[#0f5c5c] focus:ring-2 focus:ring-[#0f5c5c]/20";
  const label = "block text-sm font-medium";

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        {t.clinicName}
        <input required value={p.name} onChange={set("name")} className={field} />
      </label>
      <label className={label}>
        {t.city}
        <input value={p.city} onChange={set("city")} className={field} />
      </label>
      <label className={label}>
        {t.country}
        <select value={p.country} onChange={set("country")} className={field}>
          {COUNTRIES.map((code) => (
            <option key={code} value={code} suppressHydrationWarning>{countryName(code, locale)}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        {t.language}
        <select value={p.language} onChange={set("language")} className={field}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        {t.address}
        <select value={p.address} onChange={set("address")} className={field}>
          <option value="formal">{t.formal}</option>
          <option value="informal">{t.informal}</option>
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        {t.services}
        <textarea
          required
          rows={3}
          value={p.services}
          onChange={set("services")}
          placeholder={SERVICE_HINTS[p.language]}
          className={field}
        />
        <span className="mt-1 block text-xs font-normal text-[#6b7a77]">{t.servicesHelp}</span>
      </label>
      <label className={label}>
        {t.tone}
        <select value={p.tone} onChange={set("tone")} className={field}>
          <option value="warm">{t.tones.warm}</option>
          <option value="expert">{t.tones.expert}</option>
          <option value="calm">{t.tones.calm}</option>
          <option value="playful">{t.tones.playful}</option>
        </select>
      </label>
      <label className={label}>
        {t.handle}
        <input value={p.handle} onChange={set("handle")} placeholder="@" className={field} />
      </label>
      <label className={label}>
        {t.booking}
        <input type="url" value={p.bookingUrl} onChange={set("bookingUrl")} placeholder="https://" className={field} />
      </label>
      <label className={label}>
        {t.brandColor}
        <span className="mt-1 flex items-center gap-3">
          <input type="color" value={p.brandColor} onChange={set("brandColor")} className="h-12 w-16 cursor-pointer rounded-lg border border-[#d9d1c3] bg-white" />
          <span className="font-mono text-sm text-[#4a5a57]">{p.brandColor}</span>
        </span>
      </label>
      <label className={`${label} sm:col-span-2`}>
        {t.logo}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className={`${field} file:mr-3 file:rounded-full file:border-0 file:bg-[#e6efed] file:px-3 file:py-1`} />
        {logoPath && !logo && <span className="mt-1 block text-xs font-normal text-[#6b7a77]">{t.logoSaved}</span>}
      </label>
      {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f] sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-full bg-[#0f5c5c] px-8 py-3 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a] disabled:opacity-60">
          {busy ? t.saving : submitLabel ?? t.save}
        </button>
      </div>
    </form>
  );
}
