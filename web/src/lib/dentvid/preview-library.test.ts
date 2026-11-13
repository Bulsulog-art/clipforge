import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatHandle, libraryLanguage, personalisePlan, pickPreviews, previewControlsSide, serviceCategory, PREVIEW_LANGUAGES, PREVIEW_LIBRARY } from "./preview-library";
import { splitServices, SERVICE_HINTS } from "./service-hints";
import { parseScenePlan } from "@/remotion/scene-plan";
import { isRtl } from "@/remotion/script";

describe("preview player controls", () => {
  // The composition's logo: top right, mirrored to top left in a right-to-left video (remotion/Video.tsx).
  const logoSide = (lang: string) => (isRtl(lang) ? "left" : "right");

  it("never sit in the corner the clinic's logo is in, in any preview language", () => {
    for (const lang of PREVIEW_LANGUAGES) expect(previewControlsSide(lang)).not.toBe(logoSide(lang));
    expect(previewControlsSide("ar")).toBe("right");
    expect(previewControlsSide("en")).toBe("left");
    expect(previewControlsSide("ja")).toBe("left");
  });

  it("follow the video's language, not the page's — an English clinic on an Arabic page still has its logo top right", () => {
    // Italian / Portuguese clinics are previewed with the English library.
    expect(previewControlsSide("it")).toBe("left");
  });

  it("are placed by the player from the helper, with physical sides (not start/end, which flip with the page)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../components/dentvid/live-preview-player.tsx"), "utf8");
    expect(src).toContain("previewControlsSide(lang)");
    expect(src).not.toMatch(/absolute end-4 top-14/);
  });
});

const PUBLIC = path.resolve(__dirname, "../../../public/dentvideo/preview");

describe("serviceCategory", () => {
  it.each([
    ["Teeth whitening", "whitening"],
    ["Bleaching", "whitening"],
    ["Diş beyazlatma", "whitening"],
    ["İmplant tedavisi", "implant"],
    ["Implants dentaires", "implant"],
    ["Şeffaf plak tedavisi", "aligners"],
    ["Ortodoncia invisible", "aligners"],
    ["Kanal tedavisi", "rootcanal"],
    ["Wurzelbehandlung", "rootcanal"],
    ["Kinderzahnheilkunde", "children"],
    ["Odontopediatría", "children"],
    ["Tratamiento de encías", "gum"],
    ["Parodontitis-Behandlung", "gum"],
    ["Professionelle Zahnreinigung", "cleaning"],
    ["Détartrage", "cleaning"],
    ["Diş taşı temizliği", "cleaning"],
    ["インプラント", "implant"],
    ["マウスピース矯正", "aligners"],
    ["根管治療", "rootcanal"],
    ["小児歯科", "children"],
    ["歯周病の予防", "gum"],
    ["歯のクリーニング", "cleaning"],
    ["زراعة الأسنان", "implant"],
    ["التقويم الشفاف", "aligners"],
    ["علاج اللثة", "gum"],
    ["طب أسنان الأطفال", "children"],
    ["تنظيف الأسنان", "cleaning"],
    ["Leczenie kanałowe", "rootcanal"],
    ["Leczenie nakładkami", "aligners"],
    ["Stomatologia dziecięca", "children"],
    ["Higienizacja", "cleaning"],
    ["Krwawienie dziąseł", "gum"],
    ["Veneers", undefined],
  ])("%s → %s", (service, category) => expect(serviceCategory(service)).toBe(category));
});

describe("example services", () => {
  it.each(["ja", "ar", "pl"])("every %s example maps to a topic, split on the language's own comma", (l) => {
    const services = splitServices(SERVICE_HINTS[l]);
    expect(services).toHaveLength(6);
    for (const s of services) expect(serviceCategory(s), s).toBeDefined();
  });
});

describe("pickPreviews", () => {
  it("previews Japanese, Arabic and Polish clinics in their own language", () => {
    for (const l of ["ja", "ar", "pl"] as const) {
      expect(libraryLanguage(l)).toBe(l);
      const picks = pickPreviews(splitServices(SERVICE_HINTS[l]), l, 3);
      expect(picks).toHaveLength(3);
      expect(picks.every((p) => PREVIEW_LIBRARY[l].includes(p))).toBe(true);
    }
  });
  it("leads with the clinic's own services, in its order, without repeating a topic", () => {
    const picks = pickPreviews(["İmplant tedavisi", "Diş beyazlatma"], "tr", 3);
    expect(picks.map((p) => p.category).slice(0, 2)).toEqual(["implant", "whitening"]);
    expect(new Set(picks.map((p) => p.category)).size).toBe(3);
  });
  it("fills from the library when nothing matches, and falls back to English for it/pt", () => {
    expect(pickPreviews(["Veneers"], "de", 3)).toHaveLength(3);
    expect(libraryLanguage("it")).toBe("en");
    expect(pickPreviews([], "pt", 3).map((p) => p.id)).toEqual(pickPreviews([], "en", 3).map((p) => p.id));
  });
});

describe("personalisePlan", () => {
  const plan = {
    scenes: [
      { kind: "hook", text: "Hi", seconds: 3 },
      { kind: "cta", text: "Ask {handle} or visit {name}", handle: "{handle}", seconds: 4 },
    ],
  };
  it("puts the visitor's handle and name where the sample clinic's were", () => {
    const p = personalisePlan(plan, { name: "Smile Studio", handle: " smile_studio " });
    expect(p.scenes[1]).toEqual({ kind: "cta", text: "Ask @smile_studio or visit Smile Studio", handle: "@smile_studio", seconds: 4 });
  });
  it("drops the handle chip when there is none, and names the clinic instead", () => {
    const p = personalisePlan(plan, { name: "Smile Studio" });
    expect(p.scenes[1]).toEqual({ kind: "cta", text: "Ask Smile Studio or visit Smile Studio", seconds: 4 });
  });
  it("formats handles", () => {
    expect(formatHandle("@@a b")).toBe("@ab");
    expect(formatHandle("  ")).toBeUndefined();
  });
});

describe("the library on disk", () => {
  const all = PREVIEW_LANGUAGES.flatMap((l) => PREVIEW_LIBRARY[l].map((e) => ({ l, e })));
  it("has 3–6 videos per language, narrated ones at least 4", () => {
    for (const l of PREVIEW_LANGUAGES) {
      const lib = PREVIEW_LIBRARY[l];
      expect(lib.length, l).toBeGreaterThanOrEqual(lib.every((e) => e.narrated === false) ? 3 : 4);
      expect(lib.length, l).toBeLessThanOrEqual(6);
    }
  });
  it.each(all.map(({ l, e }) => [`${l}/${e.id}`, l, e]))("%s is a valid plan with no sample-clinic text, narrated unless marked silent", (_, l, e) => {
    const json = fs.readFileSync(path.join(PUBLIC, l, `${e.id}.json`), "utf8");
    expect(json).not.toMatch(/demo/i);
    const plan = personalisePlan(JSON.parse(json), { name: "Smile Studio", handle: "smilestudio" });
    expect(() => parseScenePlan(plan)).not.toThrow();
    const mp3 = path.join(PUBLIC, l, `${e.id}.mp3`);
    if (e.narrated === false) {
      expect(fs.existsSync(mp3)).toBe(false);
      // A silent plan names its language, so the player sets lang/dir and the script's fonts.
      expect(plan.language).toBe(l);
    } else expect(fs.statSync(mp3).size).toBeGreaterThan(20_000);
  });
  // Eight languages of 5–6 narrated videos (~1.5 MB each); a visitor only ever loads three.
  it("stays small enough to ship (≤ 12 MB)", () => {
    const size = (dir: string): number =>
      fs.readdirSync(dir, { withFileTypes: true }).reduce((n, f) => n + (f.isDirectory() ? size(path.join(dir, f.name)) : fs.statSync(path.join(dir, f.name)).size), 0);
    expect(size(PUBLIC)).toBeLessThan(12 * 1024 * 1024);
  });
});
