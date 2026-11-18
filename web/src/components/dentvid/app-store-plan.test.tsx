import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/app/settings",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { AppHomeView, SettingsView } from "./app-screens";
import { appStoreText } from "@/content/dentvideo-app-store";
import { accountText } from "@/content/dentvideo-account";
import { LOCALES } from "@/content/dentvideo";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import type { ClinicPlan } from "@/lib/dentvid/plan";

(globalThis as { React?: typeof React }).React = React;

/** The web for a clinic that subscribed in the iPhone app: "Managed in the App Store", never Dodo's portal or a plan switch. */

const decode = (h: string) => h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
const plans = dvAvailablePlans({});
const appleActive: ClinicPlan = { plan: "active", tier: "practice", renewsAt: "2026-12-17T10:00:00Z", canMake: true, source: "apple" };
const webActive: ClinicPlan = { ...appleActive, source: "dodo" };
const profile = { name: "Smile", country: "DE", language: "de" as const, services: ["Implantate"] };

describe("settings for an App Store plan", () => {
  it("shows 'Managed in the App Store' with Apple's link in every language, and no Dodo portal or plan switch", () => {
    for (const locale of LOCALES) {
      const a = appStoreText(locale);
      const t = accountText(locale);
      const html = decode(renderToStaticMarkup(<SettingsView locale={locale} profile={profile} plan={appleActive} plans={plans} selfServe billingIssue={null} />));
      expect(html, locale).toContain('data-testid="app-store-managed"');
      expect(html, locale).toContain(a.title);
      expect(html, locale).toContain(a.body);
      expect(html, locale).toContain("https://apps.apple.com/account/subscriptions");
      expect(html, locale).not.toContain(t.billingButton);
      // The plan-switch card (its Group row is unique to it).
      expect(html, locale).not.toContain('data-tier="group"');
    }
  });

  it("a web plan keeps the Dodo portal and plan switch exactly as before", () => {
    const t = accountText("de");
    const html = decode(renderToStaticMarkup(<SettingsView locale="de" profile={profile} plan={webActive} plans={plans} selfServe billingIssue={null} />));
    expect(html).toContain(t.billingButton);
    expect(html).toContain('data-tier="group"');
    expect(html).not.toContain('data-testid="app-store-managed"');
  });

  it("an App Store plan Apple could not renew: 'fix it on the iPhone', Apple's link, no plan picker", () => {
    const paused: ClinicPlan = { plan: "paused", tier: "practice", renewsAt: null, canMake: false, source: "apple" };
    for (const locale of LOCALES) {
      const a = appStoreText(locale);
      const html = decode(
        renderToStaticMarkup(<AppHomeView locale={locale} plan={paused} items={[]} firstWeek={false} madeThisWeek={false} notice={null} plans={plans} currentWeek="2026-11-16" billingIssue={{ kind: "app_store" }} />),
      );
      expect(html, locale).toContain(a.holdTitle);
      expect(html, locale).toContain('data-testid="app-store-manage"');
      expect(html, locale).not.toMatch(/\{\w+\}/);
    }
  });
});
