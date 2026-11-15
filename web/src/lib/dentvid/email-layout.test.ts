import { describe, expect, it } from "vitest";
import { COLORS, contrast, MARK_URL, renderEmail } from "./email-layout";
import { existsSync, readFileSync } from "node:fs";
import { lifecycleText } from "@/content/dentvideo-lifecycle";
import { COUNTRY_TIME_ZONE, clinicTimeZone, inSendWindow, SEND_FROM_HOUR, SEND_UNTIL_HOUR } from "./lifecycle-time";

describe("email template", () => {
  it("text colours meet WCAG AA (4.5:1) on the card and the page", () => {
    for (const c of [COLORS.ink, COLORS.body, COLORS.muted, COLORS.teal, COLORS.tealDeep]) expect(contrast(c, "#ffffff"), c).toBeGreaterThanOrEqual(4.5);
    for (const c of [COLORS.muted, COLORS.body]) expect(contrast(c, COLORS.page), c).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.tealDeep, COLORS.tint)).toBeGreaterThanOrEqual(4.5);
    // The cream label on the teal button.
    expect(contrast(COLORS.cream, COLORS.teal)).toBeGreaterThanOrEqual(4.5);
  });

  it("always looks like DentVideo: the hosted mark with alt text, the wordmark in text, teal button; a clinic's colour or logo never restyles it", () => {
    const base = { lang: "en", subject: "S", preheader: "P", blocks: [], button: { label: "Go", url: "https://dentvideo.com/app" }, footer: "F" };
    const m = renderEmail({ ...base, brand: { name: "Smile <Co>", logoUrl: "https://x.test/logo.png", color: "#ff0000" } });
    expect(m.html).toContain(`<img src="${MARK_URL}" alt="DentVideo" width="40" height="40"`);
    expect(MARK_URL).toBe("https://dentvideo.com/dentvideo/email/mark.png");
    expect(existsSync(new URL("../../../public/dentvideo/email/mark.png", import.meta.url))).toBe(true);
    expect(m.html).toMatch(/<span dir="ltr" class="dv-ink"[^>]*>Dent<span class="dv-mark"[^>]*>Video<\/span><\/span>/);
    expect(m.html).not.toContain("x.test/logo.png");
    expect(m.html).not.toContain("#ff0000");
    expect(m.html).toContain('bgcolor="#0f5c5c"');
    expect(m.html.match(/<img /g)).toHaveLength(1);
  });

  it("the headline uses the site's display serif (Georgia fallback), Mincho for Japanese, the sans for Arabic", () => {
    const h1 = (lang: string) => /<h1[^>]*style="([^"]*)"/.exec(renderEmail({ lang, subject: "S", preheader: "P", title: "T", blocks: [], footer: "F" }).html)![1];
    expect(h1("en")).toContain("font-family:'Instrument Serif',Georgia");
    expect(h1("de")).toContain("Georgia");
    expect(h1("ja")).toContain("Mincho");
    expect(h1("ar")).not.toContain("Georgia");
  });

  it("Arabic flips, links and codes stay left to right, and the text part mirrors the HTML", () => {
    const m = renderEmail({
      lang: "ar",
      subject: "س",
      preheader: "پ",
      title: "عنوان",
      blocks: [{ kind: "code", code: "123 456", note: "ملاحظة" }, { kind: "list", items: ["أ", "ب"] }],
      button: { label: "زر", url: "https://dentvideo.com/app" },
      footer: "تذييل",
      unsubscribe: { ask: "؟", label: "إلغاء", url: "https://dentvideo.com/api/dentvideo/unsubscribe?t=a" },
    });
    expect(m.html).toContain('<html lang="ar" dir="rtl"');
    expect(m.html).toContain('<body dir="rtl"');
    expect(m.html).toContain("text-align:right");
    expect(m.html).toMatch(/<span dir="ltr"[^>]*>123 456/);
    expect(m.html).toMatch(/href="https:\/\/dentvideo\.com\/app" dir="ltr"/);
    expect(m.text).toBe(
      "عنوان\n\n123 456\nملاحظة\n\n• أ\n• ب\n\nزر: https://dentvideo.com/app\n\nفريق DentVideo\n\n" +
        "لديكم سؤال؟ ردّوا على هذه الرسالة أو راسلونا على hello@dentvideo.com. يقرأ أحد أفراد فريقنا كل رسالة.\n\n" +
        '-- \nتذييل\n؟ إلغاء: https://dentvideo.com/api/dentvideo/unsubscribe?t=a\nDentVideo · hello@dentvideo.com · dentvideo.com\n"BLS AI AUTOMATION" DOO PODGORICA · Neznanih Junaka 60, 81000 Podgorica, الجبل الأسود',
    );
  });

  it("works in Outlook: a fixed-width ghost table, a VML button, Arial for text and Georgia for the headline", () => {
    const m = renderEmail({ lang: "en", subject: "S", preheader: "P", blocks: [], button: { label: "Go", url: "https://dentvideo.com/app" }, footer: "F" });
    expect(m.html).toContain('<!--[if mso]><table role="presentation" width="600"');
    expect(m.html).toMatch(/<v:roundrect [^>]*href="https:\/\/dentvideo\.com\/app"[^>]*fillcolor="#0f5c5c"/);
    expect(m.html).toContain("<!--[if !mso]><!-->");
    expect(m.html).toMatch(/<!--\[if mso\]><style>[^<]*font-family:Arial[^<]*h1\{font-family:Georgia/);
  });

  it("every email is signed DentVideo, ends with a human help line, DentVideo's address and the operator's registered name", () => {
    const base = { subject: "S", preheader: "P", blocks: [], footer: "F" };
    for (const lang of ["en", "tr", "de", "ar", "ja", "fr", "es", "pl"]) {
      const m = renderEmail({ ...base, lang });
      expect(m.html, lang).toContain('href="mailto:hello@dentvideo.com"');
      expect(m.text, lang).toContain("hello@dentvideo.com");
      expect(m.text, lang).toContain('"BLS AI AUTOMATION" DOO PODGORICA · Neznanih Junaka 60, 81000 Podgorica');
      expect(m.html, lang).toContain("&quot;BLS AI AUTOMATION&quot; DOO PODGORICA");
      expect(m.text, lang).toContain(lifecycleText(lang).copy.signoff);
      expect(m.text, lang).toMatch(/DentVideo/);
      // No personal names in the signature.
      expect(m.text, lang).not.toMatch(/Berke|Bulsu/);
    }
    expect(renderEmail({ ...base, lang: "en", help: false }).html).toContain('href="mailto:hello@dentvideo.com"'); // the footer still names the address
    expect(renderEmail({ ...base, lang: "en", help: false }).text).not.toContain("A person reads every message");
  });

  it("per-video actions are outlined, so the one filled button stays the main action", () => {
    const m = renderEmail({
      lang: "en",
      subject: "S",
      preheader: "P",
      blocks: [{ kind: "videos", items: [{ title: "T", href: "https://dentvideo.com/p", action: "Approve & share" }] }],
      button: { label: "Main", url: "https://dentvideo.com/a" },
      footer: "F",
    });
    expect(m.html).toMatch(/<a href="https:\/\/dentvideo\.com\/p" class="dv-chip"[^>]*border:1\.5px solid #0f5c5c/);
    expect(m.html.match(/class="dv-btnc" bgcolor/g)).toHaveLength(1);
  });

  it("a secondary action can be an outlined button, never a second filled one", () => {
    const m = renderEmail({
      lang: "en",
      subject: "S",
      preheader: "P",
      blocks: [],
      button: { label: "Main", url: "https://dentvideo.com/a" },
      secondary: { ask: "Or", label: "Second", url: "https://dentvideo.com/b", style: "button" },
      footer: "F",
    });
    expect(m.html.match(/class="dv-btnc" bgcolor/g)).toHaveLength(1);
    expect(m.html).toMatch(/class="dv-btn2"[^>]*border:1\.5px solid #0f5c5c/);
  });

  it("escapes everything that comes from outside: clinic names, URLs, codes", () => {
    const m = renderEmail({
      lang: "en",
      subject: "<b>S</b>",
      preheader: "P",
      hello: 'Hello "Smile" <script>x</script> & Co,',
      blocks: [{ kind: "code", code: "<1>" }, { kind: "videos", items: [{ title: "<i>", caption: "<img src=x>", href: 'https://dentvideo.com/p?a="b"', action: "<a>" }] }],
      button: { label: "Go", url: "https://dentvideo.com/a?x=<y>" },
      footer: "F",
    });
    expect(m.html).not.toMatch(/<script>|<b>S<\/b>|<i>|<img src=x>|<1>|="b"/);
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).toContain("&quot;Smile&quot;");
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
