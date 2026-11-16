# DentVideo iOS: App Store Connect bilgileri

Uygulamada fiyat, plan veya web'e satın alma yönlendirmesi yok (3.1.3(c)). Gerekçe: `docs/KARARLAR-dentvideo.md`.

## Uygulama kaydı (New App)

| Alan | Değer |
|---|---|
| Platform | iOS |
| Name | DentVideo |
| Primary language | English (U.S.) |
| Bundle ID | com.bulsulabs.dentvideo |
| SKU | dentvideo-ios |
| User access | Full access |
| Category | Business (birincil), Medical (ikincil) |
| Price | Free |
| Age rating | Medical/Treatment Information: Frequent. Diğer tüm cevaplar None/No. Sonuç: 16+ |
| Privacy Policy URL | https://dentvideo.com/privacy |
| Support URL | https://dentvideo.com/about |
| Copyright | 2026 BLS AI AUTOMATION DOO |

## English (U.S.)

- **Subtitle (30):** `Your clinic's weekly videos`
- **Promotional text:** `Watch, approve and share the patient-education videos made for your clinic each week.`
- **Keywords (100):** `dental,dentist,clinic,patient education,video,approve,orthodontics,oral health,practice,social`
- **Description:**

```
DentVideo is the companion app for dental clinics that use DentVideo.

Every Monday, DentVideo prepares five short, narrated and captioned patient-education videos with your clinic's logo and colours. This app is where the dentist reviews them.

• Watch this week's videos
• Approve each one, or approve them all in one tap
• Say no to a video and leave a note about what should change
• Save approved videos to Photos, or share them to any app
• Copy the ready-made caption and hashtags
• Tick off what you have posted
• Browse past weeks in your library

Nothing is published without your approval, and you post from your own clinic accounts.

Every script is checked by software for accuracy and health-advertising rules before you see it. The videos are general patient information, not a diagnosis.

Requires an existing DentVideo clinic account. You can open a sample clinic without signing in to see how it works.
```

## Türkçe

- **Subtitle:** `Kliniğinizin haftalık videoları`
- **Promotional text:** `Kliniğiniz için her hafta hazırlanan hasta bilgilendirme videolarını izleyin, onaylayın ve paylaşın.`
- **Keywords:** `diş,diş hekimi,klinik,hasta bilgilendirme,video,onay,ortodonti,ağız sağlığı,muayenehane,sosyal`
- **Description:**

```
DentVideo, DentVideo kullanan diş kliniklerinin yardımcı uygulamasıdır.

DentVideo her pazartesi kliniğinizin logosu ve renkleriyle beş kısa, seslendirilmiş ve altyazılı hasta bilgilendirme videosu hazırlar. Diş hekimi videoları bu uygulamada inceler.

• Bu haftanın videolarını izleyin
• Her birini onaylayın ya da hepsini tek dokunuşla onaylayın
• Bir videoyu reddedin ve neyin değişmesi gerektiğini not edin
• Onaylanan videoları Fotoğraflar'a kaydedin ya da istediğiniz uygulamada paylaşın
• Hazır açıklamayı ve etiketleri kopyalayın
• Paylaştıklarınızı işaretleyin
• Geçmiş haftalara arşivden bakın

Siz onaylamadan hiçbir şey yayımlanmaz. Paylaşımı kliniğinizin kendi hesaplarından siz yaparsınız.

Her metin, siz görmeden önce doğruluk ve sağlık reklamı kurallarına göre yazılımla denetlenir. Videolar genel hasta bilgilendirmesidir, teşhis değildir.

Mevcut bir DentVideo klinik hesabı gerektirir. Nasıl çalıştığını görmek için giriş yapmadan örnek bir klinik açabilirsiniz.
```

## Ekran görüntüleri (6.9", 1320×2868)

Görüntüler `marketing-assets/dentvideo-ios/en` ve `/tr` altında. Hepsi simülatörde UI testinin çektiği gerçek ekranlar.

Sıra şöyle:
1. `02-week`
2. `03-review`
3. `04-approved`
4. `05-all-approved`
5. `06-library`
6. `01-signin`

## App Privacy

| Veri | Toplanıyor | Kullanıcıya bağlı | Takip | Amaç |
|---|---|---|---|---|
| Contact Info: Email Address | Evet | Evet | Hayır | App Functionality |
| Identifiers: User ID | Evet | Evet | Hayır | App Functionality |
| User Content: Other User Content (ret notu) | Evet | Evet | Hayır | App Functionality |
| Usage Data: Product Interaction (onay olayı `video_approved`, `dentvid_events`) | Evet | Evet | Hayır | Analytics |
| Health, Location, Contacts, Browsing, Diagnostics, Purchases | Hayır | | | |

Tracking: No.

## App Review Information

- **Sign-in required:** Evet (2.1(a): demo modu yalnız Apple'ın ön onayıyla yeter). Sahibi bir demo klinik açar: etkin plan, en az 5 onay bekleyen video. E-posta ve şifresini buraya kendisi girer.
- **Contact:** hello@dentvideo.com
- **Notes:**

```
DentVideo is a free companion app for dental clinics that already have a DentVideo business account. DentVideo is a B2B service. It is sold directly to dental practices (organizations) under a business agreement on our website and invoiced to the practice. It is not sold to consumers. The app contains no purchasing, no prices and no links to buy (Guideline 3.1.3(c)). Clinics create accounts on the web. The app offers sign-in, an in-app password reset, and account deletion under Account.

Sign-in details for a demo clinic are in the Sign-In Information fields. Account deletion can be tested with that account.

Without signing in, "Explore a sample clinic" on the first screen opens a sample clinic with DentVideo's public sample videos. There you can watch, approve, reject with a note, approve all, save to Photos (add-only permission), share, copy the caption, mark as posted and browse the library. Decisions in the sample clinic stay on the device.

The videos are general patient information. The clinic's own dentist approves each one before use, and every video screen states that it is not a diagnosis. The app stores no patient data.

The only external link is the privacy policy on dentvideo.com.
```

## Yükleme

```bash
ios-dentvideo/scripts/upload.sh
```

Bu komut sürüm numarasını artırır, archive alır ve App Store Connect'e yükler. App Store Connect'te uygulama kaydı yoksa yükleme başarısız olur.
