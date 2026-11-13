import { describe, expect, it } from "vitest";
import {
  DEMO_PALETTE,
  DEMO_TOKEN_RE,
  clinicDemos,
  demoExpiry,
  demoPath,
  demoStartPath,
  demoStats,
  isDemoActive,
  isDemoToken,
  newDemoToken,
  paletteColour,
  parseDemoInput,
  toPublicDemo,
  type DemoRow,
} from "./demos";
import { attributionFrom } from "./attribution";
import { buildEventRow, parseClientEvent, sanitizeProps } from "./events";
import { demoTokenFrom } from "./demo-cookie";
import { clinicSources, type AdminEvent } from "./admin-metrics";
import { pathLocale } from "@/components/dentvid/chrome";
import { DEMO_COPY, demoMessages } from "@/content/dentvideo-demo";
import { LOCALES } from "@/content/dentvideo";

const NOW = new Date("2026-11-11T12:00:00Z");

const row = (o: Partial<DemoRow> = {}): DemoRow => ({
  token: "Ab3dE5fG7hJ",
  clinic_name: "Gülümse Diş Kliniği",
  city: "İzmir",
  country: "TR",
  language: "tr",
  colour: "#1f4e79",
  logo_path: "demos/Ab3dE5fG7hJ.png",
  note: "private note",
  campaign: "tr-launch",
  created_by: "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d",
  created_at: NOW.toISOString(),
  expires_at: demoExpiry(NOW),
  disabled: false,
  view_count: 3,
  last_viewed_at: null,
  ...o,
});

describe("demo tokens", () => {
  it("are 11 base62 characters, random and distinct", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const t = newDemoToken();
      expect(t).toMatch(/^[0-9A-Za-z]{11}$/);
      expect(isDemoToken(t)).toBe(true);
      seen.add(t);
    }
    expect(seen.size).toBe(2000);
  });

  it("use the whole alphabet (both cases and digits)", () => {
    const all = Array.from({ length: 400 }, () => newDemoToken()).join("");
    expect(all).toMatch(/[a-z]/);
    expect(all).toMatch(/[A-Z]/);
    expect(all).toMatch(/[0-9]/);
    expect(newDemoToken(12, () => 61)).toBe("zzzzzzzzzzzz");
    expect(newDemoToken(10, () => 0)).toBe("0000000000");
  });

  it("accepts only 10–12 base62 characters", () => {
    for (const ok of ["Ab3dE5fG7h", "Ab3dE5fG7hJ", "Ab3dE5fG7hJk"]) expect(isDemoToken(ok)).toBe(true);
    for (const bad of ["", "short", "Ab3dE5fG7hJkL", "Ab3dE5fG7h-", "../../etc/x", "Ab3dE5fG7h J", null, 42]) expect(isDemoToken(bad)).toBe(false);
    expect(DEMO_TOKEN_RE.test("Ab3dE5fG7hJ")).toBe(true);
  });
});

describe("expiry and switch-off", () => {
  it("lives 60 days by default", () => {
    expect(demoExpiry(NOW)).toBe("2027-01-10T12:00:00.000Z");
  });

  it("is live until it expires or is switched off", () => {
    expect(isDemoActive(row(), NOW)).toBe(true);
    expect(isDemoActive(row(), new Date(NOW.getTime() + 59 * 86_400_000))).toBe(true);
    expect(isDemoActive(row(), new Date(NOW.getTime() + 60 * 86_400_000))).toBe(false);
    expect(isDemoActive(row({ expires_at: "2026-11-11T11:59:59Z" }), NOW)).toBe(false);
    expect(isDemoActive(row({ disabled: true }), NOW)).toBe(false);
    expect(isDemoActive(row({ expires_at: "not a date" }), NOW)).toBe(false);
  });

  it("shows the public page nothing private (no note, creator or counters)", () => {
    const p = toPublicDemo(row());
    expect(p).toEqual({ token: "Ab3dE5fG7hJ", clinicName: "Gülümse Diş Kliniği", city: "İzmir", country: "TR", language: "tr", colour: "#1f4e79", hasLogo: true, campaign: "tr-launch" });
    expect(JSON.stringify(p)).not.toContain("private note");
    expect(toPublicDemo(row({ colour: null, language: "xx" }))).toMatchObject({ language: "en", colour: paletteColour("Gülümse Diş Kliniği") });
  });
});

describe("the admin form", () => {
  it("needs a clinic name and fills the defaults", () => {
    expect(parseDemoInput({ clinicName: "  ", language: "tr" })).toEqual({ ok: false, error: expect.stringMatching(/required/) });
    const r = parseDemoInput({ clinicName: " Gülümse  <b>Diş</b> ", language: "tr", country: "tr" });
    expect(r).toEqual({ ok: true, value: { clinicName: "Gülümse  b Diş /b".replace(/\s+/g, " "), country: "TR", language: "tr", colour: expect.any(String), campaign: "tr-launch" } });
    if (r.ok) expect(DEMO_PALETTE).toContain(r.value.colour);
  });

  it("checks language, colour, country, campaign and the logo URL scheme", () => {
    expect(parseDemoInput({ clinicName: "X", language: "it" }).ok).toBe(false);
    expect(parseDemoInput({ clinicName: "X", language: "tr", colour: "red" }).ok).toBe(false);
    expect(parseDemoInput({ clinicName: "X", language: "tr", colour: "1F4E79" })).toMatchObject({ ok: true, value: { colour: "#1f4e79" } });
    expect(parseDemoInput({ clinicName: "X", language: "tr", country: "T1" }).ok).toBe(false);
    expect(parseDemoInput({ clinicName: "X", language: "tr", campaign: "TR Launch!" }).ok).toBe(false);
    expect(parseDemoInput({ clinicName: "X", language: "tr", logoUrl: "http://clinic.example/logo.png" }).ok).toBe(false);
    expect(parseDemoInput({ clinicName: "X", language: "tr", logoUrl: "https://clinic.example/logo.png" })).toMatchObject({ ok: true, value: { logoUrl: "https://clinic.example/logo.png" } });
  });

  it("picks the same palette colour for the same clinic", () => {
    expect(paletteColour("Riverside Dental")).toBe(paletteColour(" riverside dental "));
    expect(DEMO_PALETTE).toContain(paletteColour("Anything"));
  });
});

describe("links", () => {
  it("puts the demo under its language's landing", () => {
    expect(demoPath("Ab3dE5fG7hJ", "tr")).toBe("/dentvideo/tr/d/Ab3dE5fG7hJ");
    expect(demoPath("Ab3dE5fG7hJ", "en")).toBe("/dentvideo/d/Ab3dE5fG7hJ");
    expect(demoPath("Ab3dE5fG7hJ", "ar")).toBe("/dentvideo/ar/d/Ab3dE5fG7hJ");
  });

  it("starts the sign-up with the demo and its source tags", () => {
    const href = demoStartPath({ token: "Ab3dE5fG7hJ", language: "tr", campaign: "tr-launch" });
    const u = new URL(href, "https://dentvideo.com");
    expect(u.pathname).toBe("/dentvideo/start");
    expect(Object.fromEntries(u.searchParams)).toEqual({
      lang: "tr",
      demo: "Ab3dE5fG7hJ",
      utm_source: "demo",
      utm_medium: "dm",
      utm_campaign: "tr-launch",
      utm_content: "Ab3dE5fG7hJ",
    });
  });

  it("speaks the demo's language in the header", () => {
    expect(pathLocale("/tr/d/Ab3dE5fG7hJ", {})).toBe("tr");
    expect(pathLocale("/dentvideo/ar/d/Ab3dE5fG7hJ", {})).toBe("ar");
    expect(pathLocale("/d/Ab3dE5fG7hJ", {})).toBe("en");
  });
});

describe("attribution: a payment is credited to the demo", () => {
  it("keeps the token (case and all) through the first-touch capture and the event allow-list", () => {
    const visit = attributionFrom("?utm_source=demo&utm_medium=dm&utm_campaign=tr-launch&utm_content=Ab3dE5fG7hJ", "", "dentvideo.com");
    expect(visit).toEqual({ utm_source: "demo", utm_medium: "dm", utm_campaign: "tr-launch", utm_content: "Ab3dE5fG7hJ" });
    expect(sanitizeProps("clinic_saved", { ...visit, demo: "Ab3dE5fG7hJ", country: "TR", language: "tr" })).toEqual({
      utm_source: "demo",
      utm_medium: "dm",
      utm_campaign: "tr-launch",
      utm_content: "Ab3dE5fG7hJ",
      demo: "Ab3dE5fG7hJ",
      country: "TR",
      language: "tr",
    });
    // Free text never gets in as content.
    expect(sanitizeProps("clinic_saved", { utm_content: "dr@clinic.tr" })).toEqual({});
    expect(attributionFrom("?utm_content=Ab3dE5fG7hJ", "", "dentvideo.com")).toEqual({});
  });

  it("lets a browser send the demo's play and click events, but not views", () => {
    expect(parseClientEvent(JSON.stringify({ name: "demo_preview_played", props: { demo: "Ab3dE5fG7hJ" } }))?.props).toEqual({ demo: "Ab3dE5fG7hJ" });
    expect(parseClientEvent(JSON.stringify({ name: "demo_cta_clicked", props: { demo: "Ab3dE5fG7hJ", where: "start" } }))?.props).toEqual({ demo: "Ab3dE5fG7hJ", where: "start" });
    expect(parseClientEvent(JSON.stringify({ name: "demo_viewed", props: { demo: "Ab3dE5fG7hJ" } }))).toBeNull();
    expect(buildEventRow({ name: "demo_viewed", props: { demo: "../x", utm_campaign: "tr-launch" } })?.props).toEqual({ utm_campaign: "tr-launch" });
  });

  it("credits sign-ups and payments per demo", () => {
    const at = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();
    const ev = (name: string, props: Record<string, unknown>, clinic_id: string | null, m: number): AdminEvent => ({ name, locale: "tr", props, clinic_id, created_at: at(m) });
    const A = "Ab3dE5fG7hJ";
    const B = "Kq9WmZ2xT4p";
    const events: AdminEvent[] = [
      ev("demo_preview_played", { demo: A }, null, 1),
      ev("demo_preview_played", { demo: A }, null, 2),
      ev("demo_cta_clicked", { demo: A, where: "start" }, null, 3),
      // Clinic c1 came through demo A (server-side demo prop) and paid.
      ev("clinic_saved", { utm_source: "demo", utm_medium: "dm", utm_campaign: "tr-launch", utm_content: A, demo: A }, "c1", 10),
      ev("payment_succeeded", { tier: "practice" }, "c1", 20),
      // Clinic c2: only the tab's tags (another tab lost the cookie) — still demo B.
      ev("clinic_saved", { utm_source: "demo", utm_content: B }, "c2", 30),
      // Clinic c3: an Instagram visitor; utm_content alone without utm_source=demo is not a demo.
      ev("clinic_saved", { utm_source: "instagram", utm_content: A }, "c3", 40),
      // A later demo never replaces the first.
      ev("clinic_saved", { demo: B }, "c1", 50),
      // Another demo's events do not leak into A's numbers.
      ev("demo_preview_played", { demo: "Zx7Cv3Bn6Mq" }, null, 5),
    ];
    expect(clinicDemos(events)).toEqual(new Map([["c1", A], ["c2", B]]));
    const stats = demoStats(
      [
        { token: A, view_count: 4 },
        { token: B, view_count: 1 },
      ],
      events,
      [
        { id: "c1", plan: "active", dodo_subscription_id: "sub_1" },
        { id: "c2", plan: "trial", dodo_subscription_id: null },
      ],
    );
    expect(stats.get(A)).toEqual({ views: 4, played: 2, ctaClicks: 1, signups: 1, paid: 1 });
    expect(stats.get(B)).toEqual({ views: 1, played: 0, ctaClicks: 0, signups: 1, paid: 0 });
    // On /admin the clinic's first touch is the demo source.
    expect(clinicSources(events).get("c1")).toBe("demo / dm / tr-launch");
  });
});

describe("the demo cookie", () => {
  it("prefers the URL, ignores malformed tokens", () => {
    expect(demoTokenFrom("Ab3dE5fG7hJ", "Kq9WmZ2xT4p")).toBe("Ab3dE5fG7hJ");
    expect(demoTokenFrom(undefined, "Kq9WmZ2xT4p")).toBe("Kq9WmZ2xT4p");
    expect(demoTokenFrom("bad token", "also/bad")).toBeNull();
  });
});

describe("the messages", () => {
  it("ask permission first, send the link only after, and state the starting price with no founding offer", () => {
    for (const l of LOCALES) {
      const m = demoMessages(l, "Klinik X", "https://dentvideo.com/x/d/Ab3dE5fG7hJ");
      expect(m.ask, l).toContain("Klinik X");
      expect(m.ask, l).not.toContain("https://");
      expect(m.ask, l).not.toMatch(/\{(name|url|sender)\}/);
      expect(m.link, l).toContain("https://dentvideo.com/x/d/Ab3dE5fG7hJ");
      // The only price is the starting one: Starter's $29.
      expect(m.link.match(/\d+(?=\s?\$|ドル|\s?دولار)|(?<=\$)\d+/g), l).toEqual(["29"]);
      expect(m.link, l).not.toMatch(/founding|kurucu|\bGründungs|fundador|fondateur|創業|المؤسسين|założyciel/i);
      expect(Object.keys(DEMO_COPY[l].dmLink), l).toEqual(["thanks", "facts", "close"]);
    }
  });

  it("never invents urgency", () => {
    const all = JSON.stringify(DEMO_COPY).toLowerCase();
    for (const w of ["hurry", "last chance", "only today", "limited time", "act now", "acele", "son şans", "sadece bugün", "jetzt zugreifen", "nur heute", "solo hoy", "última oportunidad"]) expect(all).not.toContain(w);
  });
});
