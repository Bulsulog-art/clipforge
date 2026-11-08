"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ImagePlus } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { analyseLogoFile } from "@/lib/dentvid/logo-colors";
import { TEASER_KEY } from "@/lib/dentvid/onboarding";
import { exampleServices } from "@/lib/dentvid/service-hints";
import { PreviewPlaceholder } from "./phone";

const LivePreview = dynamic(() => import("./live-preview").then((m) => m.LivePreview), {
  ssr: false,
  loading: () => <PreviewPlaceholder />,
});

/**
 * True once `ref` is within `margin` of the viewport. The live preview (the
 * Remotion player, its fonts and narration: several hundred KB) is half-way
 * down the landing, so it is fetched as the visitor scrolls towards it rather
 * than competing with the hero on first load.
 */
function useNearViewport(ref: React.RefObject<HTMLElement | null>, margin = "600px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setNear(true);
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}

const COLOURS = ["#0f5c5c", "#1f4e79", "#2e7d6b", "#b6774f", "#8a3b4a", "#24303a"];
/** Logos bigger than this are not carried to the sign-up (sessionStorage is small). */
const MAX_CARRY = 1_500_000;

export type TeaserCopy = {
  eyebrow: string;
  heading: string;
  text: string;
  name: string;
  namePlaceholder: string;
  logo: string;
  color: string;
  cta: string;
  note: string;
};

/**
 * "Try it with your logo" on the landing: name, logo and colour, a live
 * preview in a phone — all in the browser, nothing uploaded — and a button
 * into the sign-up that carries the choices over (sessionStorage), so the
 * wizard's preview starts from them.
 */
export function Teaser({ locale, copy, href }: { locale: Locale; copy: TeaserCopy; href: string }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOURS[0]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [swatches, setSwatches] = useState<string[]>([]);
  const previewBox = useRef<HTMLDivElement>(null);
  const showPreview = useNearViewport(previewBox);
  /** The logo as a data URL, read when chosen, so the hand-over on click is synchronous. */
  const [logoData, setLogoData] = useState<string | null>(null);
  const latest = useRef<File | null>(null);

  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  async function chooseLogo(file: File | null) {
    latest.current = file;
    setLogo(file);
    setSwatches([]);
    setLogoUrl(file ? URL.createObjectURL(file) : null);
    setLogoData(null);
    if (!file) return;
    if (file.size <= MAX_CARRY) {
      const r = new FileReader();
      r.onload = () => {
        if (latest.current === file && typeof r.result === "string") setLogoData(r.result);
      };
      r.readAsDataURL(file);
    }
    const found = await analyseLogoFile(file);
    if (!found || latest.current !== file) return;
    setSwatches(found.swatches.slice(0, 4));
    if (found.suggested) setColor(found.suggested);
  }

  /** Hand the choices to the wizard. Best effort: without storage the wizard simply starts empty. */
  function carry() {
    const seed: Record<string, string> = { brandColor: color };
    if (name.trim()) seed.name = name.trim();
    if (logo && logoData) {
      seed.logo = logoData;
      seed.logoName = logo.name;
    }
    try {
      sessionStorage.setItem(TEASER_KEY, JSON.stringify(seed));
    } catch {
      try {
        delete seed.logo;
        sessionStorage.setItem(TEASER_KEY, JSON.stringify(seed));
      } catch {
        // storage unavailable
      }
    }
  }

  const palette = [...new Set([...swatches, ...COLOURS])].slice(0, 7);

  return (
    <section id="try" aria-labelledby="try-heading" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-2 pr-3.5 text-sm font-medium text-dv-teal ring-1 ring-dv-line">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dv-teal-50">
              <ImagePlus className="h-3 w-3" aria-hidden="true" />
            </span>
            {copy.eyebrow}
          </p>
          <h2 id="try-heading" className="dv-display mt-5 text-balance text-[2.375rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem]">
            {copy.heading}
          </h2>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-dv-body">{copy.text}</p>

          <div className="dv-card mt-8 grid gap-5 p-5 sm:p-6">
            <label className="block text-sm font-semibold text-dv-ink">
              {copy.name}
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} placeholder={copy.namePlaceholder} autoComplete="organization" className="dv-field" />
            </label>
            <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
              <label className="block text-sm font-semibold text-dv-ink">
                {copy.logo}
                <span className="mt-1.5 flex h-12 cursor-pointer items-center gap-3 rounded-[0.875rem] border border-dashed border-dv-edge bg-white px-3 transition hover:border-dv-teal">
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-dv-sand">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a local object URL
                      <img src={logoUrl} alt="" className="max-h-7 max-w-7 object-contain" />
                    ) : (
                      <ImagePlus className="h-4 w-4 text-dv-teal" aria-hidden="true" />
                    )}
                  </span>
                  <span className="max-w-[10rem] truncate text-sm font-normal text-dv-body">{logo ? logo.name : "PNG · JPG · WEBP"}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void chooseLogo(e.target.files?.[0] ?? null)} />
                </span>
              </label>
              <div className="text-sm font-semibold text-dv-ink">
                <span id="try-colour">{copy.color}</span>
                <span className="mt-1.5 flex h-12 flex-wrap items-center gap-2" role="group" aria-labelledby="try-colour">
                  {palette.map((c) => {
                    const on = c.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        aria-pressed={on}
                        onClick={() => setColor(c)}
                        className={`h-8 w-8 rounded-full border border-black/10 shadow-sm transition hover:scale-110 ${on ? "ring-2 ring-dv-teal ring-offset-2 ring-offset-white" : ""}`}
                        style={{ background: c }}
                      />
                    );
                  })}
                  <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full p-[3px] [background:conic-gradient(#e0574f,#e8b04a,#5bb36b,#3f8fd1,#9a5cc8,#e0574f)]" title={copy.color}>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      aria-label={copy.color}
                      className="h-full w-full cursor-pointer rounded-full border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white"
                    />
                  </span>
                </span>
              </div>
            </div>
            <Link href={href} onClick={carry} className="dv-btn dv-btn-primary group w-full px-7 py-4 text-base">
              {copy.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <p className="-mt-1 text-center text-xs text-dv-muted">{copy.note}</p>
          </div>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl transition-colors duration-500" style={{ background: color }} />
          <div ref={previewBox} className="mx-auto w-full max-w-[16rem] sm:max-w-[18rem]">
            {showPreview ? (
              <LivePreview
                profile={{
                  name: name.trim() || copy.namePlaceholder,
                  language: locale,
                  services: exampleServices(locale),
                  brandColor: color,
                  logoUrl: logoUrl ?? undefined,
                }}
              />
            ) : (
              <PreviewPlaceholder />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
