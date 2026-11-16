import type { SolutionPage } from "./types";
import { claim } from "./claims";

const c = (id: string) => claim(id, "tr");

/**
 * Türkçe yanıt sayfaları: diş hekimlerinin video yoluna karar vermeden önce
 * bir yapay zekâ asistanına sorduğu sorular. Başka şirketlere dair bilgiler
 * yalnızca claims.ts'ten gelir (şirketin kendi sayfası ve okuduğumuz tarih).
 */
export const ANSWERS_TR: SolutionPage[] = [
  {
    locale: "tr",
    slug: "dis-klinigi-hasta-bilgilendirme-videosu-hazirlama-yollari",
    kind: "options",
    nav: "Video hazırlamanın beş yolu",
    anchor: "diş kliniği için hasta bilgilendirme videosu hazırlamanın beş yolu, karşılaştırmalı",
    blurb: "Kendiniz çekmek, ajans, tasarım uygulaması, hazır video kütüphanesi ya da DentVideo: zaman, maliyet, kuralları kimin denetlediği ve kime uyduğu.",
    queries: [
      "diş kliniği için video hazırlayan program",
      "diş kliniği sosyal medya videosu nasıl hazırlanır",
      "hasta bilgilendirme videosu hazırlama",
      "diş hekimi tanıtım videosu programı",
      "diş kliniği instagram video",
    ],
    seoTitle: "Diş Kliniği İçin Video Hazırlamanın 5 Yolu",
    seoDescription:
      "Kendiniz çekmek, ajans, Canva, hazır video kütüphanesi ya da DentVideo: haftalık zaman, maliyet, tanıtım kuralları denetimi ve kime uygun olduğu.",
    h1: "Diş kliniğiniz için hasta bilgilendirme videosu hazırlamanın beş yolu",
    intro:
      "Bir diş kliniğinin hasta bilgilendirme videosu edinmek için beş gerçekçi yolu vardır: videoları kendiniz çekmek, bir pazarlama ajansıyla çalışmak, Canva gibi bir tasarım uygulamasında hazırlamak, hazır bir video kütüphanesi lisanslamak ya da DentVideo gibi videoları sizin için hazırlayan bir yazılım kullanmak. Bu yollar haftalık zamanınız, maliyet, tanıtım kurallarını ve klinik doğruluğu kimin denetlediği ve videonun kliniğinizi mi yoksa genel olarak diş hekimliğini mi anlattığı bakımından ayrılır.",
    sections: [
      {
        heading: "Beş yol yan yana",
        paragraphs: [
          "Her yol işin farklı bir kısmını çözer. Tablo, kliniklerin genellikle ilk sorduğu noktaları karşılaştırır; altındaki bölümlerde yayımlanmış bilgiler ve fiyatlar, kaynağı ve okuduğumuz tarihle birlikte yer alır.",
        ],
        table: {
          caption: "Diş kliniği için hasta bilgilendirme videoları: beş yol",
          columns: ["Yol", "Haftalık zamanınız", "Maliyeti", "Tanıtım kurallarını ve doğruluğu kim denetler", "Kime uyar"],
          rows: [
            ["Kendiniz çekmek (telefon)", "Birkaç saat: konu, metin, çekim, kurgu, altyazı", "Ekibinizin zamanı; bir telefon ve bir mikrofon", "Siz", "kameradan çekinmeyen bir hekimi ve kurgu yapabilen bir çalışanı olan kliniğe"],
            ["Diş hekimliği pazarlama ajansı", "Brifingler, düzeltme turları, onaylar", "Emek karşılığı aylık ücret; beş yolun genellikle en maliyetlisi", "Ajansa göre değişir: sözleşmeden önce sorun", "reklam ve yorumlar dahil her şeyi devretmek isteyen kliniğe"],
            ["Tasarım uygulaması", "Metin, tasarım, ses ve kurgu için saatler", "Ücretsiz plan ya da kişi başı abonelik", "Siz", "tasarım yapmayı seven bir çalışanı olan ve afiş, broşür de isteyen kliniğe"],
            ["Hazır video kütüphanesi", "Bir video seçip oynatmak için dakikalar", "Abonelik ya da tek seferlik lisans", "İçeriği yayıncı hazırlar; Türkiye'deki tanıtım kurallarına uyup uymadığını siz denetlersiniz", "tedavileri koltuk başında ve web sitesinde anlatmak isteyen kliniğe"],
            ["DentVideo (yazılım)", "Beş videoyu izleyip onaylamak için birkaç dakika", "Asgari süresiz aylık plan ([planlar ve fiyatlar](landing:))", "Yazılım her metni siz görmeden önce tanıtım kuralları ve doğruluk açısından denetler; onay sizindir", "çekim ya da tasarım yapmadan her hafta sosyal medyada paylaşım yapmak isteyen kliniğe"],
          ],
          note: "Tipik kurulumlar; belirli bir sağlayıcıyı anlatmaz. Ajanslar, uygulamalar ve kütüphaneler birbirinden farklıdır ve teklifleri değişir.",
        },
      },
      {
        heading: "Şirketlerin kendi sayfalarına göre maliyetler nedir?",
        paragraphs: [
          "Fiyatlar değiştiği için her satır şirketin kendi sayfasını ve okuduğumuz tarihi gösterir. Bunlar ABD örnekleridir; Türkiye'deki ajanslar farklı fiyatlandırır ve çoğu fiyatı yalnızca teklif üzerine verir.",
        ],
        list: [
          `Ajans, fiyat aralığı: ${c("webfx-agency-range")}.`,
          `Tasarım uygulaması: ${c("canva-plans")}.`,
          `Video kütüphanesi, abonelik: ${c("optio-price")}.`,
          `Video kütüphanesi, tek seferlik: ${c("toothflix-series")}.`,
        ],
        after: [
          "DentVideo'nun aylık planları [ana sayfanın fiyat bölümünde](landing:) Türk lirası, avro ve ABD doları olarak yer alır; asgari süre yoktur. Klinik, ödeme yapmadan önce kendi logosu ve renkleriyle videolarının canlı önizlemesini görür.",
        ],
      },
      {
        heading: "Kendiniz çekmek ne zaman doğru seçimdir?",
        paragraphs: [
          "Hastayı tedavi edecek hekimin kamerada sakinçe bir şey anlatması kadar güven veren az şey vardır. Zaman dışında maliyeti düşüktür; pencereye dönük, dikey tutulmuş bir telefon yeterlidir. Zor olan her hafta sürdürmektir: metin, kurgu, altyazı ve her ifadenin tanıtım kurallarına göre kontrolü. Beş dakikada işe yarar bir klip çekmenin yolu [diş hekimi video çekimi](guide:dis-hekimi-video-cekimi) rehberinde.",
        ],
      },
      {
        heading: "Ajans ya da tasarım uygulaması ne zaman uygundur?",
        paragraphs: [
          "Ajans; strateji, klinikte çekim, ücretli reklam ve yorum yanıtlama için tek bir ortak isteyen kliniğe uyar. Emek karşılığı ödediğiniz için daha maliyetlidir; her paylaşımı Türkiye'deki tanıtım kurallarına göre kimin denetlediğini sorun ([diş kliniği sosyal medya yönetimi](guide:dis-klinigi-sosyal-medya-yonetimi)).",
          `Tasarım uygulaması, ekipte tasarım yapmayı seven biri varsa uyar. ${c("canva-dental-templates")}. Metin, ses ve her ifadenin kontrolü yine sizdedir; şablonların çoğu İngilizce ve her sektör için yazılmıştır.`,
        ],
      },
      {
        heading: "Hazır video kütüphanesi ne zaman uygundur?",
        paragraphs: [
          `Kütüphaneler tedavileri koltuk başında ve web sitesinde anlatmak için hazırlanır. ${c("optio-library")}. Karşınızdaki hastaya bir işlemi anlatmak için böyle bir kütüphane, DentVideo'nun hiç yapmaya çalışmadığı bir işi yapar.`,
          "Ancak kliniğinizin renklerinde haftalık bir sosyal medya akışı değildir ve dil seçenekleri sınırlıdır: satın almadan önce videoların Türkçe olup olmadığını kontrol edin.",
        ],
      },
      {
        heading: "DentVideo ne zaman uyar?",
        paragraphs: [
          "DentVideo, düzenli paylaşım yapmak isteyen ama çekim, tasarım ya da metin kontrolüne zaman ayıramayan bir kliniğe uyar. Her hafta sunduğunuz tedavilerle ilgili beş kısa video yazar, seslendirir ve altyazılar; videolar logonuz ve renklerinizle, Türkçe “siz” ya da “sen” hitabıyla, seçtiğiniz kadın ya da erkek sesle hazırlanır, isterseniz açıklama metinlerinin altına kendi kapanış cümlenizi ekler. Yazılım her metni tanıtım kuralları ve klinik doğruluk açısından denetler; onayınız olmadan hiçbir şey yayınlanmaz ve paylaşımı siz yaparsınız.",
          "Reklam yönetmez, yorumlara cevap vermez, kliniğinizde çekim yapmaz ve koltuk başı animasyon kütüphanesinin yerini tutmaz. Bu videoların neyi anlattığı [hasta bilgilendirme videoları](guide:hasta-bilgilendirme-videolari) rehberinde. Karar vermeden önce [kendi logonuzla canlı önizlemeyi görün](start:).",
        ],
      },
    ],
    faq: [
      { q: "Diş kliniği için sosyal medya videosu hazırlamanın en hızlı yolu nedir?", a: "Videoları sizin için hazırlayan bir yazılım, örneğin DentVideo: izler, onaylar ve paylaşırsınız. Kendiniz çekmek daha kişiseldir ama her hafta saatler alır." },
      { q: "Diş hekimleri için video hazırlayan bir program var mı?", a: "Evet. Hazır video kütüphaneleri tedavileri koltuk başında ve web sitesinde anlatır (ikisi bu sayfada kaynağıyla yer alıyor); DentVideo ise kliniğinizin renklerinde haftalık sosyal medya videoları hazırlar ve her metni onayınızdan önce denetler." },
      { q: "Ajans mı yazılım mı daha uygun maliyetli?", a: "Yazılım genellikle ajanstan belirgin biçimde daha az tutar, çünkü emek ücreti ödemezsiniz. Ajans ise karşılığında çekim, reklam ve yorum yanıtlama gibi daha fazla iş üstlenir." },
      { q: "Bir video tanıtım kurallarına aykırıysa sorumlu kimdir?", a: "Videoyu kim hazırlamış olursa olsun, yayımlayan klinik. Her videoyu kendiniz onaylayın; kurallar [diş hekimi reklam yasağı](guide:dis-hekimi-reklam-yasagi) rehberinde." },
    ],
    guides: ["hasta-bilgilendirme-videolari", "dis-hekimi-video-cekimi", "dis-klinigi-sosyal-medya-yonetimi", "dis-hekimi-reklam-yasagi"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
  {
    locale: "tr",
    slug: "dentvideo-mu-ajans-mi",
    kind: "vs-agency",
    nav: "DentVideo mu, ajans mı",
    anchor: "DentVideo mu, diş hekimliği pazarlama ajansı mı: ne yaparlar, ne tutar",
    blurb: "Bir ajansın yazılımın yapmadığı neleri yaptığı, ajansların yayımladığı fiyatlar ve DentVideo'nun ne zaman yettiği.",
    queries: [
      "diş kliniği sosyal medya ajansı",
      "diş hekimi reklam ajansı fiyatları",
      "diş kliniği sosyal medya yönetimi ücreti",
      "ajans yerine sosyal medya programı",
    ],
    seoTitle: "DentVideo mu, Diş Hekimliği Ajansı mı?",
    seoDescription:
      "Diş hekimliği pazarlama ajansının yazılımdan farklı olarak neler yaptığı, ajansların yayımladığı aylık fiyatlar ve DentVideo'nun ne zaman yettiği.",
    h1: "DentVideo mu, pazarlama ajansı mı: kliniğinizin neye ihtiyacı var?",
    intro:
      "Diş hekimliği pazarlama ajansı; içerik planlamak, çekim yapmak, tasarlamak, paylaşmak, reklam yönetmek ve yorumlara cevap vermek için ücret ödediğiniz bir ekiptir. DentVideo ise haftada beş hasta bilgilendirme videosu hazırlayan, her metni tanıtım kuralları ve klinik doğruluk açısından denetleyen, onayı ve paylaşımı size bırakan bir yazılımdır. Her şeyi devretmek istiyorsanız ajans daha fazlasını yapar; düzenli bilgilendirme videosu istiyorsanız DentVideo hem bütçenizden hem zamanınızdan daha az alır.",
    sections: [
      {
        heading: "Hangisi neyi yapar?",
        paragraphs: [],
        table: {
          caption: "DentVideo ve bir diş hekimliği pazarlama ajansı, iş iş",
          columns: ["İş", "DentVideo", "Tipik ajans"],
          rows: [
            ["Konu planlamak", "Tedavilerinizden ve hastaların sorularından", "Sizinle kararlaştırılan bir içerik takvimi"],
            ["Bilgilendirme videosu hazırlamak", "Haftada beş, seslendirilmiş ve altyazılı, kliniğinizin renklerinde", "Sözleşme kapsamı kadar"],
            ["Klinikte hekimi ya da ekibi çekmek", "Hayır; Practice planında kendinizi kaydeder, altyazılı klipler alırsınız", "Çoğunlukla, yerinde"],
            ["Tanıtım kuralları denetimi", "Her metin ve açıklama, siz görmeden önce yazılımla", "Ajansa göre değişir"],
            ["Instagram, TikTok, Facebook'ta paylaşım", "Hayır: onayladığınız videoları siz paylaşırsınız", "Genellikle"],
            ["Yorum ve mesajlara cevap", "Hayır", "Çoğu zaman dahil"],
            ["Ücretli reklam", "Hayır", "Çoğu zaman, reklam bütçesi ayrıca"],
            ["Taahhüt", "Aylık, asgari süre yok", "Çoğu zaman aylık sabit ücret, bazen asgari süreli"],
          ],
          note: "Ajanslar birbirinden çok farklıdır; sağ sütun yaygın kurulumları anlatır, belirli bir ajansı değil.",
        },
      },
      {
        heading: "Diş hekimliği ajansları ne kadar ücret alıyor?",
        paragraphs: ["Ajanslar kapsama göre fiyat verir, ama bazıları fiyat yayımlar. Kendi sayfalarından alınmış iki ABD örneği:"],
        list: [`${c("webfx-agency-range")}.`],
        after: [
          "Reklam bütçesi genellikle ayrıca eklenir ve Türkiye'deki ajanslar fiyatı çoğu zaman yalnızca teklif üzerine verir. DentVideo'nun aylık planları [ana sayfanın fiyat bölümünde](landing:); bunları sadece manşet fiyatla değil, ajansın sizin için gerçekten üstleneceği işle karşılaştırın.",
        ],
      },
      {
        heading: "Ajans ne zaman daha doğru seçimdir?",
        paragraphs: [
          "Her şey için tek bir ortak istediğinizde: strateji, klinikte fotoğraf ve video çekimi, kampanyalar, web sitesi, akşam mesajlara cevap veren biri. Bunların hiçbirini bir yazılım yapmaz. Sağlıkta tanıtım kurallarına hâkim, işini iyi yapan bir ajans, pazarlamayı tamamen devretmek isteyen bir klinik için ücretini hak eder. Sözleşmeden önce soracağınız sorular [diş kliniği sosyal medya yönetimi](guide:dis-klinigi-sosyal-medya-yonetimi) rehberinde.",
        ],
      },
      {
        heading: "DentVideo ne zaman yeterlidir?",
        paragraphs: [
          "Eksik olan yönetim değil içerikse: her hafta bilgilendirme videosu paylaşmak istiyorsunuz, ekibiniz “paylaş”a basabiliyor ve kimseye brif vermek istemiyorsunuz. Her videoyu birkaç dakikada onaylarsınız; seslendirmenin kadın ya da erkek sesi ve açıklamaların altındaki isteğe bağlı kapanış cümlesi sizin ayarlarınızdır. Başka paylaşım fikirleri [diş hekimi Instagram paylaşım fikirleri](guide:dis-hekimi-instagram-paylasim-fikirleri) rehberinde.",
        ],
      },
      {
        heading: "İkisi birlikte kullanılabilir mi?",
        paragraphs: [
          "Evet. Bazı klinikler reklam ve topluluk yönetimi için ajansla çalışmayı sürdürür, haftalık bilgilendirme videoları için DentVideo kullanır: videoları onaylar ve indirirsiniz, hesaplarınızı kim yönetiyorsa o paylaşır. Yayımlananın sorumluluğu her durumda kliniktedir; bkz. [diş hekimi reklam yasağı](guide:dis-hekimi-reklam-yasagi).",
        ],
      },
      {
        heading: "Bir haftada nasıl karar verilir?",
        ordered: true,
        paragraphs: [],
        list: [
          "Masanızdan kalkmasını istediğiniz işleri yazın: içerik, paylaşım, yorumlar, reklam, çekim.",
          "Çoğunlukla içerikse [DentVideo'nun canlı önizlemesini logonuzla açın](start:) ve planladığı haftayı izleyin.",
          "Her şeyse iki ajanstan yazılı kapsam isteyin ve her paylaşımı tanıtım kurallarına göre kimin denetlediğini sorun.",
          "İhtiyacınız olan kapsamın maliyetini ve her seçeneğin hekimin haftasından kaç dakika aldığını karşılaştırın.",
        ],
      },
    ],
    faq: [
      { q: "DentVideo diş hekimliği ajansına alternatif mi?", a: "Bilgilendirme videoları için evet: haftada beş video hazırlar ve denetler. Ajansın genellikle yaptığı paylaşım, reklam, yorum yanıtlama ve klinikte çekimi yapmaz." },
      { q: "Diş kliniği sosyal medya ajansı ne kadar tutar?", a: "Kapsama bağlıdır. Bazı ABD ajansları aylık birkaç yüz ile birkaç bin dolar arasında paketler yayımlar, reklam bütçesi ayrıca; rakamlar ve kaynakları yukarıda." },
      { q: "Ajansım DentVideo videolarını kullanabilir mi?", a: "Evet. Videoları onaylayıp indirirsiniz; ajansınız bunları kendi işleriyle birlikte paylaşabilir." },
      { q: "Ajans tanıtım kurallarını denetler mi?", a: "Bazıları denetler, bazıları denetlemez. Her paylaşımı kimin, yayından önce mi sonra mı denetlediğini yazılı olarak isteyin ve son onayı klinikte tutun." },
    ],
    guides: ["dis-klinigi-sosyal-medya-yonetimi", "dis-hekimi-reklam-yasagi", "dis-hekimi-instagram-paylasim-fikirleri", "dis-klinigi-sosyal-medya-icerik-takvimi"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
  {
    locale: "tr",
    slug: "dentvideo-mu-canva-mi",
    kind: "vs-canva",
    nav: "DentVideo mu, Canva mı",
    anchor: "Diş kliniği videoları için DentVideo mu, Canva mı: adil bir karşılaştırma",
    blurb: "Canva'nın diş hekimliği şablonları, yapay zekâ sesi ve altyazılarının ne yaptığı, DentVideo'nun neyi eklediği ve Canva'nın ne zaman daha uygun olduğu.",
    queries: [
      "canva diş kliniği şablon",
      "canva diş hekimi video",
      "canva alternatifi diş hekimi",
      "diş kliniği için video hazırlayan program",
    ],
    seoTitle: "DentVideo mu, Canva mı? Diş Kliniği Videoları",
    seoDescription:
      "Canva size diş hekimliği şablonları, yapay zekâ sesi ve altyazı verir, videoyu siz yaparsınız; DentVideo haftada beş videoyu hazırlar ve denetler.",
    h1: "DentVideo mu, Canva mı: kliniğinizin videolarına hangisi uyar?",
    intro:
      "Canva genel amaçlı bir tasarım uygulamasıdır: bir şablon açar, metni yazar, ses ve altyazı ekler ve videoyu kendiniz hazırlarsınız. DentVideo ise diş klinikleri için haftada beş seslendirilmiş ve altyazılı hasta bilgilendirme videosu hazırlayan ve her metni siz onaylamadan önce tanıtım kuralları ve klinik doğruluk açısından denetleyen bir yazılımdır. Canva daha fazla yaratıcı özgürlük verir, afiş ve broşürü de kapsar; DentVideo daha az zaman alır ve riskli ifadeleri dışarıda tutar.",
    sections: [
      {
        heading: "Canva diş hekimliği videoları için ne sunuyor?",
        paragraphs: ["Şirketin kendi sayfalarından, okuduğumuz tarihle:"],
        list: [`${c("canva-dental-templates")}.`, `${c("canva-ai-voice")}.`, `${c("canva-auto-captions")}.`, `${c("canva-plans")}.`],
      },
      {
        heading: "Hangisi neyi yapar?",
        paragraphs: [],
        table: {
          caption: "DentVideo ve bir tasarım uygulaması, iş iş",
          columns: ["İş", "DentVideo", "Tasarım uygulaması (siz yaparsınız)"],
          rows: [
            ["Konuyu seçmek", "Tedavilerinizden ve hastaların sorularından", "Siz"],
            ["Metni yazmak", "Hastalar için, Türkçe “siz” ya da “sen” hitabıyla yazılır", "Siz ya da şablonun metni"],
            ["Ses ve altyazı", "Seslendirilmiş (kadın ya da erkek ses) ve altyazılı", "Sizin uyguladığınız araçlar olarak"],
            ["Logo ve klinik renkleri", "Her videoda", "Kendiniz eklersiniz ya da bir marka kiti tutarsınız"],
            ["Tanıtım kuralları ve klinik doğruluk denetimi", "Yazılım her metni siz görmeden önce denetler", "Sizin sorumluluğunuz"],
            ["Afiş, broşür, tabela", "Hayır", "Evet"],
            ["Haftalık zamanınız", "Beş videoyu onaylamak için birkaç dakika", "Genellikle saatler"],
          ],
          note: "Tasarım uygulamaları sık değişir; sağ sütun bir özellik listesi değil, genel çalışma biçimidir.",
        },
      },
      {
        heading: "Canva ne zaman daha uygun araçtır?",
        paragraphs: [
          "Ekipte tasarım yapmayı seven ve her hafta zamanı olan biri varsa, her kareye kendiniz karar vermek istiyorsanız ya da basılı materyal, grafik ve sunum da gerekiyorsa. Ücretsiz bir başlangıç vardır ve pek çok klinik zaten kullanır. Bu yolu seçerseniz [diş hekimi reklam yasağı](guide:dis-hekimi-reklam-yasagi) rehberini yanınızda tutun: her sektör için yazılmış bir şablon, kliniğin söyleyemeyeceği şeyler söyleyebilir.",
        ],
      },
      {
        heading: "DentVideo ne zaman daha iyi uyar?",
        paragraphs: [
          "Darboğaz tasarım değil, zaman ve ifadeyse. DentVideo tedavilerinizle ilgili haftada beş video planlar, yazar, seslendirir ve altyazılar; sıkça kısıtlanan ifadeleri (sonuç vaadi, “acısız”, fiyat, öncesi-sonrası vaadi) dışarıda tutar ve dikkat gerektireni gerekçesiyle işaretler. Her birini siz onaylar ve paylaşırsınız. Practice planında telefonla aldığınız kendi kayıtlarınızı da altyazılı kliplere böler. Bu videoların neyi anlattığı: [hasta bilgilendirme videoları](guide:hasta-bilgilendirme-videolari).",
        ],
      },
      {
        heading: "İkisi birlikte kullanılabilir mi?",
        paragraphs: [
          "Evet, pek çok klinik için en doğal yol bu: afiş, hikâye ve basılı materyal için tasarım uygulaması, haftalık bilgilendirme videoları için DentVideo. Farklı işler yaparlar. Ajansları ve video kütüphanelerini de kapsayan daha geniş bir karşılaştırma: [hasta bilgilendirme videosu hazırlamanın beş yolu](video:dis-klinigi-hasta-bilgilendirme-videosu-hazirlama-yollari).",
        ],
      },
      {
        heading: "Seçmeden önce",
        paragraphs: [],
        list: [
          "Birinin haftada gerçekte kaç saat videoya ayırabileceğini hesaplayın.",
          "Her ifadeyi ve açıklamayı yayından önce kimin denetleyeceğine karar verin.",
          "Yalnızca video mu, yoksa basılı ve grafik materyal de mi gerektiğini netleştirin.",
          "[DentVideo'nun canlı önizlemesini kendi logonuzla açın](start:) ve kendi hazırladığınız bir videoyla karşılaştırın.",
        ],
      },
    ],
    faq: [
      { q: "DentVideo diş hekimleri için bir Canva alternatifi mi?", a: "Kısa bilgilendirme videoları için evet: videoları sizin için hazırlar ve ifadeleri denetler. Afiş, broşür ve grafik için bir tasarım uygulaması daha esnek araç olmaya devam eder." },
      { q: "Canva tanıtım kurallarını denetler mi?", a: "Uygulamanın kendi özellik ve fiyat sayfalarında, 16.11.2026'daki kontrolümüzde böyle bir özellik bulamadık. Bir tasarımın ne söylediği onu yazan kişiye bağlıdır; her ifadeyi bir hekim kontrol etmelidir." },
      { q: "DentVideo şablon mu kullanıyor?", a: "Her video kliniğinizin tedavileri, dili ve hitabı için yazılır, logonuzu ve renklerinizi taşır. Yerleşim DentVideo'ya aittir; tasarım yapmanız gerekmez." },
      { q: "Hangisi haftada daha az zaman alır?", a: "DentVideo, çünkü videolar yazılmış, seslendirilmiş, altyazılanmış ve denetlenmiş olarak gelir; siz onaylarsınız. Tasarım uygulamasında her videoyu biri hazırlar." },
    ],
    guides: ["hasta-bilgilendirme-videolari", "dis-hekimi-reklam-yasagi", "dis-hekimleri-icin-instagram-videolari", "dis-hekimi-instagram-paylasim-fikirleri"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
];
