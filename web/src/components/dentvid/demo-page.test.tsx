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
import { DEMO_COPY, fillDemo } from "@/content/dentvideo-demo";
import { DemoPage, demoMetadata } from "./demo-page";
import { Onboarding } from "./onboarding";
import type { PublicDemo } from "@/lib/dentvid/demos";

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
      for (const f of Object.values(DEMO_COPY[l].facts)) expect(h, l).toContain(f);
      expect(h, l).toContain(DEMO_COPY[l].cta);
      expect(h, l).toMatch(/href="[^"]*\/start\?lang=[a-z]{2}&demo=Ab3dE5fG7hJ&utm_source=demo&utm_medium=dm&utm_campaign=tr-launch&utm_content=Ab3dE5fG7hJ"/);
      expect(h, l).toContain('href="mailto:hello@dentvideo.com?subject=');
      expect(h, l).toContain(fillDemo(DEMO_COPY[l].privacy, { name: "Klinik Örnek" }));
      expect(h, l).not.toMatch(/\{(name|url|sender)\}/);
    }
  });

  it("states the starting price ($29, Starter) and no founding offer, in every language", () => {
    for (const l of LOCALES) {
      const h = decode(renderToStaticMarkup(<DemoPage locale={l} demo={demo(l)} />));
      expect(h, l).toContain(DEMO_COPY[l].facts.from);
      expect(DEMO_COPY[l].facts.from.match(/\d+/g), l).toEqual(["29"]);
      expect(Object.keys(DEMO_COPY[l].facts), l).not.toContain("founding");
      expect(h, l).not.toMatch(/\b99\b|990|founding|kurucu|\bGründungs|fundador|fondateur|創業|المؤسسين|założyciel/i);
    }
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
      await expect(Page()).rejects.toThrow("NEXT_NOT_FOUND");
    }
    // An admin without the table (or backend) sees the "apply 0009" notice, not an error.
    sessionUser = { id: "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d" };
    const h = renderToStaticMarkup(await Page());
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
