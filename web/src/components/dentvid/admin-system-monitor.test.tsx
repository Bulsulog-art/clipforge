import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/admin/system",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import * as React from "react";
import { AdminSystem, alertTone } from "./admin-screens";
import type { AdminLinks } from "./admin-ui";
import { demoData } from "@/app/dentvideo/dev/admin/fixtures";
import { fixtureSystemPage } from "@/app/dentvideo/dev/admin/fixtures-panel";
import { emptyMonitor } from "@/lib/dentvid/admin-system";

// The JSX here and in the components compiles to React.createElement (classic runtime in tests).
(globalThis as { React?: typeof React }).React = React;

const links: AdminLinks = { section: () => "/x", clinic: (id) => `/c/${id}`, form: () => ({ action: "/x", hidden: {} }) };
const common = { links, viewer: { email: "owner@dentvideo.com", csrf: "t" }, flash: null, back: "/x" };

describe("/admin/system shows the synthetic monitor", () => {
  const now = new Date("2026-11-12T10:07:00Z");
  const page = fixtureSystemPage(now, demoData(now));

  it("the last run's checks, the 24 h strip and the incidents", () => {
    const html = renderToStaticMarkup(<AdminSystem data={page} {...common} />);
    expect(html).toContain('id="monitor"');
    expect(html).toContain("Live checks");
    expect(html).toContain("Dodo checkout link");
    expect(html).toContain("checkout link goes to Dodo&#x27;s error page");
    expect(html).toContain("Sign-up page (/start)");
    expect(html).toContain('aria-label="Monitor runs, last 24 hours"');
    expect((html.match(/<li title=/g) ?? []).length).toBe(96);
    // Last night's sign-up outage, recovered; Dodo failing now.
    expect(html).toMatch(/<th scope="row" class="font-medium text-dv-ink">Sign-up<\/th>/);
    expect(html).toContain(">ongoing<");
  });

  it("before the first run, says how it starts", () => {
    const html = renderToStaticMarkup(<AdminSystem data={{ ...page, system: { ...page.system, monitor: emptyMonitor() } }} {...common} />);
    expect(html).toContain("No monitor run recorded yet");
  });

  it("alert badges colour the severities ops-alert actually uses", () => {
    expect(alertTone("urgent")).toBe("red");
    expect(alertTone("warning")).toBe("amber");
    expect(alertTone("good")).toBe("teal");
    expect(alertTone("high")).toBe("red");
    expect(alertTone("info")).toBe("grey");
  });
});
