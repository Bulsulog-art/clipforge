import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_TEXT } from "./dentvideo-app";
import { LOCALES } from "./dentvideo";
import { SHOWCASE } from "./dentvideo-showcase";

// Regressions found by the live-site QA crawl (desktop 1440px + iPhone 390px, all 8 languages).
describe("site QA regressions", () => {
  it.each(LOCALES)("%s: the site footer speaks to the clinic itself — it approves, not 'your dentist'", (l) => {
    const footer = APP_TEXT[l].chrome.footer;
    // The reader is the dentist or the practice: "approved by your dentist" read as if written for patients.
    expect(footer, l).not.toMatch(/your dentist|Ihre[rm]? Zahnärzt|tu dentista|diş hekiminiz|votre dentiste|طبيب الأسنان لديكم|lekarza dentyst/i);
  });

  it("the Turkish rules note calls the reviewer 'denetçi', as everywhere else on the page", () => {
    expect(SHOWCASE.tr.rules.text).not.toMatch(/kontrolcü/);
    expect(SHOWCASE.tr.rules.text).toMatch(/denetçi/);
  });

  it("the drawn profile header lets a long clinic name wrap instead of cutting it (PL 'Stomatologiczny' on a phone)", () => {
    const src = readFileSync(join(__dirname, "../components/dentvid/landing-showcase.tsx"), "utf8");
    const name = src.match(/<p className="([^"]*)">\{name\}<\/p>/)?.[1] ?? "";
    expect(name).toContain("[overflow-wrap:anywhere]");
    expect(name).toContain("hyphens-auto");
    expect(name).toMatch(/(^| )line-clamp-3( |$)/);
  });

  it("Japanese list items, buttons and labels break between phrases, not inside words", () => {
    const css = readFileSync(join(__dirname, "../app/dentvideo/dentvideo.css"), "utf8");
    expect(css).toMatch(/\.dv :lang\(ja\) :is\(li, \.dv-btn, label[^)]*\) \{\s*word-break: auto-phrase;/);
  });
});
