import type { Guide } from "../dentvideo";

// "How often and when should a dental clinic post?" in six markets, each
// written for its own readers (not translated line by line). No invented
// statistics or "magic hours": the honest answer is a rhythm the clinic can
// keep, and timing read from the clinic's own audience data. Same topic key,
// so the four are hreflang alternates.

const DATES = { published: "2026-11-14", updated: "2026-11-14", reviewed: "2026-11-14" } as const;

const EN: Guide = {
  locale: "en",
  slug: "how-often-should-a-dental-practice-post",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES,
  // Updated 2026-11-23 (direct-answer intro, key takeaways, no em dashes); the facts were last checked on 2026-11-14.
  updated: "2026-11-23",
  title: "How often should a dental practice post on social media, and when?",
  seoTitle: "How often should a dental practice post?",
  seoDescription: "A posting rhythm a dental clinic can keep: how many posts a week, how to find your audience's active hours, and why consistency beats volume.",
  description: "An honest answer to the frequency question for dental clinics: rhythms by the time you have, how to read your own audience data for timing, and how to keep every post within the rules.",
  h1: "How often should a dental practice post on social media, and when?",
  intro:
    "No platform requires or rewards a set number of posts for every account. For most dental clinics, two to five posts a week that the team can keep up all year work better than a burst of daily posts followed by silence. Post when your own followers are online, which each platform shows in its audience data.",
  takeaways: [
    "No platform publishes a required posting frequency for business accounts.",
    "Start from the hours your team really has. A smaller rhythm kept up all year beats an ambitious one dropped after a month.",
    "Post when your own followers are online, as your audience data shows, and compare times after four to six weeks.",
    "Batch the work: choose the week's topics on a fixed day and approve them in one sitting.",
  ],
  sections: [
    {
      heading: "Is there an ideal number of posts per week?",
      paragraphs: [
        "Not a universal one. Social platforms change how they rank content regularly and do not publish a required posting frequency for business accounts. Most advice you will read (“post daily”, “post three times a week”) is a rule of thumb from marketing agencies, not a measured law, and many of those sources sell posting services.",
        "What does hold up is simpler: an account that posts regularly gives followers a reason to keep watching, and an account that goes quiet for months looks abandoned to a patient who finds it. So the useful question is not “what is the ideal number?” but “what can we keep up every week without cutting corners on quality or compliance?”",
      ],
    },
    {
      heading: "What rhythm fits the time your clinic has?",
      paragraphs: ["Start from the hours your team can really give each week. A smaller rhythm kept for a year beats an ambitious one dropped after a month."],
      table: {
        caption: "Posting rhythms for a dental clinic, by the time available",
        columns: ["Time each week", "A realistic rhythm", "What it looks like"],
        rows: [
          ["Under an hour", "Two posts a week", "One short educational video and one clinic or team post"],
          ["Two to three hours", "Three or four posts a week, plus a few Stories", "Two videos answering patient questions, one team or behind-the-scenes post, one seasonal reminder"],
          ["A team member with dedicated time", "Five posts a week, Stories most days", "One video per weekday, a mix of prevention, treatment questions and the team"],
          ["Videos made for you", "Five videos a week to choose from", "Approve the week's videos on Monday, schedule them, add your own clips when you have time"],
        ],
        note: "These are working suggestions, not platform rules. Adjust after a month by looking at what your own followers watched.",
      },
      after: [
        "Whatever you choose, plan it. The [52-week dental content calendar](guide:dental-social-media-content-calendar) gives one topic a week for a year, and [dental social media post ideas](guide:dental-social-media-post-ideas) lists formats that keep a feed varied.",
      ],
    },
    {
      heading: "When should a dental clinic post?",
      paragraphs: [
        "Generic charts of “best times to post” average millions of accounts in many industries and time zones. Your followers are mostly local patients with their own routines, so your own data is the better guide. Every major platform shows it to business accounts:",
      ],
      list: [
        "Instagram: in the professional dashboard, the insights for your followers include their most active times by day and hour.",
        "Facebook: Meta Business Suite shows when your Page's followers are online and lets you schedule posts for those times.",
        "TikTok: with a business account, the analytics show follower activity by hour.",
        "YouTube: YouTube Studio's audience report shows when your viewers are on YouTube.",
      ],
      after: [
        "Until you have enough data, test times that fit patients' days (before work, around lunch and in the evening) and compare after four to six weeks. Keep the time you post consistent enough to compare, and change one thing at a time.",
      ],
    },
    {
      heading: "Which formats should a clinic post each week?",
      paragraphs: [
        "Short vertical video is the format platforms push most to people who do not follow you yet, which makes it the main way new patients find a clinic. Stories keep existing followers in touch day to day. Carousels and photos work for practical information people want to save. A balanced week might be two or three short videos, one carousel or photo post, and a handful of Stories.",
        "Patient-education videos are the safest high-value format: they answer a real question, they are useful even to people who never book, and they avoid the riskiest kinds of content, such as before-and-after photos, testimonials and offers. Our guide to [Instagram videos for dentists](guide:instagram-videos-for-dentists) covers filming your own.",
      ],
    },
    {
      heading: "Does posting more often change the rules?",
      paragraphs: [
        "No, but it multiplies the chances of a mistake. Every post from a clinic account is health advertising in most countries, whether it is the first of the month or the twentieth. A higher rhythm needs a quick, repeatable check before each post: no “painless” or guaranteed results, no prices or discounts in social posts, no patient photos without written consent, no testimonials where they are restricted. The [dental advertising rules overview](guide:dental-social-media-advertising-rules) explains the differences by country, and our free [“Is my post allowed?” checker](checker:) gives a first pass on any caption in seconds.",
      ],
    },
    {
      heading: "How do you keep a rhythm without it taking over the week?",
      ordered: true,
      paragraphs: ["Clinics that keep posting for a year usually batch the work instead of posting on the fly:"],
      list: [
        "Choose the week's topics on one day, ideally from questions patients asked at the chair the week before.",
        "Make or approve all of the week's posts in one sitting.",
        "Check every caption against the advertising rules before scheduling.",
        "Schedule them with the platform's own tools, so nothing depends on someone remembering.",
        "Once a month, look at what your followers watched and saved, and adjust topics and times.",
      ],
      after: [
        "[DentVideo](landing:) was built for this rhythm: five narrated, captioned patient-education videos are ready every Monday, each checked for clinical accuracy and advertising rules, so the weekly work is approving and scheduling. [See a live preview with your logo](start:) before you choose a plan.",
        "For a complete weekly plan for a small team, from choosing channels to knowing whether it works, see [dental video marketing for small practices](guide:dental-video-marketing-for-small-practices).",
      ],
    },
  ],
  faq: [
    { q: "Is posting every day better for a dental clinic?", a: "Not necessarily. Daily posting only helps if quality and compliance hold up. For most clinics, two to five good posts a week kept up all year does more than daily posts for a month." },
    { q: "What time of day should a dentist post on Instagram?", a: "When your own followers are most active, which Instagram shows in the professional dashboard's insights. Until you have data, test before work, lunchtime and evening, and compare after a few weeks." },
    { q: "Should a clinic post at weekends?", a: "If your followers are active then, yes: scheduled posts need no one at the clinic. Check your audience data; weekend patterns differ a lot between clinics." },
    { q: "How many Stories should a clinic post?", a: "There is no fixed number. A few Stories on most days keep followers in touch; they disappear after a day, so they suit reminders, the team and behind-the-scenes moments." },
  ],
};

const DE: Guide = {
  locale: "de",
  slug: "wie-oft-sollte-eine-zahnarztpraxis-posten",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES,
  title: "Wie oft und wann sollte eine Zahnarztpraxis auf Instagram und Co. posten?",
  seoTitle: "Wie oft sollte eine Zahnarztpraxis posten?",
  seoDescription: "Ein Posting-Rhythmus, den Ihre Praxis halten kann: Beiträge pro Woche, die aktiven Zeiten Ihrer Follower finden und warum Regelmäßigkeit zählt.",
  description: "Eine ehrliche Antwort auf die Frage nach Häufigkeit und Uhrzeit: Rhythmen nach verfügbarer Zeit, eigene Statistiken statt pauschaler Tabellen, und wie jeder Beitrag im Rahmen des Werberechts bleibt.",
  h1: "Wie oft sollte eine Zahnarztpraxis posten, und wann?",
  intro:
    "Eine Beitragszahl, die Plattformen für jedes Konto vorschreiben oder belohnen, gibt es nicht. Für die meisten Zahnarztpraxen funktioniert ein Rhythmus von zwei bis fünf Beiträgen pro Woche, den das Team ein ganzes Jahr durchhält, besser als tägliche Beiträge mit anschließender Funkstille. Die richtige Uhrzeit ist die, zu der Ihre eigenen Follower online sind. Instagram, Facebook, TikTok und YouTube zeigen das in ihren Statistiken.",
  sections: [
    {
      heading: "Gibt es die ideale Anzahl an Beiträgen pro Woche?",
      paragraphs: [
        "Nicht allgemeingültig. Die Plattformen ändern regelmäßig, wie sie Inhalte ausspielen, und veröffentlichen keine Pflichtfrequenz für Unternehmenskonten. Die meisten Empfehlungen wie „täglich posten“ oder „dreimal pro Woche“ sind Faustregeln von Agenturen, keine gemessenen Gesetze, und viele dieser Quellen verkaufen selbst Posting-Dienstleistungen.",
        "Was sich bewährt, ist einfacher: Ein Konto, das regelmäßig postet, gibt Followern einen Grund dranzubleiben. Ein Konto, das monatelang schweigt, wirkt auf Patienten, die es finden, verwaist. Die sinnvolle Frage ist also nicht „Wie viel ist ideal?“, sondern „Was schaffen wir jede Woche, ohne bei Qualität oder Werberecht Abstriche zu machen?“",
      ],
    },
    {
      heading: "Welcher Rhythmus passt zur Zeit Ihrer Praxis?",
      paragraphs: ["Gehen Sie von den Stunden aus, die Ihr Team wirklich hat. Ein kleiner Rhythmus, den Sie ein Jahr halten, schlägt einen ehrgeizigen, der nach einem Monat einschläft."],
      table: {
        caption: "Posting-Rhythmen für Zahnarztpraxen nach verfügbarer Zeit",
        columns: ["Zeit pro Woche", "Realistischer Rhythmus", "So sieht es aus"],
        rows: [
          ["Unter einer Stunde", "Zwei Beiträge pro Woche", "Ein kurzes Aufklärungsvideo und ein Beitrag über Praxis oder Team"],
          ["Zwei bis drei Stunden", "Drei bis vier Beiträge pro Woche, dazu einige Stories", "Zwei Videos zu Patientenfragen, ein Team- oder Blick-hinter-die-Kulissen-Beitrag, ein saisonaler Hinweis"],
          ["Eine Mitarbeiterin mit fest eingeplanter Zeit", "Fünf Beiträge pro Woche, Stories an den meisten Tagen", "Ein Video pro Werktag, gemischt aus Prophylaxe, Behandlungsfragen und Team"],
          ["Videos, die für Sie erstellt werden", "Fünf Videos pro Woche zur Auswahl", "Montags freigeben, einplanen, eigene Clips ergänzen, wenn Zeit ist"],
        ],
        note: "Das sind Arbeitsvorschläge, keine Plattformregeln. Passen Sie nach einem Monat an, je nachdem, was Ihre Follower angesehen haben.",
      },
      after: [
        "Was auch immer Sie wählen: Planen Sie es. Der [Redaktionsplan für 52 Wochen](guide:redaktionsplan-social-media-zahnarztpraxis) liefert ein Thema pro Woche für ein Jahr, und die [Social-Media-Ideen für die Zahnarztpraxis](guide:social-media-zahnarztpraxis-ideen) zeigen Formate, die den Feed abwechslungsreich halten.",
      ],
    },
    {
      heading: "Wann sollte eine Zahnarztpraxis posten?",
      paragraphs: [
        "Allgemeine Tabellen mit „besten Posting-Zeiten“ mitteln Millionen Konten aus vielen Branchen und Zeitzonen. Ihre Follower sind überwiegend Patienten aus der Umgebung mit eigenem Tagesablauf. Ihre eigenen Daten sind deshalb der zuverlässigere Wegweiser. Jede große Plattform zeigt sie Unternehmenskonten an:",
      ],
      list: [
        "Instagram: Im professionellen Dashboard zeigen die Statistiken zu Ihren Followern die aktivsten Zeiten nach Tag und Uhrzeit.",
        "Facebook: Die Meta Business Suite zeigt, wann die Follower Ihrer Seite online sind, und plant Beiträge für diese Zeiten ein.",
        "TikTok: Mit einem Business-Konto zeigen die Analysen die Aktivität Ihrer Follower nach Stunden.",
        "YouTube: Der Bericht „Zielgruppe“ in YouTube Studio zeigt, wann Ihre Zuschauer auf YouTube sind.",
      ],
      after: [
        "Solange noch zu wenige Daten vorliegen, testen Sie Zeiten, die zum Alltag Ihrer Patienten passen (vor der Arbeit, mittags und abends), und vergleichen Sie nach vier bis sechs Wochen. Ändern Sie dabei immer nur eine Sache.",
      ],
    },
    {
      heading: "Welche Formate gehören in eine Woche?",
      paragraphs: [
        "Kurze Hochformat-Videos spielen die Plattformen am stärksten an Menschen aus, die Ihnen noch nicht folgen. Das ist der wichtigste Weg, über den neue Patienten eine Praxis entdecken. Stories halten bestehende Follower im Alltag auf dem Laufenden. Karussells und Fotos eignen sich für praktische Informationen zum Speichern. Eine ausgewogene Woche: zwei bis drei kurze Videos, ein Karussell oder Foto und einige Stories.",
        "Aufklärungsvideos sind dabei das sicherste Format mit hohem Nutzen: Sie beantworten eine echte Frage, helfen auch Menschen, die nie einen Termin buchen, und vermeiden die riskantesten Inhalte wie Vorher-Nachher-Bilder, Patientenstimmen und Aktionen. Wie Sie eigene Videos drehen, steht im Ratgeber zu [Instagram-Videos für Zahnarztpraxen](guide:instagram-videos-fuer-zahnarztpraxen).",
      ],
    },
    {
      heading: "Ändert häufigeres Posten etwas am Werberecht?",
      paragraphs: [
        "Nein, aber jeder zusätzliche Beitrag ist eine zusätzliche Gelegenheit für einen Fehler. Jeder Beitrag eines Praxiskontos fällt unter das Heilmittelwerbegesetz und die Berufsordnung, egal ob es der erste oder der zwanzigste im Monat ist. Ein höherer Rhythmus braucht deshalb einen schnellen, wiederholbaren Check vor jedem Beitrag: kein „schmerzfrei“, keine Erfolgsversprechen, keine Preise oder Rabatte, keine Patientenfotos ohne schriftliche Einwilligung. Die Einzelheiten stehen im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media); eine schnelle erste Prüfung jedes Beitragstextes bietet unser kostenloser [Werbe-Check „Ist mein Post erlaubt?“](checker:).",
      ],
    },
    {
      heading: "Wie halten Sie den Rhythmus, ohne dass er die Woche frisst?",
      ordered: true,
      paragraphs: ["Praxen, die ein Jahr lang dranbleiben, bündeln die Arbeit, statt spontan zu posten:"],
      list: [
        "Die Themen der Woche an einem festen Tag wählen, idealerweise aus Fragen, die Patienten in der Vorwoche gestellt haben.",
        "Alle Beiträge der Woche in einer Sitzung erstellen oder freigeben.",
        "Jeden Beitragstext vor dem Einplanen gegen das Werberecht prüfen.",
        "Mit den Planungsfunktionen der Plattformen einplanen, damit nichts davon abhängt, dass jemand daran denkt.",
        "Einmal im Monat ansehen, was Follower geschaut und gespeichert haben, und Themen und Zeiten anpassen.",
      ],
      after: [
        "[DentVideo](landing:) ist für genau diesen Rhythmus gebaut: Jeden Montag liegen fünf vertonte, untertitelte Aufklärungsvideos bereit, jedes auf fachliche Richtigkeit und Werberecht geprüft. Die wöchentliche Arbeit ist dann Freigeben und Einplanen. [Sehen Sie vorab Ihre Live-Vorschau mit Logo](start:).",
      ],
    },
  ],
  faq: [
    { q: "Ist tägliches Posten für eine Zahnarztpraxis sinnvoll?", a: "Nicht unbedingt. Tägliches Posten hilft nur, wenn Qualität und Werberecht dabei nicht leiden. Für die meisten Praxen bringen zwei bis fünf gute Beiträge pro Woche über das ganze Jahr mehr als ein Monat täglicher Beiträge." },
    { q: "Zu welcher Uhrzeit sollte eine Zahnarztpraxis auf Instagram posten?", a: "Wenn Ihre eigenen Follower am aktivsten sind. Das zeigt Instagram in den Statistiken des professionellen Dashboards. Ohne Daten testen Sie vor der Arbeit, mittags und abends und vergleichen nach einigen Wochen." },
    { q: "Sollte eine Praxis am Wochenende posten?", a: "Wenn Ihre Follower dann aktiv sind, ja. Eingeplante Beiträge brauchen niemanden in der Praxis. Prüfen Sie Ihre Statistiken; Wochenendmuster unterscheiden sich stark zwischen Praxen." },
    { q: "Braucht ein Instagram-Konto einer Praxis ein Impressum?", a: "Geschäftlich genutzte Konten brauchen in Deutschland in der Regel eine leicht erreichbare Anbieterkennzeichnung, meist als Link im Profil auf das Impressum der Website. Klären Sie Details mit Ihrer Kammer." },
  ],
};

const TR: Guide = {
  locale: "tr",
  slug: "dis-klinigi-ne-siklikla-paylasim-yapmali",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES,
  title: "Diş kliniği Instagram'da ne sıklıkla ve hangi saatlerde paylaşım yapmalı?",
  seoTitle: "Diş kliniği ne sıklıkla paylaşım yapmalı?",
  seoDescription: "Bir diş kliniğinin sürdürebileceği paylaşım ritmi: haftada kaç paylaşım, kendi takipçilerinizin aktif saatlerini nasıl bulursunuz, neden düzen önemlidir.",
  description: "Paylaşım sıklığı ve saati sorusuna dürüst bir yanıt: ayırabildiğiniz zamana göre ritimler, genel tablolar yerine kendi istatistikleriniz ve her paylaşımın tanıtım kurallarına uygun kalması.",
  h1: "Diş kliniği ne sıklıkla paylaşım yapmalı, hangi saatlerde?",
  intro:
    "Platformların her hesap için şart koştuğu ya da ödüllendirdiği bir paylaşım sayısı yoktur. Çoğu diş kliniği için, ekibin bütün yıl sürdürebileceği haftada iki ila beş paylaşımlık bir ritim, birkaç hafta her gün paylaşıp sonra susmaktan daha iyi işler. Doğru saat ise kendi takipçilerinizin çevrim içi olduğu saattir; Instagram, Facebook, TikTok ve YouTube bunu kendi istatistiklerinde gösterir.",
  sections: [
    {
      heading: "Haftada kaç paylaşım yapmak gerekir?",
      paragraphs: [
        "Herkes için geçerli bir sayı yok. Platformlar içerikleri nasıl öne çıkardıklarını düzenli olarak değiştirir ve işletme hesapları için zorunlu bir paylaşım sıklığı yayımlamaz. Okuduğunuz “her gün paylaşın”, “haftada üç kez paylaşın” gibi tavsiyelerin çoğu ajansların genel kuralıdır, ölçülmüş bir yasa değil; bu kaynakların birçoğu da paylaşım hizmeti satar.",
        "İşe yarayan şey daha basittir: düzenli paylaşım yapan bir hesap, takipçilere izlemeye devam etmek için bir neden verir. Aylarca sessiz kalan bir hesap ise onu bulan hastaya terk edilmiş gibi görünür. Bu yüzden doğru soru “İdeal sayı kaç?” değil, “Kaliteden ve kurallardan ödün vermeden her hafta neyi sürdürebiliriz?” sorusudur.",
      ],
    },
    {
      heading: "Kliniğinizin zamanına hangi ritim uyar?",
      paragraphs: ["Ekibinizin her hafta gerçekten ayırabileceği saatlerden yola çıkın. Bir yıl sürdürülen küçük bir ritim, bir ay sonra bırakılan iddialı bir plandan daha değerlidir."],
      table: {
        caption: "Ayrılabilen zamana göre diş kliniği paylaşım ritimleri",
        columns: ["Haftalık zaman", "Gerçekçi ritim", "Nasıl görünür"],
        rows: [
          ["Bir saatten az", "Haftada iki paylaşım", "Bir kısa bilgilendirme videosu ve klinik ya da ekiple ilgili bir paylaşım"],
          ["İki üç saat", "Haftada üç dört paylaşım ve birkaç hikâye", "Hasta sorularını yanıtlayan iki video, bir ekip ya da kamera arkası paylaşımı, bir mevsimsel hatırlatma"],
          ["Bu işe zaman ayrılmış bir ekip üyesi", "Haftada beş paylaşım, çoğu gün hikâye", "Her iş günü bir video; koruyucu konular, tedavi soruları ve ekip karışık"],
          ["Sizin için hazırlanan videolar", "Haftada seçebileceğiniz beş video", "Pazartesi onaylayın, zamanlayın, vaktiniz olduğunda kendi kliplerinizi ekleyin"],
        ],
        note: "Bunlar platform kuralı değil, çalışma önerileridir. Bir ay sonra takipçilerinizin neyi izlediğine bakarak düzenleyin.",
      },
      after: [
        "Hangisini seçerseniz seçin, planlayın. [52 haftalık içerik takvimi](guide:dis-klinigi-sosyal-medya-icerik-takvimi) bir yıl boyunca her hafta için bir konu önerir; [diş hekimi Instagram paylaşım fikirleri](guide:dis-hekimi-instagram-paylasim-fikirleri) ise hesabınızı çeşitli tutan biçimleri listeler.",
      ],
    },
    {
      heading: "Diş kliniği hangi saatlerde paylaşım yapmalı?",
      paragraphs: [
        "İnternette dolaşan “Instagram paylaşım saatleri” tabloları, pek çok sektörden ve saat diliminden milyonlarca hesabın ortalamasıdır. Sizin takipçileriniz ise çoğunlukla kendi günlük düzeni olan yakın çevredeki hastalardır; bu yüzden kendi verileriniz daha güvenilir bir rehberdir. Büyük platformların hepsi bunu işletme hesaplarına gösterir:",
      ],
      list: [
        "Instagram: Profesyonel paneldeki takipçi istatistikleri, takipçilerinizin en aktif olduğu gün ve saatleri gösterir.",
        "Facebook: Meta Business Suite, sayfanızın takipçilerinin ne zaman çevrim içi olduğunu gösterir ve paylaşımları bu saatlere zamanlamanızı sağlar.",
        "TikTok: İşletme hesabında analizler, takipçi etkinliğini saat saat gösterir.",
        "YouTube: YouTube Studio'daki kitle raporu, izleyicilerinizin YouTube'da ne zaman olduğunu gösterir.",
      ],
      after: [
        "Yeterli veri oluşana kadar hastalarınızın gününe uyan saatleri (işe gitmeden önce, öğle arası ve akşam) deneyin ve dört altı hafta sonra karşılaştırın. Her seferinde yalnızca bir şeyi değiştirin. Ramazan ayında akşam saatlerinde alışkanlıklar belirgin biçimde değişebilir; bu dönemde istatistiklerinize ayrıca bakın.",
      ],
    },
    {
      heading: "Haftalık paylaşımlarda hangi biçimler olmalı?",
      paragraphs: [
        "Platformlar kısa dikey videoları, sizi henüz takip etmeyen kişilere en çok gösterir; yeni hastaların bir kliniği keşfettiği ana yol da budur. Hikâyeler mevcut takipçilerle gündelik bağı korur. Kaydırmalı gönderiler ve fotoğraflar, kaydedilmek istenen pratik bilgiler için uygundur. Dengeli bir hafta: iki üç kısa video, bir kaydırmalı gönderi ya da fotoğraf ve birkaç hikâye.",
        "Hasta bilgilendirme videoları bu biçimlerin içinde değeri yüksek ve riski en düşük olanıdır: gerçek bir soruyu yanıtlar, hiç randevu almayacak kişilere bile yararlı olur ve en riskli içeriklerden (önce-sonra fotoğrafları, hasta yorumları, kampanyalar) uzak durur. Kendi videonuzu çekmek için [diş hekimleri için Instagram videoları](guide:dis-hekimleri-icin-instagram-videolari) rehberine bakın.",
      ],
    },
    {
      heading: "Daha sık paylaşım yapmak kuralları değiştirir mi?",
      paragraphs: [
        "Hayır, ama her ek paylaşım, hata için ek bir fırsattır. Klinik hesabından yapılan her paylaşım, ayın ilki de olsa yirmincisi de olsa, sağlık hizmetlerinde tanıtım kurallarına tabidir. Daha yoğun bir ritim, her paylaşımdan önce hızlı ve tekrarlanabilir bir kontrol gerektirir: “ağrısız” gibi kesin vaatler yok, fiyat ve kampanya yok, hasta teşekkürleri üzerinden tanıtım yok, yazılı rıza olmadan hasta görüntüsü yok. Ayrıntılar [diş hekimi reklam yasağı rehberinde](guide:dis-hekimi-reklam-yasagi); her açıklama metni için hızlı bir ön kontrolü ücretsiz [“Bu paylaşım yasak mı?” aracımız](checker:) yapar.",
      ],
    },
    {
      heading: "Ritmi haftanızı yutmadan nasıl sürdürürsünüz?",
      ordered: true,
      paragraphs: ["Bir yıl boyunca paylaşım yapmayı sürdüren klinikler, işi anlık paylaşımlar yerine toplu yapar:"],
      list: [
        "Haftanın konularını sabit bir günde seçin; tercihen bir önceki hafta hastaların koltukta sorduğu sorulardan.",
        "Haftanın tüm paylaşımlarını tek oturumda hazırlayın ya da onaylayın.",
        "Zamanlamadan önce her açıklama metnini tanıtım kurallarına göre kontrol edin.",
        "Platformların kendi zamanlama araçlarını kullanın; hiçbir şey birinin hatırlamasına bağlı kalmasın.",
        "Ayda bir, takipçilerin neyi izleyip kaydettiğine bakın; konuları ve saatleri buna göre ayarlayın.",
      ],
      after: [
        "[DentVideo](landing:) tam olarak bu ritim için tasarlandı: her pazartesi beş seslendirilmiş, altyazılı hasta bilgilendirme videosu hazır olur; her biri klinik doğruluk ve tanıtım kuralları açısından denetlenmiştir. Haftalık iş, onaylamak ve zamanlamaktan ibaret kalır. [Ödemeden önce logonuzla canlı önizlemeyi görün](start:).",
      ],
    },
  ],
  faq: [
    { q: "Diş kliniği her gün paylaşım yapmalı mı?", a: "Şart değil. Her gün paylaşım ancak kalite ve kurallara uyum korunursa işe yarar. Çoğu klinik için bütün yıl sürdürülen haftada iki ila beş iyi paylaşım, bir ay boyunca her gün paylaşımdan daha fazla sonuç verir." },
    { q: "Diş hekimi Instagram'da saat kaçta paylaşım yapmalı?", a: "Kendi takipçilerinizin en aktif olduğu saatlerde; Instagram bunu profesyonel paneldeki istatistiklerde gösterir. Veri yokken işe gitmeden önce, öğle arası ve akşamı deneyin, birkaç hafta sonra karşılaştırın." },
    { q: "Hafta sonu paylaşım yapmak gerekir mi?", a: "Takipçileriniz o günlerde aktifse evet; zamanlanmış paylaşımlar için klinikte kimsenin bulunması gerekmez. İstatistiklerinize bakın; hafta sonu alışkanlıkları kliniklere göre çok değişir." },
    { q: "Instagram paylaşım saatleri neden bende görünmüyor?", a: "Takipçi etkinliği verileri genellikle profesyonel (işletme ya da içerik üreticisi) hesaplarda ve belirli bir takipçi sayısına ulaşıldıktan sonra görünür. Hesabınızı profesyonel hesaba çevirin ve verilerin oluşmasını bekleyin." },
  ],
};

const ES: Guide = {
  locale: "es",
  slug: "cada-cuanto-publicar-clinica-dental",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES,
  title: "¿Cada cuánto debe publicar una clínica dental en Instagram y redes, y a qué hora?",
  seoTitle: "¿Cada cuánto publicar en una clínica dental?",
  seoDescription: "Un ritmo que tu clínica dental puede mantener: cuántas publicaciones por semana, a qué hora según tus seguidores y por qué importa la constancia.",
  description: "Una respuesta honesta sobre la frecuencia: ritmos según tu tiempo, tus propias estadísticas en vez de tablas genéricas y cada publicación dentro de la publicidad sanitaria.",
  h1: "¿Cada cuánto debe publicar una clínica dental en redes sociales, y cuándo?",
  intro:
    "No existe un número de publicaciones que las plataformas exijan o premien para todas las cuentas. Para la mayoría de las clínicas dentales funciona un ritmo de dos a cinco publicaciones por semana que el equipo pueda mantener todo el año, en lugar de publicar a diario unas semanas y luego desaparecer. La hora adecuada es aquella en la que tus propios seguidores están conectados, y Instagram, Facebook, TikTok y YouTube la muestran en sus estadísticas.",
  sections: [
    {
      heading: "¿Hay un número ideal de publicaciones por semana?",
      paragraphs: [
        "No uno universal. Las plataformas cambian con frecuencia cómo distribuyen el contenido y no publican una frecuencia obligatoria para cuentas de empresa. La mayoría de los consejos que leerás, como “publica a diario” o “publica tres veces por semana”, son reglas generales de agencias, no leyes medidas, y muchas de esas fuentes venden servicios de publicación.",
        "Lo que sí se sostiene es más sencillo: una cuenta que publica con regularidad da a sus seguidores un motivo para seguir mirando, y una cuenta que pasa meses en silencio parece abandonada para el paciente que la encuentra. Así que la pregunta útil no es “¿cuál es el número ideal?”, sino “¿qué podemos mantener cada semana sin rebajar la calidad ni saltarnos la normativa?”.",
      ],
    },
    {
      heading: "¿Qué ritmo encaja con el tiempo de tu clínica?",
      paragraphs: ["Parte de las horas que tu equipo puede dedicar de verdad cada semana. Un ritmo pequeño mantenido durante un año rinde más que uno ambicioso abandonado al mes."],
      table: {
        caption: "Ritmos de publicación para una clínica dental según el tiempo disponible",
        columns: ["Tiempo por semana", "Ritmo realista", "Cómo se ve"],
        rows: [
          ["Menos de una hora", "Dos publicaciones por semana", "Un vídeo educativo corto y una publicación sobre la clínica o el equipo"],
          ["Dos o tres horas", "Tres o cuatro publicaciones por semana, más algunas historias", "Dos vídeos que responden dudas de pacientes, una publicación del equipo o entre bastidores, un recordatorio de temporada"],
          ["Una persona del equipo con tiempo reservado", "Cinco publicaciones por semana, historias casi a diario", "Un vídeo por día laborable, mezclando prevención, dudas sobre tratamientos y equipo"],
          ["Vídeos que se hacen por ti", "Cinco vídeos por semana para elegir", "Apruebas el lunes, programas y añades tus propios clips cuando tengas tiempo"],
        ],
        note: "Son sugerencias de trabajo, no reglas de las plataformas. Ajusta al cabo de un mes según lo que vieron tus seguidores.",
      },
      after: [
        "Elijas lo que elijas, planifícalo. El [calendario de contenidos de 52 semanas](guide:calendario-contenidos-clinica-dental) propone un tema por semana durante un año, y las [ideas de contenido para Instagram de una clínica dental](guide:ideas-contenido-instagram-clinica-dental) recogen formatos que mantienen el perfil variado.",
      ],
    },
    {
      heading: "¿A qué hora debe publicar una clínica dental?",
      paragraphs: [
        "Las tablas genéricas de “horas para publicar en Instagram” promedian millones de cuentas de muchos sectores y zonas horarias. Tus seguidores son sobre todo pacientes de tu zona con sus propias rutinas, así que tus datos son una guía más fiable. Todas las grandes plataformas los muestran a las cuentas de empresa:",
      ],
      list: [
        "Instagram: en el panel profesional, las estadísticas de tus seguidores muestran sus horas y días de mayor actividad.",
        "Facebook: Meta Business Suite muestra cuándo están conectados los seguidores de tu página y permite programar publicaciones para esas horas.",
        "TikTok: con una cuenta de empresa, las analíticas muestran la actividad de tus seguidores por horas.",
        "YouTube: el informe de audiencia de YouTube Studio muestra cuándo están tus espectadores en YouTube.",
      ],
      after: [
        "Mientras no tengas datos suficientes, prueba horas que encajen con el día de tus pacientes (antes del trabajo, a mediodía y por la tarde-noche) y compara al cabo de cuatro a seis semanas. Cambia una sola cosa cada vez.",
      ],
    },
    {
      heading: "¿Qué formatos conviene publicar cada semana?",
      paragraphs: [
        "El vídeo vertical corto es el formato que las plataformas muestran más a quien todavía no te sigue, y por eso es la vía principal por la que nuevos pacientes descubren una clínica. Las historias mantienen el contacto diario con quien ya te sigue. Los carruseles y las fotos sirven para información práctica que la gente quiere guardar. Una semana equilibrada: dos o tres vídeos cortos, un carrusel o foto y varias historias.",
        "Los vídeos educativos para pacientes son el formato de mayor valor y menor riesgo: responden una duda real, son útiles incluso para quien nunca pide cita y evitan el contenido más delicado, como fotos de antes y después, testimonios y promociones. Para grabar los tuyos, consulta la guía de [vídeos para clínicas dentales](guide:videos-para-clinicas-dentales).",
      ],
    },
    {
      heading: "¿Publicar más a menudo cambia las normas?",
      paragraphs: [
        "No, pero cada publicación adicional es una ocasión más para equivocarse. Toda publicación de la cuenta de una clínica es publicidad sanitaria, sea la primera del mes o la vigésima. Un ritmo más alto necesita una comprobación rápida y repetible antes de cada publicación: nada de “sin dolor” ni resultados prometidos, nada de precios ni descuentos en redes, nada de fotos de pacientes sin consentimiento por escrito, nada de testimonios. Los detalles están en la guía de [publicidad sanitaria para dentistas](guide:publicidad-sanitaria-dentistas), y nuestro [comprobador “¿Puedo publicar esto?”](checker:) hace una primera revisión de cualquier texto en segundos, sin coste.",
      ],
    },
    {
      heading: "¿Cómo mantener el ritmo sin que se coma la semana?",
      ordered: true,
      paragraphs: ["Las clínicas que siguen publicando un año después suelen agrupar el trabajo en lugar de publicar sobre la marcha:"],
      list: [
        "Elige los temas de la semana un día fijo, a ser posible a partir de las dudas que plantearon los pacientes la semana anterior.",
        "Crea o aprueba todas las publicaciones de la semana en una sola sesión.",
        "Revisa cada texto frente a la normativa de publicidad sanitaria antes de programarlo.",
        "Prográmalas con las herramientas de las propias plataformas, para que nada dependa de que alguien se acuerde.",
        "Una vez al mes, mira qué vieron y guardaron tus seguidores, y ajusta temas y horas.",
      ],
      after: [
        "[DentVideo](landing:) está pensado para este ritmo: cada lunes tienes cinco vídeos educativos narrados y subtitulados, revisados en precisión clínica y publicidad sanitaria, y el trabajo semanal se reduce a aprobar y programar. [Mira una vista previa con tu logo](start:) antes de elegir un plan.",
      ],
    },
  ],
  faq: [
    { q: "¿Es buena idea que una clínica dental publique todos los días?", a: "No necesariamente. Publicar a diario solo ayuda si se mantienen la calidad y el cumplimiento de la normativa. Para la mayoría de las clínicas, de dos a cinco buenas publicaciones por semana durante todo el año rinden más que un mes publicando a diario." },
    { q: "¿A qué hora debe publicar un dentista en Instagram?", a: "Cuando tus propios seguidores están más activos, algo que Instagram muestra en las estadísticas del panel profesional. Sin datos, prueba antes del trabajo, a mediodía y por la tarde, y compara al cabo de unas semanas." },
    { q: "¿Conviene publicar los fines de semana?", a: "Si tus seguidores están activos entonces, sí: las publicaciones programadas no necesitan a nadie en la clínica. Revisa tus estadísticas; los hábitos de fin de semana varían mucho entre clínicas." },
    { q: "¿Cuántas historias debe publicar una clínica?", a: "No hay un número fijo. Unas pocas historias la mayoría de los días mantienen el contacto; desaparecen a las veinticuatro horas, así que sirven para recordatorios, el equipo y momentos del día a día." },
  ],
};

const DATES_2 = { published: "2026-11-15", updated: "2026-11-15", reviewed: "2026-11-15" } as const;

const FR: Guide = {
  locale: "fr",
  slug: "frequence-publication-cabinet-dentaire",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES_2,
  title: "À quelle fréquence un cabinet dentaire doit-il publier sur les réseaux sociaux, et à quelle heure ?",
  seoTitle: "Cabinet dentaire : à quelle fréquence publier ?",
  seoDescription: "Un rythme de publication tenable pour un cabinet dentaire : combien de posts par semaine, à quelle heure selon vos abonnés, et dans le respect de l'Ordre.",
  description: "Une réponse honnête sur la fréquence et l'horaire de publication : des rythmes selon votre temps, vos statistiques plutôt que des tableaux génériques, et chaque post dans le cadre déontologique.",
  h1: "À quelle fréquence un cabinet dentaire doit-il publier, et quand ?",
  intro:
    "Aucune plateforme n'exige ni ne récompense un nombre précis de publications pour tous les comptes. Pour la plupart des cabinets dentaires, un rythme d'une à trois publications par semaine, tenu toute l'année, fonctionne mieux que quelques semaines de posts quotidiens suivies d'un long silence. Le bon horaire est celui où vos propres abonnés sont connectés : Instagram, Facebook, TikTok et YouTube l'indiquent dans leurs statistiques.",
  sections: [
    {
      heading: "Existe-t-il un nombre idéal de publications par semaine ?",
      paragraphs: [
        "Pas de nombre universel. Les plateformes modifient régulièrement la façon dont elles diffusent les contenus et ne publient aucune fréquence obligatoire pour les comptes professionnels. Les conseils du type « publiez tous les jours » ou « trois fois par semaine » sont des règles empiriques d'agences, pas des lois mesurées, et beaucoup de ces sources vendent elles-mêmes des prestations de publication.",
        "Ce qui tient, c'est plus simple : un compte qui publie régulièrement donne à ses abonnés une raison de revenir, et un compte muet depuis des mois paraît abandonné au patient qui le découvre. La vraie question n'est donc pas « combien faut-il publier ? », mais « que pouvons-nous tenir chaque semaine sans rogner sur la qualité ni sur la déontologie ? ».",
      ],
    },
    {
      heading: "Quel rythme correspond au temps dont dispose votre cabinet ?",
      paragraphs: ["Partez du temps réel que votre équipe peut y consacrer. Un petit rythme tenu un an vaut mieux qu'un rythme ambitieux abandonné au bout d'un mois."],
      table: {
        caption: "Rythmes de publication pour un cabinet dentaire, selon le temps disponible",
        columns: ["Temps par semaine", "Rythme réaliste", "Concrètement"],
        rows: [
          ["Moins d'une heure", "Une publication par semaine", "Une courte vidéo d'information patient, en alternant les thèmes"],
          ["Deux à trois heures", "Deux ou trois publications, plus quelques stories", "Deux vidéos qui répondent à des questions de patients et une publication sur l'équipe ou le cabinet"],
          ["Une assistante avec un créneau dédié", "Trois à cinq publications, des stories la plupart des jours", "Une vidéo par jour ouvré, entre prévention, déroulé des soins et équipe"],
          ["Des vidéos préparées pour vous", "Cinq vidéos par semaine parmi lesquelles choisir", "Validation le lundi, programmation, et vos propres extraits quand vous avez le temps"],
        ],
        note: "Ce sont des repères de travail, pas des règles des plateformes. Ajustez après un mois selon ce que vos abonnés ont réellement regardé.",
      },
      after: [
        "Quel que soit votre choix, planifiez-le. Le [calendrier éditorial sur 52 semaines](guide:calendrier-editorial-cabinet-dentaire) propose un thème par semaine pour toute l'année, et les [idées de contenu Instagram pour cabinet dentaire](guide:idees-contenu-instagram-cabinet-dentaire) aident à varier les formats.",
      ],
    },
    {
      heading: "À quelle heure un cabinet dentaire doit-il publier ?",
      paragraphs: [
        "Les tableaux de « meilleurs horaires » font la moyenne de millions de comptes, de tous secteurs et de tous fuseaux. Vos abonnés sont surtout des patients de votre ville, avec leurs propres habitudes : vos statistiques sont un guide plus fiable. Chaque grande plateforme les montre aux comptes professionnels :",
      ],
      list: [
        "Instagram : dans le tableau de bord professionnel, les statistiques de l'audience indiquent les jours et heures où vos abonnés sont le plus actifs.",
        "Facebook : Meta Business Suite montre quand les abonnés de votre Page sont en ligne et permet de programmer les publications.",
        "TikTok : avec un compte professionnel, les statistiques affichent l'activité des abonnés heure par heure.",
        "YouTube : le rapport Audience de YouTube Studio indique quand vos spectateurs sont sur YouTube.",
      ],
      after: [
        "Tant que vous n'avez pas assez de données, testez des créneaux qui collent à la journée des patients (avant le travail, à midi, en soirée) et comparez après quatre à six semaines. Ne changez qu'un paramètre à la fois.",
      ],
    },
    {
      heading: "Quels formats publier chaque semaine ?",
      paragraphs: [
        "La vidéo verticale courte est le format que les plateformes montrent le plus aux personnes qui ne vous suivent pas encore : c'est souvent par elle que de nouveaux patients découvrent un cabinet. Les stories entretiennent le lien au quotidien, les carrousels et les photos conviennent aux informations pratiques que l'on garde de côté.",
        "Les vidéos d'information patient sont le format le plus sûr et le plus utile : elles répondent à une vraie question, servent même à ceux qui ne prendront jamais rendez-vous, et évitent les contenus les plus sensibles pour l'Ordre (avant/après, témoignages, mise en avant commerciale). Notre guide des [vidéos d'information patient](guide:videos-information-patient-dentaire) détaille les sujets et la méthode.",
      ],
    },
    {
      heading: "Publier plus souvent change-t-il les règles ?",
      paragraphs: [
        "Non, mais cela multiplie les occasions d'erreur. Depuis le décret du 22 décembre 2020, le chirurgien-dentiste peut communiquer des informations au public, à condition qu'elles soient loyales, honnêtes et non comparatives, et l'exercice de la profession comme un commerce reste interdit. Cela vaut pour la première publication du mois comme pour la vingtième. Un rythme soutenu demande donc une vérification rapide et systématique avant chaque post : pas de promesse de résultat, pas de « sans douleur », pas de comparaison avec d'autres cabinets, pas de photo de patient sans consentement écrit, pas de témoignage.",
        "Le guide sur la [communication du chirurgien-dentiste sur les réseaux sociaux](guide:communication-chirurgien-dentiste-reseaux-sociaux) reprend les textes et les recommandations de l'Ordre, et notre [vérificateur gratuit « Ma publication est-elle autorisée ? »](checker:) donne un premier avis sur une légende en quelques secondes. Ce n'est pas un conseil juridique.",
      ],
    },
    {
      heading: "Comment tenir un rythme sans y passer la semaine ?",
      ordered: true,
      paragraphs: ["Les cabinets qui publient encore au bout d'un an regroupent le travail au lieu de publier au fil de l'eau :"],
      list: [
        "Choisir les thèmes de la semaine en une fois, idéalement à partir des questions posées au fauteuil la semaine précédente.",
        "Préparer ou valider toutes les publications de la semaine en une seule séance.",
        "Relire chaque légende au regard des règles déontologiques avant de programmer.",
        "Programmer avec les outils des plateformes, pour que rien ne dépende de la mémoire de quelqu'un.",
        "Une fois par mois, regarder ce que les abonnés ont vu et enregistré, puis ajuster thèmes et horaires.",
      ],
      after: [
        "[DentVideo](landing:) a été conçu pour ce rythme : chaque lundi, cinq vidéos d'information patient commentées et sous-titrées, vérifiées par logiciel sur l'exactitude clinique et les règles de communication, vous attendent. Le travail hebdomadaire se limite à valider et programmer ; DentVideo ne publie rien à votre place. [Voyez un aperçu avec votre logo](start:) avant de choisir une formule.",
      ],
    },
  ],
  faq: [
    { q: "Un cabinet dentaire doit-il publier tous les jours ?", a: "Pas forcément. Publier chaque jour n'aide que si la qualité et le respect de la déontologie suivent. Pour la plupart des cabinets, une à trois bonnes publications par semaine tenues toute l'année font davantage qu'un mois de posts quotidiens." },
    { q: "À quelle heure publier sur Instagram pour un dentiste ?", a: "Quand vos abonnés sont le plus actifs, ce qu'Instagram indique dans les statistiques du tableau de bord professionnel. Sans données, testez avant le travail, à midi et en soirée, puis comparez au bout de quelques semaines." },
    { q: "Faut-il publier le week-end ?", a: "Si vos abonnés sont actifs à ce moment-là, oui : une publication programmée ne demande personne au cabinet. Vérifiez vos statistiques, les habitudes du week-end varient beaucoup d'un cabinet à l'autre." },
    { q: "Les publications sponsorisées sont-elles possibles ?", a: "Une publication payée pour être mise en avant peut être considérée comme de la publicité, ce que la déontologie des chirurgiens-dentistes encadre strictement. Renseignez-vous auprès de votre conseil départemental de l'Ordre avant d'en faire." },
  ],
  sources: [
    { label: "Légifrance : Code de la santé publique, article R. 4127-215-1 (communication du chirurgien-dentiste)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042743767" },
    {
      label: "Ordre national des chirurgiens-dentistes : Communication professionnelle des chirurgiens-dentistes (recommandations)",
      url: "https://www.ordre-chirurgiens-dentistes.fr/pour-le-chirurgien-dentiste/communication-professionnelle-des-chirurgiens-dentistes/",
    },
  ],
};

const PL: Guide = {
  locale: "pl",
  slug: "jak-czesto-publikowac-gabinet-stomatologiczny",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES_2,
  title: "Jak często gabinet stomatologiczny powinien publikować w mediach społecznościowych i o jakiej porze?",
  seoTitle: "Jak często publikować w gabinecie stomatologicznym?",
  seoDescription: "Rytm publikacji, który gabinet stomatologiczny utrzyma: ile postów tygodniowo, o jakiej porze według własnych statystyk i jak zostać w granicach etyki.",
  description: "Uczciwa odpowiedź na pytanie o częstotliwość i porę publikacji: rytmy według dostępnego czasu, własne statystyki zamiast ogólnych tabel i każdy post w granicach etyki zawodowej.",
  h1: "Jak często gabinet stomatologiczny powinien publikować, i kiedy?",
  intro:
    "Nie ma liczby postów, której platformy wymagają albo którą nagradzają w każdym koncie. W większości gabinetów stomatologicznych lepiej sprawdza się rytm od jednego do czterech postów tygodniowo, utrzymany przez cały rok, niż kilka tygodni codziennych publikacji, a potem cisza. Właściwa pora to ta, w której są online Państwa obserwujący: Instagram, Facebook, TikTok i YouTube pokazują to w statystykach.",
  sections: [
    {
      heading: "Czy istnieje idealna liczba postów tygodniowo?",
      paragraphs: [
        "Nie ma jednej uniwersalnej. Platformy regularnie zmieniają sposób wyświetlania treści i nie podają obowiązkowej częstotliwości dla kont firmowych. Rady w rodzaju „publikuj codziennie” czy „trzy razy w tygodniu” to reguły kciuka agencji, a nie zmierzone prawa, i wiele takich źródeł samo sprzedaje usługi publikowania.",
        "Sprawdza się coś prostszego: konto, które publikuje regularnie, daje obserwującym powód, by wracać, a konto milczące od miesięcy wygląda na porzucone, gdy trafi na nie pacjent. Lepsze pytanie brzmi więc nie „ile jest idealnie?”, tylko „co damy radę utrzymać co tydzień bez obniżania jakości i bez ryzyka etycznego?”.",
      ],
    },
    {
      heading: "Jaki rytm pasuje do czasu, którym dysponuje gabinet?",
      paragraphs: ["Proszę zacząć od godzin, które zespół naprawdę może poświęcić. Skromny rytm utrzymany przez rok daje więcej niż ambitny plan porzucony po miesiącu."],
      table: {
        caption: "Rytmy publikacji dla gabinetu stomatologicznego według dostępnego czasu",
        columns: ["Czas w tygodniu", "Realistyczny rytm", "Jak to wygląda"],
        rows: [
          ["Mniej niż godzina", "Jeden post tygodniowo", "Krótki film edukacyjny, za każdym razem na inny temat"],
          ["Dwie–trzy godziny", "Dwa–trzy posty tygodniowo i kilka relacji", "Dwa filmy odpowiadające na pytania pacjentów i jeden post o zespole lub gabinecie"],
          ["Osoba z zespołu z zaplanowanym czasem", "Trzy–pięć postów, relacje w większość dni", "Film w każdy dzień roboczy: profilaktyka, przebieg leczenia, zespół"],
          ["Filmy przygotowywane dla gabinetu", "Pięć filmów tygodniowo do wyboru", "Akceptacja w poniedziałek, zaplanowanie publikacji, własne nagrania, gdy jest czas"],
        ],
        note: "To robocze propozycje, nie zasady platform. Po miesiącu warto je dopasować do tego, co obserwujący faktycznie oglądali.",
      },
      after: [
        "Niezależnie od wyboru warto mieć plan. Poradnik [co publikować w gabinecie stomatologicznym](guide:co-publikowac-gabinet-stomatologiczny) podsuwa tematy i formaty, a [filmy edukacyjne dla pacjentów](guide:filmy-edukacyjne-dla-pacjentow-gabinet-stomatologiczny) pokazują, jak je przygotować. Wszystkie poradniki są w [spisie poradników](guides:).",
      ],
    },
    {
      heading: "O jakiej porze publikować?",
      paragraphs: [
        "Ogólne tabele „najlepszych godzin” uśredniają miliony kont z różnych branż i stref czasowych. Państwa obserwujący to głównie pacjenci z okolicy, z własnym rytmem dnia, więc lepszym przewodnikiem są statystyki gabinetu. Każda duża platforma udostępnia je kontom firmowym:",
      ],
      list: [
        "Instagram: w panelu profesjonalnym statystyki odbiorców pokazują dni i godziny największej aktywności obserwujących.",
        "Facebook: Meta Business Suite pokazuje, kiedy obserwujący stronę są online, i pozwala zaplanować posty.",
        "TikTok: konto firmowe ma statystyki aktywności obserwujących w poszczególnych godzinach.",
        "YouTube: raport Odbiorcy w YouTube Studio pokazuje, kiedy widzowie są na YouTube.",
      ],
      after: [
        "Dopóki danych jest mało, proszę testować pory pasujące do dnia pacjentów (przed pracą, w porze lunchu, wieczorem) i porównać wyniki po czterech–sześciu tygodniach, zmieniając jedną rzecz naraz.",
      ],
    },
    {
      heading: "Jakie formaty publikować co tydzień?",
      paragraphs: [
        "Krótki pionowy film to format, który platformy najczęściej pokazują osobom jeszcze niezaobserwowanym, więc to głównie przez niego nowi pacjenci trafiają na gabinet. Relacje podtrzymują kontakt na co dzień, a karuzele i zdjęcia sprawdzają się przy praktycznych informacjach, które ktoś chce zapisać.",
        "Filmy edukacyjne dla pacjentów są najbezpieczniejszym i najbardziej użytecznym formatem: odpowiadają na prawdziwe pytanie, przydają się nawet tym, którzy nigdy się nie zapiszą, i omijają treści najbardziej ryzykowne etycznie, czyli zdjęcia „przed i po”, opinie pacjentów i promocje.",
      ],
    },
    {
      heading: "Czy częstsze publikowanie zmienia zasady?",
      paragraphs: [
        "Nie, ale zwiększa liczbę okazji do błędu. Od 1 stycznia 2025 r. art. 71 Kodeksu Etyki Lekarskiej pozwala lekarzowi dentyście informować o usługach zgodnie z zasadami etyki, a art. 14 ustawy o działalności leczniczej nadal wymaga, by informacje podmiotu leczniczego nie miały cech reklamy. Dotyczy to pierwszego posta w miesiącu tak samo jak dwudziestego. Przy częstszym rytmie potrzebna jest więc szybka, powtarzalna kontrola przed każdą publikacją: bez obietnic efektów, bez porównań z innymi gabinetami, bez promocji i cen jako zachęty, bez opinii pacjentów i bez zdjęć pacjentów bez pisemnej zgody.",
        "Szczegóły opisujemy w poradniku o [reklamie gabinetu stomatologicznego i Kodeksie Etyki Lekarskiej](guide:reklama-gabinetu-stomatologicznego-kodeks-etyki), a nasz [sprawdzacz „Czy mój post jest dozwolony?”](checker:) daje pierwszą ocenę opisu w kilka sekund. To nie jest porada prawna.",
      ],
    },
    {
      heading: "Jak utrzymać rytm, żeby nie zajmował całego tygodnia?",
      ordered: true,
      paragraphs: ["Gabinety, które publikują jeszcze po roku, zwykle grupują pracę zamiast publikować na bieżąco:"],
      list: [
        "Wybrać tematy na cały tydzień naraz, najlepiej z pytań zadanych przez pacjentów na fotelu w poprzednim tygodniu.",
        "Przygotować albo zaakceptować wszystkie posty tygodnia podczas jednego posiedzenia.",
        "Sprawdzić każdy opis pod kątem zasad etyki i reklamy przed zaplanowaniem.",
        "Zaplanować publikacje narzędziami samych platform, żeby nic nie zależało od pamięci.",
        "Raz w miesiącu sprawdzić, co obserwujący oglądali i zapisywali, i dopasować tematy oraz pory.",
      ],
      after: [
        "[DentVideo](landing:) powstało właśnie z myślą o takim rytmie: w każdy poniedziałek czeka pięć filmów edukacyjnych z lektorem i napisami, sprawdzonych przez oprogramowanie pod kątem poprawności klinicznej i zasad reklamy. Cotygodniowa praca to akceptacja i zaplanowanie; DentVideo niczego nie publikuje za gabinet. [Proszę zobaczyć podgląd z logo gabinetu](start:) przed wyborem planu.",
      ],
    },
  ],
  faq: [
    { q: "Czy gabinet stomatologiczny powinien publikować codziennie?", a: "Niekoniecznie. Codzienne posty pomagają tylko wtedy, gdy nie cierpi na tym jakość ani zgodność z zasadami etyki. W większości gabinetów jeden do czterech dobrych postów tygodniowo przez cały rok daje więcej niż miesiąc codziennych publikacji." },
    { q: "O której godzinie dentysta powinien publikować na Instagramie?", a: "Wtedy, gdy obserwujący gabinet są najbardziej aktywni, co Instagram pokazuje w statystykach panelu profesjonalnego. Bez danych warto testować poranek, porę lunchu i wieczór, a po kilku tygodniach porównać wyniki." },
    { q: "Czy publikować w weekendy?", a: "Jeśli obserwujący są wtedy aktywni, tak: zaplanowany post nie wymaga nikogo w gabinecie. Warto sprawdzić statystyki, bo weekendowe nawyki bardzo się różnią." },
    { q: "Czy płatne promowanie postów jest dozwolone?", a: "Płatne promowanie może zostać uznane za reklamę, a informacje podmiotu leczniczego nie mogą mieć jej cech. Przed promowaniem postów warto zapytać okręgową izbę lekarską lub prawnika." },
  ],
  sources: [
    { label: "Ustawa z 15 kwietnia 2011 r. o działalności leczniczej, tekst jednolity Dz.U. 2026 poz. 156 (art. 14), eli.gov.pl", url: "https://eli.gov.pl/eli/DU/2026/156" },
    { label: "Naczelna Izba Lekarska: komentarz do art. 71 Kodeksu Etyki Lekarskiej (styczeń 2025)", url: "https://nil.org.pl/uploaded_files/art_1736325594_komentarz-art71.pdf" },
  ],
};

// Japanese and Gulf Arabic versions (2026-11-16), written for their markets:
// the Japanese one around the MHLW guideline and LINE, the Arabic one around
// the DHA medical-director approval and Gulf weekends and Ramadan.
const DATES_3 = { published: "2026-11-16", updated: "2026-11-16", reviewed: "2026-11-16" } as const;

const MHLW_KOKOKU = {
  label: "厚生労働省「医療法における病院等の広告規制について」（医療広告ガイドライン、Q&A、事例解説書の掲載ページ）",
  url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/kokokukisei/index.html",
};
const MHLW_JIREI = {
  label: "厚生労働省「医療広告規制におけるウェブサイト等の事例解説書（第6版）」令和8年3月（SNS・動画の事例を含む）",
  url: "https://www.mhlw.go.jp/content/001683116.pdf",
};

const JA: Guide = {
  locale: "ja",
  slug: "shika-iin-sns-toko-hindo",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES_3,
  title: "歯科医院のSNSはどのくらいの頻度で、何時に投稿すればよいか",
  seoTitle: "歯科医院のSNS投稿頻度と時間帯の決め方",
  seoDescription:
    "歯科医院のInstagramやTikTokは週に何本、何時に投稿すればよいか。医院の体制に合った投稿ペース、フォロワーのデータの見方、医療広告ガイドラインとの両立を解説します。",
  description:
    "歯科医院のSNS投稿頻度と時間帯：体制別の現実的なペース、インサイトでの時間帯の確かめ方、形式の組み合わせ、投稿を増やしても崩れない院内の確認の流れ。",
  h1: "歯科医院のSNSは、どのくらいの頻度で、いつ投稿すればよいか",
  intro:
    "すべてのアカウントに当てはまる「正しい投稿本数」は、どのSNSも公表していません。多くの歯科医院にとっては、週に1〜3本の投稿を1年間続けるほうが、毎日投稿して数週間で止まってしまうより役に立ちます。投稿する時間は、一般的な「おすすめの時間帯」よりも、医院のフォロワーが実際に見ている時間を、InstagramやTikTokなどのインサイトで確かめて決めるのが確実です。",
  sections: [
    {
      heading: "理想の投稿本数は決まっているのですか？",
      paragraphs: [
        "決まった数はありません。各SNSは表示の仕組みを頻繁に見直しており、ビジネスアカウントに必要な投稿頻度を公表しているわけでもありません。「毎日投稿すべき」「週3回が最適」といった話の多くは、運用代行などを手がける会社の経験則で、測定された法則ではありません。",
        "確かに言えるのは、もっと単純なことです。定期的に更新されているアカウントは、フォロワーにとって見続ける理由になります。反対に、何か月も更新が止まったアカウントは、初めて見た患者さんに「この医院は今も同じように診療しているのだろうか」という印象を与えかねません。大切なのは「理想の本数」ではなく、「質と医療広告のルールを守りながら、毎週続けられる本数」です。",
      ],
    },
    {
      heading: "医院の体制に合った投稿ペースは？",
      paragraphs: ["まず、スタッフが毎週どれくらいの時間をSNSに使えるかから考えてください。小さなペースでも1年続けば、大きな計画を1か月でやめてしまうより、ずっと多くの患者さんに届きます。"],
      table: {
        caption: "歯科医院のSNS投稿ペースの目安（使える時間別）",
        columns: ["1週間に使える時間", "現実的なペース", "内容の例"],
        rows: [
          ["1時間未満", "週1本", "患者さんのよくある質問に答える短い動画を1本。テーマは毎週変える"],
          ["2〜3時間", "週2〜3本とストーリーズ数回", "説明動画2本と、スタッフや院内の様子の投稿1本"],
          ["担当スタッフが時間を確保できる", "週3〜5本、ストーリーズはほぼ毎日", "診療日ごとに1本。予防、治療の流れ、医院からのお知らせを組み合わせる"],
          ["動画の作成を任せる", "毎週5本の中から選んで投稿", "月曜に承認し、予約投稿する。院長先生の撮影は時間のある週に追加する"],
        ],
        note: "これは運用の目安であり、SNS側のルールではありません。1か月ほど続けたら、実際によく見られた投稿をもとに調整してください。",
      },
      after: [
        "どのペースにする場合も、テーマはあらかじめ決めておくと迷いません。[歯科医院のSNS投稿ガイド](guide:shika-iin-sns-toko-naiyo)に投稿しやすいテーマの例を、[歯科の患者説明動画のテーマ一覧](guide:shika-kanja-setsumei-doga-theme)に動画のテーマと構成をまとめています。",
      ],
    },
    {
      heading: "何時に投稿すればよいですか？",
      paragraphs: [
        "インターネット上の「投稿に最適な時間帯」の表は、業種も地域も異なる膨大なアカウントの平均です。歯科医院のフォロワーの多くは、医院の近くに住む患者さんで、それぞれの生活のリズムがあります。医院自身のデータのほうが、ずっと頼りになります。主なSNSは、ビジネスアカウント向けに次のようなデータを用意しています。",
      ],
      list: [
        "Instagram：プロアカウントのインサイトで、フォロワーがよく利用している曜日と時間帯を確認できます",
        "TikTok：ビジネスアカウントの分析画面で、フォロワーが活動している時間帯を見られます",
        "YouTube：YouTube Studioのアナリティクスで、視聴者がYouTubeを利用している時間帯を確認できます",
        "LINE公式アカウント：配信の分析で開封やクリックの状況を確認でき、配信日時を予約できます",
      ],
      after: [
        "データがまだ少ないうちは、通勤や通学の時間帯、お昼休み、夕食後など、患者さんの一日の流れに合わせた時間を試し、4〜6週間ほどで比べてみてください。比べるときは、一度に一つの条件だけを変えるのがコツです。休診日に合わせて投稿を止める必要はなく、予約投稿を使えば、医院に誰もいない時間でも公開できます。",
      ],
    },
    {
      heading: "1週間にどんな形式を組み合わせればよいですか？",
      paragraphs: [
        "縦型の短い動画（リール、TikTok、YouTubeショート）は、まだ医院をフォローしていない人にも表示されやすい形式で、新しい患者さんが医院を知るきっかけになりやすいものです。ストーリーズは、休診のお知らせや院内の様子など、日々の小さな情報を伝えるのに向いています。手順を説明する画像を数枚並べるカルーセル投稿は、保存して見返してもらいやすい形式です。",
        "LINE公式アカウントは、すでに来院している患者さんとのつながりに向いています。配信の回数が多すぎるとブロックされやすくなるため、検診のお知らせや季節の話題など、受け取って役立つ内容に絞るとよいでしょう。季節の話題としては、6月4日から10日の「歯と口の健康週間」や、11月8日の「いい歯の日」が年間計画の目印になります。",
      ],
    },
    {
      heading: "投稿を増やすと、医療広告のルールは変わりますか？",
      paragraphs: [
        "ルールそのものは変わりませんが、確認すべき投稿が増える分、うっかりした表現が混じる機会も増えます。医院のアカウントからの投稿は、多くの場合、医療広告ガイドラインの対象になります。1本目の投稿も20本目の投稿も、同じ基準で確認する必要があります。",
        "ペースを上げるなら、確認の手順を短く、毎回同じにしておくことが欠かせません。比較や最上級の表現、効果を言い切る表現、体験談、治療前後の写真、割引やキャンペーンの強調がないかを、決まったチェックリストで確かめます。詳しくは[医療広告ガイドラインと歯科医院のSNS](guide:iryo-kokoku-guideline-shika-sns)で解説しています。キャプションの一次チェックには、[「この投稿は大丈夫？」チェッカー](checker:)も使えます。いずれも法的な判断の代わりにはなりません。",
      ],
    },
    {
      heading: "無理なく続けるにはどうすればよいですか？",
      ordered: true,
      paragraphs: ["1年後も投稿を続けている医院の多くは、その日の思いつきで投稿するのではなく、作業をまとめて行っています。"],
      list: [
        "週に一度、その週のテーマをまとめて決める。前の週に診療室で聞かれた質問から選ぶと、テーマに困りません",
        "その週の投稿を、一度の作業でまとめて作るか、まとめて確認する",
        "院長先生など、内容に責任を持つ歯科医師が承認し、誰がいつ承認したかを記録に残す",
        "各SNSの予約投稿の機能で公開日時を設定し、担当者の記憶に頼らないようにする",
        "月に一度、よく見られた投稿や保存された投稿を確認し、テーマと時間帯を見直す",
      ],
      after: [
        "[DentVideo](landing:)は、このペースで続けられるように作られています。毎週月曜に、ナレーションと字幕の付いた患者説明動画が5本届き、それぞれ臨床的な正確性と医療広告の表現の確認を経ています。医院の作業は承認と予約投稿だけで、DentVideoが医院の代わりに投稿することはありません。ほかのガイドは[ガイド一覧](guides:)から、お支払いの前のプレビューは[医院のロゴとカラーで確認](start:)できます。",
      ],
    },
  ],
  faq: [
    { q: "歯科医院は毎日投稿したほうがよいですか？", a: "必ずしもそうではありません。毎日の投稿が役立つのは、内容の質と医療広告のルールの確認を保てる場合だけです。多くの医院では、週に1〜3本の丁寧な投稿を1年続けるほうが、1か月だけの毎日投稿より効果的です。" },
    { q: "Instagramには何時に投稿すればよいですか？", a: "医院のフォロワーがよく利用している時間帯で、プロアカウントのインサイトで確認できます。データが少ないうちは、朝の通勤時間、お昼休み、夜の時間帯を試し、数週間後に比べてみてください。" },
    { q: "休診日や週末にも投稿してよいですか？", a: "フォロワーがその時間に見ているなら問題ありません。予約投稿を使えば、医院に誰もいない日でも公開できます。週末の見られ方は医院によって大きく違うため、インサイトで確かめてください。" },
    { q: "LINE公式アカウントの配信はどのくらいの頻度がよいですか？", a: "決まった回数はありませんが、配信が多すぎるとブロックにつながりやすくなります。検診のお知らせや休診日の案内、季節の話題など、受け取って役に立つ内容に絞り、月に数回程度から始めるのが無理のない進め方です。" },
  ],
  sources: [MHLW_KOKOKU, MHLW_JIREI],
};

const DHA_STANDARDS = {
  label: "هيئة الصحة بدبي: معايير محتوى الإعلانات الطبية على وسائل التواصل الاجتماعي، الإصدار 1.1",
  url: "https://www.dha.gov.ae/uploads/042022/Standards%20for%20Medical%20Advertisement%20Content%20in%20Social%20Media2022433965.pdf",
};
const DHA_CIRCULAR = {
  label: "هيئة الصحة بدبي: التعميم CIR-2026-00000144 بشأن معايير الإعلانات الطبية على وسائل التواصل (17 أغسطس 2026)",
  url: "https://www.dha.gov.ae/en/circulars/details/CIR-2026-00000144",
};
const MOH_SA_ART10 = {
  label: "وزارة الصحة السعودية: خبر 21 أبريل 2024 يشير إلى المادة العاشرة من نظام مزاولة المهن الصحية (حظر إعلان الممارس عن نفسه)",
  url: "https://www.moh.gov.sa/en/Ministry/MediaCenter/News/Pages/News-2024-04-21-003.aspx",
};

const AR: Guide = {
  locale: "ar",
  slug: "kam-marra-tanshur-iyadat-al-asnan",
  topic: "posting-frequency",
  category: "ideas",
  ...DATES_3,
  title: "كم مرة تنشر عيادة الأسنان على وسائل التواصل، وفي أي وقت؟",
  seoTitle: "كم مرة تنشر عيادة الأسنان على إنستغرام؟",
  seoDescription:
    "إيقاع نشر تستطيع عيادة الأسنان في الخليج الالتزام به: عدد المنشورات في الأسبوع، واختيار الوقت من إحصاءات متابعيكم، واعتماد المدير الطبي دون تعطيل النشر.",
  description:
    "إجابة صريحة عن سؤال عدد المنشورات ووقتها لعيادات الأسنان في الإمارات والسعودية: إيقاعات حسب وقت الفريق، وإحصاءات المنصات، وعطلة نهاية الأسبوع ورمضان، ومسار الاعتماد.",
  h1: "كم مرة تنشر عيادة الأسنان على وسائل التواصل، ومتى؟",
  intro:
    "لا تحدّد أي منصة عدداً من المنشورات تشترطه أو تكافئ عليه كل الحسابات. لمعظم عيادات الأسنان، يفيد إيقاع من منشور إلى ثلاثة منشورات في الأسبوع يستمر طوال السنة أكثر من نشر يومي يتوقف بعد أسابيع. أما الوقت المناسب فهو الوقت الذي يكون فيه متابعو عيادتكم متصلين فعلاً، وتعرضه إحصاءات إنستغرام وتيك توك وسناب شات ويوتيوب، مع مراعاة أن كل منشور في دبي يحتاج إلى اعتماد المدير الطبي قبل نشره.",
  sections: [
    {
      heading: "هل يوجد عدد مثالي من المنشورات في الأسبوع؟",
      paragraphs: [
        "لا يوجد عدد واحد يصلح لكل الحسابات. تغيّر المنصات طريقة عرض المحتوى باستمرار، ولا تعلن عدداً إلزامياً من المنشورات لحسابات الأعمال. ونصائح مثل «انشروا كل يوم» أو «ثلاث مرات في الأسبوع» هي في الغالب خبرات عامة من وكالات التسويق، وليست قاعدة مقيسة، وكثير من هذه المصادر يبيع خدمة النشر نفسها.",
        "ما يصمد أبسط من ذلك: الحساب الذي ينشر بانتظام يعطي متابعيه سبباً للعودة، والحساب المتوقف منذ أشهر يبدو مهجوراً للمريض الذي يكتشفه. لذلك السؤال المفيد ليس «كم هو العدد المثالي؟» بل «ما الذي نستطيع الالتزام به كل أسبوع دون التنازل عن الجودة أو عن ضوابط الإعلان الصحي؟».",
      ],
    },
    {
      heading: "ما الإيقاع الذي يناسب وقت فريق العيادة؟",
      paragraphs: ["ابدؤوا من الساعات التي يستطيع الفريق تخصيصها فعلاً كل أسبوع. الإيقاع المتواضع الذي يستمر سنة أنفع من خطة طموحة تتوقف بعد شهر."],
      table: {
        caption: "إيقاعات النشر لعيادة الأسنان حسب الوقت المتاح",
        columns: ["الوقت في الأسبوع", "إيقاع واقعي", "كيف يبدو"],
        rows: [
          ["أقل من ساعة", "منشور واحد في الأسبوع", "فيديو توعوي قصير يجيب عن سؤال واحد، بموضوع مختلف كل أسبوع"],
          ["ساعتان إلى ثلاث", "منشوران أو ثلاثة مع بعض القصص", "فيديوهان عن أسئلة المرضى ومنشور عن الفريق أو العيادة"],
          ["موظف مخصص لحسابات العيادة", "من ثلاثة إلى خمسة منشورات، وقصص في معظم الأيام", "فيديو في كل يوم عمل يجمع بين الوقاية وخطوات العلاج وإعلانات العيادة"],
          ["فيديوهات تُعدّ للعيادة", "خمسة فيديوهات أسبوعياً للاختيار منها", "اعتماد الفيديوهات في بداية الأسبوع وجدولتها، وإضافة مقاطع الطبيب حين يتوفر الوقت"],
        ],
        note: "هذه اقتراحات عملية وليست قواعد للمنصات. عدّلوها بعد شهر بحسب ما شاهده متابعوكم فعلاً.",
      },
      after: [
        "أياً كان الإيقاع الذي تختارونه، خطّطوا له مسبقاً. يقدّم دليل [ماذا تنشر عيادة الأسنان على وسائل التواصل](guide:madha-tanshur-iyadat-al-asnan) مواضيع مقترحة ومسار اعتماد داخلي، ويضم دليل [فيديوهات توعية مرضى الأسنان](guide:fidyohat-tawiyat-al-marda-iyadat-al-asnan) قائمة مواضيع جاهزة للفيديو.",
      ],
    },
    {
      heading: "في أي وقت تنشر عيادة الأسنان؟",
      paragraphs: [
        "جداول «أفضل أوقات النشر» المنتشرة على الإنترنت تحسب متوسط ملايين الحسابات من قطاعات ومناطق زمنية مختلفة. أما متابعو عيادتكم فهم غالباً مرضى من المدينة نفسها لهم إيقاع يومهم الخاص، فإحصاءات حسابكم دليل أدق. وكل منصة كبيرة تعرضها لحسابات الأعمال:",
      ],
      list: [
        "إنستغرام: في لوحة الحساب الاحترافي تعرض إحصاءات المتابعين الأيام والساعات التي يكونون فيها أكثر نشاطاً",
        "تيك توك: تعرض تحليلات حساب الأعمال نشاط المتابعين حسب الساعة",
        "سناب شات: يعرض الملف العام للأعمال إحصاءات عن المشاهدات والجمهور، وهو مهم في السعودية خاصة",
        "يوتيوب: يعرض تقرير الجمهور في YouTube Studio الأوقات التي يكون فيها المشاهدون على يوتيوب",
      ],
      after: [
        "تذكّروا أن عطلة نهاية الأسبوع تختلف في الخليج: السبت والأحد في الإمارات، والجمعة والسبت في السعودية، فلا تنقلوا جداول مصممة لبلد آخر كما هي. وفي رمضان يتغير يوم الناس كله، فتابعوا الإحصاءات أسبوعياً خلال الشهر وعدّلوا الأوقات بحسبها. وإلى أن تتجمع لديكم بيانات كافية، جرّبوا أوقاتاً تناسب يوم المرضى، صباحاً قبل العمل ووقت الاستراحة والمساء، وقارنوا النتائج بعد أربعة إلى ستة أسابيع، مع تغيير عنصر واحد في كل مرة.",
      ],
    },
    {
      heading: "ما الأشكال التي تُنشر كل أسبوع؟",
      paragraphs: [
        "الفيديو العمودي القصير هو الشكل الذي تعرضه المنصات أكثر من غيره على من لا يتابعونكم بعد، ولذلك يكتشف كثير من المرضى الجدد العيادة من خلاله. القصص تحافظ على التواصل اليومي مع المتابعين الحاليين، والمنشورات المتعددة الصور تناسب المعلومات العملية التي يحفظها الناس للرجوع إليها.",
        "في الخليج يتابع العيادة جمهور متعدد اللغات، فإضافة ترجمة نصية بالعربية والإنجليزية معاً توسّع دائرة من يفهم الفيديو دون أن تضاعف عدد المنشورات. وفيديوهات التوعية هي أكثر الأشكال أماناً وفائدة: تجيب عن سؤال حقيقي، وتفيد حتى من لن يحجز موعداً، وتبتعد عن أكثر المحتوى حساسية، مثل صور «قبل وبعد» وشهادات المرضى والعروض.",
      ],
    },
    {
      heading: "هل يغيّر النشر الأكثر تكراراً الضوابط؟",
      paragraphs: [
        "لا، لكنه يضاعف فرص الخطأ. تنص معايير هيئة الصحة بدبي على أن يعتمد المدير الطبي المحتوى الذي يذكر المنشأة قبل نشره، وهذا يعني أن كل منشور إضافي هو اعتماد إضافي. وفي السعودية يُحظر على الممارس الصحي الترويج لنفسه، فالأسلم أن يصدر المحتوى من حساب العيادة لا من الحسابات الشخصية للأطباء.",
        "لذلك يحتاج الإيقاع الأعلى إلى مراجعة سريعة ومتكررة بالأسئلة نفسها: لا صيغ تفضيل أو مقارنة، ولا وعود بالنتائج، ولا أسعار أو عروض، ولا شهادات مرضى أو صور «قبل وبعد»، ولا مريض يمكن التعرف عليه دون موافقة خطية. التفاصيل في دليل [ضوابط الإعلان الصحي لعيادات الأسنان في الخليج](guide:dawabit-ilan-iyadat-al-asnan-al-khaleej)، ويعطيكم [مدقق «هل منشوري مسموح؟»](checker:) فحصاً أولياً لأي نص خلال ثوانٍ. هذه معلومات عامة وليست استشارة قانونية.",
      ],
    },
    {
      heading: "كيف تحافظون على الإيقاع دون أن يستهلك الأسبوع؟",
      ordered: true,
      paragraphs: ["العيادات التي تستمر في النشر سنة كاملة تجمع العمل في جلسات محددة بدلاً من النشر العشوائي:"],
      list: [
        "اختاروا مواضيع الأسبوع مرة واحدة، ويفضّل أن تكون من أسئلة المرضى على كرسي العلاج في الأسبوع السابق.",
        "جهّزوا منشورات الأسبوع كلها أو راجعوها في جلسة واحدة.",
        "اعرضوها على المدير الطبي دفعة واحدة واحفظوا سجل الاعتماد مع النسخة المعتمدة.",
        "جدولوا النشر بأدوات المنصات نفسها حتى لا يعتمد شيء على ذاكرة أحد.",
        "راجعوا مرة في الشهر ما شاهده المتابعون وحفظوه، وعدّلوا المواضيع والأوقات.",
      ],
      after: [
        "صُمّم [DentVideo](landing:) لهذا الإيقاع: في بداية كل أسبوع تجدون خمسة فيديوهات توعوية مسجّلة صوتياً ومترجمة نصياً، راجعها البرنامج من حيث الدقة السريرية وضوابط الإعلان الصحي، فيصبح العمل الأسبوعي اعتماداً وجدولة. لا ينشر DentVideo شيئاً نيابة عنكم. تصفحوا [كل الأدلة](guides:)، أو [شاهدوا معاينة حية بشعار عيادتكم](start:) قبل اختيار الخطة.",
      ],
    },
  ],
  faq: [
    { q: "هل النشر اليومي أفضل لعيادة الأسنان؟", a: "ليس بالضرورة. النشر اليومي يفيد فقط إذا بقيت الجودة والالتزام بالضوابط كما هما، وفي دبي يعني كل منشور اعتماداً من المدير الطبي. لمعظم العيادات، منشور إلى ثلاثة منشورات جيدة أسبوعياً طوال السنة أنفع من شهر من النشر اليومي." },
    { q: "في أي وقت ننشر فيديو عيادة الأسنان على إنستغرام؟", a: "الوقت الذي يكون فيه متابعو عيادتكم أكثر نشاطاً، وتعرضه إحصاءات الحساب الاحترافي. قبل أن تتوفر البيانات، جرّبوا الصباح ووقت الاستراحة والمساء، وقارنوا بعد بضعة أسابيع." },
    { q: "هل ننشر في عطلة نهاية الأسبوع وفي رمضان؟", a: "نعم إذا كان متابعوكم نشطين حينها، فالمنشور المجدول لا يحتاج إلى وجود أحد في العيادة. تختلف العطلة بين الإمارات والسعودية، ويتغير نشاط الجمهور في رمضان، فراجعوا الإحصاءات أسبوعياً." },
    { q: "هل يحتاج كل منشور إلى اعتماد مسبق؟", a: "في دبي تنص معايير هيئة الصحة على أن يعتمد المدير الطبي المحتوى الذي يذكر المنشأة قبل نشره. الطريقة العملية هي اعتماد منشورات الأسبوع دفعة واحدة وحفظ سجل الاعتماد." },
  ],
  sources: [DHA_STANDARDS, DHA_CIRCULAR, MOH_SA_ART10],
};

export const POSTING_RHYTHM_JA = JA;
export const POSTING_RHYTHM_AR = AR;
export const POSTING_RHYTHM_EN = EN;
export const POSTING_RHYTHM_DE = DE;
export const POSTING_RHYTHM_TR = TR;
export const POSTING_RHYTHM_ES = ES;
export const POSTING_RHYTHM_FR = FR;
export const POSTING_RHYTHM_PL = PL;
