import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/start",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  },
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));

let sessionUser: { id: string } | null = null;
vi.mock("@/lib/dentvid/auth", () => ({ dvSession: async () => ({ user: sessionUser, db: {} }) }));
vi.mock("@/lib/dentvid/supabase", () => ({
  BUCKET: "dentvid",
  dvAdmin: () => {
    throw new Error("DentVideo backend is not configured");
  },
  dvBrowser: () => ({}),
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { DEMO_COPY, demoFromPrice, demoLogoCopy, fillDemo } from "@/content/dentvideo-demo";
import { dvTierPrice } from "@/lib/dentvid/pricing";
import { DemoPage, demoMetadata } from "./demo-page";
import { Onboarding } from "./onboarding";
import { DEMO_MIN_CONTRAST, type PublicDemo } from "@/lib/dentvid/demos";
import { contrastRatio } from "@/remotion/theme";

(globalThis as { React?: typeof React }).React = React;

const demo = (language: Locale): PublicDemo => ({ token: "Ab3dE5fG7hJ", clinicName: "Klinik Örnek", city: "İzmir", country: "TR", language, colour: "#1f4e79", hasLogo: true, campaign: "tr-launch" });
const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("the demo page", () => {
  it("renders in every language, with the clinic's name, the facts and a CTA that carries the demo", () => {
    for (const l of LOCALES) {
      const h = decode(renderToStaticMarkup(<DemoPage locale={l} demo={demo(l)} />));
      expect(h, l).toContain(`lang="${l}"`);
      expect(h, l).toContain(`dir="${l === "ar" ? "rtl" : "ltr"}"`);
      expect(h, l).toContain(fillDemo(DEMO_COPY[l].headline, { name: "Klinik Örnek" }));
      for (const f of Object.values(DEMO_COPY[l].facts)) expect(h, l).toContain(fillDemo(f, { price: demoFromPrice(l, "TR") }));
      expect(h, l).toContain(DEMO_COPY[l].cta);
      expect(h, l).toMatch(/href="[^"]*\/start\?lang=[a-z]{2}&demo=Ab3dE5fG7hJ&utm_source=demo&utm_medium=dm&utm_campaign=tr-launch&utm_content=Ab3dE5fG7hJ"/);
      expect(h, l).toContain('href="mailto:hello@dentvideo.com?subject=');
      expect(h, l).toContain(fillDemo(DEMO_COPY[l].privacy, { name: "Klinik Örnek" }));
      expect(h, l).not.toMatch(/\{(name|url|sender)\}/);
    }
  });

  it("states the starting price (Starter's, in the clinic's billing currency) and no founding offer, in every language", () => {
    for (const l of LOCALES) {
      const h = decode(renderToStaticMarkup(<DemoPage locale={l} demo={demo(l)} />));
      // A Turkish clinic: 1.490 TL, whatever the page's language; a clinic in Germany: €49; elsewhere $49.
      expect(h, l).toContain(fillDemo(DEMO_COPY[l].facts.from, { price: "1.490 TL" }));
      const de = decode(renderToStaticMarkup(<DemoPage locale={l} demo={{ ...demo(l), country: "DE" }} />));
      expect(de, l).toContain(fillDemo(DEMO_COPY[l].facts.from, { price: dvTierPrice(l, "starter", "EUR") }));
      const us = decode(renderToStaticMarkup(<DemoPage locale={l} demo={{ ...demo(l), country: "US" }} />));
      expect(us, l).toContain(fillDemo(DEMO_COPY[l].facts.from, { price: dvTierPrice(l, "starter", "USD") }));
      expect(DEMO_COPY[l].facts.from.match(/\d+/g), l).toBeNull();
      expect(h, l).not.toMatch(/\{price\}|\b29\b|\b49\b/);
      expect(Object.keys(DEMO_COPY[l].facts), l).not.toContain("founding");
      expect(h, l).not.toMatch(/\b99\b|990|founding|kurucu|\bGründungs|fundador|fondateur|創業|المؤسسين|założyciel/i);
    }
  });

  it("promises the logo only when the demo has one; without it, name and colour and a one-tap invite, in every language", () => {
    // The word for "logo" on each page.
    const LOGO: Record<Locale, RegExp> = { en: /logo/i, tr: /logo/i, de: /logo/i, es: /logo/i, fr: /logo/i, ja: /ロゴ/, ar: /شعار/, pl: /logo/i };
    for (const l of LOCALES) {
      const t = DEMO_COPY[l];
      expect(t.lead, l).toMatch(LOGO[l]);
      expect(t.ctaNote, l).toMatch(LOGO[l]);
      expect(t.leadNoLogo, l).not.toMatch(LOGO[l]);
      // The note without a logo invites one (in one tap) instead of saying it is filled in.
      expect(t.ctaNoteNoLogo, l).toMatch(LOGO[l]);
      for (const v of [t.leadNoLogo, t.ctaNoteNoLogo]) expect(v, l).not.toMatch(/[\u2014\u2013]/);

      const without = decode(renderToStaticMarkup(<DemoPage locale={l} demo={{ ...demo(l), hasLogo: false }} />));
      expect(without, l).toContain(t.leadNoLogo);
      expect(without, l).toContain(t.ctaNoteNoLogo);
      expect(without, l).not.toContain(t.lead);
      expect(without, l).not.toContain(t.ctaNote);
      expect(without, l).not.toContain("/api/dentvideo/demo/");
      expect(demoMetadata(l, { ...demo(l), hasLogo: false }).description, l).toBe(t.leadNoLogo);

      const withLogo = decode(renderToStaticMarkup(<DemoPage locale={l} demo={demo(l)} />));
      expect(withLogo, l).toContain(t.lead);
      expect(withLogo, l).toContain(t.ctaNote);
      expect(withLogo, l).not.toContain(t.ctaNoteNoLogo);
      expect(demoLogoCopy(t, true), l).toEqual({ lead: t.lead, ctaNote: t.ctaNote });
    }
  });

  it("keeps text on the clinic's colour readable (4.5:1): white on deep colours, dark on a gold", () => {
    const styles = (h: string, attr: string) => {
      const tag = new RegExp(`<a[^>]*data-cta="${attr}"[^>]*>`).exec(h)?.[0] ?? "";
      const st = /style="([^"]*)"/.exec(tag)?.[1] ?? "";
      return { bg: /background:\s*(#[0-9a-f]{6})/i.exec(st)?.[1], fg: /(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i.exec(st)?.[1] };
    };
    // A gold like demo 30's: white text on it is only 3:1.
    for (const colour of ["#c9a227", "#1f4e79", "#e0b84c", "#8fbc8f", "#d4af37"]) {
      const h = renderToStaticMarkup(<DemoPage locale="tr" demo={{ ...demo("tr"), colour }} />);
      const { bg, fg } = styles(h, "demo-start");
      expect(bg && fg, colour).toBeTruthy();
      expect(contrastRatio(fg!, bg!), colour).toBeGreaterThanOrEqual(DEMO_MIN_CONTRAST);
      // The check marks use the same pair.
      expect(h, colour).toContain(`background:${bg};color:${fg}`);
    }
    const gold = styles(renderToStaticMarkup(<DemoPage locale="de" demo={{ ...demo("de"), colour: "#c9a227" }} />), "demo-start");
    expect(gold).toEqual({ bg: "#c9a227", fg: "#0b0d10" });
    const navy = styles(renderToStaticMarkup(<DemoPage locale="de" demo={demo("de")} />), "demo-start");
    expect(navy).toEqual({ bg: "#1f4e79", fg: "#ffffff" });
  });

  it("is never indexed or followed, and a missing demo is the 404", () => {
    for (const d of [demo("tr"), null]) {
      const m = demoMetadata("tr", d);
      expect(m.robots).toMatchObject({ index: false, follow: false });
    }
    expect(demoMetadata("tr", demo("tr")).title).toBe("Klinik Örnek için bir önizleme");
    expect(() => renderToStaticMarkup(<DemoPage locale="tr" demo={null} />)).toThrow("NEXT_NOT_FOUND");
  });
});

describe("the route", () => {
  it("answers an unknown, expired or switched-off token (or no backend) with the 404", async () => {
    const { DemoRoute } = await import("./demo-route");
    await expect(DemoRoute({ locale: "tr", token: "Ab3dE5fG7hJ" }).then((el) => renderToStaticMarkup(el))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(DemoRoute({ locale: "tr", token: "../../secret" }).then((el) => renderToStaticMarkup(el))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("the admin demo page", () => {
  it("is a 404 for everyone but the admins", async () => {
    process.env.DENTVIDEO_ADMIN_USER_IDS = "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d";
    const { default: Page } = await import("@/app/dentvideo/admin/demos/page");
    for (const u of [null, { id: "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e" }]) {
      sessionUser = u;
      await expect(Page({})).rejects.toThrow("NEXT_NOT_FOUND");
    }
    // An admin without the table (or backend) sees the "apply 0009" notice, not an error.
    sessionUser = { id: "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d" };
    const h = renderToStaticMarkup(await Page({}));
    expect(h).toContain('data-testid="demos-missing"');
    expect(h).toContain("0009_dentvid_demos.sql");
  });
});

describe("sign-up prefill", () => {
  it("fills the clinic step from the demo for a clinic without a name", () => {
    const h = decode(
      renderToStaticMarkup(
        <Onboarding
          locale="tr"
          step="clinic"
          plans={[]}
          demo={{ token: "Ab3dE5fG7hJ", profile: { name: "Klinik Örnek", city: "İzmir", country: "TR", language: "tr", brandColor: "#1f4e79" }, logoUrl: "/api/dentvideo/demo/Ab3dE5fG7hJ/logo" }}
        />,
      ),
    );
    expect(h).toContain('value="Klinik Örnek"');
  });

  it("never overwrites what the clinic saved", () => {
    const h = decode(
      renderToStaticMarkup(
        <Onboarding
          locale="tr"
          step="clinic"
          plans={[]}
          initial={{ name: "Kendi Adım", country: "TR", language: "tr", services: ["İmplant"] }}
          demo={{ token: "Ab3dE5fG7hJ", profile: { name: "Klinik Örnek", language: "tr" } }}
        />,
      ),
    );
    expect(h).toContain('value="Kendi Adım"');
    expect(h).not.toContain('value="Klinik Örnek"');
  });
});
