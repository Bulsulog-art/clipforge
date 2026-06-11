# ClipForge — Release & Verification Checklist

Everything on `feat/clipforge-completeness-wave1`. Work top-to-bottom.

## 0. Merge
- [ ] Review + merge the PR (or `git checkout main && git merge feat/clipforge-completeness-wave1`).

## 1. Env vars (set on the worker + web hosts)
New / relevant flags:

| Var | Where | Purpose |
|-----|-------|---------|
| `ENABLE_METRICS_CRON=true` | worker | Turn on the performance-analytics loop (off by default) |
| `METRICS_USE_MOCK=true` | worker | Populate **sample** metrics with NO social credentials — great for a first demo. Set `false` once real OAuth scopes are live. |
| `JUMPCUT_ENABLED=true` | worker | Render-test internal silence removal (off by default; off = byte-identical renders) |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | web | X (Twitter) connect + publish. Without them X connect 500s gracefully. |
| `BG_MUSIC_ENABLED_GLOBAL=true` | worker | Only after uploading real CC0 tracks to `music_tracks` |

Existing (must already be set): `OPENAI_API_KEY`, `TIKTOK_CLIENT_*`, `YOUTUBE_*`, `INSTAGRAM_*`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, fal/ElevenLabs keys.

## 2. DB migrations — already applied live
`clip_prompt`, `caption_style`, `aspect_ratio` on `video_jobs`; `00023` (grant-credits idempotency) + `00024` (record_refund). Nothing to run.

## 3. Deploy
- [ ] Web → Coolify redeploy (manual; webhook unreliable).
- [ ] Worker → redeploy.
- [ ] Edge functions if changed → `supabase functions deploy <slug> --project-ref rgtxjjnalesquhnexfez --no-verify-jwt`.
- [ ] Smoke: `/api/health` 200.

## 4. Verify the headlessly-built features (should "just work")
- [ ] **ClipAnything**: Studio → "Customize" → *What to clip* "the funny bits" → only matching clips.
- [ ] **Caption styles**: Customize → pick Neon/HYPE → captions differ.
- [ ] **Niche templates**: pick niche `comedy` vs `finance` → different caption/thumbnail/music/hook feel (Auto caption style).
- [ ] **Keyword highlight**: captions scale up the punchy words.
- [ ] **Analytics**: `/dashboard/analytics` shows totals/top-performers (with `METRICS_USE_MOCK=true`, sample data appears after the cron runs once).
- [ ] **Closed loop**: after metrics exist, new jobs bias hooks toward past winners (subtle — check scoring logs).

## 5. Render-test the flagged / visual features
- [ ] **Jump-cut**: set `JUMPCUT_ENABLED=true`, process a video with pauses → silences removed, captions still in sync.
- [ ] **Aspect ratio**: Studio → Customize → 1:1 and 16:9 → output framed + captioned correctly (9:16 unchanged).
- [ ] **Denoise**: podcast/phone audio comes out cleaner.

## 6. X (Twitter) — optional
- [ ] Create an X dev app (OAuth2, scopes: tweet.read tweet.write users.read media.write offline.access); set `X_CLIENT_*`.
- [ ] Channels → Connect X. ⚠️ Confirm your X API tier allows **video** before relying on auto-post.

## 7. iOS
- [ ] Open `ios/ClipForge.xcodeproj` in Xcode → build → run on simulator.
- [ ] Verify: light premium theme everywhere, no invisible text; simplified create flow; (StatsSheet real-data wiring is a follow-up).

## 8. App Store
- [ ] ASC → ClipForge **1.0.1** (PREPARE_FOR_SUBMISSION) → review the 5 new screenshots → select a build → **Submit**.

## Known follow-ups (need ML / live creds / render iteration)
- Face-tracking auto-reframe (needs a face-detection model)
- Voice-clone dubbing with mouth-sync (needs a video-lipsync model — sadtalker is portrait-only)
- B-roll insertion (stock/generated clip API + compositing)
- iOS StatsSheet → `/api/analytics` real-data wiring
- Background-music CC0 track sourcing
