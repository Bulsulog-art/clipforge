/**
 * The static library behind the live preview: a few already-reviewed videos
 * per language (plan + narration under public/dentvideo/preview/<lang>/),
 * painted at play time in the visitor's colour, logo, name and handle.
 *
 * Nothing here calls a model or a server: the plans passed the compliance and
 * accuracy reviewers once, when the library was built
 * (scripts/build-dentvideo-preview.mts), and every visitor replays them.
 */
import { PREVIEW_MANIFEST, type PreviewEntry as BuiltEntry } from "./preview-manifest";
import { isRtl } from "@/remotion/script";

/** A library video. `narrated: false` marks a silent one (no .mp3 beside its plan). */
export type PreviewEntry = BuiltEntry & { narrated?: boolean };

/** What a service is about, so a clinic sees videos about what it offers. */
export type ServiceCategory = "implant" | "whitening" | "aligners" | "rootcanal" | "children" | "gum" | "cleaning";

/**
 * Service names in the languages we write in, by category. Mirrors
 * worker/src/dental/footage.ts BY_SERVICE (same order, same stems) plus gums,
 * which the footage guard folds into its general shots.
 */
const BY_SERVICE: [RegExp, ServiceCategory][] = [
  // "İmplant": a Turkish capital İ does not fold to i under /i.
  // Japanese, Arabic and Polish stems mirror the worker's footage.ts.
  [/[iİı]mplant|インプラント|زراع/i, "implant"],
  [/whiten|bleach|blanque|beyazlat|blanchi|clare|sbianc|ホワイトニング|تبييض|wybiel/i, "whitening"],
  [/align|alinead|plak|aligneur|allinea|alinhad|ortodon|orthodon|kieferorth|invisalign|zahnspange|brace|矯正|マウスピース|تقويم|nakładk/i, "aligners"],
  [/root|wurzel|endodon|kanal|kanał|canal|devital|根管|عصب/i, "rootcanal"],
  [/child|kid|kinder|niñ|nin[oa]s|odontopedi|çocuk|cocuk|pédodont|pedodon|pediatr|paediatr|bambin|crian|小児|子ども|子供|أطفال|dziec/i, "children"],
  [/gum|zahnfleisch|parodon|periodon|enc[ií]a|gencive|diş ?eti|dis ?eti|gengiv|歯周|歯ぐき|歯茎|لثة|اللثة|dziąs|przyzęb/i, "gum"],
  [/clean|reinig|limpieza|temizl|détartr|detartr|igiene|limpeza|hygien|scaling|prophyla|prophylax|クリーニング|歯石|تنظيف|جير|higienizac|skaling|kamień/i, "cleaning"],
];

export function serviceCategory(service: string): ServiceCategory | undefined {
  return BY_SERVICE.find(([re]) => re.test(service))?.[1];
}

export const PREVIEW_LANGUAGES = ["en", "de", "es", "fr", "tr", "ja", "ar", "pl"] as const;
export type PreviewLanguage = (typeof PREVIEW_LANGUAGES)[number];

/**
 * Library videos whose narration (the .mp3, a recording we do not edit by
 * hand) still SAYS a closing their market forbids: they play silent, with
 * the corrected on-screen text, until they are re-rendered with
 * scripts/build-dentvideo-preview.mts. Then take them off this list.
 *
 * Türkiye (Nov 2026): every Turkish sample used to be narrated with a
 * closing that steers the viewer to book or to the clinic ("Sorularınız
 * için bize ulaşın veya randevu alın!"), which RG 33075 does not allow
 * (information only; hard-rules.ts MARKET_HARD_RULES TR "booking"). They
 * were held here, silent, until re-rendered (15.11.2026) with the current
 * pipeline; the build now refuses a Turkish narration that trips a TR rule.
 * docs/PREVIEW_RERENDER.md has the history.
 */
export const NARRATION_HELD: Partial<Record<PreviewLanguage, readonly string[]>> = {
  tr: [],
};

/** The whole library: reviewed, narrated videos in every preview language (held narrations silent). */
export const PREVIEW_LIBRARY: Record<PreviewLanguage, PreviewEntry[]> = Object.fromEntries(
  PREVIEW_LANGUAGES.map((l) => [l, PREVIEW_MANIFEST[l].map((e): PreviewEntry => (NARRATION_HELD[l]?.includes(e.id) ? { ...e, narrated: false } : e))]),
) as Record<PreviewLanguage, PreviewEntry[]>;

/** The library language for a clinic language; one we have no videos in falls back to English. */
export function libraryLanguage(language: string): PreviewLanguage {
  return (PREVIEW_LANGUAGES as readonly string[]).includes(language) ? (language as PreviewLanguage) : "en";
}

/**
 * Which top corner of the phone the preview's mute / play buttons sit in:
 * the one the clinic's logo is NOT in. The composition puts the logo top
 * right, mirrored to top left in a right-to-left (Arabic) video
 * (remotion/Video.tsx ClinicLogo); buttons in the same corner would cover the
 * very logo the preview is there to show. Physical sides on purpose — the
 * video's direction decides, not the page's.
 */
export function previewControlsSide(language: string): "left" | "right" {
  return isRtl(libraryLanguage(language)) ? "right" : "left";
}

/**
 * The videos to show a clinic: one per service it offers, in the order it
 * listed them, then the rest of the library for variety — never the same
 * topic twice while another is left.
 */
export function pickPreviews(
  services: string[],
  language: string,
  count = 3,
  manifest: Partial<Record<PreviewLanguage, PreviewEntry[]>> = PREVIEW_LIBRARY,
): PreviewEntry[] {
  const pool = manifest[libraryLanguage(language)] ?? [];
  const wanted = [...new Set(services.map(serviceCategory).filter((c): c is ServiceCategory => Boolean(c)))];
  const out: PreviewEntry[] = [];
  const take = (e: PreviewEntry | undefined) => {
    if (e && !out.includes(e) && out.length < count) out.push(e);
  };
  for (const c of wanted) take(pool.find((e) => e.category === c));
  // Then categories not yet shown, then anything left.
  for (const e of pool) if (!out.some((o) => o.category === e.category)) take(e);
  for (const e of pool) take(e);
  return out;
}

/**
 * The clinic's services that have no sample in its language's library (in
 * the order and words it typed them), so the preview can say so rather than
 * quietly showing other topics. Services we cannot classify are left out.
 */
export function servicesWithoutSample(
  services: string[],
  language: string,
  manifest: Partial<Record<PreviewLanguage, PreviewEntry[]>> = PREVIEW_LIBRARY,
): string[] {
  const pool = manifest[libraryLanguage(language)] ?? [];
  const seen = new Set<ServiceCategory>();
  const out: string[] = [];
  for (const s of services) {
    const c = serviceCategory(s);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    if (!pool.some((e) => e.category === c)) out.push(s.trim());
  }
  return out;
}

/** Placeholders the library build left where the sample clinic's own text was. */
export const HANDLE_TOKEN = "{handle}";
export const NAME_TOKEN = "{name}";

/** "@example_handle" from "example_handle", "@example_handle" or " @Example_Handle " (case kept). */
export function formatHandle(handle?: string): string | undefined {
  const h = handle?.trim().replace(/^@+/, "").replace(/\s+/g, "");
  return h ? `@${h}` : undefined;
}

/**
 * Fills a library plan's placeholders with the visitor's own name and
 * handle. Without a handle the CTA chip is dropped (as a clinic without one
 * gets) and an inline mention falls back to the clinic's name.
 */
export function personalisePlan<P extends { scenes: Record<string, unknown>[] }>(
  plan: P,
  clinic: { name: string; handle?: string },
): P {
  const handle = formatHandle(clinic.handle);
  const name = clinic.name.trim() || "…";
  const fill = (s: string) => s.split(HANDLE_TOKEN).join(handle ?? name).split(NAME_TOKEN).join(name);
  const deep = (v: unknown): unknown =>
    typeof v === "string" ? fill(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? mapObject(v as Record<string, unknown>) : v;
  const mapObject = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, val]) => [k, deep(val)]));
  const scenes = plan.scenes.map((scene) => {
    if (scene.kind === "cta" && scene.handle === HANDLE_TOKEN && !handle) {
      const { handle: _drop, ...rest } = scene;
      return mapObject(rest);
    }
    return mapObject(scene);
  });
  return { ...plan, scenes };
}

/** The longest clinic name a plan carries (remotion/scene-plan.ts `clinic`). */
export const CLINIC_NAME_MAX = 80;

/** What the visitor has typed and picked so far: the look the preview paints a library plan in. */
export type PreviewLook = {
  name: string;
  handle?: string;
  /** "#rrggbb" or "rrggbb". */
  brandColor?: string;
  brandAccent?: string;
  /** Background photo paths, in scene order. */
  backgrounds?: string[];
};

export type PreviewPlanExtras = { clinic?: string; brandColor?: string; brandAccent?: string; backgrounds?: string[] };

/**
 * The plan the live preview plays: a library plan in the visitor's look.
 * The clinic's name signs the video the way a real week does (worker
 * dental/week.ts sets `clinic: profile.name`): small in the top corner while
 * there is no logo, and under the closing line on the sign-off. A name that
 * is empty or only spaces signs nothing.
 */
export function previewPlan<P extends { scenes: Record<string, unknown>[] }>(raw: P, look: PreviewLook): P & PreviewPlanExtras {
  const personal = personalisePlan(raw, { name: look.name, handle: look.handle });
  const clinic = look.name.trim().slice(0, CLINIC_NAME_MAX).trim();
  const hex = (c?: string) => c?.trim().replace(/^#/, "").toUpperCase() || undefined;
  const brandColor = hex(look.brandColor);
  const brandAccent = hex(look.brandAccent);
  return {
    ...personal,
    ...(clinic ? { clinic } : {}),
    ...(brandColor ? { brandColor } : {}),
    ...(brandAccent ? { brandAccent } : {}),
    ...(look.backgrounds?.length ? { backgrounds: look.backgrounds } : {}),
  };
}
