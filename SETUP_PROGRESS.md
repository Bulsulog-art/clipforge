# ClipForge — Setup Progress

> Yapılanların ve yapılması gerekenlerin net listesi. **2026-05-17** itibariyle.

---

## ✅ Bende tamamlanan (otomatik)

### 1. Kod (78 dosya)
- [x] `PROJECT_PLAN.md` — TrustMRR 10 startup analizi → ClipForge pivot kararı
- [x] Next.js 15 web (landing, auth, dashboard, studio, billing, API)
- [x] BullMQ worker (yt-dlp + Whisper + GPT-4o-mini + FFmpeg + Remotion)
- [x] iOS SwiftUI app (Sign in with Apple, Supabase, RevenueCat paywall, clips feed)
- [x] Supabase migration (`clipforge` schema — izole)
- [x] Dockerfile × 2 + `docker-compose.yml`
- [x] 5 detaylı setup rehberi (`docs/`)

### 2. Coolify ([panel](https://coolify.bulsulabs.xyz/projects))
- [x] ClipForge projesi → `production` env
- [x] `clipforge-redis` (Redis 7.2 — BullMQ queue) — durdu, deploy'da başlatılacak
- [x] `clipforge-web` — Dockerfile, `/web`, domain: `https://clipforge.bulsulabs.com`
- [x] `clipforge-worker` — Dockerfile, `/worker`, internal only

### 3. Supabase ([AuraGlow projesi](https://supabase.com/dashboard/project/rgtxjjnalesquhnexfez))
> Free plan limiti dolu olduğu için AuraGlow backend'ini paylaşıyoruz. Tüm tablolar `clipforge` schema altında izole.
- [x] `clipforge` schema migration uygulandı (8 tablo + RLS + tetikleyiciler)
- [x] Data API exposed schemas: `clipforge` eklendi (3/3)
- [x] Storage buckets:
  - `clipforge-videos-raw` (private)
  - `clipforge-videos-rendered` (private)
  - `clipforge-thumbnails` (public)
- [x] Project URL: `https://rgtxjjnalesquhnexfez.supabase.co`

### 4. RevenueCat ([panel](https://app.revenuecat.com))
- [x] ClipForge projesi oluşturuldu (ID: `7f9507ae`)
- [x] Category: Photo and Video
- [x] Platforms: Native Apple + Web

### 5. Lokal env
- [x] `web/.env.local` — Supabase URL ile hazır, anahtarlar manuel doldurulacak

---

## 🟡 Sende kalan manuel adımlar (2FA / hassas işlem)

### A. Supabase anahtarlarını `.env.local`'a yapıştır
1. Aç: https://supabase.com/dashboard/project/rgtxjjnalesquhnexfez/settings/api-keys/legacy
2. **anon public** anahtarını kopyala → `web/.env.local` içinde `NEXT_PUBLIC_SUPABASE_ANON_KEY=` satırına yapıştır
3. **service_role** → Reveal → kopyala → `SUPABASE_SERVICE_ROLE_KEY=` satırına yapıştır

### B. Apple Developer ([panel](https://developer.apple.com/account/resources/identifiers))
> **Bundle ID kaydı için 2FA seninle.**

1. Identifiers → **+** → App IDs → App
2. Bundle ID: `com.bulsulabs.clipforge`
3. Capabilities:
   - ☑ In-App Purchase
   - ☑ Sign in with Apple
   - ☑ Push Notifications
   - ☑ Associated Domains
4. Continue → Register
5. Sonra App Store Connect → **My Apps → +**:
   - Name: ClipForge
   - Bundle ID: com.bulsulabs.clipforge (drop-down'dan seç)
   - SKU: `clipforge-001`
6. In-App Purchases oluştur:
   - `clipforge_starter_monthly` ($29.99)
   - `clipforge_pro_monthly` ($79.99)
   - `clipforge_agency_monthly` ($199.99)

### C. App Store Connect API Key (RevenueCat için)
1. App Store Connect → Users and Access → Integrations → App Store Connect API
2. **Generate API Key** (Access: **Admin**)
3. Key ID + Issuer ID kaydet
4. `.p8` dosyasını indir (yalnızca bir kez verilir!)

### D. RevenueCat tamamlama ([panel](https://app.revenuecat.com/projects/7f9507ae))
1. **Önce email'i confirm et** (RC banner gösteriyordu)
2. **Apps & providers** → Native Apple:
   - Bundle ID: `com.bulsulabs.clipforge`
   - App Store Connect API: `.p8` dosyasını yükle + Key ID + Issuer ID
3. **Product catalog**:
   - 3 product oluştur (App Store IAP'ları otomatik eşleşmeli)
4. **Entitlements**:
   - `starter` → `clipforge_starter_monthly`
   - `pro` → `clipforge_pro_monthly`
   - `agency` → `clipforge_agency_monthly`
5. **Offerings → default**:
   - 3 paketi ekle
6. **Webhooks**:
   - URL: `https://clipforge.bulsulabs.com/api/revenuecat/webhook`
   - Auth header: `Bearer <env.local içindeki REVENUECAT_WEBHOOK_AUTH>`
7. API keys'i `.env.local`'a kopyala (Public iOS, Public Web, Secret)

### E. Cloudflare DNS ([panel](https://dash.cloudflare.com))
> **2FA seninle.**

`bulsulabs.com` zone'unda:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `clipforge` | `<Coolify VPS IP>` | proxied |
| A | `api.clipforge` | `<Coolify VPS IP>` | proxied |

VPS IP'sini Coolify → Servers'dan bulabilirsin.

### F. GitHub repo (sen push)
Coolify deploy için public repo:
```bash
cd /Users/zeynepbulsu/clipforge
git init
git add .
git commit -m "feat: initial ClipForge"
gh repo create bulsulabs/clipforge --public --source=. --push
```
Repo URL Coolify'da zaten `https://github.com/bulsulabs/clipforge` olarak yazılı.

### G. OpenAI + Replicate API keys
1. https://platform.openai.com/api-keys → New key (`clipforge-prod`) → `.env.local` → `OPENAI_API_KEY=`
2. https://replicate.com/account/api-tokens → New token → `REPLICATE_API_TOKEN=`

### H. Coolify env vars yapıştır
Her servis için (web ve worker) **Environment Variables** sekmesinden `.env.local`'daki değişkenleri tek tek ekle.

### I. Deploy
1. Coolify → `clipforge-redis` → **Start** (önce database)
2. Coolify → `clipforge-web` → **Deploy** (web uygulaması)
3. Coolify → `clipforge-worker` → **Deploy** (queue worker)
4. https://clipforge.bulsulabs.com test et — landing page görmeli

### J. iOS — TestFlight (en son)
```bash
cd ios
xcodegen generate
open ClipForge.xcodeproj
```
- Bundle ID: `com.bulsulabs.clipforge`
- Team: Bulsu Labs
- `Secrets.swift` içindeki `REPLACE_ME`'leri doldur
- Archive → Distribute App → App Store Connect → TestFlight

---

## 📊 Tahmini timeline

- A + G (env keys) → **15 dk**
- B + C (Apple Developer + App Store Connect) → **30 dk**
- D (RevenueCat) → **20 dk**
- E (Cloudflare DNS) → **5 dk**
- F + H + I (GitHub + Coolify deploy) → **30 dk**
- Test ve düzeltme → **30 dk**

**Toplam: ~2 saat manuel iş**, sonra web canlıda.

iOS App Store onayı: +2-3 gün.

---

## 📦 Proje dosyaları

| Konum | İçerik |
|---|---|
| `/Users/zeynepbulsu/clipforge/PROJECT_PLAN.md` | Strateji + pazar analizi |
| `/Users/zeynepbulsu/clipforge/web/` | Next.js 15 frontend + API |
| `/Users/zeynepbulsu/clipforge/worker/` | BullMQ pipeline |
| `/Users/zeynepbulsu/clipforge/ios/` | SwiftUI iOS app |
| `/Users/zeynepbulsu/clipforge/supabase/migrations/00001_init.sql` | DB schema |
| `/Users/zeynepbulsu/clipforge/docs/` | Servis-bazlı setup rehberleri |
| `/Users/zeynepbulsu/clipforge/web/.env.local` | Env değişkenleri (REPLACE_ME'leri doldur) |
| `/Users/zeynepbulsu/clipforge/docker-compose.yml` | Coolify orkestrasyon |
