# Credits + IAP Setup (Plus tek tier · Apple iade-proof · Lifetime free taste)

## Strateji özeti

**Free tier sıfır rekürring maliyet.** Sadece **1 video lifetime**. Sonra Plus zorunlu.

- **Free**: 1 video lifetime (5dk max), watermark + "Made with ClipForge" outro (organic marketing)
- **Plus weekly** $4.99 → 10 kredi/hafta
- **Plus monthly** $14.99 → 40 kredi/ay (kredi başına %25 ucuz)
- **Plus retention** $12.99 → 40 kredi/ay (cancel akışında win-back)
- **Plus-only kredi paketleri** (consumable):
  - +10 credits → $4.99
  - +20 credits → $7.99 (Best value)

### Free maliyet matematiği

| Free user | Lifetime maliyet | Recurring |
|---|---|---|
| 1 | **$0.08** | **$0** |
| 1.000 | $80 | $0 |
| 100.000 | $8.000 (one-shot) | $0 |

5 kredi/ay verseydik: 100K user × 5 × $0.08 = **$40K/ay rekürring**. Yıllık $480K maliyet farkı.

Watermark + 2-saniye "Made with ClipForge" outro her free render'da → kullanıcı TikTok'a yüklediğinde **organik marketing** elde ediyoruz. Free zarar gibi görünmüyor, **paid ads alternatifi**.

## Fiyat × Kredi × Marj tablosu

(Apple %15 small-biz, %40 ortalama kredi tüketimi varsayımı)

| SKU | Fiyat | Krediler | Apple net | Maliyet | **Marj** |
|---|---|---|---|---|---|
| `clipforge_plus_weekly`            | $4.99  | 10 | $4.24 | $0.80 | **%81** |
| `clipforge_plus_monthly`           | $14.99 | 40 | $12.74 | $3.20 | **%75** |
| `clipforge_plus_monthly_retention` | $12.99 | 40 | $11.04 | $3.20 | **%71** |
| `clipforge_credits_10`             | $4.99  | 10 | $4.24 | $0.80 | **%81** |
| `clipforge_credits_20`             | $7.99  | 20 | $6.79 | $1.60 | **%80** |

**Worst case (%100 kredi tüketimi):** Plus monthly $14.99 — 40 × $0.20 = $8 maliyet, $12.74 - $8 = **$4.74 (%37 marj)**. Hâlâ pozitif.

**Upgrade funnel:**
- Weekly: $0.50/credit
- Monthly: $0.37/credit (%25 ucuz)
- Pack 10: $0.50/credit
- Pack 20: $0.40/credit

Kullanıcı haftalık deneyip aylık geçer → tükenirse pack alır → her senaryo Plus'a bağlı.

## App Store Connect kurulumu

### 1. Subscription Group oluştur
- Name: `ClipForge Memberships`
- Reference: `clipforge_subscriptions`

### 2. Auto-renewable subscriptions ekle

| Product ID | Period | Price | Display name |
|---|---|---|---|
| `clipforge_plus_weekly`  | 1 week  | $4.99  | Plus Weekly |
| `clipforge_plus_monthly` | 1 month | $14.99 | Plus Monthly |

### 3. Promotional Offer (retention $12.99)

`clipforge_plus_monthly` → **Subscription Prices → Promotional Offers → +**:
- Reference: `plus_retention_1299`
- Eligibility: **Existing subscribers**
- Offer Type: Pay as you go
- Duration: 3 months at $12.99
- Code redemption: Off (RC tetikler)

### 4. Consumable IAP

| Product ID | Type | Price | Display name |
|---|---|---|---|
| `clipforge_credits_10` | Consumable | $4.99 | +10 Credits |
| `clipforge_credits_20` | Consumable | $7.99 | +20 Credits — Best Value |

> Apple "subscription-required" bayrağı yok — iOS app UI gate'liyor (`hasPlus` kontrolü).

### 5. Türkçe override

| USD | TR fiyat |
|---|---|
| $4.99  | 169₺ |
| $7.99  | 269₺ |
| $12.99 | 449₺ |
| $14.99 | 499₺ |

## RevenueCat

### Entitlements
- `starter` (alias: `plus`) → tüm 3 Plus subscription product

### Offerings
`default`:
- `weekly_plus`  → `clipforge_plus_weekly`
- `monthly_plus` → `clipforge_plus_monthly`
- `credits_10`   → `clipforge_credits_10`
- `credits_20`   → `clipforge_credits_20`

Retention `clipforge_plus_monthly_retention` ayrı package olmaz — Promotional Offer'la sunulur.

### Webhook
- URL: `https://clipforge.bulsulabs.xyz/api/revenuecat/webhook`
- Auth: `Bearer <REVENUECAT_WEBHOOK_AUTH>`

İşlenen event'ler:
- `NON_RENEWING_PURCHASE` → consumable → kredi
- `INITIAL_PURCHASE` / `RENEWAL` / `PRODUCT_CHANGE` / `UNCANCELLATION` → subscription → 10/40 kredi + tier=starter
- `CANCELLATION` / `EXPIRATION` / `BILLING_ISSUE` → tier=free, krediler kalır (kullanılana kadar)
- `REFUND` → audit log (consumable krediler tüketildiyse geri alınamaz)

## iOS UI Akışı

```
1. ProjectsView → "New project" → kredisiz
   ↓
2. CreditsPaywallView açılır
   - Plus user → 2 kredi paketi (10/$4.99, 20/$7.99)
   - Free user → "Plus only" upsell + "See Plus pricing" button
   ↓
3. PlansView (tek Plus tier)
   - Weekly/Monthly segmented control
   - Subscribe button → RevenueCat → Apple sandbox/production
   - 2 info card: Win-back + Plus-only packs
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
2. iOS sim'de free hesap → ProjectsView → New project (no credits)
3. CreditsPaywallView → Plus-only upsell → See pricing → PlansView
4. Plus Weekly $4.99 → Apple sandbox prompt → Confirm
5. RC webhook → 10 kredi balance'a düşer
6. Yeni project → 1 kredi tüketilir (9 kalır)
7. CreditsPaywallView tekrar aç → 2 pack görünür
8. Pack 10 → $4.99 → +10 kredi
9. Sandbox'ta refund simüle et → REFUND event log
10. Cancel testi → Apple win-back kartı: $12.99/mo

## Cron'lar

`supabase/migrations/00004_trends_and_cron.sql`:

```sql
-- 1. ayın ilk günü 00:05 UTC, free kullanıcılara 5 kredi yenile
clipforge.refill_free_credits(5)

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

- **Voice clone (5 cr)** maliyeti ElevenLabs üzerinden $0.40/dk. 40 kredilik Plus monthly'de 8 voice clone = $3.20 maliyet — bu özellik Plus'a dahil edilirken kredi başına maliyet hesabına dahil edildi.
