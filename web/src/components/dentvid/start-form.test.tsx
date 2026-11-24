import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/start",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LOCALES, type Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { SIGNUP_EXTRA, aroundEmail, signupExtraText } from "@/content/dentvideo-signup-extra";
import { SIGNUP_SAVED } from "@/content/dentvideo-signup-saved";
import { TEASER_KEY } from "@/lib/dentvid/onboarding";
import { TEASER_DEFAULT_COLOR, clinicInitial, inkOn, parseTeaserSeed, readTeaserSeed } from "@/lib/dentvid/teaser-seed";
import { StartForm } from "./start-form";
import { EMAIL_HINT_ID, EmailHint, TeaserRecap, teaserFromSession } from "./signup-extras";

(globalThis as { React?: typeof React }).React = React;

const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const html = (el: React.ReactElement) => decode(renderToStaticMarkup(el));

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const seed = (o: Record<string, unknown>) => JSON.stringify(o);
const storage = (value: string | null) => ({ getItem: (k: string) => (k === TEASER_KEY ? value : null) });

describe("the teaser seed, read back on the sign-up page", () => {
  it("what the landing's teaser writes comes back as it was chosen", () => {
    expect(parseTeaserSeed(seed({ brandColor: "#1F4E79", name: "  Sample Dental Practice  ", logo: PNG, logoName: "logo.png" }))).toEqual({
      name: "Sample Dental Practice",
      brandColor: "#1f4e79",
      logo: PNG,
    });
    expect(parseTeaserSeed(seed({ brandColor: "#b6774f", name: "Örnek Diş Kliniği" }))).toEqual({ name: "Örnek Diş Kliniği", brandColor: "#b6774f", logo: null });
    // A logo alone is enough to show.
    expect(parseTeaserSeed(seed({ brandColor: "#0f5c5c", logo: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }))?.logo).toMatch(/^data:image\/svg\+xml/);
    expect(readTeaserSeed(storage(seed({ brandColor: "#0f5c5c", name: "A" })), TEASER_KEY)?.name).toBe("A");
  });

  it("nothing worth showing (only the colour every visit starts with) is no recap", () => {
    expect(parseTeaserSeed(seed({ brandColor: "#0f5c5c" }))).toBeNull();
    expect(parseTeaserSeed(seed({ brandColor: "#0f5c5c", name: "   " }))).toBeNull();
    expect(readTeaserSeed(storage(null), TEASER_KEY)).toBeNull();
    expect(readTeaserSeed(null, TEASER_KEY)).toBeNull();
    expect(readTeaserSeed(undefined, TEASER_KEY)).toBeNull();
  });

  it.each([
    ["not JSON", "{name: Smile"],
    ["empty string", ""],
    ["JSON null", "null"],
    ["a number", "42"],
    ["a string", JSON.stringify("Sample Dental Practice")],
    ["an array", JSON.stringify([{ name: "Sample Dental Practice" }])],
    ["a name that is not text", seed({ name: { first: "Smile" }, brandColor: "#0f5c5c" })],
    ["a name longer than the teaser allows", seed({ name: "x".repeat(81), brandColor: "#0f5c5c" })],
    ["a logo that is a script URL", seed({ logo: "javascript:alert(1)" })],
    ["a logo that is a web address", seed({ logo: "https://tracker.example/pixel.png" })],
    ["a logo that is not an image", seed({ logo: "data:text/html;base64,PHNjcmlwdD4=" })],
    ["a logo with markup after the data", seed({ logo: `${PNG}"><script>` })],
  ])("malformed (%s): no recap, no throw", (_what, raw) => {
    expect(() => parseTeaserSeed(raw)).not.toThrow();
    expect(parseTeaserSeed(raw)).toBeNull();
  });

  it("a bad field is dropped, the good ones kept; a colour that is not #rrggbb falls back to the teaser's first", () => {
    expect(parseTeaserSeed(seed({ name: "Sample Dental Practice", brandColor: "red; background:url(x)" }))).toEqual({ name: "Sample Dental Practice", brandColor: TEASER_DEFAULT_COLOR, logo: null });
    expect(parseTeaserSeed(seed({ name: "Sample Dental Practice", brandColor: "#0f5c5c", logo: "javascript:alert(1)" }))?.logo).toBeNull();
    expect(parseTeaserSeed(seed({ name: "x".repeat(81), logo: PNG }))).toEqual({ name: null, brandColor: TEASER_DEFAULT_COLOR, logo: PNG });
    expect(parseTeaserSeed(seed({ name: "x".repeat(80) }))?.name).toHaveLength(80);
  });

  it("storage that throws (blocked storage, private mode) is no recap", () => {
    const throwing = {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    };
    expect(readTeaserSeed(throwing, TEASER_KEY)).toBeNull();
  });

  describe("teaserFromSession (the page's own read)", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("reads this tab's storage", () => {
      vi.stubGlobal("window", { sessionStorage: storage(seed({ name: "Sample Dental Practice", brandColor: "#2e7d6b" })) });
      expect(teaserFromSession()).toEqual({ name: "Sample Dental Practice", brandColor: "#2e7d6b", logo: null });
    });

    it("survives a browser where touching sessionStorage itself throws", () => {
      const w = {};
      Object.defineProperty(w, "sessionStorage", {
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });
      vi.stubGlobal("window", w);
      expect(teaserFromSession()).toBeNull();
    });

    it("survives garbage in storage", () => {
      vi.stubGlobal("window", { sessionStorage: storage("\u0000not json") });
      expect(teaserFromSession()).toBeNull();
    });
  });

  it("the tile's initial and ink: first letter in the page's language, readable on the colour", () => {
    expect(clinicInitial("örnek diş", "tr")).toBe("Ö");
    expect(clinicInitial("istanbul dental", "tr")).toBe("İ");
    expect(clinicInitial("サンプル歯科", "ja")).toBe("サ");
    expect(clinicInitial(null)).toBe("");
    expect(inkOn("#0f5c5c")).toBe("#ffffff");
    expect(inkOn("#f5e663")).toBe("#14211f");
    expect(inkOn("not a colour")).toBe("#ffffff");
  });
});

describe("the recap above the sign-up form", () => {
  it.each(LOCALES)("%s: logo on the brand colour, the clinic's name and what happens next", (locale: Locale) => {
    const x = SIGNUP_EXTRA[locale];
    const h = html(<TeaserRecap locale={locale} seed={{ name: "Sample Dental Practice", brandColor: "#1f4e79", logo: PNG }} />);
    expect(h).toContain("data-teaser-recap");
    expect(h).toContain(`src="${PNG}"`);
    expect(h).toContain("background:#1f4e79");
    expect(h).toContain("Sample Dental Practice");
    expect(h).toContain(x.recapLabel);
    expect(h).toContain(x.recapLine);
  });

  it("no logo: the clinic's initial on its colour, in readable ink", () => {
    const h = html(<TeaserRecap locale="en" seed={{ name: "sample dental practice", brandColor: "#0f5c5c", logo: null }} />);
    expect(h).not.toContain("<img");
    expect(h).toMatch(/color:#ffffff">S<\/span>/);
  });

  it("a logo and no name: no empty name line", () => {
    const h = html(<TeaserRecap locale="en" seed={{ name: null, brandColor: "#0f5c5c", logo: PNG }} />);
    expect(h).toContain("<img");
    expect(h).not.toContain('dir="auto"');
  });

  it("a name with markup is shown as text", () => {
    const h = renderToStaticMarkup(<TeaserRecap locale="en" seed={{ name: '<img src=x onerror="alert(1)">', brandColor: "#0f5c5c", logo: null }} />);
    expect(h).not.toContain("<img src=x");
    expect(h).toContain("&lt;img src=x");
  });
});

describe("what the sign-up page loads up front", () => {
  // The page has a source budget (lib/dentvid/client-bundle.test.ts). The recap, the typo check
  // and the ad-click rules load after mount; a static import would put them back on first load.
  const src = fs.readFileSync(path.join(__dirname, "start-form.tsx"), "utf8");
  const staticImports = [...src.matchAll(/^\s*import\s+(?!type\s)[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);

  it.each(["@/lib/dentvid/email-typo", "@/lib/dentvid/teaser-seed", "@/content/dentvideo-signup-extra", "@/lib/dentvid/after-press"])("%s comes only with the extras chunk", (mod) => {
    expect(staticImports).not.toContain(mod);
  });

  it.each(["./signup-extras", "@/lib/dentvid/ad-click", "@/lib/dentvid/demo-cookie"])("%s is loaded after mount, not imported up front", (mod) => {
    expect(staticImports).not.toContain(mod);
    expect(src).toContain(`import("${mod}")`);
  });

  it("the words picked before the first paint are small", () => {
    expect(staticImports).toContain("@/content/dentvideo-signup-saved");
    expect(fs.statSync(path.join(__dirname, "../../content/dentvideo-signup-saved.ts")).size).toBeLessThan(2600);
  });
});

describe("the sign-up form as the server draws it (before the browser reads the teaser)", () => {
  it.each(LOCALES)("%s: the plain sign-up, no recap, no hint text, nothing missing", (locale: Locale) => {
    const t = appText(locale).start;
    const h = html(<StartForm locale={locale} remember={false} />);
    expect(h).toContain(t.titleSignup);
    expect(h).toContain(t.leadSignup);
    expect(h).not.toContain(SIGNUP_SAVED[locale].titleSaved);
    expect(h).not.toContain("data-teaser-recap");
    // The hint comes with the extras chunk, after mount.
    expect(h).not.toContain("data-email-hint");
    expect(h).not.toMatch(/\{\w+\}/);
  });

  it("sign-in has no recap and no hint", () => {
    const h = html(<StartForm locale="en" remember={false} initialMode="signin" />);
    expect(h).toContain(appText("en").start.titleSignin);
    expect(h).not.toContain("data-email-hint");
    expect(h).not.toContain("data-teaser-recap");
  });
});

describe("the email typo hint", () => {
  type El = React.ReactElement<{ children?: React.ReactNode; onClick?: (e: unknown) => void; type?: string }>;
  const kids = (el: El): React.ReactNode[] => React.Children.toArray(el.props.children);
  const findButton = (node: React.ReactNode): El | null => {
    if (!React.isValidElement(node)) return null;
    const el = node as El;
    if (el.type === "button") return el;
    for (const c of kids(el)) {
      const b = findButton(c);
      if (b) return b;
    }
    return null;
  };

  it.each(LOCALES)("%s: 'did you mean' with the address as a button, in the page's language", (locale: Locale) => {
    const [before, after] = aroundEmail(signupExtraText(locale).didYouMean);
    const h = html(<EmailHint locale={locale} email="dr.smith@gmial.com" onFix={() => {}} />);
    expect(h).toMatch(/^<p id="dv-email-hint" aria-live="polite" data-email-hint="true" class="[^"]*">/);
    // A screen reader hears "Did you mean …?" on the button, not a bare address.
    expect(h).toContain(`">${before}<button type="button" dir="ltr" aria-describedby="${EMAIL_HINT_ID}"`);
    expect(h).toContain(`>dr.smith@gmail.com</button>${after}</p>`);
    expect(h).not.toMatch(/\{\w+\}/);
  });

  it.each(["", "dr.smith@gmail.com", "dr.smith@smiledental.com", "dr.smith@gmi"])("nothing to say for %j: the live region stays, empty", (email) => {
    expect(html(<EmailHint locale="en" email={email} onFix={() => {}} />)).toMatch(/^<p id="dv-email-hint" aria-live="polite" data-email-hint="true" class="[^"]*"><\/p>$/);
  });

  it("one tap puts the suggested address in the field and goes back to it; it is never a submit", () => {
    const onFix = vi.fn();
    const button = findButton(EmailHint({ locale: "en", email: "dr.smith@gmial.com", onFix }));
    expect(button?.props.type).toBe("button");
    const focus = vi.fn();
    const form = { querySelector: (sel: string) => (sel === '[data-field="email"]' ? { focus } : null) };
    button?.props.onClick?.({ currentTarget: { form } });
    expect(onFix).toHaveBeenCalledWith("dr.smith@gmail.com");
    expect(focus).toHaveBeenCalledOnce();
    // Outside a form (no field to go back to) it still fixes the address.
    const lone = vi.fn();
    findButton(EmailHint({ locale: "en", email: "dr.smith@gmial.com", onFix: lone }))?.props.onClick?.({ currentTarget: { form: null } });
    expect(lone).toHaveBeenCalledWith("dr.smith@gmail.com");
  });
});

describe("the new sign-up words", () => {
  // The title and lead ship with the page (dentvideo-signup-saved), the rest with the extras chunk.
  const words = (l: Locale) => ({ ...SIGNUP_SAVED[l], ...SIGNUP_EXTRA[l] });
  const en = words("en");
  const keys = Object.keys(en).sort();
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it("exist for every site language, with the same keys and placeholders", () => {
    expect(Object.keys(SIGNUP_EXTRA).sort()).toEqual([...LOCALES].sort());
    expect(Object.keys(SIGNUP_SAVED).sort()).toEqual([...LOCALES].sort());
    expect(Object.keys(SIGNUP_SAVED.en).sort()).toEqual(["leadSaved", "titleSaved"]);
    for (const l of LOCALES) {
      const c = words(l);
      expect(Object.keys(c).sort(), l).toEqual(keys);
      for (const k of keys as (keyof typeof en)[]) {
        expect(c[k].trim(), `${l}.${k}`).not.toBe("");
        expect(placeholders(c[k]), `${l}.${k}`).toEqual(placeholders(en[k]));
        if (l !== "en") expect(c[k], `${l}.${k} is still English`).not.toBe(en[k]);
      }
    }
    expect(signupExtraText("pl-PL")).toBe(SIGNUP_EXTRA.pl);
    expect(signupExtraText("it")).toBe(SIGNUP_EXTRA.en);
  });

  it("written plainly: no dashes as punctuation, no exclamation marks, no promise of a free week", () => {
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(words(l))) {
        expect(v, `${l}.${k}`).not.toMatch(/[—–]|\s-\s/);
        expect(v, `${l}.${k}`).not.toMatch(/[!！]/);
        expect(v, `${l}.${k}`).not.toMatch(/free|kostenlos|gratis|ücretsiz|gratuit|無料|مجان|bezpłatn|darmo/i);
      }
    }
  });

  it("the save variant still says payment comes only with a plan, like the plain sign-up", () => {
    const plan: Record<Locale, RegExp> = { en: /plan/, de: /Tarif/, es: /plan/, tr: /plan/, fr: /formule/, ja: /プラン/, ar: /باقة/, pl: /planu/ };
    for (const l of LOCALES) expect(SIGNUP_SAVED[l].leadSaved, l).toMatch(plan[l]);
  });

  it("follows each market's tone", () => {
    expect(Object.values(words("ja")).join("")).not.toContain("あなた");
    expect(SIGNUP_SAVED.ja.leadSaved).toMatch(/ます。|です。/);
    for (const v of Object.values(words("ar"))) expect(v).toMatch(/[؀-ۿ]/);
    const pl = Object.values(words("pl")).join(" ");
    expect(pl).toContain("Państw");
    expect(pl).not.toMatch(/(?<!\p{L})(twój|twoje|twoja|twojego|ci|zapisz|załóż|wpisz|sprawdź|masz)(?!\p{L})/iu);
    expect(SIGNUP_SAVED.de.leadSaved).toMatch(/\bSie\b/);
    expect(Object.values(words("de")).join(" ")).not.toMatch(/\b(du|dein\w*)\b/i);
    expect(SIGNUP_SAVED.fr.leadSaved).toMatch(/\bvous\b/i);
  });
});

describe("the landing teaser's button", () => {
  it.each(LOCALES)("%s: no longer promises the full week (the next step is an account and a preview)", (l: Locale) => {
    const cta = LANDING[l].teaser.cta;
    expect(cta).not.toMatch(/week|Woche|semana|hafta|semaine|週|أسبوع|tydzie/i);
    expect(cta.trim().length).toBeGreaterThan(0);
  });
});
