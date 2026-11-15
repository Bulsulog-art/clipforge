import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES } from "./dentvideo-locales";
import { SUPPORT_COPY, companyLine, helpMailto, supportText } from "./dentvideo-support";
import { HelpContact } from "@/components/dentvid/help-contact";

// The components are compiled with the classic JSX runtime in tests (tsconfig "jsx": "preserve").
(globalThis as { React?: typeof React }).React = React;

function leaves(o: unknown, path = ""): [string, string][] {
  if (typeof o === "string") return [[path, o]];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const en = new Map(leaves(SUPPORT_COPY.en));
const ID = "00000000-0000-4000-8000-000000000001";

describe("support copy (email help line, Help & contact)", () => {
  it.each(LOCALES)("%s: same keys and placeholders as English, nothing empty, really translated", (lang) => {
    const mine = new Map(leaves(SUPPORT_COPY[lang]));
    expect([...mine.keys()]).toEqual([...en.keys()]);
    for (const [k, v] of mine) {
      expect(v.trim(), `${lang}.${k}`).not.toBe("");
      expect(placeholders(v), `${lang}.${k}`).toEqual(placeholders(en.get(k)!));
      if (lang !== "en" && v.length > 12 && k !== "email.country") expect(v, `${lang}.${k}`).not.toBe(en.get(k));
    }
  });

  it("the mailto carries the clinic name and id in the subject and body, in the clinic's language", () => {
    const href = helpMailto("tr", { id: ID, name: "Gülüş\nKlinik" });
    expect(href.startsWith("mailto:hello@dentvideo.com?subject=")).toBe(true);
    const q = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    expect(q.get("subject")).toBe(`DentVideo yardım · Gülüş Klinik · ${ID}`);
    expect(q.get("body")).toContain(`Klinik numarası: ${ID}`);
    // Unknown parts are left out, never shown as "-" or "{id}".
    const bare = new URLSearchParams(helpMailto("en", {}).split("?")[1]);
    expect(bare.get("subject")).toBe("DentVideo help");
    expect(bare.get("body")).not.toMatch(/\{id\}|Clinic ID/);
    expect(helpMailto("xx", { id: ID })).toContain(encodeURIComponent(`DentVideo help · ${ID}`));
  });

  it("the footer's company line names the operator and its address, country in the reader's language", () => {
    expect(companyLine("en")).toBe("DentVideo · BLS AI Automation DOO · Neznanih Junaka 60, 81000 Podgorica, Montenegro");
    expect(companyLine("tr")).toContain("Karadağ");
    expect(supportText("pt").lang).toBe("en");
  });

  it.each(LOCALES)("%s: the Help & contact card renders with its prefilled link and the address in sight", (lang) => {
    const html = renderToStaticMarkup(<HelpContact locale={lang} clinicId={ID} clinicName="Smile" />);
    expect(html).toContain('id="help"');
    expect(html).toContain(`dir="${lang === "ar" ? "rtl" : "ltr"}"`);
    expect(html).toContain(SUPPORT_COPY[lang].help.title.replace(/&/g, "&amp;"));
    expect(html).toMatch(/data-testid="dv-help-mailto"/);
    expect(html).toContain(encodeURIComponent(ID));
    expect(html).toContain(">hello@dentvideo.com</a>");
  });
});
