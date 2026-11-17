import { describe, expect, it, vi } from "vitest";

// next/font only works inside Next's compiler: any font is a class name here.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES } from "@/content/dentvideo";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { ExamplesHub } from "@/components/dentvid/examples-page";
import { PlanPanel } from "@/components/dentvid/plan-panel";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import { quote } from "@/lib/dentvid/app-ui";

// Under vitest the components compile with the classic JSX runtime (tsconfig keeps "preserve" for Next).
(globalThis as { React?: typeof React }).React = React;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

/** Visual regressions found in the UI audit of every page × locale × width (360 to 1440). */
describe("DentVideo UI polish", () => {
  it("the app's plan picker sets prices like the landing: the sans with tabular figures, never the display serif", () => {
    for (const l of LOCALES) {
      const panel = html(createElement(PlanPanel, { locale: l, state: "trial", options: dvAvailablePlans({}) }));
      const prices = [...panel.matchAll(/<span[^>]*data-price="[^"]*"[^>]*>/g)].map((m) => m[0]);
      expect(prices.length, l).toBe(2);
      for (const p of prices) {
        expect(p, l).toContain("dv-price");
        expect(p, l).not.toContain("dv-display");
      }
    }
  });

  it("How it works: each step's rows do not stretch, so the three numbers and titles line up from md", () => {
    for (const l of LOCALES) {
      const page = html(createElement(DentVideoLanding, { locale: l }));
      const how = page.slice(page.indexOf('id="how"'));
      const steps = [...how.slice(0, how.indexOf("</ol>")).matchAll(/<li class="([^"]*)"/g)].map((m) => m[1]);
      expect(steps.length, l).toBe(3);
      for (const c of steps) expect(c.split(" "), l).toContain("content-start");
    }
  });

  it("example cards let a long first word wrap inside the card instead of pushing the arrow out", () => {
    for (const l of LOCALES) {
      const hub = html(createElement(ExamplesHub, { locale: l }));
      const titles = [...hub.matchAll(/<span class="([^"]*font-semibold leading-snug text-dv-ink[^"]*)"/g)].map((m) => m[1]);
      expect(titles.length, l).toBeGreaterThan(0);
      for (const c of titles) expect(c.split(" "), l).toEqual(expect.arrayContaining(["min-w-0", "break-words"]));
    }
  });

  it("French guillemets are held to their words by no-break spaces", () => {
    expect(quote("fr", "Bonjour")).toBe("« Bonjour »");
  });
});

describe("funnel account line", () => {
  it("keeps the separator dot on the sign-out button's line, never alone after a long address (de, 390 px)", async () => {
    const { FunnelAccount } = await import("@/components/dentvid/onboarding");
    for (const l of LOCALES) {
      const out = html(createElement(FunnelAccount, { locale: l, email: "e2e-monitor+a-very-long-address-1794948225413@bulsulabs.com" }));
      const group = out.match(/<span data-funnel-signout[^>]*>([\s\S]*?)<\/button><\/span>/);
      expect(group, l).not.toBeNull();
      expect(group![0], l).toContain("whitespace-nowrap");
      expect(group![1], l).toContain("·");
    }
  });
});
