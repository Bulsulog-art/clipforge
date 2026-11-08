"use client";

import { useEffect, useState } from "react";
import { LivePreview, type PreviewProfile } from "@/components/dentvid/live-preview";

const LANGUAGES: PreviewProfile["language"][] = ["en", "de", "es", "fr", "tr", "it", "pt"];

const SERVICES: Record<string, string> = {
  en: "Cleanings, Teeth whitening, Dental implants",
  de: "Professionelle Zahnreinigung, Aligner-Behandlung, Kinderzahnheilkunde",
  es: "Limpieza dental, Blanqueamiento dental, Tratamiento de encías",
  fr: "Détartrage, Implants dentaires, Blanchiment dentaire",
  tr: "Diş beyazlatma, İmplant tedavisi, Şeffaf plak tedavisi",
  it: "Igiene dentale, Sbiancamento",
  pt: "Limpeza, Branqueamento",
};

/**
 * Every input the funnel will feed LivePreview, live, so the preview can be
 * seen repainting as a dentist would see it.
 */
export function PreviewDemo() {
  const [name, setName] = useState("Smile Studio");
  const [language, setLanguage] = useState<PreviewProfile["language"]>("en");
  const [services, setServices] = useState(SERVICES.en);
  const [brandColor, setBrandColor] = useState("#0f5c5c");
  const [useBrand, setUseBrand] = useState(true);
  const [handle, setHandle] = useState("smilestudio");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();

  useEffect(() => () => void (logoUrl?.startsWith("blob:") && URL.revokeObjectURL(logoUrl)), [logoUrl]);

  const profile: PreviewProfile = {
    name,
    language,
    services: services.split(",").map((s) => s.trim()).filter(Boolean),
    brandColor: useBrand ? brandColor : undefined,
    logoUrl,
    handle: handle || undefined,
  };

  const field = "mt-1 w-full rounded-lg border border-[#d9d1c3] bg-white px-3 py-2 text-sm";
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_360px] md:px-8">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Preview inputs">
        <h1 className="dv-display text-3xl">Live preview — test bench</h1>
        <label className="block text-sm font-medium">
          Clinic name
          <input data-testid="name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Language
          <select
            data-testid="language"
            className={field}
            value={language}
            onChange={(e) => {
              const l = e.target.value as PreviewProfile["language"];
              setLanguage(l);
              setServices(SERVICES[l]);
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Services (comma-separated)
          <input data-testid="services" className={field} value={services} onChange={(e) => setServices(e.target.value)} />
        </label>
        <div className="flex items-end gap-3">
          <label className="block text-sm font-medium">
            Brand colour
            <input data-testid="color" type="color" className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-[#d9d1c3]" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
          </label>
          <input data-testid="color-hex" aria-label="Brand colour hex" className={`${field} w-32 font-mono`} value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} /> use
          </label>
        </div>
        <label className="block text-sm font-medium">
          Handle
          <input data-testid="handle" className={field} value={handle} onChange={(e) => setHandle(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Logo
          <input
            data-testid="logo"
            type="file"
            accept="image/*"
            className="mt-1 block text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setLogoUrl(f ? URL.createObjectURL(f) : undefined);
            }}
          />
        </label>
        {logoUrl ? (
          <button type="button" className="dv-btn dv-btn-secondary px-4 py-2 text-sm" onClick={() => setLogoUrl(undefined)}>
            Remove logo
          </button>
        ) : null}
      </form>
      <div className="md:sticky md:top-8 md:self-start">
        <LivePreview profile={profile} />
      </div>
    </main>
  );
}
