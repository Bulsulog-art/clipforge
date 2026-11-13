import type { LegalText } from "./types";

/** Türkçe. Çeviridir; İngilizce metin esastır. */
export const TR: LegalText = {
  ui: {
    updated: "Son güncelleme",
    prevails: "Bu bir çeviridir. Bağlayıcı metin {english}dir; farklılık olursa o geçerlidir.",
    englishVersion: "İngilizce metin",
    country: "Karadağ",
    operator: {
      company: "Şirket",
      legalForm: "Hukuki şekil",
      legalFormValue: "Karadağ hukukuna tabi limited şirket",
      office: "Merkez adresi",
      register: "Sicil",
      registerValue: "Merkezi Ticari İşletmeler Sicili (CRPS), Karadağ",
      registrationNumber: "Sicil numarası",
      taxId: "Vergi kimlik numarası (PIB)",
      director: "Müdür (yetkili temsilci)",
      contact: "E-posta",
      brand: "Marka",
      brandValue: "{brand} — ürün: DentVideo",
    },
    table: { provider: "Sağlayıcı", purpose: "Amaç", data: "Veriler", location: "Konum" },
  },

  subprocessors: {
    hostinger: {
      purpose: "dentvideo.com'un, video işleme sunucularının, veritabanımızın, oturum açma ve dosya depolamanın çalıştığı sanal sunucu (açık kaynaklı Supabase yazılımının kendi kurulumumuz).",
      data: "Tüm hizmet verileri: hesap, klinik profili, yüklemeler, videolar, ödeme referansları, kayıtlar (log).",
      location: "Almanya (AB)",
    },
    openai: {
      purpose: "Metinleri yazar ve inceler, yapay seslendirmeyi oluşturur ve kendi transkripsiyon hizmetimiz kullanılamadığında yüklenen kayıtları yazıya döker.",
      data: "Metinlerde kullanılan klinik profili bilgileri, metinler, kayıtların sesi (yazıya dökmek için).",
      location: "ABD",
    },
    resend: {
      purpose: "Hizmet e-postalarını gönderir (doğrulama kodları, “videolarınız hazır”, ödeme bildirimleri).",
      data: "E-posta adresi, klinik adı, e-postanın içeriği.",
      location: "ABD",
    },
    dodo: {
      purpose: "Satıcı (merchant of record) olarak ödeme sayfası, abonelikler, faturalar, vergiler ve iadeler. Ödeme verileri için Dodo Payments bağımsız veri sorumlusudur.",
      data: "E-posta adresi, ad ve fatura bilgileri, ödeme verileri, abonelik durumu.",
      location: "Dodo Payments gizlilik politikasına bakınız",
    },
  },

  docs: {
    terms: {
      title: "Kullanım Koşulları",
      description: "Diş klinikleri için hasta bilgilendirme videosu hizmeti DentVideo'nun kullanım koşulları. İşleten: BLS AI Automation DOO (Bulsu Labs), Podgorica, Karadağ.",
      intro: [
        "Bu koşullar, DentVideo'yu {brand} markasıyla işleten {legalName} (“biz”) ile DentVideo hesabı açan klinik veya hekim (“siz”) arasındaki sözleşmedir. Hesap açarak veya bir plan için ödeme yaparak bu koşulları kabul edersiniz. Bir klinik adına kabul ediyorsanız, o kliniği bağlamaya yetkili olduğunuzu beyan edersiniz.",
        "Koşulları sade bir dille yazdık. Anlaşılmayan bir nokta varsa abone olmadan önce {email} adresine yazın.",
      ],
      sections: [
        { heading: "1. Biz kimiz", blocks: [{ operator: true }] },
        {
          heading: "2. Yalnızca işletmeler için",
          blocks: [
            "DentVideo, diş klinikleri ve diş hekimliği profesyonelleri için bir araçtır. Yalnızca muayenehaneleri adına hareket eden işletmelere ve profesyonellere sunulur; tüketicilere veya hastalara sunulmaz. Kullanarak, ticari veya mesleki faaliyetiniz kapsamında hareket ettiğinizi beyan edersiniz.",
          ],
        },
        {
          heading: "3. Hizmet",
          blocks: [
            "DentVideo, diş klinikleri için kısa, seslendirilmiş ve altyazılı hasta bilgilendirme videoları hazırlar. Her hafta sunduğunuz hizmetlerden konular planlar, metinleri yazar, yapay bir sesle seslendirir, videoları kliniğinizin adı, renkleri ve logosuyla oluşturur ve sağlık tanıtımı ifadeleri ile klinik tutarlılık için otomatik kontroller yapar. Planınız kapsıyorsa, yüklediğiniz kayıtları da altyazılı kısa kliplere dönüştürür.",
            "DentVideo tıbbi cihaz değildir ve tıbbi, hukuki veya mevzuata ilişkin tavsiye vermez.",
          ],
        },
        {
          heading: "4. Yayından önce her şeyi siz onaylarsınız",
          blocks: [
            "DentVideo'nun hazırladığı hiçbir şey otomatik olarak yayınlanmaz ve DentVideo sosyal ağlarda paylaşım yapmaz. Her videoyu onaylayıp indirip paylaşmaya siz karar verirsiniz ve paylaştığınız içeriğin yayıncısı sizsiniz.",
            "Kontrollerimiz bir yardımdır, garanti değildir. Metinler yapay zekâ modelleri tarafından yazılır ve incelenir; hata içerebilir. Yayınlamadan önce her videonun muayenehaneniz için doğru olduğundan ve size uygulanan kurallara (meslek kuruluşunuzun kuralları, sağlık tanıtımı mevzuatı ve platform kuralları) uygun olduğundan emin olmak sizin sorumluluğunuzdadır.",
          ],
        },
        {
          heading: "5. Hesabınız",
          blocks: [
            "Kliniğiniz hakkında doğru bilgi verin ve giriş bilgilerinizi gizli tutun. Hesabınızda olan her şeyden siz sorumlusunuz. Hesabınızı başkasının kullandığını düşünüyorsanız {email} adresine bildirin.",
          ],
        },
        {
          heading: "6. Planlar, fiyatlar ve ödeme",
          blocks: [
            "DentVideo peşin ödenir; ücretsiz deneme yoktur. Ödemeden önce kliniğinizin adı, renkleri ve logosuyla videoların canlı ön izlemesini görürsünüz. Güncel planlar (ABD doları):",
            {
              list: [
                "Starter: aylık {starter}.",
                "Practice: aylık {practice}.",
                "Group (klinik grupları ve çok şubeli muayenehaneler): anlaşmaya göre özel koşullar — iletişim {email}. Group web sitesinden satın alınamaz.",
              ],
            },
            "Ödemeleri, satıcı (merchant of record) ve yetkili yeniden satıcı olarak hareket eden Dodo Payments yürütür: aboneliği size o satar, ödeme aracınızdan tahsil eder, kart ekstrenizde o görünür, geçerli vergileri hesaplayıp tahsil eder ve faturanızı düzenler. Satın alma için Dodo Payments'ın alıcı koşulları da geçerlidir. Kart bilgilerinizin tamamını hiçbir zaman görmeyiz.",
            "Abonelikler iptal edilene kadar her aylık fatura döneminin sonunda otomatik olarak yenilenir. Bir ödeme başarısız olursa, sorun çözülene kadar yeni videoları durdurabiliriz.",
            "Liste fiyatlarını değiştirebiliriz. En az 30 gün önceden e-postayla bildiririz; yeni fiyat yalnızca bu bildirimden sonraki ilk yenilemeden itibaren uygulanır.",
          ],
        },
        {
          heading: "7. İptal ve iadeler",
          blocks: [
            "İstediğiniz zaman iptal edebilirsiniz; iptal, ödediğiniz dönemin sonunda geçerli olur ve o zamana kadar erişiminiz sürer. Başlamış bir dönem için yapılan ödemeler, kanun gerektirmedikçe veya hizmet aksamadıkça kısmen iade edilmez. Ayrıntılar, bu koşulların parçası olan [İade Politikamızda](refunds) yer alır.",
          ],
        },
        {
          heading: "8. İçeriğiniz ve hasta verileri",
          blocks: [
            "Yüklediğiniz her şeyin (logonuz, klinik bilgileriniz ve kayıtlarınız) tüm hakları sizde kalır. Bunları yalnızca DentVideo'yu sizin için çalıştırmak amacıyla saklamamıza ve işlememize, [Gizlilik Politikamızda](privacy) listelenen sağlayıcılara iletmek dahil, izin verirsiniz.",
            "Yüklediklerinizi kullanma hakkınız olduğunu ve bir kayıtta görünen veya konuşan herkesin buna onay verdiğini beyan edersiniz.",
            "DentVideo hasta verisi olmadan çalışacak şekilde tasarlanmıştır. Hasta kayıtları yüklemeyin. Bir kayıtta bir hasta görünüyor veya adı geçiyorsa, o hastanın açık ve belgelenmiş rızası gerekir. Yüklediklerinizdeki kişisel veriler için veri sorumlusu sizsiniz; biz bu koşulların parçası olan [Veri İşleme Sözleşmemiz](dpa) uyarınca veri işleyeniniz olarak hareket ederiz.",
            "DentVideo, ABD'deki HIPAA kapsamında “business associate” olarak hareket edecek şekilde tasarlanmamıştır ve ABD hukukuna göre korunan sağlık bilgilerini saklamak veya işlemek için kullanılmamalıdır.",
          ],
        },
        {
          heading: "9. Size verdiklerimiz",
          blocks: [
            "Kliniğiniz için hazırlanan videoları, metinleri ve altyazıları kliniğinizin iletişiminde kullanabilirsiniz; indirdikleriniz için bu hak iptalden sonra da sürer.",
            "Bazı videolar Pexels lisansıyla kullanılan stok görüntüler ve yapay bir ses içerir. Bunları videoların parçası olarak kullanabilirsiniz, ancak ayrı olarak kullanamazsınız (örneğin görüntüleri çıkarıp satmak).",
            "Yüklediklerinizi veya videolarınızı yapay zekâ modellerini eğitmek için kullanmayız ve kliniğinizin videolarını başka müşterilere göstermeyiz.",
            "DentVideo'nun kendisi (yazılım, tasarım, şablonlar ve marka) bize ait kalır.",
          ],
        },
        {
          heading: "10. Kabul edilebilir kullanım",
          blocks: [
            "DentVideo'yu yanıltıcı, hukuka aykırı veya tedavi sonucu vaat eden içerik üretmek için kullanmayın; hizmeti bozmaya, aşırı yüklemeye, kopyalamaya veya yeniden satmaya ya da başka kliniklerin verilerine erişmeye çalışmayın.",
            "Bu koşulları ihlal eden bir hesabı askıya alabilir veya kapatabiliriz. Mümkün olduğunda önce size haber verir ve sorunu düzeltme fırsatı tanırız.",
          ],
        },
        {
          heading: "11. Erişilebilirlik ve değişiklikler",
          blocks: [
            "Videolarınızı her hafta teslim etmek için çalışırız, ancak hizmetin her zaman erişilebilir veya hatasız olacağını garanti edemeyiz. Haftalık teslim, örneğin sağlayıcılarımızdan birindeki bir kesinti nedeniyle gecikebilir.",
            "DentVideo'yu sürekli geliştiririz ve işleyişini değiştirebiliriz. Planınızın temel bir parçasını kaldırırsak önceden haber veririz ve iptal edebilirsiniz.",
          ],
        },
        {
          heading: "12. Sorumluluk",
          blocks: [
            "Bu koşullardaki hiçbir hüküm, kanunen sınırlandırılamayan sorumluluğu (örneğin kast veya ağır ihmal) sınırlamaz.",
            "Bunun dışında; kâr kaybı, hasta kaybı veya itibar zararı gibi dolaylı zararlardan sorumlu değiliz ve tüm talepler için toplam sorumluluğumuz, talebin doğduğu tarihten önceki 12 ayda bize ödediğiniz tutarla sınırlıdır.",
            "Her videoyu siz onaylayıp yayınladığınız için, yayınladığınız içerikten doğan taleplerden (sağlık tanıtımı kurallarına ilişkin şikâyetler dahil) siz sorumlusunuz.",
          ],
        },
        {
          heading: "13. Sözleşmenin sona ermesi",
          blocks: [
            "Planınızı iptal edip hesabınızı Ayarlar'dan silerek sözleşmeyi sona erdirebilirsiniz. Biz sözleşmeyi 30 gün önceden bildirerek veya 10. madde kapsamında derhal sona erdirebiliriz. Bir hesap silindiğinde verilerini [Gizlilik Politikasında](privacy) anlatıldığı şekilde sileriz.",
          ],
        },
        {
          heading: "14. Koşullardaki değişiklikler",
          blocks: [
            "Bu koşulları güncelleyebiliriz. Önemli değişiklikleri yürürlüğe girmeden en az 30 gün önce e-postayla bildiririz. Sonrasında DentVideo'yu kullanmaya devam ederseniz yeni koşullar geçerli olur; kabul etmiyorsanız yürürlüğe girmeden önce iptal edebilirsiniz.",
          ],
        },
        {
          heading: "15. Uygulanacak hukuk ve yetkili mahkemeler",
          blocks: [
            "Bu koşullara Karadağ hukuku uygulanır ve Podgorica mahkemeleri yetkilidir. Bu, yerleşik olduğunuz ülkenin emredici hukukunun size tanıdığı ve sözleşmeyle kaldırılamayan korumaları ortadan kaldırmaz.",
            "Bu koşulların İngilizce metni esastır. Çeviriler kolaylık içindir; farklılık olursa İngilizce metin geçerlidir.",
          ],
        },
        { heading: "16. İletişim", blocks: ["DentVideo ile ilgili sorular: {email}. Şirketle ilgili konular: {companyEmail}."] },
      ],
    },

    privacy: {
      title: "Gizlilik Politikası",
      description: "DentVideo'nun hangi kişisel verileri neden işlediği, hangi sağlayıcıların aldığı, ne kadar saklandığı ve haklarınız.",
      intro: [
        "Bu politika, bir klinik DentVideo'yu kullandığında veya biri dentvideo.com'u ziyaret ettiğinde {legalName}'nin (“biz”) hangi kişisel verileri işlediğini, nedenini, başka kimlerin aldığını ve ne kadar sakladığımızı açıklar. Türkiye'deki kullanıcılar için bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamındaki aydınlatma metni işlevini de görür.",
        "DentVideo hasta verisi olmadan çalışacak şekilde tasarlanmıştır. Hastalar DentVideo'yu kullanmaz ve kliniklerden bir hastayı rızası olmadan tanınır kılan hiçbir şey yüklememelerini isteriz.",
      ],
      sections: [
        {
          heading: "1. Veri sorumlusu",
          blocks: [
            "Hesap, ödeme ve web sitesi verilerinin veri sorumlusu:",
            { operator: true },
            "Bir kliniğin yüklediği kayıtlar ve diğer içerikler için neyin ve neden yükleneceğine klinik karar verir: klinik veri sorumlusudur, biz bu verileri onun adına [Veri İşleme Sözleşmemiz](dpa) uyarınca işleriz.",
            "Gizlilik soruları ve başvurular: {email}.",
          ],
        },
        {
          heading: "2. Topladığımız veriler",
          blocks: [
            {
              list: [
                "Hesap: e-posta adresiniz ve oturum bilgileriniz (parolanın kendisini değil, özetini saklarız) ve e-posta adresinizin doğrulanıp doğrulanmadığı.",
                "Klinik profili: klinik adı, şehir ve ülke, dil, sunduğunuz tedaviler, üslup, sosyal medya kullanıcı adı, randevu bağlantısı, marka renkleri ve logo.",
                "Yüklediğiniz kayıtlar (kapsayan planlarda): görünen kişinin sesini ve görüntüsünü içeren video ve ses ile bir transkript.",
                "Sizin için hazırladıklarımız: konular, metinler, altyazılar, seslendirme, oluşturulan videolar, kontrol sonuçları ve onaylarınız.",
                "Ödeme: planınız, abonelik durumu, yenileme tarihi ve Dodo Payments abonelik, müşteri ve ödeme referansları. Kart bilgilerini Dodo Payments işler; bize hiç ulaşmaz.",
                "E-postalar: kliniğinize hangi hizmet e-postalarını gönderdiğimiz ve hatırlatmalardan çıkıp çıkmadığınız.",
                "Kullanım olayları: “ana sayfa görüntülendi” veya “plan seçildi” gibi adımların sayfa dili, kampanya etiketleri (utm) ve yönlendiren sitenin alan adıyla tutulan küçük, birinci taraf kaydı. Bu kayıtlar çerez kimliği, IP adresi, tarayıcı bilgisi, ad veya e-posta içermez.",
                "Teknik veriler: IP adresiniz ve istek bilgileri sayfaları sunmak, hizmeti korumak ve kötüye kullanımı sınırlamak için işlenir (kısa ömürlü istek sınırı sayaçları).",
              ],
            },
          ],
        },
        {
          heading: "3. Çerezler ve tarayıcı depolama",
          blocks: [
            "Yalnızca hizmetin ihtiyaç duyduklarını kullanırız: oturum çerezleri, dilinizi hatırlayan bir çerez, kayıtta nereye kadar geldiğinizi hatırlayan bir çerez ve kayıt sırasında kısa ömürlü tarayıcı depolama. Reklam veya üçüncü taraf analiz çerezi kullanmayız.",
          ],
        },
        {
          heading: "4. Amaçlar ve hukuki sebepler",
          blocks: [
            {
              list: [
                "Sizinle sözleşmemiz kapsamında DentVideo'yu sağlamak: videolarınızı hazırlamak, kayıtlarınızı işlemek, kitaplığınızda göstermek ve size e-postayla bilgi vermek (sözleşmenin ifası).",
                "Ödeme almak ve aboneliğinizi yönetmek (sözleşmenin ifası).",
                "Hizmeti güvende tutmak, kötüye kullanımı önlemek ve hataları düzeltmek (meşru menfaat).",
                "Yukarıdaki anonim kullanım olaylarıyla hangi sayfa ve kanalların klinik getirdiğini anlamak (meşru menfaat).",
                "Tamamlanmamış bir kayıt için hatırlatma göndermek; abonelikten çıkma bağlantısıyla durdurabilirsiniz (meşru menfaat).",
                "Muhasebe ve vergi kayıtları gibi hukuki yükümlülükleri yerine getirmek (hukuki yükümlülük).",
              ],
            },
            "Kişisel verileri satmayız, reklam için kullanmayız ve yüklediklerinizi veya videolarınızı yapay zekâ modellerini eğitmek için kullanmayız.",
          ],
        },
        {
          heading: "5. Verileri kimler alır",
          blocks: [
            "Az sayıda sağlayıcıyla çalışırız. Her biri yalnızca görevi için gerekeni alır:",
            { subprocessors: true },
            "Ayrıca genel arama terimlerini (bir tedavi adı ve dil gibi) Google'ın herkese açık arama önerilerinde ve Pexels stok video kitaplığında sorgularız. Bu sorgular kişisel veri içermez. Veritabanı, oturum açma ve dosya depolama, sunucumuzdaki açık kaynaklı Supabase yazılımının kendi kurulumumuzda çalışır; Supabase Inc. verileri almaz.",
          ],
        },
        {
          heading: "6. Yurt dışına aktarım",
          blocks: [
            "Karadağ'da, AB/AEA dışında yerleşiğiz. Bazı sağlayıcılar verileri ABD dahil başka ülkelerde işler. Verilere uygulanan hukuk bu tür bir aktarım için güvence gerektiriyorsa, varsa yeterlilik kararına, yoksa bu sağlayıcılarla sözleşmelerimizdeki standart sözleşme hükümlerine (Birleşik Krallık için UK eki ile) dayanırız. KVKK'ya tabi aktarımlarda KVKK'nın 9. maddesinde öngörülen mekanizmalara uyarız.",
          ],
        },
        {
          heading: "7. Saklama süreleri",
          blocks: [
            {
              list: [
                "Hesap, klinik profili, yüklemeler ve videolar: hesabınız var olduğu sürece. Hesabınızı Ayarlar'dan sildiğinizde dosyalarınızı, videolarınızı, klinik profilinizi ve ödeme referanslarınızı canlı sistemlerimizden hemen sileriz; oturum hesabınızı da, başka bir {brand} uygulaması için kullanmıyorsanız sileriz. Sunucu yedeklerindeki kopyalar, yedekler döndükçe üzerine yazılır; silmeden en geç 30 gün sonra hesabınıza ait DentVideo verisi bizde kalmaz (aşağıdakiler hariç). Silinen hesapları yedekten geri yüklemeyiz.",
                "Kullanım olayları: anonim istatistik olarak kalır; hesabınızı silmek kliniğinizle bağlantılarını kaldırır.",
                "Faturalar ve ödeme kayıtları: satıcı olarak Dodo Payments kendi yasal yükümlülükleri uyarınca, biz de muhasebe ve vergi mevzuatının gerektirdiği ölçüde saklarız.",
                "İstek sınırı sayaçları: dakikalardan saatlere.",
                "Kişiye özel bir demoyla iletişime geçtiğimiz klinikler: demoyu herkese açık işletme bilgilerinden (klinik adı, şehir, ülke, marka rengi ve logo) kendimiz hazırlarız ve klinik kaydolmadıkça en fazla 60 gün saklarız. Bir demonun daha önce silinmesini isterseniz {email} adresine yazın.",
              ],
            },
          ],
        },
        {
          heading: "8. Haklarınız",
          blocks: [
            "Size uygulanan hukuka göre verilerinize erişim, düzeltme, silme, işlemenin kısıtlanması ve taşınabilir bir kopya talep edebilir, meşru menfaate dayanan işlemeye itiraz edebilirsiniz; KVKK'nın 11. maddesindeki haklar da buna dahildir. Hesabınızı Ayarlar'dan kendiniz silebilirsiniz. {email} adresine yazın; bir ay içinde yanıt veririz.",
            "Bir veri koruma otoritesine de şikâyette bulunabilirsiniz: Karadağ'da Kişisel Verilerin Korunması ve Bilgiye Serbest Erişim Ajansı; AB/AEA'da ülkenizdeki otorite; Birleşik Krallık'ta Information Commissioner's Office; Türkiye'de Kişisel Verileri Koruma Kurumu (KVKK).",
            "Karadağ'ın kişisel verilerin korunmasına ilişkin kanununu ve işlememize uygulandıkları ölçüde AB Genel Veri Koruma Tüzüğü'nü (GDPR), UK GDPR'ı ve Türkiye'nin 6698 sayılı Kişisel Verilerin Korunması Kanunu'nu (KVKK) uygularız.",
          ],
        },
        {
          heading: "9. Güvenlik",
          blocks: [
            "Bağlantılar şifrelidir (HTTPS). Her kliniğin verileri veritabanında erişim kurallarıyla ayrılmıştır, dosyalar yalnızca kısa ömürlü imzalı bağlantılarla sunulur ve sunuculara erişim DentVideo'yu işleten kişilerle sınırlıdır. Hiçbir sistem kusursuz güvenli değildir; bir ihlal verilerinizi etkilerse size gecikmeksizin bildiririz.",
          ],
        },
        { heading: "10. Çocuklar", blocks: ["DentVideo bir işletme hizmetidir ve 18 yaşından küçükler için değildir."] },
        {
          heading: "11. Değişiklikler",
          blocks: [
            "Yaptıklarımız değiştiğinde bu politikayı günceller ve yukarıdaki tarihi değiştiririz. Önemli değişiklikleri hesap sahiplerine e-postayla bildiririz.",
          ],
        },
      ],
    },

    refunds: {
      title: "İade Politikası",
      description: "DentVideo aboneliklerinde iptal ve iadelerin nasıl işlediği.",
      intro: ["Bu politika [Kullanım Koşullarımızın](terms) parçasıdır. Kısaca: istediğiniz zaman iptal edin, ödediğiniz dönemin sonuna kadar erişiminiz sürer ve hizmet aksadıysa bunu telafi ederiz."],
      sections: [
        {
          heading: "1. İptal",
          blocks: [
            "İstediğiniz zaman Ayarlar'dan (Ödemeyi yönet) veya {email} adresine yazarak iptal edebilirsiniz. İptal bir sonraki yenilemeyi durdurur; zaten ödediğiniz aylık dönemin sonunda geçerli olur ve o zamana kadar tam erişiminiz sürer. İndirdiğiniz videolar sizde kalır. Hesabınızı silmek de aboneliği hemen iptal eder.",
          ],
        },
        {
          heading: "2. Kısmi dönem iadesi yok",
          blocks: [
            "Başlamış bir aylık dönemin kullanılmayan kısmını, kanun iade gerektirmedikçe veya hizmet aşağıda anlatıldığı gibi aksamadıkça iade etmeyiz. Plan değiştirirseniz, mevcut dönemin kalanı için fark hemen tahsil edilir veya alacak olarak yansıtılır.",
          ],
        },
        {
          heading: "3. Hizmet aksadığında",
          blocks: [
            "Bizden kaynaklanan bir hata nedeniyle bir haftanın videoları teslim edilmediyse veya kullanılamadıysa, 14 gün içinde {email} adresine bildirin. Tercihimize göre o haftanın videolarını yeniden hazırlar veya ödemenizin o döneme düşen kısmını iade ederiz. Sağlayıcılarımızdan birindeki kesintiden kaynaklanan birkaç günlük gecikmeler veya zevk nedeniyle reddettiğiniz videolar aksama sayılmaz.",
          ],
        },
        {
          heading: "4. İadeler nasıl ödenir",
          blocks: [
            "Her DentVideo satın alımında satıcı (merchant of record) Dodo Payments'tır; bu nedenle iadeleri, iade edilen tutar üzerinden tahsil ettiği vergi dahil, orijinal ödeme yöntemine Dodo Payments yapar. Önce bize {email} adresinden yazın; alıcı koşulları uyarınca Dodo Payments'a da başvurabilirsiniz. İadenin bankanızda görünmesi birkaç gün sürebilir.",
          ],
        },
        {
          heading: "5. Yasal haklarınız",
          blocks: [
            "DentVideo işletmelere ve profesyonellere satılır. Emredici hukuk size yine de bir cayma veya iade hakkı tanıyorsa, bu hak bu politikaya ek olarak geçerlidir.",
          ],
        },
      ],
    },

    dpa: {
      title: "Veri İşleme Sözleşmesi",
      description: "GDPR 28. madde kapsamında DentVideo veri işleme sözleşmesi: klinikler için neyi, nasıl işlediğimiz ve alt işleyenler listesi.",
      intro: [
        "Bu Veri İşleme Sözleşmesi (“DPA”), klinik (“veri sorumlusu”) ile {legalName} (“veri işleyen”) arasındaki [Kullanım Koşullarının](terms) parçasıdır. Kliniğin DentVideo'ya koyduğu içerik, veri sorumlusu kliniğin olduğu kişisel veriler içerdiğinde uygulanır. Koşulların kabulüyle kurulur; imza gerekmez. Talep halinde imzalı olarak da sunarız.",
      ],
      sections: [
        { heading: "1. Veri işleyen", blocks: [{ operator: true }] },
        {
          heading: "2. Konu, nitelik ve amaç",
          blocks: [
            "Kliniğin kişisel verilerini yalnızca DentVideo'yu sağlamak için işleriz: yüklemeleri saklamak, kayıtları yazıya dökmek, videoları yazmak, seslendirmek ve oluşturmak, kontrolleri yapmak, sonuçları kliniğin kitaplığında göstermek ve hizmet e-postaları göndermek. İşleme, klinik DentVideo'yu kullandığı sürece ve 9. maddedeki silme süresi boyunca devam eder.",
            {
              list: [
                "İlgili kişiler: kliniğin hekimleri ve çalışanları; kliniğin yüklediği kayıtlarda görünen veya konuşan kişiler; hastalar yalnızca klinik onları tanınır kılan içerik yüklerse.",
                "Veri kategorileri: adlar, e-posta adresleri, görüntü ve ses, transkriptler, klinik profili bilgileri. DentVideo sağlık verisine ihtiyaç duymaz; yalnızca klinik yüklerse işlenir ve bu durumda hukuki sebep ile hastanın açık rızasından klinik sorumludur.",
              ],
            },
          ],
        },
        {
          heading: "3. Talimatlar",
          blocks: [
            "Verileri yalnızca kliniğin belgelenmiş talimatlarıyla (Koşullar, bu DPA ve hizmet ayarlarının kullanımı) işleriz; hukuk aksini gerektirirse, hukuk yasaklamadıkça bunu önce kliniğe bildiririz. Bir talimatın veri koruma hukukuna aykırı olduğunu düşünürsek kliniğe söyleriz.",
          ],
        },
        { heading: "4. Gizlilik", blocks: ["{shortName} bünyesinde verilere erişebilen herkes gizlilik yükümlülüğü altındadır."] },
        {
          heading: "5. Güvenlik önlemleri",
          blocks: [
            {
              list: [
                "Siteye, uygulamaya ve veritabanımıza her bağlantıda aktarım sırasında şifreleme (HTTPS).",
                "Her kliniğin verilerinin veritabanı erişim kurallarıyla ayrılması; bir klinik yalnızca kendi satırlarını ve dosyalarını okuyabilir.",
                "Dosyaların yalnızca kısa ömürlü imzalı bağlantılarla sunulması; yüklemelerin tür ve boyutla sınırlanması.",
                "Sunucu ve sağlayıcı hesaplarına erişimin DentVideo'yu işleten kişilerle sınırlı olması.",
                "Her ücretli işleme adımında istek ve harcama limitleri.",
                "Kliniğin verilerini 9. maddede anlatıldığı şekilde kaldıran, kliniğin kendi yaptığı hesap silme.",
              ],
            },
          ],
        },
        {
          heading: "6. Alt işleyenler",
          blocks: [
            "Klinik, aşağıdaki alt işleyenler için genel yetki verir. Her birine, standart koşullarının izin verdiği ölçüde, bu DPA'dan daha az koruyucu olmayan veri koruma yükümlülükleri yükleriz ve onlardan sorumlu olmaya devam ederiz.",
            { subprocessors: true },
            "Bir alt işleyen eklemeden veya değiştirmeden en az 30 gün önce kliniğe e-postayla bildiririz. Klinik makul veri koruma gerekçeleriyle itiraz eder ve çözüm bulamazsak klinik iptal edebilir; değişiklikten sonraki dönem için peşin ödenmiş ücreti iade ederiz.",
            "Alt işleyen olmayanlar: Supabase, yukarıdaki sunucuda kendimiz çalıştırdığımız açık kaynaklı bir yazılımdır (Supabase Inc. veri almaz). Google arama önerileri ve Pexels stok video kitaplığı yalnızca genel arama terimleri alır, hiçbir zaman kişisel veri almaz. Dodo Payments ödeme verileri için kendi koşullarına göre bağımsız veri sorumlusu olarak hareket eder.",
          ],
        },
        {
          heading: "7. Yurt dışına aktarım",
          blocks: [
            "Karadağ'da, AB/AEA dışında yerleşiğiz ve bazı alt işleyenler verileri ABD'de işler. GDPR, UK GDPR veya uygulanabilir diğer bir hukuk, bize veya bir alt işleyene gönderilen veriler için bir aktarım mekanizması gerektiriyorsa, taraflar varsa yeterlilik kararına, yoksa Avrupa Komisyonu'nun standart sözleşme hükümlerine (sorumlu–işleyen veya işleyen–işleyen modülü, gerektiğinde UK eki ile) dayanır; talep halinde bunları imzalarız.",
          ],
        },
        {
          heading: "8. Destek, ihlaller ve denetimler",
          blocks: [
            {
              list: [
                "Hizmetin izin verdiği ölçüde, ilgili kişilerin başvurularını yanıtlamada kliniğe yardım ederiz (örneğin içerik bulma veya silme).",
                "İşlememizle ilgili olduğunda güvenlik, veri koruma etki değerlendirmeleri ve otoritelerle istişareler konusunda kliniğe yardım ederiz.",
                "Kliniğin verilerini etkileyen bir kişisel veri ihlalini, öğrendikten sonra gecikmeksizin ve elimizdeki bilgilerle kliniğe bildiririz.",
                "Bu DPA'ya uyumu göstermek için gereken bilgileri sağlar; makul bir bildirimle, bir otorite daha fazlasını istemedikçe yılda en fazla bir kez ve masrafı kliniğe ait olmak üzere denetime izin veririz.",
              ],
            },
          ],
        },
        {
          heading: "9. Sonunda silme",
          blocks: [
            "Klinik videolarını her zaman indirebilir. Klinik hesabını sildiğinde verilerini canlı sistemlerimizden hemen sileriz; yedeklerdeki kopyalar döndükçe üzerine yazılır ve hukuk saklamayı gerektirmedikçe en geç 30 gün içinde kliniğe ait hiçbir veri bizde kalmaz.",
          ],
        },
        {
          heading: "10. Hukuk ve öncelik",
          blocks: [
            "Bu DPA, ilgili kişilerin veya otoritelerin GDPR ya da uygulanabilir diğer veri koruma hukuku kapsamındaki haklarını sınırlamaksızın, Koşulların hukukuna ve yetkili mahkemelerine tabidir. Bu DPA, veri korumaya ilişkin konularda Koşullarla çelişirse bu DPA geçerlidir. İngilizce metin esastır.",
          ],
        },
      ],
    },

    imprint: {
      title: "Künye",
      description: "dentvideo.com künyesi: BLS AI Automation DOO, Podgorica, Karadağ — sicil, vergi numarası, müdür ve iletişim.",
      intro: ["dentvideo.com'un sağlayıcısına ilişkin bilgiler (Alman Dijital Hizmetler Kanunu (DDG) § 5 ve AB Elektronik Ticaret Direktifi 5. madde kapsamında)."],
      sections: [
        { heading: "Sağlayıcı", blocks: [{ operator: true }] },
        { heading: "İçerikten sorumlu", blocks: ["{director}, {address}."] },
        {
          heading: "Uyuşmazlık çözümü",
          blocks: [
            "DentVideo işletmelere ve profesyonellere sunulur. Bir tüketici hakem kurulu önündeki uyuşmazlık çözüm süreçlerine katılmakla yükümlü değiliz ve katılmayı taahhüt etmiyoruz.",
          ],
        },
      ],
    },
  },
};
