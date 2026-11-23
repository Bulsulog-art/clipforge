"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ImagePlus } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { analyseLogoFile } from "@/lib/dentvid/logo-colors";
import type { LogoState } from "./logo-status";
import { TEASER_KEY } from "@/lib/dentvid/onboarding";
import { trackDv } from "@/lib/dentvid/events-client";
import { onceInView } from "@/lib/dentvid/seen";
import { exampleServices } from "@/lib/dentvid/service-hints";
import { PreviewPlaceholder } from "./phone";

// Loaded near the preview, not with the page.
const LogoStatus = dynamic(() => import("./logo-status").then((m) => m.TeaserLogoStatus), { ssr: false });

const LivePreview = dynamic(() => import("./live-preview").then((m) => m.LivePreview), {
  ssr: false,
  loading: () => <PreviewPlaceholder />,
});

/** What a visitor does on the page: the first of these says someone is there, not a bounce or a crawler. */
const ACTIVITY = ["scroll", "pointerdown", "touchstart", "keydown", "wheel"] as const;

/**
 * True once `ref` is within `margin` (~two screens) of the viewport, the page has loaded and gone
 * idle, and the visitor has done something (scrolled, tapped, typed, or arrived already scrolled,
 * e.g. at #try): the live preview (Remotion, fonts, narration: several hundred KB of script and
 * audio) must not compete with the hero on a phone's first load, and has settled in the
 * placeholder's box before it scrolls into view. Waiting for the first scroll or tap keeps it off
 * the first load of a visitor who leaves from the hero (Lighthouse measured it as most of the
 * landing's blocking time on a phone), and any scroll starts it ~1.5 screens before it is seen.
 */
function useNearViewport(ref: React.RefObject<HTMLElement | null>, margin = "1600px"): boolean {
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let idle: number | undefined;
    const go = () => {
      const ric = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) idle = ric(() => setLoaded(true), { timeout: 1500 });
      else idle = window.setTimeout(() => setLoaded(true), 200);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      window.removeEventListener("load", go);
      const cic = (window as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (idle !== undefined) (cic ?? window.clearTimeout)(idle);
    };
  }, []);
  useEffect(() => {
    if (active) return;
    // Already scrolled (a reload further down, a link to #try): someone is reading.
    if (window.scrollY > 0) {
      setActive(true);
      return;
    }
    const on = () => setActive(true);
    for (const e of ACTIVITY) window.addEventListener(e, on, { once: true, passive: true });
    return () => {
      for (const e of ACTIVITY) window.removeEventListener(e, on);
    };
  }, [active]);
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
  return near && loaded && active;
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
 * The landing's "try it with your logo": name, logo, colour and a live preview, all in the browser,
 * then a button into the sign-up that carries them over (sessionStorage) to the wizard's preview.
 */
export function Teaser({ locale, copy, href }: { locale: Locale; copy: TeaserCopy; href: string }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOURS[0]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [swatches, setSwatches] = useState<string[]>([]);
  const previewBox = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const showPreview = useNearViewport(previewBox);
  // Funnel: reached this section.
  useEffect(() => onceInView(section.current, () => trackDv("preview_seen", { locale, props: { where: "landing" }, once: "preview-seen:landing" })), [locale]);
  useEffect(() => void (showPreview && import("./logo-status")), [showPreview]);
  const [st, setSt] = useState<LogoState>({});
  /** The logo as a data URL, read when chosen, so the hand-over on click is synchronous. */
  const [logoData, setLogoData] = useState<string | null>(null);
  const latest = useRef<File | null>(null);
  /** Funnel: the visitor started playing with the preview (first change, once per tab). */
  const started = useRef(false);
  const touch = () => {
    if (started.current) return;
    started.current = true;
    trackDv("preview_started", { locale, props: { where: "landing" }, once: "preview:landing" });
  };

  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  /** Shows a version of the logo; reads its colours. */
  async function showLogo(file: File) {
    latest.current = file;
    setLogo(file);
    setSwatches([]);
    setLogoUrl(URL.createObjectURL(file));
    setLogoData(null);
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

  async function chooseLogo(file: File | null) {
    touch();
    if (!file) return;
    latest.current = file;
    setSt({ reading: true });
    const r = await (await import("./logo-status")).readLogo(file, locale);
    if (latest.current !== file) return;
    if (r.error) latest.current = logo;
    setSt(r);
    if (r.prepared) showLogo(r.prepared.file);
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

  const cta = (
    <>
      <Link
        href={href}
        onClick={() => {
          carry();
          trackDv("cta_clicked", { locale, props: { where: "teaser" } });
        }}
        data-cta="teaser"
        className="dv-btn dv-btn-primary w-full px-7 py-4 text-base">
        {copy.cta}
        <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
      <p className="-mt-1 text-center text-sm leading-relaxed text-dv-muted">{copy.note}</p>
    </>
  );

  return (
    <section ref={section} id="try" aria-labelledby="try-heading" className="relative isolate scroll-mt-16 overflow-hidden border-t border-dv-line bg-white/60">
      {/* Phones (<md): heading, fields, preview, text, button (max-md:contents; DOM order kept).
          md: text, preview, fields. lg: text and fields left, phone right. */}
      <div className="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-8 px-4 py-16 [grid-template-areas:'text'_'phone'_'form'] max-md:gap-y-6 max-md:pt-12 max-md:[grid-template-areas:'head'_'form'_'phone'_'lead'_'cta'] sm:px-6 sm:py-24 lg:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-y-0 lg:[grid-template-areas:'text_phone'_'form_phone']">
        <div className="min-w-0 [grid-area:text] max-md:contents lg:self-end">
          <div className="min-w-0 max-md:[grid-area:head]">
            <p className="dv-eyebrow">{copy.eyebrow}</p>
            <h2 id="try-heading" className="dv-display dv-h2 mt-4 text-balance text-dv-ink">
              {copy.heading}
            </h2>
          </div>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-dv-body max-md:mt-0 max-md:[grid-area:lead]">{copy.text}</p>
        </div>

        <div className="min-w-0 [grid-area:form] max-md:contents lg:self-start">
          <div className="dv-card grid min-w-0 gap-5 p-5 max-md:[grid-area:form] sm:p-6 lg:mt-8">
            <label className="block text-sm font-semibold text-dv-ink">
              {copy.name}
              <input value={name} onChange={(e) => {
                  touch();
                  setName(e.target.value.slice(0, 80));
                }} placeholder={copy.namePlaceholder} autoComplete="organization" className="dv-field" />
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
                  <span className="max-w-[10rem] truncate text-sm font-normal text-dv-body">{logo ? logo.name : "PNG · JPG · SVG"}</span>
                  {/* No HEIC: iPhones then send a JPEG. */}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,.svg" className="sr-only" onChange={(e) => void chooseLogo(e.target.files?.[0] ?? null)} />
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
                        onClick={() => {
                          touch();
                          setColor(c);
                        }}
                        className={`h-8 w-8 rounded-full border border-black/10 shadow-sm transition hover:scale-110 ${on ? "ring-2 ring-dv-teal ring-offset-2 ring-offset-white" : ""}`}
                        style={{ background: c }}
                      />
                    );
                  })}
                  <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full p-[3px] [background:conic-gradient(#e0574f,#e8b04a,#5bb36b,#3f8fd1,#9a5cc8,#e0574f)]" title={copy.color}>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        touch();
                        setColor(e.target.value);
                      }}
                      aria-label={copy.color}
                      className="h-full w-full cursor-pointer rounded-full border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white"
                    />
                  </span>
                </span>
              </div>
            </div>
            <LogoStatus st={st} set={setSt} show={showLogo} locale={locale} />
            {/* Side by side (lg), the button sits inside the card, under the fields. */}
            <div className="hidden lg:grid lg:gap-5">{cta}</div>
          </div>
          {/* Phones and tablets: the button never comes before the fields it carries over. */}
          <div className="mx-auto mt-6 grid w-full max-w-md gap-4 max-md:mt-0 max-md:[grid-area:cta] lg:hidden">{cta}</div>
        </div>

        <div className="relative [grid-area:phone]">
          <div ref={previewBox} className="mx-auto w-full max-w-[14.5rem] sm:max-w-[18rem]">
            {showPreview ? (
              <LivePreview
                profile={{
                  name: name.trim() || copy.namePlaceholder,
                  language: locale,
                  services: exampleServices(locale),
                  brandColor: color,
                  logoUrl: logoUrl ?? undefined,
                }}
                track="landing"
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
