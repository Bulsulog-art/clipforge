# Credits + IAP Setup (Apple iade-proof + weekly/monthly + retention)

## Neden bu model?

Klasik subscription'da Apple iade riski yüksek. Bu modelde:

- **Consumable kredi paketleri** → bir kez tüketildi mi Apple iade vermez
- **Weekly subscription** → düşük commitment ($4.99-7.99 retention test)
- **Monthly subscription** → daha çok kredi, fiyat avantajı
- **Win-back offer** → cancel etmeye yelten kullanıcıya $9.99/ay teklif

## Tam fiyat matrisi

### Subscription (auto-renewable)

| Product ID | Period | Price | Credits | Apple net (15%) | Marj @40% util |
|---|---|---|---|---|---|
| `clipforge_plus_weekly`     | Weekly  | **$4.99**  | 10  | $4.24 | **%81** |
| `clipforge_plus_monthly`    | Monthly | **$12.99** | 35  | $11.04 | **%75** |
| `clipforge_plus_monthly_retention` | Monthly | **$9.99** | 35 | $8.49 | **%67** |
| `clipforge_pro_weekly`      | Weekly  | **$7.99**  | 25  | $6.79 | **%71** |
| `clipforge_pro_monthly`     | Monthly | **$19.99** | 100 | $16.99 | **%53** |
| `clipforge_agency_monthly`  | Monthly | $49.99 | 600 | $42.49 | **%65** |

### Consumable credit packs (iade-proof)

| Product ID | Type | Price | Credits |
|---|---|---|---|
| `clipforge_credits_10`  | Consumable | $1.99  | 10 |
| `clipforge_credits_30`  | Consumable | $4.99  | 30 |
| `clipforge_credits_100` | Consumable | $14.99 | 100 |
| `clipforge_credits_500` | Consumable | $59.99 | 500 |

## App Store Connect kurulumu

### Adım 1: Subscription Group

App Store Connect → ClipForge → Monetization → **Subscription Groups → +**:
- Name: `ClipForge Memberships`
- Reference: `clipforge_subscriptions`

### Adım 2: Auto-Renewable Subscriptions ekle

Subscription group içinde **+**:

1. **Plus Weekly**
   - Product ID: `clipforge_plus_weekly`
   - Reference Name: Plus Weekly
   - Subscription Duration: **1 week**
   - Price: $4.99 (Tier 5)
   - Display name (EN): "Plus Weekly"
   - Description: "10 credits per week, no watermark"

2. **Plus Monthly**
   - Product ID: `clipforge_plus_monthly`
   - Duration: **1 month**
   - Price: $12.99
   - Display name: "Plus Monthly"

3. **Pro Weekly**
   - Product ID: `clipforge_pro_weekly`
   - Duration: 1 week
   - Price: $7.99

4. **Pro Monthly**
   - Product ID: `clipforge_pro_monthly`
   - Duration: 1 month
   - Price: $19.99

### Adım 3: Promotional Offer ($9.99 retention)

`clipforge_plus_monthly` subscription'ı seç → **Subscription Prices → Offers → Promotional Offers → +**:
- Reference Name: `plus_retention_999`
- Eligibility: **Existing subscribers**
- Offer Type: Pay as you go
- Duration: 3 months at $9.99/mo
- Code redemption: Off (we'll call programmatically via RevenueCat)

### Adım 4: Consumable IAP

App Store Connect → ClipForge → Monetization → **In-App Purchases → +** (Consumable):

| Product ID | Price | Display name |
|---|---|---|
| `clipforge_credits_10`  | $1.99  | "10 Credits" |
| `clipforge_credits_30`  | $4.99  | "30 Credits" |
| `clipforge_credits_100` | $14.99 | "100 Credits — Best Value" |
| `clipforge_credits_500` | $59.99 | "500 Credits — Power Pack" |

### Adım 5: Localized pricing (TR)

App Store Connect → Pricing → Per-country override:
- $4.99 → 169₺
- $7.99 → 269₺
- $9.99 → 339₺
- $12.99 → 449₺
- $19.99 → 689₺
- $59.99 → 1.999₺

## RevenueCat kurulumu

`Products` sekmesi — App Store Connect API ile otomatik eşlenir.

### Entitlements

| Entitlement | Products |
|---|---|
| `starter` (= Plus) | clipforge_plus_weekly, _monthly, _monthly_retention |
| `pro` | clipforge_pro_weekly, _pro_monthly |
| `agency` | clipforge_agency_monthly |

### Offerings

- `default` offering içine **5 paket** ekle:
  - `weekly_plus` → clipforge_plus_weekly
  - `monthly_plus` → clipforge_plus_monthly
  - `weekly_pro` → clipforge_pro_weekly
  - `monthly_pro` → clipforge_pro_monthly
  - `consumable_*` → 4 credit pack

### Webhook

URL: `https://clipforge.bulsulabs.xyz/api/revenuecat/webhook`
Auth header: `Bearer <REVENUECAT_WEBHOOK_AUTH>`

Webhook handler şu olayları işliyor:
- `NON_RENEWING_PURCHASE` → consumable kredi grant
- `INITIAL_PURCHASE` / `RENEWAL` / `PRODUCT_CHANGE` / `UNCANCELLATION` → subscription kredi + tier
- `CANCELLATION` / `EXPIRATION` / `BILLING_ISSUE` → tier → free
- `REFUND` → audit log (consumable krediler geri alınamaz)

## Retention flow

iOS app cancel butonuna basıldığında:

```swift
// SettingsView'da cancel girişi
if user is about to cancel Plus monthly {
    // RevenueCatUI win-back offer card
    PaywallView(offering: .promotional("plus_retention_999"))
}
```

Apple StoreKit otomatik olarak win-back offer'ı App Store cancellation sayfasında gösterir.

## Marj risk analizi

**En kötü senaryo:** Pro monthly user her ay 100 kredinin TAMAMINI clip generation'a kullanır.
- 100 × $0.20 cost = $20 cost
- Net $16.99 - $20 = **−$3 zarar**

**Risk azaltma:**
1. Hedef: 100 kredi gerçek %40 utilization → $8 cost, $8.99 marj
2. Power user'lara "Krediler azaldı, ek pack al" notification
3. Average olarak Pro user 60-80 kredi tüketir → güvenli marj

## Türkçe market dikkat noktaları

- Apple TR aboneliklerini Euro/USD'den TL'ye çeviriyor — TR enflasyon yüksek
- 3 ayda bir fiyat override gözden geçir
- $0.99 = ~33₺ (2026-05)
- Plus weekly 169₺ = bir orta kahve fiyatı → düşük entry barrier

## Test sırası

1. Sandbox tester oluştur (App Store Connect → Users → Sandbox)
2. iOS sim'de signed-out → free trial sign up
3. Plans view → Plus Weekly → confirm
4. RC webhook → Supabase RPC → 10 kredi
5. Video gönder → 1 kredi düşer (9 kalır)
6. Sandbox'ta refund simüle et → REFUND event log
7. Cancel test → Win-back offer prompt

## Ekranlar nerede

- **Landing (web):** http://localhost:3000/#pricing — Weekly/Monthly toggle
- **iOS:** Settings → "Choose plan" → PlansView (haftalık/aylık segment)
- **iOS:** Studio'da kredisiz → otomatik CreditsPaywallView (consumable)
- **iOS:** Cancel akışı → App Store sistem prompt + win-back card
