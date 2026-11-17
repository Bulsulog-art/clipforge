# DentVideo Google Ads: yayına alma kontrol listesi (ay 1)

*Güncellendi 2026-11-16: fiyatlar `web/src/lib/dentvid/pricing.ts` ile aynı (Starter $49 / €49 / 1.490 TL, Practice $79 / €79 / 2.490 TL), hesap para birimi **EUR**, saat dilimi **Europe/Podgorica**, dönüşüm değerleri koddaki gibi (`dv_paid` TR 100 USD, diğerleri 150 USD). Tarayıcıda adım adım uygulanacak sürüm: `../RUNBOOK.md` §1.*

Bu klasördeki dosyalar içe aktarmaya hazır ve doğrulandı (`validation-output.txt`: **PASS**; yeniden çalıştırmak için `python3 -I validate.py`). Hiçbir hesap açılmadı. Her şey **Duraklatılmış (Paused)** olarak içe aktarılır. Kampanyaları yalnızca **D** bölümü bitince ve günlük bütçeyi siz onayladıktan sonra açın.

**İçerik:** 3 kampanya, 12 reklam grubu, 133 anahtar kelime (32 tam eşleme, 101 sıralı eşleme), 20 reklam (RSA), 18 site bağlantısı, 23 açıklama metni, 3 snippet.

**Bütçe (EUR; plan USD ile yazılmıştı, ECB 2026-11-16 kuru 1 € = 1,1014 $ ile aşağı yuvarlandı):**
- Günlük: **TR €4,50 + DE €8,00 = €12,50** (planın $5 + $9 = $14'ü).
- Ay 1 tavanı: **€400** (≈ $440, planın $450 tavanının altında). Google'ın aylık üst sınırı 12,50 × 30,4 = **€380**'dir.
- `us-search-test` **hep kapalı kalır** (€4,50, etiketi `GATED-do-not-enable`).

**Kim ne yapar:** Siz (ya da Mac oturumu, `../RUNBOOK.md`) Google Ads tarafını yaparsınız. Sitedeki takip zaten canlıdır (`docs/ADS_TRACKING.md`).

---

## A. Google Ads hesabını açın (bir kez)

1. https://ads.google.com adresine kendi Google hesabınızla girin.
   - Kampanya sihirbazı açılırsa en alttaki **"Uzman moduna geçin"** (Switch to Expert Mode) bağlantısına tıklayın.
   - Ardından **"Kampanya olmadan hesap oluşturun"** (Create an account without a campaign) seçeneğine tıklayın.
2. Hesap bilgilerini girin:
   - Fatura ülkesi: **Karadağ (Montenegro)** (BLS AI Automation DOO).
   - **Saat dilimi: (GMT+01:00) Podgorica.** Listede Podgorica yoksa aynı kuralı izleyen **Belgrade** ya da **Budapest** seçin (CET/CEST).
   - **Para birimi: Euro (EUR).**
   - Bu iki ayar sonradan **değiştirilemez**. CSV'deki bütçe ve TBM'ler EUR, reklam saatleri Podgorica saatidir.
3. Ödeme yöntemi ve harcama tavanı (bunu **siz** yaparsınız; Mac oturumu ödeme bilgisi girmez):
   - **"Manuel ödemeler" (ön ödeme)** seçeneği varsa onu seçin ve yalnızca **€400** yükleyin. Bu gerçek bir harcama tavanıdır.
   - Bu seçenek yoksa 13. adımdaki hesap bütçesini kullanın.
4. **Faturalandırma → Reklamveren doğrulaması** bölümüne gidin. BLS AI Automation DOO belgeleriyle doğrulamayı başlatın. Doğrulama bitmeden reklamlar sınırlı gösterilebilir.
5. **Yönetici → Hesap ayarları → Otomatik etiketleme: AÇIK** (Admin → Account settings → Auto-tagging).
6. **Öneriler → Otomatik uygula** bölümündeki tüm seçenekleri **KAPALI** yapın.
7. **Search Console bağlantısı:** **Araçlar → Veri yöneticisi → Bağlı ürünler → Search Console → Bağla** (Tools → Data manager → Linked products). dentvideo.com mülkünü seçin. Mülk zaten doğrulanmış (sitede `google-site-verification` meta etiketi var); listede yoksa önce Search Console'da aynı Google hesabının mülke erişimi olduğunu kontrol edin.

## B. İki dönüşüm işlemini oluşturun (ilk tıklamadan ÖNCE)

8. Her iki işlem için aynı yolu izleyin:
   - **Hedefler → Dönüşümler → Özet → + Yeni dönüşüm işlemi**
   - → **İçe aktar** → **"API veya yüklemeler kullanılarak manuel içe aktarma"** (CRM'ler, dosyalar veya diğer veri kaynakları)
   - → **"Tıklamalardan elde edilen dönüşümleri izleyin"** → Devam.
   - Ad, **harfi harfine** aşağıdaki gibi olmalıdır (küçük harf, alt çizgi). `/admin/ads` CSV'si bu adları kullanır.

| Ayar | `dv_signup` | `dv_paid` |
|---|---|---|
| Hedef / kategori | Kaydolma (Sign-up) | Satın alma (Purchase) |
| Değer | "Her dönüşüm için **aynı** değeri kullan": **5 USD** | "Her dönüşüm için **farklı** değerler kullan", varsayılan **150 USD** |
| Para birimi | USD (hesap EUR olsa da; Google çevirir) | USD |
| Sayım (Count) | **Bir (One)** | **Bir (One)** |
| Tıklama sonrası dönüşüm dönemi | **90 gün** | **90 gün** |
| İşlem optimizasyonu | **Birincil (Primary)** | **Birincil (Primary)** |
| İlişkilendirme | Varsayılan (veriye dayalı) | Varsayılan (veriye dayalı) |

9. Değerler hakkında (`web/src/lib/dentvid/ad-conversions.ts`):
   - `dv_paid` değeri yüklediğiniz dosyadan gelir: TR kliniği **100 USD**, diğerleri **150 USD**. Site bunu kendisi yazar; siz bir şey girmezsiniz.
   - "Potansiyel müşteriler için geliştirilmiş dönüşümler" sorulursa **şimdilik atlayın**.

## C. CSV'leri içe aktarın

10. **Yol 1 (önerilen): Google Ads Editor.**
    - ads.google.com/editor adresinden kurun ve açın.
    - Hesabı ekleyin, ardından **İndir (Get recent changes)** düğmesine basın.
    - **Hesap → İçe aktar → Dosyadan** (Account → Import → From file) menüsünü açın. Dosyaları **bu sırayla** tek tek seçin. Her dosyadan sonra önizlemede sayıları kontrol edin ve **"Değişiklikleri koru" (Keep)** deyin.
    - **Yol 2 (Editor kurulamıyorsa): web toplu yükleme.** **Araçlar → Toplu işlemler → Yüklemeler → +** (Tools → Bulk actions → Uploads). Dosyayı seçin, **Önizle** deyin. Önizlemede hata yoksa **Uygula**; hata varsa o dosyayı uygulamayın ve 12. adımdaki elle yönteme geçin.

| Sıra | Dosya | Önizlemede kontrol edin |
|---|---|---|
| 1 | `1-campaigns.csv` | 3 kampanya, hepsi **Paused**, yalnızca Google Arama, Manuel TBM. Bütçeler (EUR): tr-search-core **4,50**, de-search-core **8,00**, us-search-test 4,50. |
| 2 | `2-locations.csv` | 4 konum: TR = Türkiye, DE = Almanya + Avusturya, US = ABD. |
| 3 | `3-adgroups.csv` | 12 reklam grubu (TR-0…TR-4, DE-0…DE-4, US-1, US-2) ve azami TBM'leri (EUR, en yüksek DE-4 €2,26). |
| 4 | `4-keywords.csv` | 133 anahtar kelime: TR 61, DE 63, US 9. Hepsi Exact veya Phrase; **Broad yok**. |
| 5 | `5-responsive-search-ads.csv` | 20 reklam: TR 9, DE 9, US 2. Kırmızı hata yok. Fiyat satırları: "Aylık 1.490 TL'den Başlar", "Ab 49 € im Monat", "From $49 a Month". |
| 6 | `6-negatives-campaign-adgroup.csv` | 102 negatif: 86 kampanya düzeyi, 16 reklam grubu düzeyi. |
| 7 | `7a-shared-negative-lists.csv` | 3 liste: NEG-ALL 37, NEG-TR 76, NEG-DE 57 kelime. |
| 8 | `7b-shared-list-campaign-links.csv` | 5 bağlantı: NEG-ALL → 3 kampanya, NEG-TR → tr-search-core, NEG-DE → de-search-core. |
| 9 | `8a-sitelinks.csv` | 18 site bağlantısı (kampanya başına 6): örnek videolar, reklam kontrolü, karşılaştırma sayfaları, rehberler, yardım merkezi. |
| 10 | `8b-callouts.csv` | 23 açıklama metni. |
| 11 | `8c-structured-snippets.csv` | 3 snippet ("Services" başlığı). |

11. Bir dosya ya da sütun kabul edilmezse, o kısmı **elle** yapın. En olası olanlar 7a/7b, 8a–8c ve "Ad Schedule", "EU political ads", "Labels" sütunlarıdır. Kalan dosyalara devam edin.
12. Elle yapma yolları:
   - **Negatif listeler (7a/7b):**
     - Web arayüzünde **Araçlar → Paylaşılan kitaplık → Hariç tutma listeleri → Negatif anahtar kelime listeleri → +** yolunu izleyin.
     - `NEG-ALL`, `NEG-TR` ve `NEG-DE` adlı üç liste açın. Her birine `negative-lists-paste/NEG-ALL.txt`, `negative-lists-paste/NEG-TR.txt` ve `negative-lists-paste/NEG-DE.txt` dosyalarının içeriğini olduğu gibi yapıştırın (tırnaklar sıralı eşleme demektir).
     - Sonra listeleri kampanyalara uygulayın: NEG-ALL → 3 kampanya, NEG-TR → tr-search-core, NEG-DE → de-search-core.
   - **Site bağlantısı, açıklama metni ve snippet (8a–8c):**
     - Web arayüzünde **Kampanya → Öğeler (Assets) → +** yolunu izleyin ve CSV'deki metinleri birebir kopyalayın.
     - Snippet başlığı TR için "Hizmetler", DE için "Leistungen" olur. Dili kampanyanın diliyle seçin.
   - **Reklam programı (hesap saati = Podgorica):**
     - tr-search-core: her gün **05:00–21:00** (İstanbul'da kışın 07:00–23:00, yazın 06:00–22:00).
     - de-search-core: her gün **07:00–22:00** (Almanya/Avusturya ile aynı saat).
     - us-search-test: program yok.
   - **AB siyasi reklam beyanı:** her kampanyada "AB siyasi reklamı içermiyor" seçin.
   - **Etiket:** us-search-test'e `GATED-do-not-enable` etiketi koyun (isteğe bağlı ama önerilir).
13. Editor'da **Gönder (Post)** düğmesine basın. Kampanyalar hesaba duraklatılmış olarak gider. Sonra web arayüzünde her kampanyanın **Ayarlar** sayfasını açın ve şunları doğrulayın:
   - [ ] Durum: **Duraklatıldı**.
   - [ ] Ağlar: yalnızca **Google Arama**. Arama Ağı iş ortakları **kapalı**, Görüntülü Reklam Ağı **kapalı**.
   - [ ] Konum seçeneği: **"Varlık: Hedeflenen konumlarınızda bulunan veya bu konumlarda düzenli olarak bulunan kişiler"**.
   - [ ] Diller: TR = Türkçe + İngilizce, DE = Almanca + İngilizce.
   - [ ] Teklif: **Manuel TBM**.
   - [ ] **AI Max, geniş eşleme ve otomatik oluşturulan öğeler: KAPALI.**
   - [ ] Nihai URL son eki dolu ve `utm_campaign=` değeri kampanya adıyla aynı.
   - [ ] **Bitiş tarihi:** açacağınız günden **28 gün sonrası** (tr-search-core ve de-search-core). Açılış günü belli olunca girin.
   - [ ] Harcama tavanı: ön ödeme yoksa **Faturalandırma → Hesap bütçeleri → Yeni** yolundan **€400** girin, bitiş = 28 gün sonra.

## D. Açmadan önce son kontroller

14. **Reklam durumu:** Reklamveren doğrulaması tamamlanmış olmalı. Hiçbir reklam **"Onaylanmadı" (Disapproved)** durumunda olmamalı ("İnceleniyor" sorun değil).
15. **Keyword Planner (Araçlar → Anahtar Kelime Planlayıcı):** TR ve DE anahtar kelimelerinin "sayfa üstü teklifi (düşük aralık)" değerine bakın (hesap para birimi EUR).
   - Bu değer bizim azami TBM'mizden düşükse, o reklam grubunun TBM'sini o değere indirin.
   - Hacmi "–" olan kelimeleri duraklatın.
   - TBM'yi asla yükseltmeyin.
16. **Sayfalardaki para birimi:** Türkiye'den `https://dentvideo.com/tr` ve `https://dentvideo.com/videos/dentvideo-mu-ajans-mi` **1.490 TL** göstermeli; Almanya/Avusturya'dan (ya da VPN ile) `https://dentvideo.com/de` ve `https://dentvideo.com/videos/dentvideo-oder-canva-zahnarztpraxis` **49 €** göstermeli. Dolar görünüyorsa açmayın, bize haber verin.
17. **Gerçek ödeme testi (TR kartı)** — isteğe bağlı ama önerilir, yalnızca siz yaparsınız.
   1. Gizli pencerede şu adresi açın: `https://dentvideo.com/tr/examples?gclid=TEST-TR&utm_source=google&utm_medium=cpc&utm_campaign=tr-search-core`
   2. "Başla" ile, sizin kontrol ettiğiniz yeni bir e-posta adresiyle hesap açın (şirket alan adı ya da `qa+…` olmayan bir adres; bunlar dahili sayılır ve tıklama kaydetmez, `docs/ADS_TRACKING.md` §7). Klinik ülkesi **Türkiye** olsun.
   3. Kartınızın **internet / yurt dışı alışverişe açık** olduğundan emin olun.
   4. Starter planı seçin. Dodo ödeme sayfası **1.490 TL** (varsa + KDV) göstermeli. **Dolar görünüyorsa ödemeyin, bize haber verin.**
   5. Ödeyin, ardından şunları kontrol edin:
      - `dentvideo.com/admin/ads` sayfasında `TEST-TR` için **dv_signup 5** ve **dv_paid 100** satırları görünüyor.
      - `dentvideo.com/admin/funnel` → Sources tablosunda `google / cpc / tr-search-core` satırında 1 kayıt ve 1 ödeme var.
18. **Gerçek ödeme testi (DE kartı).** 17. adımı aynı şekilde tekrarlayın, şu farklarla:
   - Adres: `https://dentvideo.com/de/examples?gclid=TEST-DE&utm_source=google&utm_medium=cpc&utm_campaign=de-search-core`
   - Yeni bir e-posta adresi kullanın. Klinik ülkesi **Almanya** olsun. Almanya dışından açıyorsanız izin istemi görünür; **Kabul** deyin.
   - Dodo **49 € + MwSt** göstermeli.
   - `/admin/ads` sayfasında **dv_signup 5** ve **dv_paid 150** görünmeli.
19. **Testleri geri alın:**
   - Her iki aboneliği iptal edin.
   - Dodo panelinden iki ödemeyi **iade edin**.
   - İki test hesabını **Ayarlar**'dan silin. Bu, `TEST-…` satırlarını da siler.
   - **TEST satırlarını asla Google'a yüklemeyin.**
20. Paralelde, ödeme yapmayan mevcut kayıtlarla neden ödemediklerini konuşun. Bu en ucuz pazar araştırmasıdır ve 1. haftayla aynı anda yapılabilir.

## E. Açma sırası ve ilk hafta rutini

21. Kampanyaları şu sırayla açın (yalnızca siz; Mac oturumu açmaz):
   1. 13. adımdaki bitiş tarihi ve €400 tavanı ayarlı olmalı.
   2. **tr-search-core → Etkin.**
   3. **de-search-core → Etkin.**
   4. **us-search-test KAPALI kalır.** Yalnızca TR veya DE'de tıklama→ödeme oranı ≥ %1,5 olursa **ve** Keyword Planner en az 10 ABD tam eşleme terimini sayfa üstü teklif ≤ €1,36 ($1,50) ile gösterirse açılır. Bu kararı bizimle verin.
22. **Her kontrol günü yapılacaklar** (1.–7. gün her gün, sonra haftada 3 kez):
   - **Kampanya → Anahtar kelimeler → Arama terimleri** raporunu açın.
     - Hasta, öğrenci, iş arayan, avukat, çocuk/çizgi film ya da başka meslek aramalarını seçin.
     - **"Negatif anahtar kelime olarak ekle" → kampanya düzeyi, sıralı eşleme** olarak ekleyin.
   - Onaylanmayan reklam var mı, bakın.
   - Teklifleri **değiştirmeyin**.
23. **1. gün (akşam):**
   - Gösterim ve tıklama başlamış mı, bakın.
   - Harcama günlük bütçenin 2 katını geçmemeli.
   - `dentvideo.com/admin/funnel` → Sources tablosunda `google / cpc / tr-search-core` ve `de-search-core` ziyaretçileri görünmeli.
24. **3. gün:** Hiç gösterim almayan reklam grubuna Keyword Planner'dan 5 yakın **tam eşleme** kelime ekleyin.
25. **7. gün:** Aşağıdaki kuralları uygulayın. Sonra 10., 14., 21. ve 28. günlerde tekrarlayın.
   - **Veri kaynağı:** Kayıt, önizleme, ödeme sayfası ve ödeme sayılarını **`/admin/funnel` → Sources** tablosundan alın. Harcama ve tıklamaları Google Ads'den alın.
   - **Marka grubunu çıkarın:** TR-0 ve DE-0 reklam gruplarının harcama ve tıklamalarını hesaplardan çıkarın.

| Ölçü (pazar başına, marka hariç) | Kural (EUR; parantezde planın USD değeri) |
|---|---|
| **Kayıt başı maliyet** = harcama ÷ kayıt (Sign-ups) | ≥ 80 tıklamadan sonra **€36'nın ($40) üstündeyse → o kampanyayı duraklatın.** €18–36 arası: devam edin, kötü kelimeleri ayıklayın. |
| **Önizleme tamamlama** = Preview done ÷ Sign-ups | ≥ 10 kayıttan sonra **%50'nin altındaysa** → bütçeyi artırmayın, bize haber verin (kayıt sonrası akış düzeltilecek). |
| **Ödeme sayfası açıldı** = Checkouts | **≥ 10 kayıt ve 0 Checkout → kampanyayı duraklatın**, bize haber verin. |
| Anahtar kelime | TR'de €14 ($15), DE'de €36 ($40) harcadı ve 0 kayıt varsa → kelimeyi duraklatın. |
| Reklam grubu | ≥ €45 ($50) harcadı ve 0 kayıt varsa → grubu duraklatın. |
| Tüm program | **€360 ($400) harcandı ve 0 ödeme varsa → tüm reklamları durdurun.** |

26. **Bütçe dengesi (7. gün veya sonrası):** Şu iki durum birlikte görülürse bütçeyi **TR €6,25 / DE €6,25** yapın:
   - DE günde ortalama €5,50'den az harcıyor ve "Kaybedilen gösterim payı (bütçe)" < %10;
   - TR'de "Kaybedilen gösterim payı (bütçe)" > %30.
   Toplam günlük bütçe **asla €12,50'yi geçmez**.
27. **Teklif artışı (yalnızca 2. haftadan sonra):** TO ≥ %4 ve "Kaybedilen gösterim payı (sıralama)" > %50 olan reklam grubunda TBM'yi **bir kez** %20 artırın. DE-4'te tavan €2,26'dır.

## F. Dönüşüm yükleme (her pazartesi, ~5 dakika; `docs/ADS_TRACKING.md` §4)

28. `dentvideo.com/admin/ads` sayfasını açın (yalnızca yöneticiler; açmak 90 günden eski tıklama verisini de siler) ve **"Download CSV (Google Click ID)"** düğmesine basın. İndirilen bekleyen satırlar "dışa aktarıldı" olarak işaretlenir. "Include already exported" ile yeniden indirmek işaret koymaz.
29. Google Ads'de dosyayı yükleyin:
   - **Hedefler → Dönüşümler → Yüklemeler → + → Kaynak: "Dosya yükle"** yolunu izleyin.
   - İndirdiğiniz dosyayı seçin, **Önizle → Uygula** deyin.
30. iOS satırları varsa **"Download CSV (GBRAID / WBRAID)"** dosyasını da aynı yoldan yükleyin.
   - İlk seferde dosyanın başlığını Yüklemeler → "Şablonları görüntüle" altındaki şablonla karşılaştırın.
   - Fark varsa bize haber verin.
31. Ertesi gün **Yüklemeler** sayfasındaki teşhis (diagnostics) bölümüne bakın. "Dönüşüm işlemi bulunamadı" ya da "tıklama çok eski" hatası varsa bize haber verin.
32. `/admin/ads` sayfasında bekleyen bir **dv_paid** görürseniz pazartesiyi beklemeyin; **aynı gün** yükleyin. Google 90 günden eski tıklamaları kabul etmez.
33. Ayrıntılar `docs/ADS_TRACKING.md` §4'te. Karar kuralları `ads-plan.md` → "Güncelleme 2026-11-16 (3)" ve "Güncelleme 2026-11-15 (2)" bölümlerinde.
