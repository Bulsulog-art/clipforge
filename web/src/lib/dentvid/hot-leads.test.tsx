import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryOpsStore, _resetLocalOnce, alerts, renderAlert, type Mail } from "./ops-alert";
import { _setOpsForTests } from "./ops-server";
import { HOT_WINDOW_MS, demoLastActivity, hotLeadCaps, hotLeadGateKey, hotStepForEvent, isBotUserAgent, isHotDemo, sortDemos, asDemoSort } from "./hot-leads";
import type { DemoRow } from "./demos";
import { AdminDemos, ago, type AdminDemoRow } from "@/components/dentvid/admin-demos";

/**
 * Hot-lead alerts: the owner hears once per demo and step when a prospect
 * (not a bot, not himself) opens a demo, plays its preview, clicks its CTA
 * or signs up from it. No real email: a fake transport collects the mails.
 */

// Components compile with the classic JSX runtime under vitest.
(globalThis as { React?: typeof React }).React = React;

const TOKEN = "Ab3dE5fG7hJ";
const NOW = new Date("2026-11-13T09:30:00Z");

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }) }));
let demoRow: DemoRow | null;
vi.mock("./demos-server", () => ({ loadDemoRow: async (t: string) => (demoRow && t === demoRow.token ? demoRow : null) }));
vi.mock("./auth", () => ({ dvSession: async () => ({ user: sessionUser, db: {} }) }));
let sessionUser: { id: string } | null = null;

const demo = (over: Partial<DemoRow> = {}): DemoRow => ({
  token: TOKEN,
  clinic_name: "Gülümse Diş Kliniği",
  city: "İzmir",
  country: "TR",
  language: "tr",
  colour: "#1f4e79",
  logo_path: null,
  note: null,
  campaign: "tr-launch",
  created_at: "2026-11-01T10:00:00Z",
  expires_at: "2026-12-31T10:00:00Z",
  disabled: false,
  view_count: 2,
  last_viewed_at: null,
  ...over,
});

/* ------------------------------------------------------------------ bots */

const BROWSERS = [
  // iPhone Safari, Android Chrome, desktop Chrome / Firefox / Edge, Samsung Internet.
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  // In-app browsers of real people (a prospect tapping the link inside Instagram, Facebook, Telegram, LinkedIn, X, LINE).
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 340.0.0.22.109 (iPhone15,2; iOS 17_5; tr_TR; tr; scale=3.00; 1179x2556; 617351457)",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.40.109;FBBV/640000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBLC/tr_TR]",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 Telegram-Android/11.2.3 (Google Pixel 7; Android 13; SDK 33; HIGH)",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.60",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.10.0",
];

const BOTS = [
  // Link previews (WhatsApp, Telegram, Slack, Facebook, X, LinkedIn, Discord, Skype, iMessage).
  "WhatsApp/2.24.21.80 A",
  "WhatsApp/2.2443.2 i",
  "TelegramBot (like TwitterBot)",
  "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  "Slack-ImgProxy (+https://api.slack.com/robots)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  "Twitterbot/1.0",
  "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
  "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5 skype-url-preview@microsoft.com",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0",
  "Viber/21.0 (Android)",
  // Search and AI crawlers (Google renders JavaScript).
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
  "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
  "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
  // Headless browsers, scanners and scripts.
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
  "Mozilla/4.0 (compatible; ms-office; MSOffice 16)",
  "curl/8.5.0",
  "python-requests/2.32.3",
  "Go-http-client/2.0",
  "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)",
  "",
];

describe("bot filtering", () => {
  it("lets real browsers and in-app browsers through", () => {
    for (const ua of BROWSERS) expect(isBotUserAgent(ua), ua).toBe(false);
  });
  it("stops link-preview fetchers, crawlers, headless browsers, scripts and a missing user agent", () => {
    for (const ua of BOTS) expect(isBotUserAgent(ua), ua).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
  });
});

/* ------------------------------------------------------------------ steps */

describe("which step an event is", () => {
  it("maps the demo page's play and CTA events; nothing else", () => {
    expect(hotStepForEvent("demo_preview_played", { demo: TOKEN })).toBe("played");
    expect(hotStepForEvent("demo_cta_clicked", { demo: TOKEN, where: "start" })).toBe("cta_start");
    expect(hotStepForEvent("demo_cta_clicked", { demo: TOKEN, where: "question" })).toBe("cta_question");
    expect(hotStepForEvent("demo_cta_clicked", {})).toBe("cta_start");
    expect(hotStepForEvent("landing_view", {})).toBeNull();
    expect(hotStepForEvent("demo_viewed", { demo: TOKEN })).toBeNull();
  });
  it("caps: 20 a day and 4 an hour by default, overridable", () => {
    expect(hotLeadCaps({})).toEqual({ perDay: 20, perHour: 4 });
    expect(hotLeadCaps({ DENTVID_HOT_LEAD_MAX_PER_DAY: "5", DENTVID_HOT_LEAD_MAX_PER_HOUR: "x" })).toEqual({ perDay: 5, perHour: 4 });
  });
});

/* ------------------------------------------------------------------ alerts */

let store: MemoryOpsStore;
let mails: Mail[];

describe("raising a hot-lead alert", () => {
  beforeEach(async () => {
    _resetLocalOnce();
    (await import("./hot-leads-server"))._resetHotLeadsForTests();
    store = new MemoryOpsStore();
    mails = [];
    _setOpsForTests(store, async (m) => (mails.push(m), true));
    demoRow = demo();
    sessionUser = null;
  });
  afterEach(() => {
    _setOpsForTests(undefined);
    delete process.env.DENTVID_HOT_LEAD_MAX_PER_DAY;
    delete process.env.DENTVID_HOT_LEAD_MAX_PER_HOUR;
    delete process.env.DENTVID_OWNER_ALERTS;
    delete process.env.DENTVIDEO_ADMIN_USER_IDS;
  });

  it("each trigger sends one good-news email with clinic, city, campaign, step, views, time, link and the next step", async () => {
    const { raiseHotLead } = await import("./hot-leads-server");
    expect(await raiseHotLead({ token: TOKEN, step: "viewed", demo: demoRow, views: 3, now: NOW })).toBe("sent");
    expect(await raiseHotLead({ token: TOKEN, step: "played", now: NOW })).toBe("sent");
    expect(await raiseHotLead({ token: TOKEN, step: "cta_start", now: NOW })).toBe("sent");
    expect(await raiseHotLead({ token: TOKEN, step: "cta_question", now: NOW })).toBe("sent");
    expect(await raiseHotLead({ token: TOKEN, step: "signup", clinicId: "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d", now: NOW })).toBe("sent");
    expect(mails).toHaveLength(5);
    const [view, played, start, question, signup] = mails;
    expect(view.subject).toBe("[DentVideo] GÜZEL HABER: Sıcak aday: Gülümse Diş Kliniği demoyu açtı / GOOD NEWS: Hot lead: Gülümse Diş Kliniği opened the demo");
    for (const s of ["Gülümse Diş Kliniği", "İzmir, TR", "tr-launch", "demoyu açtı / opened the demo", "Görüntülenme / Views: 3", "13 Nov, 12:30 (Istanbul)", `/tr/d/${TOKEN}`, "Bugün arayın", "WhatsApp"]) {
      expect(view.text, s).toContain(s);
    }
    expect(view.html).toContain("GÜZEL HABER · GOOD NEWS");
    expect(played.subject).toContain("önizlemeyi oynattı");
    expect(played.text).toContain("Görüntülenme / Views: 2");
    expect(start.subject).toContain("clicked “Start”");
    expect(question.text).toContain("Check your inbox");
    expect(signup.subject).toContain("signed up from the demo");
    expect(signup.text).toContain("Clinic ID: 0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d");
  });

  it("dedupes: one alert per demo and step — ever, not once a day", async () => {
    const { raiseHotLead } = await import("./hot-leads-server");
    expect(await raiseHotLead({ token: TOKEN, step: "viewed", now: NOW })).toBe("sent");
    expect(await raiseHotLead({ token: TOKEN, step: "viewed", now: NOW })).toBe("duplicate");
    const nextWeek = new Date(NOW.getTime() + 7 * 86_400_000);
    expect(await raiseHotLead({ token: TOKEN, step: "viewed", now: nextWeek })).toBe("duplicate");
    expect(mails).toHaveLength(1);
    expect(await store.get(hotLeadGateKey(TOKEN, "viewed"))).toBe("1");
    // Another demo is its own lead.
    demoRow = demo({ token: "Kq9WmZ2xT4p", clinic_name: "Riverside Dental" });
    expect(await raiseHotLead({ token: "Kq9WmZ2xT4p", step: "viewed", now: NOW })).toBe("sent");
    expect(mails).toHaveLength(2);
  });

  it("dedupes without Redis too (per process), so a store outage is never a storm", async () => {
    const { raiseHotLead } = await import("./hot-leads-server");
    store.down = true;
    expect(await raiseHotLead({ token: TOKEN, step: "played", now: NOW })).toBe("sent");
    expect(await raiseHotLead({ token: TOKEN, step: "played", now: NOW })).toBe("duplicate");
    expect(mails).toHaveLength(1);
  });

  it("caps per day and per hour; sign-ups always get through", async () => {
    const { raiseHotLead } = await import("./hot-leads-server");
    process.env.DENTVID_HOT_LEAD_MAX_PER_HOUR = "2";
    const tokens = ["Aa1Bb2Cc3Dd", "Ee4Ff5Gg6Hh", "Ii7Jj8Kk9Ll"];
    const results = [];
    for (const t of tokens) {
      demoRow = demo({ token: t });
      results.push(await raiseHotLead({ token: t, step: "viewed", now: NOW }));
    }
    expect(results).toEqual(["sent", "sent", "capped"]);
    // A capped step is not mailed later either.
    expect(await raiseHotLead({ token: tokens[2], step: "viewed", now: new Date(NOW.getTime() + 2 * 3600_000) })).toBe("duplicate");
    expect(await raiseHotLead({ token: tokens[2], step: "signup", now: NOW })).toBe("sent");

    process.env.DENTVID_HOT_LEAD_MAX_PER_HOUR = "100";
    process.env.DENTVID_HOT_LEAD_MAX_PER_DAY = "3";
    const later = new Date(NOW.getTime() + 3600_000);
    demoRow = demo({ token: "Mm1Nn2Oo3Pp" });
    expect(await raiseHotLead({ token: "Mm1Nn2Oo3Pp", step: "played", now: later })).toBe("capped");
    expect(mails).toHaveLength(3);
  });

  it("ignores unknown and switched-off demos, and gives the step back so a real one later still alerts", async () => {
    const { raiseHotLead } = await import("./hot-leads-server");
    demoRow = null;
    expect(await raiseHotLead({ token: TOKEN, step: "played", now: NOW })).toBe("no_demo");
    demoRow = demo({ disabled: true });
    expect(await raiseHotLead({ token: TOKEN, step: "played", now: NOW })).toBe("no_demo");
    expect(mails).toEqual([]);
    demoRow = demo();
    expect(await raiseHotLead({ token: TOKEN, step: "played", now: NOW })).toBe("sent");
  });

  it("a failed send gives the step back; the kill switch sends nothing", async () => {
    const { raiseHotLead } = await import("./hot-leads-server");
    _setOpsForTests(store, async () => false);
    expect(await raiseHotLead({ token: TOKEN, step: "cta_start", now: NOW })).toBe("failed");
    expect(await store.get(hotLeadGateKey(TOKEN, "cta_start"))).toBeNull();
    _setOpsForTests(store, async (m) => (mails.push(m), true));
    process.env.DENTVID_OWNER_ALERTS = "off";
    expect(await raiseHotLead({ token: TOKEN, step: "played", now: NOW })).toBe("disabled");
    expect(mails).toEqual([]);
  });

  it("knows a signed-in admin and a bot request", async () => {
    const { demoRequestSkip } = await import("./hot-leads-server");
    const req = (ua: string) => new Request("https://dentvideo.com/x", { headers: { "user-agent": ua } });
    expect(await demoRequestSkip(req("WhatsApp/2.24.21.80 A"))).toBe("bot");
    expect(await demoRequestSkip(req(BROWSERS[0]))).toBeNull();
    process.env.DENTVIDEO_ADMIN_USER_IDS = "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d";
    sessionUser = { id: "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d" };
    expect(await demoRequestSkip(req(BROWSERS[0]))).toBe("admin");
    sessionUser = { id: "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e" };
    expect(await demoRequestSkip(req(BROWSERS[0]))).toBeNull();
  });
});

describe("the alert email", () => {
  it("renders (sample saved for review when HOT_LEAD_SAMPLE is set)", () => {
    const mail = renderAlert(
      alerts.hotLead({
        token: TOKEN,
        step: "played",
        clinicName: "Gülümse Diş Kliniği",
        city: "İzmir",
        country: "TR",
        campaign: "tr-launch",
        views: 3,
        at: NOW.toISOString(),
        url: `https://dentvideo.com/tr/d/${TOKEN}`,
      }),
    );
    expect(mail.html).toContain("Sıcak aday: Gülümse Diş Kliniği önizlemeyi oynattı");
    expect(mail.html).toContain(`https://dentvideo.com/tr/d/${TOKEN}`);
    expect(mail.html).not.toContain("<script");
    if (process.env.HOT_LEAD_SAMPLE) fs.writeFileSync(process.env.HOT_LEAD_SAMPLE, mail.html);
  });

  it("escapes what the owner typed as the clinic name", () => {
    const mail = renderAlert(alerts.hotLead({ token: TOKEN, step: "viewed", clinicName: "<b>x</b>", campaign: "c", views: 1, at: NOW.toISOString(), url: "https://dentvideo.com/d/x" }));
    expect(mail.html).not.toContain("<b>x</b>");
  });
});

/* ------------------------------------------------------------- /admin/demos */

describe("/admin/demos: Hot and last activity", () => {
  const h = (hours: number) => new Date(NOW.getTime() - hours * 3600_000).toISOString();

  it("last activity is the latest of the counted view and the demo's events", () => {
    const last = demoLastActivity(
      [
        { token: "Aa1Bb2Cc3Dd", last_viewed_at: h(30) },
        { token: "Ee4Ff5Gg6Hh", last_viewed_at: null },
        { token: "Ii7Jj8Kk9Ll", last_viewed_at: h(5) },
      ],
      [
        { name: "demo_preview_played", props: { demo: "Aa1Bb2Cc3Dd" }, created_at: h(2) },
        { name: "demo_cta_clicked", props: { demo: "Ee4Ff5Gg6Hh" }, created_at: h(60) },
        { name: "clinic_saved", props: { demo: "Ii7Jj8Kk9Ll" }, created_at: h(10) },
        { name: "landing_view", props: { demo: "Ii7Jj8Kk9Ll" }, created_at: h(1) },
        { name: "demo_preview_played", props: { demo: "Zz0Zz0Zz0Zz" }, created_at: h(1) },
      ],
    );
    expect(last.get("Aa1Bb2Cc3Dd")).toBe(h(2));
    expect(last.get("Ee4Ff5Gg6Hh")).toBe(h(60));
    expect(last.get("Ii7Jj8Kk9Ll")).toBe(h(5));
    expect(last.has("Zz0Zz0Zz0Zz")).toBe(false);
  });

  it("hot = activity in the last 48 hours", () => {
    expect(isHotDemo(h(47.9), NOW)).toBe(true);
    expect(isHotDemo(new Date(NOW.getTime() - HOT_WINDOW_MS - 1000).toISOString(), NOW)).toBe(false);
    expect(isHotDemo(null, NOW)).toBe(false);
  });

  it("sorts hot demos first (most recent activity first), then the rest newest first; ?sort=new is newest first", () => {
    const rows = [
      { token: "old-cold", created_at: "2026-10-01T00:00:00Z", lastActivityAt: null },
      { token: "new-cold", created_at: "2026-11-12T00:00:00Z", lastActivityAt: h(72) },
      { token: "old-hot", created_at: "2026-10-02T00:00:00Z", lastActivityAt: h(1) },
      { token: "mid-hot", created_at: "2026-11-01T00:00:00Z", lastActivityAt: h(20) },
    ];
    expect(sortDemos(rows, "hot", NOW).map((r) => r.token)).toEqual(["old-hot", "mid-hot", "new-cold", "old-cold"]);
    expect(sortDemos(rows, "new", NOW).map((r) => r.token)).toEqual(["new-cold", "mid-hot", "old-hot", "old-cold"]);
    expect(asDemoSort("new")).toBe("new");
    expect(asDemoSort("anything")).toBe("hot");
  });

  it("the page shows the Hot badge, the last activity and the sort links", () => {
    const row = (token: string, last: string | null, over: Partial<DemoRow> = {}): AdminDemoRow => ({
      ...demo({ token, ...over }),
      url: `https://dentvideo.com/tr/d/${token}`,
      stats: { views: 1, played: 0, ctaClicks: 0, signups: 0, paid: 0 },
      lastActivityAt: last,
    });
    const html = renderToStaticMarkup(
      <AdminDemos
        available
        demos={[row("Aa1Bb2Cc3Dd", h(3), { clinic_name: "Hot Clinic" }), row("Ee4Ff5Gg6Hh", h(100), { clinic_name: "Cold Clinic" })]}
        now={NOW.toISOString()}
        backHref="/admin"
        sort="hot"
        sortHrefs={{ hot: "/admin/demos", new: "/admin/demos?sort=new" }}
      />,
    );
    expect(html.match(/data-testid="hot-badge"/g)).toHaveLength(1);
    expect(html).toMatch(/data-token="Aa1Bb2Cc3Dd" data-hot="1"/);
    expect(html).toContain("3 h ago");
    expect(html).toContain("4 d ago");
    expect(html).toContain("1 hot · 2 demos");
    expect(html).toContain('href="/admin/demos?sort=new"');
    expect(ago(h(0.2), NOW)).toBe("12 min ago");
  });
});
