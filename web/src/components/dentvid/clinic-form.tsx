"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dvBrowser, BUCKET } from "@/lib/dentvid/supabase";
import { LANGUAGES, type ClinicProfile } from "@/lib/dentvid/profile";

const COUNTRIES: [string, string][] = [
  ["US", "United States"], ["GB", "United Kingdom"], ["DE", "Germany"], ["AT", "Austria"], ["CH", "Switzerland"],
  ["ES", "Spain"], ["MX", "Mexico"], ["FR", "France"], ["IT", "Italy"], ["PT", "Portugal"], ["BR", "Brazil"],
  ["TR", "Türkiye"], ["NL", "Netherlands"], ["AE", "United Arab Emirates"], ["CA", "Canada"], ["AU", "Australia"],
];

const SERVICE_HINTS: Record<string, string> = {
  en: "Cleanings, Teeth whitening, Implants, Clear aligners, Root canal treatment, Children's dentistry",
  de: "Professionelle Zahnreinigung, Bleaching, Implantate, Aligner, Wurzelbehandlung, Kinderzahnheilkunde",
  es: "Limpieza dental, Blanqueamiento, Implantes, Ortodoncia invisible, Endodoncia, Odontopediatría",
  fr: "Détartrage, Blanchiment, Implants, Aligneurs, Traitement de canal, Pédodontie",
  it: "Igiene dentale, Sbiancamento, Impianti, Allineatori, Devitalizzazione, Odontoiatria pediatrica",
  pt: "Limpeza, Clareamento, Implantes, Alinhadores, Tratamento de canal, Odontopediatria",
  tr: "Diş taşı temizliği, Diş beyazlatma, İmplant, Şeffaf plak, Kanal tedavisi, Çocuk diş hekimliği",
};

type Props = { initial?: Partial<ClinicProfile>; logoPath?: string | null; submitLabel?: string };

export function ClinicForm({ initial, logoPath, submitLabel = "Save and continue" }: Props) {
  const router = useRouter();
  const [p, setP] = useState({
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "US",
    language: initial?.language ?? "en",
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
        if (!u.user) throw new Error("Please sign in again.");
        const ext = (logo.name.split(".").pop() ?? "png").toLowerCase().slice(0, 4);
        newLogo = `${u.user.id}/logo.${ext}`;
        const { error: upErr } = await db.storage.from(BUCKET).upload(newLogo, logo, { upsert: true, contentType: logo.type });
        if (upErr) throw new Error(`Logo upload failed: ${upErr.message}`);
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
      if (!res.ok) throw new Error(body.error ?? "Could not save.");
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
        Clinic name
        <input required value={p.name} onChange={set("name")} className={field} />
      </label>
      <label className={label}>
        City
        <input value={p.city} onChange={set("city")} className={field} />
      </label>
      <label className={label}>
        Country
        <select value={p.country} onChange={set("country")} className={field}>
          {COUNTRIES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        Language of your videos
        <select value={p.language} onChange={set("language")} className={field}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        How you address patients
        <select value={p.address} onChange={set("address")} className={field}>
          <option value="formal">Formal (Sie, usted, vous, siz)</option>
          <option value="informal">Informal (du, tú, tu, sen)</option>
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Services you offer
        <textarea
          required
          rows={3}
          value={p.services}
          onChange={set("services")}
          placeholder={SERVICE_HINTS[p.language]}
          className={field}
        />
        <span className="mt-1 block text-xs font-normal text-[#6b7a77]">
          Comma-separated. Videos are only ever made about these.
        </span>
      </label>
      <label className={label}>
        Tone
        <select value={p.tone} onChange={set("tone")} className={field}>
          <option value="warm">Warm</option>
          <option value="expert">Expert</option>
          <option value="calm">Calm</option>
          <option value="playful">Playful</option>
        </select>
      </label>
      <label className={label}>
        Instagram / TikTok handle
        <input value={p.handle} onChange={set("handle")} placeholder="@yourclinic" className={field} />
      </label>
      <label className={label}>
        Booking link (optional)
        <input type="url" value={p.bookingUrl} onChange={set("bookingUrl")} placeholder="https://" className={field} />
      </label>
      <label className={label}>
        Brand colour
        <span className="mt-1 flex items-center gap-3">
          <input type="color" value={p.brandColor} onChange={set("brandColor")} className="h-12 w-16 cursor-pointer rounded-lg border border-[#d9d1c3] bg-white" />
          <span className="font-mono text-sm text-[#4a5a57]">{p.brandColor}</span>
        </span>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Logo (PNG with a transparent background works best)
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className={`${field} file:mr-3 file:rounded-full file:border-0 file:bg-[#e6efed] file:px-3 file:py-1`} />
        {logoPath && !logo && <span className="mt-1 block text-xs font-normal text-[#6b7a77]">A logo is already saved.</span>}
      </label>
      {error && <p className="rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f] sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-full bg-[#0f5c5c] px-8 py-3 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a] disabled:opacity-60">
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
