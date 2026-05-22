# Pre-Submission Checklist — App Store

**Submission date target: 2026-05-19**

This is the ordered, blocking list. Don't archive until every box is checked.

---

## 1. Backend (server-side ready)

- [x] Supabase migrations 00001–00008 applied to `rgtxjjnalesquhnexfez` (AuraGlow)
- [x] Storage buckets created: `clipforge-videos-raw`, `clipforge-videos-rendered`,
      `clipforge-thumbnails`, `clipforge-faces`, `clipforge-uploads`,
      `clipforge-avatars`, `clipforge-music`
- [x] 4 stock avatar portraits uploaded to `clipforge-avatars/stock/`
- [x] 12 procedural music seeds in `clipforge-music/` **(temporary — replace before launch)**
- [x] Reviewer account created (`appreview@bulsulabs.xyz`)

## 2. Coolify env vars

Worker (`aeoe3zdfhbhqzi89g32gkuwx`):

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY` — **you provide**
- [ ] `FAL_KEY` — **you provide (https://fal.ai → API keys)**
- [x] `REDIS_URL`
- [x] `WORKER_INTERNAL_TOKEN`
- [ ] `APNS_KEY_ID` — Apple Developer → Keys → APNs key
- [ ] `APNS_TEAM_ID` — Apple Developer → Membership
- [ ] `APNS_KEY_P8` — `.p8` file body, `\n` literal-escaped
- [ ] `APNS_BUNDLE_ID=com.bulsulabs.clipforge`
- [ ] `APNS_ENV=production` — **critical: must be `production` for App Store builds**
- [ ] `BG_MUSIC_ENABLED_GLOBAL=false` — **leave false until real CC0 tracks land**

Web (`y11bhiffmpb3u2hdekwhjhdq`):

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY` — **same as worker**
- [ ] `FAL_KEY` — **same as worker**
- [ ] `REVENUECAT_SECRET_KEY` — RC dashboard → API keys
- [ ] `REVENUECAT_WEBHOOK_AUTH` — same value across web + RC webhook config
- [ ] `NEXT_PUBLIC_REVENUECAT_PUBLIC_WEB_KEY` — RC iOS public key
- [x] `NEXT_PUBLIC_APP_URL`
- [x] `NEXT_PUBLIC_APP_NAME`

## 3. RevenueCat dashboard

- [ ] Project created
- [ ] iOS app added — bundle id `com.bulsulabs.clipforge`
- [ ] Apple App Store shared secret pasted (App Store Connect → Users → Shared Secret)
- [ ] Products imported: `clipforge_plus_weekly`, `clipforge_plus_monthly`,
      `clipforge_plus_yearly`, `clipforge_credits_booster`,
      `clipforge_credits_power`, `clipforge_credits_pro`
- [ ] Entitlement `starter` → all 3 subscription products attached
- [ ] Offering `default` exists, containing all 6 packages
- [ ] Webhook configured: `https://clipforge.bulsulabs.xyz/api/revenuecat/webhook`
      header `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>`

## 4. App Store Connect

- [ ] App created at `appstoreconnect.apple.com` — bundle id matches
- [ ] App Information filled (category, age rating)
- [ ] 6 in-app purchases created:
  - [ ] `clipforge_plus_weekly` (Auto-renewable, 1 week, $5.99)
  - [ ] `clipforge_plus_monthly` (Auto-renewable, 1 month, $14.99)
  - [ ] `clipforge_plus_yearly` (Auto-renewable, 1 year, $59.99)
  - [ ] `clipforge_credits_booster` (Consumable, $9.99 → +10 credits)
  - [ ] `clipforge_credits_power` (Consumable, $19.99 → +30 credits)
  - [ ] `clipforge_credits_pro` (Consumable, $49.99 → +80 credits)
- [ ] **No Introductory Offer (free trial) configured on any subscription**
- [ ] Subscription group `ClipForge Memberships` created
- [ ] Promotional offer `plus_retention_1299` attached to `clipforge_plus_monthly`
      (3 months × $12.99, Existing Subscribers, Pay-as-you-go)
- [ ] Localization filled for `en-US` and `tr` (description, keywords)
- [ ] Privacy Policy URL filled
- [ ] Support URL filled
- [ ] Marketing URL filled

## 5. App Review Sign-In Information

Paste these **only into ASC App Review tab** (not in git repo):

```
email:    appreview@bulsulabs.xyz
password: LQXguRkZfrLzO1T8dTFh1088
```

Notes for the reviewer (paste in "Notes" field):

```
Pre-funded test account: 5 credits, Plus entitlement active so all gated
features unlock immediately.

Suggested 90-second walk-through:
1. Sign in with the credentials above
2. Studio → "+" → "Clip from URL · 1 cr"
3. Paste any YouTube link e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ
4. Wait ~60–90s for render (push notification arrives)
5. Open the project → tap a clip thumbnail to play
6. Three-dot menu on a clip → "Translate" or "Face swap" to test AI tools
7. Settings → Choose plan to see paywall localization

Subscription IAPs:
  clipforge_plus_weekly   $5.99/wk   → 10 credits / week
  clipforge_plus_monthly  $14.99/mo  → 40 credits / month
  clipforge_plus_yearly   $59.99/yr  → 500 credits / year (best value)

Consumable credit packs (Plus members only):
  clipforge_credits_booster  $9.99   → +10 credits
  clipforge_credits_power    $19.99  → +30 credits
  clipforge_credits_pro      $49.99  → +80 credits

No free trial offered (introductory offer disabled on all subscriptions).

Promotional offer (Apple win-back, $12.99/mo for 3 months) triggers when
user opens "Manage / cancel subscription" in Settings.

Renders run on our own Supabase + worker stack in EU. We do not train
on user content. Free clips auto-delete after 30 days.

Questions: hello@clipforge.bulsulabs.xyz
```

## 6. Screenshots (6.7" iPhone 17 Pro Max, 1290×2796)

Take these in the iOS Simulator — iPhone 15 Pro Max with the Display Zoom
on, recording via `xcrun simctl io booted screenshot`:

- [ ] Onboarding screen 1 (Hero)
- [ ] Studio with 3-4 sample jobs (one in progress)
- [ ] JobDetailView with 8 clip thumbnails
- [ ] ClipPlayerView full-screen
- [ ] AvatarStudioView with 4 stock avatars visible
- [ ] PlansView with the "Current Plan" badge unset (clean state)

Optional: add a single short marketing line at the top of each via
Canva / Figma. Apple does NOT require this but it boosts CTR.

## 7. iOS build

- [ ] In `ios/` run `xcodegen generate`
- [ ] Open `ClipForge.xcodeproj` in Xcode
- [ ] Set `DEVELOPMENT_TEAM` in target settings to your Apple Developer team id
- [ ] Verify entitlement `aps-environment = production` (already in project.yml)
- [ ] Verify Secrets.swift has real values:
      - `revenueCatIOSKey` = `appl_...` from RevenueCat
      - `supabaseURL` = `https://rgtxjjnalesquhnexfez.supabase.co`
      - `supabaseAnonKey` = the JWT (208 chars)
      - `sentryDSN` = (optional) from sentry.io
- [ ] Bump `CFBundleVersion` to `1` (already)
- [ ] Bump `CFBundleShortVersionString` to `1.0` (already)
- [ ] Product → Archive
- [ ] Distribute App → App Store Connect → Upload
- [ ] In ASC, attach the build to your prepared version
- [ ] Submit for Review

## 8. Smoke tests before archive

- [ ] Run app in Simulator — onboarding → sign in with reviewer → Studio loads
- [ ] Create a project with a short test YouTube link
- [ ] Wait for render — push notification arrives
- [ ] Open clip → plays without crash
- [ ] Open Settings → Choose plan — PlansView shows price (sandbox $)
- [ ] Settings → Delete account — confirm sheet works (don't actually delete reviewer)
- [ ] Settings → Sign out — returns to LoginView cleanly

---

## What's intentionally NOT done before launch

- **Real CC0 background music** — `BG_MUSIC_ENABLED_GLOBAL=false` until we
  upload Pixabay / YouTube Audio Library tracks. The procedural seed catalog
  shipped today is for shape only.
- **Custom avatar uploads** — UI shows only the 4 stock avatars.
  Custom photo upload is API-supported but not wired in iOS.
- **Background score weights tuning** — initial weights, will iterate on
  real user data post-launch.
- **Analytics events table** — RevenueCat handles purchase funnels;
  we'll add product-event analytics in v1.1.

## Notes

- Submission usually clears review in 24–72h. First-time apps sometimes get
  metadata rejections — keep keywords + description above clean.
- If rejected on the AI Face Swap feature: add a one-line disclaimer in
  description "Use only on faces you have consent to use." We already
  forbid this in Terms.
- App Tracking Transparency (ATT) prompt is NOT required for us — we
  don't track across third-party apps. Privacy questionnaire answer:
  "Data Not Used to Track You."
