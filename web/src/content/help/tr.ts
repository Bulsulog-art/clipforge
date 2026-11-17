import type { HelpContent } from "./types";

export const tr: HelpContent = {
  meta: {
    title: "DentVideo yardım merkezi: klinikler için yanıtlar",
    description: "DentVideo kullanan klinikler için adım adım yanıtlar: ilk videolar, onay, paylaşım, ayarlar, kayıtlar, ödeme, faturalar, gizlilik ve hesabınız.",
  },
  nav: "Yardım",
  h1: "Size nasıl yardımcı olabiliriz?",
  lead: "DentVideo kullanan klinikler için kısa yanıtlar: ilk video haftanızdan faturalara ve verilerinize kadar. Arayın ya da bir konu seçin.",
  search: {
    label: "Yardım merkezinde arayın",
    placeholder: "Örneğin: iptal, fatura, onay",
    none: "Bu aramaya uyan bir yanıt yok. Başka bir kelime deneyin ya da bize yazın.",
    count: { one: "1 yanıt", other: "{n} yanıt" },
  },
  topics: "Konular",
  categories: {
    start: "Başlarken",
    review: "İnceleme ve onay",
    posting: "Videolarınızı paylaşmak",
    settings: "Kliniğinizin videoları",
    recording: "Kendi kaydınız",
    billing: "Plan, ödeme ve faturalar",
    account: "Veriler, gizlilik ve hesabınız",
  },
  readMore: "Ayrıntılar:",
  shots: {
    setup: "Ayarlar: kliniğinizin bilgileri, logosu ve rengi.",
    week: "Videolar: bu haftanın videoları onayınızı bekliyor.",
    card: "“Göz atın” olarak işaretlenmiş bir video ve paylaşmadan önce neye bakmanız gerektiği.",
  },
  stuck: {
    title: "Hâlâ takıldığınız bir şey mi var?",
    body: "{email} adresine yazın. Her mesajı bir ekip üyemiz okur. Uygulamadan yazarsanız (Ayarlar → Yardım ve iletişim) klinik numaranız otomatik eklenir, hesabınızı hemen buluruz.",
  },
  articles: {
    "first-videos": {
      q: "İlk videolarım ne zaman gelir?",
      a: "İlk haftanızın videoları ödemeden hemen sonra hazırlanır, genellikle yaklaşık 15 dakika sürer. Videolar sayfası kendiliğinden yenilenir ve videolar incelemenize hazır olduğunda size e-posta göndeririz.\n\nSonrasında her pazartesi beş yeni video gelir ve her seferinde e-postayla haber veririz.",
    },
    "no-videos-this-week": {
      q: "Bu haftanın videoları henüz gelmedi. Ne yapmalıyım?",
      a: "Yeni videolar her pazartesi hazırlanır. Bu haftanınkiler kütüphanenizde henüz yoksa Videolar sayfasında “Bu haftanın videolarını hazırla”ya dokunun. Yaklaşık 15 dakika sürer.\n\nSayfada videoların geciktiği yazıyorsa zaten yeniden deniyoruz ve hazır olduklarında size yazacağız. Dilerseniz “Şimdi tekrar dene”ye de dokunabilirsiniz.\n\n“Hazırlanamadı” olarak işaretlenen bir video için sizin bir şey yapmanız gerekmez. Tekrar olursa bize yazın.",
    },
    topics: {
      q: "Konular nasıl seçiliyor, ben konu önerebilir miyim?",
      a: "Her hafta ayarlarınızdaki hizmetlerden ve hastaların bu hizmetlerle ilgili sorduğu sorulardan beş konu seçeriz. Videolar yalnızca sunduğunuz hizmetler hakkında hazırlanır; bu yüzden en önemlisi hizmet listenizin eksiksiz ve doğru olmasıdır.\n\nKonu önermek için Videolar sayfasında veya Ayarlar'da “Gelecek hafta için konu önerin” bölümünü kullanın: bir hasta sorusu ya da konu, en fazla 140 karakter. Bekleyen önerileri, hizmetlerinize uyduklarında ve her video gibi aynı klinik ve reklam kontrollerinden geçtiklerinde, haftada en fazla üç tane olmak üzere önce kullanırız. “Önerileriniz” bölümünde her birine ne olduğunu görürsünüz; hazırlanamayan bir önerinin yanında nedeni yazar. “Hazırlamadığımız konular” bölümünde dışarıda kalan diğer konuları görürsünüz.",

    },
    "sign-in": {
      q: "Giriş yapamıyorum ya da e-posta kodu gelmiyor.",
      a: "Spam veya promosyonlar klasörünüzde {email} adresinden gelen e-postaya bakın ve “spam değil” olarak işaretleyin, böylece sonrakiler gelen kutunuza düşer. Kod 15 dakika geçerlidir; giriş ekranından yeni kod isteyebilirsiniz.\n\nŞifrenizi mi unuttunuz? Giriş ekranında “Şifrenizi mi unuttunuz?”a dokunun. Hiç e-posta gelmiyorsa kaydolduğunuz adresle bize yazın.",
    },
    approve: {
      q: "Bir videoyu nasıl onaylarım?",
      a: "Siz onaylamadan hiçbir şey yayınlanmaz; onay yalnızca videoyu paylaşıma hazır olarak işaretler. Sizin adınıza asla paylaşım yapmayız.",
      steps: [
        "Videolar'ı açın ve “İzle ve onayla”ya dokunun.",
        "Her videoyu izleyin, sonra “Onayla”ya, uygun değilse “Reddet”e dokunun.",
        "Birden fazla video hazırsa “… videonun hepsini onayla” düğmesi hepsini tek dokunuşla onaylar. “Göz atın” işaretli videolar buna hiçbir zaman dahil edilmez.",
      ],
    },
    "needs-a-look": {
      q: "“Göz atın” ne anlama geliyor?",
      a: "Yazılım kontrolümüz o videoda bir kez daha okumanızı istediğimiz bir şeyi işaretledi; örneğin ülkenizin sağlık reklamı kurallarının katı yorumlayabileceği bir ifade. Nedeni kartta, “Paylaşmadan önce kontrol edin” başlığının altında yazar.\n\nVideoyu bu nedeni düşünerek izleyin. Kliniğinize uygunsa onaylayın, değilse kısa bir notla reddedin. İşaretli bir video siz olmadan asla onaylanmaz.",
    },
    "software-check": {
      q: "Yazılım kontrolü neye bakar, neye bakmaz?",
      a: "Siz bir metni görmeden önce yazılım onu iki kez kontrol eder: bir kez sağlık reklamı kurallarının sıklıkla kısıtladığı ifadeler açısından (sonuç vaatleri, “ağrısız”, “kalıcı”, üstünlük iddiaları, fiyatlar, kampanyalar, öncesi-sonrası vaatleri, hasta yorumları), bir kez de genel kabul görmüş klinik bilgilere göre. Geçemeyen metin yeniden yazılır ya da hiç hazırlanmaz; ikinci bir bakış gerektiren her şey nedeniyle birlikte işaretlenir.\n\nBu otomatik bir kontroldür. Hukuki görüş değildir, bir avukatın ya da meslek odanızın incelemesi yerine geçmez. Kurallar ülkeden ülkeye değişir ve zamanla güncellenir; bu yüzden son karar sizindir.",
    },
    responsibility: {
      q: "Paylaştıklarımızdan kim sorumlu?",
      a: "Kliniğiniz. Her videoyu siz onaylar ve kendi hesaplarınızdan paylaşırsınız; bu yüzden ülkenizin sağlık reklamı kuralları dahil yayınladıklarınızın sorumluluğu sizde kalır.\n\nYazılım kontrolü sık görülen sorunları fark etmenize yardım eder, ancak kendi değerlendirmenizin ya da hukuki görüşün yerini tutmaz. Bir konu ya da ifadeden emin değilseniz videoyu reddedin veya paylaşmadan önce meslek odanıza danışın.",
    },
    "wrong-video": {
      q: "Bir video hatalı. Ne yapabilirim?",
      a: "Onaylamayın: onaylanmayan bir video hiçbir yere gitmez. “Reddet”e dokunun, neyin yanlış olduğunu seçin, isterseniz bir not ekleyin. Notunuz videoyla birlikte ekibimize ulaşır.\n\nTek bir videonun değişmesini istiyorsanız kartındaki “Değişiklik iste”ye dokunun ve neyin farklı olması gerektiğini yazın. Yalnızca o video aynı kontrollerle yeniden hazırlanır ve paylaşmadan önce yeniden onaylarsınız. Haftada en fazla 3 değişiklik isteyebilirsiniz. Değiştirilmiş sürüm kontrollerden geçmezse mevcut videonuz olduğu gibi kalır ve kart bunu size söyler. Gelecekteki tüm videoları değiştirmek için (logo, renk, hizmetler, dil, ses) Ayarlar'ı kullanın.",

    },
    "background-photos": {
      q: "Bir videonun arka plan fotoğraflarını değiştirebilir miyim?",
      a: "Evet. Videonun kartında “Açıklama ve etiketler · Arka plan fotoğrafları”nı açın, bir ile dört arasında fotoğraf seçin ve “Uygula”ya dokunun. Video bu fotoğraflarla yeniden hazırlanır. Yeni hali hazır olana kadar kartta “Fotoğraflar güncelleniyor” yazar.",
    },
    share: {
      q: "Bir videoyu nasıl paylaşırım?",
      a: "Cihazınızda paylaşım çalışmazsa “İndir”e dokunun ve videoyu her zamanki gibi paylaşın. DentVideo sizin adınıza asla paylaşım yapmaz ve sosyal medya şifrelerinizi asla istemez; hesaplarınızı bir ajans ya da bir çalışma arkadaşınız yönetiyorsa onaylı videoları ona iletin.",
      steps: [
        "Onaylı bir videoyu açın ve “Paylaşın”a dokunun.",
        "Telefonda “Videoyu kaydet + açıklamayı kopyala”ya dokunun: video kaydedilir, açıklama metni etiketleriyle birlikte kopyalanır. Bilgisayarda ise video indirilir.",
        "Instagram, TikTok, Facebook ya da WhatsApp'ı açın, videoyu galerinizden seçin ve metni yapıştırın.",
        "DentVideo'ya dönüp “Paylaşıldı olarak işaretle”ye dokunun; böylece neyin kaldığını görürsünüz.",
      ],
    },
    instagram: {
      q: "Instagram'da Reels nasıl paylaşırım?",
      a: "Kliniğinizin hesabından paylaşın. Açıklama metni etiketleri zaten içerir; paylaşmadan önce kısaltabilir ya da değiştirebilirsiniz.",
      steps: ["DentVideo'da “Paylaşın”a dokunun, videoyu metniyle birlikte kaydedin.", "Instagram'da +'ya dokunun ve Reels'i seçin.", "Videoyu galerinizden seçin, metni yapıştırın ve paylaşın."],
    },
    "tiktok-shorts": {
      q: "TikTok'ta ya da YouTube Shorts'ta nasıl paylaşırım?",
      a: "“Paylaşın” ekranındaki daha kısa “TikTok · Shorts” metnini kullanın.\n\nTikTok: +'ya dokunun, videoyu galerinizden seçin, metni yapıştırın ve paylaşın.\n\nYouTube: YouTube uygulamasında +'ya dokunun ve videoyu galerinizden yükleyin. YouTube kısa dikey videoları Shorts olarak gösterir. Metni başlık ya da açıklama olarak yapıştırın.",
    },
    facebook: {
      q: "Facebook'ta nasıl paylaşırım?",
      a: "Videolar dikey MP4 dosyalarıdır; Facebook Reels'in kullandığı biçim budur.",
      steps: ["Kişisel profilinize değil, kliniğinizin sayfasına geçin.", "Bir Reels oluşturun ve videoyu seçin.", "Metni yapıştırın ve paylaşın."],
    },
    "google-business": {
      q: "Videoları Google İşletme Profilimize ekleyebilir miyim?",
      a: "DentVideo'nun Google ile doğrudan bir bağlantısı yok, ama kaydettiğiniz bir videoyu kendiniz yükleyebilirsiniz: Google Arama'da ya da Haritalar'da İşletme Profilinizi açın, fotoğraf veya video ekleyin ve dosyayı seçin.\n\nGoogle videoları yayınlamadan önce inceler ve yalnızca kısa klipleri kabul eder; güncel sınırları Google'ın kendi yardım sayfalarından kontrol edin. Bir video kabul edilmezse onu diğer kanallarınızda paylaşın. Etiketlerin orada bir etkisi yoktur, eklemeyin.",
    },
    "posting-times": {
      q: "Ne zaman paylaşmak iyi olur?",
      a: "Her onaylı videoda önerilen bir gün ve saat görünür. Haftanın videolarını pazartesiden cumaya yayarız; kliniğinizin bulunduğu ülkede insanların telefonlarına çok baktığı öğle ve akşam saatleri arasında dönüşümlü öneririz.\n\nBunlar kural değil, öneridir: düzenli paylaşmak tam dakikadan daha önemlidir. Kendi takipçilerinizin ne zaman çevrimiçi olduğunu Instagram ya da TikTok istatistikleriniz gösterir.",
    },
    captions: {
      q: "Videolarda altyazı var mı? Erişilebilir mi?",
      a: "Her video ana mesajlarını görüntünün içinde yazı olarak gösterir; böylece ses kapalıyken de takip edilebilir. Bu yazı, seslendirmenin kısa bir özetidir, kelimesi kelimesine döküm değildir.\n\nSeslendirmenin tamamı için “Paylaş” adımında video indirmenin yanındaki “Altyazıyı indir (.srt)”ye dokunun. Dosya, seslendirmenin birebir sözlerini içerir. Zamanlamalar seslendirmedeki duraklardan hesaplanır; yakındır ama kelimesi kelimesine değildir. Yüklemeden önce bir kez videoyla birlikte izleyin. Altyazı dosyaları gelmeden önce hazırlanan videoların ve kendi kayıtlarınızdan çıkan kliplerin .srt dosyası yoktur (klipler sözlerinizi zaten ekranda gösterir).\n\nYouTube ve Facebook, altyazı sundukları yerde videoyla birlikte .srt dosyası yüklemenize izin verir. Instagram ve TikTok altyazı dosyası kabul etmez: ana mesajlar zaten videoda yazılıdır; paylaşırken uygulamanın kendi otomatik altyazısını da açıp .srt dosyasındaki metinle düzeltebilirsiniz. Hiçbir yazının iki kez görünmediğini kontrol edin.",

    },
    "other-uses": {
      q: "Videoları web sitemizde ya da bekleme salonunda kullanabilir miyiz?",
      a: "Evet. Kliniğiniz için hazırlanan videoları kliniğinizin iletişiminde kullanabilirsiniz; örneğin web sitenizde, bir bültende ya da bekleme salonundaki ekranda. İndirdiğiniz videoları iptalden sonra da kullanmaya devam edebilirsiniz.\n\nBazı videolarda lisanslı stok görüntüler bulunur; bunlar yalnızca videonun parçası olarak kullanılabilir, tek başına kullanılamaz.",
    },
    "logo-colors": {
      q: "Logomuzu ya da marka rengimizi nasıl değiştiririm?",
      a: "Sonraki videolarınız yeni logoyu ve rengi kullanır. Daha önce hazırlanmış videolar eskilerini korur.",
      steps: [
        "Ayarlar'ı açın.",
        "“Logo ve renk” bölümünde yeni bir logo yükleyin (ideali şeffaf arka planlı bir PNG, en fazla 5 MB) ya da bir renk seçin.",
        "“Değişiklikleri kaydet”e dokunun.",
      ],
    },
    language: {
      q: "Videoların dilini ya da hastalara hitap şeklini değiştirebilir miyiz?",
      a: "Evet, Ayarlar'da: “Videolarınızın dili” ve “Hastalarınıza nasıl hitap ediyorsunuz” (siz ya da sen). Videolar İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca, Portekizce, Türkçe, Japonca, Arapça ve Lehçe hazırlanır.\n\nDeğişiklik sonraki videolarınızda geçerli olur. Uygulama da, o dilde mevcutsa, bu dile geçer.",
    },
    services: {
      q: "Ayarlar'daki hizmetler neden önemli?",
      a: "Videolar yalnızca “Sunduğunuz hizmetler” listesindeki tedaviler hakkında hazırlanır: listede olmayan bir tedaviye hiç video gelmez, sunmadığınız bir tedavi de hiç görünmez. Hizmetleri virgülle ayırın ya da hızlı ekleme düğmelerini kullanın.\n\n“Üslup” (sıcak, uzman, sakin ya da eğlenceli) metinlerin nasıl yazılacağını belirler. Değişiklikler sonraki videolarınızda geçerli olur.",
    },
    "narrator-voice": {
      q: "Seslendirmeyi seçebilir miyiz?",
      a: "Evet. Ayarlar'da “Seslendirme” altında kadın ya da erkek sesini seçin. Seslendirme, videolarınızın dilinde sentetik bir sestir ve bunu açıkça söyleriz.\n\nSeçim yeni videolarda geçerli olur; hazırlanmış videolar kendi seslerini korur. Kendi sesinizi istiyorsanız Practice planı kayıtlarınızı kliplere dönüştürür.",
    },
    "closing-line": {
      q: "Kapanış cümlesi nedir, benimki neden kabul edilmedi?",
      a: "Her gönderinin açıklamasının altına eklenen isteğe bağlı, sakin bir cümledir; örneğin “Diş etlerinizle ilgili sorularınızı bir sonraki kontrolünüzde sorabilirsiniz.” Boş bırakırsanız gönderilerinizde bizim kapanış cümlelerimiz kullanılır.\n\nKaydedilmeden önce cümle, videolarla aynı reklam kurallarına göre kontrol edilir. Sonuç vaat edemez, aceleye getiren bir dil kullanamaz, ünlem işareti içeremez, genel bir “bize ulaşın” olamaz ve ülkenizin kurallarının kısıtladığı yerde randevuya yönlendiremez. Alanın altındaki mesaj neyi değiştirmeniz gerektiğini söyler.",
    },
    record: {
      q: "Kendimi nasıl kaydederim? (Practice planı)",
      a: "Kaydınızı altyazılı ve logolu kısa kliplere böleriz, her klibi kontrol eder ve hazır olduğunda size e-posta göndeririz; genellikle 10 dakika içinde. Sözleriniz asla değiştirilmez; ikinci bir bakış gerektiren her şey işaretlenir.\n\nDosyalar: MP4, MOV veya WebM, en fazla 500 MB. Kayıtlar Practice planına dahildir; Starter'da Kayıt sayfası nasıl geçiş yapacağınızı gösterir. Kayıtta bir hasta görünüyor ya da duyuluyorsa önce o hastanın belgelenmiş onayını almanız gerekir.",
      steps: [
        "Kayıt'ı açın ve bu haftanın çekim kartlarından birini seçin.",
        "Telefonunuzu pencere yakınında göz hizasına yerleştirin ve kartı takip ederek bir ile on dakika arasında konuşun.",
        "Videoyu seçin, “Yükle ve klipleri hazırla”ya dokunun ve yükleme bitene kadar sayfayı açık tutun.",
      ],
    },
    plans: {
      q: "Starter ile Practice arasındaki fark ne, plan nasıl değiştirilir?",
      a: "İkisinde de her pazartesi beş seslendirilmiş, altyazılı video, yazılım kontrolü ve logonuzla renkleriniz vardır. Practice buna kendi kayıtlarınızdan hazırlanan klipleri ve ne çekeceğinizi söyleyen çekim kartlarını ekler. Güncel fiyatlar uygulamadaki plan ekranındadır.\n\nDeğiştirmek için Ayarlar → Plan ve faturalandırma → “Planı değiştir”i açın. Dönemin kalanı için fark aynı gün tahsil edilir ya da iade olarak hesabınıza yansır. Orada yalnızca “Bize e-posta gönderin” kartını görüyorsanız bize yazın, planınızı biz değiştirelim.",
    },
    invoices: {
      q: "Faturaları ve makbuzları nerede bulurum?",
      a: "Ödemeleri satıcı sıfatıyla (merchant of record) Dodo Payments yürütür: aboneliği size Dodo satar, kartınızdan tahsil eder, geçerli vergileri toplar ve faturayı düzenler. Kart ekstrenizde görünen ad da budur.\n\nHer ödemeden sonra e-postayla makbuz alırsınız; faturaları Ayarlar → Plan ve faturalandırma → “Ödemeleri yönet” bölümünden indirebilirsiniz. Faturayı Dodo düzenlediği için DentVideo ikinci bir fatura göndermez.",
    },
    "update-card": {
      q: "Ödeme yaptığımız kartı nasıl değiştiririz?",
      a: "Ayarlar → Plan ve faturalandırma'yı açın ve “Ödemeleri yönet”e dokunun. Kartı ödeme sağlayıcımızın güvenli portalında değiştirirsiniz; kart bilgilerinizin tamamını hiçbir zaman görmeyiz.\n\nDüğme görünmüyorsa bize yazın, size güvenli bir bağlantı gönderelim. Kart bilgilerini asla e-postayla göndermeyin.",
    },
    "payment-failed": {
      q: "Ödememiz başarısız oldu ve videolar duraklatıldı. Şimdi ne olacak?",
      a: "Videolarınız kütüphanenizde kalır ve paylaşmaya devam edebilirsiniz. Bir ödeme geçene kadar yalnızca yeni haftalık videolar durur.\n\nVideolar sayfasında ya da Ayarlar'da “Ödeme bilgilerini güncelle”ye veya “Güvenli bağlantı için bize yazın”a dokunun. Lütfen yeni plan satın almayın, iki kez ücretlendirilirsiniz. Kartınız çalıştığında haftalık videolarınız yeniden başlar.",
    },
    cancel: {
      q: "Nasıl iptal ederiz?",
      a: "Planlar aylıktır, taahhüt yoktur. Ayarlar → Plan ve faturalandırma → “Ödemeleri yönet”i açıp ödeme portalında iptal edin ya da bize yazın, sizin için biz yapalım.\n\nİptal bir sonraki ödemeyi durdurur; ödediğiniz dönemin sonuna kadar erişiminiz devam eder. Başlamış bir dönem için kısmi iade yapılmaz; yasanın gerektirdiği ya da hizmetin aksadığı durumlar hariç. Ayrıntılar İade Politikamızda.",
    },
    "after-cancel": {
      q: "İptalden sonra videolarımıza ne olur?",
      a: "Ödenen dönem bittiğinde yeni video hazırlanmaz. Kütüphaneniz bundan sonra 90 gün daha kalır: videolarınızı izlemeye, indirmeye ve paylaşmaya devam edebilirsiniz; tarih Videolar sayfasında yazar. Bu tarihten 14 gün ve 1 gün önce size e-posta göndeririz. 90 günün sonunda videolar, kayıtlar ve altyazı dosyaları silinir; ayarlarınız ve logonuz korunur.\n\nİndirdiğiniz videoları iptalden sonra da kullanabilirsiniz; saklamak istediklerinizi indirin ya da her şeyi tek seferde Ayarlar → Verileriniz → “Verilerimi indir” bölümünden indirin. Bu tarihten önce Videolar sayfasından yeniden plan seçerseniz her şey yerinde kalır. Hesabınızı silerseniz her şey hemen kaldırılır.",

    },
    group: {
      q: "İkinci bir şubemiz var. Nasıl ekleriz?",
      a: "Birden fazla şubesi olan klinikler ve klinik grupları uygulamadan değil, bizimle birlikte kurulur. Şubelerinizi bize yazın, birlikte kuralım. Fiyat şube başınadır.",
    },
    "patient-data": {
      q: "Hasta bilgilerini ya da hastaların göründüğü videoları yükleyebilir miyiz?",
      a: "DentVideo hasta verisi olmadan çalışır. Lütfen hasta kayıtlarını yüklemeyin ve bize e-postayla da hasta bilgisi göndermeyin.\n\nBir kayıtta hasta görünüyor ya da adı geçiyorsa, yüklemeden önce o hastanın açık ve belgelenmiş onayını almanız gerekir. DentVideo, ABD'deki HIPAA kurallarına tabi korunan sağlık bilgileri için tasarlanmamıştır.",
    },
    "privacy-dpa": {
      q: "Verilerimiz nasıl korunuyor? Veri işleme sözleşmesi var mı?",
      a: "Gizlilik Politikamız neyi işlediğimizi, hangi hizmet sağlayıcıların aldığını ve ne kadar saklandığını açıklar. Yüklediklerinizdeki kişisel veriler için veri sorumlusu kliniğinizdir; biz, şartlarımızın parçası olan Veri İşleme Sözleşmemiz kapsamında veri işleyen olarak hareket ederiz.\n\nYüklediklerinizi ya da videolarınızı yapay zekâ modellerini eğitmek için kullanmayız ve kliniğinizin videolarını başka müşterilere göstermeyiz.",
    },
    "export-data": {
      q: "Tüm verilerimizi nasıl indiririz?",
      a: "Ayarlar → Verileriniz → “Verilerimi indir”i açın. Klinik bilgilerinizi, her videonun metnini, açıklamasını ve incelemesini, ayrıca videolarınız, kayıtlarınız ve logonuz için indirme bağlantılarını içeren tek bir dosya alırsınız. Bağlantılar 24 saat geçerlidir; ihtiyacınız olanı kısa sürede indirin.",
    },
    "delete-account": {
      q: "Hesabımızı nasıl sileriz?",
      a: "Ayarlar → Verileriniz → “Hesabımı sil…”i açın ve onaylamak için kliniğinizin adını yazın. Klinik bilgileri, videolar, kayıtlar, logo ve giriş bilgileriniz hemen kaldırılır ve geri getirilemez; kopya istiyorsanız önce verilerinizi indirin.\n\nPlanınız hâlâ aktifse pencere, aynı anda iptal edilip edilmeyeceğini ya da önce iptal etmeniz gerekip gerekmediğini söyler. Ödeme sağlayıcımız faturaları vergi mevzuatının gerektirdiği süre boyunca saklar; yedeklerdeki kopyalar 30 gün içinde silinir.",
    },
    "reminder-emails": {
      q: "Hatırlatma e-postalarını durdurabilir miyiz?",
      a: "Evet. Her hatırlatmanın ve aylık özetin altında bir “Abonelikten çık” bağlantısı vardır. Hesabınız, ödemeleriniz ve hazır videolarınızla ilgili e-postalar hizmetin parçası olduğu için gelmeye devam eder.",
    },
  },
};
