# App Store Submission Checklist

## Metadata (ASC → App Information / App Privacy / Localizations)

### App Name (max 30 chars)
`ClipForge: AI Viral Clips`

### Subtitle (max 30 chars)
`Long video → 100+ shorts`

### Promotional Text (max 170 chars, updateable without review)
`Drop a podcast. Get 100 viral clips with TikTok-style captions, AI face swap, and 15+ language translation. Cancel anytime.`

### Description (max 4000 chars)
```
ClipForge is a one-tap AI clip studio for creators, podcasters, and coaches.

One long video in. Up to 100 viral short clips out — animated word-by-word
captions, Mr.Beast-style thumbnails, multi-platform posting, and AI tools
that used to cost five subscriptions and a video editor.

✨ AI Viral Moment Detection
Whisper transcribes your video. GPT-4o-mini scores the most share-worthy
moments and assigns each a viral score. You get the top 8–30, sorted.

🎬 Studio-Grade Render
Auto-reframe to 9:16. Word-by-word karaoke captions with niche-specific
styling. Hook overlays with a fade-in pop entrance. Loudnorm audio.

🌍 AI Translation — 15+ languages
Take any clip global in seconds. Pro members can clone their voice and
get mouth-synced foreign-language audio.

🎭 AI Face Swap
Upload a portrait, replace the face in your clip in 30 seconds. SwapTok
quality, viral by design.

📈 Daily Trends
Read the room every morning. We surface 10 fresh trending hook formats
per niche so you always know what to make next.

📲 One-tap distribution
Connect TikTok, Reels, YouTube Shorts, X. Schedule a week of content
in 60 seconds.

— Pricing —

Free taste — 1 free clip set on signup. Try the magic.
Plus weekly — $4.99 → 10 credits / week.
Plus monthly — $14.99 → 40 credits / month (save 25%).

Plus members can also buy +10 ($4.99) or +20 ($7.99) consumable credit
packs anytime. Credits never expire.

Cancel anytime. Refund-safe consumables. No hidden upsell.

— Privacy —

We never sell your data. Videos you upload are processed only for the
clip pipeline (Supabase EU, OpenAI Whisper, optional Replicate face swap).
We don't train on your content. Free clips auto-delete after 30 days.

Full terms: clipforge.bulsulabs.xyz/legal/terms
Privacy: clipforge.bulsulabs.xyz/legal/privacy
Contact: hello@clipforge.bulsulabs.xyz
```

### Keywords (max 100 chars, comma separated)
```
ai clips,opus,klap,podcast,viral,tiktok,reels,shorts,faceless,voiceover,subtitles,reface,heygen,short,hook
```

### Support URL
`https://clipforge.bulsulabs.xyz/support`

### Marketing URL
`https://clipforge.bulsulabs.xyz`

### Privacy Policy URL
`https://clipforge.bulsulabs.xyz/legal/privacy`

### Copyright
`© 2026 Bulsu Labs`

### Category
- Primary: **Photo & Video**
- Secondary: **Productivity**

### Age Rating
- 12+ (Infrequent/Mild Mature/Suggestive Themes — face swap implications)
- 4+ would be rejected on Face Swap feature
- Do not enable any "Frequent" content level

## App Privacy form

Apple's Privacy Nutrition Labels — answer truthfully:

### Data Used to Track You
- **None**. We don't use third-party tracking pixels.

### Data Linked to You
- **Identifiers**: User ID (Supabase Auth UUID), Device ID (APNs token).
- **Contact Info**: Email Address (from Apple Sign In / Google / magic link).
- **Usage Data**: Product Interaction (which AI tools you ran), Purchase History (credit balance, plan).
- **Diagnostics**: Crash Data, Performance Data (Sentry).
- **User Content**: Photos or Videos (clips you upload / generate).

### Data Not Linked to You
- **Diagnostics**: aggregated render success rates (no user id).

## Screenshots (6.7" iPhone 17 Pro Max + 6.1" iPhone 17)

Required dimensions:
- 6.7": 1290 × 2796
- 6.5": 1242 × 2688 (legacy, optional but recommended)
- 5.5": 1242 × 2208 (legacy iPad/older)

Shot list — produce 6 screenshots:

1. **Hero** — onboarding page 1 ("Long video. 100+ viral clips.")
2. **Studio** — ProjectsView with 4-5 jobs, one in progress
3. **Clips grid** — JobDetailView with 8 clip thumbnails (Mr.Beast style)
4. **Player + share** — ClipPlayerView full-screen with hook overlay
5. **AI tools** — ClipActionsSheet with face PhotosPicker + language grid
6. **Trends** — TrendsView "Use this hook" cards

For each screenshot, overlay a single short marketing line at top:
1. "Podcast → 100 viral shorts"
2. "AI picks the moments people share"
3. "Mr.Beast thumbnails, every time"
4. "Tap to post anywhere"
5. "Face swap. Translate. Voice clone."
6. "Know what to make next"

Use tools like Screenshot.rocks, Mockumate, or Figma.

## App Review notes (free-text)

```
Test account for review:
  email: reviewer@bulsulabs.com
  password: ClipForge-Reviewer-2026

The account is pre-funded with 5 credits to test:
- Clip generation (try YouTube link https://www.youtube.com/watch?v=...)
- AI Face Swap (use the supplied portrait in the Help section)
- AI Translation (any language)

Key flows:
- Sign in with Apple → onboarding → Studio
- "+" → paste YouTube URL → "Generate clips · 1 credit"
- Wait 60-90 seconds for the render
- Tap a clip thumbnail to play, tap share icon to test export
- Settings → Buy credits (test sandbox IAP)

Subscription Sandbox IAPs:
- clipforge_plus_weekly  ($4.99/wk)
- clipforge_plus_monthly ($14.99/mo)

Promotional Offer (for cancel flow testing):
- plus_retention_1299 attached to clipforge_plus_monthly
- Triggered when user opens 'Manage / cancel subscription' in Settings

We do not store or share user videos beyond the clip pipeline.
All AI processing runs server-side; no on-device model that requires
encryption review.

The free tier is intentionally limited to 1 lifetime clip set (5-min
source max). Users must subscribe to continue. This is documented in
Onboarding, Pricing, and Terms.

Thank you for reviewing!
```

## Pre-submission checklist

- [ ] App icon (1024×1024 PNG, sRGB, no transparency)
- [ ] Launch screen looks decent
- [ ] All NS*UsageDescription strings filled (Camera, Photo Library, Microphone, Notification reasons)
- [ ] Sign in with Apple works
- [ ] Test account credentials ready
- [ ] Promotional Offer 'plus_retention_1299' created in ASC
- [ ] All 5 IAP products (3 subs + 2 consumables) created and submitted with the same build
- [ ] APNs key uploaded to RevenueCat
- [ ] Push notification works in TestFlight build
- [ ] No "lorem ipsum" / TODOs / debug logs in production binary
- [ ] App icon adaptive (no system tinting issues in iOS 18+ dark mode)
- [ ] All web URLs in app (Settings → Terms / Privacy / Support) return 200 not 404

## Marketing pre-launch

- ProductHunt schedule (Tuesday, 12:01 AM PST)
- Indie Hackers launch post
- X thread from @bulsulabs
- HN Show post
- 50 podcast creator outreach DMs
- TikTok teaser: 30-sec demo with face swap money shot
