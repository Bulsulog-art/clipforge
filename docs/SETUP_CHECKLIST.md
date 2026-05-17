# ClipForge — End-to-End Launch Checklist

> Aşağıdaki adımlar tek tek yapılırsa app canlıya çıkar. Tüm dashboard linkleri verilmiş.

## A · Hesaplar (1 saat)

| # | Servis | Link | Plan | Not |
|---|---|---|---|---|
| 1 | Supabase | https://supabase.com/dashboard | **Pro** $25/ay | EU region |
| 2 | RevenueCat | https://app.revenuecat.com/signup | Free → ücretsiz <$2.5K MTR | iOS + Web app |
| 3 | OpenAI | https://platform.openai.com | Usage credits | $20 yeter başlangıç |
| 4 | Replicate | https://replicate.com | pay-per-call | B-roll/imaj |
| 5 | ElevenLabs | https://elevenlabs.io | Starter $5/ay | TTS hook (opsiyonel) |
| 6 | Apple Developer | https://developer.apple.com/programs/enroll/ | $99/yıl | iOS publish |
| 7 | TikTok Developers | https://developers.tiktok.com/ | Free | Content Posting API |
| 8 | Meta for Developers | https://developers.facebook.com/ | Free | Instagram Graph |
| 9 | Google Cloud | https://console.cloud.google.com/ | $0 | YouTube Data API |
| 10 | Cloudflare | https://dash.cloudflare.com | Free | DNS for bulsulabs.com |
| 11 | Resend | https://resend.com | Free 3k/ay | Email |

## B · Coolify (zaten elinde varsa)

1. `New Resource → Application → Public repo` veya **+ Empty service** seç.
2. 3 servis: `web`, `worker`, `redis`.
3. Detaylar: `docs/COOLIFY_SETUP.md`.

## C · Supabase

1. `clipforge-prod` projesi aç.
2. SQL Editor'a `supabase/migrations/00001_init.sql` yapıştır, RUN.
3. Storage buckets: `videos-raw` (private), `videos-rendered` (private), `thumbnails` (public).
4. Auth → Site URL = `https://clipforge.bulsulabs.com`, Redirect URLs eklendi.
5. Google OAuth client ekle (gerekirse).
6. `.env`'e kopyala: URL, anon key, service role, JWT secret.

## D · RevenueCat

1. Project: `ClipForge`.
2. iOS app → bundle `com.bulsulabs.clipforge`, App Store API Key yükle.
3. Web (Stripe) app bağla.
4. Products (App Store Connect'te oluşturduktan sonra): starter / pro / agency.
5. Entitlements: starter / pro / agency.
6. Offerings: default + 3 paket.
7. Webhook: `https://clipforge.bulsulabs.com/api/revenuecat/webhook` (Bearer auth).

## E · Apple Developer

1. Enroll Organization.
2. Bundle ID `com.bulsulabs.clipforge` + capabilities (IAP, Sign in with Apple, Push, Associated Domains).
3. App Store Connect → New App → SKU `clipforge-001`.
4. 3 IAP product oluştur.
5. App Store Connect API Key (Admin) → RevenueCat'a yükle.

## F · Domain (Cloudflare)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | clipforge | <VPS IP> | proxied |
| A | api.clipforge | <VPS IP> | proxied |
| CNAME | cdn.clipforge | `<ref>.supabase.co` | DNS only |

Apple Universal Links: `https://clipforge.bulsulabs.com/.well-known/apple-app-site-association` (Next.js route serve eder).

## G · Deploy sırası

1. GitHub'a push (`bulsulabs/clipforge`).
2. Coolify → her servis için **Deploy**.
3. Supabase migration push.
4. Storage bucket policy'leri kontrol.
5. End-to-end test: free signup → YouTube linki → klipler → manuel post.

## H · App Store submission

1. Xcode → Archive → App Store Connect.
2. Screenshots (6.7" + 5.5").
3. App Privacy form doldur (Auth email, video upload).
4. Review notes: demo account `reviewer@bulsulabs.com`.
5. Submit. Onay ~24–48 saat.

## I · Marketing pre-launch

- ProductHunt schedule
- Indie Hackers post
- X thread (Bulsu Labs)
- 5–10 YouTube creator outreach (DM)
- SEO: blog post serisi (`clipforge.bulsulabs.com/blog/how-to-clip-youtube-videos`)
