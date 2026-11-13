import { randomBytes } from "node:crypto";
import { alerts, cleanError, type DeliverResult, type OpsStore, type OwnerAlert } from "./ops-alert.js";

/**
 * The synthetic monitor: every 15 minutes the worker looks at the live site
 * the way a clinic would — from the server side, with plain HTTP — so the
 * owner hears about a broken page, sign-up, Liman or checkout within half an
 * hour, before a clinic writes in.
 *
 *   pages        GET /, /tr, /start, /privacy and a guide: 200 + an expected text.
 *   signup       POST /api/dentvideo/signup with a fresh monitor address
 *                (e2e-monitor+<ts>@bulsulabs.com) → a dv-auth session cookie
 *                that Liman accepts (its token was issued BY LIMAN — the
 *                "browser signs in to the wrong project" class of bug), then
 *                the account is deleted with the service role. The web app
 *                never emails e2e-monitor addresses and, with the monitor
 *                token (DENTVIDEO_MONITOR_TOKEN on both sides), skips the
 *                per-IP limits and Turnstile for them.
 *   cleanup      a monitor account that could not be deleted is retried next run.
 *   liman-auth   GET <liman>/auth/v1/health.
 *   liman-rest   GET <liman>/rest/v1/dentvid_clinics?select=id&limit=1.
 *   dodo         the hosted checkout link answers with a checkout session
 *                (not Dodo's not-found page). Hourly, not every run: each
 *                call opens a (harmless, abandoned) checkout session in Dodo.
 *
 * Results go to Redis for /dentvideo/admin/system:
 *   dv:monitor:last      the last run (JSON MonitorRun)
 *   dv:monitor:history   capped list of compact runs (newest last, ~3 days)
 *   dv:monitor:state     per-check consecutive failures, since, alerted-at
 *   dv:monitor:cleanup   monitor user ids still to delete
 *
 * Alerts: a check that fails twice in a row raises ONE email naming what
 * failed and since when; while it stays down, a reminder every 6 hours; when
 * it passes again, one "recovered" email. Every email also goes through the
 * shared ops-alert gates (per-incident key, hourly cap, kill switch).
 *
 * Everything outside (fetch, clock, store, alert) is injected, so the logic
 * is unit-tested with fakes (synthetic.test.ts).
 */

export const MONITOR_SCHEDULE = { pattern: "*/15 * * * *", tz: "UTC" } as const;
export const MONITOR_LAST_KEY = "dv:monitor:last";
export const MONITOR_HISTORY_KEY = "dv:monitor:history";
export const MONITOR_STATE_KEY = "dv:monitor:state";
export const MONITOR_CLEANUP_KEY = "dv:monitor:cleanup";
/** 3 days of 15-minute runs. */
export const HISTORY_MAX = 288;
const KEEP_SEC = 7 * 86_400;

/** Consecutive failures before the owner is told. */
export const FAILS_TO_ALERT = 2;
/** While a check stays down, a reminder this often. */
export const REMINDER_MS = 6 * 3_600_000;

export type Env = Record<string, string | undefined>;
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type CheckResult = {
  name: string;
  label: string;
  ok: boolean;
  ms: number;
  status?: number;
  error?: string;
  /** Not run this time (no config, or not due) — leaves the check's state as it was. */
  skipped?: string;
};

export type MonitorRun = { at: string; ms: number; ok: boolean; results: CheckResult[] };
/** One line of history: when, how long, and which checks failed. */
export type HistoryEntry = { at: string; ms: number; ok: boolean; failed: string[]; ran: number };

export type CheckState = { fails: number; since: string | null; lastError: string | null; lastOkAt: string | null; alertedAt: string | null; lastRunAt: string | null };
export type MonitorState = { checks: Record<string, CheckState> };

export type PageCheck = { name: string; label: string; path: string; expect: RegExp[] };

export type MonitorConfig = {
  baseUrl: string;
  pages: PageCheck[];
  monitorToken: string | null;
  monitorEmailDomain: string;
  limanUrl: string | null;
  limanServiceKey: string | null;
  dodoLink: string | null;
  dodoEveryMs: number;
  timeoutMs: number;
};

/** What each check is called in an email, and what the owner should look at. */
export const CHECK_INFO: Record<string, { label: string; hint: string }> = {
  "page-home": { label: "Home page (/)", hint: "Open dentvideo.com on your phone. If pages are down: the web app container in Coolify, the server, Cloudflare/DNS." },
  "page-tr": { label: "Turkish page (/tr)", hint: "Open dentvideo.com on your phone. If pages are down: the web app container in Coolify, the server, Cloudflare/DNS." },
  "page-start": { label: "Sign-up page (/start)", hint: "Open dentvideo.com/start in a private tab. If it is down: the web app container in Coolify and its logs." },
  "page-privacy": { label: "Privacy page (/privacy)", hint: "Open dentvideo.com/privacy. If only this page fails, check the last deploy." },
  "page-guide": { label: "Guide page", hint: "Open the guide in a browser. If only this page fails, check the last deploy (content/guides)." },
  signup: {
    label: "Sign-up",
    hint: "Sign up yourself on dentvideo.com/start in a private tab. Check the web app logs for “[dentvideo signup]”, Liman's auth container, and that DENTVIDEO_MONITOR_TOKEN matches on web and worker.",
  },
  cleanup: { label: "Monitor account clean-up", hint: "Monitor test accounts (e2e-monitor+…) could not be deleted; they are retried every run. If it persists, check DENTVID_SERVICE_ROLE_KEY on the worker and delete them in Liman." },
  "liman-auth": { label: "Liman auth", hint: "Liman (self-hosted Supabase) auth is not answering: check its kong and auth containers on the server. Nobody can sign in meanwhile." },
  "liman-rest": { label: "Liman database API", hint: "Liman's REST API / database is not answering: check its kong, rest and db containers (disk space too)." },
  dodo: { label: "Dodo checkout link", hint: "Open the checkout link yourself; check status.dodopayments.com and that the product still exists (and is active) in Dodo." },
};
const info = (name: string) => CHECK_INFO[name] ?? { label: name, hint: "See the worker logs." };

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export function monitorConfig(env: Env = process.env): MonitorConfig {
  const live = (env.DODO_ENVIRONMENT ?? "live").trim() !== "test";
  const product = env.DENTVIDEO_DODO_PRODUCT_STARTER_MONTHLY?.trim() || "pdt_0NrVahwZsINvy3TNz2H35";
  const dodo = env.DENTVIDEO_MONITOR_DODO_LINK?.trim();
  const guide = env.DENTVIDEO_MONITOR_GUIDE_PATH?.trim() || "/guides/instagram-videos-for-dentists";
  return {
    baseUrl: trimSlash(env.DENTVIDEO_MONITOR_URL?.trim() || env.DENTVIDEO_APP_URL?.trim() || "https://dentvideo.com"),
    pages: [
      { name: "page-home", label: info("page-home").label, path: "/", expect: [/DentVideo/, /patient-education videos/i] },
      { name: "page-tr", label: info("page-tr").label, path: "/tr", expect: [/DentVideo/, /diş klinikleri/i] },
      { name: "page-start", label: info("page-start").label, path: "/start", expect: [/DentVideo/, /type="password"/] },
      { name: "page-privacy", label: info("page-privacy").label, path: "/privacy", expect: [/Privacy Policy/] },
      { name: "page-guide", label: info("page-guide").label, path: guide, expect: [/DentVideo/, /<h1[\s>]/] },
    ],
    monitorToken: env.DENTVIDEO_MONITOR_TOKEN?.trim() || null,
    monitorEmailDomain: env.DENTVIDEO_MONITOR_EMAIL_DOMAIN?.trim() || "bulsulabs.com",
    limanUrl: env.DENTVID_SUPABASE_URL?.trim() ? trimSlash(env.DENTVID_SUPABASE_URL.trim()) : null,
    limanServiceKey: env.DENTVID_SERVICE_ROLE_KEY?.trim() || null,
    dodoLink: dodo === "off" ? null : dodo || `${live ? "https://checkout.dodopayments.com" : "https://test.checkout.dodopayments.com"}/buy/${product}?quantity=1`,
    dodoEveryMs: Math.max(15, Number(env.DENTVIDEO_MONITOR_DODO_EVERY_MIN) || 60) * 60_000,
    timeoutMs: 20_000,
  };
}

/** The address a monitor run signs up with. The web app never emails e2e-monitor addresses. */
export const monitorEmail = (now: Date, domain: string, rand = randomBytes(3).toString("hex")) => `e2e-monitor+${now.getTime()}${rand}@${domain}`;

/* --------------------------------------------------------------- checks */

const UA = "DentVideo-Monitor/1 (+synthetic check)";

async function timed(name: string, run: () => Promise<Omit<CheckResult, "name" | "label" | "ms">>, now: () => number): Promise<CheckResult> {
  const t0 = now();
  try {
    const r = await run();
    return { name, label: info(name).label, ms: now() - t0, ...r };
  } catch (e) {
    const err = e as Error;
    const msg = err.name === "TimeoutError" || err.name === "AbortError" ? "timed out" : cleanError(e);
    return { name, label: info(name).label, ms: now() - t0, ok: false, error: msg };
  }
}

export async function checkPage(f: FetchLike, cfg: MonitorConfig, p: PageCheck) {
  const res = await f(`${cfg.baseUrl}${p.path}`, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(cfg.timeoutMs) });
  if (res.status !== 200) return { ok: false, status: res.status, error: `HTTP ${res.status} for ${p.path}` };
  const body = (await res.text()).slice(0, 3_000_000);
  const missing = p.expect.filter((re) => !re.test(body));
  if (missing.length) return { ok: false, status: 200, error: `page loaded but expected text is missing (${missing.map((r) => r.source).join(", ")})` };
  return { ok: true, status: 200 };
}

/** The dv-auth cookie (possibly split into dv-auth.0, dv-auth.1 …) from Set-Cookie headers, joined. */
export function sessionCookie(setCookies: string[], name = "dv-auth"): string | null {
  const parts = new Map<number, string>();
  for (const c of setCookies) {
    const m = /^([^=;]+)=([^;]*)/.exec(c.trim());
    if (!m) continue;
    const [, k, v] = m;
    if (/max-age=0\b/i.test(c) || v === "") continue;
    if (k === name) parts.set(-1, v);
    else if (k.startsWith(`${name}.`) && /^\d+$/.test(k.slice(name.length + 1))) parts.set(Number(k.slice(name.length + 1)), v);
  }
  if (!parts.size) return null;
  if (parts.has(-1)) return parts.get(-1)!;
  return [...parts.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v).join("");
}

/** @supabase/ssr stores the session as "base64-<base64url JSON>" (or raw JSON in older versions). */
export function decodeSession(cookie: string): { access_token?: string; user?: { id?: string; email?: string } } | null {
  try {
    const v = decodeURIComponent(cookie);
    const json = v.startsWith("base64-") ? Buffer.from(v.slice(7), "base64url").toString("utf8") : v;
    const s = JSON.parse(json);
    return s && typeof s === "object" ? s : null;
  } catch {
    return null;
  }
}

export function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const hostOf = (u: string) => {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return "";
  }
};

const limanHeaders = (cfg: MonitorConfig, bearer?: string) => ({
  apikey: cfg.limanServiceKey ?? "",
  authorization: `Bearer ${bearer ?? cfg.limanServiceKey ?? ""}`,
  "user-agent": UA,
});

/** Delete a monitor login with the service role (GoTrue admin API). True when gone. */
export async function deleteMonitorUser(f: FetchLike, cfg: MonitorConfig, userId: string): Promise<boolean> {
  if (!cfg.limanUrl || !cfg.limanServiceKey) return false;
  const res = await f(`${cfg.limanUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", headers: limanHeaders(cfg), signal: AbortSignal.timeout(cfg.timeoutMs) });
  return res.ok || res.status === 404;
}

type SignupOutcome = Omit<CheckResult, "name" | "label" | "ms"> & { userId?: string | null };

export async function checkSignup(f: FetchLike, cfg: MonitorConfig, email: string, password: string): Promise<SignupOutcome> {
  const res = await f(`${cfg.baseUrl}/api/dentvideo/signup`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: cfg.baseUrl,
      "user-agent": UA,
      ...(cfg.monitorToken ? { "x-dv-monitor": cfg.monitorToken } : {}),
    },
    body: JSON.stringify({ email, password, website: "", elapsedMs: 6000, locale: "en" }),
    redirect: "manual",
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; signedIn?: boolean; existing?: boolean; userId?: string; error?: string };
  const userId = typeof body.userId === "string" ? body.userId : null;
  if (res.status !== 200 || !body.ok) {
    const hint = res.status === 429 ? " — rate limited: is DENTVIDEO_MONITOR_TOKEN the same on web and worker?" : "";
    return { ok: false, status: res.status, error: `sign-up answered HTTP ${res.status}${body.error ? ` “${cleanError(body.error)}”` : ""}${hint}`, userId };
  }
  if (body.existing) return { ok: false, status: 200, error: "sign-up said the fresh monitor address already exists", userId };
  if (!body.signedIn) return { ok: false, status: 200, error: "account created but the server did not sign it in (signedIn: false) — phones would fall back to the browser sign-in", userId };
  const raw = sessionCookie(typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []);
  if (!raw) return { ok: false, status: 200, error: "no session cookie (dv-auth) on the sign-up response", userId };
  const session = decodeSession(raw);
  const token = session?.access_token;
  const sid = session?.user?.id ?? null;
  if (!token) return { ok: false, status: 200, error: "the dv-auth cookie holds no readable session", userId: userId ?? sid };
  const claims = jwtPayload(token);
  const iss = typeof claims?.iss === "string" ? claims.iss : "";
  if (cfg.limanUrl && hostOf(iss) !== hostOf(cfg.limanUrl)) {
    return { ok: false, status: 200, error: `the session was issued by ${hostOf(iss) || "an unknown issuer"}, not Liman (${hostOf(cfg.limanUrl)}) — wrong Supabase project`, userId: userId ?? sid };
  }
  if (cfg.limanUrl && cfg.limanServiceKey) {
    const who = await f(`${cfg.limanUrl}/auth/v1/user`, { headers: limanHeaders(cfg, token), signal: AbortSignal.timeout(cfg.timeoutMs) });
    if (!who.ok) return { ok: false, status: who.status, error: `Liman refused the new session (HTTP ${who.status})`, userId: userId ?? sid };
    const u = (await who.json().catch(() => ({}))) as { id?: string; email?: string };
    if ((u.email ?? "").toLowerCase() !== email.toLowerCase()) return { ok: false, status: 200, error: "the session belongs to a different account", userId: userId ?? sid };
    return { ok: true, status: 200, userId: userId ?? u.id ?? sid };
  }
  return { ok: true, status: 200, userId: userId ?? sid };
}

export async function checkLimanAuth(f: FetchLike, cfg: MonitorConfig) {
  const res = await f(`${cfg.limanUrl}/auth/v1/health`, { headers: limanHeaders(cfg), signal: AbortSignal.timeout(cfg.timeoutMs) });
  return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, error: `auth health answered HTTP ${res.status}` };
}

export async function checkLimanRest(f: FetchLike, cfg: MonitorConfig) {
  const res = await f(`${cfg.limanUrl}/rest/v1/dentvid_clinics?select=id&limit=1`, { headers: limanHeaders(cfg), signal: AbortSignal.timeout(cfg.timeoutMs) });
  if (!res.ok) return { ok: false, status: res.status, error: `REST answered HTTP ${res.status}` };
  const body = await res.json().catch(() => null);
  return Array.isArray(body) ? { ok: true, status: res.status } : { ok: false, status: res.status, error: "REST answered without a list" };
}

/** A hosted checkout link answers by opening a checkout session; a bad product goes to Dodo's error page. */
export async function checkDodo(f: FetchLike, cfg: MonitorConfig) {
  const res = await f(cfg.dodoLink!, { headers: { "user-agent": UA }, redirect: "manual", signal: AbortSignal.timeout(cfg.timeoutMs) });
  const loc = res.headers.get("location") ?? "";
  if (res.status >= 300 && res.status < 400) {
    if (/\/error\b|not-found/i.test(loc)) return { ok: false, status: res.status, error: `checkout link goes to Dodo's error page (${loc.slice(0, 120)}) — product missing or archived?` };
    return { ok: true, status: res.status };
  }
  return res.status === 200 ? { ok: true, status: 200 } : { ok: false, status: res.status, error: `checkout link answered HTTP ${res.status}` };
}

/* ------------------------------------------------------------ the run */

export type MonitorDeps = {
  fetch: FetchLike;
  store: OpsStore | null;
  alert: (a: OwnerAlert) => Promise<DeliverResult>;
  config: MonitorConfig;
  now?: () => Date;
  log?: (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => void;
};

/** Process-local state for when Redis is unreachable, so two failing runs still count. */
let memoryState: MonitorState = { checks: {} };
let memoryCleanup: string[] = [];
export function _resetMonitorMemory() {
  memoryState = { checks: {} };
  memoryCleanup = [];
}

async function readState(store: OpsStore | null): Promise<MonitorState> {
  if (!store) return memoryState;
  try {
    const raw = await store.get(MONITOR_STATE_KEY);
    if (!raw) return { checks: {} };
    const s = JSON.parse(raw) as MonitorState;
    return s && typeof s.checks === "object" ? s : { checks: {} };
  } catch {
    return memoryState;
  }
}

const blank = (): CheckState => ({ fails: 0, since: null, lastError: null, lastOkAt: null, alertedAt: null, lastRunAt: null });

export type Transition = {
  state: MonitorState;
  down: { name: string; s: CheckState }[];
  reminder: boolean;
  recovered: { name: string; since: string; minutes: number }[];
};

/**
 * Fold one run's results into the per-check state and decide what to tell
 * the owner: checks that just reached FAILS_TO_ALERT (or are due a
 * reminder), and alerted checks that pass again. Skipped checks keep their state.
 */
export function applyResults(prev: MonitorState, results: CheckResult[], now: Date): Transition {
  const at = now.toISOString();
  const checks: Record<string, CheckState> = { ...prev.checks };
  const down: Transition["down"] = [];
  const recovered: Transition["recovered"] = [];
  let reminder = false;
  for (const r of results) {
    if (r.skipped) continue;
    const p = checks[r.name] ?? blank();
    if (r.ok) {
      if (p.alertedAt && p.since) recovered.push({ name: r.name, since: p.since, minutes: Math.max(1, Math.round((now.getTime() - Date.parse(p.since)) / 60_000)) });
      checks[r.name] = { ...blank(), lastOkAt: at, lastRunAt: at };
      continue;
    }
    const s: CheckState = { ...p, fails: p.fails + 1, since: p.since ?? at, lastError: r.error ?? "failed", lastRunAt: at };
    if (!s.alertedAt && s.fails >= FAILS_TO_ALERT) down.push({ name: r.name, s });
    else if (s.alertedAt && now.getTime() - Date.parse(s.alertedAt) >= REMINDER_MS) {
      down.push({ name: r.name, s });
      reminder = true;
    }
    checks[r.name] = s;
  }
  // A reminder only when every check in the email is an old one.
  if (down.some((d) => !d.s.alertedAt)) reminder = false;
  return { state: { checks }, down, reminder, recovered };
}

export function downAlert(t: Transition): OwnerAlert | null {
  if (!t.down.length) return null;
  const names = t.down.map((d) => d.name).sort();
  const since = t.down.map((d) => d.s.since!).sort()[0];
  const fails = Math.max(...t.down.map((d) => d.s.fails));
  return alerts.monitorDown({
    incident: `${names.join("+")}:${since.slice(0, 16)}:${fails}`,
    reminder: t.reminder,
    checks: t.down.map((d) => ({ label: info(d.name).label, since: d.s.since!, fails: d.s.fails, error: d.s.lastError ?? "failed", hint: info(d.name).hint })),
  });
}

export function recoveredAlert(t: Transition, now: Date): OwnerAlert | null {
  if (!t.recovered.length) return null;
  const names = t.recovered.map((r) => r.name).sort();
  return alerts.monitorRecovered({
    incident: `${names.join("+")}:${now.toISOString().slice(0, 16)}`,
    checks: t.recovered.map((r) => ({ label: info(r.name).label, since: r.since, minutes: r.minutes })),
  });
}

export function historyEntry(run: MonitorRun): HistoryEntry {
  const ran = run.results.filter((r) => !r.skipped);
  return { at: run.at, ms: run.ms, ok: run.ok, failed: ran.filter((r) => !r.ok).map((r) => r.name), ran: ran.length };
}

async function popCleanup(store: OpsStore | null): Promise<string[]> {
  if (!store) return memoryCleanup.splice(0);
  try {
    const ids = await store.list(MONITOR_CLEANUP_KEY);
    await store.del(MONITOR_CLEANUP_KEY);
    return ids;
  } catch {
    return memoryCleanup.splice(0);
  }
}

async function pushCleanup(store: OpsStore | null, ids: string[]) {
  for (const id of ids) {
    try {
      if (!store) throw new Error("no store");
      await store.push(MONITOR_CLEANUP_KEY, id, KEEP_SEC, 200);
    } catch {
      if (!memoryCleanup.includes(id)) memoryCleanup.push(id);
    }
  }
}

/** One monitor run: every check, the record in Redis, the alerts. Never throws. */
export async function runMonitor(deps: MonitorDeps): Promise<MonitorRun> {
  const clock = deps.now ?? (() => new Date());
  const ms = () => clock().getTime();
  const log = deps.log ?? (() => {});
  const cfg = deps.config;
  const f = deps.fetch;
  const started = clock();
  const prev = await readState(deps.store);
  const results: CheckResult[] = [];

  // Pages, in parallel: they are independent and cheap.
  results.push(...(await Promise.all(cfg.pages.map((p) => timed(p.name, () => checkPage(f, cfg, p), ms)))));

  // Sign-up, then delete the account it made (and any left over from earlier runs).
  const leftovers = await popCleanup(deps.store);
  const canDelete = !!(cfg.limanUrl && cfg.limanServiceKey);
  if (!canDelete) {
    results.push({ name: "signup", label: info("signup").label, ok: true, ms: 0, skipped: "DENTVID_SUPABASE_URL / DENTVID_SERVICE_ROLE_KEY not set on the worker (cannot clean up)" });
  } else {
    const email = monitorEmail(started, cfg.monitorEmailDomain);
    const password = `Mon-${randomBytes(12).toString("base64url")}`;
    let userId: string | null = null;
    const r = await timed(
      "signup",
      async () => {
        const out = await checkSignup(f, cfg, email, password);
        userId = out.userId ?? null;
        const { userId: _u, ...rest } = out;
        return rest;
      },
      ms,
    );
    results.push(r);
    const toDelete = [...new Set([...(userId ? [userId] : []), ...leftovers])];
    const failed: string[] = [];
    for (const id of toDelete) {
      const gone = await deleteMonitorUser(f, cfg, id).catch(() => false);
      if (!gone) failed.push(id);
    }
    if (failed.length) await pushCleanup(deps.store, failed);
    // Created but id unknown (no session, no id): say so — it cannot be cleaned up automatically.
    const lost = !userId && r.status === 200 && !r.ok;
    if (toDelete.length || lost) {
      results.push({
        name: "cleanup",
        label: info("cleanup").label,
        ms: 0,
        ok: !failed.length && !lost,
        ...(failed.length ? { error: `${failed.length} monitor account(s) not deleted yet (retried next run)` } : lost ? { error: `the account ${email} may exist but its id is unknown — delete it in Liman` } : {}),
      });
    }
  }

  if (cfg.limanUrl && cfg.limanServiceKey) {
    results.push(await timed("liman-auth", () => checkLimanAuth(f, cfg), ms));
    results.push(await timed("liman-rest", () => checkLimanRest(f, cfg), ms));
  } else {
    for (const n of ["liman-auth", "liman-rest"]) results.push({ name: n, label: info(n).label, ok: true, ms: 0, skipped: "DENTVID_SUPABASE_URL / DENTVID_SERVICE_ROLE_KEY not set on the worker" });
  }

  const lastDodo = prev.checks.dodo?.lastRunAt ? Date.parse(prev.checks.dodo.lastRunAt) : 0;
  const dodoFailing = (prev.checks.dodo?.fails ?? 0) > 0;
  if (!cfg.dodoLink) results.push({ name: "dodo", label: info("dodo").label, ok: true, ms: 0, skipped: "DENTVIDEO_MONITOR_DODO_LINK=off" });
  // Hourly — but every run while it is failing, so an outage is confirmed (and a recovery seen) quickly.
  else if (!dodoFailing && started.getTime() - lastDodo < cfg.dodoEveryMs - 60_000) results.push({ name: "dodo", label: info("dodo").label, ok: true, ms: 0, skipped: "checked hourly" });
  else results.push(await timed("dodo", () => checkDodo(f, cfg), ms));

  const run: MonitorRun = { at: started.toISOString(), ms: ms() - started.getTime(), ok: results.every((r) => r.ok || !!r.skipped), results };

  const t = applyResults(prev, results, clock());
  const down = downAlert(t);
  const up = recoveredAlert(t, clock());
  if (down) {
    const res = await deps.alert(down).catch(() => "failed" as const);
    // Not delivered: leave the checks un-alerted so the next run tries again (its key differs: one more failure).
    if (res !== "failed") for (const d of t.down) t.state.checks[d.name] = { ...t.state.checks[d.name], alertedAt: clock().toISOString() };
    log(res === "failed" ? "error" : "warn", "monitor: checks failing", { checks: t.down.map((d) => d.name), alert: res });
  }
  if (up) {
    const res = await deps.alert(up).catch(() => "failed" as const);
    log("info", "monitor: checks recovered", { checks: t.recovered.map((r) => r.name), alert: res });
  }

  memoryState = t.state;
  if (deps.store) {
    try {
      await deps.store.set(MONITOR_STATE_KEY, JSON.stringify(t.state), KEEP_SEC);
      await deps.store.set(MONITOR_LAST_KEY, JSON.stringify(run), KEEP_SEC);
      await deps.store.push(MONITOR_HISTORY_KEY, JSON.stringify(historyEntry(run)), KEEP_SEC, HISTORY_MAX);
    } catch (e) {
      log("warn", "monitor: result not saved", { err: (e as Error).message });
    }
  }
  if (!run.ok) log("warn", "monitor: run had failures", { failed: results.filter((r) => !r.ok && !r.skipped).map((r) => `${r.name}: ${r.error}`) });
  return run;
}
