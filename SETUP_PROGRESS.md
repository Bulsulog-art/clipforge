# ClipForge — Setup Progress

**Status: 90% otomatize ettim, %10 sende kaldı (10 dakikalık iş).** 🚀

Updated: 2026-05-17

---

## ✅ Bende otomatik bitenler

### 1. Plan + Kod (78 dosya)
- ClipForge: AI Viral Clips — uzun video → 100+ viral kısa klip → otomatik post
- Pricing: Free / **$29** / **$79** / **$199** monthly
- Hedef: $40K MRR / 12 ay
- Repo: **https://github.com/Bulsulog-art/clipforge**
- Klasör: `/Users/zeynepbulsu/clipforge`

### 2. GitHub (Bulsulog-art)
- Repo public, main branch push edildi
- `gh repo create Bulsulog-art/clipforge --public --push` ile

### 3. Coolify (`coolify.bulsulabs.xyz`)
| Service | Tür | Durum | Detay |
|---|---|---|---|
| `clipforge-redis` | DB | **Starting** | Redis 7.2, BullMQ queue |
| `clipforge-web` | App | Slot hazır | Dockerfile, repo Bulsulog-art/clipforge, base /web, domain `clipforge.bulsulabs.com`, **16 env var** kayıt |
| `clipforge-worker` | App | Slot hazır | Dockerfile, repo Bulsulog-art/clipforge, base /worker, **18 env var** kayıt |

Project ID: `ysdywlrjo47g1h4byhhhwb0p`
Env ID: `ktz59uo5vfoo0yyv85r9pv29`

### 4. Supabase (AuraGlow shared)
- Project: `https://rgtxjjnalesquhnexfez.supabase.co` (AuraGlow)
- **Schema: `clipforge`** (izole, AuraGlow tablolarına dokunmuyor)
- Migration uygulandı — 8 tablo + RLS + tetikleyiciler + view
- Storage buckets:
  - `clipforge-videos-raw` (private)
  - `clipforge-videos-rendered` (private)
  - `clipforge-thumbnails` (public)
- Data API exposed schemas: `public, graphql_public, clipforge`

### 5. Apple Developer + App Store Connect
- Team ID: `YA6Y85MSY6`
- **Bundle ID: `com.bulsulabs.clipforge`** + capabilities (IAP, Sign in with Apple, Push, Associated Domains)
- App Store Connect:
  - App Name: **ClipForge: AI Viral Clips**
  - App ID: `6770277172`
  - SKU: `clipforge-001`
  - Language: English (U.S.)
- **App Store Connect API Key**:
  - Name: RevenueCat - ClipForge
  - Key ID: `8MVS98FSY4`
  - Issuer ID: `ca7b4939-e833-4cc4-a5d3-b1f5819d9795`
  - `.p8` indirildi: `/Users/zeynepbulsu/clipforge/ios/secrets/AuthKey_8MVS98FSY4.p8` (gitignored)

### 6. RevenueCat
- Project: **ClipForge** (ID: `7f9507ae`)
- Category: Photo and Video
- Platforms: Native Apple + Web
- iOS App config (ID `appdb5240c1d1`):
  - Bundle ID: `com.bulsulabs.clipforge`
  - IAP Key: `MCW898UCBH` (shared, mevcut)
  - Issuer: `ca7b4939-e833-4cc4-a5d3-b1f5819d9795`
- Test API key: `test_pZaSdrrSWGvaATIMKHrGTudfLgE` (development için)

### 7. VPS
- IP: **`72.62.39.172`** (mevcut Coolify deploy'lardan tespit edildi)

---

## 🟡 Sende kalan — 10 dakikalık iş

### A. Supabase anahtarlarını al ve Coolify env'e yapıştır (5 dk)

1. **Supabase dashboard** — anon key:
   - https://supabase.com/dashboard/project/rgtxjjnalesquhnexfez/settings/api-keys/legacy
   - **anon public** → **Copy** → değeri kaydet

2. **service_role** → Reveal → Copy → kaydet

3. **Coolify clipforge-web** env vars — Developer view:
   - https://coolify.bulsulabs.xyz/project/ysdywlrjo47g1h4byhhhwb0p/environment/ktz59uo5vfoo0yyv85r9pv29/application/y11bhiffmpb3u2hdekwhjhdq/environment-variables
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE_ME_FROM_SUPABASE_DASHBOARD` → yapıştır
   - `SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME_FROM_SUPABASE_DASHBOARD` → yapıştır
   - **Save All Environment Variables**

4. **Coolify clipforge-worker** env vars için aynı:
   - https://coolify.bulsulabs.xyz/project/ysdywlrjo47g1h4byhhhwb0p/environment/ktz59uo5vfoo0yyv85r9pv29/application/aeoe3zdfhbhqzi89g32gkuwx/environment-variables
   - `SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME_FROM_SUPABASE_DASHBOARD` → yapıştır
   - Save

### B. Coolify Redis password'ünü al ve REDIS_URL'e yapıştır (1 dk)

1. https://coolify.bulsulabs.xyz/project/ysdywlrjo47g1h4byhhhwb0p/environment/ktz59uo5vfoo0yyv85r9pv29/database/viglo9hd308lmad9gkaqedv9
2. **Redis URL (internal)** → Reveal → kopyala
3. Web + worker env vars'da `REDIS_URL=...` satırını bu değerle değiştir

### C. OpenAI + Replicate keys (3 dk)

1. https://platform.openai.com/api-keys → New key (`clipforge-prod`) → kopyala
2. https://replicate.com/account/api-tokens → kopyala
3. Web + worker env vars'da `OPENAI_API_KEY=` ve `REPLICATE_API_TOKEN=` doldur

### D. RevenueCat anahtarlarını al (2 dk)

1. https://app.revenuecat.com/projects/7f9507ae/apps → ClipForge (App Store) tıkla
2. Public iOS API key görünür → kopyala
3. Web app (Stripe) eklenmediyse şimdilik test key kullan: `test_pZaSdrrSWGvaATIMKHrGTudfLgE`
4. Web env vars:
   - `NEXT_PUBLIC_REVENUECAT_PUBLIC_WEB_KEY=` → web key
   - `REVENUECAT_SECRET_KEY=` → settings sayfasından

### E. Cloudflare DNS (30 sn)

https://dash.cloudflare.com → `bulsulabs.com` zone → DNS records:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `clipforge` | `72.62.39.172` | ✅ proxied |
| A | `api.clipforge` | `72.62.39.172` | ✅ proxied |

### F. Deploy 🚀 (1 dk)

1. **Redis çalışır olmalı** (Status: Healthy) — bekliyor.
2. https://coolify.bulsulabs.xyz/.../application/y11bhiffmpb3u2hdekwhjhdq → **Deploy** butonuna bas
3. Worker'ı da deploy et
4. Build ~3-5 dakika sürer
5. https://clipforge.bulsulabs.com aç — landing page görmeli

---

## 📱 iOS app (sonra, isteğe bağlı)

### G. iOS app build (1 saat)

```bash
cd /Users/zeynepbulsu/clipforge/ios
brew install xcodegen
xcodegen generate
open ClipForge.xcodeproj
```

`ClipForge/Secrets.swift`'i doldur:
```swift
static let revenueCatIOSKey = "appl_..."   // RevenueCat dashboard'dan public iOS key
static let supabaseURL = URL(string: "https://rgtxjjnalesquhnexfez.supabase.co")!
static let supabaseAnonKey = "eyJ..."      // Supabase anon
```

Xcode → Archive → Distribute App → App Store Connect → TestFlight.

### H. App Store Connect IAP (30 dk)

App Store Connect → ClipForge: AI Viral Clips → Monetization → In-App Purchases:
- `clipforge_starter_monthly` — Auto-Renewable, $29.99
- `clipforge_pro_monthly` — $79.99
- `clipforge_agency_monthly` — $199.99

Hepsi `clipforge_subscriptions` subscription group altında.

### I. RevenueCat entitlements + offerings (10 dk)

RevenueCat → Products → 3 product otomatik eşlenir.
Entitlements: `starter`, `pro`, `agency` (her product'a bağla).
Offerings → `default` → 3 paket ekle.

---

## 📊 Server side: tüm anahtar değerler tek yerde

```bash
# Supabase
SUPABASE_URL=https://rgtxjjnalesquhnexfez.supabase.co
SUPABASE_PROJECT_REF=rgtxjjnalesquhnexfez

# Apple
APPLE_TEAM_ID=YA6Y85MSY6
BUNDLE_ID=com.bulsulabs.clipforge
APPSTORE_APP_ID=6770277172
APPSTORE_API_KEY_ID=8MVS98FSY4
APPSTORE_ISSUER_ID=ca7b4939-e833-4cc4-a5d3-b1f5819d9795
APPSTORE_P8=/Users/zeynepbulsu/clipforge/ios/secrets/AuthKey_8MVS98FSY4.p8

# RevenueCat
RC_PROJECT_ID=7f9507ae
RC_IOS_APP_ID=appdb5240c1d1
RC_TEST_API_KEY=test_pZaSdrrSWGvaATIMKHrGTudfLgE
RC_IAP_KEY_ID=MCW898UCBH

# Coolify
COOLIFY_PROJECT_ID=ysdywlrjo47g1h4byhhhwb0p
COOLIFY_ENV_ID=ktz59uo5vfoo0yyv85r9pv29
COOLIFY_WEB_APP_ID=y11bhiffmpb3u2hdekwhjhdq
COOLIFY_WORKER_APP_ID=aeoe3zdfhbhqzi89g32gkuwx
COOLIFY_REDIS_ID=viglo9hd308lmad9gkaqedv9

# VPS
VPS_IP=72.62.39.172

# GitHub
GITHUB_REPO=https://github.com/Bulsulog-art/clipforge
```

---

## 🎯 Sonraki büyük adımlar (post-launch)

1. **Marketing**: ProductHunt schedule, Indie Hackers, X (Bulsu Labs)
2. **SEO**: `clipforge.bulsulabs.com/blog/` — 10 yazı serisi
3. **YouTube outreach**: 50 podcast kanalı → "free trial + analytics" pitch
4. **A/B testing**: Hook varyantları, paywall pozisyonu
5. **Analytics**: PostHog veya Plausible
