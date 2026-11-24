import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HELP_PATH, LOCALES } from "@/content/dentvideo-locales";
import { HELP_LINE, HELP_LINE_EMAIL, helpLineMailto, helpLineText, helpRef } from "@/content/dentvideo-help-line";
import { HelpLine } from "./help-line";

(globalThis as { React?: typeof React }).React = React;

/**
 * The support line under sign-up, clinic, checkout and billing errors: the same words in every
 * language (8), written natively, with the address and the help center as links, and nothing it
 * cannot keep (no response time, no promise to fix).
 */

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("help line copy", () => {
  it("exists in all eight languages, with the same placeholders", () => {
    expect(Object.keys(HELP_LINE).sort()).toEqual([...LOCALES].sort());
    for (const l of LOCALES) {
      const c = HELP_LINE[l];
      expect(placeholders(c.line), l).toEqual(["email", "help"]);
      expect(placeholders(c.subject), l).toEqual(["ref"]);
      expect(placeholders(c.body), l).toEqual(["message", "ref"]);
      expect(c.help.trim(), l).not.toBe("");
      expect(c.subject, l).toContain("DentVideo");
    }
  });

  it("reads as a careful person writes: no dashes, no exclamation marks, no response time, no promise to fix", () => {
    for (const l of LOCALES) {
      const all = Object.values(HELP_LINE[l]).join(" ");
      expect(all, l).not.toMatch(/—|\s–|–\s/);
      expect(all, l).not.toMatch(/[!！]/);
      // No hours, days or "same day" (only a person reads it, as every DentVideo email says).
      expect(HELP_LINE[l].line, l).not.toMatch(/\d/);
    }
    expect(HELP_LINE.en.line).not.toMatch(/\b(within|hours?|same day|24|guarantee|promise|fix it|sort it)\b/i);
    expect(HELP_LINE.en.line).toContain("A person reads every message");
    expect(HELP_LINE.en.help).toBe("help center");
  });

  it("each language says it in its own words, not English", () => {
    const en = HELP_LINE.en.line;
    for (const l of LOCALES.filter((x) => x !== "en")) expect(HELP_LINE[l].line, l).not.toBe(en);
    expect(HELP_LINE.de.line).toMatch(/schreiben Sie/);
    expect(HELP_LINE.tr.line).toMatch(/adresine yazın/);
    expect(HELP_LINE.pl.line).toMatch(/prosimy napisać/);
    expect(HELP_LINE.ar.line).toMatch(/راسلونا/);
    expect(HELP_LINE.ja.line).toMatch(/ご連絡ください/);
  });

  it("an unknown language falls back to English", () => {
    expect(helpLineText("xx")).toBe(HELP_LINE.en);
    expect(helpLineText(null)).toBe(HELP_LINE.en);
    expect(helpLineText("tr")).toBe(HELP_LINE.tr);
  });
});

describe("the mail it opens", () => {
  const parse = (href: string) => {
    const u = new URL(href);
    return { to: u.pathname, subject: u.searchParams.get("subject"), body: u.searchParams.get("body") ?? "" };
  };

  it("goes to hello@dentvideo.com with the reference in the subject and the screen's words in the body", () => {
    const m = parse(helpLineMailto("en", "checkout-502", "Could not open checkout.\nPlease try again."));
    expect(m.to).toBe(HELP_LINE_EMAIL);
    expect(m.subject).toBe("DentVideo help · checkout-502");
    expect(m.body).toContain("This is what I saw:\nCould not open checkout. Please try again.\n");
    expect(m.body).toContain("(Reference: checkout-502.");
    expect(m.body).not.toMatch(/\{\w+\}/);
  });

  it("without a message, the 'what I saw' part is left out in every language", () => {
    for (const l of LOCALES) {
      const m = parse(helpLineMailto(l, "signup-500"));
      expect(m.body, l).not.toMatch(/\{\w+\}/);
      expect(m.body, l).toContain("signup-500");
      expect(m.body.split("\n").length, l).toBeLessThan(HELP_LINE[l].body.split("\n").length);
    }
  });

  it("references are short and plain", () => {
    expect(helpRef("signup", 500)).toBe("signup-500");
    expect(helpRef("Checkout", "network")).toBe("checkout-network");
    expect(helpRef("billing portal")).toBe("billing-portal");
    expect(helpRef("")).toBe("app");
    expect(helpRef("x".repeat(80), 502).length).toBeLessThanOrEqual(40);
  });
});

describe("HelpLine", () => {
  for (const l of LOCALES) {
    it(`${l}: the line with the address and the help center as links`, () => {
      const html = renderToStaticMarkup(<HelpLine locale={l} code="signup-500" message="Boom" />);
      expect(html).toContain('data-help-line="signup-500"');
      expect(html).toContain(`href="mailto:${HELP_LINE_EMAIL}?subject=`);
      // The address reads left to right inside Arabic text too.
      expect(html).toContain(`<span dir="ltr">${HELP_LINE_EMAIL}</span>`);
      expect(html).toContain(`href="${HELP_PATH[l]}" target="_blank" rel="noopener"`);
      expect(html).toContain(`>${HELP_LINE[l].help.replace(/'/g, "&#x27;")}</a>`);
      expect(html).not.toMatch(/\{email\}|\{help\}/);
    });
  }
});

describe("wired where a failure is a dead end", () => {
  const src = (f: string) => fs.readFileSync(path.join(__dirname, f), "utf8");
  it("the clinic step and the preview step of the sign-up wizard show it under a save error", () => {
    const s = src("onboarding.tsx");
    expect(s.match(/<HelpLine locale=\{locale\} code="clinic-save" message=\{error\} \/>/g)).toHaveLength(2);
  });
  it("checkout, the billing portal, a plan change, the export and account deletion carry it", () => {
    expect(src("plan-panel.tsx")).toMatch(/<HelpLine locale=\{locale\} code=\{errorCode\} message=\{error\} \/>/);
    const a = src("account-panel.tsx");
    for (const code of ["billing-portal", "plan-change", "export", "account-delete"]) expect(a, code).toContain(`help={{ locale, code: "${code}" }}`);
  });
});
