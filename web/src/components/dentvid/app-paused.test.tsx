import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/app",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { AppHomeView, SettingsView } from "./app-screens";
import { billingText } from "@/content/dentvideo-billing";
import { LOCALES } from "@/content/dentvideo";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import { loadClinicPlan, type ClinicPlan } from "@/lib/dentvid/plan";
import type { SupabaseClient } from "@supabase/supabase-js";

(globalThis as { React?: typeof React }).React = React;

const decode = (h: string) => h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const plans = dvAvailablePlans({});
const pausedByUs: ClinicPlan = { plan: "active", tier: "practice", renewsAt: null, canMake: false, adminPaused: true };
const disputed: ClinicPlan = { plan: "paused", tier: "practice", renewsAt: null, canMake: false };

const home = (locale: (typeof LOCALES)[number], plan: ClinicPlan, kind: "admin_paused" | "disputed") =>
  decode(
    renderToStaticMarkup(
      <AppHomeView locale={locale} plan={plan} items={[]} firstWeek={false} madeThisWeek={false} notice={null} plans={plans} currentWeek="2026-11-09" billingIssue={{ kind }} />,
    ),
  );

describe("states only DentVideo can resolve: an honest panel, a way to write to us, no plan picker", () => {
  it("paused by DentVideo (admin): says so in every language; no plan picker, no 'make this week'", () => {
    for (const locale of LOCALES) {
      const c = billingText(locale).copy.panel;
      const html = home(locale, pausedByUs, "admin_paused");
      expect(html, locale).toContain(c.adminPausedTitle);
      expect(html, locale).toContain(c.adminPausedBody.replace("{email}", "hello@dentvideo.com"));
      expect(html, locale).toContain('data-testid="billing-contact"');
      expect(html, locale).not.toContain("$29");
      expect(html, locale).not.toMatch(/\{\w+\}/);
    }
  });

  it("a payment under review (chargeback): says so in every language; no plan picker to buy a second subscription", () => {
    for (const locale of LOCALES) {
      const c = billingText(locale).copy.panel;
      const html = home(locale, disputed, "disputed");
      expect(html, locale).toContain(c.disputedTitle);
      expect(html, locale).toContain(c.disputedBody.replace("{email}", "hello@dentvideo.com"));
      expect(html, locale).not.toContain("$29");
    }
  });

  it("the settings screen shows the same panel instead of the plans", () => {
    const html = decode(renderToStaticMarkup(<SettingsView locale="de" plan={pausedByUs} plans={plans} selfServe billingIssue={{ kind: "admin_paused" }} />));
    expect(html).toContain(billingText("de").copy.panel.adminPausedTitle);
  });
});

describe("loadClinicPlan: the admin pause", () => {
  const db = (row: Record<string, unknown>, pauseErr = false) =>
    ({
      from: () => {
        let cols = "";
        const q = {
          select: (c: string) => ((cols = c), q),
          eq: () => q,
          maybeSingle: async () =>
            cols === "admin_paused_at" && pauseErr ? { data: null, error: { code: "42703", message: "column does not exist" } } : { data: row, error: null },
        };
        return q;
      },
    }) as unknown as SupabaseClient;

  it("an active clinic paused from the admin panel cannot make videos; before 0010 nothing changes", async () => {
    expect(await loadClinicPlan(db({ plan: "active", plan_tier: "starter", admin_paused_at: "2026-11-10T00:00:00Z" }), "c")).toMatchObject({ plan: "active", canMake: false, adminPaused: true });
    expect(await loadClinicPlan(db({ plan: "active", plan_tier: "starter", admin_paused_at: null }), "c")).toMatchObject({ canMake: true, adminPaused: false });
    expect(await loadClinicPlan(db({ plan: "active", plan_tier: "starter" }, true), "c")).toMatchObject({ canMake: true, adminPaused: false });
  });
});
