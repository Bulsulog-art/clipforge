# ClipForge — Master Plan

> **Tek cümle:** Uzun videoyu (YouTube, podcast, webinar) 5 dakikada **viral kısa kliplere** çevir, otomatik olarak **TikTok / Reels / Shorts**'a gönder.

---

## 1. Pazar Analizi (TrustMRR 10 Startup Çıkarımı)

| Startup | MRR | Kategori | Çıkarım |
|---|---|---|---|
| Virlo | **$47K** | Short-form analytics (B2B) | Analytics tek başına çalışıyor |
| Launch Club | **$46K** | Reddit/SEO | Distribution > content |
| Post Bridge | **$38K** | Multi-platform posting | Posting layer'ı **kanıtlı** market |
| PolyBacktest | $9K | Trading niche | Niş güvenli ama tavan düşük |
| Virvid.ai | $7.4K | AI faceless video | AI gen **kanıtlı** ama post yok |
| Chatwith | $6K | AI chatbot | Ajans satışı zor |
| Lucide AI | $5.5K | AI detection (FR) | Dil-coğrafya niche |
| SocialKit | $2.5K | Social API | API'ler **%90 marj** |
| EcomShot | $0.2K | AI product photo | Çok yeni |
| DeployHermes | $0.2K | Agent deploy | Çok yeni |

### Boşluk
- **Virvid (AI gen) + Post Bridge (multi-post)** birleşimi henüz dominant değil
- Opus Clip ($30–90/ay) ve Klap pahalı, **mobile-first değil**
- iOS'ta "tek tıkla viral kliper" yok

### Karar
**ClipForge** = (Klap + Opus Clip) → mobile-first + dahili çoklu platform posting. Hedef niş: **podcaster, koç, kursçu, kreatör ajansları**.

---

## 2. Ürün

### Kullanıcı akışı
1. YouTube linki yapıştır / video yükle (max 4 saat)
2. Niche seç (motivasyon, finans, sağlık, tech, eğitim, komedi, vs.)
3. AI viral momentleri bulur (8–30 klip)
4. Her klipte: **hook**, animasyonlu altyazı, jump cut, B-roll, ses normalize, müzik
5. 9:16 / 1:1 / 16:9 oto-frame (yüz takip)
6. Klipleri seç → TikTok / Reels / Shorts'a planla veya hemen post et
7. Hangi klip performans gösteriyor analytics → benzerlerini üret

### Pro fark
- **Niche template kütüphanesi** (rakiplerde yok)
- **Hook A/B test** (aynı klip 3 farklı hook ile, en iyisi otomatik kalır)
- **Audio enhance** (NVIDIA Broadcast benzeri)
- **iOS app** ile yolda preview + post

---

## 3. Fiyatlandırma

| Plan | Aylık | İçerik | Hedef |
|---|---|---|---|
| Free | $0 | 2 video / ay, 5 klip max, watermark | Funnel |
| **Starter** | **$29** | 10 video, sınırsız klip, watermark yok | Solo creator |
| **Pro** | **$79** | 50 video + **auto-post** + analytics | Pro creator |
| **Agency** | **$199** | 250 video, brand kits, 5 user, API | Ajanslar |

12 ay hedef: **$40K MRR** (yaklaşık 600 ödeyen kullanıcı, ortalama $66 ARPU).

---

## 4. Tech Stack

### Web (Next.js 15)
- App Router + Server Components
- TypeScript, Tailwind, shadcn/ui
- Drizzle ORM (Supabase Postgres)
- Supabase Auth (email + Google OAuth)
- TanStack Query
- Zod (validation)

### Backend
- Supabase Postgres + RLS
- Supabase Storage (raw + rendered video)
- Supabase Edge Functions (orchestration)
- Worker queue: **BullMQ** + Redis (Coolify'da self-host)
- Video processing: **FFmpeg** + **Remotion** (programmatic compose)
- AI:
  - **Whisper** (transcript) — OpenAI veya self-host
  - **GPT-4o-mini** (viral moment scoring + hook)
  - **ElevenLabs** (opsiyonel TTS, gerekirse)
  - **Replicate** (B-roll img/clip)

### iOS (Swift 6 / SwiftUI)
- iOS 17+
- RevenueCat SDK
- Supabase Swift SDK
- AVKit (preview)
- AVFoundation (export)

### Payments
- **RevenueCat** (iOS App Store + Web Billing aynı paywall)
- Web tarafı: **Stripe** (RevenueCat Web Billing arkasında)

### Infra
- **Coolify** (self-host) → bulsulabs.com VPS
- **clipforge.bulsulabs.com** (Next.js)
- **api.clipforge.bulsulabs.com** (worker)
- **cdn.clipforge.bulsulabs.com** (Supabase Storage proxy)
- Cloudflare DNS + Tunnel (gerekirse)

---

## 5. Mimari

```
                 ┌────────────────┐
                 │ clipforge.b.com│ (Next.js / Vercel-style)
                 └────────┬───────┘
                          │
                 ┌────────▼────────┐
                 │  Supabase       │  Postgres + Auth + Storage
                 └────────┬────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
┌──────▼──────┐  ┌────────▼────────┐  ┌──────▼───────┐
│ BullMQ      │  │ Edge Functions  │  │ RevenueCat   │
│ Worker      │  │ (webhooks)      │  │ (paywall)    │
│ (FFmpeg +   │  │                 │  │              │
│  Whisper +  │  └─────────────────┘  └──────────────┘
│  Remotion)  │
└──────┬──────┘
       │
┌──────▼──────────────────────┐
│ Social Publishers           │
│ TikTok / IG / YT / X / FB   │
└─────────────────────────────┘
```

---

## 6. Build & Deploy Sırası (Uygulanacak adımlar)

1. ✅ Klasör yapısı (`/Users/zeynepbulsu/clipforge`)
2. Bu plan + dokümantasyon (siz buradasınız)
3. Next.js web iskelet + Tailwind + shadcn
4. Supabase migration + RLS
5. Auth + ödeme paywall (RevenueCat Web)
6. Upload + transcript pipeline
7. Viral moment scoring (GPT-4o-mini)
8. Remotion clip render template'leri
9. TikTok/IG/YT/X publisher servisleri
10. Analytics dashboard
11. iOS app (RevenueCat ile paywall)
12. Coolify deploy + domain
13. App Store submission

---

## 7. Hesap / Servis Listesi (manuel kurulum / browser üzerinden)

Aşağıdaki servislerde **hesap aç** veya **proje oluştur** gerekir. Tek tek `docs/` altındaki rehbere bakın:

- [ ] **Supabase** → `docs/SUPABASE_SETUP.md`
- [ ] **RevenueCat** → `docs/REVENUECAT_SETUP.md`
- [ ] **Coolify** (kendi VPS'inizde) → `docs/COOLIFY_SETUP.md`
- [ ] **Apple Developer** → `docs/APPLE_DEVELOPER.md`
- [ ] **OpenAI API** (Whisper + GPT-4o-mini)
- [ ] **Replicate** (B-roll)
- [ ] **TikTok Developers** (publish API)
- [ ] **Meta for Developers** (Instagram Graph API)
- [ ] **Google Cloud / YouTube Data API**
- [ ] **Cloudflare** (DNS)

---

## 8. KPI Takip

- **D1 retention** > %50
- **D30 retention** > %25
- **CAC < $30** (organik + ücretli)
- **LTV > $250** (12 ay)
- **Net Revenue Retention** > %110
- **Free → Paid conversion** > %4
