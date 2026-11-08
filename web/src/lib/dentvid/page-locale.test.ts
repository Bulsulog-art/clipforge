import { describe, expect, it } from "vitest";
import { GUIDES, type Locale } from "@/content/dentvideo";
import { documentLanguage } from "./page-locale";
import { isDentvideoPath } from "./host";

const guides: Record<string, Locale> = Object.fromEntries(GUIDES.map((g) => [g.slug, g.locale]));
const lang = (path: string | null, visitor: { cookie?: string; acceptLanguage?: string } = {}) => documentLanguage(path, visitor, guides);

describe("<html lang dir> on the server", () => {
  it("ClipForge pages are English, left to right, whatever the visitor's language", () => {
    expect(lang(null, { cookie: "ar", acceptLanguage: "ar" })).toEqual({ lang: "en", dir: "ltr" });
    expect(lang("/dashboard", { cookie: "de" })).toEqual({ lang: "en", dir: "ltr" });
    // "/dentvideos" is not the DentVideo section.
    expect(lang("/dentvideos/x", { cookie: "de" })).toEqual({ lang: "en", dir: "ltr" });
  });

  it("a landing, guides hub or About page takes the language in its address", () => {
    expect(lang("/dentvideo", { cookie: "de" })).toEqual({ lang: "en", dir: "ltr" });
    expect(lang("/dentvideo/de")).toEqual({ lang: "de", dir: "ltr" });
    expect(lang("/dentvideo/ja")).toEqual({ lang: "ja", dir: "ltr" });
    expect(lang("/dentvideo/ar")).toEqual({ lang: "ar", dir: "rtl" });
    expect(lang("/dentvideo/pl/about")).toEqual({ lang: "pl", dir: "ltr" });
    expect(lang("/dentvideo/tr/guides", { cookie: "en" })).toEqual({ lang: "tr", dir: "ltr" });
    expect(lang("/dentvideo/guides", { cookie: "ar" })).toEqual({ lang: "en", dir: "ltr" });
  });

  it("a guide takes its own language", () => {
    for (const g of GUIDES) expect(lang(`/dentvideo/guides/${g.slug}`, { cookie: "ar" }).lang, g.slug).toBe(g.locale);
  });

  it("sign-up and the app follow ?lang=, then the remembered language, then the browser", () => {
    expect(lang("/dentvideo/start?lang=tr", { cookie: "de" })).toEqual({ lang: "tr", dir: "ltr" });
    expect(lang("/dentvideo/start?step=clinic&lang=ar")).toEqual({ lang: "ar", dir: "rtl" });
    expect(lang("/dentvideo/start", { cookie: "ja", acceptLanguage: "de" }).lang).toBe("ja");
    expect(lang("/dentvideo/app", { acceptLanguage: "pl-PL,pl;q=0.9,en;q=0.8" }).lang).toBe("pl");
    expect(lang("/dentvideo/start?lang=xx")).toEqual({ lang: "en", dir: "ltr" });
  });

  it("knows the DentVideo section by its in-app path", () => {
    expect(isDentvideoPath("/dentvideo")).toBe(true);
    expect(isDentvideoPath("/dentvideo/start")).toBe(true);
    expect(isDentvideoPath("/dentvideo?x=1")).toBe(true);
    expect(isDentvideoPath("/dentvideos")).toBe(false);
    expect(isDentvideoPath("/")).toBe(false);
  });
});
