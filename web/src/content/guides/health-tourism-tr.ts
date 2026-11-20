import type { Guide } from "../dentvideo";

// Sağlık turizmi tanıtımı (Türkiye). Kaynak: 2025 tanıtım yönetmeliğinin 8. maddesi,
// metin 2026-11-17'de tam metinden okunarak kontrol edildi. Rakam, ücret ve
// yaptırım tutarı yazılmaz; madde numaraları resmî metne göre verilir.

const RG = { label: "Resmî Gazete: 12 Kasım 2025 tarihli ve 33075 sayılı sayı (Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik)", url: "https://www.resmigazete.gov.tr/eskiler/2025/11/20251112.htm" };
const FULL_TEXT = { label: "Yönetmeliğin tam metni, madde 1–15 (Hukuki Haber yayını; resmî metin Resmî Gazete'dedir)", url: "https://www.hukukihaber.net/saglik-hizmetlerinde-tanitim-ve-bilgilendirme-faaliyetleri-hakkinda-yonetmelik" };
const HEALTHTURKIYE = { label: "HealthTürkiye: Sağlık Bakanlığı'nın uluslararası sağlık turizmi portalı", url: "https://www.healthturkiye.gov.tr/" };
const TDB = { label: "Türk Dişhekimleri Birliği (meslek etiği ve oda duyuruları)", url: "https://www.tdb.org.tr/" };
const KVKK = { label: "Kişisel Verileri Koruma Kurumu: 6698 sayılı Kişisel Verilerin Korunması Kanunu", url: "https://www.kvkk.gov.tr/" };

export const HEALTH_TOURISM_TR: Guide = {
  locale: "tr",
  slug: "saglik-turizmi-dis-klinigi-tanitim-kurallari",
  category: "rules",
  published: "2026-11-17",
  updated: "2026-11-20",
  reviewed: "2026-11-17",
  title: "Sağlık turizmi reklam kuralları: diş klinikleri yurt dışındaki hastalara neyi, nasıl duyurabilir?",
  seoTitle: "Sağlık turizmi reklam kuralları: diş klinikleri",
  seoDescription: "2025 tanıtım yönetmeliğinin 8. maddesi: yetki belgesi, ayrı hesap, Türkçe dışı sponsorlu paylaşım, yurt içi hedeflemenin yasağı ve hasta yorumları.",
  description: "Diş klinikleri için sağlık turizmi tanıtım rehberi: 2025 yönetmeliğinin 8. maddesi, yetki belgesi, yurt dışına yönelik ayrı hesap, sponsorlu paylaşım, hasta yorumları ve kontrol listesi.",
  h1: "Sağlık turizmi reklam kuralları: diş klinikleri yurt dışındaki hastalara neyi duyurabilir?",
  intro:
    "Sağlık turizmi yetki belgesi olan bir diş kliniği, yurt dışına yönelik ayrı bir internet sitesi veya sosyal medya hesabında, Türkçe dışındaki dillerde sponsorlu tanıtım yapabilir; açık rıza belgelenirse hasta yorumlarına yer verebilir ve fiyat duyurabilir. Türkiye'de yaşayanları hedeflemek ise yasaktır. Bu esneklik, 12 Kasım 2025'te yayımlanan tanıtım yönetmeliğinin 8. maddesine dayanır ve yalnızca yetki belgeli kuruluşlara açıktır.",
  sections: [
    {
      heading: "Sağlık turizmi kuralları hangi diş kliniklerine uygulanır?",
      paragraphs: [
        "Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik, Türkiye'deki bütün diş hekimleri ve özel sağlık kuruluşları için reklamı yasaklar ve yalnızca kurallara uygun tanıtım ve bilgilendirmeye izin verir. Genel kuralları [diş hekimi reklam yasağı rehberimizde](guide:dis-hekimi-reklam-yasagi) anlattık. Yönetmeliğin 8. maddesi bunlara, uluslararası sağlık turizmi için ayrı bir alan açar.",
        "Bu alan herkese açık değildir. 8. madde, 26 Nisan 2025 tarihli ve 32882 sayılı Resmî Gazete'de yayımlanan Uluslararası Sağlık Turizmi ve Turistin Sağlığı Hakkında Yönetmelik uyarınca Bakanlıkça verilen yetki belgesi kapsamında hizmet sunan sağlık tesislerini ve aracı kuruluşları sayar. Yetki belgesi olmayan bir muayenehane ya da poliklinik, yabancı hastalara hizmet verse bile bu maddedeki esnekliklerden yararlanamaz; onun için yurt içindeki genel kurallar geçerlidir.",
        "Maddenin dördüncü fıkrası da önemlidir: 8. maddenin düzenlemediği her konuda yönetmeliğin diğer hükümleri sağlık turizmi yapan kuruluşlara da uygulanır. Yani kesin sonuç vaadi, üstünlük iddiası, bilimsel olarak kanıtlanmamış yöntemler ve yanıltıcı görseller yurt dışı hesapta da yasaktır. Aykırılıklarda uygulanan idari yaptırımları, sağlık turizmine özgü yetki belgesi iptali dahil, [diş hekimi reklam cezası rehberinde](guide:dis-hekimi-reklam-cezasi) özetledik.",
      ],
    },
    {
      heading: "Yurt dışına yönelik tanıtımda neler yapılabilir?",
      paragraphs: [
        "8. maddenin birinci fıkrası, yetki belgeli bir diş kliniğinin yurt dışına yönelik tanıtımda yapabileceklerini koşullarıyla birlikte sayar. Aşağıdaki özet, maddenin bentlerine dayanır; uygulamadan önce resmî metni okuyun:",
      ],
      table: {
        caption: "Yönetmeliğin 8. maddesine göre yurt dışı tanıtımda izin verilenler ve koşulları",
        columns: ["İzin verilen", "Koşul", "Bent"],
        rows: [
          ["Sponsorlu tanıtım ve bilgilendirme", "Yurt dışına yönelik ayrı bir site veya hesap; sağlık turizmi hizmeti sunulduğunun açıkça belirtilmesi; Türkçe dışındaki resmî dillerde", "8/1-a"],
          ["Sponsorlu görsel içerik", "Hedef kitlenin yurt dışı seçilmesi, otomatik hedef kitle tanımlamalarının kapatılması, Türkçe dışındaki resmî dillerde, genel ahlaka uygunluk", "8/1-d"],
          ["Hasta hikâyeleri, hasta yorumları ve teşekkür ifadeleri", "Yalnızca yurt dışına yönelik site veya hesapta; mahremiyet, hasta hakları ve genel ahlak; hastanın açık rızasının belgelenmesi", "8/1-ç"],
          ["İndirim, kampanya ve rekabetçi fiyat duyuruları", "Yalnızca (a) ve (g) bentleri kapsamındaki, yani yurt dışına yönelik ayrı hesaplardaki tanıtımda", "8/3"],
        ],
        note: "Bu tablo bir özettir; bentlerin tam ifadesi ve istisnaları için Resmî Gazete'deki metne bakın.",
      },
      after: [
        "Bu esneklikler, yurt içi hesapta yasak olan şeylerin büyük bölümünü yurt dışı hesapta mümkün kılar. Ancak hepsi aynı ön koşula bağlıdır: içerik Türkiye'de yaşayan kişilere ulaşmayacak şekilde ayrı bir kanaldan ve yurt dışı hedeflemesiyle yayımlanmalıdır.",
      ],
    },
    {
      heading: "Hangi zorunluluklar ve yasaklar var?",
      paragraphs: ["İzinlerin yanında 8. madde, yetki belgeli kuruluşa bazı yükümlülükler de getirir:"],
      list: [
        "Sağlık turizmi yetki belgesi, kliniğin internet sitesinde veya sosyal medya hesabında yayımlanmalıdır (8/1-b).",
        "Türkiye'de yaşayan kişiler nezdinde talep oluşturmaya yönelik tanıtım yapılamaz; sosyal medyada hedef kitle olarak yurt içi seçilemez ve otomatik hedef kitle tanımlamaları devre dışı bırakılmalıdır (8/1-c).",
        "Sağlık turistlerine yönelik tanıtımda “HealthTürkiye” logosu tüm mecralarda kullanılmalıdır (8/1-e).",
        "İnternet sitesindeki tesis adı, unvanı ve URL adresi, Bakanlıkça verilen ruhsattaki unvan ve sahiplik adıyla uyumlu olmalıdır (8/1-f).",
        "URL'de tescilli bir marka kullanılacaksa tescil belgeleri Bakanlığa bildirilmelidir (8/1-ı).",
        "Türkiye'de uygulanması yasak olan veya uygulama izni bulunmayan işlem ve tedavi yöntemlerine tanıtımda yer verilemez (8/2).",
      ],
      after: [
        "Aracı kuruluşlar için ayrıca kurallar vardır: aracı kuruluş sağlık tesisi izlenimi veremez, protokol yaptığı tesisin hizmeti verdiğini ve kendisinin sağlık tesisi olmadığını belirtmelidir; URL adresi ticari unvanını ya da işletme adını taşımalıdır (8/1-g, ğ, h). Bir aracı kuruluşla çalışıyorsanız, onun sizin adınıza yaptığı paylaşımların da bu çerçevede kalmasını sözleşmeyle güvenceye alın.",
      ],
    },
    {
      heading: "Yurt dışı hesap ile yurt içi hesap arasındaki fark nedir?",
      paragraphs: [
        "Pratikte en sık hata, iki kitleye aynı hesaptan seslenmektir. Yönetmelik, sağlık turizmi esnekliklerini “yurt dışına yönelik ayrı bir sosyal medya platformu veya internet sitesi” şartına bağlar. Kliniğin Türkçe Instagram hesabında İngilizce bir kampanya duyurusu ya da hasta yorumu paylaşmak bu şartı karşılamaz.",
        "Görsel içerik kuralları (7. madde) iki hesapta da geçerlidir: hastanın yazılı ya da elektronik açık rızası (Ek-1 onam formu), paylaşımdan önce görseli görme ve izni her zaman geri çekme hakkı, görsellerde sonradan düzeltme yapılmaması, öncesi ve sonrası görsellerin aynı ortam ve teknik koşullarda çekilmesi ve tarihlerin belirtilmesi. “Her cerrahi veya girişimsel işlemde sonuçlar kişiden kişiye değişiklik gösterebilir” uyarısı, metinde yurt içi tanıtım için zorunlu tutulmuştur; yurt dışı hesapta da aynı uyarının hastanın dilinde yer alması temkinli bir yaklaşımdır.",
      ],
      table: {
        caption: "Aynı içerik, iki hesap: yurt içi ve yurt dışı hesapta durum",
        columns: ["İçerik", "Yurt içi (Türkçe) hesap", "Yetki belgeli yurt dışı hesap"],
        rows: [
          ["Fiyat, indirim veya kampanya", "Yasak (5/1-m)", "Ayrı hesapta mümkün (8/3)"],
          ["Hasta yorumu veya teşekkür mesajı", "Reklam niteliğinde paylaşım yasak (5/1-e)", "Açık rıza belgelenirse mümkün (8/1-ç)"],
          ["Sponsorlu gönderi", "Kural olarak yasak; açılışın ilk ayı gibi sınırlı istisnalar (5/1-i, j)", "Türkçe dışındaki dillerde, yurt dışı hedeflemeyle mümkün (8/1-a, d)"],
          ["Eğitici bilgilendirme videosu", "Serbest, genel ilkelere uygunsa", "Serbest, genel ilkelere uygunsa"],
        ],
      },
    },
    {
      heading: "Hastanın ülkesindeki kurallar da geçerli mi?",
      paragraphs: [
        "Türk yönetmeliği, Türkiye'deki bir kliniğin ne yapabileceğini belirler; reklamın gösterildiği ülkenin kurallarını ortadan kaldırmaz. İngiltere'deki, Almanya'daki ya da Körfez ülkelerindeki bir kişiye gösterilen sponsorlu bir gönderi, o ülkenin sağlık reklamı ve tüketici kurallarıyla da değerlendirilebilir. Örneğin Almanya'da Heilmittelwerbegesetz hasta beyanlarını ve bazı öncesi-sonrası görsellerini sınırlar; İngiltere'de reklamlar CAP Code'a uymalıdır.",
        "Bu yüzden yurt dışı hesaptaki her metni hedef ülkenin gözüyle de okuyun. Ücretsiz [“Bu paylaşım yasak mı?” kontrol aracımızda](checker:) ülke olarak İngiltere, Almanya, ABD, BAE veya Suudi Arabistan'ı seçip İngilizce, Almanca ya da Arapça metninizi yapıştırarak sık kısıtlanan ifadeleri paylaşımdan önce görebilirsiniz. Araç hukuki danışmanlık değildir, özenli bir ön filtredir.",
      ],
    },
    {
      heading: "Yayınlamadan önce kontrol listesi",
      paragraphs: ["Yurt dışına yönelik her paylaşımdan önce bu soruları yanıtlayın; birine bile “hayır” diyorsanız durun:"],
      list: [
        "Kliniğin geçerli bir sağlık turizmi yetki belgesi var mı ve belge site veya hesapta yayımlanıyor mu?",
        "Paylaşım, Türkçe hesaptan ayrı, sağlık turizmi hizmeti sunduğunu açıkça belirten bir hesaptan mı yapılıyor?",
        "Metin Türkçe dışındaki bir dilde mi ve reklam ayarlarında hedef kitle yalnızca yurt dışı mı?",
        "Otomatik hedef kitle (genişletme) ayarları kapalı mı?",
        "HealthTürkiye logosu görünüyor mu?",
        "Hasta yorumu veya hikâyesi varsa yazılı açık rıza alındı, belgelendi ve hasta görseli önceden gördü mü?",
        "Görselde sonradan düzeltme yok mu, öncesi ve sonrası aynı koşullarda çekildi ve tarihleri yazılı mı?",
        "Kesin sonuç, “garanti” ya da “en iyi” gibi bir ifade var mı? Varsa çıkarın: bu yasak yurt dışı hesapta da sürer.",
        "Hedef ülkenin kurallarına göre de sorun çıkaracak bir ifade var mı?",
      ],
    },
    {
      heading: "Sağlık turizmi hastaları için hangi içerik en çok işe yarar?",
      paragraphs: [
        "Yurt dışından gelen bir hasta, karar vermeden önce en çok sürece dair sorular sorar: tedavi kaç aşamadan oluşur, aşamalar arasında ne kadar beklenir, kaç gün Türkiye'de kalmak gerekir, dönüşte kontroller nasıl yapılır. Bu soruları vaat içermeyen, olağan süreci anlatan kısa videolarla yanıtlamak, hem yönetmeliğin genel ilkelerine hem de hedef ülkelerin kurallarına en az takılan içeriktir. Tedavi başına konu fikirleri için [hasta bilgilendirme videoları rehberine](guide:hasta-bilgilendirme-videolari) bakın.",
        "[DentVideo](landing:) bu tür eğitici videoları kliniğinizin logosu ve renkleriyle, İngilizce, Almanca ve Arapça dahil on dilde hazırlar; her senaryoyu klinik doğruluk ve sık kısıtlanan reklam ifadeleri için denetler. Videoyu hangi hesapta, hangi hedeflemeyle yayımlayacağınız ve sponsorlu reklam ayarları ise sizin kararınızdır. Yurt içi hesabınız için güvenli konular [Instagram paylaşım fikirleri rehberinde](guide:dis-hekimi-instagram-paylasim-fikirleri).",
      ],
    },
  ],
  faq: [
    { q: "Diş kliniği yabancı hastalara fiyat duyurabilir mi?", a: "Sağlık turizmi yetki belgesi olan klinik, yurt dışına yönelik ayrı site veya hesapta indirim, kampanya ve rekabetçi fiyat duyurusu yapabilir (8. madde, 3. fıkra). Türkçe hesapta ve yurt içinde fiyat bilgisi yasaktır." },
    { q: "Yetki belgem yoksa İngilizce sponsorlu reklam verebilir miyim?", a: "Hayır. 8. maddedeki esneklikler yalnızca Bakanlıkça verilen sağlık turizmi yetki belgesi kapsamında hizmet sunan tesislere ve aracı kuruluşlara tanınır. Belgesi olmayan klinik için yurt içi kurallar geçerlidir." },
    { q: "Yurt dışı hesabımda hasta yorumu paylaşabilir miyim?", a: "Yönetmelik, yurt dışına yönelik site veya hesapta, hastanın açık rızası belgelenmek ve mahremiyete uyulmak şartıyla hasta hikâyelerine, yorumlarına ve teşekkür ifadelerine izin verir. Türkçe hesapta bu tür reklam niteliğindeki paylaşımlar yasaktır." },
    { q: "Türkçe reklamı yurt dışındaki Türklere gösterebilir miyim?", a: "Yönetmelik sponsorlu tanıtımı açıkça Türkçe hariç diğer resmî dillerle sınırlar. Yurt dışında yaşayan Türkçe konuşan hastalara yönelik sponsorlu içerik bu nedenle risklidir; resmî metne ve odanızın görüşüne başvurun." },
    { q: "HealthTürkiye logosu zorunlu mu?", a: "Evet. Uluslararası sağlık turizmi hizmeti sunan tesis, sağlık turistine yönelik tanıtım ve bilgilendirmede HealthTürkiye logosunu tüm mecralarda kullanmakla yükümlüdür (8/1-e)." },
    { q: "Kurallara uymazsam ne olur?", a: "Tanıtımlar Bakanlık ve il sağlık müdürlüklerince taranır; aykırılıklar il değerlendirme komisyonunda incelenir ve yönetmeliğin ekindeki idari yaptırım formuna göre yaptırım uygulanabilir. Güncel yaptırımlar için resmî metne bakın." },
    { q: "Bu rehber hukuki danışmanlık mıdır?", a: "Hayır. Genel bilgidir; mevzuat değişebilir, yargı kararları ve Bakanlık duyuruları uygulamayı etkileyebilir. Somut kararlar için odanıza, il sağlık müdürlüğüne veya bir sağlık hukukçusuna danışın." },
  ],
  sources: [RG, FULL_TEXT, HEALTHTURKIYE, KVKK, TDB],
};
