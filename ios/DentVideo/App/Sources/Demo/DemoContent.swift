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
    /// The clinic's topic suggestions ("Suggest a topic for next week"): one made, one waiting.
    var topics: [String]
    /// The logo preview's first sample (flossing, titles[2]): hook, statement, list heading, three
    /// list items, call to action. In demo mode it stands in for the web's preview library.
    var sample: [String]
    /// The second sample (sensitive teeth, titles[5]): hook and two statements.
    var sample2: [String]
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
        captions: ["Whitening fades over time, and that's normal. Here is what changes the result.", "Two good options for a missing tooth, and how we help you choose.", "Once a day is enough. This is how to do it well.", "Bleeding gums are a signal, not a normal part of brushing."],
        tags: ["dentist", "whitening", "smile"],
        topics: ["How long does sensitivity last after whitening?", "Can I floss around a bridge?"],
        sample: ["Do your gums bleed when you floss?", "Floss once a day, gently, before you brush.", "Three steps", "Take a fresh piece for each gap.", "Curve it around the tooth.", "Slide it gently below the gumline.", "Questions? Ask us at your next check-up."],
        sample2: ["Cold drinks make a tooth twinge?", "Sensitive teeth are common and have many causes.", "A toothpaste for sensitive teeth can help. If it keeps happening, mention it at your check-up."],
        card: ShootCard(opening: "Hi, I'm Dr. Reed. Here's the question patients ask most about whitening.", points: ["Whitening is safe on healthy enamel", "Some sensitivity can happen and fades in a few days", "We'll tell you which method suits your teeth"], closing: "Book a check-up and we'll tell you what's realistic for you.", avoid: ["Promising a shade", "Before-and-after claims"], setup: ["Phone at eye level", "Light in front of you", "A quiet room"], minutes: 2))

    static let tr = DemoContent(
        clinic: "Örnek Diş Kliniği", city: "İzmir", country: "TR",
        services: ["Kontrol", "Beyazlatma", "İmplant", "Şeffaf plak"],
        closing: "Merak ettiklerinizi kontrol randevunuzda sorabilirsiniz.",
        titles: ["Diş beyazlatmanın etkisi ne kadar sürer?", "İmplant mı, köprü mü?", "İki dakikada diş ipi", "Diş etleri neden kanar?", "Şeffaf plak: nelere hazır olmalı?", "Soğuk içecekte diş hassasiyeti", "Kliniğimize hoş geldiniz"],
        captions: ["Beyazlatma sonsuza kadar sürmez, bu normaldir. Sonucu neyin değiştirdiğini anlatıyoruz.", "Eksik bir diş için iki iyi seçenek ve size uygun olanı birlikte nasıl seçtiğimiz.", "Günde bir kez yeterli. Doğru yapmanın yolu bu.", "Diş eti kanaması bir işarettir, fırçalamanın normal bir parçası değildir."],
        tags: ["dişhekimi", "beyazlatma", "gülüş"],
        topics: ["Beyazlatma sonrası hassasiyet ne kadar sürer?", "Köprünün çevresinde diş ipi nasıl kullanılır?"],
        sample: ["Diş ipi kullanırken diş etiniz kanıyor mu?", "Diş ipini günde bir kez, fırçalamadan önce nazikçe kullanın.", "Üç adım", "Her aralık için temiz bir parça alın.", "İpi dişin etrafında kıvırın.", "Diş eti çizgisinin altına nazikçe kaydırın.", "Sorularınızı bir sonraki kontrolünüzde sorabilirsiniz."],
        sample2: ["Soğuk içecekte dişiniz sızlıyor mu?", "Diş hassasiyeti sık görülür ve birçok nedeni olabilir.", "Hassas dişler için bir diş macunu işe yarayabilir. Devam ederse kontrolünüzde söyleyin."],
        card: ShootCard(opening: "Merhaba, ben Dr. Aydın. Hastaların beyazlatma hakkında en çok sorduğu soru şu.", points: ["Sağlıklı minede beyazlatma güvenlidir", "Hafif hassasiyet olabilir, birkaç günde geçer", "Dişlerinize uygun yöntemi birlikte seçeriz"], closing: "Sizin için neyin gerçekçi olduğunu diş hekiminiz muayenede söyleyebilir.", avoid: ["Belirli bir renk vaat etmek", "Önce-sonra iddiaları"], setup: ["Telefon göz hizasında", "Işık önünüzde", "Sessiz bir oda"], minutes: 2))

    static let de = DemoContent(
        clinic: "Demo Zahnarztpraxis", city: "Freiburg", country: "DE",
        services: ["Kontrolluntersuchung", "Bleaching", "Implantate", "Aligner"],
        closing: "Kontrolltermin jetzt online buchen.",
        titles: ["Wie lange hält Bleaching?", "Implantat oder Brücke?", "Zahnseide in zwei Minuten", "Warum blutet das Zahnfleisch?", "Aligner: was Sie erwartet", "Empfindliche Zähne bei Kälte", "Willkommen in unserer Praxis"],
        captions: ["Bleaching hält nicht ewig, und das ist normal. Das beeinflusst das Ergebnis.", "Zwei gute Lösungen für einen fehlenden Zahn, und wie wir gemeinsam wählen.", "Einmal am Tag reicht. So geht es richtig.", "Zahnfleischbluten ist ein Signal, kein normaler Teil des Zähneputzens."],
        tags: ["zahnarzt", "bleaching", "zahngesundheit"],
        topics: ["Wie lange hält die Empfindlichkeit nach dem Bleaching an?", "Wie benutze ich Zahnseide an einer Brücke?"],
        sample: ["Blutet Ihr Zahnfleisch bei der Zahnseide?", "Benutzen Sie Zahnseide einmal am Tag, sanft und vor dem Putzen.", "Drei Schritte", "Für jeden Zwischenraum ein frisches Stück nehmen.", "Die Seide um den Zahn legen.", "Sanft unter den Zahnfleischrand führen.", "Fragen? Sprechen Sie uns bei der nächsten Kontrolle an."],
        sample2: ["Ziehen Ihre Zähne bei kalten Getränken?", "Empfindliche Zähne sind häufig und haben viele Ursachen.", "Eine Zahnpasta für empfindliche Zähne kann helfen. Hält es an, erwähnen Sie es bei der Kontrolle."],
        card: ShootCard(opening: "Hallo, ich bin Dr. Weber. Das ist die Frage, die Patientinnen und Patienten am häufigsten zum Bleaching stellen.", points: ["Auf gesundem Zahnschmelz ist Bleaching sicher", "Leichte Empfindlichkeit kann auftreten und vergeht nach einigen Tagen", "Wir sagen Ihnen, welche Methode zu Ihren Zähnen passt"], closing: "Vereinbaren Sie einen Kontrolltermin, dann besprechen wir, was für Sie realistisch ist.", avoid: ["Eine bestimmte Zahnfarbe versprechen", "Vorher-nachher-Aussagen"], setup: ["Telefon auf Augenhöhe", "Licht von vorn", "Ein ruhiger Raum"], minutes: 2))

    static let es = DemoContent(
        clinic: "Clínica Dental Ejemplo", city: "Valencia", country: "ES",
        services: ["Revisiones", "Blanqueamiento", "Implantes", "Alineadores"],
        closing: "Pide tu revisión online.",
        titles: ["¿Cuánto dura un blanqueamiento?", "¿Implante o puente?", "Hilo dental en dos minutos", "¿Por qué sangran las encías?", "Alineadores: qué esperar", "Dientes sensibles al frío", "Bienvenidos a nuestra clínica"],
        captions: ["El blanqueamiento se atenúa con el tiempo, y es normal. Esto es lo que cambia el resultado.", "Dos buenas opciones para un diente que falta, y cómo elegimos contigo.", "Una vez al día es suficiente. Así se hace bien.", "Las encías que sangran son una señal, no algo normal del cepillado."],
        tags: ["dentista", "blanqueamiento", "sonrisa"],
        topics: ["¿Cuánto dura la sensibilidad después del blanqueamiento?", "¿Cómo uso el hilo dental con un puente?"],
        sample: ["¿Te sangran las encías al usar hilo dental?", "Usa hilo dental una vez al día, con suavidad, antes de cepillarte.", "Tres pasos", "Usa un tramo limpio para cada espacio.", "Rodea el diente con el hilo.", "Deslízalo con suavidad bajo la encía.", "¿Dudas? Pregúntanos en tu próxima revisión."],
        sample2: ["¿Te molesta un diente con las bebidas frías?", "La sensibilidad dental es frecuente y tiene muchas causas.", "Una pasta para dientes sensibles puede ayudar. Si sigue, coméntalo en tu revisión."],
        card: ShootCard(opening: "Hola, soy la Dra. Ruiz. Esta es la pregunta que más nos hacen sobre el blanqueamiento.", points: ["En un esmalte sano, el blanqueamiento es seguro", "Puede haber algo de sensibilidad, que pasa en unos días", "Te diremos qué método va mejor con tus dientes"], closing: "Pide una revisión y te diremos qué es realista para ti.", avoid: ["Prometer un tono concreto", "Afirmaciones de antes y después"], setup: ["Teléfono a la altura de los ojos", "Luz delante de ti", "Una sala tranquila"], minutes: 2))

    static let fr = DemoContent(
        clinic: "Cabinet Dentaire Exemple", city: "Lyon", country: "FR",
        services: ["Contrôles", "Blanchiment", "Implants", "Aligneurs"],
        closing: "Prenez rendez-vous en ligne.",
        titles: ["Combien de temps dure un blanchiment\u{00A0}?", "Implant ou bridge\u{00A0}?", "Le fil dentaire en deux minutes", "Pourquoi les gencives saignent-elles\u{00A0}?", "Aligneurs\u{00A0}: à quoi s'attendre", "Dents sensibles au froid", "Bienvenue au cabinet"],
        captions: ["Le blanchiment ne dure pas toujours, et c'est normal. Voici ce qui change le résultat.", "Deux bonnes options pour une dent manquante, et comment nous choisissons avec vous.", "Une fois par jour suffit. Voici comment bien faire.", "Des gencives qui saignent sont un signal, pas une étape normale du brossage."],
        tags: ["dentiste", "blanchiment", "sourire"],
        topics: ["Combien de temps dure la sensibilité après un blanchiment\u{00A0}?", "Comment passer le fil dentaire autour d'un bridge\u{00A0}?"],
        sample: ["Vos gencives saignent quand vous passez le fil\u{00A0}?", "Passez le fil une fois par jour, en douceur, avant le brossage.", "Trois étapes", "Prenez un morceau propre pour chaque espace.", "Enroulez le fil autour de la dent.", "Glissez-le doucement sous la gencive.", "Des questions\u{00A0}? Posez-les lors de votre prochain contrôle."],
        sample2: ["Une dent sensible au froid\u{00A0}?", "La sensibilité dentaire est fréquente et a de nombreuses causes.", "Un dentifrice pour dents sensibles peut aider. Si cela continue, parlez-en lors de votre contrôle."],
        card: ShootCard(opening: "Bonjour, je suis le Dr Martin. Voici la question qu'on nous pose le plus sur le blanchiment.", points: ["Sur un émail sain, le blanchiment est sûr", "Une sensibilité peut apparaître et disparaît en quelques jours", "Nous vous disons quelle méthode convient à vos dents"], closing: "Prenez rendez-vous pour un contrôle et nous verrons ce qui est réaliste pour vous.", avoid: ["Promettre une teinte", "Comparaisons avant/après"], setup: ["Téléphone à hauteur des yeux", "Lumière devant vous", "Une pièce calme"], minutes: 2))

    static let ja = DemoContent(
        clinic: "サンプル歯科", city: "横浜", country: "JP",
        services: ["定期検診", "ホワイトニング", "インプラント", "マウスピース矯正"],
        closing: "検診のご予約はオンラインで。",
        titles: ["ホワイトニングはどのくらい続く？", "インプラントとブリッジ、どちらがいい？", "2分でできるデンタルフロス", "歯ぐきから血が出るのはなぜ？", "マウスピース矯正で知っておきたいこと", "冷たい飲み物でしみる歯", "当院へようこそ"],
        captions: ["ホワイトニングの効果はずっとは続きません。それは自然なことです。結果を左右するポイントをご紹介します。", "歯を失ったときの2つの選択肢と、一緒に選ぶ方法。", "1日1回で十分です。正しいやり方はこちら。", "歯ぐきからの出血はサインです。歯みがきで普通に起こるものではありません。"],
        tags: ["歯医者", "ホワイトニング", "歯の健康"],
        topics: ["ホワイトニング後にしみるのはどのくらい続きますか？", "ブリッジのまわりのフロスはどうすればいい？"],
        sample: ["フロスで歯ぐきから血が出ますか？", "フロスは1日1回、歯みがきの前にやさしく。", "3つのステップ", "すき間ごとにきれいな部分を使う", "歯に沿わせるように曲げる", "歯ぐきの下までやさしく入れる", "気になることは次の検診でお聞きください。"],
        sample2: ["冷たい飲み物で歯がしみますか？", "知覚過敏はよくあることで、原因はさまざまです。", "知覚過敏用の歯みがき粉が役立つこともあります。続くときは検診でお伝えください。"],
        card: ShootCard(opening: "こんにちは、歯科医師の佐藤です。ホワイトニングについて一番多いご質問にお答えします。", points: ["健康なエナメル質なら、ホワイトニングは安全です", "しみることがありますが、数日でおさまります", "どの方法が合うかは、私たちがご説明します"], closing: "検診のご予約をどうぞ。あなたに合った方法をお伝えします。", avoid: ["特定の白さを約束すること", "ビフォーアフターの表現"], setup: ["スマホは目の高さに", "光は正面から", "静かな部屋で"], minutes: 2))

    static let ar = DemoContent(
        clinic: "عيادة أسنان تجريبية", city: "عمّان", country: "JO",
        services: ["فحص دوري", "تبييض", "زراعة", "تقويم شفاف"],
        closing: "احجز موعد الفحص عبر الإنترنت.",
        titles: ["كم يدوم تبييض الأسنان؟", "زراعة أم جسر؟", "خيط الأسنان في دقيقتين", "لماذا تنزف اللثة؟", "التقويم الشفاف: ماذا تتوقع", "حساسية الأسنان مع المشروبات الباردة", "أهلًا بكم في عيادتنا"],
        captions: ["يخفّ أثر التبييض مع الوقت، وهذا طبيعي. إليك ما يغيّر النتيجة.", "خياران جيدان لسنّ مفقودة، وكيف نختار معك.", "مرة واحدة في اليوم تكفي. هكذا تفعلها بشكل صحيح.", "نزيف اللثة إشارة، وليس جزءًا طبيعيًا من تنظيف الأسنان."],
        tags: ["طبيب_أسنان", "تبييض", "ابتسامة"],
        topics: ["كم تدوم حساسية الأسنان بعد التبييض؟", "كيف أستخدم خيط الأسنان حول الجسر؟"],
        sample: ["هل تنزف لثتك عند استخدام الخيط؟", "استخدم خيط الأسنان مرة يوميًا، برفق، قبل التفريش.", "ثلاث خطوات", "خذ جزءًا نظيفًا لكل فراغ.", "لُفّ الخيط حول السن.", "مرّره برفق تحت حافة اللثة.", "لديك أسئلة؟ اسألنا في فحصك القادم."],
        sample2: ["هل تتألم أسنانك مع المشروبات الباردة؟", "حساسية الأسنان شائعة ولها أسباب كثيرة.", "قد يساعد معجون للأسنان الحساسة. وإن استمرت، أخبرنا في فحصك القادم."],
        card: ShootCard(opening: "مرحبًا، أنا د. سلمى. هذا أكثر سؤال يطرحه المرضى عن التبييض.", points: ["التبييض آمن على مينا الأسنان السليمة", "قد تظهر حساسية خفيفة وتزول خلال أيام", "نخبرك بالطريقة التي تناسب أسنانك"], closing: "احجز موعد فحص وسنخبرك بما هو واقعي بالنسبة لك.", avoid: ["الوعد بدرجة لون معيّنة", "ادعاءات قبل وبعد"], setup: ["الهاتف بمستوى العينين", "الضوء أمامك", "غرفة هادئة"], minutes: 2))

    static let pl = DemoContent(
        clinic: "Przykładowy Gabinet Stomatologiczny", city: "Poznań", country: "PL",
        services: ["Przeglądy", "Wybielanie", "Implanty", "Nakładki"],
        closing: "Umów przegląd online.",
        titles: ["Jak długo utrzymuje się wybielanie?", "Implant czy most?", "Nić dentystyczna w dwie minuty", "Dlaczego krwawią dziąsła?", "Nakładki ortodontyczne: czego się spodziewać", "Nadwrażliwość zębów na zimno", "Witamy w naszym gabinecie"],
        captions: ["Efekt wybielania słabnie z czasem i to normalne. Oto, co na niego wpływa.", "Dwie dobre opcje przy brakującym zębie i jak wybieramy razem z Tobą.", "Raz dziennie wystarczy. Tak robi się to dobrze.", "Krwawiące dziąsła to sygnał, a nie normalna część szczotkowania."],
        tags: ["dentysta", "wybielanie", "uśmiech"],
        topics: ["Jak długo trwa nadwrażliwość po wybielaniu?", "Jak nitkować zęby przy moście?"],
        sample: ["Krwawią Ci dziąsła przy nitkowaniu?", "Nitkuj zęby raz dziennie, delikatnie, przed szczotkowaniem.", "Trzy kroki", "Na każdą przestrzeń weź czysty odcinek nici.", "Owiń nić wokół zęba.", "Delikatnie wsuń ją pod brzeg dziąsła.", "Masz pytania? Zadaj je podczas następnego przeglądu."],
        sample2: ["Zęby bolą przy zimnych napojach?", "Nadwrażliwość zębów jest częsta i ma wiele przyczyn.", "Pasta do zębów wrażliwych może pomóc. Jeśli to trwa, powiedz o tym na przeglądzie."],
        card: ShootCard(opening: "Dzień dobry, jestem dr Nowak. Oto pytanie o wybielanie, które pacjenci zadają najczęściej.", points: ["Na zdrowym szkliwie wybielanie jest bezpieczne", "Może pojawić się nadwrażliwość, która mija po kilku dniach", "Powiemy, która metoda pasuje do Twoich zębów"], closing: "Umów się na przegląd, a powiemy, czego realnie możesz się spodziewać.", avoid: ["Obiecywanie konkretnego odcienia", "Porównania przed i po"], setup: ["Telefon na wysokości oczu", "Światło przed Tobą", "Cichy pokój"], minutes: 2))
}
#endif
