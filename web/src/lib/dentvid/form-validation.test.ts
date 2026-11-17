import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/start",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { fieldError } from "./form-validation";
import { VALIDATION_TEXT, validationText } from "@/content/dentvideo-validation";
import { LOCALES } from "@/content/dentvideo";
import { StartForm } from "@/components/dentvid/start-form";
import { ClinicForm } from "@/components/dentvid/clinic-form";

(globalThis as { React?: typeof React }).React = React;

const en = validationText("en");

describe("field messages", () => {
  it("an empty required field — spaces count as empty", () => {
    expect(fieldError({ value: "", required: true }, en)).toBe(en.required);
    expect(fieldError({ value: "   ", required: true, valid: true }, en)).toBe(en.required);
    expect(fieldError({ value: "", required: false, type: "url" }, en)).toBeNull();
  });

  it("an address that is not an email, a link that is not a web address", () => {
    expect(fieldError({ value: "dr.weber", type: "email", typeMismatch: true, valid: false }, en)).toBe(en.email);
    expect(fieldError({ value: "praxis.de", type: "url", typeMismatch: true, valid: false }, en)).toBe(en.url);
    expect(fieldError({ value: "dr@praxis.de", type: "email", valid: true }, en)).toBeNull();
  });

  it("too short, counted here (browsers flag it only after typing), with the minimum in the message", () => {
    expect(fieldError({ value: "1234567", type: "password", minLength: 8, valid: true }, en)).toBe("Use at least 8 characters.");
    expect(fieldError({ value: "12345678", type: "password", minLength: 8, valid: true }, en)).toBeNull();
    expect(fieldError({ value: "1234567", minLength: 8 }, validationText("ja"))).toBe("8文字以上で入力してください。");
  });

  it("a code that is not digits, and any other refusal", () => {
    expect(fieldError({ value: "12a", pattern: "[0-9]*", patternMismatch: true, valid: false }, en)).toBe(en.digits);
    expect(fieldError({ value: "x", pattern: "[a-z]{3}", patternMismatch: true, valid: false }, en)).toBe(en.invalid);
    expect(fieldError({ value: "x", valid: false }, en)).toBe(en.invalid);
  });

  it.each(LOCALES)("%s: every message is written for that language", (l) => {
    const t = VALIDATION_TEXT[l];
    for (const [k, v] of Object.entries(t)) expect(v.trim().length, `${l}.${k}`).toBeGreaterThan(0);
    expect(t.tooShort).toContain("{n}");
    expect(t.url).toContain("https://");
    if (l !== "en") for (const k of ["required", "email", "tooShort", "digits", "invalid"] as const) expect(t[k], `${l}.${k}`).not.toBe(VALIDATION_TEXT.en[k]);
    // Never the browser's own words.
    expect(Object.values(t).join(" ")).not.toMatch(/Please fill out this field/);
  });
});

describe("the funnel forms validate themselves", () => {
  it.each(LOCALES)("%s: sign-up and sign-in forms are noValidate, with every checked field marked", (l) => {
    for (const mode of ["signup", "signin"] as const) {
      const html = renderToStaticMarkup(React.createElement(StartForm, { locale: l, remember: false, initialMode: mode }));
      const form = html.slice(html.indexOf("<form"), html.indexOf(">", html.indexOf("<form")));
      expect(form, `${l} ${mode}`).toContain("noValidate");
      expect(html).toContain('data-field="email"');
      expect(html).toContain('data-field="password"');
    }
  });

  it("the clinic form (settings) too", () => {
    const html = renderToStaticMarkup(React.createElement(ClinicForm, { locale: "tr", initial: { name: "" } }));
    expect(html.slice(html.indexOf("<form"), html.indexOf(">", html.indexOf("<form")))).toContain("noValidate");
    for (const f of ["name", "services", "bookingUrl"]) expect(html).toContain(`data-field="${f}"`);
  });
});
