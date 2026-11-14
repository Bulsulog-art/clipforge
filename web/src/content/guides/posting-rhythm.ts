import type { Guide } from "../dentvideo";

// "How often and when should a dental clinic post?" in four markets, each
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
  title: "How often should a dental practice post on social media, and when?",
  seoTitle: "How often should a dental practice post?",
  seoDescription: "A posting rhythm a dental clinic can keep: how many posts a week, how to find your audience's active hours, and why consistency beats volume.",
  description: "An honest answer to the frequency question for dental clinics: rhythms by the time you have, how to read your own audience data for timing, and how to keep every post within the rules.",
  h1: "How often should a dental practice post on social media — and when?",
  intro:
    "There is no number of posts that platforms require or reward for every account. For most dental clinics, a rhythm of two to five posts a week that the team can keep up for a whole year works better than a burst of daily posts followed by silence. The right time to post is when your own followers are online, which Instagram, Facebook, TikTok and YouTube each show in their audience data.",
  sections: [
    {
      heading: "Is there an ideal number of posts per week?",
      paragraphs: [
        "Not a universal one. Social platforms change how they rank content regularly and do not publish a required posting frequency for business accounts. Most advice you will read — “post daily”, “post three times a week” — is a rule of thumb from marketing agencies, not a measured law, and many of those sources sell posting services.",
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
        "Until you have enough data, test times that fit patients' days — before work, around lunch and in the evening — and compare after four to six weeks. Keep the time you post consistent enough to compare, and change one thing at a time.",
      ],
    },
    {
      heading: "Which formats should a clinic post each week?",
      paragraphs: [
        "Short vertical video is the format platforms push most to people who do not follow you yet, which makes it the main way new patients find a clinic. Stories keep existing followers in touch day to day. Carousels and photos work for practical information people want to save. A balanced week might be two or three short videos, one carousel or photo post, and a handful of Stories.",
        "Patient-education videos are the safest high-value format: they answer a real question, they are useful even to people who never book, and they avoid the riskiest kinds of content — before-and-after photos, testimonials and offers. Our guide to [Instagram videos for dentists](guide:instagram-videos-for-dentists) covers filming your own.",
      ],
    },
    {
      heading: "Does posting more often change the rules?",
      paragraphs: [
        "No — but it multiplies the chances of a mistake. Every post from a clinic account is health advertising in most countries, whether it is the first of the month or the twentieth. A higher rhythm needs a quick, repeatable check before each post: no “painless” or guaranteed results, no prices or discounts in social posts, no patient photos without written consent, no testimonials where they are restricted. The [dental advertising rules overview](guide:dental-social-media-advertising-rules) explains the differences by country, and our free [“Is my post allowed?” checker](checker:) gives a first pass on any caption in seconds.",
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
      ],
    },
  ],
  faq: [
    { q: "Is posting every day better for a dental clinic?", a: "Not necessarily. Daily posting only helps if quality and compliance hold up. For most clinics, two to five good posts a week kept up all year does more than daily posts for a month." },
    { q: "What time of day should a dentist post on Instagram?", a: "When your own followers are most active, which Instagram shows in the professional dashboard's insights. Until you have data, test before work, lunchtime and evening, and compare after a few weeks." },
    { q: "Should a clinic post at weekends?", a: "If your followers are active then, yes — scheduled posts need no one at the clinic. Check your audience data; weekend patterns differ a lot between clinics." },
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
  h1: "Wie oft sollte eine Zahnarztpraxis posten — und wann?",
  intro:
    "Eine Beitragszahl, die Plattformen für jedes Konto vorschreiben oder belohnen, gibt es nicht. Für die meisten Zahnarztpraxen funktioniert ein Rhythmus von zwei bis fünf Beiträgen pro Woche, den das Team ein ganzes Jahr durchhält, besser als tägliche Beiträge mit anschließender Funkstille. Die richtige Uhrzeit ist die, zu der Ihre eigenen Follower online sind — Instagram, Facebook, TikTok und YouTube zeigen das in ihren Statistiken.",
  sections: [
    {
      heading: "Gibt es die ideale Anzahl an Beiträgen pro Woche?",
      paragraphs: [
        "Nicht allgemeingültig. Die Plattformen ändern regelmäßig, wie sie Inhalte ausspielen, und veröffentlichen keine Pflichtfrequenz für Unternehmenskonten. Die meisten Empfehlungen — „täglich posten“, „dreimal pro Woche“ — sind Faustregeln von Agenturen, keine gemessenen Gesetze, und viele dieser Quellen verkaufen selbst Posting-Dienstleistungen.",
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
        "Allgemeine Tabellen mit „besten Posting-Zeiten“ mitteln Millionen Konten aus vielen Branchen und Zeitzonen. Ihre Follower sind überwiegend Patienten aus der Umgebung mit eigenem Tagesablauf — Ihre eigenen Daten sind deshalb der zuverlässigere Wegweiser. Jede große Plattform zeigt sie Unternehmenskonten an:",
      ],
      list: [
        "Instagram: Im professionellen Dashboard zeigen die Statistiken zu Ihren Followern die aktivsten Zeiten nach Tag und Uhrzeit.",
        "Facebook: Die Meta Business Suite zeigt, wann die Follower Ihrer Seite online sind, und plant Beiträge für diese Zeiten ein.",
        "TikTok: Mit einem Business-Konto zeigen die Analysen die Aktivität Ihrer Follower nach Stunden.",
        "YouTube: Der Bericht „Zielgruppe“ in YouTube Studio zeigt, wann Ihre Zuschauer auf YouTube sind.",
      ],
      after: [
        "Solange noch zu wenige Daten vorliegen, testen Sie Zeiten, die zum Alltag Ihrer Patienten passen — vor der Arbeit, mittags und abends — und vergleichen Sie nach vier bis sechs Wochen. Ändern Sie dabei immer nur eine Sache.",
      ],
    },
    {
      heading: "Welche Formate gehören in eine Woche?",
      paragraphs: [
        "Kurze Hochformat-Videos spielen die Plattformen am stärksten an Menschen aus, die Ihnen noch nicht folgen — der wichtigste Weg, über den neue Patienten eine Praxis entdecken. Stories halten bestehende Follower im Alltag auf dem Laufenden. Karussells und Fotos eignen sich für praktische Informationen zum Speichern. Eine ausgewogene Woche: zwei bis drei kurze Videos, ein Karussell oder Foto und einige Stories.",
        "Aufklärungsvideos sind dabei das sicherste Format mit hohem Nutzen: Sie beantworten eine echte Frage, helfen auch Menschen, die nie einen Termin buchen, und vermeiden die riskantesten Inhalte — Vorher-Nachher-Bilder, Patientenstimmen und Aktionen. Wie Sie eigene Videos drehen, steht im Ratgeber zu [Instagram-Videos für Zahnarztpraxen](guide:instagram-videos-fuer-zahnarztpraxen).",
      ],
    },
    {
      heading: "Ändert häufigeres Posten etwas am Werberecht?",
      paragraphs: [
        "Nein — aber jeder zusätzliche Beitrag ist eine zusätzliche Gelegenheit für einen Fehler. Jeder Beitrag eines Praxiskontos fällt unter das Heilmittelwerbegesetz und die Berufsordnung, egal ob es der erste oder der zwanzigste im Monat ist. Ein höherer Rhythmus braucht deshalb einen schnellen, wiederholbaren Check vor jedem Beitrag: kein „schmerzfrei“, keine Erfolgsversprechen, keine Preise oder Rabatte, keine Patientenfotos ohne schriftliche Einwilligung. Die Einzelheiten stehen im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media); eine schnelle erste Prüfung jedes Beitragstextes bietet unser kostenloser [Werbe-Check „Ist mein Post erlaubt?“](checker:).",
      ],
    },
    {
      heading: "Wie halten Sie den Rhythmus, ohne dass er die Woche frisst?",
      ordered: true,
      paragraphs: ["Praxen, die ein Jahr lang dranbleiben, bündeln die Arbeit, statt spontan zu posten:"],
      list: [
        "Die Themen der Woche an einem festen Tag wählen — idealerweise aus Fragen, die Patienten in der Vorwoche gestellt haben.",
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
    { q: "Zu welcher Uhrzeit sollte eine Zahnarztpraxis auf Instagram posten?", a: "Wenn Ihre eigenen Follower am aktivsten sind — das zeigt Instagram in den Statistiken des professionellen Dashboards. Ohne Daten testen Sie vor der Arbeit, mittags und abends und vergleichen nach einigen Wochen." },
    { q: "Sollte eine Praxis am Wochenende posten?", a: "Wenn Ihre Follower dann aktiv sind, ja — eingeplante Beiträge brauchen niemanden in der Praxis. Prüfen Sie Ihre Statistiken; Wochenendmuster unterscheiden sich stark zwischen Praxen." },
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
        "Herkes için geçerli bir sayı yok. Platformlar içerikleri nasıl öne çıkardıklarını düzenli olarak değiştirir ve işletme hesapları için zorunlu bir paylaşım sıklığı yayımlamaz. Okuduğunuz tavsiyelerin çoğu — “her gün paylaşın”, “haftada üç kez paylaşın” — ajansların genel kuralıdır, ölçülmüş bir yasa değil; bu kaynakların birçoğu da paylaşım hizmeti satar.",
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
        "Yeterli veri oluşana kadar hastalarınızın gününe uyan saatleri deneyin — işe gitmeden önce, öğle arası ve akşam — ve dört altı hafta sonra karşılaştırın. Her seferinde yalnızca bir şeyi değiştirin. Ramazan ayında akşam saatlerinde alışkanlıklar belirgin biçimde değişebilir; bu dönemde istatistiklerinize ayrıca bakın.",
      ],
    },
    {
      heading: "Haftalık paylaşımlarda hangi biçimler olmalı?",
      paragraphs: [
        "Platformlar kısa dikey videoları, sizi henüz takip etmeyen kişilere en çok gösterir; yeni hastaların bir kliniği keşfettiği ana yol da budur. Hikâyeler mevcut takipçilerle gündelik bağı korur. Kaydırmalı gönderiler ve fotoğraflar, kaydedilmek istenen pratik bilgiler için uygundur. Dengeli bir hafta: iki üç kısa video, bir kaydırmalı gönderi ya da fotoğraf ve birkaç hikâye.",
        "Hasta bilgilendirme videoları bu biçimlerin içinde değeri yüksek ve riski en düşük olanıdır: gerçek bir soruyu yanıtlar, hiç randevu almayacak kişilere bile yararlı olur ve en riskli içeriklerden — önce-sonra fotoğrafları, hasta yorumları, kampanyalar — uzak durur. Kendi videonuzu çekmek için [diş hekimleri için Instagram videoları](guide:dis-hekimleri-icin-instagram-videolari) rehberine bakın.",
      ],
    },
    {
      heading: "Daha sık paylaşım yapmak kuralları değiştirir mi?",
      paragraphs: [
        "Hayır — ama her ek paylaşım, hata için ek bir fırsattır. Klinik hesabından yapılan her paylaşım, ayın ilki de olsa yirmincisi de olsa, sağlık hizmetlerinde tanıtım kurallarına tabidir. Daha yoğun bir ritim, her paylaşımdan önce hızlı ve tekrarlanabilir bir kontrol gerektirir: “ağrısız” gibi kesin vaatler yok, fiyat ve kampanya yok, hasta teşekkürleri üzerinden tanıtım yok, yazılı rıza olmadan hasta görüntüsü yok. Ayrıntılar [diş hekimi reklam yasağı rehberinde](guide:dis-hekimi-reklam-yasagi); her açıklama metni için hızlı bir ön kontrolü ücretsiz [“Bu paylaşım yasak mı?” aracımız](checker:) yapar.",
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
        "No uno universal. Las plataformas cambian con frecuencia cómo distribuyen el contenido y no publican una frecuencia obligatoria para cuentas de empresa. La mayoría de los consejos que leerás —“publica a diario”, “publica tres veces por semana”— son reglas generales de agencias, no leyes medidas, y muchas de esas fuentes venden servicios de publicación.",
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
        "Mientras no tengas datos suficientes, prueba horas que encajen con el día de tus pacientes —antes del trabajo, a mediodía y por la tarde-noche— y compara al cabo de cuatro a seis semanas. Cambia una sola cosa cada vez.",
      ],
    },
    {
      heading: "¿Qué formatos conviene publicar cada semana?",
      paragraphs: [
        "El vídeo vertical corto es el formato que las plataformas muestran más a quien todavía no te sigue, y por eso es la vía principal por la que nuevos pacientes descubren una clínica. Las historias mantienen el contacto diario con quien ya te sigue. Los carruseles y las fotos sirven para información práctica que la gente quiere guardar. Una semana equilibrada: dos o tres vídeos cortos, un carrusel o foto y varias historias.",
        "Los vídeos educativos para pacientes son el formato de mayor valor y menor riesgo: responden una duda real, son útiles incluso para quien nunca pide cita y evitan el contenido más delicado —fotos de antes y después, testimonios y promociones—. Para grabar los tuyos, consulta la guía de [vídeos para clínicas dentales](guide:videos-para-clinicas-dentales).",
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

export const POSTING_RHYTHM_EN = EN;
export const POSTING_RHYTHM_DE = DE;
export const POSTING_RHYTHM_TR = TR;
export const POSTING_RHYTHM_ES = ES;
