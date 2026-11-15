# DentVideo ad tracking (Google Ads)

How a paid click is measured from landing to first payment, without cookies,
third-party scripts or a Google tag on the site. Code: `web/src/lib/dentvid/attribution.ts`
(UTM first touch), `ad-click.ts` (click ids + consent rules), `components/dentvid/ad-consent*.tsx`
(capture + prompt), `ad-conversions*.ts` (rows, CSV), `app/dentvideo/admin/ads` (export).
Database: `supabase/liman/0019_dentvid_ad_conversions.sql` (apply by hand before the first click).

## 1. Account settings

- **Auto-tagging: ON** (Admin → Account settings). It adds `gclid` (or `gbraid` / `wbraid` on iOS) to every click.
- **Final URL suffix** (set it on each campaign, so the campaign name is fixed text):

  ```
  utm_source=google&utm_medium=cpc&utm_campaign=tr-search-core&utm_term={targetid}&utm_content={adgroupid}-{creative}
  ```

  Use `de-search-core` / `es-search-core` for the other campaigns. Values must fit the site's slug rule
  `^[a-z0-9][a-z0-9._-]{0,39}$` (lowercase ASCII, no spaces). `{targetid}` gives `kwd-123…`, which
  passes; do **not** use `{keyword}` — Turkish/German keywords with non-ASCII letters are dropped by the
  sanitiser, and keyword text does not belong in our data anyway.
- Final URLs can be any public page now: `/tr`, `/de`, `/tr/ad-checker`, `/de/examples`, `/videos/<slug>`,
  guides. Every DentVideo page keeps the first-touch source for the tab, and `/start` sends it with the sign-up.

## 2. Conversion actions (create before launch)

Goals → Conversions → New → Import → "Other data sources or CRMs" → "Track conversions from clicks".
The **name must match exactly** what the CSV says:

| Name | Value | Count | Click-through window | Primary | Recorded when |
|---|---|---|---|---|---|
| `dv_signup` | 5 USD (fixed) | One | 90 days | yes | an account is created (`/api/dentvideo/signup`) |
| `dv_paid` | 100 USD (clinic in TR) / 150 USD (elsewhere) | One | 90 days | yes | the clinic's first activation (Dodo webhook, `first = true`) |

At most one of each per account (unique in the table): webhook replays and retried sign-ups never double count.
A conversion is recorded only when the visitor came with a click id we may keep, and only within 90 days of the click.

## 3. Consent (what the visitor sees)

- Organic visitors (no `gclid` / `gbraid` / `wbraid` in the URL): nothing. No prompt, no extra request.
- Ad click from the **EU/EEA, UK or Switzerland**, or when the country is unknown: a small prompt in the
  page's language that names the recipient — "May we tell Google Ads which ad brought you? Only to measure our
  ads: we keep the ad click ID for 90 days and send it to Google if you sign up or subscribe. Never sold." (TR
  copy also says the transfer is abroad) — with equal Accept / Decline and a link to privacy §5 ("Who receives it"). Accept → the click id is kept in this site's `localStorage` (`dv-ad-click`,
  max 90 days). Decline → it is dropped; the visit still counts by its UTM tags.
- Ad click from elsewhere (e.g. **TR**): no prompt; the id is kept (legitimate interests, privacy policy §4).
- The country comes from `GET /api/dentvideo/geo`: our own server looks up the connecting address (last
  `X-Forwarded-For` hop, appended by Traefik) in a local DB-IP country database (`web/src/lib/dentvid/geo-ip.ts`);
  client-sent `CF-IPCountry` and the like are ignored. It answers `{ country, consentRequired }`, never the IP. The server checks again at sign-up: from a consent country (or unknown),
  only a click marked `granted` is stored.
- CSV column **Ad User Data** is `GRANTED` for visitors who accepted; empty where no prompt applied.
  **Ad Personalization** is always empty (we never ask for it).

## 4. Weekly export and upload (Monday, ~5 minutes)

1. Open `dentvideo.com/admin/ads` (admins only). Opening it also deletes click data older than 90 days.
2. **Download CSV (Google Click ID)**. The file is Google's click template:
   ```
   Parameters:TimeZone=+0000
   Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Ad User Data,Ad Personalization
   Cj0KCQ…,dv_signup,2026-11-16 09:05:07,5.00,USD,GRANTED,
   ```
   Pending rows in the file are marked exported. "Include already exported" re-downloads without re-marking.
3. Google Ads → Goals → Conversions → Uploads → Upload → choose the file → Apply. Check the upload's
   diagnostics a few hours later (rejected rows, "click too old", "conversion action not found").
4. If there are iOS rows, **Download CSV (GBRAID / WBRAID)** and upload it the same way. Before the first
   time, compare its header (`GBRAID,WBRAID,…`) with the template your account offers under Uploads →
   "View templates"; if Google's template differs, tell us and we adjust `conversionsCsv`.
5. Google accepts clicks up to 90 days old; rows past that are left out of the file automatically.

Month 2: replace the CSV with an API upload from the worker (Google Ads API / Data Manager API — check which
Google recommends at that point; it needs a developer token).

## 5. Retention

Click ids and conversions are deleted **90 days after the click**, in both tables, by
`public.dentvid_purge_ad_data()` — run nightly by the worker after `billing-reconcile` and on every opening of
`/admin/ads`. With pg_cron you can also schedule it:
`select cron.schedule('dentvid-purge-ad-data', '41 4 * * *', $$select public.dentvid_purge_ad_data()$$);`
Deleting an account deletes its rows (`on delete cascade`).

## 6. Verify a test click end to end

1. Apply migration 0019 and run its "Checks" block (RLS on, no policies, no anon/authenticated grants).
2. In a private window, open
   `https://dentvideo.com/tr/examples?gclid=TEST123&utm_source=google&utm_medium=cpc&utm_campaign=tr-search-core`.
   From TR: no prompt. From DE/AT (or a VPN there): the prompt appears; press Accept.
   DevTools → Application: `localStorage["dv-ad-click"]` holds `{"type":"gclid","id":"TEST123",…}` and
   `sessionStorage["dv-attr"]` the UTM tags. No cookie was set by the page.
3. Click through to `/start` and create an account with a throwaway address you control (not an
   `e2e-monitor+…`, `qa+…` or company-domain address, nor one in `DENTVID_INTERNAL_EMAIL_PATTERNS`: internal
   accounts are skipped on purpose — see §7). The private window matters: a browser you have ever signed in
   to as the owner or QA carries `localStorage["dv-internal"]` and keeps no ad click. DevTools → Network → `signup` request body
   carries `attribution` and `adClick`.
4. `/admin/ads` shows a pending `dv_signup` row for `gclid: TEST123`; `/admin/funnel` shows the sign-up under
   `google / cpc / tr-search-core`.
5. Do **not** upload `TEST123` to Google (it is not a real click; Google would reject it). Delete the test
   account in Settings; its click and conversion rows go with it.
6. After launch, the first real rows confirm the chain: Uploads diagnostics in Google Ads should show them as
   imported within a day.

## 7. Internal traffic (owner, QA, e2e, monitor)

Before launch ~88% of funnel events were ours, and QA runs used real ad tags (`google / cpc / de-search-core`,
test gclids). Internal traffic is now marked where it starts (`web/src/lib/dentvid/internal-traffic.ts`):

- **Accounts.** Internal when the email matches a pattern — built-in: `*@bulsulabs.com`, `*@dentvideo.com`,
  `e2e-monitor+*@*`, `e2e*@*`, `qa+*@*`, `dvq*+*@*`, plus `DENTVID_INTERNAL_EMAIL_PATTERNS` (comma-separated;
  personal addresses go **only** there, never in the repo) — or when `app_metadata.internal = true`. Sign-up
  sets that marker for pattern matches, the synthetic monitor (it sends `internal: true`) and any sign-up from
  an internally flagged browser.
- **Browsers.** `localStorage["dv-internal"] = "1"`. Set when an internal account or an admin is signed in
  (the wizard, the app, the admin panel), or by `?dv_internal=1` **while signed in as one** (the server checks;
  a bare link marks nobody). Stays after sign-out. `?dv_internal=0` removes it. The browser smoke test sets it.
- **Events.** Tagged `props.internal = true` by the browser (flagged) and by the server (internal account).
  `/admin`, `/admin/clinics`, `/admin/funnel` and the daily digest leave internal traffic out by default —
  tagged events, internal owners' clinics and their events — with an "Include" switch (`?internal=1`).
- **Ads.** An internal browser never keeps a click id; an internal sign-up stores no click and records no
  `dv_signup`; an internal owner's first payment records no `dv_paid`.

"Internal" is a measurement label, never a permission: it can only take someone out of the numbers.

Before ads start (and after changing the patterns), see how much existing data is internal with the read-only
report `scripts/dentvideo-internal-report.sql` (pass the env list with `-v extra=…`). It writes nothing.
Anonymous events from before tagging existed cannot be classified by account; the Nov 2026 analysis used a
±30 min window around internal sign-ins plus landing bursts — treat older "real" landing views as an upper
bound.

QA agents: sign in once with a `qa+…` account (or open any page with `?dv_internal=1` while signed in as one)
before browsing anonymously with ad tags.

## 8. Never

No gtag / Google tag, no Meta pixel, no third-party scripts, no ad cookies. No click ids in the generic
funnel events (`events.ts` has no rule for them). No discounts, coupons or referral offers in ads.
