#if DEBUG
import Foundation
import DentVideoCore

/// Sample texts for the demo clinic in the app's eight languages. The clinic and its dentist are
/// fictional, and the clinic's name says so in every language ("Sample Dental Practice", "Örnek Diş
/// Kliniği", "サンプル歯科" …, the same names as the web's demo data). No social handle: a made-up
/// handle could belong to a real practice. Nothing here describes a real customer. DEBUG builds only.
/// Names that must not come back: Core/Tests/DentVideoCoreTests/DemoNamesTests.swift.
struct DemoContent {
    var clinic: String
    var city: String
    var country: String
    var services: [String]
    var closing: String
    /// whitening, implant/bridge, flossing, gums, aligners, sensitive teeth, welcome clip
    var titles: [String]
    /// for the first four titles
    var captions: [String]
    var tags: [String]
    var card: ShootCard

    static func of(_ lang: String) -> DemoContent {
        switch lang {
        case "tr": return tr
        case "de": return de
        case "es": return es
        case "fr": return fr
        case "ja": return ja
        case "ar": return ar
        case "pl": return pl
        default: return en
        }
    }

    static let en = DemoContent(
        clinic: "Sample Dental Practice", city: "Springfield", country: "US",
        services: ["Check-ups", "Whitening", "Implants", "Aligners"],
        closing: "Book your check-up online.",
        titles: ["How long does whitening last?", "Implant or bridge?", "Flossing in two minutes", "Why do gums bleed?", "Aligners: what to expect", "Sensitive teeth and cold drinks", "Welcome to our clinic"],
        captions: ["Whitening doesn't last forever, and that's normal. Here is what changes the result.", "Two good options for a missing tooth, and how we help you choose.", "Once a day is enough. This is how to do it well.", "Bleeding gums are a signal, not a normal part of brushing."],
        tags: ["dentist", "whitening", "smile"],
        card: ShootCard(opening: "Hi, I'm Dr. Reed. Here's the question patients ask most about whitening.", points: ["Whitening is safe on healthy enamel", "Some sensitivity can happen and fades in a few days", "We'll tell you which method suits your teeth"], closing: "Book a check-up and we'll tell you what's realistic for you.", avoid: ["Promising a shade", "Before-and-after claims"], setup: ["Phone at eye level", "Light in front of you", "A quiet room"], minutes: 2))

    static let tr = DemoContent(
        clinic: "Örnek Diş Kliniği", city: "İzmir", country: "TR",
        services: ["Kontrol", "Beyazlatma", "İmplant", "Şeffaf plak"],
        closing: "Kontrol randevunuzu online alın.",
        titles: ["Diş beyazlatma ne kadar kalıcı?", "İmplant mı, köprü mü?", "İki dakikada diş ipi", "Diş etleri neden kanar?", "Şeffaf plak: nelere hazır olmalı?", "Soğuk içecekte diş hassasiyeti", "Kliniğimize hoş geldiniz"],
        captions: ["Beyazlatma sonsuza kadar sürmez, bu normaldir. Sonucu neyin değiştirdiğini anlatıyoruz.", "Eksik bir diş için iki iyi seçenek ve size uygun olanı birlikte nasıl seçtiğimiz.", "Günde bir kez yeterli. Doğru yapmanın yolu bu.", "Diş eti kanaması bir işarettir, fırçalamanın normal bir parçası değildir."],
        tags: ["dişhekimi", "beyazlatma", "gülüş"],
        card: ShootCard(opening: "Merhaba, ben Dr. Aydın. Hastaların beyazlatma hakkında en çok sorduğu soru şu.", points: ["Sağlıklı minede beyazlatma güvenlidir", "Hafif hassasiyet olabilir, birkaç günde geçer", "Dişlerinize uygun yöntemi birlikte seçeriz"], closing: "Muayene için randevu alın, sizin için neyin gerçekçi olduğunu söyleyelim.", avoid: ["Belirli bir renk vaat etmek", "Önce-sonra iddiaları"], setup: ["Telefon göz hizasında", "Işık önünüzde", "Sessiz bir oda"], minutes: 2))

    static let de = DemoContent(
        clinic: "Demo Zahnarztpraxis", city: "Freiburg", country: "DE",
        services: ["Kontrolluntersuchung", "Bleaching", "Implantate", "Aligner"],
        closing: "Kontrolltermin jetzt online buchen.",
        titles: ["Wie lange hält Bleaching?", "Implantat oder Brücke?", "Zahnseide in zwei Minuten", "Warum blutet das Zahnfleisch?", "Aligner: was Sie erwartet", "Empfindliche Zähne bei Kälte", "Willkommen in unserer Praxis"],
        captions: ["Bleaching hält nicht ewig, und das ist normal. Das beeinflusst das Ergebnis.", "Zwei gute Lösungen für einen fehlenden Zahn, und wie wir gemeinsam wählen.", "Einmal am Tag reicht. So geht es richtig.", "Zahnfleischbluten ist ein Signal, kein normaler Teil des Zähneputzens."],
        tags: ["zahnarzt", "bleaching", "zahngesundheit"],
        card: ShootCard(opening: "Hallo, ich bin Dr. Weber. Das ist die Frage, die Patientinnen und Patienten am häufigsten zum Bleaching stellen.", points: ["Auf gesundem Zahnschmelz ist Bleaching sicher", "Leichte Empfindlichkeit kann auftreten und vergeht nach einigen Tagen", "Wir sagen Ihnen, welche Methode zu Ihren Zähnen passt"], closing: "Vereinbaren Sie einen Kontrolltermin, dann besprechen wir, was für Sie realistisch ist.", avoid: ["Eine bestimmte Zahnfarbe versprechen", "Vorher-nachher-Aussagen"], setup: ["Telefon auf Augenhöhe", "Licht von vorn", "Ein ruhiger Raum"], minutes: 2))

    static let es = DemoContent(
        clinic: "Clínica Dental Ejemplo", city: "Valencia", country: "ES",
        services: ["Revisiones", "Blanqueamiento", "Implantes", "Alineadores"],
        closing: "Pide tu revisión online.",
        titles: ["¿Cuánto dura un blanqueamiento?", "¿Implante o puente?", "Hilo dental en dos minutos", "¿Por qué sangran las encías?", "Alineadores: qué esperar", "Dientes sensibles al frío", "Bienvenidos a nuestra clínica"],
        captions: ["El blanqueamiento no dura para siempre, y es normal. Esto es lo que cambia el resultado.", "Dos buenas opciones para un diente que falta, y cómo elegimos contigo.", "Una vez al día es suficiente. Así se hace bien.", "Las encías que sangran son una señal, no algo normal del cepillado."],
        tags: ["dentista", "blanqueamiento", "sonrisa"],
        card: ShootCard(opening: "Hola, soy la Dra. Ruiz. Esta es la pregunta que más nos hacen sobre el blanqueamiento.", points: ["En un esmalte sano, el blanqueamiento es seguro", "Puede haber algo de sensibilidad, que pasa en unos días", "Te diremos qué método va mejor con tus dientes"], closing: "Pide una revisión y te diremos qué es realista para ti.", avoid: ["Prometer un tono concreto", "Afirmaciones de antes y después"], setup: ["Teléfono a la altura de los ojos", "Luz delante de ti", "Una sala tranquila"], minutes: 2))

    static let fr = DemoContent(
        clinic: "Cabinet Dentaire Exemple", city: "Lyon", country: "FR",
        services: ["Contrôles", "Blanchiment", "Implants", "Aligneurs"],
        closing: "Prenez rendez-vous en ligne.",
        titles: ["Combien de temps dure un blanchiment\u{00A0}?", "Implant ou bridge\u{00A0}?", "Le fil dentaire en deux minutes", "Pourquoi les gencives saignent-elles\u{00A0}?", "Aligneurs\u{00A0}: à quoi s'attendre", "Dents sensibles au froid", "Bienvenue au cabinet"],
        captions: ["Le blanchiment ne dure pas toujours, et c'est normal. Voici ce qui change le résultat.", "Deux bonnes options pour une dent manquante, et comment nous choisissons avec vous.", "Une fois par jour suffit. Voici comment bien faire.", "Des gencives qui saignent sont un signal, pas une étape normale du brossage."],
        tags: ["dentiste", "blanchiment", "sourire"],
        card: ShootCard(opening: "Bonjour, je suis le Dr Martin. Voici la question qu'on nous pose le plus sur le blanchiment.", points: ["Sur un émail sain, le blanchiment est sûr", "Une sensibilité peut apparaître et disparaît en quelques jours", "Nous vous disons quelle méthode convient à vos dents"], closing: "Prenez rendez-vous pour un contrôle et nous verrons ce qui est réaliste pour vous.", avoid: ["Promettre une teinte", "Comparaisons avant/après"], setup: ["Téléphone à hauteur des yeux", "Lumière devant vous", "Une pièce calme"], minutes: 2))

    static let ja = DemoContent(
        clinic: "サンプル歯科", city: "横浜", country: "JP",
        services: ["定期検診", "ホワイトニング", "インプラント", "マウスピース矯正"],
        closing: "検診のご予約はオンラインで。",
        titles: ["ホワイトニングはどのくらい続く？", "インプラントとブリッジ、どちらがいい？", "2分でできるデンタルフロス", "歯ぐきから血が出るのはなぜ？", "マウスピース矯正で知っておきたいこと", "冷たい飲み物でしみる歯", "当院へようこそ"],
        captions: ["ホワイトニングの効果はずっとは続きません。それは自然なことです。結果を左右するポイントをご紹介します。", "歯を失ったときの2つの選択肢と、一緒に選ぶ方法。", "1日1回で十分です。正しいやり方はこちら。", "歯ぐきからの出血はサインです。歯みがきで普通に起こるものではありません。"],
        tags: ["歯医者", "ホワイトニング", "歯の健康"],
        card: ShootCard(opening: "こんにちは、歯科医師の佐藤です。ホワイトニングについて一番多いご質問にお答えします。", points: ["健康なエナメル質なら、ホワイトニングは安全です", "しみることがありますが、数日でおさまります", "どの方法が合うかは、私たちがご説明します"], closing: "検診のご予約をどうぞ。あなたに合った方法をお伝えします。", avoid: ["特定の白さを約束すること", "ビフォーアフターの表現"], setup: ["スマホは目の高さに", "光は正面から", "静かな部屋で"], minutes: 2))

    static let ar = DemoContent(
        clinic: "عيادة أسنان تجريبية", city: "عمّان", country: "JO",
        services: ["فحص دوري", "تبييض", "زراعة", "تقويم شفاف"],
        closing: "احجز موعد الفحص عبر الإنترنت.",
        titles: ["كم يدوم تبييض الأسنان؟", "زراعة أم جسر؟", "خيط الأسنان في دقيقتين", "لماذا تنزف اللثة؟", "التقويم الشفاف: ماذا تتوقع", "حساسية الأسنان مع المشروبات الباردة", "أهلًا بكم في عيادتنا"],
        captions: ["التبييض لا يدوم إلى الأبد، وهذا طبيعي. إليك ما يغيّر النتيجة.", "خياران جيدان لسنّ مفقودة، وكيف نختار معك.", "مرة واحدة في اليوم تكفي. هكذا تفعلها بشكل صحيح.", "نزيف اللثة إشارة، وليس جزءًا طبيعيًا من تنظيف الأسنان."],
        tags: ["طبيب_أسنان", "تبييض", "ابتسامة"],
        card: ShootCard(opening: "مرحبًا، أنا د. سلمى. هذا أكثر سؤال يطرحه المرضى عن التبييض.", points: ["التبييض آمن على مينا الأسنان السليمة", "قد تظهر حساسية خفيفة وتزول خلال أيام", "نخبرك بالطريقة التي تناسب أسنانك"], closing: "احجز موعد فحص وسنخبرك بما هو واقعي بالنسبة لك.", avoid: ["الوعد بدرجة لون معيّنة", "ادعاءات قبل وبعد"], setup: ["الهاتف بمستوى العينين", "الضوء أمامك", "غرفة هادئة"], minutes: 2))

    static let pl = DemoContent(
        clinic: "Przykładowy Gabinet Stomatologiczny", city: "Poznań", country: "PL",
        services: ["Przeglądy", "Wybielanie", "Implanty", "Nakładki"],
        closing: "Umów przegląd online.",
        titles: ["Jak długo utrzymuje się wybielanie?", "Implant czy most?", "Nić dentystyczna w dwie minuty", "Dlaczego krwawią dziąsła?", "Nakładki ortodontyczne: czego się spodziewać", "Nadwrażliwość zębów na zimno", "Witamy w naszym gabinecie"],
        captions: ["Wybielanie nie jest na zawsze i to normalne. Oto, co wpływa na efekt.", "Dwie dobre opcje przy brakującym zębie i jak wybieramy razem z Tobą.", "Raz dziennie wystarczy. Tak robi się to dobrze.", "Krwawiące dziąsła to sygnał, a nie normalna część szczotkowania."],
        tags: ["dentysta", "wybielanie", "uśmiech"],
        card: ShootCard(opening: "Dzień dobry, jestem dr Nowak. Oto pytanie o wybielanie, które pacjenci zadają najczęściej.", points: ["Na zdrowym szkliwie wybielanie jest bezpieczne", "Może pojawić się nadwrażliwość, która mija po kilku dniach", "Powiemy, która metoda pasuje do Twoich zębów"], closing: "Umów się na przegląd, a powiemy, czego realnie możesz się spodziewać.", avoid: ["Obiecywanie konkretnego odcienia", "Porównania przed i po"], setup: ["Telefon na wysokości oczu", "Światło przed Tobą", "Cichy pokój"], minutes: 2))
}
#endif
