import type { Guide } from "../dentvideo";

// Tedaviye göre hasta bilgilendirme videoları, Türkiye'deki klinikler için
// yazıldı (çeviri değil): hastaların sorduğu sorular, bunları yanıtlayan kısa
// videolar ve 2025 tarihli tanıtım yönetmeliği açısından riskli ifadeler.
// "Siz" hitabı; fiyat, istatistik ve hasta yorumu yok. Madde numarası
// verilmez: resmî metinden doğrulanmadıkça yazılmaz (docs/SEO_PLAN.md §10.5).

const RG = { label: "Resmî Gazete — 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete (Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik)", url: "https://www.resmigazete.gov.tr/eskiler/2025/11/20251112.htm" };
const KVKK = { label: "Kişisel Verileri Koruma Kurumu — 6698 sayılı Kişisel Verilerin Korunması Kanunu", url: "https://www.kvkk.gov.tr/" };

const DATES = { published: "2026-11-14", updated: "2026-11-14", reviewed: "2026-11-14" } as const;

export const TREATMENTS_TR: Guide[] = [
  {
    locale: "tr",
    slug: "implant-hasta-bilgilendirme-videolari",
    topic: "treatment-implants",
    category: "treatments",
    ...DATES,
    sample: "implant-asamalari",
    title: "İmplant hasta bilgilendirme videoları: hastaların soruları, video konuları ve kaçınılacak ifadeler",
    seoTitle: "İmplant hasta bilgilendirme videoları",
    seoDescription: "Diş klinikleri için kısa implant videoları: aşamalar, iyileşme süreci, bakım — ve tanıtım yönetmeliğine takılabilecek kesin sonuç vaatleri.",
    description: "Hastaların implant tedavisi hakkında sorduğu sorular, bunları yanıtlayan altı kısa video, beş adımlı senaryo yapısı ve sağlık tanıtım kurallarına takılabilecek ifadeler.",
    h1: "İmplant hasta bilgilendirme videoları: ne çekmeli, neyi söylememeli?",
    intro:
      "İmplant hasta bilgilendirme videosu, implant tedavisinin bir aşamasını — muayene, implantın yerleştirilmesi, iyileşme süreci, üst yapı ya da bakım — sade bir dille anlatan kısa bir videodur. Amaç, hastanın muayeneye gerçekçi beklentilerle gelmesidir. İşe yarayan videolar tek bir soruyu bir dakikanın altında yanıtlar, olağan süreci anlatır, sonuç vaat etmez ve izleyiciyi kendi durumunu hekimiyle konuşmaya davet ederek biter.",
    sections: [
      {
        heading: "Hastalar implant hakkında neler soruyor?",
        paragraphs: [
          "İmplant düşünen hastalar randevu almadan önce haftalarca araştırma yapar ve ilk muayenede neredeyse hep aynı soruları sorar. Bu soruların her biri bir video konusudur. Önce ekibinizin en sık duyduğu sorularla başlayın; aşağıdaki liste iyi bir başlangıç noktasıdır:",
        ],
        list: [
          "İmplant tek seansta mı bitiyor, kaç randevu gerekiyor?",
          "İmplant ile kalıcı diş arasında neden beklemek gerekiyor?",
          "İyileşme döneminde dişsiz mi kalacağım?",
          "Kemik kaybım varsa, sigara içiyorsam ya da diyabetim varsa implant yapılabilir mi?",
          "İşlem sırasında ne hissederim, o gün neler olur?",
          "İmplantı nasıl temizlerim, kontrole neden gelmem gerekir?",
          "İmplant, köprü ve protez arasındaki fark nedir?",
          "İlk günlerde ne yiyebilirim, nelerden kaçınmalıyım?",
        ],
        after: [
          "Listede bir soru eksik: “Fiyatı ne kadar?” Bu gerçek bir soru, ancak sağlık hizmetlerinde fiyat ve kampanya duyurusu tanıtım kurallarına takılabileceği için yeri sosyal medya videosu değil, muayene ve kişisel görüşmedir.",
        ],
      },
      {
        heading: "Klinik hangi implant videolarını hazırlamalı?",
        paragraphs: [
          "Altı kısa video, ilk aramadan bakım dönemine kadar hastanın yolculuğunun büyük kısmını kapsar. Her biri sosyal medyada paylaşılabilir, web sitenizdeki implant sayfasına eklenebilir ya da muayeneden önce hastaya mesajla gönderilebilir.",
        ],
        table: {
          caption: "Altı implant videosu ve en çok işe yaradığı yer",
          columns: ["Video", "Yanıtladığı soru", "En çok işe yaradığı yer"],
          rows: [
            ["İmplant tedavisinin aşamaları", "Neden tek seans değil de birkaç randevu olduğu", "Sosyal medya; web sitesindeki implant sayfası"],
            ["İmplant bana uygun mu?", "Muayene, röntgen ya da tomografi, diş eti ve kemik durumu", "İlk muayeneden önce"],
            ["İmplant, köprü mü, protez mi?", "Seçeneklerin tarafsız anlatımı; kararın muayeneden sonra verilmesi", "Web sitesi; muayene sonrası mesaj"],
            ["İmplant günü", "Koltukta neler olur, lokal anestezi, ne kadar sürer", "İşlemden önce hastaya mesaj"],
            ["İlk hafta", "Şişlik, yumuşak beslenme, temizlik, ne zaman klinik aranmalı", "Bakım mesajı; bekleme salonu ekranı"],
            ["İmplantın uzun süreli bakımı", "Temizlik, kontroller, implant çevresindeki diş etinin bakımı", "Sosyal medya; kontrol hatırlatması"],
          ],
        },
      },
      {
        heading: "İmplant videolarında hangi ifadelerden kaçınmalı?",
        paragraphs: [
          "Türkiye'de diş hekimlerinin ve kliniklerin tanıtımı, 12 Kasım 2025 tarihli Resmî Gazete'de yayımlanan Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik ile düzenleniyor. Genel çizgi şudur: bilgilendirme serbest, reklam niteliğindeki tanıtım yasak. Ayrıntılar için [diş hekimi reklam yasağı rehberimize](guide:dis-hekimi-reklam-yasagi) bakın. İmplant videolarında en sık görülen riskli kalıplar şunlardır:",
        ],
        table: {
          caption: "İmplant ifadeleri: riskli ve daha güvenli",
          columns: ["Riskli ifade", "Neden sorunlu", "Daha güvenli ifade"],
          rows: [
            ["“Ömür boyu dişler”", "Kesin sonuç vaadi; implantlar bakım ister ve kaybedilebilir", "“İyi bakım ve düzenli kontrollerle uzun süre kullanılmak üzere tasarlanır”"],
            ["“Ağrısız implant”", "Her hasta için söz verilemeyecek kesin bir iddia", "“Lokal anestezi altında yapılır; sonrasında neler hissedebileceğinizi anlatırız”"],
            ["“Tek günde yeni dişler” başlığı", "Yalnızca bazı vakalar için geçerliyse ve iyileşme süresini gizliyorsa yanıltıcıdır", "“Bazı durumlarda aynı gün geçici diş takılabilir; sizin için uygun olup olmadığını muayenede konuşuruz”"],
            ["Hastanın önce-sonra fotoğrafları", "Tanıtım kurallarına takılabilir ve açık rıza gerektirir", "Aşamaları model ya da çizimle anlatmak"],
            ["Hasta teşekkür mesajları ve yorumları", "Teşekkür ve memnuniyet ifadeleri üzerinden reklam niteliğinde paylaşım yapılamaz", "Süreci kendi cümlelerinizle anlatmak"],
          ],
        },
        after: [
          "Paylaşmadan önce açıklama metninizi ücretsiz [“Bu paylaşım yasak mı?” kontrol aracımıza](checker:) yapıştırarak hızlı bir ön kontrol yapabilirsiniz. Araç hukuki danışmanlık değildir; şüphede kaldığınızda il diş hekimleri odanıza danışın.",
        ],
      },
      {
        heading: "İmplant 30 saniyede nasıl anlatılır?",
        ordered: true,
        paragraphs: ["Her implant videosunda aynı beş adımı kullanın. Böylece videolar kısa kalır ve seri tutarlı görünür:"],
        list: [
          "İlk saniyede hastanın sorusu, hem ekranda hem seslendirmede: “İlk randevuda implant bitmiyor mu?”",
          "Bir iki sade cümleyle yanıt: implantın üzerine diş takılmadan önce kemikle kaynaşması için zamana ihtiyacı vardır.",
          "Pratik bir ayrıntı: pek çok hasta iyileşme döneminde geçici bir diş ya da protez kullanır.",
          "Dürüst bir sınır: süre ve seçenekler kişiden kişiye değişir.",
          "Vaat değil davet: “Size uygun olup olmadığını muayenede birlikte konuşalım.”",
        ],
        after: [
          "Altyazı burada özellikle önemlidir: implant videolarını çoğunlukla ileri yaştaki hastalar izler ve birçoğu sesi kapalı izler. Uzunluk, altyazı ve bekleme salonu kullanımı için [hasta bilgilendirme videoları rehberimize](guide:hasta-bilgilendirme-videolari) göz atın.",
        ],
      },
      {
        heading: "İmplant videoları paylaşım planında nereye oturur?",
        paragraphs: [
          "İmplant içerikleri tek tek değil, küçük bir seri olarak daha iyi işler. Önce aşamalar videosunu, sonraki haftalarda uygunluk ve bakım videolarını paylaşın; birini bulan izleyici diğerlerine de bakar. Bunları koruyucu diş hekimliği ve günlük sorularla karıştırın: yalnızca implanttan oluşan bir hesap reklam gibi görünür. Dengeli bir ayın nasıl görüneceğini [diş hekimi Instagram paylaşım fikirleri](guide:dis-hekimi-instagram-paylasim-fikirleri) ve [52 haftalık içerik takvimi](guide:dis-klinigi-sosyal-medya-icerik-takvimi) rehberlerinde bulabilirsiniz.",
          "Aynı videoları sosyal medya dışında da kullanın. İmplant muayenesini onaylayan mesaja eklenen aşamalar videosu, hasta koltuğa oturmadan ilk sorularını yanıtlar. Bekleme salonundaki ekranda dönen bakım videosu ise mevcut hastalara kontrollerin neden önemli olduğunu hatırlatır.",
          "Sağlık turizmi hastalarına hizmet veren klinikler için bu videolar ayrıca değerlidir: yurt dışından gelen hasta, tedavinin birkaç aşamadan oluştuğunu ve iyileşme süresini önceden bilirse seyahatini buna göre planlayabilir. Bu bilgiyi vaat değil, olağan süreç olarak anlatın.",
        ],
      },
      {
        heading: "DentVideo implant videolarını nasıl hazırlar?",
        paragraphs: [
          "Yukarıdaki örnek, bir demo klinik için hazırlanmış gerçek bir DentVideo videosudur. [DentVideo](landing:) videoları yalnızca sizin belirttiğiniz tedavilerden planlar. İmplant hizmeti veriyorsanız aşamalar, uygunluk ve bakım gibi konular haftalık beş videonuzun içinde, koruyucu konuların yanında yer alır. Her video kendi dilinizde ve renklerinizde seslendirilir ve altyazılanır; her senaryo size ulaşmadan önce yukarıdaki ifadeler ve klinik doğruluk açısından denetlenir. Siz onaylamadan hiçbir şey yayımlanmaz. [Ödemeden önce logonuzla canlı önizlemeyi görün](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "İmplant firmasının animasyonlarını klinik videolarında kullanabilir miyim?",
        a: "Firmanın lisansı izin veriyorsa çoğu zaman evet; koşulları kontrol edin. Ancak videonun bir implant markasının ürün tanıtımına dönüşmemesine dikkat edin: tıbbi cihazların tanıtımı için ayrıca kurallar vardır.",
      },
      {
        q: "İmplant videolarında implantın kaç yıl dayandığı söylenmeli mi?",
        a: "Yıl vermek yerine ömrü neyin etkilediğini anlatın: temizlik, kontroller, diş eti sağlığı, sigara. Belirli bir süre, vaat gibi okunur ve tek tek hastalar için kanıtlanamaz.",
      },
      {
        q: "Hastanın implant röntgenini videoda gösterebilir miyim?",
        a: "Yalnızca hastanın bu kullanım için açık ve yazılı rızasıyla ve kimliği belirleyen bilgiler çıkarılarak. Yine de model ya da çizim, aşamaları çoğu zaman daha anlaşılır anlatır ve rıza sorununu ortadan kaldırır.",
      },
      {
        q: "İmplant bilgilendirme videosu ne kadar uzun olmalı?",
        a: "Sosyal medya için 20 ile 60 saniye arası ve video başına tek soru. Web sitesi ya da işlem öncesi mesaj için tüm süreci anlatan bir ila üç dakikalık video uygundur.",
      },
    ],
    sources: [RG],
  },
  {
    locale: "tr",
    slug: "seffaf-plak-hasta-bilgilendirme-videolari",
    topic: "treatment-aligners",
    category: "treatments",
    ...DATES,
    title: "Şeffaf plak hasta bilgilendirme videoları: konular, senaryo yapısı ve kaçınılacak iddialar",
    seoTitle: "Şeffaf plak hasta bilgilendirme videoları",
    seoDescription: "Şeffaf plak hastaları için kısa videolar: takma süresi, temizlik, ataşmanlar, pekiştirme plağı — “görünmez” ve süre vaadi içermeden.",
    description: "Hastaların şeffaf plak tedavisi hakkında sorduğu sorular, altı kısa video önerisi, beş adımlı senaryo ve tanıtım kurallarına takılabilecek ifadeler.",
    h1: "Şeffaf plak hasta bilgilendirme videoları: ne çekmeli, neyi söylememeli?",
    intro:
      "Şeffaf plak hasta bilgilendirme videosu, tedavinin bir bölümünü — plakların günde kaç saat takılacağını, nasıl temizleneceğini, ataşmanların ne işe yaradığını, kontrol randevularını, tedavi sonrası pekiştirme plağını — kısa ve altyazılı bir videoyla anlatır. İşe yarayan videolar hastanın tedaviye uymasına yardım eder; sonuç ya da bitiş tarihi vaat etmez, çünkü ikisi de vakaya ve plakların ne kadar düzenli takıldığına bağlıdır.",
    sections: [
      {
        heading: "Hastalar şeffaf plak hakkında neler soruyor?",
        paragraphs: [
          "Şeffaf plak hastalarının iki tür sorusu vardır: tedaviden önce (“Bu bana uygun mu?”) ve tedavi sırasında (“Şimdi ne yapmalıyım?”). Videolar en çok ikinci tür sorularda işe yarar, çünkü rutini anlayan hasta ona daha kolay uyar.",
        ],
        list: [
          "Plakları günde kaç saat takmam gerekiyor?",
          "Plaklar ağzımdayken yemek yiyebilir, bir şey içebilir miyim?",
          "Plakları nasıl temizlerim, neden koku ya da renk değişimi oluyor?",
          "Dişlerimdeki küçük çıkıntılar (ataşmanlar) ne işe yarıyor?",
          "Yeni plağın sıkması normal mi?",
          "Bir plağı kaybedersem ya da takmayı unutursam ne olur?",
          "Tedavi bitince neden pekiştirme plağı kullanmam gerekiyor?",
          "Benim durumum şeffaf plakla tedavi edilebilir mi, yoksa tel mi gerekir?",
        ],
      },
      {
        heading: "Klinik hangi şeffaf plak videolarını hazırlamalı?",
        paragraphs: ["Bu altı video yukarıdaki soruları yanıtlar. Çoğu, tedaviye yeni başlayan bir hastaya gönderilen mesajda da sosyal medyada olduğu kadar işe yarar."],
        table: {
          caption: "Altı şeffaf plak videosu ve en çok işe yaradığı yer",
          columns: ["Video", "Yanıtladığı soru", "En çok işe yaradığı yer"],
          rows: [
            ["Takma süresi neden önemli?", "Plaklar yalnızca ağızdayken işe yarar", "Tedavi başlangıç mesajı; sosyal medya"],
            ["Plakla yemek ve içmek", "Su dışındaki her şey için çıkarmak, ardından dişleri fırçalamak", "Sosyal medya; bekleme salonu"],
            ["Plakları temiz ve kokusuz tutmak", "Durulama, nazik temizlik, sıcak suyun neden zararlı olduğu", "Tedavi başlangıç mesajı"],
            ["Ataşmanlar ne işe yarar?", "Plağın dişi kavramasına yardım eden diş renginde küçük çıkıntılar", "Ataşman randevusundan önce"],
            ["Yeni plak sıkıyor", "Bir iki gün baskı hissi olağandır; ne zaman klinik aranmalı", "Sosyal medya; takip mesajı"],
            ["Pekiştirme plağı neden gerekli?", "Dişler eski yerine dönme eğilimindedir; plak sonucu korur", "Tedavi sonu mesajı"],
          ],
        },
      },
      {
        heading: "Şeffaf plak videolarında hangi ifadelerden kaçınmalı?",
        paragraphs: [
          "Şeffaf plaklar üretici firmalar tarafından yoğun biçimde pazarlanır ve klinik videoları bu dili farkında olmadan taklit edebilir. Oysa kliniğin paylaşımı, sağlık hizmeti tanıtımı olarak değerlendirilir. Kuralların genel çerçevesi için [diş hekimi reklam yasağı rehberine](guide:dis-hekimi-reklam-yasagi) bakın; aşağıdaki kalıplardan hemen her yerde kaçınmak gerekir.",
        ],
        table: {
          caption: "Şeffaf plak ifadeleri: riskli ve daha güvenli",
          columns: ["Riskli ifade", "Neden sorunlu", "Daha güvenli ifade"],
          rows: [
            ["“Tamamen görünmez”", "Kesin iddia; plaklar daha az fark edilir, görünmez değildir", "“Şeffaftır ve sabit tellere göre çok daha az fark edilir”"],
            ["“Altı ayda düz dişler”", "Vakaya ve hastaya bağlı bir sonucu ve süreyi vaat eder", "“Tedavi süresi dişlerinize göre değişir; muayeneden sonra anlatırız”"],
            ["“Hekime gitmeden tedavi”", "Yanıltıcıdır; şeffaf plak tedavisi hekim takibi gerektirir", "“Düzenli kontrollerle dişlerinizin nasıl hareket ettiğini takip ederiz”"],
            ["Marka adı başlıkta", "Bilgilendirmeyi ürün tanıtımına çevirir", "Markayı değil tedaviyi anlatmak"],
            ["Hastaların önce-sonra gülüşleri", "Tanıtım kurallarına takılabilir ve açık rıza gerektirir", "Aşamaları model ya da çizimle göstermek"],
          ],
        },
        after: [
          "Açıklama metinlerini paylaşmadan önce ücretsiz [“Bu paylaşım yasak mı?” aracımızla](checker:) kontrol edin. Hasta fotoğrafı kullanmayı düşünüyorsanız önce KVKK kapsamındaki açık rıza gerekliliğini gözden geçirin.",
        ],
      },
      {
        heading: "Şeffaf plak videosunun senaryosu nasıl kurulur?",
        ordered: true,
        paragraphs: ["Beş adım her videoyu kısa ve tek bir konuya odaklı tutar:"],
        list: [
          "Gerçek bir anla açılış: “Plaklarınızdan gelen o kokuyu siz de fark ettiniz mi?”",
          "Nedeni tek cümlede: plaklar fırçalamadan geri takıldığında bakteriler birikir.",
          "Alışkanlık: durulayın, plakları takmadan önce dişlerinizi fırçalayın, plakları nazikçe temizleyin.",
          "Sınır: bir yer acıyorsa ya da plak çatladıysa beklemeden kliniği arayın.",
          "Davet: “Plaklarınızla ilgili sorularınızı bir sonraki kontrolde bize sorun.”",
        ],
      },
      {
        heading: "Şeffaf plak videoları ne zaman paylaşılmalı ya da gönderilmeli?",
        paragraphs: [
          "Şeffaf plak videoları iki işe birden yarar. Sosyal medyada tedaviyi düşünen kişilere günlük hayatın plakla nasıl geçtiğini gösterir; bu, bir vaatten daha ikna edici ve çok daha güvenlidir. Hastanın telefonunda ise ekibinizin telefonda yanıtladığı rutin soruları azaltır. Takma süresi ve temizlik videolarını tedavi başlarken, sıkan plak videosunu ikinci ya da üçüncü plakla birlikte, pekiştirme plağı videosunu da tedavinin sonuna doğru gönderin.",
          "Kliniğiniz haftada birkaç kez paylaşım yapıyorsa, koruyucu konuların yanında haftada bir şeffaf plak videosu yeterlidir. Videoları telefonla kendiniz çekmek isterseniz [diş hekimi videosu nasıl çekilir](guide:dis-hekimi-video-cekimi) rehberimiz adım adım anlatır.",
          "Ortodonti hastalarının önemli bir kısmı genç yetişkinler ve ebeveynlerdir. Ebeveynlere yönelik bir videoda, plakların çocuğun ya da gencin sorumluluğuna bırakılan bir tedavi olduğunu ve takma süresine uyulmazsa sürecin uzayabileceğini sade bir dille anlatmak, tedavi sırasında yaşanan pek çok sorunu önler.",
        ],
      },
      {
        heading: "Şeffaf plak videosunun açıklama metnine ne yazılmalı?",
        paragraphs: [
          "Videonun altındaki metin de videonun kendisi gibi tanıtım olarak okunur. Metni kısa ve bilgilendirici tutun: videodaki soruyu tekrarlayın, yanıtı tek cümlede özetleyin ve uygunluğun ancak muayeneden sonra belli olacağını belirterek bitirin. İndirim kodlarına, marka sloganlarına ve sonuç vaat eden etiketlere yer vermeyin.",
        ],
        list: [
          "İlk satırda videodaki soru, önizlemede görünsün diye.",
          "Tek cümlelik yanıt; “görünmez” ifadesi ve sonuç için süre vermeden.",
          "Sınırı belirten bir cümle: “Şeffaf plağın size uygun olup olmadığını muayeneden sonra konuşuruz.”",
          "Vaat içeren etiketler yerine konuyu anlatan sade etiketler.",
          "Profilde kliniğin unvanı, adresi ve iletişim bilgileri; tanıtımla değil bilgilendirmeyle sınırlı bir biyografi.",
        ],
      },
      {
        heading: "DentVideo şeffaf plak videolarını nasıl hazırlar?",
        paragraphs: [
          "Şeffaf plak tedavisini hizmetleriniz arasında belirtirseniz, [DentVideo](landing:) bu tür konuları haftalık videolarınıza ekler; kendi dilinizde ve renklerinizde seslendirir, altyazılar ve her senaryoyu size ulaşmadan önce kesin iddialar, süre vaatleri, marka tanıtımı ve klinik doğruluk açısından denetler. Her videoyu siz onaylar ve kendiniz paylaşırsınız. [Ödemeden önce canlı önizlemenizi görün](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Klinik videolarında şeffaf plak markası anılabilir mi?",
        a: "Hangi sistemi kullandığınızı bilgi olarak söylemek genellikle sorun değildir. Ancak markanın etrafında kurulan ve üreticinin sloganlarını kullanan bir video ürün reklamı gibi okunur; odağı tedaviye ve hastanın sorularına verin.",
      },
      {
        q: "Videolarda günlük takma süresi saat olarak verilmeli mi?",
        a: "Evet, kliniğinizin hastalarına verdiği talimat buysa. Bunu herkes için geçerli bir kural olarak değil, kliniğinizin önerisi olarak sunun ve izleyiciye kendi hekiminin talimatına uymasını hatırlatın.",
      },
      {
        q: "Hastaların plaklı selfie'leri kliniğin hesabında paylaşılabilir mi?",
        a: "Yalnızca hastanın bu kullanım için açık ve yazılı rızasıyla. Ayrıca hasta görüntüsü, hasta memnuniyeti üzerinden tanıtım gibi algılanabilir; şüphede kalırsanız göstermek yerine anlatın.",
      },
    ],
    sources: [RG, KVKK],
  },
  {
    locale: "tr",
    slug: "dis-beyazlatma-bilgilendirme-videolari",
    topic: "treatment-whitening",
    category: "treatments",
    ...DATES,
    sample: "beyazlatma-hassasiyet",
    title: "Diş beyazlatma bilgilendirme videoları: mitler, hassasiyet ve kaçınılacak tanıtım ifadeleri",
    seoTitle: "Diş beyazlatma bilgilendirme videoları",
    seoDescription: "Diş klinikleri için kısa beyazlatma videoları: mine mitleri, hassasiyet, kron ve dolgular, evde beyazlatma — önce-sonra ve kampanya içermeden.",
    description: "Hastaların diş beyazlatma hakkında sorduğu sorular, altı kısa video önerisi, beş adımlı senaryo ve estetik tedavilerde tanıtım kurallarına takılabilecek ifadeler.",
    h1: "Diş beyazlatma bilgilendirme videoları: ne çekmeli, neyi söylememeli?",
    intro:
      "Diş beyazlatma bilgilendirme videosu, beyazlatmayla ilgili tek bir soruyu — mineye zarar verir mi, sonrasında dişler neden hassaslaşır, kron ve dolguların rengi değişir mi, marketten alınan ürünler aynı mı — kısa ve altyazılı bir videoyla yanıtlar. Beyazlatma estetik bir tedavidir; klinik videolarının reklama en kolay kaydığı konu da budur. Bu nedenle iyi videolar bilgiyi verir, kararı muayeneye bırakır.",
    sections: [
      {
        heading: "Hastalar diş beyazlatma hakkında neler soruyor?",
        paragraphs: ["Beyazlatma soruları çoğunlukla güvenlik ve beklentiyle ilgilidir. Her biri kısa bir videoya dönüşebilir:"],
        list: [
          "Beyazlatma diş minesine zarar verir mi, mineyi inceltir mi?",
          "Beyazlatmadan sonra dişler neden hassaslaşır, bu ne kadar sürer?",
          "Kronlarım, laminalarım ya da dolgularım da beyazlar mı?",
          "Klinikten verilen plakla evde beyazlatma ile marketteki ürünler aynı mı?",
          "Beyazlatmadan sonra kahve ya da çay içebilir miyim?",
          "Sonuç ne kadar kalıcı olur?",
          "Hamilelikte ya da ergenlikte beyazlatma yapılır mı?",
          "Hekim neden önce dişlerimi muayene etmek istiyor?",
        ],
      },
      {
        heading: "Klinik hangi beyazlatma videolarını hazırlamalı?",
        paragraphs: ["Altı video, belirli bir ton ya da sonuç vaat etmeden soruların çoğunu yanıtlar."],
        table: {
          caption: "Altı beyazlatma videosu ve en çok işe yaradığı yer",
          columns: ["Video", "Yanıtladığı soru", "En çok işe yaradığı yer"],
          rows: [
            ["Beyazlatma ve mine: mit mi gerçek mi?", "Profesyonel beyazlatmanın mineye ne yaptığı ve ne yapmadığı", "Sosyal medya"],
            ["Beyazlatma sonrası hassasiyet", "Neden olduğu, genellikle geçici olduğu, neyin iyi geldiği", "Bakım mesajı; sosyal medya"],
            ["Kron ve dolgular beyazlamaz", "Mevcut restorasyonların neden planlamaya dahil edilmesi gerektiği", "Muayeneden önce"],
            ["Klinikte mi, marketten mi?", "Hekim kontrolü, plak uyumu ve ürünlerin farkı", "Sosyal medya; web sitesi"],
            ["Beyazlatmadan sonraki ilk günler", "Renkli yiyecek ve içecekler, sigara, ne zaman aranmalı", "Bakım mesajı"],
            ["Neden önce muayene?", "Önce çürük, diş eti sorunu ve restorasyonların değerlendirilmesi", "Web sitesi; bekleme salonu"],
          ],
        },
      },
      {
        heading: "Beyazlatma videolarında hangi ifadelerden kaçınmalı?",
        paragraphs: [
          "Estetik tedaviler, önce-sonra görselleri ve sonuç vaatleri açısından en çok dikkat çeken alandır. Türkiye'deki tanıtım yönetmeliğinin genel çerçevesi için [diş hekimi reklam yasağı rehberine](guide:dis-hekimi-reklam-yasagi) bakın. Beyazlatma videolarında şu kalıpları kullanmayın:",
        ],
        table: {
          caption: "Beyazlatma ifadeleri: riskli ve daha güvenli",
          columns: ["Riskli ifade", "Neden sorunlu", "Daha güvenli ifade"],
          rows: [
            ["“Sekiz ton beyaz” ya da “Hollywood gülüşü”", "Kişiden kişiye değişen bir sonucu vaat eder", "“Dişlerin ne kadar açılacağı başlangıç rengine bağlıdır”"],
            ["“Anında sonuç”", "Birkaç seans ya da gün gerekiyorsa yanıltıcıdır", "“Tedavinizin genellikle kaç seans sürdüğünü muayenede anlatırız”"],
            ["“Hiç hassasiyet yapmaz”", "Geçici hassasiyet sık görülen bir yan etkidir", "“Bazı kişilerde geçici hassasiyet olabilir; nasıl hafifleteceğinizi anlatırız”"],
            ["Önce-sonra fotoğrafları", "Tanıtım kurallarına takılabilir ve açık rıza gerektirir", "Renk skalası ya da çizimle anlatmak"],
            ["“Yaz kampanyası” ya da indirim", "Sağlık hizmetinde fiyat ve kampanya duyurusu tanıtım kurallarına takılır", "Kampanya ve fiyatları sosyal medya videolarına koymamak"],
          ],
        },
        after: [
          "Bu ifadeleri paylaşmadan önce yakalamanın hızlı bir yolu ücretsiz [“Bu paylaşım yasak mı?” kontrol aracımızdır](checker:).",
        ],
      },
      {
        heading: "Beyazlatma 30 saniyede nasıl anlatılır?",
        ordered: true,
        paragraphs: ["Aynı beş adım her beyazlatma konusunda işe yarar:"],
        list: [
          "Mit ya da soruyla açılış: “Beyazlatma sonrası dişler daha hassas mı olur?”",
          "Bir iki cümlede sade yanıt, ton sayısı vermeden.",
          "Pratik ipucu: ilk günlerde nelerden kaçınmalı ya da hassasiyete ne iyi gelir.",
          "Sınır: kron ve dolgular rengini korur; sonuçlar kişiden kişiye değişir.",
          "Satış değil davet: “Beyazlatmanın dişlerinize uygun olup olmadığını bize sorun.”",
        ],
      },
      {
        heading: "Beyazlatma videoları ne zaman paylaşılmalı?",
        paragraphs: [
          "Beyazlatmaya ilgi düğün sezonundan, bayramlardan ve yaz tatilinden önce artar; bu dönemlerde daha fazla estetik içerik paylaşmak cazip gelir. Yine de dengeyi koruyun: yalnızca beyazlatmadan oluşan bir hesap reklam gibi görünür. Koruyucu konuların yanında ayda bir mit çürüten beyazlatma videosu makul bir ritimdir; estetik konuların yıl içinde nereye oturduğunu [içerik takvimi](guide:dis-klinigi-sosyal-medya-icerik-takvimi) gösterir.",
          "Bakım videosu sosyal medya dışında da değerlidir: tedavi günü hastaya gönderin, öneriler evde elinin altında olsun.",
          "Beyazlatma videoları kliniğinizin nasıl düşündüğünü göstermek için de iyi bir fırsattır. Önce çürük ve diş eti sorunlarına neden baktığınızı anlatan ve sonuçların kişiden kişiye değiştiğini açıkça söyleyen bir klinik, kusursuz bir ton vaat eden klinikten daha fazla güven kazanır — ve aynı zamanda kuralların doğru tarafında kalır.",
        ],
      },
      {
        heading: "Beyazlatma videoları muayenede nasıl kullanılır?",
        paragraphs: [
          "Beyazlatmayla ilgilenen hastalar muayeneye çoğu zaman sosyal medyada gördükleri, filtreyle düzenlenmiş gülüş görüntüleriyle gelir. Randevudan önce gönderilen kısa bir video gerçekçi beklentiler oluşturur: kron ve dolguların rengini koruduğunu, ulaşılabilecek açıklığın başlangıç rengine bağlı olduğunu ve geçici hassasiyet görülebileceğini anlatır. Böylece muayenede, yalnızca o hastanın durumuna özgü sorulara daha fazla zaman kalır.",
          "Muayeneden sonra hâlâ kararsız olan hastaya, görüşmenin kısa özetiyle birlikte mine mitini anlatan videoyu gönderebilirsiniz. Hasta bilgileri evde elinin altında olur ve kararını acele etmeden verir — bilgilendirmenin amacı da tam olarak budur.",
          "Aynı videolar ekibiniz için de bir ortak dil oluşturur: resepsiyonda telefonla beyazlatma soran birine videonun bağlantısını göndermek, tutarlı ve kurallara uygun bir yanıt vermenin kolay bir yoludur.",
        ],
      },
      {
        heading: "DentVideo beyazlatma videolarını nasıl hazırlar?",
        paragraphs: [
          "Yukarıdaki örnek, bir demo klinik için hazırlanmış gerçek bir DentVideo videosudur. Beyazlatma hizmetleriniz arasındaysa, [DentVideo](landing:) mit çürüten ve bakım odaklı konuları haftalık videolarınıza ekler; kendi dilinizde ve renklerinizde seslendirir, altyazılar ve her senaryoyu size ulaşmadan önce ton vaatleri, “anında” iddiaları, kampanya duyuruları ve klinik doğruluk açısından denetler. [Logonuzla hazırlanan önizlemeyi görün](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Diş kliniği beyazlatma önce-sonra fotoğrafı paylaşabilir mi?",
        a: "Hasta görüntüleri açık rıza gerektirir ve önce-sonra karşılaştırmaları sonuç vaadi gibi okunarak tanıtım kurallarına takılabilir. Hasta fotoğrafı içermeyen bilgilendirme videoları bu sorunu baştan ortadan kaldırır.",
      },
      {
        q: "Beyazlatma videolarında marketteki ürünlerden söz edilmeli mi?",
        a: "Evet, tarafsız biçimde: hekim kontrolündeki beyazlatma ile başka yerden alınan ürünler arasındaki farkı anlatın. Belirli ürünleri kötülemekten kaçının.",
      },
      {
        q: "Her hafta beyazlatma videosu paylaşmak doğru mu?",
        a: "Pek değil. Tek bir estetik tedavinin baskın olduğu bir hesap reklam gibi görünür. Beyazlatmayı koruyucu diş hekimliği, çocuk diş sağlığı ve günlük sorularla karıştırın.",
      },
      {
        q: "Beyazlatma sonrası hassasiyet videosunda ne söylenmeli?",
        a: "Hassasiyetin sık görülen ve genellikle geçici bir durum olduğunu, ilk günlerde çok sıcak ve çok soğuktan kaçınmanın yardımcı olabileceğini ve uzun sürerse kliniğin aranması gerektiğini söyleyin. Süre vermek yerine “genellikle birkaç gün içinde geçer” gibi ölçülü bir dil kullanın.",
      },
    ],
    sources: [RG],
  },
  {
    locale: "tr",
    slug: "cocuk-dis-sagligi-bilgilendirme-videolari",
    topic: "treatment-kids",
    category: "treatments",
    ...DATES,
    title: "Çocuk diş sağlığı bilgilendirme videoları: ebeveynlere yönelik konular, rıza ve kaçınılacaklar",
    seoTitle: "Çocuk diş sağlığı videoları: ebeveynler için",
    seoDescription: "Ebeveynlere yönelik kısa çocuk diş sağlığı videoları: ilk muayene, fırçalama, şeker, biberon, diş hekimi korkusu — rıza ve kaçınılacak ifadelerle.",
    description: "Ebeveynlerin çocuklarının dişleri hakkında sorduğu sorular, altı kısa video önerisi, diş hekimi korkusundan nasıl söz edileceği ve çocuk görüntüleri için rıza kuralları.",
    h1: "Çocuk diş sağlığı bilgilendirme videoları: ebeveynler için ne çekmeli?",
    intro:
      "Çocuk diş sağlığı bilgilendirme videosu çocuklara değil ebeveynlere yönelik kısa bir videodur ve çocuk dişleriyle ilgili tek bir soruyu yanıtlar: ilk diş hekimi muayenesi ne zaman, küçük bir çocuğun dişleri nasıl fırçalanır, şeker ve gece biberonu dişlere ne yapar, korkan bir çocuk muayeneye nasıl hazırlanır. İyi videolar sakin ve pratiktir, rıza olmadan gerçek çocuk göstermez ve ebeveynleri korkutarak randevuya yönlendirmez.",
    sections: [
      {
        heading: "Ebeveynler çocuklarının dişleri hakkında neler soruyor?",
        paragraphs: ["Ebeveynlerin soruları pratiktir ve çoğu zaman kaygılıdır. Her biri kısa ve rahatlatıcı bir video olabilir:"],
        list: [
          "Çocuğum ilk kez diş hekimine ne zaman gitmeli?",
          "Bebeğimin ya da küçük çocuğumun dişlerini nasıl fırçalarım, ne kadar diş macunu kullanırım?",
          "Çocuğumun biberonla uyuması sorun mu?",
          "Hangi atıştırmalıklar ve içecekler çocuk dişleri için daha zararlı?",
          "Diş çıkarma döneminde neler normal, ne zaman endişelenmeliyim?",
          "Çocuğum diş hekiminden korkuyor; muayeneden önce ne söylemeliyim?",
          "Fissür örtücü ve flor vernik nedir?",
          "Süt dişleri nasılsa dökülecek, yine de önemli mi?",
        ],
      },
      {
        heading: "Klinik hangi çocuk diş sağlığı videolarını hazırlamalı?",
        paragraphs: ["Bu altı video ebeveynlere yöneliktir; çocuğun ilk randevusundan önce gönderilen mesajda da sosyal medyada olduğu kadar işe yarar."],
        table: {
          caption: "Ebeveynlere yönelik altı video ve en çok işe yaradığı yer",
          columns: ["Video", "Yanıtladığı soru", "En çok işe yaradığı yer"],
          rows: [
            ["İlk diş hekimi ziyareti", "Ne zaman gelinmeli, neler olur — çoğunlukla bakmak ve tanışmak", "Sosyal medya; randevu onay mesajı"],
            ["Küçük dişleri fırçalamak", "Teknik, ebeveyn desteği, güncel öneriye uygun miktarda florürlü macun", "Sosyal medya; bekleme salonu"],
            ["Biberon ve gece içecekleri", "Gece süt ya da meyve suyunun dişlere neden zarar verdiği", "Sosyal medya"],
            ["Atıştırmalıklar ve sıklık", "Şekerin yalnızca miktarı değil sıklığı da önemlidir", "Sosyal medya; okul dönemi hatırlatması"],
            ["Korkan çocuğu hazırlamak", "İşe yarayan sözler ve ters tepen sözler", "Randevudan önce mesaj"],
            ["Fissür örtücü ve flor vernik", "Ne oldukları ve hekimin neden önerebileceği", "Web sitesi; takip mesajı"],
          ],
        },
        after: [
          "Diş macunu miktarı ve ilk muayene yaşı için güncel ulusal önerileri esas alın ve videoda bunları katı bir kural olarak değil, öneri olarak verin.",
        ],
      },
      {
        heading: "Çocuklarla ilgili videolarda nelerden kaçınmalı?",
        paragraphs: [
          "Çocuklar söz konusu olduğunda iki ek katman devreye girer: her çocuk görüntüsü için veliden alınacak açık rıza ve çocukların korunmasına yönelik genel hassasiyet. Çocuğun kişisel verisi, 6698 sayılı KVKK kapsamında veli rızası olmadan paylaşılmamalıdır. Tanıtım kurallarının genel çerçevesi için [diş hekimi reklam yasağı rehberine](guide:dis-hekimi-reklam-yasagi) bakın.",
        ],
        table: {
          caption: "Çocuk diş sağlığı videoları: riskli ve daha güvenli",
          columns: ["Riskli içerik ya da ifade", "Neden sorunlu", "Daha güvenli yaklaşım"],
          rows: [
            ["Klinikte koltukta gerçek bir çocuk", "Velinin açık ve yazılı rızasını gerektirir; çocuk kendisi rıza veremez", "Çizimler, oyuncaklar, yalnızca eller — ya da yüz göstermemek"],
            ["“Hiç acımayacak”", "Kesin bir vaat; çocuğun aklına acı fikrini de sokar", "“Diş hekimi dişlerini sayacak ve aletlerini sana gösterecek”"],
            ["Çürük süt dişlerinin korkutucu görüntüleri", "Korkuya dayalı mesaj; rahatsız edici olabilir", "Nedeni ve onu önleyen alışkanlığı anlatmak"],
            ["Çocuklara yönelik çekiliş ve yarışmalar", "Sağlık hizmeti tanıtımında risklidir", "Ebeveynlere pratik bilgiyle seslenmek"],
            ["“Çocuk muayenesinde indirim”", "Sağlık hizmetinde kampanya duyurusu tanıtım kurallarına takılır", "Fiyat ve kampanyaları sosyal medya videolarına koymamak"],
          ],
        },
        after: [
          "Ücretsiz [“Bu paylaşım yasak mı?” aracımız](checker:) açıklama metinlerindeki yaygın sorunlu ifadeleri paylaşımdan önce yakalar.",
        ],
      },
      {
        heading: "Diş hekimi korkusundan videoda nasıl söz edilir?",
        paragraphs: [
          "Ebeveynler iyi niyetle “korkma” ya da “hiç acımayacak” der; ancak ikisi de çocuğun aklına korku ve acı fikrini yerleştirir. Ebeveynlere yönelik kısa bir video daha sakin bir dil önerebilir: olacakları tarafsız sözcüklerle anlatmak (“diş hekimi dişlerini sayacak”), önceden diş hekimine gitmeyi anlatan bir resimli kitap okumak, çocuğun sevdiği oyuncağı yanına almasına izin vermek ve kendi kaygılarını çocuğa yansıtmamak.",
          "Bu tür videolar en çok paylaşılan klinik videoları arasındadır, çünkü ebeveynlere doğrudan yardım eder — ve kliniğinizin çocuklara nasıl yaklaştığını tek bir çocuk görüntüsü olmadan gösterir.",
        ],
      },
      {
        heading: "Ebeveynlere yönelik videolar ne zaman paylaşılmalı?",
        ordered: true,
        paragraphs: ["Çocuk konuları aile takvimini izler. Basit bir ritim:"],
        list: [
          "Okullar açılmadan önce: ilk ziyaret videosu ve fırçalama videosu.",
          "Şeker ve tatlının bol olduğu bayramlardan önce: atıştırmalık ve sıklık videosu.",
          "Bir çocuğun ilk randevusunu onaylayan mesajla birlikte: korkan çocuk videosu.",
          "Birkaç ayda bir: okul çağındaki çocukların ebeveynleri için fissür örtücü ve flor vernik videosu.",
        ],
        after: [
          "[52 haftalık içerik takvimi](guide:dis-klinigi-sosyal-medya-icerik-takvimi) bu konuları yılın geri kalanıyla birlikte planlar; bekleme salonunda kullanım için [hasta bilgilendirme videoları rehberine](guide:hasta-bilgilendirme-videolari) bakın.",
        ],
      },
      {
        heading: "Ebeveynlere yönelik paylaşımın metni nasıl olmalı?",
        paragraphs: [
          "Ebeveynler çocuk diş sağlığı paylaşımlarını çoğu zaman kucaklarında bir çocukla, aceleyle okur. Bu yüzden metni özellikle kısa ve somut tutun: bir soru, bir yanıt, evde uygulanacak bir ipucu. Hitabı ebeveyne yapın (“çocuğunuz”), çocuğa değil. Çizgi film karakterlerine, çekilişlere ve doğrudan çocuklara seslenen kampanyalara, klinikten çocuk fotoğraflarına yer vermeyin.",
          "Ebeveynlerin kendini tanıdığı gündelik anlar özellikle işe yarar: biberonla uykuya dalma, akşam diş fırçalama inadı, kutlamalardan sonraki şekerler. Ebeveynler bu tür paylaşımları sonra bakmak için kaydeder ve diğer ebeveynlerle paylaşır; böylece kliniğiniz, reklam yapmadan, ailelerin aklında yararlı bilgi veren yer olarak kalır.",
        ],
      },
      {
        heading: "DentVideo çocuk diş sağlığı videolarını nasıl hazırlar?",
        paragraphs: [
          "Çocuk diş hekimliğini hizmetleriniz arasında belirtirseniz, [DentVideo](landing:) ebeveynlere yönelik bu tür konuları haftalık videolarınıza ekler. Videolarda avatar çocuklar ya da gerçek hastalar yoktur — görüntüler nesnelerle sınırlıdır — ve her senaryo size ulaşmadan önce kesin vaatler, korkutucu ifadeler ve klinik doğruluk açısından denetlenir. Her videoyu siz onaylarsınız. [Kliniğinizin logosuyla canlı önizlemeyi görün](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Klinikte tedavi edilen çocukların fotoğraflarını paylaşabilir miyim?",
        a: "Yalnızca velinin bu kullanım için açık ve yazılı rızasıyla; pek çok klinik bundan tamamen vazgeçer. Ebeveynlere yönelik videolar ekranda hiç çocuk olmadan da iyi işler.",
      },
      {
        q: "Çocuk diş sağlığı videoları çocuklara mı ebeveynlere mi hitap etmeli?",
        a: "Ebeveynlere. Randevuyu alan onlardır ve sağlık hizmeti tanıtımında doğrudan çocukları hedefleyen içerikler ayrıca hassastır.",
      },
      {
        q: "Çocuk ilk kez diş hekimine ne zaman gitmeli?",
        a: "Öneriler genellikle ilk dişlerin çıktığı dönemi ya da bir yaş civarını işaret eder. Videoda tek bir evrensel yaş yerine güncel ulusal öneriyi belirtin.",
      },
      {
        q: "Çocuk diş sağlığı videoları bekleme salonunda gösterilebilir mi?",
        a: "Evet, özellikle fırçalama ve atıştırmalık videoları bekleme salonu için uygundur. Ses çoğu zaman kapalı olacağından altyazının büyük ve okunaklı olmasına, videoların kısa tutulmasına ve hiçbir çocuğun tanınabilir biçimde görünmemesine dikkat edin.",
      },
    ],
    sources: [KVKK],
  },
  {
    locale: "tr",
    slug: "dis-eti-hastaligi-bilgilendirme-videolari",
    topic: "treatment-gum-disease",
    category: "treatments",
    ...DATES,
    sample: "dis-tasi-temizligi",
    title: "Diş eti hastalığı bilgilendirme videoları: kanayan diş eti, periodontitis, diş taşı ve kaçınılacak ifadeler",
    seoTitle: "Diş eti hastalığı bilgilendirme videoları",
    seoDescription: "Kısa diş eti videoları: kanayan diş eti, diş taşı temizliği, gingivitis ve periodontitis, bakım — korkutucu iddia ve görüntüler olmadan.",
    description: "Hastaların diş eti hastalığı hakkında sorduğu sorular, altı kısa video önerisi, genel sağlıkla bağlantıların korkutmadan nasıl anlatılacağı ve kaçınılacak ifadeler.",
    h1: "Diş eti hastalığı bilgilendirme videoları: ne çekmeli, neyi söylememeli?",
    intro:
      "Diş eti hastalığı bilgilendirme videosu, diş eti sağlığıyla ilgili tek bir konuyu — diş etinin neden kanadığını, diş taşının neden temizlenmesi gerektiğini, gingivitis ile periodontitis arasındaki farkı, tedaviden sonra düzenli kontrolün önemini — kısa ve sakin bir videoyla anlatır. Diş eti hastalığı yaygındır ve erken döneminde çoğu zaman acı vermez. Bu yüzden bu videolar hastanın belirtileri erken fark etmesine yardım eder; amaçları korkutmak değil, bilgilendirmektir.",
    sections: [
      {
        heading: "Hastalar diş eti hastalığı hakkında neler soruyor?",
        paragraphs: ["Pek çok hasta diş eti hastalığı olduğunu ancak muayenede öğrenir. Soruları iyi bir konu listesidir:"],
        list: [
          "Fırçalarken diş etim kanıyor; o bölgeyi fırçalamayı bırakmalı mıyım?",
          "Gingivitis ile periodontitis arasındaki fark nedir?",
          "Diş eti hastalığı geri döndürülebilir mi?",
          "Diş taşı temizliği ve derin temizlik sırasında neler olur?",
          "Neden artık daha sık kontrole gelmem gerekiyor?",
          "Sigara diş etlerimi nasıl etkiler?",
          "Diş eti hastalığının diyabet ya da başka hastalıklarla ilgisi var mı?",
          "Diş aralarını nasıl doğru temizlerim?",
        ],
        after: [
          "İlk soru hem en sık sorulan hem de yanıtlanması en faydalı olandır: birçok kişi kanayan bölgeyi daha az fırçalar ve bu genellikle durumu kötüleştirir. “Nazikçe temizlemeye devam edin ve kontrole gelin” diyen 30 saniyelik bir video doğrudan işe yarar.",
        ],
      },
      {
        heading: "Klinik hangi diş eti videolarını hazırlamalı?",
        paragraphs: ["Bu altı video ilk belirtiden uzun süreli bakıma kadar olan yolu kapsar:"],
        table: {
          caption: "Altı diş eti videosu ve en çok işe yaradığı yer",
          columns: ["Video", "Yanıtladığı soru", "En çok işe yaradığı yer"],
          rows: [
            ["Kanayan diş eti: bir uyarı işareti", "Diş etinin neden kanadığı ve nazikçe fırçalamaya neden devam edilmesi gerektiği", "Sosyal medya"],
            ["Diş taşı neden temizlenmeli?", "Fırçanın ulaşamadığı sertleşmiş plak ve diş etine etkisi", "Sosyal medya; bekleme salonu"],
            ["Gingivitis mi, periodontitis mi?", "Erken ve geri döndürülebilir evre ile daha derin evre", "Sosyal medya; web sitesi"],
            ["Diş arası temizliği", "Hekimin önerisine göre ara yüz fırçası ya da diş ipi", "Bekleme salonu; sosyal medya"],
            ["Kontroller neden önemli?", "Diş eti hastalığı tedaviden sonra da düzenli bakım ister", "Kontrol hatırlatması"],
            ["Sigara ve diş etleri", "Sigaranın kanamayı nasıl gizleyebildiği ve iyileşmeyi nasıl etkileyebildiği", "Sosyal medya"],
          ],
        },
      },
      {
        heading: "Diş eti videolarında hangi ifadelerden kaçınmalı?",
        paragraphs: [
          "Diş eti hastalığı, korkuya dayalı pazarlamanın en cazip olduğu konudur: rahatsız edici fotoğraflar, diş kaybı tehdidi, kalp hastalığıyla ilgili büyük iddialar. Sağlık hizmeti tanıtımında yanıltıcı ve korkutucu içerik risklidir; genel çerçeve için [diş hekimi reklam yasağı rehberine](guide:dis-hekimi-reklam-yasagi) bakın.",
        ],
        table: {
          caption: "Diş eti ifadeleri: riskli ve daha güvenli",
          columns: ["Riskli ifade ya da içerik", "Neden sorunlu", "Daha güvenli yaklaşım"],
          rows: [
            ["İleri diş eti hastalığının yakın çekim fotoğrafları", "Rahatsız edicidir ve izleyiciyi uzaklaştırır", "Çizimler ya da belirtilerin sakin bir anlatımı"],
            ["“Diş eti hastalığı kalp krizine yol açar”", "Basit bir neden-sonuç değil, ilişki gösteren araştırmaları abartır", "“Araştırmalar diş eti sağlığıyla bazı genel sağlık sorunları arasında ilişki gösteriyor; sizin için ne anlama geldiğini bize sorun”"],
            ["“Dişleriniz dökülecek”", "Korkuya dayalıdır ve her hasta için doğru değildir", "“Tedavi edilmezse dişlerde sallanmaya yol açabilir; erken fark edilirse çoğu zaman iyi yönetilebilir”"],
            ["“Diş eti hastalığını kalıcı olarak tedavi ediyoruz”", "Periodontitis genellikle sürekli bakım gerektirir", "“Tedavi ve düzenli kontrollerle kontrol altında tutulabilir”"],
            ["“Ağrısız derin temizlik”", "Hastanın ne hissedeceğine dair kesin bir iddia", "“Genellikle lokal anestezi altında yapılır; neler olacağını anlatırız”"],
          ],
        },
        after: [
          "Açıklama metinlerini paylaşmadan önce ücretsiz [“Bu paylaşım yasak mı?” aracımıza](checker:) yapıştırın; “ağrısız”, garanti ve benzeri ifadeleri on dilde yakalar.",
        ],
      },
      {
        heading: "Diş eti videosunun senaryosu nasıl kurulur?",
        ordered: true,
        paragraphs: ["Aynı beş adım her videoyu sakin ve kısa tutar:"],
        list: [
          "Hastalıkla değil belirtiyle açılış: “Fırçalarken lavaboda pembe bir iz mi görüyorsunuz?”",
          "Tek cümlede açıklama: kanama çoğu zaman diş etinin diş eti kenarındaki plağa tepkisidir.",
          "Alışkanlık: nazikçe fırçalamaya devam edin, diş aralarını temizleyin, o bölgeyi atlamayın.",
          "Sınır: kanama bir iki haftadan uzun sürüyorsa muayene gerekir.",
          "Davet: “Diş etlerinize birlikte bakalım, kontrol randevusu alın.”",
        ],
      },
      {
        heading: "Diş eti videoları ne zaman paylaşılmalı?",
        paragraphs: [
          "Diş eti sağlığı her aya uyar; ağız ve diş sağlığıyla ilgili farkındalık günlerini [içerik takvimimizde](guide:dis-klinigi-sosyal-medya-icerik-takvimi) bulabilirsiniz. Bir seriye kanayan diş eti videosuyla başlayın; izleyicilerin çoğu kendini en çok onda tanır. Derin temizlik videosunu randevudan önce, kontrol videosunu ise hatırlatma mesajıyla gönderin.",
          "Diş eti konuları, estetik tedavilerin ağır bastığı bir hesabı da dengeler. Koruyucu, tedavi ve ekip içeriklerini karıştıran dengeli bir ay için [diş hekimi Instagram paylaşım fikirleri](guide:dis-hekimi-instagram-paylasim-fikirleri) rehberine bakın.",
          "Diş eti konularında en inandırıcı yüz çoğu zaman ekipteki hekim ya da asistandır. Ekibinizden birinin modelde ara yüz fırçası kullanımını gösterdiği kısa bir klip, herhangi bir rahatsız edici görüntüden daha ikna edicidir ve hastalardan gelmelerini istediğiniz kontrollere tanıdık bir yüz kazandırır.",
        ],
      },
      {
        heading: "DentVideo diş eti videolarını nasıl hazırlar?",
        paragraphs: [
          "Yukarıdaki örnek — “Diş taşı diş etlerinizi sessizce nasıl tehdit eder?” — bir demo klinik için hazırlanmış gerçek bir DentVideo videosudur. [DentVideo](landing:) diş eti sağlığı konularını sunduğunuz hizmetlerden planlar, kendi dilinizde ve renklerinizde seslendirir, altyazılar ve her senaryoyu size ulaşmadan önce korkutucu ifadeler, abartılı sağlık iddiaları, “ağrısız” vaatleri ve klinik doğruluk açısından denetler. Rahatsız edici görüntü kullanılmaz; görüntüler nesnelerle sınırlıdır. [Canlı önizlemenizi görün](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Klinik, diş eti hastalığının diyabet ya da kalp hastalığıyla ilişkili olduğunu söyleyebilir mi?",
        a: "Dikkatle. Araştırmalar diş eti sağlığıyla bazı genel hastalıklar arasında ilişki gösteriyor, ancak basit bir neden-sonuç ilişkisi değil. Neden belirtmek yerine ilişkiden söz edin ve hastayı hekimiyle konuşmaya davet edin.",
      },
      {
        q: "Paylaşımda diş eti hastalığı fotoğrafı göstermek uygun mu?",
        a: "İleri hastalığın klinik fotoğrafları rahatsız edici olabilir ve hastaya aitse açık rıza gerektirir. Çizimler ya da belirtilerin açık bir anlatımı genellikle daha iyi sonuç verir.",
      },
      {
        q: "Klinik diş eti sağlığı hakkında ne sıklıkla paylaşım yapmalı?",
        a: "Birkaç haftada bir diş eti videosu, hesabınıza hâkim olmadan konuyu görünür tutar. Diş arası temizliği gibi koruyucu konularla birlikte paylaşın.",
      },
      {
        q: "Diş eti videolarını kim sunmalı?",
        a: "Çoğu zaman hastaları kontrollerde gören hekim ya da asistan en inandırıcı yüzdür. Kamera karşısına geçmek istemeyen biri, yalnızca modelde ara yüz fırçası kullanan ellerini gösterebilir.",
      },
      {
        q: "Diş taşı temizliği videosunda neyi anlatmak gerekir?",
        a: "Diş taşının fırçayla çıkmayan sertleşmiş plak olduğunu, diş etini tahriş edebildiğini ve temizliğin hekim tarafından yapıldığını anlatın. Temizlikten sonra kısa süreli hassasiyet olabileceğini de belirtin; “acısız” gibi kesin ifadelerden kaçının.",
      },
    ],
    sources: [RG],
  },
  {
    locale: "tr",
    slug: "kanal-tedavisi-bilgilendirme-videolari",
    topic: "treatment-root-canal",
    category: "treatments",
    ...DATES,
    title: "Kanal tedavisi bilgilendirme videoları: süreç, korku, mitler ve kaçınılacak ifadeler",
    seoTitle: "Kanal tedavisi hasta bilgilendirme videoları",
    seoDescription: "Kısa kanal tedavisi videoları: işlem nasıl yapılır, neden kron gerekebilir, sonrası, mitler — kesin vaatler ve korkutucu dil olmadan.",
    description: "Hastaların kanal tedavisi hakkında sorduğu sorular, altı kısa video önerisi, kanal tedavisi korkusu ve mitlerle nasıl başa çıkılacağı ve kaçınılacak ifadeler.",
    h1: "Kanal tedavisi bilgilendirme videoları: ne çekmeli, neyi söylememeli?",
    intro:
      "Kanal tedavisi bilgilendirme videosu, tedavinin bir bölümünü — neden gerektiğini, koltukta neler olduğunu, sonrasında nelerin beklenebileceğini, neden çoğu zaman kron gerektiğini — kısa ve sakin bir videoyla anlatır. Kanal tedavisinin ünü, pek çok hastanın sonradan anlattığı deneyimden daha kötüdür. Bu yüzden en çok işe yarayan videolar mitlerin yerine sade gerçekleri koyar, ama kimsenin hiçbir şey hissetmeyeceğini vaat etmez.",
    sections: [
      {
        heading: "Hastalar kanal tedavisi hakkında neler soruyor?",
        paragraphs: ["Kanal tedavisiyle ilgili soruların çoğu korkudan ya da duyulan hikâyelerden gelir. Her biri iyi bir kısa video olur:"],
        list: [
          "Neden kanal tedavisi gerekiyor, dolgu yetmez mi?",
          "Kanal tedavisi acıtır mı?",
          "Tedavi sırasında tam olarak neler oluyor?",
          "Kaç seans sürüyor?",
          "Sonrasında neden kron gerekiyor?",
          "Sonraki günlerde neler hissedebilirim?",
          "Dişi çektirmek daha kolay olmaz mı?",
          "Kanal tedavili dişin hastalık yaptığı doğru mu?",
        ],
        after: [
          "Google'da “kanal tedavisi korkusu nasıl yenilir” gibi aramaların bulunması, hastaların bu konuda bilgiye ihtiyaç duyduğunu gösterir. Kliniğin sakin bir videosu, internetteki korkutucu anlatımlara iyi bir karşılıktır.",
        ],
      },
      {
        heading: "Klinik hangi kanal tedavisi videolarını hazırlamalı?",
        paragraphs: ["Bu altı video, teşhisten bakıma kadar hastaya eşlik eder:"],
        table: {
          caption: "Altı kanal tedavisi videosu ve en çok işe yaradığı yer",
          columns: ["Video", "Yanıtladığı soru", "En çok işe yaradığı yer"],
          rows: [
            ["Neden kanal tedavisi?", "İltihaplı ya da enfekte diş sinirleri ve dişi koruma amacı", "Sosyal medya; web sitesi"],
            ["Koltukta neler olur?", "Lokal anestezi, kanalların temizlenmesi, doldurulması ve kapatılması", "Randevudan önce mesaj"],
            ["Tek seans mı, birkaç seans mı?", "Bunun dişe ve enfeksiyona göre neden değiştiği", "Randevudan önce mesaj"],
            ["Neden çoğu zaman kron gerekir?", "Tedaviden sonra arka dişin korunması", "Takip mesajı"],
            ["Sonraki günler", "Hassasiyet, öbür taraftan çiğneme, ne zaman aranmalı", "Bakım mesajı"],
            ["Kanal tedavisi mitleri", "Yaygın hikâyeler ve diş hekimliği kuruluşlarının görüşü", "Sosyal medya"],
          ],
        },
      },
      {
        heading: "Kanal tedavisi videolarında hangi ifadelerden kaçınmalı?",
        paragraphs: [
          "“Ağrısız kanal tedavisi”, diş hekimi paylaşımlarında en sık görülen sorunlu ifadelerden biridir. Hastanın ne hissedeceğine dair kesin vaatler tanıtım kurallarına takılabilir; genel çerçeve için [diş hekimi reklam yasağı rehberine](guide:dis-hekimi-reklam-yasagi) bakın.",
        ],
        table: {
          caption: "Kanal tedavisi ifadeleri: riskli ve daha güvenli",
          columns: ["Riskli ifade", "Neden sorunlu", "Daha güvenli ifade"],
          rows: [
            ["“Ağrısız kanal tedavisi”", "Hiçbir kliniğin herkes için tutamayacağı kesin bir vaat", "“Lokal anestezi altında yapılır; pek çok hasta dolguya benzer bir deneyim olarak anlatır”"],
            ["“Dişinizi ömür boyu kurtarır”", "Kalıcı bir sonuç vaat eder", "“Amaç kendi dişinizi korumaktır; iyi bir restorasyon ve bakımla uzun süre kullanılabilir”"],
            ["“Kanal tedavisi ya da dişinizi kaybedersiniz!”", "Korkuyla baskı kurar", "“Diğer seçenek genellikle dişin çekilmesidir; iki yolu da anlatırız”"],
            ["Açılmış bir dişin rahatsız edici görüntüleri", "Korkuyu azaltmak yerine artırır", "Dişin katmanlarını gösteren bir çizim"],
            ["“Hiçbir şey hissetmedim” gibi hasta sözleri", "Hasta memnuniyeti üzerinden tanıtım sayılabilir", "Anesteziyi kendi cümlelerinizle anlatmak"],
          ],
        },
        after: [
          "Ücretsiz [“Bu paylaşım yasak mı?” aracımız](checker:) “ağrısız” ve benzeri sözcükleri paylaşımdan önce işaretler.",
        ],
      },
      {
        heading: "Kısa bir videoyla kanal tedavisi korkusu nasıl azaltılır?",
        paragraphs: [
          "Korku, hastanın hayal ettiği ile gerçekte olan arasındaki boşlukta büyür. İyi bir kanal tedavisi videosu bu boşluğu daraltır: ilk saniyede kaygıyı adıyla söyler, adımları tarafsız bir dille anlatır ve hasta tedavi sırasında bir şey hissederse ne yapabileceğini söyler (elini kaldırır, hekim durur). Hiçbir şey hissetmeyeceğini vaat etmez.",
          "Mit videosu özen ister. Bazı hastalar kanal tedavili dişlerin hastalığa yol açtığını okumuştur. Ana akım diş hekimliği kuruluşları bu iddianın bugünkü bilgilerle desteklenmediğini belirtir. Bunu söyleyebilir, açıklamaya güvenilir bir kaynak ekleyebilir ve soran kimseyle alay etmekten kaçınabilirsiniz.",
        ],
        ordered: true,
        list: [
          "Açılış: “Kanal tedavisi en kötüsü mü? Aslında böyle oluyor.”",
          "Nedeni tek cümlede: dişin içi iltihaplanmış ya da enfekte olmuştur.",
          "Üç adım: uyuşturma, kanalların temizlenmesi, doldurma ve kapatma.",
          "Dürüst bir sınır: diş birkaç gün hassas olabilir.",
          "Davet: “Randevunuzdan önce merak ettiğiniz her şeyi sorun.”",
        ],
      },
      {
        heading: "Kanal tedavisi videoları en çok nerede işe yarar?",
        paragraphs: [
          "Sosyal medyadan çok onun dışında. En değerli an, kanal tedavisi randevusunu onaylayan mesajdır: hastanın evde izleyebileceği 40 saniyelik bir açıklama kaygıyı azaltır ve randevu iptallerinin önüne geçebilir. Bakım videosu aynı gün gönderilen takip mesajına aittir. Sosyal medyada ise mit videosu ve neden kanal tedavisi videosu dengeli bir karışımın parçası olarak iyi işler — [diş hekimi Instagram paylaşım fikirleri](guide:dis-hekimi-instagram-paylasim-fikirleri) ve [hasta bilgilendirme videoları](guide:hasta-bilgilendirme-videolari) rehberlerine bakın.",
          "Kendi yüzünüzle kısa bir açıklama çekmek isterseniz, kanal tedavisi bunun için çok uygun bir konudur: hastalar kendilerini tedavi edecek hekimin sakin sesini duyduğunda daha rahat hisseder. Telefonla çekim için [diş hekimi videosu nasıl çekilir](guide:dis-hekimi-video-cekimi) rehberindeki adımları izleyebilirsiniz.",
        ],
      },
      {
        heading: "Kaygılı hastalara randevu öncesinde ne gönderilmeli?",
        paragraphs: [
          "Kaygılı hastalar için kliniğe gelmek bile başlı başına bir eşiktir. Evde sakin bir ortamda izlenen kısa bir video, belirsizliğin bir kısmını önceden ortadan kaldırır: randevunun nasıl geçeceğini, yaklaşık ne kadar süreceğini ve istendiği an ara verilebileceğini gösterir. Kliniğin kaygıyı ciddiye aldığını ve hastanın bunu randevuda rahatça söyleyebileceğini belirten bir cümle de çok işe yarar.",
          "“Merak etmeyin” gibi kalıplardan kaçının; bunlar kaygıyı gidermekten çok onaylar. Bunun yerine neler olacağını somut olarak anlatın ve videonun sonunda ara vermek için el kaldırma işaretini tekrarlayın.",
        ],
      },
      {
        heading: "DentVideo kanal tedavisi videolarını nasıl hazırlar?",
        paragraphs: [
          "Kanal tedavisi hizmeti veriyorsanız, [DentVideo](landing:) bu konuları haftalık videolarınıza ekler; kendi dilinizde ve renklerinizde seslendirir ve altyazılar. Her senaryo size ulaşmadan önce “ağrısız” ve diğer kesin iddialar, korkutucu dil, hasta sözleri ve klinik doğruluk açısından denetlenir; siz onaylamadan hiçbir şey yayımlanmaz. [Logonuzla canlı önizlemeyi görün](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Diş hekimi kanal tedavisinin acıtmadığını söyleyebilir mi?",
        a: "“Ağrısız” gibi kesin vaatlerden kaçının. Tedavinin lokal anestezi altında yapıldığını, pek çok hastanın bunu dolguya benzer bir deneyim olarak anlattığını ve sonrasında birkaç gün hassasiyet olabileceğini açıklayabilirsiniz.",
      },
      {
        q: "Videoda diş çekimi bir seçenek olarak anılmalı mı?",
        a: "Evet. Seçenekleri adil biçimde sunmak aydınlatılmış onamın parçasıdır ve videoyu daha güvenilir kılar. Kararın dişe bağlı olduğunu ve muayeneden sonra verildiğini anlatın.",
      },
      {
        q: "Kanal tedavisinin hastalık yaptığını iddia eden yorumlara nasıl yanıt verilmeli?",
        a: "Kibarca ve herkesin önünde tartışmaya girmeden: ana akım diş hekimliği kuruluşlarının bu iddiayı desteklemediğini söyleyin, güvenilir bir kaynak paylaşın ve kişiyi kaygılarını randevuda konuşmaya davet edin.",
      },
      {
        q: "Kanal tedavisi videosu ne kadar uzun olmalı?",
        a: "Sosyal medya için 20 ile 60 saniye arası ve tek bir soru yeterlidir. Randevu öncesi gönderilen açıklama videosu ise tüm adımları anlatan bir iki dakikalık bir video olabilir.",
      },
    ],
    sources: [RG],
  },
];
