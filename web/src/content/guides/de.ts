import type { Guide } from "../dentvideo";

// Deutschsprachige Ratgeber (Deutschland, Österreich, Schweiz). Regeln: nur
// beschreiben, was gilt; keine erfundenen Zahlen, keine Preise; Recht vorsichtig
// und mit amtlichen Quellen.

const HWG = { label: "Heilmittelwerbegesetz (HWG) — gesetze-im-internet.de", url: "https://www.gesetze-im-internet.de/heilmwerbg/" };
const UWG = { label: "Gesetz gegen den unlauteren Wettbewerb (UWG) — gesetze-im-internet.de", url: "https://www.gesetze-im-internet.de/uwg_2004/" };
const BZAEK = { label: "Bundeszahnärztekammer — Musterberufsordnung (MBO-Z) und Landeszahnärztekammern", url: "https://www.bzaek.de/" };
const DSGVO = { label: "Datenschutz-Grundverordnung (DSGVO), Art. 9 — EUR-Lex", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj" };
const DDG = { label: "Digitale-Dienste-Gesetz (DDG), § 5 Impressumspflicht — gesetze-im-internet.de", url: "https://www.gesetze-im-internet.de/ddg/" };
const RIS = { label: "Rechtsinformationssystem des Bundes (RIS) — Zahnärztegesetz (ZÄG), § 35", url: "https://www.ris.bka.gv.at/" };
const OEZAEK = { label: "Österreichische Zahnärztekammer — Werberichtlinie (WR-ÖZÄK)", url: "https://www.zahnaerztekammer.at/" };
const FEDLEX = { label: "Fedlex — Medizinalberufegesetz (MedBG, SR 811.11), Art. 40", url: "https://www.fedlex.admin.ch/" };
const SSO = { label: "Schweizerische Zahnärzte-Gesellschaft SSO — Standesordnung", url: "https://www.sso.ch/" };

export const GUIDES_DE: Guide[] = [
  {
    locale: "de",
    slug: "instagram-videos-fuer-zahnarztpraxen",
    topic: "instagram-videos",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Instagram-Videos für Zahnarztpraxen: Themen, Format, Dreh und Werberecht",
    description: "Ratgeber für Zahnarztpraxen: welche Kurzvideos Patienten ansehen, Reels-Format, Untertitel, Rhythmus und was Heilmittelwerbegesetz und Berufsordnung verbieten.",
    h1: "Instagram-Videos für Zahnarztpraxen",
    intro:
      "Die besten Instagram-Videos für Zahnarztpraxen beantworten in 20 bis 60 Sekunden eine einzige Patientenfrage — hochkant, untertitelt und sachlich formuliert. Ein bis drei Videos pro Woche genügen. Erfolgsversprechen, „schmerzfrei“, Rabatte, Superlative und Patientenstimmen gehören nicht hinein, weil Heilmittelwerbegesetz und zahnärztliche Berufsordnung sie einschränken.",
    sections: [
      {
        heading: "Warum Patienten Videos ansehen",
        paragraphs: [
          "Viele Patienten schauen sich eine Praxis online an, bevor sie einen Termin vereinbaren. Ein kurzes Video zeigt, wer sie behandeln wird, wie diese Person spricht und wie sie erklärt. Gerade bei Angstpatienten kann dieses Gefühl, die Zahnärztin oder den Zahnarzt schon ein wenig zu kennen, den Ausschlag geben.",
          "Das Ziel ist Aufklärung, nicht Verkauf. Das hilft Patienten wirklich weiter und passt zum deutschen Berufsrecht: Sachliche Information über die eigene Tätigkeit ist erlaubt, berufswidrige Werbung nicht. Die Einzelheiten stehen im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
      },
      {
        heading: "Welche Themen funktionieren",
        paragraphs: [
          "Die beste Themenliste haben Sie schon: die Fragen, die Patienten jeden Tag am Behandlungsstuhl stellen. Beantworten Sie pro Video genau eine. Weitere Ideen für ein ganzes Jahr finden Sie in den [Social-Media-Themenideen für die Zahnarztpraxis](guide:social-media-zahnarztpraxis-ideen).",
        ],
        list: [
          "Schadet Bleaching dem Zahnschmelz?",
          "Wie lange dauert eine Implantatbehandlung, und in welchen Schritten?",
          "Was muss ich nach einer Wurzelbehandlung beachten?",
          "Wann ist Zahnfleischbluten ein Warnsignal?",
          "Ab wann sollte mein Kind zum Zahnarzt?",
          "Wie reinige ich meine Aligner richtig?",
          "Ist eine professionelle Zahnreinigung schädlich für den Schmelz?",
        ],
        after: [
          "Sprechen Sie nur über Leistungen, die Ihre Praxis tatsächlich anbietet. Ein Video über eine Behandlung, die Sie nicht durchführen, schickt Interessierte an die falsche Adresse.",
        ],
      },
      {
        heading: "Das Reels-Format: erste Sekunde, ein Gedanke, Untertitel",
        paragraphs: [
          "Kurzvideos laufen auf Instagram als Reels im Hochformat (9:16). Stellen Sie die Frage in der ersten Sekunde, gesprochen und als Text im Bild. Beantworten Sie sie dann in zwei, drei klaren Sätzen und schließen Sie ruhig ab, etwa mit „Wenn Sie unsicher sind, sprechen wir beim nächsten Kontrolltermin darüber“ — ohne Druck, ohne Angebot.",
          "Untertitel sind Pflicht. Viele sehen ohne Ton, und Untertitel helfen auch Menschen mit Hörbeeinträchtigung und Patienten, deren Muttersprache nicht Deutsch ist. Platzieren Sie sie im unteren Drittel, aber oberhalb der App-Symbole.",
        ],
      },
      {
        heading: "Reels, Storys, Profil: welches Video wohin",
        paragraphs: [
          "Reels erreichen am ehesten Menschen, die Ihnen noch nicht folgen — ideal für Frage-Antwort-Videos. Storys verschwinden nach 24 Stunden und eignen sich für den Alltag mit bestehenden Followern: ein kurzer Einblick, ein Hinweis, eine Umfrage. Angepinnte Videos im Profil sieht jeder neue Besucher zuerst; drei gute Kandidaten sind ein Vorstellungsvideo, „Was passiert beim ersten Termin?“ und die häufigste Patientenfrage.",
          "Ordnen Sie Story-Highlights nach Themen wie „Erster Termin“, „Nach der Behandlung“, „Kinder“. So finden Patienten mit wenigen Klicks, was sie suchen.",
        ],
      },
      {
        heading: "Rhythmus statt Masse",
        paragraphs: [
          "Regelmäßigkeit zählt mehr als Menge. Ein bis drei kurze Aufklärungsvideos pro Woche sind für die meisten Praxen gut machbar. Feste Tage erleichtern dem Team die Arbeit und Followern die Gewöhnung.",
          "Am effizientesten: einmal fünf Minuten sprechen und daraus mehrere kurze Clips schneiden. So deckt ein Termin eine ganze Woche ab. Wer keine Zeit zum Drehen hat, ergänzt mit vertonten Aufklärungsvideos — mehr dazu im Ratgeber [Patientenaufklärung per Video](guide:patientenaufklaerung-videos-zahnarztpraxis).",
        ],
      },
      {
        heading: "Woran Sie Erfolg erkennen",
        paragraphs: [
          "Likes allein sagen wenig. Aussagekräftiger für Aufklärungsvideos sind: wie viel eines Videos angesehen wird, wie oft es gespeichert und geteilt wird, welche Nachrichten danach kommen — und ob Patienten beim Termin sagen, sie hätten Ihr Video gesehen. Notieren Sie monatlich, welche Themen gut liefen, und machen Sie mehr davon.",
          "Wachstum über Gewinnspiele oder gekaufte Reichweite ist für Zahnarztpraxen keine gute Idee: Gewinnspiele sind werberechtlich heikel, und Follower, die nicht in Ihrer Region wohnen, werden keine Patienten. Ein langsam wachsendes Publikum aus echten Patienten ist mehr wert.",
        ],
      },
      {
        heading: "Was nicht ins Video gehört",
        paragraphs: [
          "In Deutschland regeln vor allem das Heilmittelwerbegesetz (HWG), das Gesetz gegen den unlauteren Wettbewerb (UWG) und die Berufsordnung Ihrer Landeszahnärztekammer, was in Praxis-Posts zulässig ist. Besonders heikel sind:",
        ],
        list: [
          "Erfolgsversprechen und Absolutes wie „schmerzfrei“, „garantiert“, „hält ein Leben lang“",
          "Superlative und Vergleiche: „die beste Praxis der Stadt“, „Nummer eins für Implantate“",
          "Rabatte, Gutscheine, Gewinnspiele und Werbegaben",
          "Vorher-Nachher-Darstellungen, je nach Eingriff",
          "Patientenstimmen und Dankesnachrichten, wenn sie irreführend oder missbräuchlich eingesetzt werden",
          "Erkennbare Patienten ohne schriftliche Einwilligung",
        ],
        after: [
          "Der sichere Weg ist sachliche Aufklärung mit vorsichtigen Formulierungen: „in der Regel“, „bei den meisten Patienten“, „Ihre Zahnärztin berät Sie individuell“. Im Zweifel fragen Sie Ihre Kammer. Vergessen Sie außerdem das Impressum: Auch ein geschäftlich genutztes Instagram-Profil braucht in Deutschland einen leicht erreichbaren Link darauf.",
        ],
      },
      {
        heading: "Wie DentVideo hilft",
        paragraphs: [
          "[DentVideo](landing:) plant jede Woche fünf Themen aus Ihren Leistungen und echten Patientenfragen, schreibt und vertont die Videos und untertitelt sie mit Ihrem Logo und in Ihren Farben. Jedes Skript wird zweimal geprüft: auf häufig verbotene Werbeaussagen und auf fachliche Richtigkeit. Ihre eigenen Aufnahmen werden nie umformuliert; Auffälliges wird mit Begründung markiert. Nichts geht ohne Ihre Freigabe hinaus. [Die erste Woche ist kostenlos](start:).",
        ],
      },
    ],
    faq: [
      { q: "Wie oft sollte eine Zahnarztpraxis Videos posten?", a: "Regelmäßigkeit zählt mehr als Menge. Ein bis drei kurze Aufklärungsvideos pro Woche sind für die meisten Praxen machbar und halten das Profil lebendig." },
      { q: "Wie lang sollte ein Instagram-Video sein?", a: "Für eine Frage reichen meist 20 bis 60 Sekunden. Längere Themen teilen Sie besser in mehrere Videos mit je einer Frage." },
      { q: "Darf ich Patientenfälle zeigen?", a: "Nur mit dokumentierter, schriftlicher Einwilligung, und Vorher-Nachher-Darstellungen sind in der Publikumswerbung je nach Eingriff eingeschränkt. Klären Sie das vorher mit Ihrer Kammer." },
      { q: "Braucht mein Instagram-Profil ein Impressum?", a: "Wird das Profil geschäftlich für die Praxis genutzt, gilt in Deutschland die Impressumspflicht nach dem Digitale-Dienste-Gesetz. Üblich ist ein Link auf das Impressum der Praxis-Website in der Profilbeschreibung." },
      { q: "Muss die Zahnärztin selbst im Video sein?", a: "Wenn möglich, ja: Patienten vertrauen der Person, die sie behandeln wird. Vertonte Aufklärungsvideos sind eine gute Ergänzung für Wochen ohne Dreh." },
    ],
    sources: [HWG, BZAEK, UWG, DDG],
  },
  {
    locale: "de",
    slug: "heilmittelwerbegesetz-zahnarzt-social-media",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Heilmittelwerbegesetz für Zahnärzte: Was ist auf Instagram und TikTok erlaubt?",
    description: "HWG, UWG und Berufsordnung für Zahnarztpraxen in Social Media: Erfolgsversprechen, Vorher-Nachher, Patientenstimmen, Rabatte, Datenschutz — mit Checkliste. Keine Rechtsberatung.",
    h1: "Heilmittelwerbegesetz für Zahnärzte: Was ist in Social Media erlaubt?",
    intro:
      "Zahnärztinnen und Zahnärzte dürfen in Social Media sachlich über ihre Tätigkeit informieren; verboten ist berufswidrige Werbung. Maßgeblich sind das Heilmittelwerbegesetz (HWG), das UWG und die Berufsordnung der Landeszahnärztekammer. Heikel sind vor allem Erfolgsversprechen, irreführende Aussagen, Superlative und Vergleiche, Rabatte und Werbegaben sowie Vorher-Nachher-Bilder bei bestimmten Eingriffen.",
    sections: [
      {
        heading: "Information ist erlaubt, berufswidrige Werbung nicht",
        paragraphs: [
          "Ein umfassendes Werbeverbot für Zahnärzte gibt es seit Langem nicht mehr. Die Musterberufsordnung der Bundeszahnärztekammer (§ 21 MBO-Z) und die Berufsordnungen der Länder erlauben sachangemessene Information über die Berufstätigkeit und verbieten berufswidrige Werbung — insbesondere anpreisende, irreführende, herabsetzende oder vergleichende. Die Paragrafennummern unterscheiden sich je nach Land; der Grundsatz ist überall ähnlich.",
          "Ein Instagram-Post, ein TikTok-Video oder ein YouTube-Short der Praxis ist in aller Regel Werbung im Sinne dieser Regeln, auch wenn er „nur“ informieren soll. Das gilt auch für berufliche Posts auf dem privaten Profil der Zahnärztin.",
        ],
      },
      {
        heading: "Was das HWG besonders regelt",
        paragraphs: [
          "Das Heilmittelwerbegesetz gilt nicht nur für Arzneimittel, sondern auch für Werbung für Behandlungen und Verfahren. Für Zahnarztpraxen sind diese Punkte am wichtigsten; prüfen Sie den genauen Wortlaut im Gesetz:",
        ],
        list: [
          "Irreführung (§ 3 HWG): unter anderem der falsche Eindruck, ein Erfolg sei sicher zu erwarten, oder Behandlungen hätten keine Risiken.",
          "Werbegaben und Rabatte (§ 7 HWG): Zuwendungen, Gutscheine und Preisnachlässe sind nur in engen Ausnahmen zulässig.",
          "Publikumswerbung (§ 11 HWG): Außerhalb der Fachkreise sind bestimmte Werbeformen verboten, etwa Vorher-Nachher-Vergleiche bei operativen plastisch-chirurgischen Eingriffen ohne medizinische Notwendigkeit und missbräuchliche oder irreführende Äußerungen Dritter.",
          "Verstöße können als Ordnungswidrigkeit geahndet werden; zusätzlich drohen Abmahnungen von Mitbewerbern und Verbänden nach UWG.",
        ],
      },
      {
        heading: "Vorher-Nachher-Bilder: die häufigste Frage",
        paragraphs: [
          "Die Rechtslage ist differenziert. Das ausdrückliche Verbot in § 11 HWG betrifft vergleichende Darstellungen bei operativen plastisch-chirurgischen Eingriffen ohne medizinische Notwendigkeit. Für viele zahnärztliche Behandlungen greift es nach seinem Wortlaut nicht unmittelbar; Gerichte haben einzelne zahnärztliche Vorher-Nachher-Darstellungen unterschiedlich bewertet. Die Oberlandesgerichte legen das Verbot zudem weit aus: Auch Story-Sequenzen, in denen die Bilder nicht nebeneinander stehen, können als Vergleich gelten.",
          "Unabhängig vom HWG bleiben Irreführung und Berufsrecht: Bearbeitete oder besonders ausgewählte Bilder, die ein typisches Ergebnis vortäuschen, sind problematisch. Wer Vorher-Nachher-Bilder zeigen möchte, sollte vorher die Kammer oder eine Fachanwältin für Medizinrecht fragen und immer eine schriftliche Einwilligung der Patientin haben.",
        ],
      },
      {
        heading: "Sichere Formulierungen statt Versprechen",
        paragraphs: ["Fast jede Information lässt sich sachlich sagen, ohne zu versprechen:"],
        list: [
          "Statt „schmerzfreie Implantate“: „Der Eingriff erfolgt unter örtlicher Betäubung; danach spüren die meisten Patienten für einige Tage ein leichtes Ziehen.“",
          "Statt „garantiert weißere Zähne“: „Wie stark Bleaching wirkt, ist individuell verschieden. Ob es für Sie geeignet ist, klären wir vorher.“",
          "Statt „hält ein Leben lang“: „Mit guter Pflege und regelmäßigen Kontrollen kann ein Implantat viele Jahre halten.“",
          "Statt „beste Praxis in München“: überprüfbare Fakten wie Leistungen, Qualifikationen und Sprechzeiten.",
          "Statt „nur diesen Monat günstiger“: gar keine Rabattaktion.",
        ],
      },
      {
        heading: "Datenschutz, Schweigepflicht und Recht am eigenen Bild",
        paragraphs: [
          "Gesundheitsdaten sind nach Art. 9 DSGVO besonders geschützt, und die ärztliche Schweigepflicht gilt auch auf Instagram. Ein erkennbarer Patient, seine Stimme, sein Name oder ein Röntgenbild dürfen nur mit ausdrücklicher, informierter, schriftlicher und widerrufbarer Einwilligung gezeigt werden. Achten Sie im Hintergrund auf Monitore mit Patientendaten, Terminbücher und andere Patienten.",
          "Auch Mitarbeitende brauchen eine Einwilligung, bevor sie in Videos erscheinen. Klären Sie vorab, was mit den Videos passiert, wenn jemand die Praxis verlässt.",
        ],
      },
      {
        heading: "Checkliste vor dem Posten",
        paragraphs: ["Lautet eine Antwort „ja“, formulieren Sie neu oder fragen Sie nach:"],
        list: [
          "Verspricht der Text oder das Bild einen sicheren Erfolg, Schmerzfreiheit oder Dauerhaftigkeit?",
          "Gibt es Superlative, Vergleiche mit anderen Praxen oder herabsetzende Aussagen?",
          "Werden Rabatte, Gutscheine, Gewinnspiele oder Geschenke angeboten?",
          "Gibt es Vorher-Nachher-Bilder oder Patientenstimmen?",
          "Ist eine Person erkennbar, und liegt ihre schriftliche Einwilligung vor?",
          "Stimmt die medizinische Aussage, und gehört der Hinweis zur richtigen Behandlung?",
          "Hat das Profil einen leicht erreichbaren Link zum Impressum?",
        ],
      },
      {
        heading: "Wie DentVideo diese Prüfung übernimmt",
        paragraphs: [
          "[DentVideo](landing:) prüft jedes Skript und jeden Beitragstext auf die Aussagen, die in der Gesundheitswerbung häufig eingeschränkt sind — Garantien, „schmerzfrei“, „dauerhaft“, Superlative, Preise, Rabatte, Vorher-Nachher-Versprechen, Patientenstimmen — und lässt riskante Formulierungen neu schreiben. Ihre eigenen Aufnahmen werden nicht verändert, sondern mit Begründung markiert. Das ersetzt keine Rechtsberatung: Sie geben jedes Video frei. Für Österreich und die Schweiz gibt es einen eigenen [Ratgeber zur Zahnarzt-Werbung in AT und CH](guide:zahnarzt-werbung-oesterreich-schweiz); Themen, die unbedenklich sind, finden Sie in den [Social-Media-Ideen](guide:social-media-zahnarztpraxis-ideen).",
        ],
      },
    ],
    faq: [
      { q: "Darf ein Zahnarzt auf Instagram werben?", a: "Sachliche Information über die eigene Tätigkeit ist erlaubt. Verboten ist berufswidrige Werbung, insbesondere anpreisende, irreführende, herabsetzende oder vergleichende, sowie Werbung, die gegen das HWG verstößt." },
      { q: "Sind Vorher-Nachher-Bilder beim Zahnarzt verboten?", a: "Das ausdrückliche HWG-Verbot betrifft operative plastisch-chirurgische Eingriffe ohne medizinische Notwendigkeit. Für andere Behandlungen kommt es auf den Einzelfall an; Irreführung und Berufsrecht gelten immer. Fragen Sie vorher Ihre Kammer." },
      { q: "Darf ich Google-Bewertungen auf Instagram teilen?", a: "Äußerungen Dritter sind in der Publikumswerbung eingeschränkt, wenn sie missbräuchlich, abstoßend oder irreführend sind; zudem können Berufsordnungen strenger sein. Viele Praxen verzichten deshalb in Social Media darauf." },
      { q: "Darf ich Preise nennen?", a: "Preisangaben sind nicht pauschal verboten, müssen aber zutreffend, GOZ-konform und nicht irreführend sein. Rabatte, Gutscheine und Werbegaben sind nach § 7 HWG dagegen nur in engen Ausnahmen zulässig." },
      { q: "Gelten die Regeln auch für TikTok und YouTube?", a: "Ja. Es kommt nicht auf die Plattform an, sondern darauf, dass die Praxis öffentlich über ihre Leistungen kommuniziert. Website, Google-Profil, Instagram, TikTok und YouTube werden gleich behandelt." },
      { q: "Darf ich mit Influencern zusammenarbeiten?", a: "Bezahlte Kooperationen müssen als Werbung gekennzeichnet sein, und die Influencer-Aussagen müssen dieselben Regeln einhalten wie Ihre eigenen. Lobende Behandlungserfahrungen sind als Äußerungen Dritter heikel; lassen Sie solche Kooperationen vorher prüfen." },
      { q: "Ist dieser Ratgeber eine Rechtsberatung?", a: "Nein. Er ist eine allgemeine Information. Regeln ändern sich und hängen vom Einzelfall ab; verbindlich klären Sie Fragen mit Ihrer Landeszahnärztekammer oder einer Fachanwältin für Medizinrecht." },
    ],
    sources: [HWG, UWG, BZAEK, DSGVO, DDG],
  },
  {
    locale: "de",
    slug: "social-media-zahnarztpraxis-ideen",
    topic: "post-ideas",
    category: "ideas",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Social Media für die Zahnarztpraxis: Themenideen für Instagram, Reels und TikTok",
    description: "Themenideen für Instagram, Reels und TikTok in der Zahnarztpraxis: Patientenfragen, Behandlungen erklärt, Team, saisonale Themen, ein Beispielmonat und was Sie besser lassen.",
    h1: "Social Media für die Zahnarztpraxis: Themenideen",
    intro:
      "Die sichersten und meistgesehenen Social-Media-Beiträge einer Zahnarztpraxis sind kurze Videos, die häufige Patientenfragen beantworten, Behandlungen Schritt für Schritt erklären, Pflegetipps nach der Behandlung geben und das Team vorstellen. Rabattaktionen, Gewinnspiele, Patientenstimmen und Erfolgsversprechen gehören nicht auf die Liste, weil Heilmittelwerbegesetz und Berufsordnung sie einschränken.",
    sections: [
      {
        heading: "Drei Regeln für die Themenwahl",
        paragraphs: ["Ob eine Idee ein guter Beitrag wird, zeigen drei Fragen:"],
        list: [
          "Fragt ein Patient das wirklich? Fragen vom Behandlungsstuhl, vom Telefon und aus der Google-Suche sind die besten Themen.",
          "Bieten wir das in unserer Praxis an? Erklären Sie nur Leistungen, die Sie erbringen.",
          "Informiert der Beitrag, oder drängt er? Nicht „Jetzt Termin sichern, Aktion endet Freitag“, sondern „Lassen Sie das beim nächsten Termin anschauen“.",
        ],
      },
      {
        heading: "Patientenfragen kurz beantwortet",
        paragraphs: [
          "Diese Reihe kann das Rückgrat Ihres Profils werden: eine Frage, 20 bis 60 Sekunden, eine vorsichtige Antwort. Suchanfragen wie „ist … schädlich“, „… wie lange“ oder „nach …“ zeigen, was Patienten wirklich beschäftigt:",
        ],
        list: [
          "Ist Bleaching schädlich für die Zähne?",
          "Wie lange dauert eine Implantatbehandlung?",
          "Was darf ich nach dem Zahnziehen essen?",
          "Sind Schmerzen nach einer Wurzelbehandlung normal?",
          "Geht Zahnfleischrückgang wieder weg?",
          "Woran erkenne ich nächtliches Zähneknirschen?",
          "Woher kommt Mundgeruch?",
        ],
      },
      {
        heading: "Behandlungen erklärt und Pflegetipps",
        paragraphs: [
          "Angst entsteht oft aus Unbekanntem. Videos, die die Schritte einer Behandlung erklären, nehmen vor dem Termin viel Unsicherheit. Pflegevideos begleiten Patienten nach Hause. Mehr dazu im Ratgeber [Patientenaufklärung per Video](guide:patientenaufklaerung-videos-zahnarztpraxis).",
        ],
        list: [
          "Wurzelbehandlung Schritt für Schritt: was passiert, wie lange dauert es?",
          "Die ersten 24 Stunden nach einer Füllung",
          "Aligner reinigen und aufbewahren",
          "Richtig putzen, Zahnseide und Interdentalbürsten",
          "Milchzähne pflegen und der erste Zahnarztbesuch",
          "Mundhygiene mit Implantaten",
        ],
      },
      {
        heading: "Praxis und Team vorstellen",
        paragraphs: [
          "Menschen vertrauen Menschen, nicht Logos. Kurze Vorstellungsvideos nehmen Neupatienten die Scheu. Auch hier gilt: sachlich bleiben. „Unsere ZFA Lena zeigt, wie der erste Termin abläuft“ ist Information; „das erfahrenste Team der Region“ ist ein Superlativ.",
        ],
        list: [
          "Die Zahnärztin stellt sich vor: Schwerpunkte und Arbeitsweise",
          "Was passiert beim ersten Termin?",
          "So funktioniert die Aufbereitung der Instrumente (ohne Patienten im Bild)",
          "Anfahrt, Parken, Barrierefreiheit",
          "Was wir für Angstpatienten tun",
        ],
      },
      {
        heading: "Saisonale Themen",
        paragraphs: ["Der Kalender liefert verlässlich Anlässe, zum Beispiel:"],
        list: [
          "Weltmundgesundheitstag am 20. März",
          "Tag der Zahngesundheit am 25. September",
          "Schulstart: Zahnpflege und Kontrolltermine bei Kindern",
          "Ostern, Halloween, Weihnachten: Süßes und Zähne ohne erhobenen Zeigefinger",
          "Sommer: Mundschutz beim Sport",
          "Jahresende: an den Kontrolltermin und das Bonusheft denken (Information, keine Aktion)",
        ],
      },
      {
        heading: "Woher neue Themen kommen",
        paragraphs: [
          "Wenn die Liste leer wird, helfen drei Quellen. Erstens Ihr Team: Empfang und ZFA wissen am besten, was Patienten am Telefon und am Stuhl fragen — bitten Sie sie, eine Woche lang jede Frage zu notieren. Zweitens Google: Tippen Sie „Implantat“ oder „Bleaching“ ins Suchfeld und lesen Sie die Vorschläge; Muster wie „… schädlich“, „… wie lange“, „nach …“ zeigen echte Sorgen. Drittens Ihr eigenes Profil: Kommentare und Nachrichten unter Videos sind das nächste Thema.",
          "Preisfragen kommen häufig, sind aber kein Videothema. Beantworten Sie sie persönlich; wiederholt sich die Frage, erklären Sie in einem Video den Ablauf und die Faktoren, die den Aufwand bestimmen — ohne Beträge.",
        ],
      },
      {
        heading: "Beitragstext und Hashtags",
        paragraphs: [
          "Der Text unter dem Video wiederholt kurz, was das Video sagt, und fügt kein Versprechen hinzu. Bewährt hat sich: Frage in die erste Zeile, Antwort in zwei, drei Sätzen, zum Schluss „Ihre Zahnärztin berät Sie individuell“. Praxisname und Ort genügen für die Auffindbarkeit.",
          "Hashtags: themen- und ortsbezogen (#Zahngesundheit, #Implantat, #ZahnarztKöln), fünf bis zehn sinnvolle statt dreißig beliebiger. Verzichten Sie auf Superlative wie #besterZahnarzt.",
        ],
      },
      {
        heading: "Was Sie besser lassen",
        paragraphs: [
          "Manche Social-Media-Tipps aus anderen Branchen sind für Zahnarztpraxen riskant: Rabatt- und Gutscheinaktionen, Gewinnspiele, „Das sagen unsere Patienten“, Screenshots von Dankesnachrichten, Vorher-Nachher-Slider und Influencer-Kooperationen ohne rechtliche Prüfung. Warum, steht im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media). Für jedes Bild mit erkennbaren Patienten brauchen Sie außerdem eine schriftliche Einwilligung.",
        ],
      },
      {
        heading: "Ein Beispielmonat",
        paragraphs: ["So kann ein Monat mit drei Beiträgen pro Woche aussehen:"],
        list: [
          "Woche 1: „Ist Bleaching schädlich?“ · „Die ersten 24 Stunden nach einer Füllung“ · Die Zahnärztin stellt sich vor",
          "Woche 2: „Wann ist Zahnfleischbluten ein Warnsignal?“ · „Richtig putzen“ · Der erste Termin",
          "Woche 3: „Wie lange dauert ein Implantat?“ · „Was essen nach dem Zahnziehen?“ · Hygiene in der Praxis",
          "Woche 4: „Ab wann zum Zahnarzt mit dem Kind?“ · „Anzeichen für Zähneknirschen“ · Anfahrt und Barrierefreiheit",
        ],
        after: [
          "Drei Beiträge sind zu viel? Fangen Sie mit einem an. [DentVideo](landing:) übernimmt diese Planung: Es wählt jede Woche fünf Themen aus Ihren Leistungen und echten Patientenfragen, schreibt, vertont und prüft die Videos — Sie geben nur frei.",
        ],
      },
    ],
    faq: [
      { q: "Was sollte eine Zahnarztpraxis auf Instagram posten?", a: "Kurze Antworten auf Patientenfragen, verständliche Erklärungen von Behandlungen, Pflegetipps und Vorstellungen des Teams — sachlich, vorsichtig formuliert und ohne Versprechen." },
      { q: "Wie oft sollte eine Praxis posten?", a: "Ein bis drei Beiträge pro Woche sind für die meisten Praxen gut machbar. Regelmäßigkeit ist wichtiger als Häufigkeit." },
      { q: "Brauche ich für TikTok andere Inhalte?", a: "Meist nicht. Dasselbe hochformatige, untertitelte Kurzvideo funktioniert auf Instagram Reels, TikTok und YouTube Shorts; nur den Text passen Sie an." },
      { q: "Darf ich Gewinnspiele machen?", a: "Gewinnspiele und Werbegaben sind in der Werbung für Heilbehandlungen nach § 7 HWG und dem Berufsrecht heikel. Verzichten Sie darauf oder lassen Sie sie vorher rechtlich prüfen." },
      { q: "Welche Hashtags sollte eine Zahnarztpraxis nutzen?", a: "Fünf bis zehn thematisch und örtlich passende Hashtags wie #Zahngesundheit oder #ZahnarztHamburg. Verzichten Sie auf Superlative wie #besterZahnarzt und auf Hashtags, die an Rabatte erinnern." },
      { q: "Sollte ich auf Kommentare antworten?", a: "Ja, freundlich und allgemein. Fragen zu individuellen Beschwerden beantworten Sie nicht öffentlich, sondern verweisen auf einen Termin oder das Telefon der Praxis." },
      { q: "Darf ich zu Feiertagen gratulieren?", a: "Ja, Grüße zu Feiertagen sind unproblematisch. Verbinden Sie sie aber nicht mit Aktionen, Rabatten oder Gutscheinen." },
      { q: "Woher bekomme ich neue Themen?", a: "Vom Team (welche Fragen kommen am Empfang und am Stuhl?), aus den Google-Suchvorschlägen zu Ihren Behandlungen und aus Kommentaren und Nachrichten unter Ihren eigenen Videos." },
    ],
    sources: [HWG, BZAEK, DSGVO],
  },
  {
    locale: "de",
    slug: "patientenaufklaerung-videos-zahnarztpraxis",
    topic: "patient-education",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Patientenaufklärung per Video in der Zahnarztpraxis: Themen, Einsatz und Genauigkeit",
    description: "Aufklärungsvideos für die Zahnarztpraxis: welche Themen zuerst, Einsatz im Wartezimmer, per E-Mail und auf Instagram, Skriptvorlage, Genauigkeit und das Verhältnis zur Aufklärungspflicht.",
    h1: "Patientenaufklärung per Video in der Zahnarztpraxis",
    intro:
      "Aufklärungsvideos für Zahnarztpraxen sind kurze Filme von 30 bis 90 Sekunden, die erklären, was eine Behandlung ist, wie sie abläuft und worauf Patienten danach achten sollten. Sie nehmen Angst vor dem Termin, erinnern an Pflegehinweise und geben jedem Patienten dieselbe korrekte Erklärung. Das persönliche Aufklärungsgespräch nach § 630e BGB ersetzen sie nicht.",
    sections: [
      {
        heading: "Was Aufklärungsvideos leisten",
        paragraphs: [
          "Ein Teil dessen, was im Behandlungszimmer gesagt wird, ist zu Hause vergessen — besonders, wenn Patienten nervös sind oder die Betäubung noch wirkt. Ein kurzes Video lässt sich jederzeit wieder ansehen. Das Team muss dieselbe Frage nicht mehrmals täglich beantworten, und alle Patienten bekommen dieselbe, geprüfte Information.",
          "Wichtig: Die rechtlich geforderte Aufklärung vor einem Eingriff erfolgt mündlich im Gespräch mit der Zahnärztin; Unterlagen und Videos dürfen ergänzen, aber nicht ersetzen. Verstehen Sie Videos deshalb als Vorbereitung und Erinnerung.",
        ],
      },
      {
        heading: "Mit welchen Themen anfangen",
        paragraphs: ["Beginnen Sie mit den Fragen, die Ihr Team täglich beantwortet. Drei Zeitpunkte bieten sich an:"],
        list: [
          "Vor dem ersten Termin: Was passiert bei der ersten Untersuchung, was bringe ich mit, warum ein Röntgenbild?",
          "Vor einer Behandlung: Wurzelbehandlung, Implantat, Extraktion, professionelle Zahnreinigung, Aligner — die Schritte verständlich erklärt.",
          "Nach einer Behandlung: Verhalten nach dem Zahnziehen, Essen nach einer Füllung, Pflege von Implantaten, Empfindlichkeit nach Bleaching.",
          "Für Kinder und Eltern: Milchzahnpflege, der erste Zahnarztbesuch, Fissurenversiegelung und Fluoridierung.",
        ],
      },
      {
        heading: "Eine Skriptvorlage, die funktioniert",
        paragraphs: ["Dieselbe einfache Struktur macht Schreiben und Zuschauen leichter:"],
        list: [
          "Frage (erste 3 Sekunden): „Wann darf ich nach dem Zahnziehen wieder essen?“",
          "Kurze Antwort (1 Satz): „In der Regel, sobald die Betäubung nachgelassen hat — mit lauwarmer, weicher Kost.“",
          "Begründung (1–2 Sätze): Warum das Blutgerinnsel für die Heilung wichtig ist.",
          "Was tun (2–3 Punkte): eingriffsbezogene Hinweise, etwa am ersten Tag keine heißen Getränke, kein Strohhalm, nicht rauchen.",
          "Wann anrufen (1 Satz): „Wenn Blutung oder Schmerzen zunehmen, rufen Sie uns an.“",
          "Abschluss: „Ihre persönlichen Hinweise bekommen Sie von Ihrer Zahnärztin.“",
        ],
        ordered: true,
        after: [
          "Der Teil „Wann anrufen“ ist bei Nachsorgevideos besonders wichtig: Patienten sollen wissen, was normal ist und was nicht.",
        ],
      },
      {
        heading: "Genau und vertrauenswürdig bleiben",
        paragraphs: [
          "Bleiben Sie bei anerkannten Empfehlungen und formulieren Sie vorsichtig, wo Ergebnisse variieren: „in der Regel“, „bei den meisten Patienten“, „Ihre Zahnärztin sagt Ihnen, was für Sie gilt“. Halten Sie Nachsorgehinweise eingriffsbezogen — was nach einer Extraktion richtig ist, kann nach einer Füllung falsch sein.",
          "Der Text unter dem Video muss dasselbe sagen wie das Video. Lassen Sie jedes Video vor der Veröffentlichung von einer Zahnärztin ansehen. Werden die Videos auch in Social Media gezeigt, gilt das Werberecht; Details im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
      },
      {
        heading: "Wo die Videos eingesetzt werden",
        paragraphs: ["Dasselbe kurze Video funktioniert an vielen Stellen:"],
        list: [
          "Instagram, TikTok und YouTube Shorts als Aufklärungsinhalt",
          "Wartezimmer-Bildschirm als stumme, untertitelte Schleife",
          "Termin-Erinnerung oder Nachsorge-E-Mail, sofern der Patient diesem Kontakt zugestimmt hat",
          "Leistungsseiten Ihrer Praxis-Website",
        ],
        after: [
          "Für den Versand per E-Mail oder Messenger brauchen Sie eine geeignete Einwilligung und einen datenschutzkonformen Kanal; werbliche Nachrichten ohne Einwilligung sind unzulässig.",
        ],
      },
      {
        heading: "Im Team verankern",
        paragraphs: [
          "Aufklärungsvideos wirken nur, wenn das Team sie nutzt. Der Empfang kann mit der Terminbestätigung das Video „Ihr erster Termin“ schicken, die ZFA nach der Behandlung auf das passende Nachsorgevideo hinweisen, und die Zahnärztin im Gespräch sagen: „Dazu gibt es ein kurzes Video, das Sie sich zu Hause noch einmal ansehen können.“ Eine einfache Tabelle, welches Video zu welcher Behandlung gehört, reicht.",
          "Überprüfen Sie die Videos einmal im Jahr und immer dann, wenn sich Ihr Praxisprotokoll ändert. Rückmeldungen wie „das habe ich im Video nicht verstanden“ zeigen am besten, welches Video überarbeitet werden sollte.",
        ],
      },
      {
        heading: "Barrierefreiheit und mehrsprachige Patienten",
        paragraphs: [
          "Untertitel helfen Menschen mit Hörbeeinträchtigung und allen, die ohne Ton sehen. Kurze Sätze, Alltagssprache und eine Übersetzung jedes Fachworts („Parodontitis, also eine fortgeschrittene Zahnfleischentzündung“) machen Videos verständlich.",
          "Viele Praxen behandeln Patienten, die besser Türkisch, Arabisch, Englisch oder Russisch sprechen als Deutsch. Die häufigsten Nachsorgehinweise auch in diesen Sprachen bereitzuhalten, erleichtert das Gespräch und verringert Missverständnisse.",
        ],
      },
      {
        heading: "Selbst sprechen oder vertonen lassen?",
        paragraphs: [
          "Patienten vertrauen der Person, die sie behandeln wird; Videos, in denen die Zahnärztin selbst erklärt, wirken am stärksten. Jede Woche zu drehen ist aber selten realistisch. Ein guter Mittelweg: Die häufigsten Themen erklären Sie selbst, den Rest übernehmen vertonte Aufklärungsvideos. Wie Sie in fünf Minuten drehen, steht im Ratgeber [Instagram-Videos für Zahnarztpraxen](guide:instagram-videos-fuer-zahnarztpraxen).",
          "[DentVideo](landing:) plant jede Woche fünf Themen aus Ihren Leistungen, schreibt, vertont und untertitelt die Aufklärungsvideos in Ihrer Sprache und prüft jedes auf fachliche Richtigkeit und Werberecht. Freigegebene Videos laden Sie mit Text herunter — für Instagram, Wartezimmer oder Website.",
        ],
      },
    ],
    faq: [
      { q: "Wie lang sollte ein Aufklärungsvideo sein?", a: "Für ein Thema reichen meist 30 bis 90 Sekunden. Längere Behandlungsverläufe teilen Sie in mehrere kurze Videos, je eines pro Schritt." },
      { q: "Ersetzt ein Video das Aufklärungsgespräch?", a: "Nein. Die Aufklärung vor einem Eingriff erfolgt mündlich im Gespräch mit der Zahnärztin. Videos bereiten vor und erinnern, sie ersetzen das Gespräch nicht." },
      { q: "Darf ich Aufklärungsvideos auf Instagram zeigen?", a: "Ja, solange sie sachlich informieren und keine Erfolgsversprechen, Rabatte oder Patientenstimmen enthalten. In Social Media gilt das Werberecht." },
      { q: "Braucht das Wartezimmer-Video Ton?", a: "Nein. Untertitelte Videos sind auch stumm verständlich und stören im Wartezimmer weniger." },
      { q: "Darf ich Aufklärungsvideos per WhatsApp verschicken?", a: "Nur über einen datenschutzkonformen Kanal und mit Einwilligung des Patienten. Viele Praxen schicken stattdessen einen Link per E-Mail oder zeigen einen QR-Code am Empfang." },
      { q: "Mit welchen Videos sollte ich anfangen?", a: "Mit den Themen, die am häufigsten gefragt werden und die meiste Sorge machen: Verhalten nach dem Zahnziehen, Wurzelbehandlung, Ablauf einer Implantatbehandlung und der erste Termin. Diese vier decken einen großen Teil der täglichen Erklärungen ab." },
      { q: "Wer sollte die Videos prüfen?", a: "Jedes Video sollte vor der Veröffentlichung von einer Zahnärztin angesehen werden, besonders Nachsorgehinweise, die zum Protokoll Ihrer Praxis passen müssen." },
    ],
    sources: [HWG, DSGVO, BZAEK],
  },
  {
    locale: "de",
    slug: "zahnarzt-werbung-oesterreich-schweiz",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Zahnarzt-Werbung in Österreich und der Schweiz: ZÄG, Werberichtlinie und MedBG",
    description: "Was Zahnärzte in Österreich und der Schweiz in Social Media zeigen dürfen: § 35 ZÄG und Werberichtlinie der ÖZÄK, Art. 40 MedBG und SSO-Standesordnung. Keine Rechtsberatung.",
    h1: "Zahnarzt-Werbung in Österreich und der Schweiz",
    intro:
      "In Österreich und der Schweiz dürfen Zahnärzte sachlich werben, aber nicht unwahr, unsachlich oder aufdringlich. In Österreich verbietet § 35 Zahnärztegesetz unwahre, unsachliche, diskriminierende und standesschädigende Werbung, konkretisiert durch die Werberichtlinie der Zahnärztekammer. In der Schweiz verlangt Art. 40 Medizinalberufegesetz objektive Werbung, die weder irreführend noch aufdringlich ist.",
    sections: [
      {
        heading: "Warum es einen eigenen Ratgeber braucht",
        paragraphs: [
          "Das deutsche Heilmittelwerbegesetz gilt in Österreich und der Schweiz nicht. Beide Länder haben eigene Berufsgesetze und Standesregeln, die in vielen Punkten ähnlich klingen, aber anders formuliert und durchgesetzt werden. Wer im DACH-Raum mehrere Standorte hat oder grenznah Patienten anspricht, sollte die Unterschiede kennen. Für Deutschland lesen Sie den [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
      },
      {
        heading: "Österreich: § 35 ZÄG und die Werberichtlinie",
        paragraphs: [
          "Nach § 35 Zahnärztegesetz (ZÄG) haben sich Angehörige des zahnärztlichen Berufs jeder unwahren, unsachlichen, diskriminierenden oder das Ansehen des Berufsstandes beeinträchtigenden Anpreisung oder Werbung zu enthalten. Die Österreichische Zahnärztekammer hat auf dieser Grundlage eine Werberichtlinie (WR-ÖZÄK) erlassen, die zuletzt 2024 geändert wurde; sie konkretisiert, was als unsachlich gilt, etwa die Selbstanpreisung der eigenen Person oder Leistungen.",
          "Der Oberste Gerichtshof betont, dass es kein absolutes Werbeverbot gibt: Untersagt ist, was unsachlich, unwahr oder standesschädigend ist. Bemerkenswert ist außerdem, dass diese Regeln nach der Rechtsprechung auch für im Ausland niedergelassene Zahnärzte gelten können, die in Österreich gezielt Patienten werben.",
        ],
      },
      {
        heading: "Schweiz: Art. 40 MedBG und die SSO-Standesordnung",
        paragraphs: [
          "Das Medizinalberufegesetz (MedBG) nennt in Art. 40 die Berufspflichten der universitären Medizinalberufe, zu denen Zahnärztinnen und Zahnärzte gehören. Danach machen sie nur Werbung, die objektiv ist und dem öffentlichen Bedürfnis entspricht und die weder irreführend noch aufdringlich ist. Die Aufsicht liegt bei den Kantonen.",
          "Für Mitglieder der Schweizerischen Zahnärzte-Gesellschaft SSO gilt zusätzlich deren Standesordnung mit Regeln zu Information und Werbung. Daneben gelten das Bundesgesetz gegen den unlauteren Wettbewerb und das revidierte Datenschutzgesetz, nach dem Gesundheitsdaten besonders schützenswert sind.",
        ],
      },
      {
        heading: "Was in beiden Ländern heikel ist",
        paragraphs: ["Trotz unterschiedlicher Wortlaute decken sich die Risiken weitgehend:"],
        list: [
          "Selbstanpreisung und Superlative: „die beste Praxis in Wien“, „Zürichs Nummer eins“",
          "Erfolgsversprechen: „schmerzfrei“, „garantiert“, „für immer“",
          "Vergleiche mit Kolleginnen und Kollegen oder herabsetzende Aussagen",
          "Aufdringliche Formate: Rabattaktionen, Gutscheine, Gewinnspiele, Werbung mit Zeitdruck",
          "Irreführende Bilder: bearbeitete oder untypische Vorher-Nachher-Ergebnisse",
          "Erkennbare Patienten ohne ausdrückliche, schriftliche Einwilligung",
        ],
      },
      {
        heading: "Was gut funktioniert und unbedenklich ist",
        paragraphs: [
          "Sachliche Aufklärung ist in beiden Ländern der sichere Weg: Patientenfragen beantworten, Behandlungen erklären, Nachsorge erläutern, das Team und die Praxis vorstellen. Formulieren Sie vorsichtig („in der Regel“, „das besprechen wir individuell“), nennen Sie überprüfbare Fakten statt Wertungen und verzichten Sie auf Druck.",
          "Ideen für unbedenkliche Beiträge finden Sie in den [Social-Media-Themenideen](guide:social-media-zahnarztpraxis-ideen); wie Sie sie als kurzes Video umsetzen, im Ratgeber [Instagram-Videos für Zahnarztpraxen](guide:instagram-videos-fuer-zahnarztpraxen).",
        ],
      },
      {
        heading: "Sprache und Ansprache in Österreich und der Schweiz",
        paragraphs: [
          "Neben dem Recht zählt der Ton. In der Schweiz schreiben Sie ohne ß („Grüsse“, „schliessen“), und viele Praxen ergänzen französische oder italienische Versionen, je nach Region. In Österreich sind Begriffe wie „Ordination“ statt „Praxis“ und „Zahnambulatorium“ geläufig. Videos, die in Wortwahl und Aussprache zur Region passen, wirken vertrauter als Inhalte, die erkennbar für ein anderes Land gemacht wurden.",
          "Ob Sie Patientinnen siezen oder duzen, ist eine Frage des Praxisstils; in medizinischer Aufklärung ist das Sie in allen drei Ländern die verbreitete Wahl.",
        ],
      },
      {
        heading: "Datenschutz und Patientenbilder",
        paragraphs: [
          "In Österreich gilt die DSGVO unmittelbar, ergänzt durch das österreichische Datenschutzgesetz; Gesundheitsdaten sind besonders geschützt, und die zahnärztliche Verschwiegenheitspflicht gilt auch online. In der Schweiz sind Gesundheitsdaten nach dem revidierten Datenschutzgesetz besonders schützenswert, und das Berufsgeheimnis ist strafrechtlich geschützt.",
          "Für die Praxis bedeutet das in beiden Ländern dasselbe: Erkennbare Patienten, ihre Stimme, ihr Name oder ihre Röntgenbilder erscheinen nur mit ausdrücklicher, informierter und schriftlicher Einwilligung, die widerrufen werden kann. Achten Sie beim Dreh auf Bildschirme, Terminpläne und andere Patienten im Hintergrund.",
        ],
      },
      {
        heading: "Checkliste für AT und CH",
        paragraphs: [],
        list: [
          "Ist jede Aussage wahr, überprüfbar und sachlich?",
          "Lobt sich die Praxis selbst oder vergleicht sie sich mit anderen?",
          "Wird Druck aufgebaut (Fristen, Rabatte, Gutscheine)?",
          "Sind Bilder unbearbeitet und typisch, und liegen Einwilligungen vor?",
          "Passt der Beitrag zu den Regeln der Kammer (AT) bzw. des Kantons und der SSO (CH)?",
          "Gibt es eine Anbieterkennzeichnung (Impressum) mit Berufsbezeichnung?",
        ],
      },
      {
        heading: "Wie DentVideo hilft",
        paragraphs: [
          "[DentVideo](landing:) erstellt sachliche Aufklärungsvideos auf Deutsch (auch in Schweizer Schreibweise ohne ß, wenn Sie das wünschen) und weiteren Sprachen und prüft jedes Skript auf die Aussagen, die in der Gesundheitswerbung häufig eingeschränkt sind: Garantien, „schmerzfrei“, Superlative, Preise, Rabatte, Vorher-Nachher-Versprechen, Patientenstimmen. Das ist ein sorgfältiger Filter, keine Rechtsberatung — Sie geben jedes Video frei. [Erste Woche kostenlos starten](start:).",
        ],
      },
    ],
    faq: [
      { q: "Darf ein Zahnarzt in Österreich werben?", a: "Ja, sachlich. § 35 ZÄG verbietet unwahre, unsachliche, diskriminierende und standesschädigende Werbung; die Werberichtlinie der Österreichischen Zahnärztekammer konkretisiert das." },
      { q: "Was erlaubt das MedBG Zahnärzten in der Schweiz?", a: "Werbung, die objektiv ist und dem öffentlichen Bedürfnis entspricht und weder irreführend noch aufdringlich ist (Art. 40 MedBG). SSO-Mitglieder müssen zudem die Standesordnung einhalten." },
      { q: "Gilt das deutsche HWG in Österreich oder der Schweiz?", a: "Nein. Beide Länder haben eigene Regeln. Wer aber gezielt Patienten in Deutschland anspricht, muss auch das deutsche Recht beachten." },
      { q: "Darf ich als ausländische Praxis in Österreich werben?", a: "Nach der Rechtsprechung des OGH können die österreichischen Werberegeln auch für im Ausland niedergelassene Zahnärzte gelten, die in Österreich Patienten werben. Lassen Sie solche Kampagnen prüfen." },
      { q: "Gelten in Liechtenstein oder Südtirol dieselben Regeln?", a: "Nein. Liechtenstein und Südtirol haben eigene Rechtsordnungen und Berufsregeln. Prüfen Sie dort die Vorgaben der jeweiligen Kammer oder Behörde." },
      { q: "Darf ich in der Schweiz Patientenbewertungen zeigen?", a: "Gefälschte oder irreführende Bewertungen sind unzulässig, und Selbstlob kann gegen das Gebot objektiver Werbung verstoßen. Prüfen Sie die Standesordnung der SSO und fragen Sie im Zweifel die kantonale Aufsicht." },
      { q: "Ist dieser Ratgeber eine Rechtsberatung?", a: "Nein. Er gibt einen allgemeinen Überblick. Verbindlich klären Sie Fragen mit der Zahnärztekammer, der kantonalen Aufsicht, der SSO oder einer Anwältin." },
    ],
    sources: [RIS, OEZAEK, FEDLEX, SSO],
  },
  {
    locale: "de",
    slug: "praxismarketing-zahnarzt-agentur-oder-selbst",
    topic: "agency-or-tool",
    category: "tools",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Praxismarketing für Zahnärzte: Agentur, Social-Media-Manager, Team oder Software?",
    description: "Social Media in der Zahnarztpraxis organisieren: Agentur, Freelancer, Team oder Software im Vergleich, Fragen vor dem Vertrag, ein Wochenablauf und wer haftet.",
    h1: "Praxismarketing für Zahnärzte: Agentur, Team oder Software?",
    intro:
      "Für das Social-Media-Marketing einer Zahnarztpraxis gibt es vier Wege: eine Agentur, einen freien Social-Media-Manager, eine Mitarbeiterin aus dem Team oder eine Software, die Inhalte erstellt. Entscheidend ist in jedem Fall dieselbe Frage: Kennt der Inhalt das Heilmittelwerbegesetz und die Berufsordnung, und gibt die Zahnärztin jeden Beitrag vor der Veröffentlichung frei?",
    sections: [
      {
        heading: "Erst klären, was Sie brauchen",
        paragraphs: [
          "„Social Media machen“ umfasst sehr unterschiedliche Aufgaben: Themen planen, Texte schreiben, drehen und schneiden, gestalten, posten, Nachrichten beantworten und auswerten. Für die meisten Praxen ist der schwierigste Teil, regelmäßig korrekte und rechtssichere Inhalte zu erstellen. Wer weiß, welche Aufgabe er abgeben will, findet leichter die passende Lösung.",
        ],
      },
      {
        heading: "Vier Wege im Vergleich",
        paragraphs: [],
        list: [
          "Agentur: übernimmt Planung, Gestaltung und Posting und spart Zeit. Kosten sind oft hoch, und nicht jede Agentur kennt Heilmittelwerbegesetz und Berufsordnung — Rabattaktionen, Gewinnspiele und Vorher-Nachher-Slider sind in anderen Branchen üblich, bei Zahnärzten riskant.",
          "Freier Social-Media-Manager: flexibler und oft günstiger, stark bei Dreh und Schnitt. Die Kontinuität hängt an einer Person, das Rechtswissen schwankt.",
          "Team: kennt Praxis und Patienten am besten, Inhalte wirken authentisch. Doch die Zeit ist knapp, und die Behandlung hat immer Vorrang.",
          "Software: erstellt regelmäßige Inhalte schnell und planbar. Allgemeine Tools kennen das Werberecht im Gesundheitswesen nicht; auch bei einem spezialisierten Tool bleibt die letzte Prüfung bei der Zahnärztin.",
        ],
      },
      {
        heading: "Fragen vor dem Vertrag",
        paragraphs: ["Fragen Sie jede Agentur und jeden Freelancer:"],
        list: [
          "Wie stellen Sie sicher, dass Inhalte HWG, UWG und unsere Berufsordnung einhalten?",
          "Schlagen Sie Rabattaktionen, Gewinnspiele, Patientenstimmen oder Vorher-Nachher-Bilder vor? (Wenn ja: Vorsicht.)",
          "Wird jeder Beitrag vor dem Posten der Zahnärztin zur Freigabe vorgelegt?",
          "Wer schreibt medizinische Inhalte, und wer prüft sie fachlich?",
          "Wer holt Einwilligungen von Patienten und Mitarbeitenden ein, und wo werden sie dokumentiert?",
          "Gibt es einen Auftragsverarbeitungsvertrag, falls Sie Patientendaten sehen?",
          "Wem gehören Konten, Rohmaterial und Inhalte, wenn die Zusammenarbeit endet?",
        ],
      },
      {
        heading: "Wenn das Team selbst übernimmt",
        paragraphs: [
          "Soll Social Media aus dem Team kommen, behandeln Sie es als feste Aufgabe mit fester Zeit pro Woche, nicht als etwas „für zwischendurch“. Ideal ist jemand, der gut mit Patienten kommuniziert, sorgfältig schreibt und diskret mit Daten umgeht. Geben Sie dieser Person eine kurze Zusammenfassung der Werberegeln und die Freigabe-Checkliste; medizinische Inhalte gibt immer die Zahnärztin frei.",
          "Bereiten Sie außerdem Antwortvorlagen für Nachrichten vor: Terminwunsch, Preisfrage (persönlich und schriftlich beantworten), akute Beschwerden (Hinweis auf die Telefonnummer der Praxis). Keine Diagnosen per Direktnachricht — „Das schauen wir uns beim Termin an“ ist die sichere Antwort.",
        ],
      },
      {
        heading: "Die Verantwortung bleibt in der Praxis",
        paragraphs: [
          "Wer auch immer den Inhalt erstellt: Er erscheint im Namen der Praxis. Mahnt ein Wettbewerbsverband einen Agentur-Post wegen eines unzulässigen Rabatts ab, ist die Praxis Adressat; Berufsrechtliches betrifft ohnehin die Zahnärztin persönlich. Legen Sie deshalb schriftlich fest, dass nichts ohne Freigabe online geht. Die [Checkliste im HWG-Ratgeber](guide:heilmittelwerbegesetz-zahnarzt-social-media) eignet sich als Grundlage für diese Freigabe.",
        ],
      },
      {
        heading: "Woran Sie Angebote vergleichen",
        paragraphs: ["Pakete umfassen unterschiedliche Leistungen und lassen sich schlecht direkt vergleichen. Bewerten Sie stattdessen nach denselben Kriterien:"],
        list: [
          "Wie viele Beiträge pro Woche kommen tatsächlich veröffentlichungsreif an?",
          "Wie viel Zeit kostet die Zahnärztin die Freigabe — nur ansehen oder jedes Mal umschreiben?",
          "Wer prüft fachliche Richtigkeit und Werberecht vor der Freigabe?",
          "Klingt der Inhalt nach Ihrer Praxis oder nach einer Vorlage, die viele Praxen bekommen?",
          "Was passiert mit Konten und Material beim Wechsel?",
        ],
        after: [
          "Eine Testphase zeigt die Antworten am schnellsten. Achten Sie besonders darauf, ob der Freigabeaufwand sinkt. Muss jeder Beitrag neu geschrieben werden, ist auch ein günstiges Angebot teuer.",
        ],
      },
      {
        heading: "Ein Wochenablauf, der funktioniert",
        paragraphs: [],
        list: [
          "Montag: Themen der Woche festlegen (Patientenfragen, Saison, Leistungen der Praxis).",
          "Dienstag: Videos und Texte entstehen; falls geplant, nimmt die Zahnärztin fünf Minuten auf.",
          "Mittwoch: Die Zahnärztin sieht jeden Beitrag an, gibt frei oder bittet um Änderung.",
          "Donnerstag und Freitag: Freigegebenes wird gepostet, Nachrichten beantwortet das Team.",
          "Monatsende: Was wurde gesehen, welche Fragen kamen? Das fließt in den nächsten Monat ein.",
        ],
        ordered: true,
      },
      {
        heading: "Das Mischmodell: für viele Praxen realistisch",
        paragraphs: [
          "Für viele Praxen trägt ein Mischmodell am längsten: Regelmäßige Aufklärungsvideos kommen aus einem Tool oder von außen, die Zahnärztin ergänzt ein- bis zweimal im Monat eine kurze eigene Aufnahme, und das Team beantwortet Nachrichten und postet. So bleibt das Profil aktiv, klingt nach der Praxis, und niemand steht jede Woche unter Druck. Themen dafür liefern die [Social-Media-Ideen](guide:social-media-zahnarztpraxis-ideen).",
          "[DentVideo](landing:) ist eine Software für den Inhaltsteil: Sie erstellt jede Woche fünf kurze Aufklärungsvideos, prüft jedes Skript auf fachliche Richtigkeit und Werberecht und schneidet Ihre eigenen Aufnahmen in untertitelte Clips. Posten und Nachrichten bleiben bei Ihnen oder Ihrer Agentur — DentVideo veröffentlicht nichts selbst. [Die erste Woche ist kostenlos](start:).",
        ],
      },
    ],
    faq: [
      { q: "Lohnt sich eine Social-Media-Agentur für Zahnärzte?", a: "Eine Agentur spart Zeit, kann aber riskant sein, wenn sie das Werberecht im Gesundheitswesen nicht kennt. Entscheidend ist eine verbindliche Freigabe durch die Zahnärztin vor jedem Post." },
      { q: "Wer haftet für Fehler der Agentur?", a: "Gegenüber Wettbewerbern und Kammer steht in der Regel die Praxis bzw. die Zahnärztin in der Verantwortung. Regeln Sie Freigabe und Haftung im Vertrag." },
      { q: "Reicht eine Software für Social Media?", a: "Für die regelmäßige Erstellung von Inhalten kann sie reichen. Nachrichten beantworten und die letzte Prüfung bleiben aber Aufgaben der Praxis." },
      { q: "Wie viel Zeit sollte die Zahnärztin pro Woche einplanen?", a: "Für die Freigabe reicht oft eine feste Viertelstunde pro Woche, wenn die Inhalte vorab sorgfältig geprüft sind. Wer selbst spricht, plant zusätzlich etwa fünf Minuten Aufnahme ein." },
      { q: "Wem sollten die Social-Media-Konten gehören?", a: "Immer der Praxis. Vergeben Sie Zugriffe über Rollen statt über persönliche Zugangsdaten, damit Sie bei einem Wechsel nicht den Zugang verlieren." },
      { q: "Darf eine Mitarbeiterin auf Nachrichten medizinisch antworten?", a: "Besser nicht. Statt einer Ferndiagnose verweist sie auf einen Termin oder die Telefonnummer der Praxis; bei Beschwerden zählt die Untersuchung." },
    ],
    sources: [HWG, UWG, BZAEK, DSGVO],
  },
];
