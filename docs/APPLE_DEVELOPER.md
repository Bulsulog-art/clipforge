# Apple Developer Setup

## 1. Apple Developer Program

1. https://developer.apple.com/programs/enroll/ → **Enroll**
2. **Organization** seçeneği (vergi numarası gerekli — Bulsu Labs)
3. $99/yıl
4. Onay 24–48 saat

> İndividual seçersen "Bulsu Labs" markası görünmez. Organization önerilir.

## 2. App Store Connect — yeni app

1. https://appstoreconnect.apple.com → **My Apps → +**
2. **New App**
   - Platform: iOS
   - Name: `ClipForge`
   - Primary Language: English (U.S.)
   - Bundle ID: `com.bulsulabs.clipforge` (önce Certificates portal'da kayıt et)
   - SKU: `clipforge-001`

## 3. Bundle ID & Capabilities

`Certificates, IDs & Profiles → Identifiers → +`:
- App IDs → App
- Bundle ID: `com.bulsulabs.clipforge`
- Capabilities:
  - ✅ In-App Purchase
  - ✅ Sign in with Apple
  - ✅ Push Notifications
  - ✅ Associated Domains (universal links: `applinks:clipforge.bulsulabs.xyz`)

## 4. In-App Purchase oluştur

App Store Connect → App → Monetization → **In-App Purchases → +**:
- Auto-Renewable Subscriptions
- Group: `clipforge_subscriptions`
- 3 product:
  - `clipforge_starter_monthly` — $29.99
  - `clipforge_pro_monthly` — $79.99
  - `clipforge_agency_monthly` — $199.99
- Her biri için: localized name, description, review screenshot

## 5. App Store Connect API Key (RevenueCat için)

Users and Access → Integrations → **App Store Connect API → Generate**:
- Access: **Admin**
- Key indirilir (`.p8`) — **bir kere indirebilirsin**
- Key ID + Issuer ID kaydet
- RevenueCat'a yükle (`docs/REVENUECAT_SETUP.md`)

## 6. Xcode signing

```
Team: Bulsu Labs
Bundle Identifier: com.bulsulabs.clipforge
Signing: Automatic
```

İlk build'de Xcode profili otomatik indirir.

## 7. TestFlight

1. Build'i Xcode → **Archive** → **Distribute App → App Store Connect**
2. App Store Connect → TestFlight → Internal Testing → Beta Testers ekle
3. Public link de oluşturulabilir (External Testing — App Review gerekli)

## 8. App Review hazırlığı

- App Privacy: hangi data toplandı (Auth email, video upload — privacy policy linki)
- Sign in with Apple **zorunlu** (3rd party auth varsa)
- Demo account: review için test kullanıcı (`reviewer@bulsulabs.com` / şifre)
- Screenshots: 6.7" iPhone (1290×2796), 5.5" (1242×2208)
- Reklam izleme: gerekmiyor (skip ATT)
