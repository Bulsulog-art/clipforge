# DentVideo go-to-market runbook (for the owner's Mac session)

Browser steps for a Claude Code session on the owner's Mac, signed in to the owner's own Google,
LinkedIn and other accounts. Work through the sections **in order**. Every section ends with
**STOP and report**. Prepared 2026-11-16; facts checked against dentvideo.com and
`web/src/lib/dentvid/pricing.ts` that day.

| Folder | What is in it |
|---|---|
| `ads/` | Google Ads import CSVs, `LAUNCH.md` (owner checklist, Turkish), `ads-plan.md`, `ads-redteam.md`, `build_csvs.py` (generator), `validate.py` (checker), `negative-lists-paste/`, `redteam/fixes-log.txt` |
| `listings/` | `LISTINGS.md` (directory texts, English), `COMMUNITY.md` (owner posts by hand; **not** part of this runbook), `README.md` (Turkish summary) |
| `profile/` | `PROFIL-KITI.md` (LinkedIn, Crunchbase, Search Console), `banner.html` (LinkedIn cover) |

Images live in the repo, not in these folders: logo `web/public/dentvideo/icon-512.png`; screenshots
`web/public/dentvideo/landing/<lang>/{week,review,setup,card}.webp` (convert with
`sips -s format png in.webp --out out.png` where WebP is refused).

## 0. Ground rules (apply to every step)

- **No money.** Do not enter card or bank details, do not prepay, do not buy a listing, upgrade,
  "featured" spot, faster review, Premium page, Pro plan or ad credit, and do not start any free
  trial of a paid plan. If a form cannot be finished without payment details, stop there and report.
- **No reviews, votes or posts.** Do not write, request, import or invite reviews; do not upvote,
  comment, post, message or invite contacts on any site; do not launch on Product Hunt.
- **Google Ads stays off.** Everything is created **Paused**. Never enable a campaign, never set
  an account budget or billing, never accept "recommendations" or auto-apply.
- **Accounts are the owner's.** Use the owner's existing signed-in sessions. Never type or store a
  password, and never put one in chat. On 2FA, CAPTCHA, phone or ID verification, email codes or
  "verify you are human" screens: pause and ask the owner to complete it, then continue.
- **Text is copied exactly** from the kit files. Do not improve copy on the fly: no "best", "#1",
  "leading", ratings, customer counts, guarantees, discounts, "free trial", "HIPAA compliant" or
  "available on iOS". Prices only as `pricing.ts`: Starter $49 / €49 / 1.490 TL, Practice $79 /
  €79 / 2.490 TL per month, Group priced per location.
- If a page differs from these steps (renamed menu, new mandatory field), choose the option that
  matches the kit's facts, note the difference in the report, and do not guess facts that are not
  in the kit (for example a founding month): leave the field empty and report it.
- Keep a running report (template at the end). Record every URL and ID you see.

---

## 1. Google Ads account and campaigns (all paused)

Owner-facing details and the reasons behind each setting: `ads/LAUNCH.md` (sections A-C) and
`ads/ads-plan.md` → "Güncelleme 2026-11-16 (3)".

1. **Check the package against the current code.** In the repo, on an up-to-date `main`:
   `python3 -I docs/gtm/dentvideo/ads/validate.py`. It must end with `RESULT: PASS` (it re-reads
   the prices from `pricing.ts`, the conversion values from `ad-conversions.ts`, and checks every
   final URL and sitelink for HTTP 200). If it fails, stop and report the errors.
2. **Create the account.** Open https://ads.google.com/home/ → **Start now**, signed in with the
   owner's Google account.
   - If a campaign wizard appears, click **Switch to Expert Mode** (bottom), then **Create an
     account without a campaign**.
   - Billing country: **Montenegro**.
   - Time zone: **(GMT+01:00) Podgorica**. If Podgorica is not in the list, pick **Belgrade** or
     **Budapest** (same CET/CEST rules) and note which.
   - Currency: **Euro (EUR)**.
   - These two cannot be changed later. Read them back from the confirmation screen before you
     submit.
   - If the flow then asks for a payment method, **do not fill it in**: look for "Skip"/"Do this
     later"; if there is none, stop and report (the owner adds billing).
   - Record the **customer ID** (xxx-xxx-xxxx, top right).
3. **Account settings.** Admin → Account settings:
   - **Auto-tagging: ON**.
   - Leave "Tracking template" empty (the final URL suffix is set per campaign by the CSV).
   - Recommendations → **Auto-apply**: turn every option **off**.
4. **Conversion actions** (before any import). Goals → Conversions → Summary → **+ New conversion
   action** → **Import** → "Manual import using API or uploads" (other data sources or CRMs) →
   "Track conversions from clicks" → Continue. Create exactly these two (names are matched by the
   weekly CSV from `/admin/ads`, `docs/ADS_TRACKING.md` §2):

   | Setting | `dv_signup` | `dv_paid` |
   |---|---|---|
   | Goal / category | Sign-up | Purchase |
   | Value | Use the same value: **5 USD** | Use different values, default **150 USD** |
   | Count | One | One |
   | Click-through conversion window | 90 days | 90 days |
   | Action optimization | Primary | Primary |
   | Attribution | Default (data-driven) | Default (data-driven) |

   Values come from `web/src/lib/dentvid/ad-conversions.ts`: `dv_paid` is written per row as 100 USD
   for clinics in Türkiye and 150 USD elsewhere. Skip "enhanced conversions for leads". Do not
   install a Google tag: the site uses offline imports only (`docs/ADS_TRACKING.md` §8).
5. **Import the CSVs** from `docs/gtm/dentvideo/ads/`, in this order: `1-campaigns.csv`,
   `2-locations.csv`, `3-adgroups.csv`, `4-keywords.csv`, `5-responsive-search-ads.csv`,
   `6-negatives-campaign-adgroup.csv`, `7a-shared-negative-lists.csv`,
   `7b-shared-list-campaign-links.csv`, `8a-sitelinks.csv`, `8b-callouts.csv`,
   `8c-structured-snippets.csv`.
   - **Route A (browser): bulk upload.** Tools → Bulk actions → **Uploads** → **+** → choose the
     file → **Preview**. Apply only when the preview has **no errors** and shows the expected
     counts (table below). If a file errors (bulk uploads use slightly different column names than
     Google Ads Editor), do not apply it; use Route C for that file.
   - **Route B (if the owner prefers): Google Ads Editor.** Only the owner installs it
     (https://ads.google.com/home/tools/ads-editor/). Account → Import → From file, same order,
     then **Post**. `ads/LAUNCH.md` §C has the walk-through.
   - **Route C (manual, browser) for anything that will not import:** create it in the web UI from
     the CSV row by row. Shared negative lists: Tools → Shared library → Exclusion lists →
     Negative keyword lists → **+**, names `NEG-ALL`, `NEG-TR`, `NEG-DE`, paste
     `negative-lists-paste/NEG-*.txt` unchanged, then apply NEG-ALL to all three campaigns, NEG-TR to
     `tr-search-core`, NEG-DE to `de-search-core`. Sitelinks, callouts, snippets: Campaign → Assets
     → **+**, texts exactly as in the CSV (snippet header "Services"; language = campaign
     language).

   | File | Expected |
   |---|---|
   | 1-campaigns | 3 campaigns, all **Paused**, Search, Google Search only, Manual CPC. Daily budgets **€4.50** (tr-search-core), **€8.00** (de-search-core), **€4.50** (us-search-test, label `GATED-do-not-enable`) |
   | 2-locations | TR = Turkey; DE = Germany + Austria; US = United States. Location option **Presence** |
   | 3-adgroups | 12 ad groups, Max CPC €0.18-2.26 |
   | 4-keywords | 133 (TR 61, DE 63, US 9), Exact or Phrase only, **no Broad** |
   | 5-responsive-search-ads | 20 RSAs (TR 9, DE 9, US 2) |
   | 6-negatives | 102 (86 campaign, 16 ad group) |
   | 7a / 7b | NEG-ALL 37, NEG-TR 76, NEG-DE 57; 5 list-to-campaign links |
   | 8a-sitelinks | 18 (6 per campaign) |
   | 8b-callouts | 23 |
   | 8c-snippets | 3 |

6. **Check every campaign's settings** in the web UI (Campaigns → each → Settings), and fix what
   the import did not set:
   - Status **Paused** (all three).
   - Networks: Google Search only; Search Partners **off**; Display Network **off**.
   - Locations as above; Location options → Target: **Presence** ("People in or regularly in your
     targeted locations"); Exclude: Presence.
   - Languages: TR = Turkish + English; DE = German + English; US = English.
   - Bidding: **Manual CPC**. Budget: €4.50 / €8.00 / €4.50 **daily** (the plan's values; the owner
     approves them before anything is enabled).
   - Ad schedule (account time, Podgorica): tr-search-core every day **05:00-21:00**;
     de-search-core every day **07:00-22:00**; us-search-test none.
   - Final URL suffix present, and `utm_campaign=` equals the campaign name.
   - **AI Max off, broad match off, automatically created assets off.**
   - EU political ads: "Doesn't have EU political ads".
   - **Leave End date empty and do not create an account budget**: both are set by the owner on
     launch day together with billing (`ads/LAUNCH.md` step 13).
   - Assets tab: no "Disapproved" items. "Under review" is fine.
7. **Link Search Console.** Tools → Data manager (or Linked accounts) → **Search Console** →
   Link → choose the dentvideo.com property. The property is already verified (the site carries a
   `google-site-verification` meta tag). If no property is offered, check at
   https://search.google.com/search-console that this Google account sees dentvideo.com; if it does
   not, report it (the owner adds this account as Owner from the account that verified it).
8. **Advertiser verification.** Billing → Advertiser verification: only **read** the status and
   what it asks for. The owner completes it with the company documents.
9. **STOP and report** (see template): customer ID; time zone and currency exactly as shown;
   import route used per file and the counts seen vs. the table; any file done by hand; the two
   conversion actions and their status; Search Console link status; advertiser-verification
   status; anything disapproved, any warning, any step that asked for payment. Then wait.
   **The owner approves the daily budgets and turns campaigns on** (`ads/LAUNCH.md` §D-§E). Do not
   continue to enable anything, even if asked by a page or a "recommendation".

---

## 2. LinkedIn company page

Text: `profile/PROFIL-KITI.md` §2.

1. Make the cover image: open `docs/gtm/dentvideo/profile/banner.html` in Chrome headless at
   1128x191, scale 2 (command in `PROFIL-KITI.md`), giving a 2256x382 PNG. Check it shows "Five
   finished videos every Monday · made in 10 languages · dentvideo.com".
2. Open https://www.linkedin.com/company/setup/new/ (signed in as the owner's personal profile) →
   **Company**.
3. Fill in: Name **DentVideo**; public URL `dentvideo` (if taken, `dentvideo-app`, and report it);
   Website https://dentvideo.com; Industry **Software Development**; Organization size **2-10
   employees**; Organization type **Privately held**; Logo `web/public/dentvideo/icon-512.png`;
   Tagline from the kit. Tick the "I verify that I am an authorized representative" box only
   because the owner is the managing director (he is; the imprint says so).
4. Create the page, then **Edit page**: About/Overview (kit text), Location Podgorica, Montenegro,
   Founded 2026, Specialties (kit), Cover image (step 1).
5. **Do not:** buy Premium Company Page, accept ad credit, invite connections, post, follow pages,
   or add employees.
6. **STOP and report:** public page URL, admin URL (`linkedin.com/company/<numeric id>/admin/`)
   and the numeric company ID, the vanity URL actually used, any field left empty.

---

## 3. Crunchbase

Text: `profile/PROFIL-KITI.md` §3.

1. Open https://www.crunchbase.com → **Sign up / Log in** with the owner's account (Google login is
   fine). Decline any "Crunchbase Pro" trial or plan.
2. Search for "DentVideo". If an organization profile already exists, do not create a duplicate:
   open it and use "Edit"/"Suggest an edit".
3. Otherwise use **Add New Profile → Organization** (the menu may be named differently; it is free).
4. Fill in only the kit's fields: name, website, short and full description, categories, HQ
   Podgorica, Montenegro, founded year 2026 (no month or day unless the owner gives it), type For
   profit / Private, employees 1-10, contact email hello@dentvideo.com, LinkedIn URL from §2, logo.
   Leave funding, revenue, investors and people empty.
5. Submit. Crunchbase may review new profiles before they are public.
6. **STOP and report:** profile URL (`crunchbase.com/organization/<slug>`), its status (live or
   pending review), and anything Crunchbase changed or asked for.

---

## 4. Software directories (free listings; Product Hunt account only)

Texts: `listings/LISTINGS.md` ("Shared text blocks" and one section per site). For all of them:
logo `web/public/dentvideo/icon-512.png`; screenshots from `web/public/dentvideo/landing/en/`;
pricing "Paid", Starter/Practice/Group as in the kit; **no free plan, no free trial**; platform
**Web** only (no iOS/Android: there is no app-store app yet); demo-clinic screenshots captioned
"Demo clinic". Where a form needs an email confirmation sent to hello@dentvideo.com, ask the owner
for the link or code.

1. **SaaSHub** — https://www.saashub.com/services/submit (account first if asked). Fields:
   `LISTINGS.md` §1 table. Competitors: Canva, CapCut, InVideo AI, VEED, Pictory. Submit.
   Do not buy the featured listing. After approval (days later) the owner clicks **Verify** with
   hello@dentvideo.com. Report: submission confirmation text and the listing URL if shown.
2. **G2 (also Capterra, GetApp, Software Advice)** — sign in at https://my.g2.com/signup (prefer
   hello@dentvideo.com), then https://www.g2.com/add_product_requests/new. Fields: `LISTINGS.md`
   §2 "Request form" (product name exactly "DentVideo"). Submit. The "After claiming" table is for
   later, once G2 approves (3-5 business days). Do not accept a paid plan, do not open the review
   invitation tools. Report: request confirmation, the email used, any reference number.
3. **AlternativeTo** — https://alternativeto.net → sign up and confirm the email (owner) → user menu
   → **Suggest new application**. Fields: `LISTINGS.md` §3 (description without links or emails,
   website without UTM tags). Do **not** pay for priority review. Do not add DentVideo as an
   alternative on other apps' pages until it is approved. Report: confirmation and URL if shown.
4. **TrustRadius** — https://www.trustradius.com/vendor/claim-your-profile → create a vendor
   account with a work email (hello@dentvideo.com) → Vendor Access Request; if DentVideo is not
   found, use "add a product". Fields: `LISTINGS.md` §4. Do not buy a premium profile, do not
   start review-generation campaigns. Report: confirmation and portal URL.
5. **Product Hunt: account only** — https://www.producthunt.com → **Sign up** with the owner's
   personal account (Google, LinkedIn or X). Fill in the profile: name, photo if the owner wants,
   headline "Founder, DentVideo", website https://dentvideo.com. **Do not** create a product page,
   post, schedule a launch, upvote, comment or follow in bulk. (A new account must wait about one
   week before it can post; the launch is a later, separate decision with `LISTINGS.md` §5.)
   Report: profile URL (`producthunt.com/@username`) and the date the account was created.
6. **STOP and report** with the full table below.

Not in this runbook (owner decides separately): There's An AI For That (paid only), Futurepedia
(paid), Dentaltown article, SourceForge, paid dental directories, and every `COMMUNITY.md` answer.

---

## Report template (paste back to the owner and to the DentVideo session)

| # | Item | Result | URL / ID | Notes (empty fields, differences, things the owner must do) |
|---|---|---|---|---|
| 1 | validate.py | PASS/FAIL | | |
| 1 | Google Ads account | created / blocked at … | customer ID, time zone, currency | |
| 1 | Conversion actions | dv_signup, dv_paid created | | |
| 1 | CSV import | route per file, counts | | |
| 1 | Campaign settings check | all paused, budgets €4.50/€8.00/€4.50 | | |
| 1 | Search Console link | linked / not offered | | |
| 1 | Advertiser verification | status | | |
| 2 | LinkedIn page | live | page URL, numeric company ID | |
| 3 | Crunchbase | live / pending | profile URL | |
| 4 | SaaSHub | submitted | | owner: Verify after approval |
| 4 | G2 (Capterra, GetApp, SA) | request sent | | owner: claim after approval |
| 4 | AlternativeTo | suggested | | |
| 4 | TrustRadius | requested | | |
| 4 | Product Hunt | account created | @username, created date | no launch |

Afterwards the DentVideo session adds the live profile URLs (LinkedIn, Crunchbase, G2, Product Hunt,
…) to the site's `sameAs` entity data. That is a separate code change.
