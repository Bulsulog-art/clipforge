/**
 * DentVideo's Terms of Service and Privacy Policy.
 *
 * English is the binding text; Turkish is a full translation for the
 * priority market. Other languages link to the English pages.
 *
 * Every factual statement here must stay true to the code: what we store,
 * which vendors see it, and how billing works. When a vendor, a stored field
 * or the billing flow changes, update this file and LEGAL_UPDATED.
 */
import type { Locale } from "./dentvideo";

export type LegalBlock = string | { list: string[] };
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDoc = {
  title: string;
  metaDescription: string;
  updatedLabel: string;
  intro: string[];
  sections: LegalSection[];
};

export const LEGAL_UPDATED = "2026-11-08";
export const LEGAL_CONTACT = "info@bulsulabs.com";

/** Languages with their own legal text. Others use English. */
export const LEGAL_LOCALES = ["en", "tr"] as const;
export type LegalLocale = (typeof LEGAL_LOCALES)[number];

export const TERMS_PATH: Record<LegalLocale, string> = { en: "/dentvideo/terms", tr: "/dentvideo/tr/terms" };
export const PRIVACY_PATH: Record<LegalLocale, string> = { en: "/dentvideo/privacy", tr: "/dentvideo/tr/privacy" };

export const legalLocale = (l: Locale | string): LegalLocale => (l === "tr" ? "tr" : "en");

/** Footer link labels in every site language. */
export const LEGAL_LINKS: Record<Locale, { terms: string; privacy: string }> = {
  en: { terms: "Terms", privacy: "Privacy" },
  de: { terms: "AGB (Englisch)", privacy: "Datenschutz (Englisch)" },
  es: { terms: "Términos (inglés)", privacy: "Privacidad (inglés)" },
  fr: { terms: "Conditions (anglais)", privacy: "Confidentialité (anglais)" },
  tr: { terms: "Kullanım Şartları", privacy: "Gizlilik" },
};

const TERMS_EN: LegalDoc = {
  title: "Terms of Service",
  metaDescription: "The terms for using DentVideo, the weekly patient-education video service for dental clinics.",
  updatedLabel: "Last updated",
  intro: [
    "DentVideo (dentvideo.com) is a service operated by Bulsu Labs (\"we\", \"us\"). These terms are the agreement between us and the clinic or professional who creates a DentVideo account (\"you\"). By creating an account or paying for a plan you accept them. If you accept them on behalf of a clinic, you confirm you may bind that clinic.",
    "We wrote these terms in plain language. If something is unclear, write to info@bulsulabs.com before you subscribe.",
  ],
  sections: [
    {
      heading: "1. The service",
      blocks: [
        "DentVideo prepares short, narrated and captioned patient-education videos for dental clinics. Each week it plans topics, writes scripts, narrates them with a synthetic voice, renders the videos with your clinic's name, colours and logo, and runs automated checks for health-advertising wording and clinical plausibility. On plans that include it, it also turns recordings you upload into short captioned clips.",
        "DentVideo is a business tool for dental professionals. It is not offered to patients or consumers, and it is not a medical device.",
      ],
    },
    {
      heading: "2. You approve everything before it is published",
      blocks: [
        "Nothing DentVideo makes is published automatically. You decide whether to approve, download or share each video, and you are the publisher of anything you share.",
        "Our checks are an aid, not a guarantee. Scripts are written and reviewed by AI models and can contain mistakes. Our checks are not legal advice and not clinical advice. Before you publish, you are responsible for making sure each video is accurate for your practice and complies with the rules that apply to you: your professional body's code, health-advertising law and platform rules in your country.",
      ],
    },
    {
      heading: "3. Your account",
      blocks: [
        "Give accurate details about your clinic and keep your login private. You are responsible for what happens under your account. Tell us at info@bulsulabs.com if you think someone else has used it.",
      ],
    },
    {
      heading: "4. Plans, payment and cancellation",
      blocks: [
        "DentVideo is paid in advance; there is no free trial. Before you pay you can see a live preview of videos in your clinic's name, colours and logo. Plans, their prices and what each includes are shown on dentvideo.com at the time you subscribe.",
        {
          list: [
            "Payments are processed by Dodo Payments, which acts as merchant of record and seller to you. Its terms also apply to the payment, and it may add taxes that apply in your country. We never see your full card details.",
            "Subscriptions renew automatically at the end of each billing period (monthly or yearly) until cancelled.",
            "You can cancel at any time. Cancellation takes effect at the end of the period you have paid for; you keep access until then.",
            "Payments are not refundable for partial periods, except where the law requires otherwise or we have failed to provide the service. If something went wrong, write to us; we would rather fix it.",
            "A founding or promotional price applies only for the period and number of clinics stated with the offer. When it ends, the plan renews at the list price, and we tell you before that happens.",
            "We may change list prices. We will tell you at least 30 days in advance, and a new price applies from your next renewal after that notice.",
            "If a payment fails, we may pause new videos until it is resolved.",
          ],
        },
      ],
    },
    {
      heading: "5. What you give us",
      blocks: [
        "You keep all rights in what you upload: your logo, clinic details and recordings. You give us permission to store and process them only to run DentVideo for you, including sending them to the service providers listed in our Privacy Policy.",
        "You confirm that you have the right to use what you upload and that everyone who appears or speaks in a recording has agreed to it.",
        "Do not upload patient health records, and do not upload recordings in which a patient can be identified unless you have that patient's explicit, documented consent for this use. DentVideo is designed to work without any patient data.",
      ],
    },
    {
      heading: "6. What we give you",
      blocks: [
        "The videos, scripts and captions made for your clinic are yours to use for your clinic's communication, including after you cancel, for anything you have downloaded.",
        "Some videos contain stock footage from Pexels, used under the Pexels licence, and a synthetic voice. You may use these as part of the videos but not separately, for example by extracting and reselling the footage.",
        "We do not use your uploads or your videos to train AI models. We do not show your clinic's videos to other customers.",
        "DentVideo itself (the software, design, templates and brand) stays ours.",
      ],
    },
    {
      heading: "7. Acceptable use",
      blocks: [
        "Do not use DentVideo to make content that is misleading, unlawful or that promises treatment results, and do not try to break, overload, copy or resell the service, or access other clinics' data.",
        "We may suspend or close an account that breaks these terms. Where possible we will tell you first and give you a chance to fix the issue.",
      ],
    },
    {
      heading: "8. Availability and changes",
      blocks: [
        "We work to deliver your videos every week, but we cannot promise the service will always be available or error-free. Weekly delivery can be delayed, for example by an outage at one of our providers.",
        "We improve DentVideo continuously and may change how it works. If we remove something central to your plan, we will tell you in advance, and you may cancel.",
      ],
    },
    {
      heading: "9. Liability",
      blocks: [
        "Nothing in these terms limits liability that cannot be limited by law, such as liability for intent or gross negligence.",
        "Otherwise, we are not liable for indirect or consequential losses, such as lost profits, lost patients or reputational harm, and our total liability for any claim is limited to what you paid us in the 12 months before it arose.",
        "Because you approve and publish every video, you are responsible for claims arising from content you published, including complaints under health-advertising rules.",
      ],
    },
    {
      heading: "10. Ending the agreement",
      blocks: [
        "You can stop by cancelling your plan and asking us to delete your account. We can end the agreement with 30 days' notice, or immediately under section 7. After an account is closed we delete its data as described in the Privacy Policy.",
      ],
    },
    {
      heading: "11. Changes to these terms",
      blocks: [
        "We may update these terms. For material changes we will email you at least 30 days in advance. If you keep using DentVideo after the change takes effect, the new terms apply; if you do not accept them, you may cancel.",
      ],
    },
    {
      heading: "12. Law and contact",
      blocks: [
        "These terms are governed by the laws of the Republic of Türkiye, and the courts of Istanbul have jurisdiction, unless mandatory law in your country gives you other rights. The English text is binding; translations are for convenience.",
        "Questions: info@bulsulabs.com.",
      ],
    },
  ],
};

const TERMS_TR: LegalDoc = {
  title: "Kullanım Şartları",
  metaDescription: "Diş klinikleri için haftalık hasta bilgilendirme videosu hizmeti DentVideo'nun kullanım şartları.",
  updatedLabel: "Son güncelleme",
  intro: [
    "DentVideo (dentvideo.com), Bulsu Labs (\"biz\") tarafından işletilen bir hizmettir. Bu şartlar, bizimle DentVideo hesabı açan klinik ya da hekim (\"siz\") arasındaki sözleşmedir. Hesap açarak veya bir plan için ödeme yaparak bu şartları kabul edersiniz. Bir klinik adına kabul ediyorsanız, o kliniği bağlamaya yetkili olduğunuzu beyan edersiniz.",
    "Bu şartları sade bir dille yazdık. Anlaşılmayan bir nokta varsa, abone olmadan önce info@bulsulabs.com adresine yazın. Bağlayıcı metin İngilizce metindir; bu çeviri kolaylık içindir.",
  ],
  sections: [
    {
      heading: "1. Hizmet",
      blocks: [
        "DentVideo, diş klinikleri için kısa, seslendirilmiş ve altyazılı hasta bilgilendirme videoları hazırlar. Her hafta konuları planlar, metinleri yazar, yapay bir sesle seslendirir, videoları kliniğinizin adı, renkleri ve logosuyla oluşturur ve sağlık tanıtımı ifadeleri ile klinik tutarlılık için otomatik kontroller yapar. Planınız kapsıyorsa, yüklediğiniz kayıtları da altyazılı kısa kliplere dönüştürür.",
        "DentVideo, diş hekimliği profesyonellerine yönelik bir iş aracıdır. Hastalara veya tüketicilere sunulmaz ve tıbbi cihaz değildir.",
      ],
    },
    {
      heading: "2. Yayından önce her şeyi siz onaylarsınız",
      blocks: [
        "DentVideo'nun hazırladığı hiçbir şey otomatik olarak yayınlanmaz. Her videoyu onaylayıp onaylamayacağınıza, indirip paylaşıp paylaşmayacağınıza siz karar verirsiniz ve paylaştığınız içeriğin yayıncısı sizsiniz.",
        "Kontrollerimiz bir yardımdır, garanti değildir. Metinler yapay zekâ modelleri tarafından yazılır ve incelenir; hata içerebilir. Kontrollerimiz hukuki veya klinik tavsiye değildir. Yayınlamadan önce her videonun muayenehaneniz için doğru olduğundan ve size uygulanan kurallara (meslek kuruluşunuzun kuralları, ülkenizdeki sağlık tanıtımı mevzuatı ve platform kuralları) uygun olduğundan emin olmak sizin sorumluluğunuzdadır.",
      ],
    },
    {
      heading: "3. Hesabınız",
      blocks: [
        "Kliniğiniz hakkında doğru bilgi verin ve giriş bilgilerinizi gizli tutun. Hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz. Hesabınızın başkası tarafından kullanıldığını düşünüyorsanız info@bulsulabs.com adresine bildirin.",
      ],
    },
    {
      heading: "4. Planlar, ödeme ve iptal",
      blocks: [
        "DentVideo peşin ödenir; ücretsiz deneme yoktur. Ödeme yapmadan önce kliniğinizin adı, renkleri ve logosuyla videoların canlı ön izlemesini görebilirsiniz. Planlar, fiyatları ve kapsamları abone olduğunuz anda dentvideo.com'da gösterilir.",
        {
          list: [
            "Ödemeler, satıcı sıfatıyla (merchant of record) hareket eden Dodo Payments tarafından işlenir. Ödeme için onun şartları da geçerlidir ve ülkenizde geçerli vergileri ekleyebilir. Kart bilgilerinizin tamamını hiçbir zaman görmeyiz.",
            "Abonelikler iptal edilene kadar her fatura döneminin (aylık veya yıllık) sonunda otomatik olarak yenilenir.",
            "İstediğiniz zaman iptal edebilirsiniz. İptal, ödediğiniz dönemin sonunda geçerli olur; o zamana kadar erişiminiz devam eder.",
            "Kanunun aksini gerektirdiği veya hizmeti sağlayamadığımız durumlar dışında, kısmi dönemler için ödeme iadesi yapılmaz. Bir sorun yaşadıysanız bize yazın; çözmeyi tercih ederiz.",
            "Kurucu veya kampanya fiyatı yalnızca teklifte belirtilen süre ve klinik sayısı için geçerlidir. Süre bittiğinde plan liste fiyatından yenilenir ve bunu önceden size bildiririz.",
            "Liste fiyatlarını değiştirebiliriz. En az 30 gün önceden bildiririz; yeni fiyat bu bildirimden sonraki ilk yenilemeden itibaren uygulanır.",
            "Bir ödeme başarısız olursa, sorun çözülene kadar yeni videoları durdurabiliriz.",
          ],
        },
      ],
    },
    {
      heading: "5. Bize verdikleriniz",
      blocks: [
        "Yüklediğiniz her şeyin (logonuz, klinik bilgileriniz ve kayıtlarınız) tüm hakları sizde kalır. Bunları yalnızca DentVideo'yu sizin için çalıştırmak amacıyla saklamamıza ve işlememize, Gizlilik Politikamızda listelenen hizmet sağlayıcılara iletmek de dahil, izin verirsiniz.",
        "Yüklediklerinizi kullanma hakkınız olduğunu ve bir kayıtta görünen veya konuşan herkesin buna onay verdiğini beyan edersiniz.",
        "Hasta sağlık kayıtları yüklemeyin. Hastanın açık ve belgelenmiş rızası olmadıkça, hastanın tanınabildiği kayıtlar yüklemeyin. DentVideo hiçbir hasta verisi olmadan çalışacak şekilde tasarlanmıştır.",
      ],
    },
    {
      heading: "6. Size verdiklerimiz",
      blocks: [
        "Kliniğiniz için hazırlanan videoları, metinleri ve altyazıları kliniğinizin iletişiminde kullanabilirsiniz; indirdikleriniz için bu hak iptalden sonra da devam eder.",
        "Bazı videolar Pexels lisansıyla kullanılan stok görüntüler ve yapay bir ses içerir. Bunları videoların parçası olarak kullanabilirsiniz, ancak ayrı olarak kullanamazsınız (örneğin görüntüleri çıkarıp satmak gibi).",
        "Yüklediklerinizi veya videolarınızı yapay zekâ modellerini eğitmek için kullanmayız. Kliniğinizin videolarını başka müşterilere göstermeyiz.",
        "DentVideo'nun kendisi (yazılım, tasarım, şablonlar ve marka) bize ait kalır.",
      ],
    },
    {
      heading: "7. Kabul edilebilir kullanım",
      blocks: [
        "DentVideo'yu yanıltıcı, hukuka aykırı veya tedavi sonucu vaat eden içerik üretmek için kullanmayın; hizmeti bozmaya, aşırı yüklemeye, kopyalamaya veya yeniden satmaya ya da başka kliniklerin verilerine erişmeye çalışmayın.",
        "Bu şartları ihlal eden bir hesabı askıya alabilir veya kapatabiliriz. Mümkün olduğunda önce size haber verir ve sorunu düzeltme fırsatı tanırız.",
      ],
    },
    {
      heading: "8. Erişilebilirlik ve değişiklikler",
      blocks: [
        "Videolarınızı her hafta teslim etmek için çalışırız, ancak hizmetin her zaman erişilebilir veya hatasız olacağını garanti edemeyiz. Haftalık teslim, örneğin bir hizmet sağlayıcımızdaki kesinti nedeniyle gecikebilir.",
        "DentVideo'yu sürekli geliştiririz ve işleyişini değiştirebiliriz. Planınızın temel bir parçasını kaldırırsak önceden haber veririz ve iptal edebilirsiniz.",
      ],
    },
    {
      heading: "9. Sorumluluk",
      blocks: [
        "Bu şartlardaki hiçbir hüküm, kanunen sınırlandırılamayan sorumluluğu (örneğin kast veya ağır ihmal) sınırlamaz.",
        "Bunun dışında; kâr kaybı, hasta kaybı veya itibar zararı gibi dolaylı zararlardan sorumlu değiliz ve herhangi bir talep için toplam sorumluluğumuz, talebin doğduğu tarihten önceki 12 ayda bize ödediğiniz tutarla sınırlıdır.",
        "Her videoyu siz onaylayıp yayınladığınız için, yayınladığınız içerikten doğan taleplerden (sağlık tanıtımı kurallarına ilişkin şikâyetler dahil) siz sorumlusunuz.",
      ],
    },
    {
      heading: "10. Sözleşmenin sona ermesi",
      blocks: [
        "Planınızı iptal edip hesabınızın silinmesini isteyerek sözleşmeyi sona erdirebilirsiniz. Biz sözleşmeyi 30 gün önceden bildirerek veya 7. madde kapsamında derhal sona erdirebiliriz. Kapatılan hesabın verilerini Gizlilik Politikasında anlatıldığı şekilde sileriz.",
      ],
    },
    {
      heading: "11. Şartlardaki değişiklikler",
      blocks: [
        "Bu şartları güncelleyebiliriz. Önemli değişiklikleri en az 30 gün önceden e-postayla bildiririz. Değişiklik yürürlüğe girdikten sonra DentVideo'yu kullanmaya devam ederseniz yeni şartlar geçerli olur; kabul etmiyorsanız iptal edebilirsiniz.",
      ],
    },
    {
      heading: "12. Uygulanacak hukuk ve iletişim",
      blocks: [
        "Ülkenizin emredici hukuku size başka haklar tanımadıkça, bu şartlara Türkiye Cumhuriyeti hukuku uygulanır ve İstanbul mahkemeleri yetkilidir. Bağlayıcı metin İngilizce metindir.",
        "Sorularınız için: info@bulsulabs.com.",
      ],
    },
  ],
};

const PRIVACY_EN: LegalDoc = {
  title: "Privacy Policy",
  metaDescription: "What DentVideo collects, why, who processes it, how long we keep it and your rights.",
  updatedLabel: "Last updated",
  intro: [
    "DentVideo is operated by Bulsu Labs (\"we\", \"us\"). This policy explains what personal data we handle when a clinic uses DentVideo or when someone visits dentvideo.com, why, who else sees it and how long we keep it. Contact: info@bulsulabs.com.",
    "DentVideo is built to work without patient data. Patients do not use DentVideo, and we ask clinics not to upload anything that identifies a patient.",
  ],
  sections: [
    {
      heading: "1. Who is responsible",
      blocks: [
        "Bulsu Labs is the controller for account, billing and website data. For recordings and other material a clinic uploads, the clinic decides what is uploaded and why, and we process it on the clinic's behalf to provide the service.",
      ],
    },
    {
      heading: "2. What we collect",
      blocks: [
        {
          list: [
            "Account: your email address and a login handled by our authentication system (we store a password hash, never the password).",
            "Clinic profile: clinic name, city and country, language, the treatments you offer, preferred tone, brand colours and your logo.",
            "Recordings you upload (on plans that include them): the video and audio, which contain the voice and image of whoever is speaking, and a transcript made from it.",
            "What we make for you: topics, scripts, captions, narration, rendered videos, check results, and your approvals.",
            "Billing: your plan, subscription status, renewal date and the Dodo Payments subscription and customer references. Card details are handled by Dodo Payments and never reach us.",
            "Technical data: server logs (such as IP address, browser and time of request) kept for security and troubleshooting.",
            "Visit source: if you arrive through a link with campaign tags (utm parameters), your browser keeps them in local storage and sends them with your sign-up, so we know which channels bring clinics.",
          ],
        },
      ],
    },
    {
      heading: "3. Why we use it",
      blocks: [
        {
          list: [
            "To provide DentVideo under our contract with you: plan and make your videos, process your recordings, show them in your library and email you when they are ready.",
            "To take payment and manage your subscription.",
            "To keep the service secure, prevent abuse and fix errors (our legitimate interest).",
            "To understand which channels bring sign-ups (our legitimate interest).",
            "To meet legal obligations, such as tax and accounting records.",
          ],
        },
        "We do not sell personal data, we do not run advertising trackers, and we do not use your uploads or videos to train AI models.",
      ],
    },
    {
      heading: "4. Who processes it for us",
      blocks: [
        "We use a small number of providers. Each receives only what it needs:",
        {
          list: [
            "Hostinger: the servers that run dentvideo.com, our database and file storage (our own Supabase installation).",
            "OpenAI (United States): writes and reviews scripts, creates the synthetic narration and transcribes uploaded recordings. Under OpenAI's API terms, data sent through the API is not used to train its models.",
            "Dodo Payments: checkout, subscriptions, invoices and taxes, as merchant of record. For payment data it acts as an independent controller under its own privacy policy.",
            "Resend: sends our emails, such as \"your videos are ready\".",
            "Google (search suggestions) and Pexels (stock footage): we send only general search terms such as a treatment name and country, never personal data.",
          ],
        },
        "Where a provider is outside the EU/EEA or Türkiye, the transfer is covered by safeguards such as the European Commission's standard contractual clauses or the provider's equivalent commitments.",
      ],
    },
    {
      heading: "5. How long we keep it",
      blocks: [
        {
          list: [
            "Account, clinic profile, recordings and videos: while your account is open. After you close your account or ask us to delete it, we delete them within 30 days, including from backups as they rotate.",
            "Billing records: as long as tax and accounting law requires.",
            "Server logs: up to 90 days.",
          ],
        },
      ],
    },
    {
      heading: "6. Your rights",
      blocks: [
        "You can ask to access, correct, export or delete your data, to restrict or object to processing, and to withdraw any consent you gave. Write to info@bulsulabs.com from the email on your account; we answer within 30 days. You can also complain to your data protection authority. In Türkiye this is the Personal Data Protection Authority (KVKK); in the EU, the authority in your country.",
      ],
    },
    {
      heading: "7. Cookies and local storage",
      blocks: [
        "We use only what is needed to run the site: a sign-in cookie that keeps you logged in, and the local storage items described in section 2 (visit source) and for remembering your language. There are no advertising or cross-site tracking cookies.",
      ],
    },
    {
      heading: "8. Security",
      blocks: [
        "All traffic is encrypted (HTTPS). Each clinic can see only its own data, enforced in the database. Files are kept in private storage and shown through short-lived links. Access to production systems is limited to the people who run DentVideo.",
      ],
    },
    {
      heading: "9. Changes",
      blocks: [
        "If we change this policy in a way that matters, we will email account holders before the change takes effect. The date at the top shows the current version.",
      ],
    },
  ],
};

const PRIVACY_TR: LegalDoc = {
  title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
  metaDescription: "DentVideo'nun hangi verileri, neden topladığı, kimlerin işlediği, ne kadar sakladığı ve haklarınız.",
  updatedLabel: "Son güncelleme",
  intro: [
    "DentVideo, Bulsu Labs (\"biz\") tarafından işletilir. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve GDPR kapsamında; bir klinik DentVideo'yu kullandığında veya biri dentvideo.com'u ziyaret ettiğinde hangi kişisel verileri işlediğimizi, neden işlediğimizi, kimlerin gördüğünü ve ne kadar sakladığımızı açıklar. İletişim: info@bulsulabs.com.",
    "DentVideo hasta verisi olmadan çalışacak şekilde tasarlanmıştır. Hastalar DentVideo'yu kullanmaz ve kliniklerden hastayı tanımlayan hiçbir şey yüklememelerini isteriz.",
  ],
  sections: [
    {
      heading: "1. Veri sorumlusu",
      blocks: [
        "Hesap, ödeme ve web sitesi verileri için veri sorumlusu Bulsu Labs'tir. Kliniğin yüklediği kayıtlar ve diğer materyaller için neyin, hangi amaçla yükleneceğine klinik karar verir; biz bunları hizmeti sunmak üzere klinik adına işleriz (veri işleyen).",
      ],
    },
    {
      heading: "2. Topladığımız veriler",
      blocks: [
        {
          list: [
            "Hesap: e-posta adresiniz ve kimlik doğrulama sistemimizin yönettiği giriş bilgisi (şifrenin kendisini değil, yalnızca özetini saklarız).",
            "Klinik profili: klinik adı, şehir ve ülke, dil, sunduğunuz tedaviler, tercih ettiğiniz üslup, marka renkleri ve logonuz.",
            "Yüklediğiniz kayıtlar (planınız kapsıyorsa): konuşan kişinin sesini ve görüntüsünü içeren video ve ses ile bunlardan oluşturulan metin dökümü.",
            "Sizin için hazırladıklarımız: konular, metinler, altyazılar, seslendirme, videolar, kontrol sonuçları ve onaylarınız.",
            "Ödeme: planınız, abonelik durumunuz, yenileme tarihiniz ve Dodo Payments abonelik ve müşteri referansları. Kart bilgileri Dodo Payments tarafından işlenir ve bize hiç ulaşmaz.",
            "Teknik veriler: güvenlik ve hata giderme için tutulan sunucu kayıtları (IP adresi, tarayıcı, istek zamanı gibi).",
            "Ziyaret kaynağı: kampanya etiketli (utm) bir bağlantıyla gelirseniz, tarayıcınız bunları yerel depolamada tutar ve kayıt olurken gönderir; böylece klinikleri hangi kanalların getirdiğini anlarız.",
          ],
        },
      ],
    },
    {
      heading: "3. İşleme amaçları ve hukuki sebepler",
      blocks: [
        {
          list: [
            "DentVideo'yu sizinle yaptığımız sözleşme kapsamında sunmak: videolarınızı planlamak ve hazırlamak, kayıtlarınızı işlemek, kütüphanenizde göstermek ve hazır olduklarında e-posta göndermek (KVKK m.5/2-c, sözleşmenin ifası).",
            "Ödemeyi almak ve aboneliğinizi yönetmek (sözleşmenin ifası).",
            "Hizmeti güvende tutmak, kötüye kullanımı önlemek ve hataları gidermek (KVKK m.5/2-f, meşru menfaat).",
            "Kayıtların hangi kanallardan geldiğini anlamak (meşru menfaat).",
            "Vergi ve muhasebe kayıtları gibi yasal yükümlülükleri yerine getirmek (KVKK m.5/2-ç).",
          ],
        },
        "Kişisel verileri satmayız, reklam takip araçları kullanmayız ve yüklediklerinizi veya videolarınızı yapay zekâ modellerini eğitmek için kullanmayız.",
      ],
    },
    {
      heading: "4. Verileri işleyen hizmet sağlayıcılar ve yurt dışına aktarım",
      blocks: [
        "Az sayıda hizmet sağlayıcı kullanırız; her biri yalnızca ihtiyaç duyduğunu alır:",
        {
          list: [
            "Hostinger: dentvideo.com'u, veritabanımızı ve dosya depolamamızı (kendi Supabase kurulumumuz) çalıştıran sunucular.",
            "OpenAI (ABD): metinleri yazar ve inceler, yapay seslendirmeyi oluşturur ve yüklenen kayıtların metin dökümünü çıkarır. OpenAI'ın API şartlarına göre API üzerinden gönderilen veriler modellerini eğitmek için kullanılmaz.",
            "Dodo Payments: satıcı sıfatıyla ödeme sayfası, abonelikler, faturalar ve vergiler. Ödeme verileri için kendi gizlilik politikası kapsamında bağımsız veri sorumlusudur.",
            "Resend: \"videolarınız hazır\" gibi e-postalarımızı gönderir.",
            "Google (arama önerileri) ve Pexels (stok görüntüler): yalnızca bir tedavi adı ve ülke gibi genel arama terimleri göndeririz, asla kişisel veri göndermeyiz.",
          ],
        },
        "Bu sağlayıcılardan bazıları yurt dışındadır. Aktarımlar KVKK m.9 ve GDPR'a uygun güvencelere (standart sözleşmeler gibi) dayanır.",
      ],
    },
    {
      heading: "5. Saklama süreleri",
      blocks: [
        {
          list: [
            "Hesap, klinik profili, kayıtlar ve videolar: hesabınız açık olduğu sürece. Hesabınızı kapattığınızda veya silinmesini istediğinizde, yedekler döngüsü dahil 30 gün içinde sileriz.",
            "Ödeme kayıtları: vergi ve muhasebe mevzuatının gerektirdiği süre boyunca.",
            "Sunucu kayıtları: en fazla 90 gün.",
          ],
        },
      ],
    },
    {
      heading: "6. Haklarınız (KVKK m.11)",
      blocks: [
        "Verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini, silinmesini veya aktarılmasını isteme, işlemeye itiraz etme ve verdiğiniz rızayı geri alma haklarınız vardır. Hesabınızdaki e-posta adresinden info@bulsulabs.com adresine yazın; en geç 30 gün içinde yanıt veririz. Kişisel Verileri Koruma Kurumu'na (veya AB'deyseniz ülkenizdeki veri koruma otoritesine) şikâyette bulunabilirsiniz.",
      ],
    },
    {
      heading: "7. Çerezler ve yerel depolama",
      blocks: [
        "Yalnızca sitenin çalışması için gerekenleri kullanırız: oturumunuzu açık tutan bir giriş çerezi ile 2. bölümde açıklanan ziyaret kaynağı ve dil tercihinizi hatırlamak için yerel depolama. Reklam veya siteler arası takip çerezi yoktur.",
      ],
    },
    {
      heading: "8. Güvenlik",
      blocks: [
        "Tüm trafik şifrelidir (HTTPS). Her klinik yalnızca kendi verisini görebilir; bu, veritabanı düzeyinde uygulanır. Dosyalar özel depolamada tutulur ve kısa süreli bağlantılarla gösterilir. Canlı sistemlere erişim, DentVideo'yu işleten kişilerle sınırlıdır.",
      ],
    },
    {
      heading: "9. Değişiklikler",
      blocks: [
        "Bu politikayı önemli ölçüde değiştirirsek, değişiklik yürürlüğe girmeden önce hesap sahiplerine e-posta göndeririz. En üstteki tarih güncel sürümü gösterir. Bağlayıcı metin İngilizce metindir.",
      ],
    },
  ],
};

export const TERMS: Record<LegalLocale, LegalDoc> = { en: TERMS_EN, tr: TERMS_TR };
export const PRIVACY: Record<LegalLocale, LegalDoc> = { en: PRIVACY_EN, tr: PRIVACY_TR };
