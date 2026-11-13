import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/app/record",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { RecordView } from "./app-screens";
import type { ClinicPlan } from "@/lib/dentvid/plan";

(globalThis as { React?: typeof React }).React = React;

const starter: ClinicPlan = { plan: "active", tier: "starter", renewsAt: null, canMake: true };

describe("record screen for a Starter clinic", () => {
  it("with self-serve billing, the upgrade goes to Settings → Plan and billing (no email round trip)", () => {
    const html = renderToStaticMarkup(<RecordView locale="de" cards={[]} plan={starter} selfServe />);
    expect(html).toContain('data-testid="starter-upgrade"');
    expect(html).toMatch(/href="[^"]*\/app\/settings#billing-title"/);
    expect(html).toContain("Zu Practice wechseln");
    expect(html).not.toContain("mailto:");
  });

  it("without self-serve billing it keeps the email path", () => {
    const html = renderToStaticMarkup(<RecordView locale="en" cards={[]} plan={starter} />);
    expect(html).toContain("mailto:");
    expect(html).not.toContain('data-testid="starter-upgrade"');
  });
});
