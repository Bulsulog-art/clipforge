# ClipForge v2.0 — Production Deploy Checklist

Tag: pending  ·  Branch: `main`  ·  Commits ahead of last shipped: 53

This is the single source of truth for what needs to happen on the
infra side when `main` lands. Coolify will auto-pull web + worker on
push; the iOS build needs to go through Xcode → App Store Connect.

## 1. Supabase migrations (apply in order)

All migrations from `00018` up to `00022` need to land in production.
Apply via Supabase Studio → SQL editor, or via the Supabase CLI:

```bash
supabase db push --linked
```

New tables / columns in this release:
- `00018_referrals` — referral codes + redemption ledger
- `00019_promo_codes` — admin-issued promo codes + redemptions
- `00020_signup_source` — `profiles.signup_source` jsonb (UTM capture)
- `00021_voice_clones` — Plus voice clone table + RLS
- `00022_avatar_voice_clone` — `avatar_jobs.voice_clone_id` FK

## 2. New env vars (set in Coolify → web + worker → Environment)

### web/

| Var                     | Required | Default | Notes |
|-------------------------|----------|---------|-------|
| `ELEVENLABS_API_KEY`    | **yes** for Plus | — | Workspace key used by `/api/voice-clones` to forward samples to `/v1/voices/add`. Without it, voice-clone upload returns 500. |

### worker/

| Var                     | Required | Default | Notes |
|-------------------------|----------|---------|-------|
| `ELEVENLABS_API_KEY`    | **yes** for Plus | — | Same key as web. Used by `worker/src/steps/tts.ts` when a job has a `voice_clone_id` to call `/v1/text-to-speech/{id}`. |
| `COST_ALERT_USER_ID`    | recommended | — | Supabase user UUID that receives the daily spend-alert push. Without it, the monitor only logs + posts to webhook (no push). |
| `COST_ALERT_THRESHOLD`  | optional | `5` | USD threshold for the alert push. |
| `COST_ALERT_WEBHOOK`    | optional | — | HTTPS endpoint (Slack incoming webhook works as-is) for a daily spend heartbeat. |
| `ENABLE_COST_MONITOR`   | optional | `true` | Set to `false` to disable the daily cost monitor cron loop. |

## 3. iOS build → App Store Connect

```bash
cd ios
xcodegen generate
xcodebuild archive -project ClipForge.xcodeproj -scheme ClipForge \
  -configuration Release -archivePath build/ClipForge.xcarchive
xcodebuild -exportArchive -archivePath build/ClipForge.xcarchive \
  -exportOptionsPlist exportOptions.plist -exportPath build/
```

Then upload the `.ipa` via Transporter and attach as build `2.0 (2)`.

Apple Watch companion: the `ClipForgeWatch` target is paired via
`WKCompanionAppBundleIdentifier`. App Store will automatically include
it; no separate submission.

## 4. Smoke tests (do these on staging first, then prod)

1. Sign in → land on Home → "Today's pick" hero renders.
2. New Clip Set → paste public YouTube URL → job goes from `queued`
   through `transcribing` / `scoring` / `rendering` → at least 4 clips
   appear.
3. Tap a ready clip → AI Face Swap → uses pre-saved face → check
   before/after slider.
4. Settings → Voice clones → record 30s → see "Processing… Ready" →
   open AvatarStudio → Voice picker shows the clone → render → confirm
   ElevenLabs voice in the output.
5. Settings → Buy credits → RevenueCat sandbox purchase → balance bumps.
6. Settings → Export my data → ZIP downloads → contains your jobs +
   clips + branding.
7. iPad: relaunch in landscape → confirm sidebar layout.
8. Apple Watch: pair simulator → confirm complication on watch face.

## 5. Backend health check

```bash
curl https://clipforge.bulsulabs.xyz/api/health?mode=deep
```

Should return `200` with `{ status: "ok", subsystems: { supabase: "ok",
redis: "ok", openai: "ok" } }`. A non-200 means something failed; the
deep mode never throws so a 500 indicates the route itself is broken.

## 6. Rollback plan

If a critical bug ships, revert the merge commit on `main`:

```bash
git revert --mainline 1 <merge-sha>
git push origin main
```

Coolify will redeploy the previous build automatically. Migrations
00018-00022 are additive (no destructive `drop`s) so the previous web
+ worker build keeps working against the v2 schema — no DB rollback
needed.

## 7. Post-release

- Bump release notes on the public site (`web/src/app/page.tsx` hero
  badge → "v2.0 shipped")
- Email the existing user list with the "What's new" copy from
  `marketing-assets/asc-metadata.md`
- Monitor the cost monitor's daily heartbeat in Slack for the first 7
  days — voice clones are the new spend variable
