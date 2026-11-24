import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_LIBRARY } from "./guides";

/**
 * One English spelling. Shared English copy (the landing, product and
 * comparison pages, guides, legal pages, help center, app and email text) is
 * written in US spelling: "color", "license", "favor", "behavior", "organize",
 * "recognize", "center", "inquiry". Pages used to mix "colour" and "color" on
 * the same site, sometimes in the same paragraph.
 *
 * British spelling stays where the text is for the UK market:
 *  - English guides written for the UK (their slug says "uk"), and
 *  - values under a UK, GB, IE, AU or NZ market key.
 * Citations (`sources`) and URLs are left alone: they quote an official title
 * or address as published (GOV.UK's "Licence to play live or recorded music").
 * Proper names that contain the word, such as "TheMusicLicence", never match.
 *
 * The scan reads every content module under web/src/content and checks the
 * English text only: an object with `locale: "en"`, the `en` entry of a
 * record keyed by site language, and modules that are English by name or
 * carry no language of their own. Text in other languages is skipped (French
 * "licence" and "centre" are correct French).
 */

/** The British forms the brief names, as whole words (identifiers like PRESET_COLOURS or logoNoColour never match). */
const UK_SPELLING =
  /\b(colour(?:s|ed|ing|ful|less)?|licences?|favour(?:s|ed|ing|able|ite|ites)?|behaviour(?:s|al)?|organis(?:e|ed|es|ing|ation|ations|ational|er|ers)|recognis(?:e|ed|es|ing|able|ably)|centres?|centred|enquir(?:y|ies|e|ed|es|ing))\b/gi;

const SITE_LOCALES = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"];
/** Market keys whose English is British. */
const BRITISH_MARKET_KEY = /^(uk|gb|ie|au|nz|en-gb|en_gb)$/i;
/** A module named for another language (de.ts, calendar-fr.ts, answers-tr.ts …). */
const OTHER_LANGUAGE_FILE = /(^|[-/])(de|es|tr|fr|ja|ar|pl|it|pt)\.tsx?$/;

/** An English guide written for the UK market: its own spelling is kept. */
function isUkGuide(o: { locale?: unknown; slug?: unknown }): boolean {
  return o.locale === "en" && typeof o.slug === "string" && /(^|-)uk(-|$)/.test(o.slug);
}

type Finding = { where: string; word: string; text: string };

/**
 * Every British spelling in the English text of one module's exports. Pass one
 * `seen` set for all modules so content re-exported elsewhere (a guide in
 * GUIDE_LIBRARY and in GUIDES) is reported once.
 */
function ukSpellings(file: string, exports: Record<string, unknown>, seen = new WeakSet<object>()): Finding[] {
  const found: Finding[] = [];
  const visit = (v: unknown, where: string, english: boolean) => {
    if (typeof v === "string") {
      if (!english || /^(https?:|mailto:|\/)/.test(v)) return;
      for (const m of v.matchAll(UK_SPELLING)) {
        const at = m.index ?? 0;
        found.push({ where, word: m[0], text: v.slice(Math.max(0, at - 50), at + m[0].length + 30) });
      }
      return;
    }
    if (!v || typeof v !== "object") return;
    if (seen.has(v)) return;
    const o = v as Record<string, unknown>;
    let here = english;
    if (typeof o.locale === "string") here = o.locale === "en";
    if (isUkGuide(o)) return;
    // Walk English objects once; an object first reached in another language may still be reached as English.
    if (here) seen.add(v);
    if (Array.isArray(v)) {
      v.forEach((x, i) => visit(x, `${where}[${i}]`, here));
      return;
    }
    const keys = Object.keys(o);
    const byLanguage = keys.filter((k) => SITE_LOCALES.includes(k)).length >= 3;
    for (const k of keys) {
      if (k === "sources" || BRITISH_MARKET_KEY.test(k)) continue;
      const english = byLanguage && SITE_LOCALES.includes(k) ? k === "en" : here;
      visit(o[k], `${where}.${k}`, english);
    }
  };
  const englishByDefault = !OTHER_LANGUAGE_FILE.test(file);
  for (const [name, value] of Object.entries(exports)) {
    if (typeof value === "function") continue;
    visit(value, `${file}#${name}`, englishByDefault);
  }
  return found;
}

const CONTENT_DIR = __dirname;

function contentModules(dir = CONTENT_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return contentModules(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
  });
}

/** String literals of a source file that holds English copy inline (comments dropped). */
function stringLiterals(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
  return [...code.matchAll(/"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((m) => m[0]);
}

const show = (f: Finding[]) => f.map((x) => `${x.where}: "${x.word}" in …${x.text}…`).join("\n");

describe("English copy uses US spelling (UK guides excepted)", () => {
  it("finds the content modules to scan", () => {
    const files = contentModules().map((f) => path.relative(CONTENT_DIR, f));
    expect(files.length).toBeGreaterThan(50);
    for (const f of ["solutions/en.ts", "legal/en.ts", "help/en.ts", "guides/channels-en.ts", "landing/en.ts", "dentvideo-app.ts"]) expect(files).toContain(f);
  });

  it("no colour, licence, favour, behaviour, organise, recognise, centre or enquiry in English content", async () => {
    const findings: Finding[] = [];
    const seen = new WeakSet<object>();
    for (const file of contentModules()) {
      const mod = (await import(file)) as Record<string, unknown>;
      findings.push(...ukSpellings(path.relative(CONTENT_DIR, file).replace(/\\/g, "/"), mod, seen));
    }
    expect(show(findings), "write US spelling in shared English copy (color, license …); British spelling belongs only in UK guides").toBe("");
  });

  it("llms.txt's own sentences use US spelling too", () => {
    const src = readFileSync(path.join(CONTENT_DIR, "../lib/dentvid/llms.ts"), "utf8");
    const hits = stringLiterals(src).flatMap((s) => [...s.matchAll(UK_SPELLING)].map((m) => `${m[0]} in ${s.slice(0, 80)}`));
    expect(hits).toEqual([]);
  });

  it("keeps UK guides in British spelling: they are recognized and skipped", () => {
    const uk = GUIDE_LIBRARY.filter(isUkGuide).map((g) => g.slug);
    expect(uk).toEqual(expect.arrayContaining(["dental-advertising-rules-uk-gdc-asa", "patient-education-videos-uk-dental-practices"]));
    // The US guide and other languages are never treated as UK guides.
    expect(isUkGuide({ locale: "en", slug: "dental-advertising-rules-us" })).toBe(false);
    expect(isUkGuide({ locale: "en", slug: "duke-of-york" })).toBe(false);
    expect(isUkGuide({ locale: "de", slug: "zahnarzt-werbung-uk" })).toBe(false);
  });

  describe("the scan itself (a check that cannot fail proves nothing)", () => {
    it("catches British spelling in an English guide, a language-keyed record and an English-only module", () => {
      const guide = { locale: "en", slug: "dental-waiting-room-tv-videos", intro: "Videos in your clinic's colours.", faq: [{ q: "Do we need a licence?", a: "Usually." }] };
      expect(ukSpellings("guides/x-en.ts", { G: [guide] }).map((f) => f.word)).toEqual(["colours", "licence"]);
      const record = { en: { note: "Made in your colours, centred." }, de: { note: "In Ihren Farben." }, fr: { note: "Sous licence Pexels, au centre." } };
      expect(ukSpellings("dentvideo-x.ts", { TEXT: record }).map((f) => [f.where, f.word])).toEqual([
        ["dentvideo-x.ts#TEXT.en.note", "colours"],
        ["dentvideo-x.ts#TEXT.en.note", "centred"],
      ]);
      expect(ukSpellings("seo-x.ts", { PAGES: [{ points: ["Favours a question", "Recognised titles", "Group enquiries"] }] }).map((f) => f.word)).toEqual([
        "Favours",
        "Recognised",
        "enquiries",
      ]);
    });

    it("leaves UK guides, UK market entries, other languages, citations, URLs, identifiers and proper names alone", () => {
      const ukGuide = { locale: "en", slug: "patient-education-videos-uk-dental-practices", intro: "Your practice's colours and the GDC's recognised titles." };
      const usGuide = {
        locale: "en",
        slug: "dental-waiting-room-tv-videos",
        faq: [{ q: "Do we need a music license in the UK?", a: "The license is TheMusicLicence from PPL PRS." }],
        sources: [{ label: "GOV.UK: Licence to play live or recorded music", url: "https://www.gov.uk/licence-to-play-live-or-recorded-music" }],
        logoUrl: "/dentvideo/colour/logo.png",
      };
      const markets = { UK: { note: "Brand colours" }, US: { note: "Brand colors" } };
      const french = { locale: "fr", intro: "Utilisées sous la licence Pexels, au centre de Lyon." };
      const keys = { PRESET_COLOURS: ["#0f5c5c"], logoNoColour: "No color found in the logo." };
      expect(ukSpellings("guides/x-en.ts", { A: [ukGuide, usGuide], B: markets, C: french, D: keys })).toEqual([]);
      expect(ukSpellings("legal/fr.ts", { FR: { intro: "Utilisées sous la licence Pexels." } })).toEqual([]);
    });

    it("reads string literals, not comments or identifiers, from inline-copy sources", () => {
      const src = '/** brand colour */\nconst colour = "#fff"; // centre it\nconst t = `a one-time licence`;\nconst u = "colors";';
      expect(stringLiterals(src)).toEqual(['"#fff"', "`a one-time licence`", '"colors"']);
    });
  });
});
