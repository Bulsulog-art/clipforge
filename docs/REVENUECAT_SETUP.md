# RevenueCat Setup

RevenueCat hem **iOS App Store** hem **Web (Stripe)** subscription'ları tek paywall altında birleştirir.

## 1. Hesap aç

1. https://app.revenuecat.com/signup → `berkebulsu@gmail.com`
2. **New project**: `ClipForge`

## 2. Apps

### iOS app
- **Add app** → iOS
- Bundle ID: `com.bulsulabs.clipforge`
- App Store Connect API Key:
  - App Store Connect → Users and Access → Integrations → App Store Connect API
  - **Generate API Key** (Admin)
  - `.p8` dosyasını indir → RevenueCat'a yükle
  - Key ID + Issuer ID gir

### Web (Stripe)
- **Add app** → Stripe Web
- Stripe hesabını bağla (OAuth)
- Pricing table burada oluşturulacak

## 3. Products

`Products` sekmesi, App Store Connect'te oluşturduğun **In-App Purchase**'lere işaret eder.

iOS için App Store Connect'te:
- `clipforge_starter_monthly` — $29.99/ay
- `clipforge_pro_monthly` — $79.99/ay
- `clipforge_agency_monthly` — $199.99/ay
- (opsiyonel) yıllık varyantlar — `_yearly`

Web için Stripe'ta aynı pricing'i oluştur, RevenueCat otomatik eşler.

## 4. Entitlements

`Entitlements`:
- `starter` — Starter ve üstü
- `pro` — Pro ve üstü
- `agency` — Agency

Her entitlement'ı ilgili product'a bağla (multiple products → tek entitlement OK).

## 5. Offerings

`Offerings → default`:
- Add packages:
  - `$rc_monthly_starter` → `clipforge_starter_monthly`
  - `$rc_monthly_pro` → `clipforge_pro_monthly`
  - `$rc_monthly_agency` → `clipforge_agency_monthly`

iOS Paywall Editor'da bu offering'i kullanacağız.

## 6. Webhooks → Supabase

`Project Settings → Integrations → Webhooks`:
- URL: `https://<ref>.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: `Bearer <SUPABASE_SERVICE_ROLE_KEY>` (function içinde validate edilir)
- Event types: **All** (subscription değişiklikleri için)

## 7. API keys (`.env`)

`Project Settings → API keys`:
```
REVENUECAT_PUBLIC_IOS_KEY=appl_...     # iOS SDK
REVENUECAT_PUBLIC_WEB_KEY=strp_...     # Web SDK
REVENUECAT_SECRET_KEY=sk_...           # server-side
REVENUECAT_WEBHOOK_AUTH=...            # webhook validation
```
