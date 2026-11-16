# DentVideo iOS: kararlar (2026-11-16)

## Karar 1: Ayrı uygulama. ClipForge yeniden markalanmayacak.

Yeni uygulamanın kimliği `com.bulsulabs.dentvideo`. Kod `ios-dentvideo/` altında. ClipForge (`com.bulsulabs.clipforge`) kendi ürünü olarak kalıyor.

| Ölçüt | Ayrı uygulama | ClipForge'u yeniden markalamak |
|---|---|---|
| Mevcut kullanıcılar | ClipForge'un 296 kullanıcısı etkilenmez. Bunların 96'sı son 30 günde geldi (canlı sayım, 2026-11-16). | Güncelleme gelince kullanıcı tanımadığı bir uygulama görür. Klip özelliği gider. |
| Ödeyen aboneler (3.1.2(a)) | Etkilenmez. | Apple'ın kuralı açık: "should not take away the primary functionality existing users have already paid for". Ödediği özellik elinden alınan kullanıcı "bait-and-switch" sayılır. |
| Bundle ID | Yeni. | Değiştirilemez ("can't change this property after you upload a build"). Puanlar ve yorumlar başka bir ürüne taşınır. |
| 4.3 spam | Düşük risk. İşlev, kitle, arayüz, ikon ve metin farklı. 4.3(a) aynı uygulamanın birden çok bundle'ını yasaklıyor. Bu durum o değil. | Yok, ama 2.3.1(a) yanıltıcı metadata riski var. |
| 3.1.3(c) savunması | Temiz: uygulamada IAP yok, yalnız işletmeye satış. | Bulanık: aynı uygulamada RevenueCat IAP aboneliği de var. |

Klinik başına ayrı uygulama yapılmayacak (4.2.6). Tek uygulama, klinik başına hesap.

## Karar 2: Uygulama içi satın alma yok. Dayanak 3.1.3(c) Enterprise Services.

- DentVideo işletmelere (diş klinikleri) web'de, doğrudan sözleşmeyle satılıyor. Ödeme Dodo Payments üzerinden. 3.1.3(c), "only sold directly by you to organizations or groups" olan hizmetlerde IAP'siz erişime izin veriyor.
- 3.1.3(b) uymaz. Bu madde web'de satılanın uygulamada da IAP olarak sunulmasını şart koşuyor.
- 3.1.3(f) kategori olarak uymaz. Ama koşullarını aynen uyguluyoruz: uygulamada satın alma yok, dışarıya satın alma çağrısı yok.
- Uygulamada şunlar yok: kayıt, plan, fiyat, "abone ol", ödeme sayfasına bağlantı. Kullanım koşulları bağlantısı da kaldırıldı, çünkü sitenin menüsünde fiyat bağlantısı var.
- Şifre sıfırlama uygulamanın içinde: sitenin `/api/dentvideo/password-reset` uç noktası, web formuyla aynı. Bağlantı e-postayla gelir.
- Kalan tek dış bağlantı gizlilik politikası. 5.1.1(i) gereği zorunlu ve inceleme notunda açıklanıyor.
- ABD mağazasında dış bağlantı serbestisi v1'de kullanılmıyor. Kullanılırsa 2.5.19 gereği notta beyan edilmeli.
- Bilinen risk: tek hekimli bir klinik "single user" satış gibi görülebilir. Bunu azaltan şey, inceleme notunda B2B sözleşmeyi ve işletme faturasını açıkça yazmak.

### Fiyat değişmedi

Fiyatlar aynı kalıyor: Starter $49 / €49 / 1.490 TL, Practice $79 / €79 / 2.490 TL. IAP açılmadığı için Apple fiyat katmanı eşlemesi gerekmiyor.

İleride IAP gerekirse Apple fiyat noktası eşlemesi şöyle olur (Apple fiyat adımları; güncel liste App Store Connect'te doğrulanmalı):

| Plan | Bugünkü fiyat | En yakın Apple noktası | Not |
|---|---|---|---|
| Starter | $49 / €49 / 1.490 TL | 49,00 veya 49,99 USD; 49,00 veya 49,99 EUR; 1.490,00 TL | Bire bir karşılığı var. |
| Practice | $79 / €79 / 2.490 TL | 79,00 veya 79,99 USD; 79,00 veya 79,99 EUR; TL'de 2.450 ya da 2.500 TL | 2.490 TL'nin tam karşılığı yok. |

## Karar 3: Sağlık içeriği kuralları (1.4.1, 2.3.7, 5.1.3)

- Her video ekranında şu not var: "General patient information, not a diagnosis. Nothing is shared until your dentist approves it." Bu not TR, DE ve ES'ye de çevrildi.
- "Klinik olarak doğrulanmış" gibi doğrulanamayan bir iddia kullanılmıyor. Kullanılan iddia, sitedeki dürüst ifadenin aynısı: "software-checked for accuracy and health-advertising rules before you see it. You decide what is used."
- Uygulama hasta verisi tutmuyor. Bu yüzden 5.1.3 tetiklenmiyor ve gizlilik etiketinde "Health" alanı işaretlenmiyor.
- Yaş derecesi: tedavi bilgisi içeriği sık olduğu için dürüst cevap "Medical/Treatment Information: Frequent", sonuç 16+.

## Karar 4: İnceleme için demo klinik ve örnek klinik

- Giriş ekranında "Explore a sample clinic" düğmesi var. Uygulamanın tamamını, sitenin herkese açık örnek videolarıyla, girişsiz gösteriyor. Kararlar yalnız telefonda tutuluyor, hiçbir yere gönderilmiyor.
- 2.1(a)'ya göre demo modu, demo hesabın yerine ancak Apple'ın ön onayıyla geçer. Bu yüzden gönderimde gerçek bir demo klinik hesabı da verilecek. Hesap silmeyi de inceleyici ancak bu hesapla görebilir.
- Yeni hesap açmak ve şifre girmek sahibine bırakıldı.

## Karar 6: Kayıtlar da gösteriliyor

Uygulama web kütüphanesiyle aynı listeyi gösteriyor: haftalık videolar ve kliniğin kendi kayıtları. Practice planı kendi kayıtlarını satıyor, bu yüzden onları gizlemek eksik olurdu.

## Bilinen sınırlar

- Üretimde `DODO_API_KEY` tanımlı değil. Bu yüzden aktif aboneliği olan bir klinik hesabını uygulamadan silemiyor. Sunucu "önce aboneliğinizi iptal edin" diyor ve uygulama bu metni gösteriyor. Silme ekranındaki açıklama da buna göre yazıldı.

## Karar 5: Sunucu tarafı

- Uygulama klinik verisini kendi Supabase oturumuyla, RLS altında okuyor (`dentvid_items`, `dentvid_clinics`, `dentvid` deposu).
- Karar verme ("posted" işareti dahil) ve hesap silme, web'in API'sinden geçiyor: `PATCH /api/dentvideo/items/<id>` ve `POST /api/dentvideo/account/delete`. Böylece web ile aynı doğrulamalar ve olaylar çalışıyor.
- `dvSession` artık `Authorization: Bearer` kabul ediyor. Token GoTrue'da doğrulanıyor, istemci anon anahtarla kuruluyor, cookie'ye geri düşmüyor.
- `origin-guard` yalnız bu iki rota için bearer isteklerinde Origin kontrolünü atlıyor (PR #171).

## Kaynaklar

- App Review Guidelines (16 Ekim 2026 sürümü): 1.4.1, 2.1(a), 2.3.7, 2.5.19, 3.1.1, 3.1.1(a), 3.1.2(a), 3.1.3(b)/(c)/(f), 4.2, 4.2.6, 4.3(a), 4.8, 5.1.1(i)/(v), 5.1.3. https://developer.apple.com/app-store/review/guidelines/
- App Store Connect Help: App information, age ratings, privacy details, offering account deletion.
- Ayrıntılı araştırma notu: oturum not klasöründeki `apple-kurallar.md`.
