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

/** The whole library: reviewed, narrated videos in every preview language. */
export const PREVIEW_LIBRARY: Record<PreviewLanguage, PreviewEntry[]> = PREVIEW_MANIFEST;

/** The library language for a clinic language; one we have no videos in falls back to English. */
export function libraryLanguage(language: string): PreviewLanguage {
  return (PREVIEW_LANGUAGES as readonly string[]).includes(language) ? (language as PreviewLanguage) : "en";
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

/** Placeholders the library build left where the sample clinic's own text was. */
export const HANDLE_TOKEN = "{handle}";
export const NAME_TOKEN = "{name}";

/** "@smile_clinic" from "smile_clinic", "@smile_clinic" or " @Smile_Clinic " (case kept). */
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
