import type { Guide } from "../dentvideo";

// Türkiye tanıtım kuralları: üç soru, üç rehber (2026-11-20).
// Tek kaynak 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete'deki yönetmeliğin
// tam metni ve ekleridir; metin 2026-11-20'de resmî sayfadan okunarak kontrol edildi.
// Yaptırım formundaki tutar ve oranlar, resmî metinde yazıldığı gibi yazıyla verilir
// ve tırnak içinde aktarılır; bunun dışında rakam, ücret ve istatistik yazılmaz.

const RG_TEXT = { label: "Resmî Gazete, 12 Kasım 2025, sayı 33075: Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik (tam metin)", url: "https://www.resmigazete.gov.tr/eskiler/2025/11/20251112-2.htm" };
const RG_EK = { label: "Yönetmeliğin ekleri (PDF): Ek-1 Görsel İçerik Kaydetme ve İşleme Onam Formu, Ek-2 İdari Yaptırım Formu, Ek-3 Taahhütname", url: "https://www.resmigazete.gov.tr/eskiler/2025/11/20251112-2-1.pdf" };
const RG_2023 = { label: "Resmî Gazete, 29 Temmuz 2023, sayı 32263 (yürürlükten kaldırılan önceki yönetmelik)", url: "https://www.resmigazete.gov.tr/eskiler/2023/07/20230729-29.htm" };
const TDB = { label: "Türk Dişhekimleri Birliği (meslek etiği, disiplin ve oda duyuruları)", url: "https://www.tdb.org.tr/" };
const KVKK = { label: "Kişisel Verileri Koruma Kurumu: 6698 sayılı Kişisel Verilerin Korunması Kanunu", url: "https://www.kvkk.gov.tr/" };
const ETKILEYICI = {
  label: "Reklam Kurulu: Sosyal Medya Etkileyicileri Tarafından Yapılan Ticari Reklam ve Haksız Ticari Uygulamalar Hakkında Kılavuz (2021; IAB Türkiye'nin yayımladığı kopya)",
  url: "https://iabtr.org/wp-content/uploads/2024/06/Sosyal-Medya-Etkileyicileri-Tarafindan-Yapilan-Ticari-Reklam-ve-Haksiz-Ticari-Uygulamalar-Hakkinda-Kilavuz1062021101250.pdf",
};

const PENALTIES: Guide = {
  locale: "tr",
  slug: "dis-hekimi-reklam-cezasi",
  category: "rules",
  published: "2026-11-20",
  updated: "2026-11-20",
  reviewed: "2026-11-20",
  title: "Diş hekimi reklam cezası: kim denetler, şikâyet nasıl işler, hangi yaptırımlar uygulanır?",
  seoTitle: "Diş hekimi reklam cezası: kim denetler, ne olur?",
  seoDescription: "2025 tanıtım yönetmeliğine göre denetim, il değerlendirme komisyonu, Ek-2 idari yaptırım formu, oda disiplini ve KVKK. Resmî metinden özet.",
  description: "Diş hekimleri ve klinikler için reklam cezası rehberi: tarama ve şikâyet, il değerlendirme komisyonu, Ek-2 idari yaptırım formu, tekrar hâlinde faaliyet durdurma, oda disiplini ve KVKK.",
  h1: "Diş hekimi reklam cezası: kim denetler, hangi yaptırımlar uygulanır?",
  intro:
    "Diş kliniğinin tanıtım kurallarına aykırı bir paylaşımı, il sağlık müdürlüğünün taraması ya da bir şikâyetle tespit edilir ve il değerlendirme komisyonunda karara bağlanır. Sağlık tesisleri için yaptırımlar 2025 tanıtım yönetmeliğinin Ek-2 formunda yazılıdır: ilk tespitte idari para cezası ve otuz gün düzeltme süresi, ikincide artırılmış ceza, üçüncüde poliklinik faaliyetinin bir ya da iki gün durdurulması. Hekim hakkında ayrıca odaya bildirim yapılır.",
  sections: [
    {
      heading: "Reklam cezasını hangi kurum verir?",
      paragraphs: [
        "Türkiye'de sağlık hizmetlerinde tanıtımı Sağlık Bakanlığı düzenler ve denetler. Dayanak, 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete'de yayımlanan Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik'tir. Bu yönetmelik, 29 Temmuz 2023 tarihli ve 32263 sayılı Resmî Gazete'deki aynı adlı yönetmeliği yürürlükten kaldırmıştır; internette hâlâ 2023 metnine dayanan ceza yazıları görebilirsiniz.",
        "Yönetmeliğin 11. maddesine göre basın, sosyal medya ve internet siteleri Sağlık Hizmetleri Genel Müdürlüğü ve il sağlık müdürlükleri tarafından düzenli olarak taranır. Aykırı bir tanıtım Bakanlık talimatı, kurumun kendi tespiti, ihbar ya da şikâyet üzerine denetime alınır. İdari yaptırımı il sağlık müdürlüğü bünyesindeki komisyonun kararı belirler.",
        "Türk Dişhekimleri Birliği ve diş hekimleri odaları bu yönetmelik kapsamında idari para cezası vermez. Ancak yönetmelik, hekim ve diş hekimleri hakkında bağlı oldukları meslek kuruluşuna bildirim yapılmasını öngörür; oda kendi disiplin sürecini ayrıca yürütebilir. Aramalarda görülen “TDB reklam cezası” ifadesi genellikle bu disiplin sürecini anlatır.",
      ],
    },
    {
      heading: "Şikâyetten karara süreç nasıl işler?",
      paragraphs: [
        "Yönetmeliğin 10. ve 11. maddeleri süreci şöyle tarif eder. Adımlar resmî metne dayanır; il uygulamaları ayrıntıda farklılık gösterebilir:",
      ],
      list: [
        "Tespit: tarama, Bakanlık talimatı, kurumun kendi tespiti, ihbar ya da şikâyet.",
        "Denetim: il sağlık müdürlüğü, Özel Sağlık Tesislerinin Denetimi Hakkında Yönetmelik'teki usule göre denetim yapar; işlemler Sağlık Tesisleri Denetim ve İzleme Sistemi'ne girilir.",
        "Dosya: denetim tutanağı, deliller, tarihleri ve internet adresleri (URL) görünen paylaşım örnekleri ile hangi ifadenin hangi hükme aykırı olduğuna dair açıklama komisyona gönderilir.",
        "Komisyon: Sağlıkta Tanıtım ve Bilgilendirme Faaliyetleri İl Değerlendirme Komisyonu yedi üyeden oluşur; sağlık hizmetleri başkanının başkanlığında, kamuda görevli iki uzman hekim, Ticaret İl Müdürlüğü'nden bir temsilci ve ilgisine göre meslek kuruluşundan bir temsilci yer alır.",
        "Karar: dosya, komisyona gönderildiği tarihten itibaren en geç kırk beş gün içinde karara bağlanır.",
      ],
      ordered: true,
      after: [
        "Dosyada paylaşımın tarihi ve adresi istendiği için, eski gönderiler de değerlendirmeye konu olabilir. Kurallar yürürlüğe girmeden önce yayımlanmış ama hâlâ yayında olan paylaşımları gözden geçirmek bu yüzden mantıklıdır.",
      ],
    },
    {
      heading: "Ek-2 idari yaptırım formu ne öngörür?",
      paragraphs: [
        "Yönetmeliğin 12. maddesi, sağlık tesisleri ve sağlık turizmi aracı kuruluşları için 3359 sayılı Sağlık Hizmetleri Temel Kanunu'nun ek 11. maddesine dayanarak Ek-2'deki Tanıtım ve Bilgilendirme Faaliyetleri İdari Yaptırım Formu'nu uygular. Form, hangi maddenin ihlal edildiğine ve kaçıncı tespit olduğuna göre kademelenir. Aşağıdaki tablo formun özetidir; ifadeler resmî metinden aktarılmıştır:",
      ],
      table: {
        caption: "Ek-2: Sağlık tesisleri için kademeli idari yaptırımlar (özet)",
        columns: ["Aykırılık", "1. tespit", "2. tespit", "3. tespit"],
        rows: [
          ["5. madde: tanıtım ve bilgilendirmede temel ilkeler (fiyat, kampanya, yönlendirme, teşekkür paylaşımı, sponsorlu paylaşım gibi)", "“Yüz bin Türk lirasından az olmamak üzere sağlık tesisinin bir önceki aya ait brüt hizmet gelirinin yüzde biri oranında” idari para cezası ve aykırılığın giderilmesi için otuz gün süre", "İdari para cezası “bir kat artırılarak” uygulanır ve on beş gün süre verilir", "Poliklinik faaliyeti iki gün süreyle durdurulur"],
          ["6. madde: mahremiyete saygı (hasta hakları, KVKK, kişisel sağlık verileri)", "Aynı taban; brüt hizmet gelirinin “yüzde biri” oranında ceza ve otuz gün süre", "Ceza bir kat artırılır, on beş gün süre verilir", "Poliklinik faaliyeti bir gün süreyle durdurulur"],
          ["7. madde: görsel içerik kullanımı (onam, öncesi-sonrası, düzeltme, uyarı metni)", "Aynı taban; brüt hizmet gelirinin “yüzde ikisi” oranında ceza ve otuz gün süre", "Ceza bir kat artırılır, on beş gün süre verilir", "Poliklinik faaliyeti iki gün süreyle durdurulur"],
          ["8. madde: uluslararası sağlık turizmi tanıtımı (tesisler)", "Aynı taban; brüt hizmet gelirinin “yüzde ikisi” oranında ceza ve otuz gün süre", "Ceza bir kat artırılır, on beş gün süre verilir", "Poliklinik faaliyeti iki gün durdurulur; dördüncü tespitte sağlık turizmi yetki belgesi iptal edilir"],
        ],
        note: "Kaynak: Resmî Gazete 33075, Ek-2. Formun açıklamasına göre maktu idari para cezaları her takvim yılı başından geçerli olmak üzere Vergi Usul Kanunu'na göre belirlenen yeniden değerleme oranında artırılır; bu yüzden içinde bulunduğunuz yılın taban tutarını güncel duyurulardan kontrol edin.",
      },
      after: [
        "Pratikte en sık karşılaşılan ihlaller (fiyat ve kampanya duyurusu, hasta teşekkürü paylaşımı, sponsorlu öne çıkarma, kesin sonuç vaadi) 5. maddeye girer. Hasta fotoğrafı ve videoları ise 7. maddeye girer ve form bunlar için daha yüksek bir oran öngörür. Ayrıntılar için [öncesi-sonrası ve görsel içerik onam formu rehberine](guide:oncesi-sonrasi-gorsel-icerik-onam-formu) bakın.",
      ],
    },
    {
      heading: "Hekim, muayenehane ve diğer kişiler için hangi hükümler var?",
      paragraphs: [
        "Ek-2 formu “sağlık tesisi” için yazılmıştır. Yönetmeliğin 12. maddesi diğer durumlar için ayrı yollar sayar:",
      ],
      list: [
        "Hekim ve diş hekimleri: madde metnine göre “mesleğini serbest olarak icra etmeyen hekim veya diş hekimlerine” ilgisine göre 1219 sayılı Tababet ve Şuabatı San'atlarının Tarzı İcrasına Dair Kanun'un 27. ve 44. maddeleri uygulanır; ayrıca görev yapılan kamu kurumuna ve bağlı olunan meslek kuruluşuna disiplin değerlendirmesi için bildirim yapılır.",
        "Hekim ve diş hekimi dışındaki sağlık meslek mensupları: 6502 sayılı Tüketicinin Korunması Hakkında Kanun çerçevesinde Reklam Kurulu'nun değerlendirmesi için Ticaret Bakanlığı'na bildirilir.",
        "Yetkisiz, izinsiz ya da ruhsatsız sağlık hizmeti tanıtanlar: Reklam Kurulu'na bildirim ve Cumhuriyet başsavcılığına suç duyurusu.",
        "İnsan sağlığını tehlikeye düşüren içerikler: 5651 sayılı Kanun uyarınca erişimin engellenmesi için başvuru; suç unsuru varsa suç duyurusu.",
        "Mahremiyet ihlalleri: 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 17. ve 18. maddeleri ile Kişisel Sağlık Verileri Hakkında Yönetmelik doğrultusunda işlem yapılır.",
      ],
      after: [
        "Muayenehanenizin ya da çalıştığınız kuruluşun bu bentlerden hangisi kapsamında değerlendirileceği, ruhsat türüne ve çalışma biçiminize bağlıdır. Somut durumunuz için il sağlık müdürlüğünüze ya da odanıza danışın. Ayrıca yönetmeliğin 5. maddesinin ikinci fıkrası, kurallara aykırı tanıtımı yapanlar ile “paylaşanlar”ın aynı derecede sorumlu olduğunu söyler: içeriği bir ajansın ya da çalışanınızın paylaşmış olması sorumluluğu ortadan kaldırmaz.",
      ],
    },
    {
      heading: "Ceza almamak için yayından önce neyi kontrol etmelisiniz?",
      paragraphs: [
        "Komisyon dosyası, hangi ifadenin hangi hükme aykırı olduğunu tek tek gösterir. Aynı mantıkla, her paylaşımı yayından önce cümle cümle okumak en etkili önlemdir. Hangi ifadelerin riskli olduğunu ve yerine ne yazılabileceğini [diş hekimi reklam yasağı rehberinde](guide:dis-hekimi-reklam-yasagi) tablo hâlinde anlattık. Kısa kontrol listesi:",
      ],
      list: [
        "Fiyat, indirim, taksit, kampanya, çekiliş ya da hediye var mı? (5/1-l ve 5/1-m)",
        "Hastayı size yönlendiren bir çağrı ya da başka kliniklerle karşılaştırma var mı? (5/1-c, 5/1-f)",
        "Kesin sonuç vaadi ya da bilimsel olarak kanıtlanmamış bir yöntem var mı? (5/1-ç)",
        "Hasta teşekkürü, yorumu ya da memnuniyet ifadesi var mı? (5/1-e, 7/1-ğ)",
        "Gönderi ücretli olarak öne çıkarılacak mı? (5/1-i, 7/1-j)",
        "Hasta görseli varsa Ek-1 onam formu alındı mı, uyarı metni yazıyor mu? (7. madde)",
        "Web sitenizde son güncelleme tarihi ve editöre ulaşılabilecek iletişim bilgisi yazıyor mu? (5/1-ı)",
      ],
      after: [
        "Kendi yazdığınız bir açıklama metnini ya da web sitesi yazısını ücretsiz [“Bu paylaşım yasak mı?” kontrol aracımıza](checker:) yapıştırırsanız, riskli cümleleri gerekçesiyle ve daha temkinli bir karşılığıyla görürsünüz. Araç bir ön kontroldür; hukuki görüş yerine geçmez.",
      ],
    },
    {
      heading: "Geçmiş paylaşımlar için ne yapılabilir?",
      paragraphs: [
        "Yönetmelik yayımlandığı gün yürürlüğe girmiştir. Hesabınızda bundan önce paylaşılmış kampanya duyuruları, hasta teşekkürleri ya da öncesi-sonrası görseller duruyorsa, bunları arşivlemek ya da kaldırmak sade bir önlemdir. Google işletme profilinizdeki açıklama, web sitenizdeki “hastalarımız ne diyor” bölümü ve sabitlenmiş hikâyeler de aynı kontrolden geçmelidir.",
        "Bir tespit tutanağı ya da komisyon kararı tebliğ edildiyse, verilen süre içinde aykırılığı gidermek formun ilk iki kademesinde açıkça istenir. İtiraz yolları ve süreleri için karar yazısındaki bilgilere ve bir hukukçuya başvurun.",
        "İleriye dönük en güvenli yol, paylaşımların büyük bölümünü hastaların sorduğu sorulara verilen sakin, eğitici yanıtlardan oluşturmaktır. [DentVideo](landing:), kliniğinizin logosu ve renkleriyle her hafta bu türden hasta bilgilendirme videoları hazırlar; her senaryoyu fiyat, kampanya, kesin sonuç vaadi, hasta yorumu ve öncesi-sonrası ifadelerine karşı siz görmeden kontrol eder. Konu fikirleri için [Instagram paylaşım fikirleri rehberine](guide:dis-hekimi-instagram-paylasim-fikirleri) bakabilirsiniz.",
      ],
    },
  ],
  faq: [
    { q: "Diş hekimi reklam cezası ne kadar?", a: "Sağlık tesisleri için Ek-2 formu, ilk tespitte bir önceki ayın brüt hizmet gelirinin yüzde biri (görsel içerik ve sağlık turizmi ihlallerinde yüzde ikisi) oranında, yasal tabanın altında olmamak üzere idari para cezası öngörür. Taban her yıl yeniden değerleme oranıyla artar." },
    { q: "Reklam cezasını TDB mi veriyor?", a: "Hayır. Yönetmelik kapsamındaki idari yaptırımlara il sağlık müdürlüğündeki il değerlendirme komisyonu karar verir. Hekim hakkında meslek kuruluşuna bildirim yapılır; oda kendi disiplin sürecini ayrıca yürütebilir." },
    { q: "Tekrar eden ihlalde ne olur?", a: "İkinci tespitte ceza bir kat artırılır ve on beş gün süre verilir. Üçüncü tespitte poliklinik faaliyeti, ihlalin türüne göre bir ya da iki gün durdurulur. Sağlık turizmi ihlallerinde dördüncü tespitte yetki belgesi iptal edilir." },
    { q: "Bir hasta ya da rakip klinik beni şikâyet edebilir mi?", a: "Evet. Yönetmeliğe göre denetim ihbar ve şikâyet üzerine de başlar. Şikâyet il sağlık müdürlüğünce incelenir ve dosya il değerlendirme komisyonuna gönderilir." },
    { q: "Paylaşımı ajansım yaptıysa sorumlu kim?", a: "Yönetmeliğe göre aykırı tanıtımı yapanlar ile paylaşanlar aynı derecede sorumludur ve görsel içerikli paylaşımlar kurumun ya da hekimin kendisi tarafından yapılmak zorundadır. Ajansın paylaşmış olması kliniğin sorumluluğunu kaldırmaz." },
    { q: "Eski paylaşımlarım da sorun olur mu?", a: "Komisyon dosyasında paylaşımın tarihi ve adresi yer alır; yayında kalan içerik değerlendirilebilir. Kampanya, hasta teşekkürü ve öncesi-sonrası içeren eski gönderileri gözden geçirmek temkinli bir adımdır." },
    { q: "Bu rehber hukuki danışmanlık mıdır?", a: "Hayır, hukuki görüş değildir. Resmî metnin genel bir özetidir; il uygulamaları, yargı kararları ve yeni düzenlemeler sonucu değiştirebilir. Somut durumlar için odanıza, il sağlık müdürlüğüne ya da bir sağlık hukukçusuna danışın." },
  ],
  sources: [RG_TEXT, RG_EK, RG_2023, TDB, KVKK],
};

const VISUALS: Guide = {
  locale: "tr",
  slug: "oncesi-sonrasi-gorsel-icerik-onam-formu",
  category: "rules",
  published: "2026-11-20",
  updated: "2026-11-20",
  reviewed: "2026-11-20",
  title: "Öncesi-sonrası paylaşımı ve görsel içerik onam formu: diş klinikleri hasta görsellerini nasıl kullanabilir?",
  seoTitle: "Öncesi-sonrası paylaşımı ve görsel içerik onam formu",
  seoDescription: "2025 tanıtım yönetmeliğinin 7. maddesi: Ek-1 onam formu, öncesi-sonrası koşulları, zorunlu uyarı metni, düzeltme yasağı ve etkileşim ayarları.",
  description: "Diş klinikleri için hasta görselleri rehberi: 2025 yönetmeliğinin 7. maddesi, Ek-1 Görsel İçerik Kaydetme ve İşleme Onam Formu, öncesi-sonrası koşulları, uyarı metni ve KVKK.",
  h1: "Öncesi-sonrası paylaşımı ve görsel içerik onam formu",
  intro:
    "Diş klinikleri hasta fotoğrafı ve videosunu, öncesi-sonrası görseller dahil, ancak 2025 tanıtım yönetmeliğinin 7. maddesindeki koşullarla paylaşabilir: hastanın Ek-1 Görsel İçerik Kaydetme ve İşleme Onam Formu ile açık rızası, görseli önceden görme ve izni her zaman geri çekme hakkı, aynı ortam ve teknikte çekim, tarihlerin yazılması, sonradan düzeltme yapılmaması, zorunlu uyarı metni ve sponsorsuz paylaşım.",
  sections: [
    {
      heading: "Öncesi-sonrası paylaşımı yasak mı?",
      paragraphs: [
        "12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete'de yayımlanan Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik, öncesi-sonrası görselleri tümüyle yasaklamaz; 7. maddesinde bunları ayrıntılı koşullara bağlar. Madde, sağlık meslek mensuplarının ve sağlık tesislerinin “sağlığı koruyucu ve geliştirici nitelikteki görsel içerikleri” belirli ilke ve esaslara uygun olarak kullanabileceğini söyler.",
        "Koşullar sıkıdır ve ihlali, yönetmeliğin Ek-2 yaptırım formunda 5. maddeye göre daha yüksek bir oranla cezalandırılır. Ayrıca görselin genel amacı hâlâ bilgilendirme olmalıdır: kliniği ya da hekimi “tanıtım ve bilgilendirme sınırını aşacak şekilde ön plana çıkaran” ve yanıltıcı görüntülere yer verilemez (7/1-a). Bir öncesi-sonrası görseli “sonuç vaadi” gibi kullanılıyorsa, koşulların hepsi yerine gelse bile sorunlu olabilir.",
      ],
    },
    {
      heading: "Görsel içerik onam formu nedir, nasıl alınır?",
      paragraphs: [
        "Hastaya ait görsellerin kullanılabilmesi için hastanın, çocuklarda ve kısıtlılarda veli ya da vasinin açık rızası şarttır (7/1-b). Açık rıza, yönetmeliğin Ek-1'inde yer alan Görsel İçerik Kaydetme ve İşleme Onam Formu ile yazılı ya da elektronik ortamda alınabilir. Form şu bilgileri içerir:",
      ],
      list: [
        "Onamı veren hasta ya da yasal temsilcisi: adı soyadı, T.C. kimlik numarası, tarih ve imza.",
        "Onamı alan taraf: sağlık tesisi, uygulayıcı hekimin adı soyadı, görevi ve unvanı, T.C. kimlik numarası, tarih ve imza.",
        "Hastanın, fotoğraf ve videolarının tanıtım ve bilgilendirme çerçevesinde işlenmesine ve paylaşılmasına “kimliğinin gizli tutulması şartı ile” rıza verdiğine dair beyan.",
        "Açıklamalar: onamın istenildiği zaman geri alınabileceği, formun tedavi sürecine etkisi olmadığı ve sonuçların kişiden kişiye değişebileceği.",
      ],
      after: [
        "Formun yanında yönetmelik başka güvenceler de ister: hasta paylaşılacak görseli önceden görme hakkına sahiptir ve izni herhangi bir şarta bağlı olmadan her zaman geri çekebilir; klinik bu talebi derhal işleme almalıdır (7/1-c). İzin vermeyen hastaya, tanı, tedavi ve alınacak bedelde hiçbir değişiklik olmayacağı bilgisi verilmelidir (7/1-ç). İzin karşılığında hastaya ödeme, indirim ya da hediye verilemez (7/1-d).",
        "Sağlık verisi, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında özel nitelikli kişisel veridir ve yönetmeliğin 6. maddesi KVKK ile Kişisel Sağlık Verileri Hakkında Yönetmelik'e uyumu ayrıca şart koşar. İmzalı formu hasta dosyasında saklayın ve geri çekme talebini kimin, ne kadar sürede işleme alacağını önceden belirleyin.",
      ],
    },
    {
      heading: "Öncesi-sonrası görselleri hangi koşullarla paylaşılabilir?",
      paragraphs: ["7. maddenin bentleri, bir öncesi-sonrası paylaşımında birlikte sağlanması gereken koşulları sayar:"],
      table: {
        caption: "Yönetmeliğin 7. maddesine göre öncesi-sonrası paylaşımında koşullar",
        columns: ["Koşul", "Bent", "Pratikte ne anlama gelir"],
        rows: [
          ["Aynı ortam ve teknik şartlar", "7/1-f", "Öncesi ve sonrası aynı ışık, açı, uzaklık ve kamerayla çekilir; birinde stüdyo ışığı, ötekinde muayene ışığı olmaz."],
          ["Tarihler", "7/1-f", "Görselde işlem tarihi ve görsellerin çekildiği tarihler yazılır."],
          ["Düzeltme yok", "7/1-e", "Sonradan teknolojik değişiklik ya da düzeltme uygulanamaz; filtre, beyazlık ayarı ve rötuş kullanılmaz, yanıltıcı makyaj olmaz."],
          ["Kaynak bilgisi", "7/1-g", "Görselin ilgili hekime ve gerçek bir hastaya mı ait olduğu, yoksa alıntı mı olduğu ve alıntıysa kaynağı belirtilir."],
          ["Zorunlu uyarı", "7/1-k", "Yurt içi tanıtımda kolay okunur biçimde: “Her cerrahi veya girişimsel işlemde sonuçlar kişiden kişiye değişiklik gösterebilir. İşlem öncesinde hekiminizden detaylı görüş almanız önerilir.”"],
          ["İlgisiz görüntü yok", "7/1-ı", "Yapılan işlemle ve işlem yapılan bölgeyle ilgisi olmayan hiçbir görüntü ve ifade görsele eklenmez."],
          ["Sponsorsuz paylaşım", "7/1-j", "Görsel içerik hiçbir mecrada sponsorlu ya da ücret verilerek yayınlatılamaz."],
          ["Paylaşımı kurum yapar", "7/1-i", "Paylaşımı sağlık tesisi ya da hekim kendisi yapar; başkasının paylaşması sorumluluğu kaldırmaz."],
        ],
        note: "Kaynak: Resmî Gazete 33075, madde 7. Koşulların hepsi birlikte aranır; birinin eksik olması paylaşımı aykırı hâle getirebilir.",
      },
    },
    {
      heading: "Hangi görseller hiçbir koşulda paylaşılamaz?",
      paragraphs: [
        "Bazı görseller için yönetmelik koşul değil, açık yasak koyar. Tıbbi müdahale, girişim ya da ameliyat esnasındaki hasta görüntüsü paylaşılamaz (7/1-h). Diş hekimliğinde bu, tedavi sırasında hastanın ağzının ya da yüzünün göründüğü çekimleri kapsar; koltukta işlem yapılırken çekilen videolar bu yüzden risklidir.",
        "Hasta ya da yakınlarının teşekkür veya memnuniyet ifadeleri üzerinden reklam mahiyetinde görsel paylaşım yapılamaz; bu ifadeler başka bir mecrada yapılmış olsa bile (7/1-ğ). Hastanın kliniğe teşekkür ettiği bir video ya da tedavi sonrası çekilen “mutlu hasta” fotoğrafı bu kapsamdadır. Bu konuyu [hasta yorumları ve doktor önerme rehberinde](guide:sosyal-medyada-doktor-onermek-yasak-mi) ayrıca anlattık.",
        "Aynı bent bir yükümlülük daha getirir: “Görsel içeriklere ait paylaşımların yorum, beğeni ve yeniden paylaşım gibi kullanıcı etkileşimlerine kapatılması zorunludur.” Cümle teşekkür paylaşımlarını düzenleyen bendin içindedir; bunun yalnızca hasta görsellerini mi yoksa tüm görsel paylaşımları mı kapsadığı konusunda farklı okumalar mümkündür. Temkinli yaklaşım, hasta görseli içeren her paylaşımda platformun izin verdiği ölçüde yorumları kapatmak, beğeni sayısını gizlemek ve yeniden paylaşımı devre dışı bırakmaktır. Tereddüt ettiğiniz durumlarda odanıza danışın.",
      ],
    },
    {
      heading: "Hasta görseli olmadan ne paylaşılabilir?",
      paragraphs: [
        "Onam, saklama, geri çekme ve uyarı metni yükü düşünüldüğünde, birçok klinik için hasta görseli kullanmamak daha sade bir yoldur. Hastaların karar vermeden önce asıl sorduğu şey sonucun fotoğrafı değil, sürecin kendisidir: tedavi kaç aşamadan oluşur, ne hissedilir, sonrasında nelere dikkat edilir. Bu soruların yanıtı hasta görüntüsü gerektirmez.",
        "[DentVideo](landing:) tam olarak bu türden videolar hazırlar: hastaların sorduğu sorulara kliniğinizin logosu ve renkleriyle, Türkçe seslendirme ve altyazıyla yanıt veren kısa hasta bilgilendirme videoları. Videolarda hasta görüntüsü ya da hasta verisi kullanılmaz ve senaryolar öncesi-sonrası vaadine, kesin sonuç ifadelerine ve hasta yorumlarına karşı siz görmeden kontrol edilir. Kendi yazdığınız bir açıklama metnini paylaşmadan önce ücretsiz [“Bu paylaşım yasak mı?” kontrol aracımıza](checker:) yapıştırabilirsiniz. Tedaviye göre konu fikirleri [hasta bilgilendirme videoları rehberinde](guide:hasta-bilgilendirme-videolari).",
      ],
    },
  ],
  faq: [
    { q: "Diş kliniği öncesi-sonrası fotoğrafı paylaşabilir mi?", a: "Evet, ancak 7. maddedeki koşulların hepsiyle: Ek-1 formuyla açık rıza, aynı ortam ve teknikte çekim, tarihler, sonradan düzeltme yapılmaması, kaynak bilgisi, zorunlu uyarı metni ve sponsorsuz paylaşım. Tek bir koşulun eksikliği paylaşımı aykırı hâle getirebilir." },
    { q: "Görsel içerik onam formunu nereden bulabilirim?", a: "Form, 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete'de yayımlanan yönetmeliğin Ek-1'idir ve eklerin PDF dosyasında yer alır. Yazılı ya da elektronik ortamda alınabilir." },
    { q: "Hasta onamını geri çekerse ne yapmalıyım?", a: "Yönetmeliğe göre hasta izni herhangi bir şarta bağlı olmadan her zaman geri çekebilir ve klinik talebi derhal işleme almakla yükümlüdür. Görseli yayımladığınız her yerden kaldırın ve işlemi kayda geçirin." },
    { q: "Filtre ya da beyazlık ayarı kullanabilir miyim?", a: "Hayır. Görsel içerikler üzerinde sonradan teknolojik değişiklik veya düzeltme uygulanamaz ve yanıltıcı makyaj olmadan görüntüleme zorunludur (7/1-e)." },
    { q: "Hasta görseli içeren gönderide yorumları kapatmak zorunlu mu?", a: "Yönetmelik görsel içerik paylaşımlarının yorum, beğeni ve yeniden paylaşım gibi etkileşimlere kapatılmasını zorunlu tutar. Kapsamı yoruma açık olsa da hasta görseli içeren paylaşımlarda bu ayarları kapatmak temkinli yoldur." },
    { q: "Onam karşılığında hastaya indirim yapabilir miyim?", a: "Hayır. Görsel kullanım izni karşılığında hastaya ödeme ya da indirim yapılamaz, hediye verilemez (7/1-d)." },
    { q: "Bu rehber hukuki danışmanlık mıdır?", a: "Hayır, hukuki görüş değildir. Yönetmeliğin genel bir özetidir ve uygulama yoruma açıktır. Somut durumlar için odanıza, il sağlık müdürlüğüne ya da bir sağlık hukukçusuna danışın." },
  ],
  sources: [RG_TEXT, RG_EK, KVKK, TDB],
};

const REVIEWS: Guide = {
  locale: "tr",
  slug: "sosyal-medyada-doktor-onermek-yasak-mi",
  category: "rules",
  published: "2026-11-20",
  updated: "2026-11-20",
  reviewed: "2026-11-20",
  title: "Sosyal medyada doktor önermek yasak mı? Diş klinikleri için hasta yorumları, teşekkürler ve etiketler",
  seoTitle: "Sosyal medyada doktor önermek yasak mı?",
  seoDescription: "Hasta teşekkürleri, yorumlar, etiketli hikâyeler ve Google yorumları: 2025 tanıtım yönetmeliğine göre diş kliniklerinin paylaşabilecekleri.",
  description: "Diş klinikleri için hasta yorumu rehberi: teşekkür mesajları, etiketli hikâyeler, Google yorumları ve fenomen önerileri 2025 tanıtım yönetmeliğine ve Reklam Kurulu kılavuzuna göre.",
  h1: "Sosyal medyada doktor önermek yasak mı?",
  intro:
    "Bir hastanın kendi hesabından memnun kaldığı diş hekimini anması, 2025 tanıtım yönetmeliğinin doğrudan düzenlediği bir durum değildir; yönetmelik sağlık meslek mensuplarını ve sağlık kuruluşlarını kapsar. Klinik ise hasta ve yakınlarının teşekkür ya da memnuniyet ifadeleri üzerinden reklam niteliğinde paylaşım yapamaz; bu ifadeler başka bir mecrada yazılmış olsa bile. Paylaşan da yapan kadar sorumludur. Fenomenlerin diş hekimlerine yönlendirme yapması ise Reklam Kurulu kılavuzuyla yasaktır.",
  sections: [
    {
      heading: "Yönetmelik kimi kapsar, hastayı kapsar mı?",
      paragraphs: [
        "Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik'in 2. maddesine göre kapsam; sağlık meslek mensupları, özel sağlık kuruluşları ve uluslararası sağlık turizmi aracı kuruluşlarınca yapılan tanıtım ve bilgilendirmedir. Hekim, diş hekimi ve klinik kapsamdadır; kendi deneyimini kendi hesabında anlatan bir hasta ise bu tanımın içinde sayılmaz.",
        "Ancak klinik açısından asıl soru, hastanın ne yazdığı değil, kliniğin bununla ne yaptığıdır. Yönetmeliğin 5/1-e bendi, basın, sosyal medya ve internet sitelerinde hasta veya yakınlarının teşekkür veya memnuniyet ifadeleri üzerinden reklam mahiyetinde paylaşım yapılamayacağını söyler. 7/1-ğ bendi görseller için aynı kuralı “başka mecralarda yapılmış olsa dahi” ifadesiyle genişletir. 5. maddenin ikinci fıkrası da kurallara aykırı tanıtımı yapanlar ile paylaşanların aynı derecede sorumlu olduğunu belirtir.",
        "Kısacası: hastanın önerisi hastanındır; klinik onu yeniden yayımladığında, öne çıkardığında ya da karşılığında bir şey sunduğunda kural kliniğe uygulanır. Hastaya önerisi için hediye ya da indirim vermek ayrıca özendirme ve hediye gibi pazarlama faaliyetlerini yasaklayan 5/1-l bendine aykırı düşebilir.",
      ],
    },
    {
      heading: "Klinik hangi hasta paylaşımlarını yeniden yayımlayamaz?",
      paragraphs: ["Uygulamada en sık karşılaşılan durumlar ve temkinli yaklaşım:"],
      table: {
        caption: "Hasta yorumları ve teşekkürler: sık durumlar ve temkinli yaklaşım",
        columns: ["Durum", "Risk", "Temkinli yaklaşım"],
        rows: [
          ["Hasta, hikâyesinde kliniği etiketleyip teşekkür ediyor", "Klinik hesabında yeniden paylaşmak, teşekkür ifadesi üzerinden tanıtım sayılabilir (5/1-e, 7/1-ğ)", "Yeniden paylaşmayın; hastaya özel mesajla teşekkür edin"],
          ["Web sitesinde “hastalarımız ne diyor” bölümü", "İnternet siteleri açıkça kapsamdadır (5/1-e)", "Bölümü kaldırın; yerine sık sorulan soruların yanıtlarını koyun"],
          ["Google yorumlarını sitede ya da Instagram'da göstermek", "Memnuniyet ifadeleriyle tanıtım (5/1-e)", "Yorumları kendi kanallarınızda yeniden yayımlamayın"],
          ["Teşekkür mesajının ya da çiçek kartının fotoğrafı", "Başka mecrada yazılmış olsa bile görsel paylaşım sınırlıdır (7/1-ğ)", "Paylaşmayın; mesajı ekiple kendi içinizde paylaşın"],
          ["Yorum ya da etiket karşılığında indirim veya hediye", "Özendirme ve hediye yasağı (5/1-l)", "Hiçbir karşılık sunmayın"],
          ["Hastayla birlikte çekilmiş tedavi sonrası fotoğrafı", "Teşekkür ve memnuniyet görüntüsü; ayrıca onam koşulları (7. madde)", "Paylaşmayın ya da önce [onam formu rehberindeki](guide:oncesi-sonrasi-gorsel-icerik-onam-formu) koşulları değerlendirin"],
        ],
        note: "Bu tablo resmî metnin genel bir okumasıdır; somut durumlar için odanıza ya da il sağlık müdürlüğünüze danışın.",
      },
    },
    {
      heading: "Google yorumlarına nasıl yanıt verilmeli?",
      paragraphs: [
        "Hastaların Google işletme profilinize yazdığı yorumlar onların kendi ifadesidir ve yönetmelik bunları yasaklamaz. Ancak yanıtınız kliniğin bir paylaşımıdır ve iki kurala dikkat etmelidir: tanıtım kuralları ve hasta mahremiyeti.",
        "Sağlık verisi, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında özel nitelikli kişisel veridir ve yönetmeliğin 6. maddesi tanıtım faaliyetlerinde KVKK'ya uyumu şart koşar. Bir yorumu yanıtlarken hastanın sizin hastanız olduğunu doğrulamak, hangi tedaviyi gördüğünü ya da ne zaman geldiğini yazmak, olumlu bir yorumda bile mahremiyet sorunu yaratabilir.",
      ],
      list: [
        "Kısa ve genel yazın: “Değerlendirmeniz için teşekkür ederiz.” gibi.",
        "Tedavi, randevu tarihi, sağlık bilgisi ya da hastanın kimliğini doğrulayan ayrıntı yazmayın.",
        "Olumsuz yorumda tartışmaya girmeyin; hastayı telefonla ya da kliniğe doğrudan ulaşmaya davet edin.",
        "Yanıtta fiyat, kampanya, “en iyisi biziz” türünden üstünlük ya da kesin sonuç ifadesi kullanmayın.",
        "Yorum karşılığında indirim, hediye ya da çekiliş teklif etmeyin.",
      ],
    },
    {
      heading: "Fenomenler ve ünlüler diş hekimi önerebilir mi?",
      paragraphs: [
        "Ticaret Bakanlığı Reklam Kurulu'nun 2021 tarihli Sosyal Medya Etkileyicileri Tarafından Yapılan Ticari Reklam ve Haksız Ticari Uygulamalar Hakkında Kılavuzu, sosyal medya etkileyicisinin “Doktor, diş hekimi, veteriner hekim ve eczacılar ile sağlık kuruluşları tarafından sunulan mal veya hizmetlere yönlendirmede bulunamaz, bu mal veya hizmetlerin tanıtımını yapamaz” hükmünü içerir. Kılavuz 6502 sayılı Tüketicinin Korunması Hakkında Kanun çerçevesinde hazırlanmıştır; güncel metni ve sonraki değişiklikleri Ticaret Bakanlığı'nın sitesinden kontrol edin.",
        "Klinik açısından bu, bir fenomenle yapılan “ücretsiz tedavi karşılığında paylaşım” türü iş birliklerinin iki taraf için de risk taşıdığı anlamına gelir: fenomen için Reklam Kurulu kılavuzu, klinik için tanıtım yönetmeliğinin örtülü reklam yasağı (5/1) ve yönlendirme yasağı (5/1-f). Ünlü bir hastanın tedavisini kendi isteğiyle anlatması ayrı bir durumdur; ancak klinik bunu yeniden paylaşırsa 5/1-e bendi gündeme gelir. Genel çerçeve için [diş hekimi reklam yasağı rehberine](guide:dis-hekimi-reklam-yasagi) bakın.",
      ],
    },
    {
      heading: "Sağlık turizmi hesabında hasta yorumu paylaşılabilir mi?",
      paragraphs: [
        "Burada istisna vardır. Yönetmeliğin 8/1-ç bendine göre sağlık turizmi yetki belgesi olan bir tesis, yurt dışına yönelik ayrı internet sitesi ya da sosyal medya hesabında, hasta mahremiyetine ve hasta haklarına uymak ve açık rızayı belgelemek şartıyla hasta hikâyelerine, yorumlarına ve teşekkür ifadelerine yer verebilir. Bu istisna Türkçe hesap için geçerli değildir. Koşullar [sağlık turizmi tanıtım kuralları rehberinde](guide:saglik-turizmi-dis-klinigi-tanitim-kurallari).",
      ],
    },
    {
      heading: "Hasta teşekkürü yerine ne paylaşılabilir?",
      paragraphs: [
        "Bir teşekkür paylaşımının yapmaya çalıştığı şey güven oluşturmaktır. Aynı güveni, hastaların sık sorduğu sorulara verilen sakin ve doğru yanıtlar daha güvenli biçimde oluşturur: hasta, kliniğin nasıl konuştuğunu ve bir tedaviyi nasıl anlattığını kendi gözüyle görür. Yönetmeliğin 4. maddesi de tanıtım ve bilgilendirmeyi zaten bu tür “sağlığı koruyucu ve geliştirici nitelikteki bilgiler” üzerine kurar.",
        "[DentVideo](landing:), kliniğinizin logosu ve renkleriyle her hafta bu türden kısa hasta bilgilendirme videoları hazırlar ve her senaryoyu hasta yorumu, teşekkür, fiyat ve kesin sonuç ifadelerine karşı siz görmeden kontrol eder. Kendi yazdığınız bir açıklama metnini ya da Google yanıtını paylaşmadan önce ücretsiz [“Bu paylaşım yasak mı?” kontrol aracımıza](checker:) yapıştırabilirsiniz. Konu fikirleri için [Instagram paylaşım fikirleri rehberine](guide:dis-hekimi-instagram-paylasim-fikirleri) bakın.",
      ],
    },
  ],
  faq: [
    { q: "Sosyal medyada doktor önermek yasak mı?", a: "Hastanın kendi hesabında hekimini anması tanıtım yönetmeliğinin kapsamında değildir. Klinik ve hekimin bu teşekkür ve memnuniyet ifadeleri üzerinden reklam niteliğinde paylaşım yapması ise yasaktır. Fenomenlerin diş hekimlerine yönlendirme yapması Reklam Kurulu kılavuzuyla yasaktır." },
    { q: "Sosyal medyada doktor ismi paylaşmak yasak mı?", a: "Bir hastanın hekiminin adını anması tek başına yönetmeliğin düzenlediği bir durum değildir. Klinik ise kendi tanıtımında hekimlerin unvanı, uzmanlık alanı ve çalışma bilgisi gibi bilgileri verebilir; bunu başkalarının övgüsü üzerinden yapamaz." },
    { q: "Hastanın etiketlediği hikâyeyi yeniden paylaşabilir miyim?", a: "Hikâye bir teşekkür ya da memnuniyet ifadesi içeriyorsa, yeniden paylaşmak 5/1-e ve 7/1-ğ bentleri kapsamında reklam niteliğinde paylaşım sayılabilir. Paylaşan da yapan kadar sorumludur; yeniden paylaşmamak temkinli yoldur." },
    { q: "Hastalardan Google yorumu isteyebilir miyim?", a: "Yönetmelik yorum istemeyi açıkça düzenlemez. Ancak karşılığında indirim, hediye ya da çekiliş sunmak özendirme yasağına aykırı düşebilir ve gelen yorumları kendi kanallarınızda yeniden yayımlamak 5/1-e bendine takılabilir." },
    { q: "Google yorumlarına yanıt verebilir miyim?", a: "Evet, kısa ve genel bir yanıtla. Hastanın tedavisini, randevu tarihini ya da sağlık bilgisini yazmayın; bu KVKK açısından özel nitelikli veri ifşası olabilir. Yanıtta fiyat, kampanya ya da üstünlük iddiası kullanmayın." },
    { q: "Bu rehber hukuki danışmanlık mıdır?", a: "Hayır, hukuki görüş değildir. Resmî metinlerin genel bir okumasıdır ve uygulama yoruma açıktır. Somut durumlar için odanıza, il sağlık müdürlüğüne ya da bir sağlık hukukçusuna danışın." },
  ],
  sources: [RG_TEXT, ETKILEYICI, KVKK, TDB],
};

/** Türkiye tanıtım kuralları: yaptırımlar, görsel içerik ve hasta yorumları. */
export const RULES_TR: Guide[] = [PENALTIES, VISUALS, REVIEWS];
