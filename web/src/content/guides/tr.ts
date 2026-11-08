import type { Guide } from "../dentvideo";

// Türkçe rehberler. Kurallar: yalnızca bugün geçerli olanı anlatın, istatistik
// ve fiyat uydurmayın, mevzuatı temkinli ve kaynaklı aktarın.

const RG = { label: "Resmî Gazete — 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete (Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik)", url: "https://www.resmigazete.gov.tr/" };
const MEVZUAT = { label: "Mevzuat Bilgi Sistemi — yönetmeliklerin güncel metni", url: "https://www.mevzuat.gov.tr/" };
const TDB = { label: "Türk Dişhekimleri Birliği (meslek etiği ve oda duyuruları)", url: "https://www.tdb.org.tr/" };
const KVKK = { label: "Kişisel Verileri Koruma Kurumu — 6698 sayılı Kişisel Verilerin Korunması Kanunu", url: "https://www.kvkk.gov.tr/" };
const SB = { label: "T.C. Sağlık Bakanlığı", url: "https://www.saglik.gov.tr/" };

export const GUIDES_TR: Guide[] = [
  {
    locale: "tr",
    slug: "dis-hekimleri-icin-instagram-videolari",
    topic: "instagram-videos",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Diş hekimleri için Instagram videoları: ne çekilir, nasıl paylaşılır, nelere dikkat edilir",
    description: "Diş klinikleri için Instagram video rehberi: hastaların izlediği konular, Reels formatı, altyazı, paylaşım sıklığı ve 2025 tanıtım yönetmeliğine uygun dil.",
    h1: "Diş hekimleri için Instagram videoları",
    intro:
      "Diş hekimleri için en iyi Instagram videoları, hastaların koltukta sorduğu tek bir soruyu 20–60 saniyede, sade ve temkinli bir dille yanıtlayan dikey, altyazılı kısa videolardır. Haftada bir ila üç video yeterlidir; fiyat, indirim, garanti, “acısız” gibi ifadeler ve hasta teşekkürleri ise Türkiye'deki tanıtım kuralları nedeniyle videoya girmemelidir.",
    sections: [
      {
        heading: "Hastalar neden video izliyor",
        paragraphs: [
          "Hastaların çoğu randevu almadan önce kliniğe ve hekime internetten bakar. Kısa bir video, onları kimin tedavi edeceğini, nasıl konuştuğunu ve bir şeyi nasıl anlattığını gösterir. Tedavi kaygısı yüksek bir alanda bu tanışıklık hissi, randevu kararını çoğu zaman bir fotoğraftan daha fazla etkiler.",
          "Videonun amacı satmak değil, bilgilendirmektir. Bu hem hastanın gerçekten işine yarar hem de Türkiye'de sağlık hizmetlerinde reklamın yasak, bilgilendirmenin serbest olduğu düzenlemeyle uyumludur. Ayrıntılar için [diş hekimi reklam yasağı rehberine](guide:dis-hekimi-reklam-yasagi) bakabilirsiniz.",
        ],
      },
      {
        heading: "Hangi konular işe yarar",
        paragraphs: [
          "En iyi konu listesi zaten elinizde: hastaların her gün sorduğu sorular. Her videoda yalnızca bir soruyu yanıtlayın. Konu bulmakta zorlanırsanız [Instagram paylaşım fikirleri rehberinde](guide:dis-hekimi-instagram-paylasim-fikirleri) bir yıllık liste var.",
        ],
        list: [
          "Diş beyazlatma mineye zarar verir mi?",
          "İmplant tedavisi ne kadar sürer, hangi aşamalardan oluşur?",
          "Kanal tedavisinden sonra nelere dikkat etmeliyim?",
          "Diş eti kanaması ne zaman önemlidir?",
          "Çocuğum ilk kez ne zaman diş hekimine gitmeli?",
          "Şeffaf plak kullanırken nasıl temizlik yapılır?",
          "Diş taşı temizliği dişleri aşındırır mı?",
        ],
        after: [
          "Sadece kliniğinizde gerçekten yaptığınız tedavileri anlatın. Sunmadığınız bir tedaviyi anlatan video, ilgilenen hastayı yanlış yere yönlendirir.",
        ],
      },
      {
        heading: "Reels formatı: ilk saniye, tek fikir, altyazı",
        paragraphs: [
          "Instagram'da kısa videolar dikey (9:16) formatta Reels olarak paylaşılır. Videonun ilk saniyesinde soruyu ekrana yazın ve sesli sorun; izleyici kendini sorunun içinde bulursa kalır. Ardından iki üç sade cümleyle yanıt verin, sonda da “Sorunuz varsa kontrol randevusunda konuşalım” gibi yönlendirmesiz, sakin bir kapanış yapın.",
          "Altyazı ekleyin. Birçok kişi videoyu sesi kapalı izler; altyazı ayrıca işitme güçlüğü olanlar ve Türkçeyi ikinci dil olarak konuşan hastalar için de erişimi artırır. Altyazıyı ekranın alt üçte birine, uygulama simgelerinin altında kalmayacak biçimde yerleştirin.",
        ],
      },
      {
        heading: "Paylaşım sıklığı ve düzen",
        paragraphs: [
          "Düzen, miktardan daha önemlidir. Haftada bir ila üç kısa bilgilendirme videosu çoğu klinik için sürdürülebilir. Aynı gün ve saatlerde paylaşmak hem ekibin işini kolaylaştırır hem de takipçilerin alışkanlık kazanmasını sağlar.",
          "Bir oturumda beş dakika konuşup bunu birkaç kısa klibe bölmek, bir haftayı tek seferde hazırlamanın en pratik yoludur. Telefonla nasıl çekeceğinizi adım adım [diş hekimi video çekimi rehberinde](guide:dis-hekimi-video-cekimi) anlattık.",
        ],
      },
      {
        heading: "Videoya girmemesi gerekenler",
        paragraphs: [
          "Türkiye'de sağlık hizmetlerinde tanıtım, Sağlık Bakanlığı'nın 12 Kasım 2025'te yayımlanan yönetmeliğiyle yeniden düzenlendi. Ayrıntılar yoruma açık olsa da aşağıdakiler sorun yaratma ihtimali en yüksek öğelerdir:",
        ],
        list: [
          "Ücret, indirim, kampanya, taksit ve hediye duyuruları",
          "“Acısız”, “garantili”, “kalıcı”, “ömür boyu” gibi kesin sonuç vaatleri",
          "“En iyi”, “bir numara”, “Türkiye'nin lideri” gibi üstünlük iddiaları ve başka kliniklerle karşılaştırma",
          "Hasta teşekkürleri, memnuniyet yorumları ve “hastamız çok mutlu” türü paylaşımlar",
          "Hastanın kimliğini ortaya koyan görüntüler ve açık rıza alınmamış öncesi-sonrası görselleri",
          "Ücretli öne çıkarma, sponsorlu gönderi ve çekiliş",
        ],
        after: [
          "Güvenli yol, temkinli bir dille bilgilendirmektir: “genellikle”, “çoğu hastada”, “hekiminiz değerlendirir”. Emin olmadığınızda güncel metni ve bağlı olduğunuz diş hekimleri odasının duyurularını kontrol edin.",
        ],
      },
      {
        heading: "Reels, hikâye ve profil: hangi video nerede",
        paragraphs: [
          "Aynı video farklı yerlerde farklı işler görür. Reels, sizi henüz takip etmeyen kişilere ulaşmanın en olası yoludur; bu yüzden soru-cevap videoları için uygundur. Hikâyeler 24 saat sonra kaybolur ve mevcut takipçilerle günlük iletişim içindir: klinikten kısa bir an, bir hatırlatma, bir anket. Profilde sabitlenen videolar ise yeni gelen birinin ilk göreceği şeydir; buraya hekimi tanıtan, ilk muayeneyi anlatan ve en sık sorulan soruyu yanıtlayan üç video koymak iyi bir başlangıçtır.",
          "Öne çıkan hikâyeleri konu başlıklarıyla düzenleyin: “İlk muayene”, “Tedavi sonrası bakım”, “Çocuklar”. Hastalar aradıkları bilgiyi profilinizde birkaç dokunuşla bulabilmelidir.",
        ],
      },
      {
        heading: "Hekim kaydı ve seslendirmeli video birlikte",
        paragraphs: [
          "Her hafta kamera karşısına geçmek çoğu hekim için gerçekçi değildir. İşe yarayan denge şudur: ayda bir iki kez beş dakikalık bir kayıtla kendi sesinizden kısa klipler, aradaki haftalarda ise kliniğin renkleri ve logosuyla hazırlanmış seslendirmeli bilgilendirme videoları. Hastalar hekimi tanır, hesap da hiç sessiz kalmaz.",
        ],
      },
      {
        heading: "Neyin işe yaradığını nasıl anlarsınız",
        paragraphs: [
          "Beğeni sayısı tek başına iyi bir ölçü değildir. Bir bilgilendirme videosunun işe yarayıp yaramadığını anlamak için şu sinyallere bakın: videonun ne kadarının izlendiği, kaydedilme ve paylaşılma sayısı, videonun ardından gelen mesajlar ve hastaların muayenede “videonuzu izledim” demesi. Hangi konuların daha çok izlendiğini her ay not edin ve benzer sorulara ağırlık verin.",
          "Takipçi sayısını büyütmek için çekiliş ya da ücretli öne çıkarma gibi yollara başvurmayın; bunlar tanıtım kurallarıyla çelişebilir. Yavaş ama düzenli büyüyen, gerçek hastalardan oluşan bir takipçi kitlesi klinik için daha değerlidir.",
        ],
      },
      {
        heading: "DentVideo nasıl yardımcı olur",
        paragraphs: [
          "[DentVideo](landing:), kliniğinizin sunduğu tedavilerden ve hastaların sorduğu sorulardan her hafta beş kısa video hazırlar; yazar, seslendirir, logonuz ve renklerinizle altyazılar. Her senaryo klinik doğruluk ve tanıtım kurallarına göre iki kez denetlenir; kendi kaydınızdaki sözleri değiştirmez, dikkat gerektiren yeri gerekçesiyle işaretler. Siz onaylamadan hiçbir şey yayınlanmaz. [İlk haftayı ücretsiz deneyebilirsiniz](start:).",
        ],
      },
    ],
    faq: [
      { q: "Bir diş kliniği Instagram'da ne sıklıkla video paylaşmalı?", a: "Miktardan çok düzen önemlidir. Haftada bir ila üç kısa bilgilendirme videosu çoğu klinik için sürdürülebilir ve hesabı canlı tutar." },
      { q: "Instagram videosu kaç saniye olmalı?", a: "Tek bir soruyu yanıtlamak için çoğu zaman 20–60 saniye yeterlidir. Daha uzun bir konu, her biri tek soruyu yanıtlayan birkaç videoya bölünebilir." },
      { q: "Hasta vakalarını videoda gösterebilir miyim?", a: "Yalnızca hastanın belgelenmiş açık rızasıyla ve kimliği gizlenerek; ayrıca tanıtım yönetmeliği öncesi-sonrası görsellerini sınırlayabilir. Paylaşmadan önce güncel mevzuatı ve odanızın görüşünü kontrol edin." },
      { q: "Videoda hekimin kendisi görünmeli mi?", a: "Mümkünse evet; hastalar kendilerini tedavi edecek kişiye güvenir. Çekim yapamadığınız haftalarda seslendirmeli bilgilendirme videoları iyi bir tamamlayıcıdır." },
      { q: "Instagram videosunu TikTok ve YouTube'da da kullanabilir miyim?", a: "Evet. Dikey, altyazılı kısa bir video Reels, TikTok ve YouTube Shorts için aynı şekilde kullanılabilir; yalnızca açıklama metnini her platforma göre kısaltın." },
      { q: "Instagram videolarına müzik eklemeli miyim?", a: "Bilgilendirme videolarında konuşmanın anlaşılması önceliklidir. Müzik kullanacaksanız alçak sesli ve telif açısından kullanım izni olan bir parça seçin." },
    ],
    sources: [RG, MEVZUAT, TDB],
  },
  {
    locale: "tr",
    slug: "dis-hekimi-reklam-yasagi",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Diş hekimi reklam yasağı: 2025 tanıtım yönetmeliğine göre sosyal medyada neler paylaşılabilir?",
    description: "Diş hekimleri ve klinikler için reklam yasağı rehberi: 2025 Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Yönetmeliği, yasak ifadeler, öncesi-sonrası, KVKK ve kontrol listesi.",
    h1: "Diş hekimi reklam yasağı: sosyal medyada neler paylaşılabilir?",
    intro:
      "Türkiye'de diş hekimleri ve diş klinikleri reklam yapamaz; yalnızca kurallara uygun tanıtım ve bilgilendirme yapabilir. 12 Kasım 2025'te yayımlanan Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik; ücret, indirim, kampanya, hasta teşekkürü, sponsorlu öne çıkarma ve yönlendirici içerikleri sınırlar. Eğitici, temkinli ve hasta mahremiyetine saygılı paylaşımlar ise serbesttir.",
    sections: [
      {
        heading: "Reklam ile bilgilendirme arasındaki fark",
        paragraphs: [
          "Yönetmeliğin temel ayrımı şudur: sağlık hizmetinin açık ya da örtülü reklamı yasaktır, kamuoyunu doğru bilgilendirme ise ilkelere uyulduğu sürece serbesttir. Pratikte bir paylaşımın amacı hastayı bir tedaviye ya da kliniğe yönlendirmek, talep yaratmak veya özendirmekse reklam sayılma riski yüksektir. Amacı bir konuyu anlaşılır kılmaksa bilgilendirme olarak değerlendirilmesi daha olasıdır.",
          "Klinik hesabındaki bir Instagram gönderisi, web sitesi, Google profili ve YouTube kanalı bu kurallara tabidir. Yönetmelik yalnızca kliniği değil, hekimin kişisel hesabından yaptığı mesleki paylaşımları da kapsar.",
        ],
      },
      {
        heading: "2025 yönetmeliği neyi değiştirdi",
        paragraphs: [
          "Sağlık Bakanlığı, 2023 tarihli düzenlemenin yerine 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete'de yeni bir yönetmelik yayımladı. Hukuk bürolarının ve meslek odalarının değerlendirmelerine göre öne çıkan noktalar şunlardır; madde numaraları ve istisnalar için mutlaka resmî metne bakın:",
        ],
        list: [
          "Tanıtım ve bilgilendirmede ücret, indirim, kampanya ve promosyon bilgisine yer verilemez (uluslararası sağlık turizmine ilişkin ayrı hükümler bulunur).",
          "Hasta veya yakınlarının teşekkür ve memnuniyet ifadeleriyle reklam niteliğinde paylaşım yapılamaz.",
          "Ücretli, sponsorlu ya da öne çıkmaya yönelik paylaşım ve arama motoru kayıtları kısıtlanmıştır; sınırlı istisnalar için güncel metne bakın.",
          "Kişilerin rızası olmadan arama, SMS, e-posta ya da sosyal medya mesajıyla tanıtım yapılamaz.",
          "Çekiliş, hediye ve benzeri özendirici pazarlama faaliyetleri yapılamaz.",
          "Denetim il sağlık müdürlükleri ve Bakanlık tarafından yapılır; aykırılıklarda idari yaptırımlar uygulanabilir.",
        ],
      },
      {
        heading: "Sorun yaratan ifadeler ve güvenli karşılıkları",
        paragraphs: [
          "Kesin sonuç vaadi, üstünlük iddiası ve yönlendirme, hem yönetmelik hem meslek etiği açısından en riskli dildir. Aynı bilgiyi temkinli bir dille vermek çoğu zaman mümkündür:",
        ],
        list: [
          "“Acısız implant” yerine: “İşlem lokal anestezi altında yapılır; çoğu hasta sonrasında hafif bir hassasiyet hisseder.”",
          "“Garantili beyazlatma” yerine: “Beyazlatmanın etkisi kişiden kişiye değişir; hekiminiz uygun olup olmadığını değerlendirir.”",
          "“Ömür boyu kalıcı” yerine: “Düzenli bakım ve kontrollerle uzun yıllar kullanılabilir.”",
          "“Şehrin en iyi kliniği” yerine: kliniğin adı, adresi ve sunduğu hizmetler gibi doğrulanabilir bilgiler.",
          "“Bu ay indirimde” yerine: hiçbir fiyat ya da kampanya bilgisi.",
        ],
      },
      {
        heading: "Öncesi-sonrası görselleri ve hasta mahremiyeti",
        paragraphs: [
          "Öncesi-sonrası görselleri konusundaki yorumlar birbirinden farklıdır: bazı değerlendirmeler bu görsellerin reklam niteliği taşıdığını ve yasak olduğunu, bazıları ise hastanın açık rızası, kimliğin gizlenmesi ve “sonuçlar kişiden kişiye değişebilir” uyarısı gibi koşullarla bilgilendirme amaçlı kullanılabileceğini söyler. Bu belirsizlik nedeniyle en güvenli yaklaşım, öncesi-sonrası görsellerini sosyal medyada hiç kullanmamak ya da kullanmadan önce odanızın ve bir hukukçunun görüşünü almaktır.",
          "Ayrıca sağlık verisi, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında özel nitelikli kişisel veridir. Bir hastanın yüzü, sesi, adı ya da ağız içi fotoğrafı paylaşılacaksa amacı açıkça belirten, yazılı ve geri alınabilir bir onam alın; onamı hasta dosyasında saklayın. Görüntüde diğer hastaların, ekranlardaki hasta bilgilerinin ve randevu defterinin görünmediğinden emin olun.",
        ],
      },
      {
        heading: "Yayınlamadan önce kontrol listesi",
        paragraphs: ["Her paylaşımdan önce bu soruları sorun; biri bile “evet” ise metni yeniden yazın:"],
        list: [
          "Metinde ya da görselde fiyat, indirim, taksit, kampanya veya hediye var mı?",
          "Kesin sonuç, garanti, “acısız”, “kalıcı” gibi bir vaat var mı?",
          "Kendimizi başka kliniklerle karşılaştırıyor ya da “en iyi” diyor muyuz?",
          "Hasta yorumu, teşekkür mesajı veya puanı paylaşıyor muyuz?",
          "Hastanın kimliğini ortaya koyan bir görüntü ya da bilgi var mı, yazılı onamı var mı?",
          "Gönderiyi ücretli olarak öne çıkarmayı planlıyor muyuz?",
          "Anlatılan bilgi yaygın klinik bilgiyle uyumlu ve doğru tedaviye mi ait?",
        ],
        ordered: false,
      },
      {
        heading: "Yönetmeliğin dışında kalan diğer kurallar",
        paragraphs: [
          "Tanıtım yönetmeliği tek başına çerçevenin tamamı değildir. Türk Dişhekimleri Birliği'nin meslek etiği kuralları, meslektaşları kötüleyen, hastayı yanıltan ya da mesleğin saygınlığına zarar veren paylaşımları zaten sınırlar. Ağız ve diş sağlığı hizmeti sunan özel sağlık kuruluşlarına ilişkin mevzuat da tabela, ilan ve tanıtım konusunda hükümler içerir.",
          "Bir ünlü ya da sosyal medya fenomeniyle yapılan iş birlikleri ayrıca risklidir: tedaviyi öven bir fenomen paylaşımı örtülü reklam olarak değerlendirilebilir. Ticaret Bakanlığı'nın sosyal medya etkileyicilerine ilişkin ticari reklam düzenlemeleri de bu tür paylaşımlarda reklamın açıkça belirtilmesini ister; sağlıkta ise reklamın kendisi zaten yasaktır.",
        ],
      },
      {
        heading: "DentVideo bu kontrolü nasıl yapar",
        paragraphs: [
          "[DentVideo](landing:), her senaryo ve açıklama metnini bu sık kısıtlanan ifadelere (garanti, acısız, kalıcı, en iyi, fiyat, indirim, öncesi-sonrası vaadi, hasta yorumu) karşı yedi dilde denetler; riskli olanı yeniden yazdırır ya da üretmez. Kendi kaydınızda dikkat gerektiren bir cümle varsa sözlerinizi değiştirmez, gerekçesiyle işaretler. Bu bir hukuki danışmanlık değil, özenli bir filtredir: her videoyu siz onaylarsınız. Ne paylaşabileceğinize dair fikirler için [paylaşım fikirleri rehberine](guide:dis-hekimi-instagram-paylasim-fikirleri), çekim için [Instagram videoları rehberine](guide:dis-hekimleri-icin-instagram-videolari) bakın.",
        ],
      },
    ],
    faq: [
      { q: "Diş hekimleri Instagram'da paylaşım yapabilir mi?", a: "Evet. Reklam yasaktır, ancak doğru, temkinli ve yönlendirme içermeyen bilgilendirme paylaşımları serbesttir. Fiyat, indirim, hasta teşekkürü ve kesin sonuç vaadi içermemelidir." },
      { q: "Klinik web sitesi de bu kurallara tabi mi?", a: "Evet. Yönetmelik internet siteleri ve sosyal paylaşım platformlarını da kapsar. Web sitesinde de fiyat, kampanya, hasta teşekkürü ve sonuç vaadine yer vermeyin." },
      { q: "Diş kliniği fiyat paylaşabilir mi?", a: "2025 yönetmeliğine göre tanıtım ve bilgilendirmede ücret, indirim ve kampanya bilgisine yer verilemez; uluslararası sağlık turizmi için ayrı hükümler vardır. Ayrıntı için güncel metne bakın." },
      { q: "Hasta yorumlarını ya da Google puanlarını paylaşabilir miyim?", a: "Hasta ve yakınlarının teşekkür ve memnuniyet ifadeleriyle reklam niteliğinde paylaşım yapılması yasaklanmıştır. Bu tür içerikleri sosyal medyada paylaşmamak en güvenli yoldur." },
      { q: "Reklam yasağına uymamanın yaptırımı nedir?", a: "Denetim il sağlık müdürlükleri ve Bakanlık tarafından yapılır; aykırılıklarda idari para cezası gibi yaptırımlar uygulanabilir. Güncel yaptırımlar için resmî metne ve odanıza danışın." },
      { q: "Bu rehber hukuki danışmanlık mıdır?", a: "Hayır. Genel bilgidir; mevzuat değişebilir ve yoruma açıktır. Somut durumlar için diş hekimleri odanıza, il sağlık müdürlüğüne ya da bir hukukçuya danışın." },
      { q: "Fenomenlerle iş birliği yapabilir miyim?", a: "Bir fenomenin tedaviyi ya da kliniği öven paylaşımı örtülü reklam sayılabilir. Sağlıkta reklam yasak olduğundan bu tür iş birliklerinden önce hukuki görüş alın." },
    ],
    sources: [RG, MEVZUAT, TDB, KVKK, SB],
  },
  {
    locale: "tr",
    slug: "dis-hekimi-instagram-paylasim-fikirleri",
    topic: "post-ideas",
    category: "ideas",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Diş hekimleri için Instagram paylaşım fikirleri: bir yıllık, yönetmeliğe uygun konu listesi",
    description: "Diş klinikleri için Instagram ve TikTok paylaşım fikirleri: hasta soruları, tedavi açıklamaları, ekip ve klinik tanıtımı, mevsimsel konular ve kaçınılacak içerikler.",
    h1: "Diş hekimleri için Instagram paylaşım fikirleri",
    intro:
      "Diş hekimleri için en güvenli ve en çok izlenen Instagram paylaşımları; hastaların sık sorduğu soruların kısa video yanıtları, tedavilerin adım adım anlatımı, tedavi sonrası bakım ipuçları ve ekibin tanıtımıdır. Fiyat, kampanya, hasta teşekkürü ve sonuç vaadi içeren paylaşımlar ise Türkiye'deki tanıtım kurallarıyla çelişebileceği için listede yer almamalıdır.",
    sections: [
      {
        heading: "Konu seçmenin üç kuralı",
        paragraphs: ["Bir fikrin iyi bir paylaşım olup olmayacağını anlamak için üç soru yeter:"],
        list: [
          "Bir hasta bunu gerçekten soruyor mu? Koltukta, telefonda ya da Google'da sorulan sorular en iyi konulardır.",
          "Bu tedaviyi kliniğimizde yapıyor muyuz? Yalnızca sunduğunuz hizmetleri anlatın.",
          "Bilgilendiriyor mu, yönlendiriyor mu? “Hemen randevu alın, indirimi kaçırmayın” değil; “bu durumda hekiminize danışın”.",
        ],
      },
      {
        heading: "Hasta sorularına kısa yanıtlar",
        paragraphs: [
          "Bu seri hesabınızın omurgası olabilir. Her videoda tek bir soru, 20–60 saniye, temkinli bir yanıt. Google'da “… zararlı mı”, “… ne kadar sürer”, “… sonrası” diye aranan sorular iyi bir başlangıçtır:",
        ],
        list: [
          "Diş beyazlatma zararlı mı?",
          "İmplant ne kadar sürer ve hangi aşamalardan oluşur?",
          "Diş çekiminden sonra ne yenir, ne yenmez?",
          "Kanal tedavisi sonrası ağrı normal mi?",
          "Diş eti çekilmesi geri döner mi?",
          "Gece diş sıkmanın belirtileri nelerdir?",
          "Ağız kokusunun nedenleri nelerdir?",
        ],
      },
      {
        heading: "Tedavi açıklamaları ve bakım ipuçları",
        paragraphs: [
          "Hastaların kaygısı çoğu zaman bilinmezlikten gelir. Bir tedavinin aşamalarını sade bir dille anlatan videolar, randevu öncesi soruları azaltır. Tedavi sonrası bakım videoları ise hastaya eve gittikten sonra da eşlik eder; bu içerikleri [hasta bilgilendirme videoları rehberinde](guide:hasta-bilgilendirme-videolari) ayrıntılı ele aldık.",
        ],
        list: [
          "Kanal tedavisi adım adım: ne olur, ne kadar sürer?",
          "Dolgu sonrası ilk 24 saat",
          "Şeffaf plak temizliği ve saklama",
          "Doğru diş fırçalama tekniği ve diş ipi kullanımı",
          "Çocuklarda süt dişi bakımı ve ilk diş hekimi ziyareti",
          "İmplant sonrası ağız hijyeni",
        ],
      },
      {
        heading: "Klinik ve ekip tanıtımı",
        paragraphs: [
          "İnsanlar kurumlara değil insanlara güvenir. Ekibinizi tanıtan kısa videolar, ilk kez gelecek bir hastanın kaygısını azaltır. Burada da ölçü bilgilendirmedir: “Asistanımız Ayşe, ilk muayenede sizi karşılayıp kayıt işlemlerini anlatıyor” iyi bir örnektir; “Türkiye'nin en deneyimli ekibi” ise üstünlük iddiasıdır.",
        ],
        list: [
          "Hekim tanıtımı: uzmanlık alanı ve çalışma şekli",
          "İlk muayenede neler olur?",
          "Sterilizasyon nasıl yapılır? (hasta görünmeden)",
          "Kliniğe ulaşım, otopark ve erişilebilirlik bilgisi",
          "Engelli ya da kaygılı hastalar için yapılan düzenlemeler",
        ],
      },
      {
        heading: "Mevsimsel ve gündem konuları",
        paragraphs: ["Takvim, konu bulmayı kolaylaştırır. Örneğin:"],
        list: [
          "Ramazan ayında oruçluyken diş bakımı ve ağız kuruluğu",
          "Okulların açılmasında çocuk diş kontrolleri",
          "Bayram tatlıları sonrası şeker ve diş sağlığı",
          "Yaz aylarında spor yaparken ağız koruyucu kullanımı",
          "20 Mart Dünya Ağız Sağlığı Günü",
          "Yılbaşı öncesi yılın son kontrolü hatırlatması (indirim değil)",
        ],
      },
      {
        heading: "Kaçınılacak paylaşımlar",
        paragraphs: [
          "Yaygın sosyal medya önerilerinin bir kısmı Türkiye'de sorun yaratabilir: indirim ve kampanya duyuruları, çekilişler, “hastalarımız ne diyor” paylaşımları, hasta teşekkür mesajlarının ekran görüntüleri, öncesi-sonrası karşılaştırmaları ve ücretli öne çıkarma. Nedenini [diş hekimi reklam yasağı rehberinde](guide:dis-hekimi-reklam-yasagi) açıkladık. Hasta görüntüsü içeren her paylaşım için ayrıca KVKK kapsamında yazılı açık rıza gerekir.",
        ],
      },
      {
        heading: "Açıklama metni ve etiketler",
        paragraphs: [
          "Videonun altındaki metin, videonun söylediğini kısaca tekrar etmeli ve ek bir vaat içermemelidir. İyi bir yapı: soruyu ilk satıra yazın, iki üç cümleyle yanıtı özetleyin, son satırda “Kendi durumunuz için hekiminize danışın” gibi temkinli bir not ekleyin. Klinik adı ve şehir bilgisi bulunabilirlik için yeterlidir.",
          "Etiketlerde konuya ve şehre odaklanın (#dişbeyazlatma, #implant, #ağızsağlığı, #istanbuldişhekimi gibi). Üstünlük iddiası taşıyan etiketlerden (#eniyidişhekimi gibi) ve indirim çağrıştıranlardan kaçının. Beş ile on arasında anlamlı etiket, uzun bir listeden daha işe yarar.",
        ],
      },
      {
        heading: "Soruları nereden bulursunuz",
        paragraphs: [
          "Konu listesi tükendiğinde üç kaynağa bakın. Birincisi ekibiniz: resepsiyon ve asistanlar hastaların telefonda ve koltukta ne sorduğunu en iyi bilen kişilerdir; bir hafta boyunca gelen soruları bir kâğıda not etmelerini isteyin. İkincisi Google: arama kutusuna “implant” ya da “diş beyazlatma” yazıp çıkan önerilere bakın; “… zararlı mı”, “… ne kadar sürer”, “… sonrası” gibi kalıplar hastaların gerçek kaygılarını gösterir. Üçüncüsü kendi hesabınız: videolarınızın altına gelen yorum ve mesajlar bir sonraki videonun konusudur.",
          "Fiyat soruları sık gelir ama video konusu olamaz; bu soruları mesajla, birebir yanıtlayın. Aynı soru birçok kez geliyorsa, fiyatı değil süreci anlatan bir video hazırlayın: tedavinin hangi aşamalardan oluştuğu ve maliyeti nelerin etkilediği.",
        ],
      },
      {
        heading: "Örnek bir ay",
        paragraphs: ["Haftada üç paylaşımla bir ayın nasıl görünebileceğine dair örnek:"],
        list: [
          "1. hafta: “Beyazlatma zararlı mı?” · “Dolgu sonrası ilk 24 saat” · Hekim tanıtımı",
          "2. hafta: “Diş eti kanaması ne zaman önemli?” · “Doğru fırçalama tekniği” · İlk muayenede neler olur",
          "3. hafta: “İmplant ne kadar sürer?” · “Çekim sonrası ne yenir?” · Sterilizasyon nasıl yapılır",
          "4. hafta: “Çocuğum ilk kez ne zaman gelmeli?” · “Gece diş sıkma belirtileri” · Kliniğe ulaşım bilgisi",
        ],
      },
      {
        heading: "Fikirleri haftalık plana dönüştürmek",
        paragraphs: [
          "Basit bir haftalık ritim işinizi kolaylaştırır: pazartesi bir hasta sorusu, çarşamba bir tedavi açıklaması ya da bakım ipucu, cuma ekip veya klinikten bir tanıtım. Haftada üç video fazla geliyorsa bir ya da ikiyle başlayın; düzenli olmak sıklıktan daha önemlidir.",
          "[DentVideo](landing:) bu planı sizin yerinize yapar: kliniğinizin tedavilerinden ve hastaların aradığı sorulardan her hafta beş konu seçer, videoları yazar, seslendirir ve denetler; siz yalnızca onaylarsınız. Kendiniz çekmek isterseniz [telefonla çekim rehberi](guide:dis-hekimi-video-cekimi) yardımcı olur.",
        ],
      },
    ],
    faq: [
      { q: "Diş kliniği Instagram'da ne paylaşmalı?", a: "Hasta sorularının kısa yanıtları, tedavilerin anlaşılır anlatımı, tedavi sonrası bakım ipuçları ve ekip tanıtımı. Tümü bilgilendirici, temkinli ve yönlendirmesiz olmalıdır." },
      { q: "Diş hekimi Instagram'da hasta fotoğrafı paylaşabilir mi?", a: "Ancak hastanın belgelenmiş açık rızasıyla ve tanıtım kurallarına uygun biçimde. Öncesi-sonrası görselleri yönetmelik açısından tartışmalı olduğundan paylaşmadan önce odanıza danışın." },
      { q: "Haftada kaç paylaşım yapılmalı?", a: "Haftada bir ila üç kısa video çoğu klinik için yeterli ve sürdürülebilirdir. Düzen, sıklıktan daha önemlidir." },
      { q: "TikTok için farklı içerik mi gerekir?", a: "Genellikle hayır. Aynı dikey, altyazılı kısa video Instagram Reels, TikTok ve YouTube Shorts'ta kullanılabilir; yalnızca açıklama metnini platforma göre kısaltın." },
      { q: "Bayram ya da özel gün kutlaması paylaşılabilir mi?", a: "Evet, kutlama mesajları bilgilendirme ya da iyi dilek niteliğindedir. Ancak bunlara indirim, kampanya ya da hediye eklemeyin; aksi halde tanıtım kurallarıyla çelişebilir." },
      { q: "Hangi etiketleri kullanmalıyım?", a: "Konu ve şehir odaklı, beş ile on arası anlamlı etiket yeterlidir. “En iyi” gibi üstünlük iddiası taşıyan ya da indirim çağrıştıran etiketlerden kaçının." },
    ],
    sources: [RG, TDB, KVKK],
  },
  {
    locale: "tr",
    slug: "hasta-bilgilendirme-videolari",
    topic: "patient-education",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Diş kliniklerinde hasta bilgilendirme videoları: hangi konular, nerede, nasıl doğru tutulur",
    description: "Diş klinikleri için hasta bilgilendirme videosu rehberi: tedavi öncesi ve sonrası konular, bekleme salonu ve WhatsApp kullanımı, doğruluk ve onam ile ilişkisi.",
    h1: "Diş kliniklerinde hasta bilgilendirme videoları",
    intro:
      "Hasta bilgilendirme videoları, bir tedavinin ne olduğunu, nasıl yapıldığını ve sonrasında nelere dikkat edileceğini 30–90 saniyede sade bir dille anlatan kısa videolardır. Diş kliniklerinde en çok tedavi öncesi kaygıyı azaltmak, tedavi sonrası bakım talimatlarını hatırlatmak ve aynı açıklamayı her hastaya aynı doğrulukta vermek için kullanılırlar.",
    sections: [
      {
        heading: "Bilgilendirme videosu neyi çözer",
        paragraphs: [
          "Muayenede anlatılan bilginin bir kısmı hasta eve döndüğünde unutulur; özellikle kaygılıyken ya da lokal anestezinin etkisi geçmemişken. Kısa bir video, hastanın talimatı istediği zaman yeniden izlemesini sağlar. Ekip için de aynı soruyu gün içinde defalarca yanıtlama yükünü azaltır.",
          "Bilgilendirme videosu, aydınlatılmış onamın yerine geçmez. Onam, hekimle hasta arasındaki yüz yüze görüşme ve imzalı belgeyle alınır; video yalnızca bu görüşmeyi destekleyen, hatırlatan bir araçtır.",
        ],
      },
      {
        heading: "Hangi konulardan başlamalı",
        paragraphs: ["Ekibinizin her gün yanıtladığı sorularla başlayın. Üç zaman dilimi işe yarar:"],
        list: [
          "İlk ziyaretten önce: ilk muayenede neler olur, yanınızda ne getirmelisiniz, röntgen neden çekilir.",
          "Tedaviden önce: kanal tedavisi, implant, diş çekimi, diş taşı temizliği, şeffaf plak tedavisinin aşamaları.",
          "Tedaviden sonra: çekim sonrası bakım, dolgu sonrası yeme-içme, implant sonrası hijyen, beyazlatma sonrası hassasiyet.",
          "Çocuklar ve aileler için: süt dişi bakımı, ilk diş hekimi ziyareti, fissür örtücü ve flor uygulaması.",
        ],
      },
      {
        heading: "Doğru ve güvenilir tutmak",
        paragraphs: [
          "Yaygın klinik bilgide kalın ve sonuçların değişebildiği yerlerde temkinli konuşun: “genellikle”, “çoğu hastada”, “hekiminiz size özel bilgi verir”. Tedavi sonrası talimatları ilgili işleme özel tutun; çekim sonrası doğru olan bir öneri, dolgu sonrası yanlış olabilir.",
          "Videonun altındaki açıklama metni videoyla aynı şeyi söylemeli. Her videoyu yayından önce bir hekim izlemeli; özellikle seslendirmeli ve yazılı içeriklerde tek bir yanlış ifade güveni zedeler. Bu içerikler sosyal medyada paylaşılacaksa tanıtım kuralları da geçerlidir; ayrıntılar [reklam yasağı rehberinde](guide:dis-hekimi-reklam-yasagi).",
        ],
      },
      {
        heading: "Videoları nerede kullanmalı",
        paragraphs: ["Aynı kısa video birçok yerde işe yarar:"],
        list: [
          "Instagram, TikTok ve YouTube Shorts'ta bilgilendirme içeriği olarak",
          "Bekleme salonu ekranında sessiz, altyazılı döngü olarak",
          "Randevu öncesi ve sonrası WhatsApp ya da SMS ile, hastanın onayı olan iletişim kanallarından",
          "Web sitenizin tedavi sayfalarında",
        ],
        after: [
          "Kişisel mesajla gönderim için hastanın iletişim izni olmalı; tanıtım amaçlı toplu mesaj gönderimi rıza olmadan yapılamaz.",
        ],
      },
      {
        heading: "Bir bilgilendirme videosunun senaryo şablonu",
        paragraphs: ["Her video için aynı basit yapıyı kullanmak hem yazmayı hem izlemeyi kolaylaştırır:"],
        list: [
          "Soru (ilk 3 saniye): “Diş çekiminden sonra ne zaman yemek yiyebilirim?”",
          "Kısa yanıt (1 cümle): “Genellikle uyuşukluk geçtikten sonra, ılık ve yumuşak yiyeceklerle.”",
          "Neden (1–2 cümle): Pıhtının yerinde kalmasının iyileşme için neden önemli olduğu.",
          "Ne yapmalı (2–3 madde): İlk gün sıcak içeceklerden, pipetten ve sigaradan kaçınmak gibi işleme özel öneriler.",
          "Ne zaman aramalı (1 cümle): “Kanama ya da ağrı artarsa kliniğimizi arayın.”",
          "Kapanış: “Size özel talimatları hekiminiz verir.”",
        ],
        ordered: true,
        after: [
          "Bu şablon, videonun hem kısa hem de klinik olarak eksiksiz olmasını sağlar. “Ne zaman aramalı” kısmı özellikle tedavi sonrası videolarda önemlidir: hasta neyin normal, neyin değil olduğunu bilmelidir.",
        ],
      },
      {
        heading: "Ekip içinde kim ne yapar",
        paragraphs: [
          "Bilgilendirme videolarının işe yaraması için ekibin onları kullanması gerekir. Resepsiyon, randevu hatırlatmasıyla birlikte ilgili “ilk muayene” videosunu gönderebilir; asistan, tedavi bittikten sonra hastaya bakım videosunun bağlantısını verebilir; hekim, muayenede “bunu anlatan kısa bir videomuz var” diyerek hastanın evde tekrar izlemesini önerebilir. Hangi videonun hangi tedaviden sonra gönderileceğini basit bir tabloyla ekiple paylaşın.",
          "Videolar eskidiğinde ya da klinik protokolünüz değiştiğinde güncelleyin. Yılda bir kez tüm bilgilendirme videolarını gözden geçirmek iyi bir alışkanlıktır. Hastalardan gelen “videoda anlamadığım bir yer vardı” geri bildirimleri, hangi videonun yeniden yazılması gerektiğini gösteren en değerli işarettir.",
        ],
      },
      {
        heading: "Erişilebilirlik ve farklı dillerde hastalar",
        paragraphs: [
          "Altyazı, işitme güçlüğü olan hastalar için olduğu kadar gürültülü ortamda izleyenler için de gereklidir. Kısa cümleler, günlük dil ve tıbbi terimin hemen yanında sade karşılığı (“periodontitis, yani ileri diş eti hastalığı”) anlaşılırlığı artırır.",
          "Kliniğinize farklı dillerde konuşan hastalar ya da yurt dışından gelen hastalar geliyorsa en sık sorulan birkaç konuyu İngilizce, Almanca ya da Arapça gibi dillerde de hazırlamak, muayenedeki iletişimi kolaylaştırır. Sağlık turizmine yönelik tanıtım ayrıca farklı hükümlere tabi olabileceğinden bu içeriklerde de güncel mevzuatı kontrol edin.",
        ],
      },
      {
        heading: "Hekim mi anlatmalı, seslendirme mi",
        paragraphs: [
          "Hastalar kendilerini tedavi edecek kişiye güvenir; bu nedenle hekimin kendisinin anlattığı videolar en etkili olanlardır. Ancak her hafta çekim yapmak gerçekçi değildir. İyi bir denge: en sık sorulan birkaç konuyu hekimin kendisi anlatsın, geri kalanı seslendirmeli bilgilendirme videolarıyla tamamlansın. Telefonla kendi videonuzu çekmek için [video çekimi rehberine](guide:dis-hekimi-video-cekimi) bakın.",
        ],
      },
      {
        heading: "DentVideo nasıl yardımcı olur",
        paragraphs: [
          "[DentVideo](landing:), sunduğunuz tedavilerden her hafta beş konu planlar; bilgilendirme videolarını sizin dilinizde yazar, seslendirir ve altyazılar, her birini klinik doğruluk ve tanıtım kurallarına göre denetler. Son onay sizdedir; onayladığınız videoları açıklama metniyle indirir, sosyal medyada, bekleme salonunda ya da hasta mesajlarında kullanırsınız. Konu fikirleri için [paylaşım fikirleri rehberine](guide:dis-hekimi-instagram-paylasim-fikirleri) göz atın.",
        ],
      },
    ],
    faq: [
      { q: "Hasta bilgilendirme videosu ne kadar uzun olmalı?", a: "Tek bir konu için 30–90 saniye çoğu zaman yeterlidir. Uzun bir tedavi süreci, her biri bir aşamayı anlatan birkaç kısa videoya bölünebilir." },
      { q: "Bilgilendirme videosu aydınlatılmış onamın yerine geçer mi?", a: "Hayır. Aydınlatılmış onam hekim ile hasta arasındaki görüşme ve imzalı belgeyle alınır. Video bu görüşmeyi destekler ve hatırlatır." },
      { q: "Bilgilendirme videoları sosyal medyada paylaşılabilir mi?", a: "Evet, bilgilendirici ve temkinli oldukları sürece. Fiyat, kampanya, sonuç vaadi ve hasta teşekkürü içermemelidir." },
      { q: "Bekleme salonunda video göstermek için ses gerekir mi?", a: "Gerekmez. Altyazılı videolar sessiz döngüde de anlaşılır; bekleme salonu için bu genellikle daha uygundur." },
      { q: "Hangi bilgilendirme videoları önce hazırlanmalı?", a: "En çok soru aldığınız ve en çok kaygı yaratan tedavilerle başlayın: genellikle diş çekimi sonrası bakım, kanal tedavisi, implant aşamaları ve ilk muayene. Bu dört video, ekibin her gün verdiği açıklamaların büyük kısmını karşılar." },
      { q: "Bilgilendirme videosunu kim kontrol etmeli?", a: "Her video yayından önce bir diş hekimi tarafından izlenmelidir. Özellikle tedavi sonrası talimatların ilgili işleme özel ve kliniğinizin protokolüyle uyumlu olduğundan emin olun." },
      { q: "Videoları hastalara WhatsApp'tan gönderebilir miyim?", a: "Hastanın iletişim izni varsa, kendi tedavisiyle ilgili bir bakım videosunu kişisel olarak göndermek mümkündür. Rıza olmadan toplu tanıtım mesajı gönderilemez." },
    ],
    sources: [RG, KVKK, TDB],
  },
  {
    locale: "tr",
    slug: "dis-klinigi-sosyal-medya-yonetimi",
    topic: "agency-or-tool",
    category: "tools",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Diş kliniği sosyal medya yönetimi: ajans, serbest çalışan, ekip içi ya da yazılım?",
    description: "Diş kliniği sosyal medya yönetimi için seçenekler: reklam ajansı, serbest içerik üreticisi, klinik ekibi ve yazılım. Artıları, eksileri ve sözleşmeden önce sorulacak sorular.",
    h1: "Diş kliniği sosyal medya yönetimi: ajans mı, ekip mi, yazılım mı?",
    intro:
      "Diş kliniği sosyal medyasını yönetmenin dört yolu vardır: ajans, serbest çalışan içerik üreticisi, klinik içinden bir ekip üyesi ya da içerik üreten bir yazılım. Hangisini seçerseniz seçin, Türkiye'de belirleyici soru aynıdır: içerik sağlık tanıtım yönetmeliğini biliyor mu ve yayından önce son onayı hekim mi veriyor?",
    sections: [
      {
        heading: "Önce neye ihtiyacınız olduğunu netleştirin",
        paragraphs: [
          "Sosyal medya “yönetimi” birbirinden farklı işleri kapsar: konu planlama, metin yazma, çekim ve kurgu, tasarım, paylaşım, mesajları yanıtlama ve raporlama. Bir klinik için en zor kısım genellikle düzenli, doğru ve kurallara uygun içerik üretmektir. Hangi işi dışarıya vereceğinizi bilmek, doğru seçeneği bulmanın ilk adımıdır.",
        ],
      },
      {
        heading: "Dört seçenek, artıları ve eksileri",
        paragraphs: [],
        list: [
          "Ajans: Planlama, tasarım ve paylaşımı üstlenir; zamandan tasarruf sağlar. Ancak maliyeti yüksek olabilir ve her ajans sağlık mevzuatını bilmez. Kampanya, indirim ve öncesi-sonrası gibi genel pazarlama alışkanlıkları sağlıkta risk yaratır.",
          "Serbest içerik üreticisi: Daha esnek ve genellikle daha uygun maliyetlidir; çekim ve kurgu konusunda güçlü olabilir. Sürekliliği kişiye bağlıdır, mevzuat bilgisi değişkendir.",
          "Klinik ekibi: Hastaları ve kliniği en iyi tanıyan kişilerdir; içerik samimi olur. Ancak ekip zamanı kısıtlıdır ve tedavi işleri hep önceliklidir.",
          "Yazılım: Düzenli içeriği hızlı ve öngörülebilir biçimde üretir. Genel amaçlı araçlar sağlık tanıtım kurallarını bilmez; sağlığa özel bir araçta bile son kontrol hekime aittir.",
        ],
      },
      {
        heading: "Ajansla çalışmadan önce sorulacak sorular",
        paragraphs: ["Bir ajans ya da serbest çalışanla görüşürken bu soruları sorun:"],
        list: [
          "Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmeliği biliyor musunuz, içerikleri buna göre nasıl kontrol ediyorsunuz?",
          "Kampanya, indirim, çekiliş ya da hasta yorumu paylaşımı öneriyor musunuz? (Öneriyorlarsa dikkat.)",
          "Her paylaşım yayından önce hekimin onayına sunuluyor mu?",
          "Tıbbi içeriği kim yazıyor ve kim kontrol ediyor?",
          "Hasta görüntüsü kullanılacaksa KVKK onamını kim alıyor ve nerede saklanıyor?",
          "Hesapların ve içeriklerin sahibi kim; sözleşme bitince ne oluyor?",
          "Ücretli öne çıkarma ya da sponsorlu paylaşım öneriyor musunuz?",
        ],
      },
      {
        heading: "Ekip içinden yönetim: kimi görevlendirmeli",
        paragraphs: [
          "Sosyal medyayı klinik içinden yönetmeyi seçerseniz, işi “boş kaldıkça” yapılacak bir görev olarak değil, haftada belirli bir zamanı olan bir sorumluluk olarak tanımlayın. Hastalarla iletişimi iyi, yazım dili düzgün ve gizlilik konusunda dikkatli bir ekip üyesi idealdir. Bu kişiye tanıtım kurallarının kısa bir özetini ve yayın öncesi kontrol listesini verin; tıbbi içeriği ise her zaman hekim onaylasın.",
          "Mesajlara verilecek yanıtlar için de birkaç hazır kalıp hazırlayın: randevu talebi, fiyat sorusu (birebir ve yazılı yanıt), acil durum (kliniği arama yönlendirmesi). Sosyal medyada tanı koymaktan ve tedavi önermekten kaçının; “muayenede değerlendirelim” en güvenli yanıttır.",
        ],
      },
      {
        heading: "Sorumluluk her zaman kliniktedir",
        paragraphs: [
          "İçeriği kim üretirse üretsin, paylaşım kliniğin ve hekimin adına yapılır. Bir ajansın hazırladığı kampanya duyurusu yüzünden yaptırım gelirse muhatap kliniktir. Bu nedenle yazılı bir onay süreci kurun: hiçbir içerik hekim görmeden yayınlanmasın. Neye dikkat edeceğinizi [diş hekimi reklam yasağı rehberindeki](guide:dis-hekimi-reklam-yasagi) kontrol listesi özetliyor.",
        ],
      },
      {
        heading: "Seçenekleri neye göre karşılaştırmalı",
        paragraphs: [
          "Fiyat teklifleri farklı işleri kapsadığı için doğrudan karşılaştırmak zordur. Bunun yerine her seçeneği aynı ölçütlerle değerlendirin:",
        ],
        list: [
          "Haftada kaç içerik gerçekten yayına hazır geliyor?",
          "Hekimin her hafta harcadığı zaman ne kadar: onay için mi, yeniden yazdırmak için mi?",
          "İçerik yayından önce tıbbi doğruluk ve tanıtım kuralları açısından kimin tarafından kontrol ediliyor?",
          "Ayrılırsanız içerikler, ham çekimler ve hesap erişimleri kimde kalıyor?",
          "İçerik kliniğinizin kendi sesini mi taşıyor, yoksa her klinikte aynı şablonlar mı kullanılıyor?",
        ],
        after: [
          "Bir deneme dönemi istemek bu soruların yanıtını görmenin en kolay yoludur: birkaç haftalık içerik, hangi seçeneğin size uyduğunu gösterir. Deneme sırasında özellikle şuna bakın: hekimin onay için harcadığı süre azalıyor mu, yoksa her içerik yeniden yazılmak zorunda mı kalıyor? İkinci durumda seçenek ne kadar uygun görünürse görünsün, kliniğe gerçek bir yük getirir.",
        ],
      },
      {
        heading: "İyi işleyen bir haftalık akış",
        paragraphs: [],
        list: [
          "Pazartesi: Haftanın konuları belirlenir (hasta soruları, mevsim, kliniğin tedavileri).",
          "Salı: Videolar ve açıklama metinleri hazırlanır; hekim kaydı varsa çekilir.",
          "Çarşamba: Hekim her içeriği izler, onaylar ya da düzeltme ister.",
          "Perşembe–Cuma: Onaylanan içerikler planlanan günlerde paylaşılır; gelen sorular ekip tarafından yanıtlanır.",
          "Ay sonu: Hangi konuların izlendiği ve hangi soruların geldiği not edilir, sonraki ayın planına yansıtılır.",
        ],
        ordered: true,
      },
      {
        heading: "Karma model: çoğu klinik için gerçekçi olan",
        paragraphs: [
          "Birçok klinik için en sürdürülebilir yol karma bir modeldir. Düzenli bilgilendirme videoları bir araçla ya da dışarıdan hazırlanır; hekim ayda birkaç kez kısa bir kayıtla kendi sesini ekler; klinik ekibi mesajları yanıtlar ve paylaşımı yapar. Böylece hesap düzenli kalır, içerik kliniğin kendi sesini taşır ve kimse haftalık içerik baskısı altında ezilmez.",
          "Kendi kaydınızı nasıl hızlıca çekeceğinizi [video çekimi rehberinde](guide:dis-hekimi-video-cekimi), hangi konuları seçeceğinizi [paylaşım fikirleri rehberinde](guide:dis-hekimi-instagram-paylasim-fikirleri) bulabilirsiniz.",
        ],
      },
      {
        heading: "DentVideo nerede durur",
        paragraphs: [
          "[DentVideo](landing:), içerik üretimini üstlenen bir yazılımdır: her hafta beş kısa bilgilendirme videosu hazırlar, her senaryoyu klinik doğruluk ve tanıtım kurallarına göre denetler, kendi kayıtlarınızı altyazılı kliplere böler. Sizin yerinize paylaşım yapmaz ve mesajlarınızı yanıtlamaz; onayladığınız videoları indirip siz paylaşırsınız. Bu sayede bir ajansla ya da ekibinizle birlikte de kullanılabilir. [İlk hafta ücretsizdir](start:).",
        ],
      },
    ],
    faq: [
      { q: "Diş kliniği sosyal medyasını ajansa vermeli mi?", a: "Ajans zaman kazandırır, ancak sağlık tanıtım mevzuatını bilmeyen bir ajans risk yaratabilir. Hangi seçeneği seçerseniz seçin, her paylaşımı yayından önce hekim onaylamalıdır." },
      { q: "Ajansın hatasından kim sorumludur?", a: "Paylaşım kliniğin ve hekimin adına yapıldığı için sorumluluk genellikle kliniktedir. Sözleşmede onay sürecini ve sorumlulukları açıkça belirleyin." },
      { q: "Sosyal medya yönetimi için yazılım yeterli mi?", a: "İçerik üretimini düzenli hale getirmek için yeterli olabilir; ancak mesajları yanıtlamak ve son kontrolü yapmak yine klinikte kalır." },
      { q: "Sosyal medya hesabının sahibi kim olmalı?", a: "Hesaplar her zaman kliniğin adına açılmalı ve şifreler klinikte kalmalıdır. Ajans ya da serbest çalışanla yollar ayrıldığında hesaba erişimi kaybetmemek için yetkileri kişisel değil, rol bazlı verin." },
      { q: "Mesajlara sosyal medyada tıbbi yanıt verilmeli mi?", a: "Hayır. Sosyal medyada tanı koymak ya da tedavi önermek yerine hastayı muayeneye ya da telefonla kliniğe yönlendirin; acil durumlar için kliniğin telefon numarasını paylaşın." },
      { q: "Ücretli reklam ya da öne çıkarma kullanılabilir mi?", a: "2025 yönetmeliği ücretli, sponsorlu ve öne çıkmaya yönelik paylaşımları kısıtlamıştır. Kullanmadan önce güncel metne ve odanızın görüşüne bakın." },
    ],
    sources: [RG, MEVZUAT, KVKK],
  },
  {
    locale: "tr",
    slug: "dis-hekimi-video-cekimi",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Diş hekimi videosu telefonla nasıl çekilir: beş dakikalık çekim rehberi",
    description: "Diş hekimleri için telefonla video çekim rehberi: ışık, ses, kadraj, konuşma planı, mahremiyet kontrolü ve bir kayıttan bir haftalık kısa video çıkarma.",
    h1: "Diş hekimi videosu telefonla nasıl çekilir",
    intro:
      "Bir diş hekimi videosu için stüdyo gerekmez: güncel bir telefon, pencereden gelen gün ışığı, sessiz bir oda ve beş dakika yeterlidir. Telefonu dikey ve göz hizasında sabitleyin, yaka mikrofonu kullanın, üç dört soruyu bir hastaya anlatır gibi yanıtlayın; bu tek kayıt, her biri tek soruyu yanıtlayan birkaç kısa videoya dönüşebilir.",
    sections: [
      {
        heading: "Ekipman: azı yeterli",
        paragraphs: ["Pahalı bir kamera, görüntüden çok sesi iyileştirmez. Önceliğiniz ses ve ışık olsun:"],
        list: [
          "Son birkaç yılda çıkmış bir akıllı telefon (arka kamera, ön kameradan genellikle daha iyidir)",
          "Basit bir tripod ya da telefon tutucu",
          "Kablosuz ya da kablolu bir yaka mikrofonu (ses kalitesi izlenmeyi en çok etkileyen unsurdur)",
          "Pencere ışığı; yoksa yüzün önünde, hafifçe yandan konumlanmış yumuşak bir ışık",
        ],
      },
      {
        heading: "Çekimden önce: mahremiyet ve ortam kontrolü",
        paragraphs: [
          "Muayenehanede çekim yapıyorsanız kadrajda hasta, hasta bilgisi görünen ekran, randevu defteri ya da röntgen olmadığından emin olun. Bir hasta görünecekse KVKK kapsamında yazılı açık rıza alın ve onamı saklayın. Arka planı sade tutun; ünite, düzenli bir raf ya da klinik logosu yeterlidir. Klimayı ve kompresörü mümkünse kapatın.",
        ],
      },
      {
        heading: "Beş dakikalık çekim, adım adım",
        paragraphs: [],
        list: [
          "Üç ya da dört hasta sorusu seçin ve her biri için iki üç ana noktayı not edin; metni ezberlemeyin.",
          "Telefonu dikey konuma getirin, göz hizasına yerleştirin ve kameraya yaklaşık bir kol boyu mesafede durun.",
          "Yüzünüz pencereye dönük olsun; ışık arkanızdan gelmesin.",
          "Kayda başlamadan önce on saniyelik bir deneme yapıp sesi ve görüntüyü kontrol edin.",
          "Her soruyu önce sesli okuyun, sonra bir hastaya anlatır gibi yanıtlayın. Sorular arasında iki saniye durun; kurgu kolaylaşır.",
          "Takıldığınızda durmayın, cümleyi baştan söyleyin; hatalı kısım kurguda çıkarılır.",
          "Bitirince kaydı izleyin: sesiniz net mi, yüzünüz aydınlık mı, kadrajda istenmeyen bir şey var mı?",
        ],
        ordered: true,
        after: [
          "Bu yöntemle beş dakikalık tek bir kayıttan dört beş kısa video çıkabilir; yani bir oturum bir haftayı karşılayabilir.",
        ],
      },
      {
        heading: "Ne söylemeli, nasıl söylemeli",
        paragraphs: [
          "Soruyu ilk cümlede tekrar edin: “Beyazlatma mineye zarar verir mi? Kısa cevap: hekim kontrolünde yapıldığında genellikle hayır.” Sonra nedenini bir iki cümleyle açıklayın ve sakin bir kapanış yapın: “Dişlerinizde hassasiyet varsa önce kontrolde konuşalım.”",
          "Kesin vaatlerden kaçının. “Acısız”, “garantili”, “kalıcı” gibi kelimeler hem yanıltıcı olabilir hem de tanıtım kurallarıyla çelişir; nedenleri [reklam yasağı rehberinde](guide:dis-hekimi-reklam-yasagi). “Genellikle”, “çoğu hastada”, “hekiminiz değerlendirir” gibi ifadeler hem doğrudur hem güvenlidir.",
        ],
      },
      {
        heading: "Sık yapılan hatalar",
        paragraphs: ["İlk videolarda en sık karşılaşılan sorunlar ve kolay çözümleri:"],
        list: [
          "Telefon yatay tutulmuş: Sosyal medya için dikey çekin; yatay video ekranın küçük bir kısmını kaplar.",
          "Işık arkadan geliyor: Pencereye sırtınızı değil yüzünüzü dönün, yoksa yüzünüz karanlık kalır.",
          "Ses yankılı: Boş ve sert yüzeyli odalar yankı yapar; yaka mikrofonu ya da perdeli, eşyalı bir oda kullanın.",
          "Çok uzun giriş: “Merhaba, ben…” ile başlayan on saniye izleyiciyi kaybettirir; doğrudan soruyla başlayın.",
          "Bir videoda üç konu: Her videoda tek soru; diğerleri ayrı video olsun.",
          "Teknik terimler: Hasta “apikal rezeksiyon” değil, “kök ucu ameliyatı” anlar.",
        ],
      },
      {
        heading: "Kameraya rahat konuşmak",
        paragraphs: [
          "Kamera karşısında gerginlik çok yaygındır ve birkaç çekimde geçer. Kameraya değil, karşınızda oturan bir hastaya anlatıyormuş gibi konuşun; hatta ilk denemelerde bir asistanınızı telefonun arkasına oturtun. Normalden biraz daha yavaş konuşun ve cümle sonlarında kısa duraklar verin; kurgu kolaylaşır, altyazı da daha okunaklı olur.",
          "Mükemmel çekim aramayın. Hastalar kusursuz bir sunum değil, güvenebilecekleri, anlaşılır konuşan bir hekim görmek ister. Küçük bir dil sürçmesi videonun samimiyetini artırabilir.",
        ],
      },
      {
        heading: "Ses kalitesi neden görüntüden önemli",
        paragraphs: [
          "İzleyiciler biraz bulanık bir görüntüyü affeder, ama anlaşılmayan bir sesi affetmez. Telefonun dahili mikrofonu bir metreden uzakta odanın yankısını da kaydeder. Yaka mikrofonu ağzınıza yakın olduğu için sesinizi net, ortam gürültüsünü düşük tutar. Mikrofon yoksa telefona yaklaşın, sessiz bir oda seçin ve kapıyı kapatın.",
        ],
      },
      {
        heading: "Ekiple çekim yapmak",
        paragraphs: [
          "Videolarda yalnızca hekim yer almak zorunda değildir. Asistanınızın diş ipi kullanımını gösterdiği ya da resepsiyonun ilk muayene sürecini anlattığı videolar, kliniği daha tanıdık kılar. Ekip üyelerinden görüntülerinin kullanılması için yazılı izin alın ve kişi klinikten ayrıldığında bu videolarla ne yapılacağını önceden konuşun.",
          "Ekipte kameraya rahat konuşan biri varsa, hekimin vaktinin olmadığı haftalarda genel ağız bakımı konularını o kişi anlatabilir; tedaviye ilişkin tıbbi açıklamaları ise hekime bırakın.",
        ],
      },
      {
        heading: "Kurgu ve yayın",
        paragraphs: [
          "Her klibi tek bir soruya göre kesin ve 20–60 saniyede tutun. Altyazı ekleyin; birçok kişi sessiz izler. Logonuzu küçük ve köşede tutun, ekranın üstünü ve altını uygulama simgelerine bırakın. Açıklama metni videoyla aynı bilgiyi versin; fiyat ya da kampanya eklemeyin. Hangi formatın nerede işe yaradığını [Instagram videoları rehberinde](guide:dis-hekimleri-icin-instagram-videolari) anlattık.",
        ],
      },
      {
        heading: "DentVideo ile kaydınız ne olur",
        paragraphs: [
          "[DentVideo](landing:) uygulamasında her hafta bir çekim kartı ne söyleyebileceğinizi önerir. Beş dakikalık kaydınızı yüklediğinizde kısa, altyazılı ve logolu kliplere bölünür. Sözleriniz hiçbir zaman değiştirilmez; bir cümle vaat gibi okunabiliyorsa klip gerekçesi ve önerilen bir ifadeyle işaretlenir, karar sizde kalır. Çekim yapamadığınız haftalar için seslendirmeli bilgilendirme videoları hazırdır. [İlk haftayı ücretsiz başlatın](start:).",
        ],
      },
    ],
    faq: [
      { q: "Diş hekimi videosu için hangi telefon gerekir?", a: "Son birkaç yılda çıkmış herhangi bir akıllı telefon yeterlidir. Görüntüden çok ses önemlidir; basit bir yaka mikrofonu en büyük farkı yaratır." },
      { q: "Videoyu klinikte mi çekmeliyim?", a: "Klinik iyi bir arka plandır, ancak kadrajda hasta, hasta bilgisi ya da röntgen görünmemelidir. Sessiz bir oda ve pencere ışığı daha önemlidir." },
      { q: "Önlük ya da forma ile mi çekmeliyim?", a: "Hastanın sizi klinikte göreceği kıyafet en doğal olanıdır. Desenli ya da çok parlak kıyafetler yerine düz renkler kamerada daha iyi görünür." },
      { q: "Çekimde gözlerimi nereye bakmalıyım?", a: "Ekrana değil, telefonun kamera merceğine bakın. Mercek göz hizasında olursa izleyici sizinle göz teması kurduğunu hisseder." },
      { q: "Metni ezberlemeli miyim?", a: "Hayır. Ana noktaları not edip bir hastaya anlatır gibi konuşmak genellikle daha doğal ve daha güvenilir sonuç verir." },
      { q: "Çekim için en iyi zaman ne zaman?", a: "Gün ışığının yumuşak olduğu sabah ya da öğleden sonra saatleri ve hasta trafiğinin az olduğu bir boşluk idealdir. Haftada bir sabit zaman ayırmak çekimi alışkanlığa dönüştürür." },
      { q: "Bir kayıttan kaç video çıkar?", a: "Üç dört soruyu yanıtladığınız beş dakikalık bir kayıttan genellikle dört beş kısa video çıkar." },
    ],
    howTo: {
      name: "Telefonla beş dakikada diş hekimi videosu çekmek",
      steps: [
        { name: "Soruları seçin", text: "Üç ya da dört hasta sorusu seçin, her biri için iki üç ana nokta not edin." },
        { name: "Telefonu yerleştirin", text: "Telefonu dikey, göz hizasında ve bir kol boyu mesafede sabitleyin; yüzünüz pencereye dönük olsun." },
        { name: "Deneme kaydı yapın", text: "On saniyelik bir denemeyle ses ve ışığı kontrol edin." },
        { name: "Kaydedin", text: "Her soruyu sesli okuyup bir hastaya anlatır gibi yanıtlayın, sorular arasında iki saniye durun." },
        { name: "Kontrol edin ve kurgulayın", text: "Kaydı izleyin, her soruyu 20–60 saniyelik ayrı bir klibe bölün ve altyazı ekleyin." },
      ],
    },
    sources: [KVKK, RG],
  },
];
