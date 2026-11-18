# DentVideo in-app purchase (App Store via RevenueCat): plan and runbook

Status: **server side built, not deployed; migration 0026 not applied; iOS UI not built yet.**
This file is the shared design for the web, the worker and the iPhone app. It changes one decision of
`docs/IOS_APP_PLAN.md` (§1 "no sign-up, no plan picker" and §6 3.1.3(c)): the owner now wants the app
to be a sales channel, so people who find DentVideo on the App Store can sign up and subscribe inside
the app with Apple in-app purchase. Everything else in that plan stands.

Rules from `CLAUDE.md` that apply here: no paid API calls in tests, no invented claims, no discounts or
free periods, the owner approves every App Store submission, the iOS release checklist must be green.

---

## 1. Products, group, entitlements

One subscription group, the same plans as the web (`web/src/lib/dentvid/pricing.ts`), monthly only.

| | Starter | Practice |
|---|---|---|
| App Store product id | `dentvideo_starter_monthly` | `dentvideo_practice_monthly` |
| Type | Auto-renewable subscription, 1 month | Auto-renewable subscription, 1 month |
| Subscription group | **DentVideo** | **DentVideo** |
| Level in the group (1 = highest) | 2 | 1 |
| RevenueCat entitlement | `starter` | `practice` |
| RevenueCat offering | `default`, package `$rc_monthly` style ids `starter_monthly`, `practice_monthly` | (same offering) |
| Server env override (only if a product is ever renamed) | `DENTVID_IAP_PRODUCT_STARTER` | `DENTVID_IAP_PRODUCT_PRACTICE` |

- No free trial, no introductory offer, no promotional offer, no offer codes (CLAUDE.md: no discounts,
  no free videos). Family Sharing **off** (the server ignores `is_family_share` events anyway).
- Group (multi-location) stays "Contact us" and is not sold in the app.
- The server decides the tier from the **product id** of the event (like Dodo: never from anything the
  client sends). Entitlements are what the app checks for UI; the server does not trust them.
- Code: `web/src/lib/dentvid/apple-billing.ts` (`DV_IAP_PRODUCTS`, `iapTierForProduct`).

## 2. Prices per storefront

Source of truth: `pricing.ts` — Starter USD 49 / EUR 49 / TRY 1.490, Practice USD 79 / EUR 79 / TRY 2.490.
Apple only allows its own price points, so the operator picks the nearest point per storefront and
lists the exact numbers for the owner **before saving** (app-store-operator rule).

| Storefront | Web list price | Nearest Apple point (expected; confirm in ASC's price picker) | Differs? |
|---|---|---|---|
| United States (base) | $49 / $79 | $48.99 or $49.99 / $78.99 or $79.99 (whole-dollar points may also exist; pick the closest the picker offers) | ~$0.01–0.99 |
| Euro storefronts (DE, FR, ES, IT, …) | €49 / €79 | €49.99 or the closest point; set per country, do not accept the automatic conversion from USD | see tax note |
| Türkiye | 1.490 TL / 2.490 TL | closest TRY point (e.g. 1.499,99 TL / 2.499,99 TL if those are the points); set manually | ~10 TL |
| Every other storefront | USD list | Apple's automatic equalisation from the US price | yes (FX) |

**Tax difference (owner decided 2026-11-17: match the number, see §12):** the web's prices are **tax-exclusive** (Dodo adds VAT/KDV at
checkout; the site says "+ VAT"). App Store prices in the EU and Türkiye are **tax-inclusive**: €49.99
on the App Store means the clinic pays €49.99 in total and Apple remits the VAT out of it. Matching the
*number* (as above) makes the app cheaper than the web for EU/TR clinics; matching the *total paid*
would mean roughly €59 (EU, ~20% VAT) and ~1.790 TL (20% KDV). The operator must not choose; it shows
both options to the owner. In the US both are tax-exclusive, so the number matches.

Apple keeps its commission (15% under the Small Business Program, 30% otherwise). The price is not
raised to cover it unless the owner decides so.

## 3. Identity: who bought it

- `app_user_id` = the Liman user id (UUID). The app calls `Purchases.logIn(user.id)` right after
  sign-in/sign-up and `Purchases.logOut()` on sign-out, **before** showing the paywall. `GET
  /mobile/v1/billing` returns `appUserId` so the app never builds it itself.
- A purchase made while RevenueCat still had an anonymous id is aliased to the user at `logIn`; the
  webhook also tries `original_app_user_id` and `aliases` (only UUIDs; `$RCAnonymousID:…` is never a user).
- The webhook maps app_user_id → Liman login (must be a DentVideo account: `app_metadata.product`) →
  the clinic with `owner_id` = that login. Nothing else (email, metadata, client claims) is used.
- RevenueCat project setting **Transfer behaviour: "Keep with original App User ID"** (recommended): a
  subscription cannot hop to another clinic's account by "Restore purchases". If it is set to transfer
  anyway, the webhook handles `TRANSFER` (§5).

## 4. Cross-channel rules (web Dodo ↔ App Store)

One clinic, one plan, one source. `dentvid_clinics.billing_source` = `dodo` | `apple` (null = web or
no plan yet), `apple_original_transaction_id` = the Apple subscription the plan comes from (0026).

| Situation | What the clinic sees | What the server does |
|---|---|---|
| Paid on the web (Dodo), opens the app | No paywall. Plan screen: "Your plan is managed on the web" (no link, no price; guideline 3.1.1) | `GET billing` → `showPaywall: false, manage: "web"` |
| Paid in the app (Apple), opens dentvideo.com | Settings: "Managed in the App Store" + button to Apple's subscriptions page; no Dodo portal, no plan switch | `loadClinicPlan.source = apple`; account panel hides Dodo controls |
| Apple plan, tries web checkout | Refused (409 `app_store`): "change or cancel it in Settings > your name > Subscriptions" | `loadCheckoutBlock` → `{ code: "app_store" }` (active **or** paused) |
| Dodo plan (active, paused, pending, cancelled-but-paid, disputed) opens the paywall | Paywall never shown | `mobileBillingView` → `showPaywall: false` |
| Dodo live (active, on hold, or cancelled but paid up) **and** an Apple purchase / renewal arrives | Nothing changes: the clinic stays on its web plan. The Apple subscription waits (ledger `ignored_web_active`); its refund, expiry or billing issue never touch the web plan. Owner alert (urgent) `web_active`: contact the clinic — did it buy in the app? | `apple-webhook.ts` step b |
| …then the web plan ends | Wherever it ends — Dodo's webhook (`subscription.cancelled`/`expired` with no paid time left), the worker's paid-date check (plan-end, F9), or the nightly reconcile (Dodo says cancelled/expired) — the waiting Apple subscription (production, a tier, paid through a future date) takes over at once with `billing_source = apple`: no gap, no second week, no second welcome; owner alert `web_active` ("now runs on the App Store subscription"). Ledger unreadable (no 0026): the plan ends as before and the owner gets an urgent `takeover_unchecked` alert. A web plan that is only paused (on hold) is not ended, so nothing takes over | `billing-webhook.ts` → `adoptWaitingApple`; worker `apple-takeover.ts` (from `plan-end.ts`, `reconcile.ts`) |
| Race: Apple live **and** a Dodo activation arrives | Plan untouched (stays Apple). Owner alert: cancel + refund the Dodo one | `billing-webhook.ts` step 0 `appStoreOwns` |
| Old Dodo sub events (cancel, on hold, payment.failed, chargeback) while Apple pays | Nothing changes; no "update your card" email | `billing-webhook.ts` guards (`appleManaged`) |
| Apple plan ended (expired/refunded), clinic pays on the web | Normal web activation; `billing_source` back to `dodo`; not a "first" payment | `setDodoSource` |
| Two Apple IDs subscribe for one clinic | Stays on the first; the second recorded as `duplicate`; when the first ends the clinic moves to it | owner alert `apple_duplicate` (customer must cancel one + ask Apple for a refund) |

**Why the web plan wins a conflict:** RevenueCat's `app_user_id` is whatever the app passes to
`Purchases.logIn`, and anyone with the public SDK key can name any login id. If an App Store purchase
could take a clinic off its web plan, a stranger could buy in the clinic's name, ask Apple for a refund,
and the clinic's paid web plan would be gone. The app never offers a purchase to a clinic that pays on
the web, so a real customer only gets here by accident (a race); the owner contacts the clinic and either
cancels the Dodo subscription (the Apple one then takes over) or the customer asks Apple for a refund.

## 5. Event handling (`POST /api/dentvideo/revenuecat/webhook`)

Auth: `Authorization` header equal to `DENTVID_REVENUECAT_WEBHOOK_AUTH` (raw or `Bearer …`), compared as
SHA-256 digests with `timingSafeEqual`; unset or shorter than 16 chars → every call 401. Body ≤ 64 KB.
Each delivery is claimed once by RevenueCat's event id (`lib/webhook-replay`, Redis), and the ledger
keeps `last_event_id` and `last_event_at` (an older event never undoes a newer one).
Code: `web/src/lib/dentvid/apple-webhook.ts`, pure rules in `apple-billing.ts`.

| Event | Effect on the clinic (only when it is the clinic's current Apple subscription, except purchases) |
|---|---|
| `INITIAL_PURCHASE` | Active, tier from product, `plan_renews_at` = expiration, `billing_source = apple`. **First activation runs the web's own activation** (`billing-activation.ts afterPaid`): week queued now, watchdog marker, owner "new paying clinic (App Store)", welcome once per clinic, funnel `payment_succeeded {source: apple}` |
| `RENEWAL` | Active, new expiration. From paused (billing issue) → active again, week queued (returning clinic) |
| `PRODUCT_CHANGE` | Upgrade (Starter → Practice): tier now (Apple prorates). Downgrade/crossgrade: recorded as `pending_tier`; the next `RENEWAL` carries the new product and applies it |
| `CANCELLATION` (auto-renew off) | Stays active until the paid period ends (web F9 rule); ledger `cancelled`; owner "at risk" once. Expiration already past → cancelled now |
| `CANCELLATION` with `cancel_reason = CUSTOMER_SUPPORT`, or `REFUND` | Refund: plan ends **now** (cancelled), owner alert. Videos already made stay in the library |
| `UNCANCELLATION` | Auto-renew back on: active, ledger `active` |
| `EXPIRATION` | Cancelled (or moves to another live Apple subscription of the clinic) |
| `BILLING_ISSUE` | With Apple's Billing Grace Period (`grace_period_expiration_at_ms` in the future): stays active until the grace ends. Without: **paused** (like Dodo `on_hold`). Apple emails the customer about the card; we do not. `RENEWAL` recovers it; `EXPIRATION` ends it |
| `SUBSCRIPTION_PAUSED` | Recorded only (Apple has no pause; RevenueCat sends this for Play) |
| `TRANSFER` | The account it left loses the plan (if it was the source); the receiving account is switched on only when the event itself carries a DentVideo product and a future expiration. Owner alert |
| `REFUND_REVERSED` | Recorded, owner alert; plan not switched back on automatically |
| `SUBSCRIPTION_EXTENDED` | Like a renewal (new expiration) |
| `TEST` | 200, nothing else (no clinic needed) |
| anything else (`NON_RENEWING_PURCHASE`, `TEMPORARY_ENTITLEMENT_GRANT`, `SUBSCRIBER_ALIAS`, …) | 200, ignored |

Always ignored (with an owner alert for purchase events): store other than `APP_STORE`/`MAC_APP_STORE`
(promotional grants from the RevenueCat dashboard are **never** a free plan), family sharing, a product
that is not a DentVideo plan.

Responses: 200 handled/ignored · 401 auth · 413/400 body · **503 when the login exists but has no clinic
yet** (RevenueCat retries with back-off; owner alert) · 500 database or Liman errors (retry; owner alert
once a day per event type). Unknown app_user_id → **200 + urgent owner alert** (a retry will not make
it known).

**Sandbox** (`environment = SANDBOX`: TestFlight, App Review, Xcode builds; no money moves):
`DENTVID_IAP_SANDBOX` = `internal` (**default**), `off`, or `allow` (only if set explicitly: anyone with a
TestFlight build gets a free first week). Under `internal` a sandbox purchase switches a clinic on only
when its owner's address is **proven** (the 6-digit code) and either is listed in
`DENTVID_IAP_SANDBOX_ALLOW_EMAILS` (exact addresses: the App Review demo account) or matches an internal
pattern that names a domain (`*@bulsulabs.com`, `*@dentvideo.com`, plus `DENTVID_INTERNAL_EMAIL_PATTERNS`).
Catch-all patterns (`qa+*@*`, `e2e*@*`) and `app_metadata.internal` do not count: an outsider can own
such a mailbox or ask for the flag at sign-up. A sandbox purchase never takes over a plan that something
else pays for. Every sandbox activation alerts the owner; a sandbox-activated clinic gets its first week
(real model spend, a few dollars); sandbox subscriptions expire on their own within hours.

## 6. Mobile API (bearer session, `cache-control: no-store`, session's own clinic only)

| Route | Answer |
|---|---|
| `POST mobile/v1/signup` `{ email, password, elapsedMs, locale }` | `{ ok, signedIn, session: { accessToken, refreshToken, expiresAt, user } }`, or `{ ok, existing: true }`. The web's handler (`handlers/signup.ts`): same per-IP / network / address / global limits plus `rl:signup:mobile:global`, fill-time check (the app reports `elapsedMs`; < 2.5 s or missing → refused), 6-digit code emailed at once, internal-traffic marking. No Turnstile (browser widget), no cookie |
| `POST mobile/v1/verify-email` `{ action: send \| confirm \| change }` | The web's code handler (`handlers/verify-email.ts`) for the bearer user |
| `GET mobile/v1/billing` | `{ appUserId, clinicId, plan: { state, tier, source, renewsAt, endsAt }, status, showPaywall, canPurchase, blockers: ["clinic" \| "email_unverified"], manage: "app_store" \| "web" \| null, manageUrl, products: [{ tier, productId, entitlement }] }` — **no price** (StoreKit shows the storefront's localized price) |
| `GET mobile/v1/preview` | The paywall's "your videos in your colours" data from the static, already-reviewed preview library: `{ language, controlsSide, clinic: { name, handle, brandColor, logoUrl }, samples: [{ id, title, planPath, audioPath, seconds }], servicesWithoutSample }`. No generation, no model call |

App flow: sign up → verify code → clinic form (`POST mobile/v1/clinic`, exists) → preview → paywall
(`canPurchase` true) → `Purchases.purchase(package)` → poll `GET billing` (or `GET me`) until
`status: active` (the webhook usually lands in seconds; show "activating" for up to 2 min, then
"we're confirming your purchase — you will get an email"). The app's paywall must show, per guideline
3.1.2: plan name, price per month from StoreKit, auto-renewal, how to cancel, links to Terms
(`https://dentvideo.com/terms`) and Privacy (`https://dentvideo.com/privacy`), and a **Restore Purchases** button (`Purchases.restorePurchases()`).

## 7. Decisions recorded

- **Google Ads conversion (`dv_paid`)**: recorded **only for web (Dodo) payments**. An App Store
  purchase is not a web conversion (the click, the consent and the purchase are not the same funnel,
  and Apple's revenue is net of commission). The Apple path passes `adConversion: false` to the shared
  activation; tested. The funnel still records `payment_succeeded` with `source: apple`.
- **Welcome email**: the same email, once per clinic, whichever channel paid.
- **Payment-problem email**: not sent for Apple (Apple notifies the customer; our wording is about cards
  on the web).
- **Account deletion with an active Apple subscription**: deletion is **not blocked** (we cannot cancel
  it; Apple requires deletion to be possible in the app). The answer carries `appStoreSubscription: true`,
  a localized notice ("Deleting your account does not cancel your App Store subscription. Cancel it in
  Settings > your name > Subscriptions…") and Apple's manage URL; the app shows it before and after
  deleting. Later webhooks for the deleted login → "matched no account" owner alert.
- **Web purchase path stays** for web visitors. The app never links to it, never mentions it, never
  shows a web price.

## 8. Reconcile (nightly, worker `reconcile.ts`)

App Store clinics are never looked up at Dodo. With `DENTVID_REVENUECAT_RECONCILE=on` **and**
`DENTVID_REVENUECAT_API_KEY` (a secret v1 key of the RevenueCat "DentVideo" project) the worker asks
`GET https://api.revenuecat.com/v1/subscribers/{app_user_id}`: latest expiry (or grace) of DentVideo's
products, refunds excluded. Paid later → date corrected; not paid → cancelled + owner alert; no answer →
the clock: a cancelled (auto-renew off) plan past its end → cancelled; otherwise 3 days past
`plan_renews_at` with no renewal webhook → paused + owner alert. Without the flag or key the clock alone runs.

## 9. Migration `supabase/liman/0026_dentvid_apple_billing.sql` (not applied)

- `dentvid_clinics.billing_source` (`dodo`/`apple`), `apple_original_transaction_id`, a guard trigger
  that reverts owner writes to both (owners keep table-level update rights for their profile).
- `dentvid_apple_subscriptions` ledger (service role only: RLS on, no policies, grants revoked).
- Code tolerates its absence: the webhook still activates a paying clinic (and alerts "apply 0026"),
  the web treats every plan as Dodo's, the reconcile skips the App Store branch.

## 10. Runbook (owner / Mac session). Do these in order; nothing here is done yet.

**A. App Store Connect (owner's Mac, browser, 2FA)** — DentVideo app record only, never another app.
1. Agreements, Tax, and Banking: the **Paid Apps** agreement must be active (owner confirms).
2. My Apps → DentVideo → Monetization → Subscriptions → **+ Subscription Group** "DentVideo".
3. Add `dentvideo_practice_monthly` (level 1) and `dentvideo_starter_monthly` (level 2): duration
   1 month; display names "Practice" / "Starter" in all eight languages; descriptions (no claims, no
   prices in text); review screenshot of the paywall (after the iOS UI exists).
4. Prices: base country United States, then set EUR storefronts and Türkiye **manually** per §2 after
   the owner picked the tax option; list the exact points for the owner before saving.
5. No introductory or promotional offers, no offer codes. Family Sharing off.
6. Billing Grace Period: **on** (subscription group settings); the owner picks the length Apple offers
   for monthly plans. Billing retry is Apple's default.
7. App Store Server Notifications: leave to RevenueCat (step B.4 gives its URL if it asks).
8. Users and Access → Integrations → **In-App Purchase** key (for RevenueCat's StoreKit 2 validation)
   and, if RevenueCat asks for it, the **App-Specific Shared Secret** for the DentVideo app. Download the
   .p8 once; never paste it in chat; upload it straight into RevenueCat.
9. App Store Connect API key (Admin or App Manager) for RevenueCat's product import, if not already there.

**B. RevenueCat (owner's browser)**
1. New project **"DentVideo"** (separate from ClipForge's project).
2. Add app → App Store, bundle id `com.bulsulabs.dentvideo`; upload the In-App Purchase key (.p8, key id,
   issuer id) and the shared secret / ASC API key as RevenueCat asks.
3. Products: import both product ids. Entitlements `starter` → Starter product, `practice` → Practice
   product. Offering `default` with both packages (current).
4. Project settings → Integrations → **Webhooks**: URL `https://dentvideo.com/api/dentvideo/revenuecat/webhook`,
   Authorization header value = a fresh random secret (≥ 32 bytes, e.g. `openssl rand -hex 32`),
   environment: both production and sandbox, events: all. Send the **test event** → expect 200 `{ test: true }`.
5. Project settings → **Transfer behaviour: Keep with original App User ID**.
6. API keys: the **public Apple SDK key** (`appl_…`) goes into the iOS app's config (it is public by
   design); a **secret v1 key** only if the reconcile check is wanted (step C).

**Apply D (the migration) before C**: without 0026 the server cannot tell an App Store plan from a web one.

**C. Server env (Coolify, web `y11bhiffmpb3u2hdekwhjhdq`; worker `aeoe3zdfhbhqzi89g32gkuwx` for the reconcile only)**
- Web: `DENTVID_REVENUECAT_WEBHOOK_AUTH` = the secret from B.4 (not the same value as ClipForge's).
- Web: `DENTVID_IAP_SANDBOX_ALLOW_EMAILS` = the App Review demo account's address (the plan-less one
  from §11), so App Review can complete a sandbox purchase. Prove that address first (sign in as the demo
  account and enter the 6-digit code): an unproven address is never allowed. Comma-separated if several.
- Web, optional: `DENTVID_IAP_SANDBOX` (`internal` default / `off` / `allow`, the last one never in
  production); `DENTVID_INTERNAL_EMAIL_PATTERNS` for testers' domains.
- Worker (optional): `DENTVID_REVENUECAT_API_KEY` (secret v1 key), `DENTVID_REVENUECAT_RECONCILE=on`.
- Set them through Coolify's env UI, never in chat or the repo.

**D. Database**: apply `supabase/liman/0026_dentvid_apple_billing.sql` by hand, run its checks.

**E. Verify** (after the PR is merged and deployed): RevenueCat test event → 200; a sandbox purchase by a
non-internal test account → `ignored: sandbox`, clinic unchanged; a sandbox purchase with an internal
(proven `@bulsulabs.com`) test clinic → clinic active, `billing_source = apple`, owner "sandbox" alert, first week
queued; web settings of that clinic shows "Managed in the App Store"; web checkout refused with
`app_store`; cancel in the sandbox → "ends on"; let it expire → cancelled.

## 11. App Review notes (to paste when the IAP build is submitted)

- Guideline **3.1.1** is now satisfied with In-App Purchase: the app sells the same two auto-renewing
  monthly plans as the website, through StoreKit (RevenueCat), with Restore Purchases and the required
  subscription disclosures on the paywall.
- The website keeps its own checkout for web visitors (allowed). The app does not link to it, mention
  it, or show web prices. A clinic that already pays on the website sees no paywall in the app and is
  told its plan is managed outside the app, without a link.
- Account deletion is in Settings; with an App Store subscription the app tells the user that deleting
  the account does not cancel the subscription and links to Apple's subscription management.
- Demo account for review: an account **without** a plan (to see the paywall and buy in the sandbox) and
  the existing demo clinic **with** an active plan (`APP_STORE_DENTVIDEO.md` §1.5). Before submitting:
  prove the plan-less account's address (6-digit code) and put it on `DENTVID_IAP_SANDBOX_ALLOW_EMAILS`;
  only that account (and internal ones) can complete a sandbox purchase (`DENTVID_IAP_SANDBOX=internal`).
  The demo clinic **with** a web plan sees no paywall; an App Store purchase made for it anyway does not
  replace its web plan.
- Update `docs/IOS_APP_PLAN.md` §6 and `APP_STORE_DENTVIDEO.md` §2 wording at submission time: the
  3.1.3(c) Enterprise argument no longer applies to this build.

## 12. Owner decisions (decided 2026-11-17)

1. **EU/TR tax: match the number.** The App Store shows the same number as the web (the nearest Apple
   price point to 49/79 USD/EUR and 1.490/2.490 TL), tax included. So in the EU and Türkiye the app
   is slightly cheaper than the web. This is accepted, and nothing in the app compares the two.
2. **Sandbox policy: `internal`.** App Review goes through `DENTVID_IAP_SANDBOX_ALLOW_EMAILS`.
   External TestFlight testers need their address on that list too.
3. **Reconcile via RevenueCat: on.** Set `DENTVID_REVENUECAT_API_KEY` and
   `DENTVID_REVENUECAT_RECONCILE=on` on the worker once the RevenueCat project exists.
4. **Commission: keep web prices.** No App Store markup. Apple takes 15% under the Small Business
   Program (applied for, awaiting Apple's answer).
5. **Restore on another account:** RevenueCat transfer behaviour "keep with original".
6. **A paused web plan (Dodo on hold)** does not hand over to a waiting App Store subscription, to
   avoid a double charge if Dodo recovers. The owner is alerted. Accepted as is.

## 13. Test matrix (server)

| Area | Tests |
|---|---|
| Event rules (every type, refunds, upgrades/downgrades, stores, family sharing, sandbox policy, ids) | `web/src/lib/dentvid/apple-billing.test.ts` |
| Webhook handler: every event, duplicates, out-of-order, unknown user, no clinic (503), Liman/DB errors (500), cross-channel (Dodo live → Apple held back as `ignored_web_active`, spoofed purchase + refund leaves the Dodo clinic untouched, takeover once the web plan ends), second Apple ID, refund, expiration after cancellation, billing issue ± grace, transfer, sandbox, missing migration, auth compare | `web/src/lib/dentvid/apple-webhook.test.ts` |
| Route: 401 (missing / wrong / ClipForge's secret / unset env), 413, 400, replay, retry release, 503 not paged | `web/src/app/api/dentvideo/revenuecat/webhook/route.test.ts` |
| Dodo webhook next to App Store plans (activation ignored + alert, deactivations ignored, no card email, no chargeback pause, back to Dodo after Apple ended, plain web clinic unchanged) | `web/src/lib/dentvid/billing-webhook-apple.test.ts` (+ every existing Dodo test unchanged) |
| Web checkout refusal `app_store`, panel, copy in 8 languages | `billing-state-apple.test.ts`, `app-store-plan.test.tsx` |
| Portal / change-plan refuse App Store plans | `billing/portal/route.test.ts`, `billing/change-plan/route.test.ts` |
| Account deletion with an App Store plan | `account.test.ts` |
| Mobile billing / preview / verify-email: auth (6 attack shapes each), cross-clinic, no price, blockers | `mobile/v1/mobile.test.ts`, `mobile/v1/verify-email/route.test.ts` |
| Mobile sign-up: tokens no cookie, limits incl. app ceiling, bot timing, no Turnstile, existing accounts | `mobile/v1/signup/route.test.ts` (+ the web sign-up's 26 tests unchanged) |
| Reconcile App Store branch, RevenueCat lookup off/on, refunded | `worker/src/dentvid/reconcile.test.ts` |
| Origin guard exempts only the new webhook path | `web/src/lib/origin-guard.test.ts` |
