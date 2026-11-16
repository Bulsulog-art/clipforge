import { describe, expect, it } from "vitest";
import * as React from "react";
import { createElement } from "react";
// The components use the classic JSX runtime in tests.
(globalThis as { React?: typeof React }).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { PlanStatus } from "@/components/dentvid/plan-panel";

/** docs/RELIABILITY.md F9: a cancelled plan still in its paid period says when it ends, in every language. */
describe("PlanStatus: cancelled but paid until", () => {
  it.each(LOCALES)("%s: 'ends on {date}' replaces 'renews on'", (locale) => {
    const t = appText(locale).billing;
    expect(t.ends).toContain("{date}");
    expect(t.ends).not.toBe(t.renews);
    const ending = renderToStaticMarkup(createElement(PlanStatus, { locale, state: "active", tier: "practice", renewsAt: "2026-12-10T00:00:00Z", endsAt: "2026-12-10T00:00:00Z" }));
    const renewing = renderToStaticMarkup(createElement(PlanStatus, { locale, state: "active", tier: "practice", renewsAt: "2026-12-10T00:00:00Z" }));
    const head = (s: string) => s.split("{date}")[0].trim();
    if (head(t.ends)) expect(ending).toContain(head(t.ends).replace(/&/g, "&amp;"));
    expect(ending).not.toBe(renewing);
  });
});
