#!/usr/bin/env node
/**
 * DentVideo browser smoke test — the clinic's path through a real browser,
 * against production (or any deployment), with clean-up:
 *
 *   1. arrive on the landing page from a Google referrer with UTM tags
 *      (the case that once sent the browser's sign-in to the wrong Supabase project)
 *   2. go to /start (same referrer + UTM) and sign up as
 *      e2e-monitor+smoke-<ts>@bulsulabs.com — never emailed by the app
 *   3. fill the clinic step (name + services) and reach the preview step
 *   4. sign out (the app's own button where one is shown; during onboarding
 *      there is none, so the session cookies are cleared — what sign-out does
 *      in the browser)
 *   5. sign in again from /start?mode=signin, again from a referrer + UTM,
 *      and land back in the funnel
 *   6. delete the account through the app (POST /api/dentvideo/account/delete)
 *
 * Checked along the way: every page answers, the sign-up answers 200 with a
 * server-side session (signedIn), the UTM tags reach the sign-up, and every
 * browser call to Supabase auth goes to the project that issued the session
 * (Liman) — never to another project.
 *
 * One command (installs Playwright's Chromium on first run):
 *
 *   bash scripts/dentvideo-smoke.sh
 *
 * Options (environment):
 *   SMOKE_URL                 site to test (default https://dentvideo.com)
 *   DENTVIDEO_MONITOR_TOKEN   the web app's monitor token: the sign-up skips the
 *                             per-IP limits and Turnstile for this address. Without
 *                             it the normal limits apply (10 sign-ups a day per IP).
 *   SMOKE_DEVICE              Playwright device (default "Pixel 7"; "desktop" for a desktop window)
 *   SMOKE_HEADED=1            show the browser
 *   SMOKE_ARTIFACTS           folder for failure screenshots (default: a temp folder)
 *   DENTVID_SUPABASE_URL + DENTVID_SERVICE_ROLE_KEY
 *                             optional last-resort clean-up when the app's delete fails
 *
 * Exit code 0 when everything passed, 1 otherwise. Safe to run in CI.
 */
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

const BASE = (process.env.SMOKE_URL || "https://dentvideo.com").replace(/\/+$/, "");
const TOKEN = process.env.DENTVIDEO_MONITOR_TOKEN?.trim() || "";
const DEVICE = process.env.SMOKE_DEVICE || "Pixel 7";
const HEADED = process.env.SMOKE_HEADED === "1";
const STEP_MS = 30_000;
const UTM = "utm_source=smoke-test&utm_medium=e2e&utm_campaign=dentvideo-smoke";
const REFERRER = "https://www.google.com/";

const email = `e2e-monitor+smoke-${Date.now()}${randomBytes(2).toString("hex")}@bulsulabs.com`;
const password = `Smoke-${randomBytes(12).toString("base64url")}`;
const clinicName = "Smoke Test Dental";

/** Playwright from this folder's node_modules, or from `npx -p playwright` (its .bin is on PATH). */
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    for (const dir of (process.env.PATH || "").split(path.delimiter)) {
      if (!dir.endsWith(path.join("node_modules", ".bin"))) continue;
      try {
        const req = createRequire(path.join(dir, "..", "noop.js"));
        return await import(req.resolve("playwright"));
      } catch {
        // next
      }
    }
  }
  console.error("Playwright is not installed. Run: bash scripts/dentvideo-smoke.sh");
  process.exit(2);
}

const steps = [];
let failed = false;
const t0 = Date.now();
function log(ok, name, detail = "") {
  steps.push({ ok, name, detail });
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
async function step(name, fn) {
  try {
    const detail = await fn();
    log(true, name, typeof detail === "string" ? detail : "");
    return true;
  } catch (e) {
    log(false, name, (e?.message || String(e)).split("\n")[0].slice(0, 300));
    return false;
  }
}

const b64urlJson = (s) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
/** The dv-auth session (cookie may be split into dv-auth.0, .1 …). */
function sessionFrom(cookies) {
  const parts = cookies.filter((c) => c.name === "dv-auth" || /^dv-auth\.\d+$/.test(c.name)).sort((a, b) => (a.name < b.name ? -1 : 1));
  if (!parts.length) return null;
  const raw = decodeURIComponent(parts.map((c) => c.value).join(""));
  try {
    return raw.startsWith("base64-") ? b64urlJson(raw.slice(7)) : JSON.parse(raw);
  } catch {
    return null;
  }
}
const issuerHost = (session) => {
  try {
    return new URL(b64urlJson(session.access_token.split(".")[1]).iss).host;
  } catch {
    return null;
  }
};

const { chromium, devices } = await loadPlaywright();
const deviceOpts = DEVICE === "desktop" ? { viewport: { width: 1280, height: 860 } } : devices[DEVICE] ?? devices["Pixel 7"];
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({ headless: !HEADED, ...(proxy ? { proxy: { server: proxy } } : {}) });
const context = await browser.newContext({ ...deviceOpts, locale: "en-US" });
const page = await context.newPage();
page.setDefaultTimeout(STEP_MS);

// The monitor token rides only on the sign-up call, never on page or third-party requests.
await page.route("**/api/dentvideo/signup", (route) => route.continue({ headers: { ...route.request().headers(), ...(TOKEN ? { "x-dv-monitor": TOKEN } : {}) } }));

// Every browser call to Supabase auth, to check they all go to the project that issued the session.
const authCalls = [];
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.pathname.startsWith("/auth/v1/")) authCalls.push({ host: u.host, path: u.pathname, method: r.method() });
});
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(e.message));

let signupBody = null;
let savedState = null;
let limanHost = null;

async function open(url, referer) {
  const res = await page.goto(url, { referer, waitUntil: "domcontentloaded" });
  if (!res) throw new Error(`no response for ${url}`);
  if (res.status() >= 400) throw new Error(`HTTP ${res.status()} for ${url}`);
  return res;
}

const firstFailure = async () => {
  const alert = page.locator('[role="alert"]').first();
  return (await alert.count()) ? (await alert.innerText()).trim() : "";
};

console.log(`DentVideo smoke test against ${BASE} as ${email} (${DEVICE})\n`);

try {
  await step("landing page from a Google referrer with UTM tags", async () => {
    await open(`${BASE}/?${UTM}`, REFERRER);
    if (!/DentVideo/.test(await page.title())) throw new Error(`unexpected title “${await page.title()}”`);
  });

  const signedUp = await step("sign-up on /start (referrer + UTM)", async () => {
    await open(`${BASE}/start?lang=en&${UTM}`, `${BASE}/?${UTM}`);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    const answer = page.waitForResponse((r) => r.url().includes("/api/dentvideo/signup") && r.request().method() === "POST");
    await page.locator('form button[type="submit"]').click();
    const res = await answer;
    signupBody = await res.json().catch(() => ({}));
    const sent = JSON.parse(res.request().postData() || "{}");
    if (res.status() !== 200 || !signupBody.ok) throw new Error(`sign-up answered HTTP ${res.status()} ${JSON.stringify(signupBody).slice(0, 200)}`);
    if (signupBody.existing) throw new Error("the fresh address was said to exist already");
    if (sent.attribution?.utm_source !== "smoke-test") throw new Error(`the UTM source did not reach the sign-up (attribution: ${JSON.stringify(sent.attribution ?? null)})`);
    await page.waitForURL(/step=clinic/, { timeout: STEP_MS }).catch(async () => {
      throw new Error(`did not reach the clinic step (at ${page.url()}) ${await firstFailure()}`);
    });
    const session = sessionFrom(await context.cookies());
    if (!session?.access_token) throw new Error("no dv-auth session cookie after sign-up");
    limanHost = issuerHost(session);
    savedState = await context.storageState();
    return `server session: ${signupBody.signedIn ? "yes" : "NO — the browser had to sign in itself"}; session issued by ${limanHost}`;
  });
  if (signedUp && signupBody && !signupBody.signedIn) log(false, "server-side sign-in at sign-up", "signedIn: false (phones that cannot sign in from the browser would be stuck)");

  if (signedUp) {
    await step("clinic step → preview", async () => {
      await page.locator('input[autocomplete="organization"]').first().fill(clinicName);
      await page.locator("textarea[required]").first().fill("Implants, whitening, aligners");
      await page.locator('form button[type="submit"]').first().click();
      await page.waitForURL(/step=preview/, { timeout: STEP_MS }).catch(async () => {
        throw new Error(`did not reach the preview step (at ${page.url()}) ${await firstFailure()}`);
      });
    });

    await step("sign out", async () => {
      const button = page.getByRole("button", { name: /^sign out$/i });
      if (await button.count()) {
        await button.first().click();
        await page.waitForURL(/\/start/);
      } else {
        // Onboarding has no sign-out control: clear the session the way signOut() does in the browser.
        const names = (await context.cookies()).filter((c) => c.name === "dv-auth" || c.name.startsWith("dv-auth.")).map((c) => c.name);
        await context.clearCookies({ name: new RegExp(`^(${names.map((n) => n.replace(".", "\\.")).join("|") || "dv-auth"})$`) });
      }
      await open(`${BASE}/start?lang=en`, undefined);
      if (!(await page.locator('input[type="password"]').count())) throw new Error("still signed in after signing out");
      return (await button.count()) ? "with the Sign out button" : "session cookies cleared (no sign-out control during onboarding)";
    });

    await step("sign in again from a referrer + UTM", async () => {
      await open(`${BASE}/start?mode=signin&lang=en&${UTM}`, `https://www.instagram.com/`);
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.locator('form button[type="submit"]').click();
      await page.waitForURL((u) => !/mode=signin/.test(u.toString()), { timeout: STEP_MS }).catch(async () => {
        throw new Error(`still on the sign-in form (at ${page.url()}) ${await firstFailure()}`);
      });
      await page.waitForLoadState("domcontentloaded");
      const session = sessionFrom(await context.cookies());
      if (!session?.access_token) throw new Error("no dv-auth session after sign-in");
      if (session.user?.email && session.user.email !== email) throw new Error(`signed in as ${session.user.email}`);
      // Back in the funnel, with the clinic it saved.
      const name = page.locator('input[autocomplete="organization"], input[required]').first();
      await name.waitFor({ timeout: STEP_MS });
      return `landed on ${new URL(page.url()).pathname}${new URL(page.url()).search}`;
    });

    await step("every Supabase auth call went to the project that issued the session", async () => {
      const hosts = [...new Set(authCalls.map((c) => c.host))];
      if (!authCalls.some((c) => c.path === "/auth/v1/token")) throw new Error("the browser made no sign-in call (/auth/v1/token)");
      const wrong = hosts.filter((h) => limanHost && h !== limanHost);
      if (wrong.length) throw new Error(`auth calls went to ${wrong.join(", ")} instead of ${limanHost}`);
      return `hosts: ${hosts.join(", ")}`;
    });
  }
} finally {
  // Clean-up, whatever happened: the app's own account deletion, with the newest session we have.
  if (signupBody?.ok && !signupBody.existing) {
    const del = async () => {
      const res = await context.request.post(`${BASE}/api/dentvideo/account/delete`, { data: { confirm: email }, headers: { origin: BASE } });
      return res;
    };
    let res = await del().catch(() => null);
    if ((!res || res.status() === 401) && savedState) {
      await context.clearCookies();
      await context.addCookies(savedState.cookies);
      res = await del().catch(() => null);
    }
    if (res?.ok()) log(true, "clean-up: account deleted through the app");
    else {
      const url = process.env.DENTVID_SUPABASE_URL?.replace(/\/+$/, "");
      const key = process.env.DENTVID_SERVICE_ROLE_KEY;
      const id = savedState ? sessionFrom(savedState.cookies)?.user?.id : null;
      if (url && key && id) {
        const r = await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: key, authorization: `Bearer ${key}` } });
        log(r.ok, "clean-up: login deleted with the service role", r.ok ? "the clinic row may remain (owner_id has no login)" : `HTTP ${r.status}`);
      } else {
        log(false, "clean-up", `the app's delete answered ${res ? `HTTP ${res.status()}` : "nothing"} — delete ${email} by hand in /dentvideo/admin or Liman`);
      }
    }
  }
  if (failed) {
    const dir = process.env.SMOKE_ARTIFACTS || mkdtempSync(path.join(tmpdir(), "dentvideo-smoke-"));
    mkdirSync(dir, { recursive: true });
    const shot = path.join(dir, "failure.png");
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    console.log(`\nScreenshot: ${shot}`);
    if (consoleErrors.length) console.log(`Page errors:\n- ${consoleErrors.slice(0, 5).join("\n- ")}`);
  }
  await browser.close();
}

const passed = steps.filter((s) => s.ok).length;
console.log(`\n${failed ? "FAILED" : "PASSED"}: ${passed}/${steps.length} steps in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failed ? 1 : 0);
