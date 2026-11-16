# DentVideo iOS: kararlar (2026-11-16)

Uygulama: `ios/DentVideo` (PR #170), bundle `com.bulsulabs.dentvideo`. Sunucu: `/api/dentvideo/mobile/v1`.
Mağaza paketi: `docs/APP_STORE_DENTVIDEO.md`.

## Karar 1: Ayrı uygulama. ClipForge yeniden markalanmayacak.

| Ölçüt | Ayrı uygulama | ClipForge'u yeniden markalamak |
|---|---|---|
| Mevcut kullanıcılar | ClipForge'un 296 kullanıcısı etkilenmez. Bunların 96'sı son 30 günde geldi (canlı sayım, 2026-11-16). | Güncellemeyle kullanıcının telefonuna tanımadığı bir uygulama gelir. Klip özelliği gider. |
| Ödeyen aboneler (3.1.2(a)) | Etkilenmez. | Apple'ın kuralı: "should not take away the primary functionality existing users have already paid for". Ödediği özelliği elinden almak "bait-and-switch" sayılır. |
| Bundle ID | Yeni. | Değiştirilemez. Puanlar ve yorumlar başka bir ürüne taşınır. |
| 4.3 spam | Düşük risk. İşlev, kitle, arayüz, ikon ve metin farklı. | Yok, ama 2.3.1(a) kapsamında yanıltıcı metadata riski var. |
| 3.1.3(c) savunması | Temiz: uygulamada IAP yok, satış yalnız işletmelere. | Bulanık: aynı uygulamada RevenueCat IAP aboneliği de var. |

Aynı gün paralel bir oturumda aynı bundle ID'yle ikinci bir prototip yazıldı (`ios-dentvideo/`, yerel dal `backup/dentvideo-ios-prototype`). Gönderilmedi: 4.3(a) aynı uygulamanın kopyalarını yasaklıyor, ayrıca tek kaynak ilkesi var. Kanonik uygulama #170. Prototipten hasım denetimi bulguları ve Apple kural araştırması bu belgeye taşındı.

Klinik başına ayrı uygulama yapılmayacak (4.2.6). Tek uygulama var, klinik başına hesap.

## Karar 2: Uygulama içi satın alma yok. Dayanak 3.1.3(c) Enterprise Services.

- DentVideo diş kliniklerine, yani işletmelere, web'de doğrudan sözleşmeyle satılıyor. Ödeme Dodo Payments üzerinden. 3.1.3(c), "only sold directly by you to organizations or groups" olan hizmetlerde IAP'siz erişime izin veriyor.
- 3.1.3(b) uymaz, çünkü web'de satılanın uygulamada IAP olarak da sunulmasını şart koşuyor.
- 3.1.3(f) kategori olarak uymaz, ama koşullarına uyuluyor: uygulamada satın alma yok, dışarıya satın alma çağrısı yok.
- Uygulamada kayıt, plan seçimi, fiyat, "abone ol" ve ödeme sayfasına bağlantı yok. Plan yoksa nötr bir "aktif plan yok" ekranı çıkıyor.
- Şifre sıfırlama isteği uygulamadan gönderiliyor. Bağlantı e-postayla geliyor.
- ABD mağazasındaki dış bağlantı serbestisi v1'de kullanılmıyor.
- Bilinen risk: tek hekimli bir klinik "single user" satış gibi görülebilir. İnceleme notunda B2B sözleşme ve işletme faturası açıkça yazılmalı.
- Açık risk (hasım bulgusu): giriş ve ayarlardaki Gizlilik, Koşullar ve Yardım bağlantıları dentvideo.com sayfalarını açıyor. Bu sayfaların menüsünde "Pricing" bağlantısı var. Gizlilik bağlantısı 5.1.1(i) gereği zorunlu, Koşullar ve Yardım isteğe bağlı. İnceleme bu yüzden reddederse iki seçenek var: bu iki bağlantıyı kaldırmak, ya da sitede menüsüz bir `?app=1` görünümü açmak.

### Fiyat değişmedi

Fiyatlar aynı kalıyor: Starter $49 / €49 / 1.490 TL, Practice $79 / €79 / 2.490 TL. IAP açılmadığı için Apple fiyat katmanı eşlemesi şu an gerekmiyor.

İleride IAP gerekirse kullanılacak Apple fiyat noktaları aşağıda. Güncel listeyi App Store Connect'te doğrulayın.

| Plan | Bugünkü fiyat | En yakın Apple noktası | Not |
|---|---|---|---|
| Starter | $49 / €49 / 1.490 TL | 49,00 veya 49,99 USD; 49,00 veya 49,99 EUR; 1.490,00 TL | Bire bir karşılığı var. |
| Practice | $79 / €79 / 2.490 TL | 79,00 veya 79,99 USD; 79,00 veya 79,99 EUR; TL'de 2.450 veya 2.500 TL | 2.490 TL'nin tam karşılığı yok. |

## Karar 3: Sağlık içeriği (1.4.1, 2.3.7, 5.1.3)

- Video ekranı yazılım denetiminin notlarını gösteriyor. Hekim onaylamadan hiçbir şey yayımlanmıyor.
- "Klinik olarak doğrulanmış" gibi doğrulanamayan bir iddia kullanılmıyor. Sitedeki ifade aynen kullanılıyor: "software-checked for advertising rules and clinical accuracy".
- Uygulama hasta verisi tutmuyor, bu yüzden 5.1.3 tetiklenmiyor. Gizlilik etiketinde Health yok.
- Yaş derecesi: içerik sık sık tedavi bilgisi verdiği için dürüst cevap "Medical/Treatment Information: Frequent". Sonuç 16+.

## Karar 4: İnceleme için demo klinik hesabı

- 2.1(a)'ya göre demo modu, demo hesabın yerine ancak Apple'ın ön onayıyla geçer. Uygulamada demo modu yok. Bu yüzden gönderimde gerçek bir demo klinik hesabı verilecek: planı etkin, haftası onay bekliyor (`docs/APP_STORE_DENTVIDEO.md` §1.5). İnceleyici hesap silmeyi de bu hesapla dener.
- Yeni hesap açmak ve şifre girmek sahibine bırakıldı.

## Karar 5: Sunucu tarafı

- Uygulama yalnız `/api/dentvideo/mobile/v1/*` ile konuşuyor. Bu yol yalnız Bearer kabul ediyor, cookie okumuyor ve web rotalarıyla aynı işleyicileri kullanıyor.
- Canlıda doğrulandı (2026-11-16):
  - Tokensiz `GET me` → 401.
  - Yanlış şifreyle `POST session` → 401 `invalid_credentials`.
  - `dentvid_devices` tablosu uygulanmış.
- #171 ayrıca `dvSession`'a Bearer desteği ekledi. `origin-guard` yalnız `items/<uuid>` ve `account/delete` için Bearer'ı Origin kontrolünden muaf tutuyor. Testli ve hasım denetiminden geçti. Kanonik uygulama bu yolu kullanmıyor; saldırı yüzeyini küçültmek için ileride kaldırılabilir.

## Bilinen sınırlar

- Üretimde `DODO_API_KEY` tanımlı değil. Bu yüzden aktif aboneliği olan bir klinik hesabını uygulamadan silemiyor. Sunucu önce aboneliğin iptal edilmesini istiyor.
- App Store Connect'te iki engel var, ikisini de hesap sahibi kaldırabilir:
  - Paid Apps sözleşmesinin yeni sürümü kabul edilmemiş. Kabul edilene kadar yeni uygulama kaydı açılamıyor ve mevcut uygulamalar güncellenemiyor.
  - AB için DSA tüccar beyanı "Rejected" durumunda.

## Kaynaklar

- App Review Guidelines (16 Ekim 2026 sürümü): 1.4.1, 2.1(a), 2.3.7, 2.5.19, 3.1.1, 3.1.1(a), 3.1.2(a), 3.1.3(b)/(c)/(f), 4.2, 4.2.6, 4.3(a), 4.8, 5.1.1(i)/(v), 5.1.3. https://developer.apple.com/app-store/review/guidelines/
- App Store Connect Help: app information, age ratings, privacy details, account deletion.
- Ayrıntılı araştırma notu: oturum not klasöründeki `apple-kurallar.md`.
