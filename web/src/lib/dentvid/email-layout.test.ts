import { describe, expect, it } from "vitest";
import { accentColor, COLORS, contrast, renderEmail } from "./email-layout";
import { readFileSync } from "node:fs";
import { COUNTRY_TIME_ZONE, clinicTimeZone, inSendWindow, SEND_FROM_HOUR, SEND_UNTIL_HOUR } from "./lifecycle-time";

describe("email template", () => {
  it("text colours meet WCAG AA (4.5:1) on white", () => {
    for (const c of [COLORS.ink, COLORS.body, COLORS.muted, COLORS.teal]) expect(contrast(c, "#ffffff"), c).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.muted, COLORS.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it("the clinic's colour becomes the accent, darkened until a white label passes 4.5:1", () => {
    for (const c of ["#FFD400", "f0f0f0", "#7FDBFF", "#2E7D6B", "#000000", "#ff0000"]) {
      const a = accentColor(c);
      expect(contrast(a, "#ffffff"), c).toBeGreaterThanOrEqual(4.5);
      expect(a).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(accentColor("#2E7D6B")).toBe("#2e7d6b"); // already fine: unchanged
    expect(accentColor(null)).toBe(COLORS.teal);
    expect(accentColor("red; background:url(x)")).toBe(COLORS.teal);
  });

  it("uses the clinic logo only over https, with alt text", () => {
    const base = { lang: "en", subject: "S", preheader: "P", blocks: [], footer: "F" };
    expect(renderEmail({ ...base, brand: { name: "Smile <Co>", logoUrl: "https://x.test/logo.png" } }).html).toMatch(/<img class="dv-logo" src="https:\/\/x\.test\/logo\.png" alt="Smile &lt;Co&gt;"/);
    expect(renderEmail({ ...base, brand: { name: "A", logoUrl: "javascript:alert(1)" } }).html).not.toContain("<img");
    expect(renderEmail({ ...base, brand: { name: "A", logoUrl: "http://x.test/l.png" } }).html).not.toContain("<img");
  });

  it("Arabic flips, links and codes stay left to right, and the text part mirrors the HTML", () => {
    const m = renderEmail({
      lang: "ar",
      subject: "س",
      preheader: "پ",
      title: "عنوان",
      blocks: [{ kind: "code", code: "123 456" }, { kind: "list", items: ["أ", "ب"] }],
      button: { label: "زر", url: "https://dentvideo.com/app" },
      footer: "تذييل",
      unsubscribe: { ask: "؟", label: "إلغاء", url: "https://dentvideo.com/api/dentvideo/unsubscribe?t=a" },
    });
    expect(m.html).toContain('<html lang="ar" dir="rtl">');
    expect(m.html).toContain('<body dir="rtl"');
    expect(m.html).toContain("text-align:right");
    expect(m.html).toMatch(/<span dir="ltr"[^>]*>123 456/);
    expect(m.html).toMatch(/href="https:\/\/dentvideo\.com\/app" dir="ltr"/);
    expect(m.text).toBe("عنوان\n\n123 456\n\n• أ\n• ب\n\nزر: https://dentvideo.com/app\n\n—\nتذييل\n؟ إلغاء: https://dentvideo.com/api/dentvideo/unsubscribe?t=a");
  });
});

describe("clinic clock (quiet hours)", () => {
  it("the country → zone map is the worker's, entry for entry", () => {
    const worker = readFileSync(new URL("../../../../worker/src/dentvid/timezone.ts", import.meta.url), "utf8");
    const entries = Object.fromEntries([...worker.slice(worker.indexOf("COUNTRY_TIME_ZONE"), worker.indexOf("};", worker.indexOf("COUNTRY_TIME_ZONE"))).matchAll(/^\s+([A-Z]{2}): "([^"]+)"/gm)].map((m) => [m[1], m[2]]));
    expect(Object.keys(entries).length).toBeGreaterThan(50);
    expect(COUNTRY_TIME_ZONE).toEqual(entries);
  });

  it("sends only between 08:00 and 20:00 local, across zones and DST", () => {
    expect([SEND_FROM_HOUR, SEND_UNTIL_HOUR]).toEqual([8, 20]);
    const tr = clinicTimeZone("TR");
    expect(inSendWindow(new Date("2026-11-09T04:59:00Z"), tr)).toBe(false); // 07:59 Istanbul
    expect(inSendWindow(new Date("2026-11-09T05:00:00Z"), tr)).toBe(true); // 08:00
    expect(inSendWindow(new Date("2026-11-09T16:59:00Z"), tr)).toBe(true); // 19:59
    expect(inSendWindow(new Date("2026-11-09T17:00:00Z"), tr)).toBe(false); // 20:00
    // Berlin: 08:00 is 07:00 UTC in winter, 06:00 UTC in summer.
    expect(inSendWindow(new Date("2026-01-12T07:00:00Z"), clinicTimeZone("DE"))).toBe(true);
    expect(inSendWindow(new Date("2026-07-13T06:00:00Z"), clinicTimeZone("DE"))).toBe(true);
    expect(inSendWindow(new Date("2026-01-12T06:30:00Z"), clinicTimeZone("DE"))).toBe(false);
    expect(clinicTimeZone("ZZ")).toBe("UTC");
    expect(clinicTimeZone("DE", "Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(clinicTimeZone("DE", "Not/AZone")).toBe("Europe/Berlin");
  });
});
