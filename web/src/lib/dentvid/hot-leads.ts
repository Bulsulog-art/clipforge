/**
 * Hot-lead alerts for personalised demo links — the pure rules (no I/O):
 * which requests are bots, which step an event is, the caps, and the
 * "Hot" ranking on /admin/demos. hot-leads-server.ts does the sending.
 *
 * The owner hears about a demo the moment a prospect engages with it, so he
 * can follow up while they are warm: first open, first preview played,
 * first CTA click, and a sign-up from the demo. One alert per demo and step,
 * ever; at most DENTVID_HOT_LEAD_MAX_PER_DAY (20) and _PER_HOUR (4) a day /
 * an hour so a burst of opens can never crowd out an urgent alert (sign-ups
 * are rare and always alert). Never for bots, link-preview crawlers or a
 * signed-in admin looking at their own demo.
 */
import type { Env } from "./ops-alert";
import type { AdminEvent } from "./admin-metrics";

/* ------------------------------------------------------------------ bots */

/**
 * User agents that are not a person looking at the page: link-preview
 * fetchers (WhatsApp, Telegram, Slack, Facebook, X, LinkedIn, Discord,
 * Skype, Viber, iMessage's Applebot…), search and SEO crawlers, AI crawlers,
 * mail-security link scanners, headless browsers and HTTP libraries.
 *
 * Deliberately NOT matched: in-app browsers of real people (Instagram,
 * FBAN/FBAV Facebook app, LINE, Telegram's and WhatsApp's own web views) —
 * those carry a normal Mozilla/… browser string; the preview fetchers do not
 * (Viber, Mastodon and the like are caught by the non-browser rule).
 */
export const BOT_UA_PATTERNS: readonly RegExp[] = [
  // Link previews in chat apps and social networks.
  /^whatsapp\//i,
  /telegrambot/i,
  /slackbot|slack-imgproxy|slack-linkexpanding/i,
  /facebookexternalhit|facebookcatalog|facebot|meta-externalagent|meta-externalfetcher/i,
  /twitterbot/i,
  /linkedinbot/i,
  /discordbot/i,
  /skypeuripreview/i,
  /pinterestbot|pinterest\/0\./i,
  /redditbot/i,
  /embedly|iframely|vkshare|tumblr|outbrain|quora link preview|nuzzel|bitlybot|flipboard|w3c_validator/i,
  /kakaotalk-scrap|yeti\/|cardyb/i,
  // Search, SEO and AI crawlers (Google renders JavaScript, so it would fire the view beacon).
  /googlebot|google-inspectiontool|googleother|google-read-aloud|google-pagerenderer|adsbot-google|mediapartners-google|apis-google|feedfetcher-google|google web preview|storebot-google/i,
  /bingbot|bingpreview|msnbot|adidxbot/i,
  /applebot|yandex|baiduspider|duckduckbot|duckassistbot|sogou|exabot|seznambot|petalbot|bytespider|yisouspider/i,
  /ahrefs|semrush|mj12bot|dotbot|rogerbot|screaming frog|serpstat|dataforseo|blexbot|megaindex/i,
  /gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|perplexity|ccbot|cohere-ai|amazonbot|diffbot|youbot|timpibot|imagesiftbot/i,
  // Mail-security and link scanners (they open links in mails and DMs).
  /ms-office|msoffice|microsoft office|outlook-ios|safelinks|proofpoint|mimecast|barracuda|symantec|forcepoint|trendmicro|zscaler|virustotal|urlscan|netcraft|paloalto|checkpoint/i,
  // Headless browsers, monitoring and automation.
  /headlesschrome|headless|phantomjs|slimerjs|puppeteer|playwright|selenium|webdriver|lighthouse|chrome-lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|site24x7|datadog|newrelic|checkly/i,
  // HTTP libraries and command-line tools.
  /^(curl|wget|python|go-http-client|java\/|okhttp|axios|node-fetch|undici|libwww-perl|ruby|php|guzzlehttp|httpclient|apache-httpclient|postman|insomnia|httpie|scrapy|aiohttp|reqwest)/i,
  // Anything that calls itself a bot, crawler, spider or preview.
  /\b(bot|crawler|crawl|spider|scraper|preview|fetcher|monitor|checker|validator)\b/i,
  /[a-z]bot[/;\s)]/i,
];

/**
 * True for a request that is not a person: no user agent, a non-browser
 * agent (every real browser — and every in-app browser — starts with
 * "Mozilla/"), or any of BOT_UA_PATTERNS.
 */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  const v = (ua ?? "").trim();
  if (v.length < 10) return true;
  if (!/^mozilla\//i.test(v)) return true;
  return BOT_UA_PATTERNS.some((re) => re.test(v));
}

/* ------------------------------------------------------------------ steps */

export type HotStep = "viewed" | "played" | "cta_start" | "cta_question" | "signup";

/** The hot-lead step a browser demo event stands for, or null. */
export function hotStepForEvent(name: string, props: Record<string, unknown> | null | undefined): HotStep | null {
  if (name === "demo_preview_played") return "played";
  if (name === "demo_cta_clicked") return props?.where === "question" ? "cta_question" : "cta_start";
  return null;
}

/** Steps that are always alerted (rare and worth it): they skip the daily and hourly hot-lead caps. */
export const UNCAPPED_STEPS: readonly HotStep[] = ["signup"];

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
};

/** Hot-lead caps (env overrides in parentheses); 0 switches the capped steps off. */
export function hotLeadCaps(env: Env) {
  return {
    /** Hot-lead emails per UTC day (DENTVID_HOT_LEAD_MAX_PER_DAY). */
    perDay: num(env.DENTVID_HOT_LEAD_MAX_PER_DAY, 20),
    /** …and per clock hour, so a burst never uses the owner-alert hourly budget urgent alerts need (DENTVID_HOT_LEAD_MAX_PER_HOUR). */
    perHour: num(env.DENTVID_HOT_LEAD_MAX_PER_HOUR, 4),
  };
}

/** The once-ever gate for a demo and step (kept longer than a demo lives). */
export const hotLeadGateKey = (token: string, step: HotStep) => `dv:hotlead:${token}:${step}`;
export const HOT_LEAD_GATE_TTL_SEC = 70 * 86_400;
export const hotLeadDayKey = (now: Date) => `dv:hotlead:day:${now.toISOString().slice(0, 10)}`;
export const hotLeadHourKey = (now: Date) => `dv:hotlead:hour:${now.toISOString().slice(0, 13)}`;

/* ------------------------------------------------------------- /admin/demos */

/** Activity within this window makes a demo "Hot" on /admin/demos. */
export const HOT_WINDOW_MS = 48 * 3600_000;

/** Events that count as a prospect's activity on a demo (besides the stored last view). */
const ACTIVITY_EVENTS = new Set(["demo_viewed", "demo_preview_played", "demo_cta_clicked", "clinic_saved"]);

/**
 * The last moment anyone (not a bot or an admin — those are no longer
 * counted) did something with each demo: its last counted view, or its
 * latest preview play, CTA click or sign-up event.
 */
export function demoLastActivity(demos: { token: string; last_viewed_at: string | null }[], events: Pick<AdminEvent, "name" | "props" | "created_at">[]): Map<string, string | null> {
  const out = new Map<string, string | null>(demos.map((d) => [d.token, d.last_viewed_at ?? null]));
  for (const e of events) {
    if (!ACTIVITY_EVENTS.has(e.name)) continue;
    const t = e.props?.demo;
    if (typeof t !== "string" || !out.has(t)) continue;
    const prev = out.get(t);
    if (!prev || Date.parse(e.created_at) > Date.parse(prev)) out.set(t, e.created_at);
  }
  return out;
}

export function isHotDemo(lastActivityAt: string | null | undefined, now: Date): boolean {
  if (!lastActivityAt) return false;
  const t = Date.parse(lastActivityAt);
  return Number.isFinite(t) && t <= now.getTime() + 60_000 && now.getTime() - t <= HOT_WINDOW_MS;
}

export type DemoSort = "hot" | "new";
export const asDemoSort = (v: unknown): DemoSort => (v === "new" ? "new" : "hot");

/**
 * The order of /admin/demos. "hot" (the default): hot demos first, most
 * recent activity first; then the rest newest first. "new": newest first.
 */
export function sortDemos<T extends { created_at: string; lastActivityAt: string | null }>(rows: T[], sort: DemoSort, now: Date): T[] {
  const byCreated = (a: T, b: T) => b.created_at.localeCompare(a.created_at);
  if (sort === "new") return [...rows].sort(byCreated);
  return [...rows].sort((a, b) => {
    const ha = isHotDemo(a.lastActivityAt, now);
    const hb = isHotDemo(b.lastActivityAt, now);
    if (ha !== hb) return ha ? -1 : 1;
    if (ha && hb) return Date.parse(b.lastActivityAt!) - Date.parse(a.lastActivityAt!);
    return byCreated(a, b);
  });
}
