# Credits + IAP Setup (Plus tek tier · Apple iade-proof · Lifetime free taste)

> **2026-05 refresh:** Yearly tier eklendi ($59.99/500cr), consumable pack'ler yeniden
> fiyatlandı (Booster/Power/Pro), ekonomik stack devreye girdi (faster-whisper local,
> $0.18/job tasarruf — bkz. `worker/whisper-service/`). Marjlar tüm tier'larda yükseldi.

## Strateji özeti

**Free tier sıfır rekürring maliyet.** Sadece **1 video lifetime** signup hediyesi. Sonra Plus zorunlu.

- **Free**: 1 kredi (signup), watermark + "Made with ClipForge" outro (organik marketing). Recurring kredi yok.
- **Plus weekly**  $5.99   → 10 kredi/hafta
- **Plus monthly** $14.99  → 40 kredi/ay (kredi başına ~%38 ucuz)
- **Plus yearly**  $59.99  → 500 kredi/yıl (**en iyi değer**, $0.12/credit)
- **Plus retention** $12.99 → 40 kredi/ay (cancel akışında win-back)
- **Plus-only kredi paketleri** (consumable, sub'ı asla undercut etmez):
  - **Booster** +10 → $9.99   ($0.999/credit — acil top-up)
  - **Power**   +30 → $19.99  ($0.666/credit — orta, en popüler)
  - **Pro**     +80 → $49.99  ($0.624/credit — en iyi pack oranı)

### Free maliyet matematiği (ekonomik stack sonrası)

Bir signup hediyesi (1 kredi = 1 video job) ekonomik stack ile:

| Kalem | Eski | Yeni |
|---|---|---|
| Whisper transcribe | $0.18 | **$0.00** (local faster-whisper) |
| GPT-4o-mini scoring | $0.001 | $0.001 |
| FFmpeg render (CPU) | $0.02 | $0.02 |
| Storage | $0.005 | $0.005 |
| **Toplam (per free signup)** | $0.21 | **~$0.03** |

| Free user | Lifetime maliyet | Recurring |
|---|---|---|
| 1 | **$0.03** | **$0** |
| 1.000 | $30 | $0 |
| 100.000 | $3.000 (one-shot) | $0 |

5 kredi/ay verseydik: 100K user × 5 × $0.03 = **$15K/ay rekürring**. Bunun yerine signup'ta tek atışlık 1 kredi → sürdürülebilir.

> **Önkoşul:** Anonim sign-in **KAPALI** olmalı, aksi halde free kredi sınırsız abuse'lanır.
> Supabase Dashboard → Authentication → Providers → Anonymous → Disable.

Watermark + 2-saniye "Made with ClipForge" outro her free render'da → kullanıcı TikTok'a yüklediğinde **organik marketing** elde ediyoruz. Free zarar gibi görünmüyor, **paid ads alternatifi**.

## Fiyat × Kredi × Marj tablosu

(Apple %15 small-biz, ekonomik stack maliyetleri, ortalama %40 kredi tüketimi)

| SKU | Fiyat | Krediler | Apple net | Maliyet @40% | **Marj** |
|---|---|---|---|---|---|
| `clipforge_plus_weekly`            | $5.99  | 10  | $5.09  | $0.12  | **%98** |
| `clipforge_plus_monthly`           | $14.99 | 40  | $12.74 | $0.48  | **%96** |
| `clipforge_plus_yearly`            | $59.99 | 500 | $50.99 | $6.00  | **%88** |
| `clipforge_plus_monthly_retention` | $12.99 | 40  | $11.04 | $0.48  | **%96** |
| `clipforge_credits_booster`        | $9.99  | 10  | $8.49  | $0.30  | **%96** |
| `clipforge_credits_power`          | $19.99 | 30  | $16.99 | $0.90  | **%95** |
| `clipforge_credits_pro`            | $49.99 | 80  | $42.49 | $2.40  | **%94** |

> Maliyet hesabı: kredi başına ortalama $0.03 (1 base video job) + premium step'ler için kredi gating (face_swap 2cr → $0.15 cost, lipsync 5cr → $0.10 cost). Worst-case Yearly = 250× face_swap = $37.50 → yine +$13/+%26 marj.

**Upgrade funnel (kredi başına maliyet):**
- Weekly:  $0.599/credit
- Monthly: $0.375/credit  (~%38 ucuz)
- Yearly:  $0.120/credit  (~**%80 ucuz**, en iyi sub)
- Booster pack: $0.999/credit  (acil)
- Power pack:   $0.666/credit  (orta)
- Pro pack:     $0.624/credit  (en iyi pack)

Yearly her zaman pack'ten daha ucuz → packlar bilerek "acil top-up" konumlandırması, sub'ı kannibalize etmiyor.

## App Store Connect kurulumu

### 1. Subscription Group oluştur
- Name: `ClipForge Memberships`
- Reference: `clipforge_subscriptions`

### 2. Auto-renewable subscriptions ekle

| Product ID | Period | Price | Display name |
|---|---|---|---|
| `clipforge_plus_weekly`  | 1 week  | $5.99  | Plus Weekly |
| `clipforge_plus_monthly` | 1 month | $14.99 | Plus Monthly |
| `clipforge_plus_yearly`  | 1 year  | $59.99 | Plus Yearly |

> **NO Introductory Offer (free trial).** Hiçbirinde free trial yok — user "iptal yolunu bulmuş milet" senaryosunu engellemek için.

### 3. Promotional Offer (retention $12.99)

`clipforge_plus_monthly` → **Subscription Prices → Promotional Offers → +**:
- Reference: `plus_retention_1299`
- Eligibility: **Existing subscribers**
- Offer Type: Pay as you go
- Duration: 3 months at $12.99
- Code redemption: Off (RC tetikler)

### 4. Consumable IAP

| Product ID | Type | Price | Credits | Display name |
|---|---|---|---|---|
| `clipforge_credits_booster` | Consumable | $9.99  | 10 | Booster Pack — +10 Credits |
| `clipforge_credits_power`   | Consumable | $19.99 | 30 | Power Pack — +30 Credits |
| `clipforge_credits_pro`     | Consumable | $49.99 | 80 | Pro Pack — +80 Credits |

> Apple "subscription-required" bayrağı yok — iOS app UI gate'liyor (`hasPlus` kontrolü).
> Legacy ID'ler (`clipforge_credits_10`, `clipforge_credits_20`) webhook'ta hâlâ
> honored — eski sandbox/test transaction'lar varsa kredilenir, ama ASC'de aktif değil.

### 5. Türkçe override

| USD | TR fiyat |
|---|---|
| $5.99  | 199₺ |
| $9.99  | 339₺ |
| $12.99 | 449₺ |
| $14.99 | 499₺ |
| $19.99 | 679₺ |
| $49.99 | 1.699₺ |
| $59.99 | 1.999₺ |

## RevenueCat

### Entitlements
- `starter` (alias: `plus`) → tüm 3 Plus subscription product

### Offerings
`default`:
- `weekly_plus`     → `clipforge_plus_weekly`
- `monthly_plus`    → `clipforge_plus_monthly`
- `yearly_plus`     → `clipforge_plus_yearly`
- `credits_booster` → `clipforge_credits_booster`
- `credits_power`   → `clipforge_credits_power`
- `credits_pro`     → `clipforge_credits_pro`

Retention `clipforge_plus_monthly_retention` ayrı package olmaz — Promotional Offer'la sunulur.

### Webhook
- URL: `https://clipforge.bulsulabs.xyz/api/revenuecat/webhook`
- Auth: `Bearer <REVENUECAT_WEBHOOK_AUTH>`

İşlenen event'ler:
- `NON_RENEWING_PURCHASE` → consumable → 10/30/80 kredi (Booster/Power/Pro)
- `INITIAL_PURCHASE` / `RENEWAL` / `PRODUCT_CHANGE` / `UNCANCELLATION` → subscription → 10/40/500 kredi + tier=starter
- `CANCELLATION` / `EXPIRATION` / `BILLING_ISSUE` → tier=free, krediler kalır (kullanılana kadar)
- `REFUND` → audit log (consumable krediler tüketildiyse geri alınamaz)

## iOS UI Akışı

```
1. ProjectsView → "New project" → kredisiz
   ↓
2. CreditsPaywallView açılır
   - Plus user → 3 kredi paketi (Booster $9.99 / Power $19.99 / Pro $49.99)
   - Free user → "Plus only" upsell + "See Plus pricing" button
   ↓
3. PlansView (tek Plus tier)
   - Weekly / Monthly / Yearly segmented control (Yearly default)
   - Subscribe button → RevenueCat → Apple sandbox/production
   - Info kartlar: Win-back + Plus-only packs
   ↓
4. Webhook geliyor → DB grant_credits() → balance güncel
   ↓
5. Kullanıcı video oluşturur, kredi düşer
   ↓
6. Cancel akışında Apple Promotional Offer kartı:
   "Stay for $12.99/mo instead?"
```

## Test sequence

1. Sandbox tester aç (App Store Connect → Users → Sandbox)
2. iOS sim'de free hesap → ProjectsView → New project (1 signup kredisi varsa kullanılır)
3. Kredisiz state'te CreditsPaywallView → Plus-only upsell → See pricing → PlansView
4. Plus Yearly $59.99 → Apple sandbox prompt → Confirm
5. RC webhook → 500 kredi balance'a düşer
6. Yeni project → 1 kredi tüketilir (499 kalır)
7. CreditsPaywallView tekrar aç → 3 pack (Booster/Power/Pro) görünür
8. Booster pack → $9.99 → +10 kredi (toplam 509)
9. Sandbox'ta refund simüle et → REFUND event log
10. Cancel testi → Apple win-back kartı: $12.99/mo

## Cron'lar

> **2026-05 not:** `clipforge-free-monthly-refill` cron'u
> `00006_lifetime_free.sql` migrasyonunda kaldırıldı. Free kullanıcı
> rekürring kredi almıyor — sadece signup'ta 1 kredi (lifetime).
> `clipforge.refill_free_credits()` fonksiyonu schema'da kalsa da
> default amount 0'a düşürüldü; manuel destek hediyesi için
> `clipforge.grant_credits()` kullan.

```sql
-- (KALDIRILDI) refill_free_credits — lifetime 1 kredi modeli aktif
-- her gün 07:00 UTC trend heartbeat (worker daily snapshot tetikler)
```

## Push Notifications (APNs)

Worker, kullanıcının cihazına bildirim gönderir:
- "Your clips are ready! 🎬" — render bitince
- "Only N credits left" — bakiye 2 ve altında

### Apple Developer → APNs Key

1. https://developer.apple.com/account/resources/authkeys/list
2. **+** → Apple Push Notifications service (APNs)
3. Name: `ClipForge APNs`
4. Continue → Register → `.p8` indir (sadece **bir kez**)
5. Key ID + Team ID kaydet

### Coolify worker env

```
APNS_KEY_ID=ABC123XYZ4
APNS_TEAM_ID=YA6Y85MSY6
APNS_KEY_P8=-----BEGIN PRIVATE KEY-----\n<.p8 dosyasının tüm içeriği, \n ile yeni satırlar>\n-----END PRIVATE KEY-----
APNS_BUNDLE_ID=com.bulsulabs.clipforge
APNS_ENV=development  # production'a switch et App Store submission'dan önce
```

> `.p8` dosyasını Coolify env'de tek satırda yapıştır, `\n` literal kaçışlarıyla. Worker `.replace(/\\n/g, "\n")` ile parse ediyor.

### iOS entitlements

`project.yml` zaten ayarlı:
- `aps-environment: development` (production switch için commit gerekir)
- `UIBackgroundModes: [remote-notification, ...]`

Kullanıcı app'i açtığında `PushService.requestPermission()` çağrılır (onboarding sonrası).

## Bilinen sınırlamalar

- **Plus-only pack gating** iOS UI'da yapılıyor. Teknik olarak biri RC API'sini direkt çağırırsa pack'i kart-doğrudan alabilir. Webhook yine grant ederse problem yok ama "Plus üye olmadan kredi paketi satın aldı" durumu mümkün. Production'da: webhook'ta `hasActiveSubscription` kontrolü ekle, yoksa kredi grant etme + Apple refund tetikle.

- **Promotional Offer**'lar sandbox'ta tüm App Store Connect kurulumundan sonra aktif olmuyor — production'da test gerekebilir.

- **AI Avatar (5 cr)** maliyeti: OpenAI TTS-1-HD ~$0.06/dk + FAL SadTalker ~$0.10/dk = **$0.16/dk** toplam. 40 kredilik Plus monthly'de 8 avatar render ≈ $1.30 maliyet (önceki ElevenLabs+Replicate kombinasyonuna göre **~%60 daha ucuz**).
- **Voice clone** (kullanıcının kendi sesini klonlama) **V1.1'e ertelendi**. ElevenLabs gerektiriyordu; OpenAI TTS klonlama yapmıyor. 6 stok ses (alloy/echo/fable/onyx/nova/shimmer) launch için yeterli — gerçek voice clone istendiğinde sadece ElevenLabs key eklenir, kod hazır.
