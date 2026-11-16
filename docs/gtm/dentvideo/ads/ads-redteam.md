# DentVideo ads launch: red-team review (2026-11-15)

> **Historical review (2026-11-15).** Prices quoted below ($79/$149, €79/€149, 2.490/4.490 TL) and conversion values (150/250 USD) were current then and are retired. Current values: `ads-plan.md` → "Güncelleme 2026-11-16 (3)", `LAUNCH.md`, `web/src/lib/dentvid/pricing.ts`.

Scope: `ads-plan.md` (including "Güncelleme 2026-11-15"), `ads-angles.md`, `pricing-memo.md`, `google-ads/*`, `docs/ADS_TRACKING.md`, the repo at `/home/user/clipforge` (branch `claude/ads-paid-value`; `origin/main` has #137), and the live site. I fetched the site with curl (AdsBot user agent) and Playwright (iPhone 13; time zones Istanbul, Berlin, Vienna, UTC and Los Angeles). Evidence scripts are in `scratchpad/redteam/` (`rt.cjs`, `rt2.cjs`, `apply_fixes.py`, `fixes-log.txt`).

**CSV changes made:** 87 edits. Originals are kept as `google-ads/*.orig.csv`, and `validate.py` was re-run: **RESULT: PASS**, 0 warnings, all 30 URL checks return 200. Note that `build_csvs.py` still produces the old files. Re-running it will undo these fixes unless they are ported into it.

---

## BLOCKER

### B1. The `/videos/*` agency-comparison pages show **$79 to every visitor**. The TR-4/DE-4 ads quote 2.490 TL / 79 €.
- **Evidence.** In Playwright with time zone Europe/Istanbul, `/videos/dentvideo-ajans-canva-chatgpt` shows "$79" and `<html data-dv-cur>` is unset. `/videos/dentvideo-agentur-canva-chatgpt` with Europe/Vienna shows "79 $". By contrast, `/tr` shows "2.490 TL" and `/de` shows "79 €".
- **Cause in code.** `components/dentvid/solution-page.tsx:56` renders `<FromPrice>`, but `<PriceRegion>` is only mounted in `components/dentvid/landing.tsx:553`. So the CSS never switches away from USD on these pages.
- **Risk.**
  - Real Turkish and German clinic owners land on a page that shows a different price and currency from the ad, and from what Dodo charges (TRY/EUR via `billing_currency`). That is misleading pricing (Google misrepresentation/destination policy; UWG § 5; TR Ticari Reklam Yönetmeliği), and it hurts conversion.
  - It affects every TR-4/DE-4 click and both comparison sitelinks.
- **Fix (done in CSV, interim).**
  - TR-4 Final URL is now `https://dentvideo.com/tr` and DE-4 is `https://dentvideo.com/de`. Both pages have the comparison table and the right currency.
  - The comparison sitelinks now point to the guides `/guides/dis-klinigi-sosyal-medya-yonetimi` ("Ajans mı, Yazılım mı?") and `/guides/praxismarketing-zahnarzt-agentur-oder-selbst` ("Agentur oder selbst?"). Neither guide shows a price, and neither sitelink mentions Canva or ChatGPT.
- **Fix (repo).** In `web/src/components/dentvid/solution-page.tsx`, `import { PriceRegion } from "./price-region";` and render `<PriceRegion locale={L} />` once inside the page. After that ships, you may restore the `/videos/*` URLs.

### B2. The server and crawler default is USD on `/tr` and `/de`, and production has no country header. Google's reviewer will most likely see "$79" next to ads that say "Aylık 2.490 TL'den" / "Ab 79 €".
- **Evidence.**
  - The server HTML renders all three variants. CSS shows only `.dv-cur-USD` until JS sets `data-dv-cur` (`app/dentvideo/dentvideo.css:356-375`).
  - `GET /api/dentvideo/geo` returns `{"country":null,"consentRequired":true}`. The response headers have no `cf-ray` or `server: cloudflare`, and the site is served by its own proxy (`alt-svc h3`).
  - `price-region.ts` → `guessCountry()` returns `countryFromTimeZone()` whenever a time zone exists. For UTC or America/* that is `null`, which means USD.
  - Playwright `tr_us` (Los Angeles time zone): `/tr` shows "$79". `de_utc`: `/de` shows "79 $".
- **Risk.** RSAs can be disapproved or limited for a price claim the destination doesn't show; about 70% of the RSA assets carry a TL/€ price. Real users on UTC devices, VPNs or abroad also see $.
- **Fix (repo, about 15 lines).**
  1. In `web/src/app/dentvideo/dentvideo.css`, after the existing currency rules, add a server-side default keyed on the `lang` attribute, which is rendered on the server (verified: `/tr`, `/de` and both `/videos` pages have `<html lang="tr|de">`):
     ```css
     html[lang="tr"]:not([data-dv-cur]) .dv-cur-USD,
     html[lang="de"]:not([data-dv-cur]) .dv-cur-USD,
     html[lang="es"]:not([data-dv-cur]) .dv-cur-USD,
     html[lang="tr"]:not([data-dv-tax]) .dv-tax-other,
     html[lang="de"]:not([data-dv-tax]) .dv-tax-other,
     html[lang="es"]:not([data-dv-tax]) .dv-tax-other { display: none; }
     html[lang="tr"]:not([data-dv-cur]) .dv-cur-TRY,
     html[lang="de"]:not([data-dv-cur]) .dv-cur-EUR,
     html[lang="es"]:not([data-dv-cur]) .dv-cur-EUR,
     html[lang="tr"]:not([data-dv-tax]) .dv-tax-tr,
     html[lang="de"]:not([data-dv-tax]) .dv-tax-eu,
     html[lang="es"]:not([data-dv-tax]) .dv-tax-eu { display: inline; }
     ```
  2. In `web/src/lib/dentvid/price-region.ts` → `guessCountry`, fall back to the page language when the time zone maps to no TR/EU country:
     ```ts
     const geo = normaliseCountry(args.geo); if (geo) return geo;
     const tz = countryFromTimeZone(args.timeZone); if (tz) return tz;
     return countryFromLocale(args.locale);
     ```
     The trade-off: a US-located visitor on `/tr` sees TL, then $ at the in-app plan step, which uses `profile.country`. That is acceptable.
  3. Add a check to `validate.py` (or a pre-launch step): fetch each Final URL with JS disabled and confirm that the visible price matches the campaign market.

### B3. Unverified: does Dodo actually charge 2.490 TL / 79 €?
- **Evidence.** The pricing memo says Localized Pricing rules are "for the owner to make; nothing was created" (§6.2). `billing.ts:180-198` sends `billing_currency` TRY/EUR. Without a TRY/EUR rule on the product, Dodo charges the USD base price (≈3.900 TL), or the checkout fails.
- **Risk.** Ad and landing page say 2.490 TL while the card is charged $79. That means chargebacks, misrepresentation, and a destroyed test.
- **Fix.** This is `LAUNCH.md` step 20. Do one real TR card checkout in TL and one DE card checkout in EUR, then refund both. Also confirm the TR card works for foreign online payments (many TR cards ship with "yurt dışı/internet alışverişi" switched off).

### B4. The conversion chain is not yet proven in production.
- **Status.**
  - #137 (per-market `dv_paid` 150/250) is merged on `origin/main` as `02216a6`. Deployment is not confirmed.
  - Migration `0019` was applied by hand and is unverified.
  - No production test row exists.
- **Fix.** Run `ADS_TRACKING.md` §6 in full: test click, then sign-up, then a row in `/admin/ads`, then a paid test, then the value shows 150 for a TR clinic and 250 for a DE clinic. Do not un-pause until a row appears. Both `LAUNCH.md` steps 18 and 19 apply.

---

## HIGH

### H1. The consent prompt never names Google. EU consent is therefore not "informed", and the prompt is out of line with Google's EU User Consent Policy (EUCP).
- **Evidence.** `components/dentvid/ad-consent-prompt.tsx:22-25`. DE: "Dürfen wir messen, welche Anzeige Sie zu uns gebracht hat? Nur, um die Ergebnisse unserer Anzeigen zu zählen". TR: "Sizi hangi reklamın getirdiğini ölçmemize izin verir misiniz?". The recipient (Google) and the transfer abroad are missing.
- **Risk.**
  - EUCP requires that the parties receiving the data are identified.
  - GDPR Art. 7 and TTDSG § 25 consent may be invalid. If so, every DE "GRANTED" row is unlawful.
  - KVKK explicit consent must be informed, and it is the simplest basis for the md. 9 transfer.
- **Fix (copy only).**
  - de:
    - title "Dürfen wir Google Ads melden, über welche Anzeige Sie kamen?"
    - text "Nur zur Messung unserer Anzeigen: Klick-Kennung, 90 Tage gespeichert, an Google übermittelt, nie verkauft."
  - tr:
    - title "Hangi reklamdan geldiğinizi Google Ads'e bildirmemize izin verir misiniz?"
    - text "Yalnızca reklam ölçümü için: tıklama kimliği 90 gün saklanır, Google'a (yurt dışı) aktarılır, satılmaz."
  - en:
    - title "May we tell Google Ads which ad brought you?"
    - text "Only to measure our ads: click id kept 90 days, sent to Google, never sold."

### H2. There is no geo header in production. Every ad visitor, Türkiye included, gets the prompt. `ADS_TRACKING.md` §3 ("TR: no prompt") is wrong.
- **Evidence.** The `/api/dentvideo/geo` result in B2. In Playwright, `/tr?gclid=…` with Europe/Istanbul showed "Sizi hangi reklamın getirdiğini…".
- **Side note.** `geo/route.ts` trusts a client-sent `CF-IPCountry`. `curl -H "CF-IPCountry: TR"` returned `consentRequired:false`. The server-side recheck in `ad-conversions.ts` → `acceptableClick` reads the same request headers, so a browser can skip the EU rule. Low abuse value, but it's a compliance hole.
- **Risk.**
  - Google-side conversions will undercount in both markets. People who ignore the banner store nothing, often 30–60% of visitors.
  - Bid automation thresholds (≥ 15 conversions per 30 days) slip further.
  - Kill/scale calls made on Google's columns will be wrong.
- **Fix.**
  - Month 1: keep the prompt for everyone. It is the legally safer reading under KVKK. Update `ADS_TRACKING.md` §3.
  - Make **first-party `/admin/funnel` (utm_campaign) the source of truth** for every kill/scale rule. Use Google conversions only for bidding later.
  - Later: put Cloudflare (proxied) or a GeoIP header in front, and have the proxy **overwrite** any `CF-IPCountry` sent by the client.

### H3. Keywords that buy patients, kids, fans and non-dental professionals. **Fixed in CSV.**
- **Evidence (original `4-keywords.csv`).** Phrase matches like "diş hekimi video" (matches "… video izle", kids' dentist cartoons), "diş hekimi tiktok" (fans), [diş hekimi instagram] (patients looking up a dentist), "diş kliniği instagram", "implant bilgilendirme videosu" (patients), "vorher nachher bilder zahnarzt" (patients shopping veneers), "instagram zahnarzt", "zahnarzt reels", "patientenaufklärung video" (any specialty).
- Also non-dental or lawyer intent: "sponsorlu reklam yasağı" (influencer law), "doktor…", "doktorlara sosyal medya yasağı", "33075 sayılı yönetmelik", "sağlık sosyal medya ajansı/yönetimi", "heilmittelwerbegesetz social media" (pharma/cosmetics).
- **Risk.** At TR caps of $0.70 and DE caps of $1.80, these are the highest-volume terms and would consume most of the budget with no buyers.
- **Fix applied.**
  - 11 keywords removed.
  - 7 switched from phrase to exact.
  - 2 narrowed: "diş kliniği yapay zeka video", "patientenaufklärung video zahnarzt".
  - 32 campaign negatives added:
    - TR: izle, oyun, oyunu, çizgi film, vlog, korkusu, ameliyat, anestezi, hastane, eczacı, psikolog, diyetisyen, fizyoterapist, güzellik merkezi, ünlü, fenomen.
    - DE: anschauen, lustig, witzig, spiel, angst, erfahrungen, veneers, zahnspange, türkei, ungarn, krankenhaus, klinikum, physiotherapie, kosmetikstudio, hyaluron, botox.
  - Keyword count is now 133 (exact 32, phrase 101).
  - The full list is in `redteam/fixes-log.txt`.

### H4. The test cannot answer its own question, so the kill rules will produce false negatives.
- **Evidence.** DE at $7/day and $1.5–1.8 CPC gives about 110–130 clicks in 28 days. At the plan's middle-row rates (5% × 15%) that is about 6 signups and 0.9 paid, so P(0 paid) is about 40% even if the funnel is fine. TR is volume-limited. The baseline is 0 of 5 trials paid at $29, and the price has since risen 2.7×. The "market ≥ $160, 0 paid" stop fires in DE around day 22.
- **Risk.** About $400 spent to learn "no signal", or the plan kills a viable market.
- **Fix.**
  - (a) Before spending: run the owner task "talk to the 5 non-payers". Also run a self-test of the paid path: signup, then email code, then plan, then Dodo.
  - (b) Make **leading metrics** the month-1 decision rules, from first-party data:
    - non-brand cost per signup: kill a market at > $40 after ≥ 80 clicks;
    - signup→preview completed: below 50% means fix onboarding;
    - checkout_opened per signup: ≥ 10 signups with 0 `checkout_opened` means pause.
  - (c) Keep "$400 and 0 paid means stop" only as the program-level stop.
  - (d) Report brand ad groups (TR-0/DE-0) separately. They would convert organically anyway and inflate the numbers.

### H5. "Geprüft" / "kontrol edilir" claims without the software qualifier. **Fixed in CSV.**
- **Evidence.** RSAs said "Vorab auf Werberecht geprüft", "Auf Werberecht vorgeprüft", "Jedes Skript vorab auf Werberecht und fachliche Richtigkeit geprüft", and "Her metin … kontrol edilir". The checks are LLM-based; the site footer itself says "softwaregestützt geprüft" / "yazılımla kontrol edilir".
- **Risk.** In German B2B advertising, UWG § 5 still applies. "Geprüft" in a health and legal context implies expert review, and dental agencies (the competitors these ads target) are exactly the kind of party that sends an Abmahnung. In TR, the comparable rule is the Ticari Reklam Yönetmeliği.
- **Fix applied.**
  - DE: "Softwaregestützt vorgeprüft"; "Jedes Skript vorab softwaregestützt auf Werberecht geprüft. Keine Rechtsberatung. / Sie entscheiden."
  - TR: "Her metin yazılımla, siz görmeden tanıtım kuralları ve klinik doğruluğa göre denetlenir."
- **Still open (page).** The `/de` comparison row says "Werberechtliche Prüfung … zweimal". Add "softwaregestützt" there and in the hero sub-line (`web/src/content/dentvideo.ts`, DE `compare`/`hero`).

---

## MEDIUM

### M1. Trademarks in ad text. **Fixed** for Canva and ChatGPT.
- **Changes.** "Ajans, Canva mı, DentVideo mu" became "Ajans mı, DentVideo mu?". "Agentur, Canva oder DentVideo" became "Agentur oder DentVideo?". The sitelink descriptions no longer name Canva or ChatGPT.
- **Why.** Both trademark owners can restrict their marks in ad text; the result is asset disapproval or "Approved (limited)".
- **Still in the ads.** "Instagram" and "TikTok" are used descriptively and may be limited. Every pinned position-1 slot has a non-trademark alternative (TR-1 / DE-1), so the RSAs keep serving.

### M2. Comparative and ROI claims that the new prices no longer support.
- **Ad.** "Ajans Ücretinin Küçük Kısmı" was **replaced with "Sabit Aylık Ücret"**. At 2.490 TL against the Armut floor of 3.500 TL, Starter is about 71% of the cheapest agency, which is not a "small fraction".
- **Page.**
  - `web/src/content/dentvideo.ts` TR compare "bir ajans ücretinin küçük bir kısmı" (≈ line 566) and FAQ "küçük bir kısmına mal olur" (≈ 635) → "çoğu ajans paketinin altında, sabit aylık ücret".
  - TR FAQ "Tek bir implant hastası … yaklaşık bir yıllık bedelini karşılar" (≈ 636) and DE FAQ "mehr wert als ein Jahr DentVideo" (≈ 378) → "mehrere Monate / birkaç aylık", as `pricing-memo.md` §4.4 requires. The DE ROI line already says "mehrere Monate", so the page currently contradicts itself.

### M3. Price lines in the free-checker ad groups. **Fixed.**
- **Problem.** TR-3/DE-3 RSAs could serve "Ücretsiz Reklam Kontrolü | Aylık 2.490 TL'den Başlar". That reads as a paid check, and the checker page shows no price.
- **Fix applied.** Replaced with "Instagram ve Web Metni İçin" / "Für Instagram und Website" / "Text bleibt in Ihrem Browser" and the existing free-in-browser descriptions.

### M4. Funnel friction for a buyer with zero social proof.
- **Friction points.**
  - Checkout is blocked until the email code is verified (`app/api/dentvideo/checkout/route.ts:64`).
  - Four steps before payment.
  - The `/start?lang=tr` footer and trust line are in English ("Every script is checked by software…", "Terms/Privacy/Refunds").
  - The seller is a Montenegro DOO behind a merchant of record.
  - There are no testimonials.
  - TR cards often need foreign e-commerce enabled.
- **Fixes.**
  - Localise the `/start` chrome.
  - Show the code-entry field inline on the plan step and test delivery to gmail, hotmail, outlook and yandex.
  - Add one TR line on the plan step: "Kartınızın internet/yurt dışı alışverişe açık olması gerekir".
  - Put the three real sample videos and the approval screen above the fold as the substitute for proof.
  - Never invent testimonials.

### M5. KVKK md. 9 transfer of TR click IDs to Google.
- **Evidence.** The privacy policy (`/tr/privacy` §6) only says "KVKK'nın 9. maddesinde öngörülen mekanizmalara uyarız".
- **Fix.** Weekly uploads are a regular transfer, so they need either standard contractual clauses (SCC) plus notifying the KVKK Authority within 5 business days, or explicit consent. The H1 prompt, once it names Google, can serve as explicit consent. Have counsel confirm, and name the mechanism in the policy.

### M6. Conversion windows and timing.
- **Late paid conversions are lost.**
  - The code drops rows when the export date is more than 90 days after the click, and purges click data at 90 days (`ad-conversions.ts` `rowsFor`/`withinWindow`, `ADS_TRACKING.md` §5).
  - The export is weekly. A paid conversion on days 84–90 is therefore lost if the next Monday export falls after day 90.
  - Fix: export twice a week, or on the day `dv_paid` lands.
- **dv_signup window mismatch.**
  - `dv_signup` has a 30-day window in Google, while the code records sign-ups up to 90 days after the click.
  - Late rows will be rejected. That is harmless, but set the window to 90 days for clean diagnostics.
- **Already correct.** Time zone (`Parameters:TimeZone=+0000` with UTC times), currency USD, Count = One, idempotency.
- **Cosmetic.** `admin-ads.tsx:52` shows "$5 / $250" and ignores the TR value of 150.

### M7. Bid caps against the realistic auction.
- **Caps.** TR caps of $0.40–0.80 are fine. DE caps of $1.80 on social and video terms will lose most auctions where agencies also bid, since agencies bid on "zahnarzt marketing".
- **Expected result.** DE will be impression-share-limited by rank, not by budget.
- **Fix.** Keep the caps; they are the guardrail. Watch "Search lost IS (rank)". Apply the +20% once only for ad groups with CTR ≥ 4%, as the plan says.
- **Budget split.** Start at **TR $5 / DE $9** rather than 7/7. TR is volume-limited per the plan, and an unspent TR budget does nothing.

---

## LOW

- **L1.** The `NEG-TR` negative "eğitim/eğitimi" blocks "hasta eğitimi videosu" style queries. Accept, or add those as exact keywords.
- **L2.** The brand keyword [dent video] can match English paintless-dent-repair searches. It is cheap; watch search terms.
- **L3.** The DE ad schedule (09:00–24:00 Istanbul time) shifts by one hour when Germany changes to summer time (28 Mar 2027). This is outside month 1.
- **L4.** Doc drift.
  - `LAUNCH.md` says 144 keywords (26/118); it is now 133 (32/101). Re-run `build_csvs.py` only after porting these fixes.
  - `ads-angles.md` §0.2/§0.3 are stale. `marketRules()` now has TR/DE/AT/CH packs (`worker/src/dental/locale.ts:214+`), and the md. 7/1-k notice exists (`worker/src/dental/mandatory-notice.ts`).
  - The pricing memo says signup = $10, while the plan and code say $5. Pick $5.
- **L5.** TR md. 7/1-k notice. The code shows it on screen only for procedure topics (`ON_SCREEN_FOR_ALL_TR = false`) and puts it in the caption for hygiene videos. The regulation says "görsel içeriklerde … okunaklı". **No ad mentions the notice, which is correct today.** Before running a "Zorunlu uyarı metni eklenir" claim, set `ON_SCREEN_FOR_ALL_TR = true` and get a counsel sign-off.
- **L6.** If Turnstile is ever switched on, the CSP (`script-src`/`default-src`) lacks `challenges.cloudflare.com` and sign-up will break.
- **L7.** Google's jurisdiction surcharges (TR and AT ≈ 5%) come out of the $450 prepayment. Expect about $430 of clicks.
- **L8.** "Keine Patienten im Bild" / "Hasta Görüntüsü Kullanılmaz" are absolute claims. Practice plan clips come from the clinic's own recordings. That is fine as worded, but don't extend the claim to "never".

## Policy and legal confirmations (no action needed)

- **Google healthcare & medicines.** Not triggered. This is B2B SaaS: no prescription drugs, pharmacy, telehealth or clinical services. No before/after or "guarantee" wording remains in the ads (`validate.py` banned-word scan passes).
- **"Free".** Used only for the checker, which is genuinely free with no signup ("Kayıt gerekmez", text stays in the browser; verified on `/tr/ad-checker` and `/de/ad-checker`). That is compliant.
- **Business info.** `/de/imprint` is complete under § 5 DDG: company, address, CRPS number, PIB, managing director. Advertiser verification name (BLS AI Automation DOO) matches it.
- **TR 33075.** It regulates health providers and promotion of health services. DentVideo's own ads promote software to dentists, so they are outside its scope. The residual exposure is md. 5/2 co-responsibility for content DentVideo generates for clinics. That is a product and terms-of-service issue, already mitigated by "siz onaylar, siz paylaşırsınız".
- **DE HWG.** Not applicable to ads for a software service aimed at professionals. UWG §§ 5/5a/6 apply (B2B included); H5, M1 and M2 cover that. The PAngV doesn't apply to B2B; "zzgl. MwSt." is already in the descriptions. The ad-checker is low risk under the RDG (Legal Services Act) given the automated-tool case law and the "keine Rechtsberatung" disclaimer.

---

## Verdict: **NO-GO today. GO once these 6 items are done** (about 1 dev day plus owner checks)

1. **B1.** Mount `<PriceRegion>` on `solution-page.tsx` (until then, the CSV already avoids `/videos/*`).
2. **B2.** Add the locale-default currency (CSS keyed on `lang`) and the `guessCountry` fallback. Confirm with JS off and a UTC/US time zone that `/tr` shows 2.490 TL and `/de` shows 79 €.
3. **B3.** Real TR (TL) and DE (EUR) card checkouts at Dodo show and charge the advertised amount.
4. **B4.** Deploy #137 and migration 0019, then run the `ADS_TRACKING.md` §6 end-to-end test, including a paid test with the 150/250 value.
5. **H1.** The consent prompt names Google Ads and the transfer (three strings).
6. **H4 / H2.** Write the leading-metric kill rules into the plan and use `/admin/funnel` as the source of truth. Talk to the 5 non-payers before spending.

The import CSVs themselves are fixed: H3, H5, M1 and M3 are applied, and validation passes. Import them as they are now, not from `build_csvs.py`.
