# DentVideo for iPhone: plan

> **Changed (2026-11-17): the app becomes a sales channel.** The owner decided that people who find
> DentVideo on the App Store can sign up and subscribe inside the app with Apple in-app purchase
> (RevenueCat), at the web's plans. That replaces the "no sign-up, no plan picker, no prices" parts of §1,
> §2 (Sign in / No active plan screens) and the 3.1.1/3.1.3 row of §6. The design, server API and
> runbook are in `docs/DENTVIDEO_IAP_PLAN.md`; the rest of this plan stands.

Status: plan for the first App Store version (1.0). Owner decisions already made are marked
**(decided)**. Everything here follows `CLAUDE.md`: no paid API spend, no invented claims, no
secrets in the repo.

## 1. What the app is

A native SwiftUI companion for clinics that **already have a DentVideo account** (decided). The
phone is where a dentist actually posts to Instagram and TikTok, so the app makes the weekly
loop short:

1. Monday morning a push says the week is ready (the same moment the "ready" email goes out).
2. The dentist watches each video full screen, reads the software-check notes, approves or
   declines (or approves all ready ones in one tap).
3. "Post" saves the video to Photos, copies the caption and hashtags, and opens Instagram,
   TikTok or the share sheet. The dentist ticks it as posted. Each video shows a suggested day
   and time; an optional local reminder fires then.
4. On Practice: the dentist records themselves with the filming card on screen; the clip uploads
   in the background and comes back as a finished video.

What the app is **not**: no sign-up, no plan picker, no prices, no purchase links, no "subscribe
on the web" wording (see section 6). No analytics SDK, no tracking, no third-party UI kit.

## 2. Screens and flows

| Screen | Contents | Notes |
|---|---|---|
| Sign in | Email, password, "Forgot password?" (the app asks the server to email the web's reset link; the new password is chosen on dentvideo.com/reset), help/privacy/terms links | No account creation. Same accounts as dentvideo.com. |
| No active plan | Clinic name, calm sentence "This account has no active plan at the moment", support email, sign out, delete account | No price, no button or link to buy, no "subscribe on the web". |
| Paused by DentVideo | Same layout, the web's paused sentence with the support address | `adminPaused` from the API. |
| This week (tab 1) | Week header (date range), progress (approved / posted), "Approve all ready" button, video cards (poster, title, state chip, suggested slot) | Pull to refresh; works offline from the last snapshot. Earlier weeks below. Empty state: "Your next videos arrive on Monday morning." |
| Video | Full-width player (AVPlayer, cached file when available), state, software-check notes in the clinic's language, Approve / Decline (decline asks for an optional note), caption preview | Notes are the reason codes the web shows (`reasons.ts`), never raw internal text. |
| Post sheet | Instagram / TikTok tabs with the ready text, "Save video and copy text", "Open Instagram", "Open TikTok", "More apps" (share sheet), "Mark as posted", suggested time | Only for approved videos. |
| Record (tab 2) | Practice: list of filming cards (opening, points, closing, avoid, setup), "Record" per card, upload list with progress. Starter: neutral sentence that own recordings are part of the Practice plan, nothing to buy. | Camera screen: AVCaptureSession, front/back, card overlay that can be collapsed, timer, retake/use. |
| Settings (tab 3) | Clinic details (name, city, handle, booking link), video language, narrator voice, closing line, notifications (week ready push, posting reminders + time), plan (read-only: plan name and state, no price), help (dentvideo.com/help in the app's language, privacy, terms, support email), sign out, delete account | Saves through the same validation as the web. |
| Delete account | What is deleted, type the confirmation word, delete. If a subscription is still active and cannot be cancelled automatically, the web's message is shown as is. | Guideline 5.1.1(v). |

Navigation: `TabView` with three tabs, `NavigationStack` per tab, sheets for post and delete.
Deep links: `https://dentvideo.com/app` (universal link) opens the week; a push opens the week.

## 3. API contract (new, bearer-authenticated)

All under `/api/dentvideo/mobile/v1/`. The mobile routes **never read cookies**; they read only
`Authorization: Bearer <Liman access token>`. Because no browser attaches that header by itself,
the origin guard exempts exactly this prefix (`lib/origin-guard.ts`). Every response is
`cache-control: no-store`. Errors: `{ error: string (clinic's language), code?: string }`.

| Method & path | Body | Answer | Checks |
|---|---|---|---|
| `POST session` | `{ email, password }` | `{ accessToken, refreshToken, expiresAt, user: { id, email } }` | Rate limit per IP and per address; refuses an account without DentVideo (`isDentvideoUser`) with 403 `not_dentvideo`, same wording for wrong password and unknown account. |
| `POST session/refresh` | `{ refreshToken }` | same as above | Rate limit per IP. |
| `POST session/signout` | `{ deviceToken? }` | `{ ok }` | Revokes the session server-side, forgets the device token. |
| `GET me` | – | `{ user, clinic: { id, profile, logoUrl? } \| null, plan: { state, tier, canMake, adminPaused, recordings }, locale, currentWeek }` | Owner's own clinic only. `tier` is a name, never a price. |
| `GET items` | – | `{ currentWeek, items: [LibraryItem + slot + shootCard] }` | Same rows as the web library (owner_id = user), 1 h signed URLs, slots from `weekSchedule`. |
| `PATCH items/{id}` | `{ approval, note? }` or `{ posted }` | `{ ok, stored? }` | Shared handler with the web route (owner_id filter + RLS, decidable statuses only). |
| `POST items/approve-week` | `{ week }` | `{ ok, approved: n }` | Only `ready` + `pending` items of that week of this owner. |
| `POST devices` | `{ token, environment, locale, readyPush }` | `{ ok }` | Token format checked; stored with the service role under the session's user id only. |
| `DELETE devices` | `{ token }` | `{ ok }` | Deletes only the caller's row. |
| `POST upload-url` | `{ size, contentType, name? }` | `{ path, uploadUrl, contentType }` | Shared handler with the web route (plan, quota, slots). |
| `POST recording` | `{ path }` | `{ ok }` | Shared handler (own folder path only, plan gate). |
| `POST clinic` | `{ profile }` | `{ id }` | Shared handler (profile schema, closing-line market rules). |
| `POST account/delete` | `{ confirm }` | `{ ok }` | Shared handler (Dodo cancel or 409, storage, rows, login). `confirm` = the clinic name (or email), as on the web. |
| `POST password-reset` | `{ email, locale }` | `{ ok }` | The web's route, unchanged (same limits, same answer whether or not the account exists). |
| `GET topic-requests` | – | `{ topics, available }` | Owner's own suggestions (RLS); `available: false` before migration 0025. |
| `POST topic-requests` | `{ text }` | `{ ok, topic, message }` | Shared handler (`handlers/requests.ts`): plain text 3–140, hard ad rules, 5 waiting at most, rate limit. |
| `DELETE topic-requests/{id}` | – | `{ ok }` | Only the caller's own, still waiting. |
| `POST items/{id}/change` | `{ note }` | `{ ok, change, left }` | Shared handler: own generated video, active plan, one running per video, 3 a week (worker spend guard enforces it again). |
| `GET items/{id}/subtitles?format=srt\|vtt` | – | the file | Own video only; 404 without stored cues. |

The existing cookie routes keep their exact behaviour: their bodies move into shared handler
functions (`lib/dentvid/*-handler.ts`) that both the cookie route and the mobile route call with
their own session. Existing tests stay green unchanged.

### Push

- New table `dentvid_devices` (migration `supabase/liman/0023_dentvid_devices.sql`, applied by
  hand): owner, APNs token, environment, locale, `ready_push`, timestamps. RLS on, owner may only
  read their own rows; writes only through the API with the service role, filtered by the
  session's user id. Rows go with the login (`on delete cascade`).
- The worker already calls `POST /api/internal/dentvideo/notify` at the clinic's civil morning
  hour when a week is ready. That route now also sends the push (`lib/dentvid/apns.ts`): the
  same morning moment as the email, in the clinic's language, to devices with `ready_push`.
  Tokens APNs reports as gone (410, `BadDeviceToken`) are deleted. No APNs keys: nothing is
  sent and the email still goes.
- Env (owner): `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8` (already used by the worker for
  ClipForge; the same team key works for every app of the team) and `DENTVID_APNS_BUNDLE_ID`
  (default `com.bulsulabs.dentvideo`). Environment per device (`production` from TestFlight and
  the App Store, `development` from Xcode builds).

### Universal links

`/.well-known/apple-app-site-association` answers per host: on dentvideo.com it lists
`<TEAM>.com.bulsulabs.dentvideo` for `/app` and `/app/*`; on clipforge.bulsulabs.com it is
unchanged.

## 4. Data model (app)

`DentVideoCore` (plain Swift package, compiles and tests on Linux and macOS):

- `Session` (tokens, expiry), `Me`, `Clinic`, `ClinicProfile`, `PlanInfo`, `LibraryItem`,
  `Slot`, `ShootCard`, `PostTexts`, `APIErrorBody`.
- `APIClient` (actor): JSON coding, bearer header, one transparent refresh on 401, typed errors
  (`unauthorized`, `needsPlan`, `rateLimited(retryAfter)`, `server(message)`, `offline`).
- `WeekBoard`: groups items by week, the current week (same `deliveryWeek` rule as the web and
  worker), card state, "approve all" candidates, progress.
- `PostKit`: the text for each network, hashtags clean-up, slot labels.
- `UploadRules`: 500 MB limit, content types, file extension.
- `SnapshotStore`: the last week list as JSON for offline start.

App target: `AppModel` (`@Observable`, `@MainActor`), `KeychainTokenStore`, `VideoCache`
(approved videos downloaded to Caches, 14 days, max 2 GB), `UploadCenter` (background
`URLSession`), `PushCenter`, `ReminderScheduler` (local notifications), SwiftUI views.

## 5. Design

Matches dentvideo.com: deep teal `#0f5c5c`, paper `#faf7f2`, sand `#f5efe6`, ink `#14211f`,
hairline `#e8e1d5`; serif headings (system serif, New York, as the native counterpart of
Instrument Serif), sans body, generous spacing, 20 pt card radius, one soft shadow. Dark mode with
deep-teal surfaces. Dynamic Type everywhere (no fixed font sizes), VoiceOver labels and hints on
every control, 44 pt targets, right-to-left in Arabic (system mirroring; no hard-coded
left/right). iPhone first; iPad runs the same layout with a readable width.

## 6. App Review risks and how the plan avoids each

| Guideline | Risk | Mitigation |
|---|---|---|
| 3.1.1 / 3.1.3 | Digital subscription sold outside the app | DentVideo is sold only to dental clinics (businesses) for their own staff: **3.1.3(c) Enterprise Services** is the accurate basis ("only sold directly by you to organizations or groups for their employees"). 3.1.3(b) Multiplatform Services, as currently worded, also requires the items to be "available as in-app purchases within the app", so it is not relied on alone. Either way the app contains no prices, no buy buttons, no links or wording that points to buying (outside the US storefront exception, which we do not use). No sign-up in the app. |
| 2.1 | Reviewer cannot sign in | Review notes give a demo clinic account with an active plan and a ready week (owner creates it, section 9 of `APP_STORE_DENTVIDEO.md`). |
| 4.2 | "Just a website" | Native player with offline cache, Photos + share sheet, push, camera recording with on-screen prompts, background upload, local reminders. |
| 5.1.1(v) | Account deletion | In Settings, same server deletion as the web. |
| 5.1.1 / 5.1.2 | Privacy | Privacy manifest, no tracking, App Privacy answers match the data actually sent (section in the App Store doc). Purpose strings for camera, microphone, Photos add-only. |
| 2.5.4 | Unused background modes | No `UIBackgroundModes` at all: alert pushes need none, and uploads use a background `URLSession`, which needs none either. |
| 1.4.1 / 5.1 medical | Medical claims | The listing and the app describe patient-education videos for the clinic's own channels; no diagnosis or outcome claims. |
| 3.2.2 | Unacceptable business model | Free download, no ads, no paywall in the app. |
| 2.3 | Accurate metadata | Screenshots from the real app with the demo clinic; no "best" or "#1". |

## 7. Test plan

- **Web (vitest)**: every new route: unauthenticated (no / malformed / expired bearer) → 401;
  cookie-only requests to mobile routes → 401; cross-clinic attempts (user A's token on user B's
  item, device token, recording path, upload) → refused and nothing changed; validation errors;
  rate-limit hits; shared handlers keep the web routes' existing tests green; origin guard
  exempts only the mobile prefix; APNs payloads in all eight languages, 410 clean-up, no keys →
  no send; AASA per host.
- **Swift (XCTest, `ios/DentVideo/Core`)**: API decoding of real-shaped fixtures; refresh on 401
  happens once; error mapping; week grouping and current week (UTC edge cases, Saturday evening
  switch); approve-all candidates; posting texts and hashtag clean-up (matches `posting.ts`
  cases); upload rules; localisation completeness of `Localizable.xcstrings` (every key, all
  eight languages, same placeholders); no price or purchase words in any app string.
- **CI**: `.github/workflows/ios-dentvideo.yml` on a macOS runner (manual or PRs touching
  `ios/DentVideo/**`): `swift test` for Core, XcodeGen, `xcodebuild build` for one simulator.
- **Manual on device (owner)**: sign in with the demo clinic, push from a test notify call,
  offline start in airplane mode, save to Photos, Instagram / TikTok hand-off, a 2 GB-free
  device recording upload while the app is in the background, VoiceOver pass, Arabic, largest
  Dynamic Type size, dark mode, iPad.

## 8. Out of scope for 1.0 (written down so nobody assumes it exists)

- Logo upload and the background-photo picker (web only).
- Starting a week manually (the Monday batch makes it; the web keeps the button).
- Byte-level resumable (TUS) uploads: 1.0 uses a background `URLSession` upload, which the
  system continues while the app is suspended and retries on network changes; a failed upload
  restarts with a fresh URL.
- Direct posting through the Instagram or TikTok SDKs (both need app keys); the app hands the
  video and text to the installed apps instead.
