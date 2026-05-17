# Credits + IAP Setup (Apple iade-proof model)

## Neden bu model?

Klasik subscription:
- $19/ay Pro paket
- Kullanıcı 30 gün sonra "yanlışlıkla aldım" der → Apple iade verir
- Ama biz zaten 50 video işlemişiz ($20 API)
- **Net zarar: -$20** her iade için

Consumable kredi paketleri:
- Kullanıcı $4.99 = 30 kredi alır
- Krediler kullanılır (her video 1 kredi)
- Kullanıcı iade isterse Apple "tüketilmiş içerik" diye reddediyor
- **Refund riski %95 daha düşük**

## App Store Connect — In-App Purchases oluştur

App Store Connect → ClipForge: AI Viral Clips → Monetization → In-App Purchases → **+**

### Consumable products (krediler — bunlar iade-proof)

| Product ID | Type | Price tier | Display name |
|---|---|---|---|
| `clipforge_credits_10`  | Consumable | $1.99  | 10 Credits |
| `clipforge_credits_30`  | Consumable | $4.99  | 30 Credits |
| `clipforge_credits_100` | Consumable | $14.99 | 100 Credits — Best Value |
| `clipforge_credits_500` | Consumable | $59.99 | 500 Credits — Power Pack |

### Subscription products (otomatik kredi + tier upgrade)

Subscription group: `clipforge_subscriptions`

| Product ID | Type | Price | Credits/mo | Tier |
|---|---|---|---|---|
| `clipforge_plus_monthly`   | Auto-renewable | $9.99  | 30  | starter |
| `clipforge_pro_monthly`    | Auto-renewable | $19.99 | 150 | pro |
| `clipforge_agency_monthly` | Auto-renewable | $49.99 | 800 | agency |

### Eski $29 / $79 / $199 paketleri ne olacak?

Kullanma. Yeni fiyatlar daha düşük, daha çok kişiye satarsın.
Eskileri App Store Connect'te `Removed from sale` yap (silme — mevcut subscriber'ları korur).

## RevenueCat — Products & Entitlements

`Products` sekmesi:
- 4 consumable product otomatik App Store API ile eşlenir
- 3 subscription product için entitlement bağla

Entitlements:
- `starter` → `clipforge_plus_monthly`
- `pro` → `clipforge_pro_monthly`
- `agency` → `clipforge_agency_monthly`

Consumables için entitlement YOK — onlar tek seferlik kredi grant'ı.

Webhook → `https://clipforge.bulsulabs.xyz/api/revenuecat/webhook`
Auth header → `Bearer <REVENUECAT_WEBHOOK_AUTH>` (env'de mevcut)

## Test sırası

1. RevenueCat sandbox user oluştur
2. iOS app sim'de "Buy 10 credits" tıkla
3. Apple sandbox prompt → confirm
4. RC webhook → Supabase webhook → `clipforge.grant_credits(user, 10, 'purchase', ...)` çağrılır
5. iOS: `CreditsService.refresh()` → balance = 10
6. Video gönder → 1 kredi düşer
7. Refund test: Apple sandbox'ta iade simüle et → `REFUND` event → log

## Maliyet vs fiyat (gerçek hesap)

| Paket | Apple sonrası (15% small biz) | Bana net | 1 kredi maliyetim* | Marj |
|---|---|---|---|---|
| 10 credits $1.99 | $1.69 | $1.69 | $4.00 = ❌ | **kayıp leader** (signup için) |
| 30 credits $4.99 | $4.24 | $4.24 | $12 = ❌ | (B-roll ile) **kayıp** |
| 100 credits $14.99 | $12.74 | $12.74 | $40 = ❌ | (full feature ile) **kayıp** |
| 500 credits $59.99 | $50.99 | $50.99 | $200 = ❌ | **kayıp** (heavy users sübvanse) |

*Eğer her krediye AI thumbnail + AI translation dahilse.

**Çözüm:** Free thumbnail (CPU only) varsayılan. AI thumbnail/translation = ek kredi.

Düzeltilmiş kredi tüketimi:
| İşlem | Kredi |
|---|---|
| Klip generation (10 klip + CPU thumbs + watermark) | 1 |
| AI thumbnail (Mr.Beast) | +1 |
| AI translation 1 dk | +2 |
| Face swap 1 klip | +1 |
| Audio enhance | +1 |
| AI voice clone 1 dk | +3 |

Bu modelde 30 kredi paketi = ~10 video + 5 premium feature = $0.50 ortalama maliyet → $4.24 - $0.50 = **$3.74 net** → **%88 marj** ✅

## Türkçe kullanıcı fiyatlandırması

Türk Lirası fiyatları App Store Connect → Pricing → Per-country override:
- $1.99 → 69₺ (TR App Store gösterimi)
- $4.99 → 169₺
- $14.99 → 499₺
- $59.99 → 1.999₺

Türk yıllık enflasyon hızında otomatik güncelleme: Apple "auto-adjust" kapalı bırak — manuel düzelt 3 ayda bir.

## Refund webhook handling

Webhook'umuz şu durumları yakalıyor:
- `NON_RENEWING_PURCHASE` → consumable kredi → grant
- `INITIAL_PURCHASE`, `RENEWAL` → subscription → tier + credits grant
- `REFUND` → tüketilmemiş krediler varsa eksi balance'a inebilir (negative balance OK)
- `CANCELLATION`, `EXPIRATION` → tier → free, krediler kalır (kullanılana kadar)

## Push notification flow (Coming up)

İdeal trigger'lar:
- "Your 12 clips are ready!" → job ready
- "You're low on credits (5 left)"
- "Your TikTok post got 1K views!"
- "Top trending in your niche today: ..."

APNs setup için `docs/PUSH_SETUP.md` (yazılacak).
