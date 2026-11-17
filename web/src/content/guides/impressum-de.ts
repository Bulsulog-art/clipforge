import type { Guide } from "../dentvideo";

// Impressum für Social-Media-Profile von Zahnarztpraxen (Deutschland).
// § 5 DDG am 2026-11-17 im Wortlaut geprüft (Fassung ab 19.02.2026); Kammer-Merkblatt
// LZK BW (05/2024); BGH I ZR 228/03 im Volltext gelesen. Keine Bußgeldbeträge nennen.

const DDG5 = { label: "§ 5 Digitale-Dienste-Gesetz (DDG) — Allgemeine Informationspflichten (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/ddg/__5.html" };
const LZK_BW = { label: "Landeszahnärztekammer Baden-Württemberg — Merkblatt Pflichtangaben im Internet für Zahnärzte (PDF, Stand 05/2024)", url: "https://lzk-bw.de/fileadmin/user_upload/user_upload/Pflichtangaben_Internet.pdf" };
const BGH_2006 = { label: "BGH, Urteil vom 20. Juli 2006, I ZR 228/03 — Anbieterkennzeichnung im Internet (Volltext bei lexetius.com)", url: "https://lexetius.com/2006,2487" };
const EU_ODR = { label: "Verordnung (EU) 2024/3228 — Aufhebung der Verordnung über Online-Streitbeilegung (EUR-Lex)", url: "https://eur-lex.europa.eu/eli/reg/2024/3228/oj" };
const BZAEK = { label: "Bundeszahnärztekammer — Musterberufsordnung (MBO-Z), Abschnitt „Berufliche Kommunikation“ (§§ 20–22)", url: "https://www.bzaek.de/recht/musterberufsordnung/berufliche-kommunikation.html" };
const ZM_2026 = { label: "zm-online — Diese Abmahnrisiken verstecken sich auf der Praxis-Website (zm 11/2026)", url: "https://www.zm-online.de/artikel/2026/zm-2026-11/diese-abmahnrisiken-verstecken-sich-auf-der-praxis-website" };

export const IMPRESSUM_DE: Guide = {
  locale: "de",
  slug: "impressum-instagram-zahnarztpraxis",
  category: "rules",
  published: "2026-11-17",
  updated: "2026-11-17",
  reviewed: "2026-11-17",
  title: "Impressum auf Instagram für Zahnarztpraxen: Pflichtangaben und wo der Link hingehört",
  seoTitle: "Impressum auf Instagram für Zahnarztpraxen",
  seoDescription: "Braucht das Praxisprofil ein Impressum? Pflichtangaben nach § 5 DDG für Zahnärzte, Kammer und Berufsordnung, Link in der Bio und eine Checkliste.",
  description: "Impressumspflicht für Instagram, Facebook und TikTok der Zahnarztpraxis: Pflichtangaben nach § 5 DDG, Kammer, Berufsbezeichnung, berufsrechtliche Regelungen, Platzierung des Links und Checkliste.",
  h1: "Impressum auf Instagram: was Zahnarztpraxen angeben müssen",
  intro:
    "Ein Instagram-Profil, das eine Zahnarztpraxis geschäftlich nutzt, braucht in Deutschland ein Impressum nach § 5 Digitale-Dienste-Gesetz (DDG). Es muss leicht erkennbar, unmittelbar erreichbar und ständig verfügbar sein. Üblich ist ein klar mit „Impressum“ beschrifteter Link im Profil, der auf das Impressum der Praxis-Website führt. Zahnärzte müssen dort zusätzlich Kammer, Berufsbezeichnung, den verleihenden Staat und die berufsrechtlichen Regelungen nennen.",
  sections: [
    {
      heading: "Braucht das Instagram-Profil einer Zahnarztpraxis ein Impressum?",
      paragraphs: [
        "Ja, wenn die Praxis das Profil geschäftlich nutzt. § 5 DDG verpflichtet Anbieter „geschäftsmäßiger, in der Regel gegen Entgelt angebotener digitaler Dienste“, bestimmte Informationen bereitzuhalten. Das DDG hat im Mai 2024 das Telemediengesetz abgelöst; die Impressumspflicht aus § 5 TMG steht seitdem inhaltlich weitgehend gleich in § 5 DDG. Ältere Merkblätter, die noch vom TMG sprechen, sind deshalb nicht falsch, zitieren aber die alte Vorschrift.",
        "Gerichte haben schon vor Jahren entschieden, dass auch Unternehmensauftritte in sozialen Netzwerken eine eigene Anbieterkennzeichnung brauchen, wenn sie zu Marketingzwecken genutzt werden. Für eine Praxis, die auf Instagram, Facebook, TikTok oder YouTube über ihre Leistungen informiert, Termine anbietet oder auf ihre Website verweist, ist das der Regelfall. Ein rein privates Profil der Zahnärztin ohne Praxisbezug fällt nicht darunter; sobald dort aber regelmäßig Praxisinhalte erscheinen, verschwimmt die Grenze.",
      ],
    },
    {
      heading: "Welche Pflichtangaben gelten für Zahnärzte?",
      paragraphs: [
        "Neben den allgemeinen Angaben verlangt § 5 Abs. 1 Nr. 5 DDG für reglementierte Berufe wie den Zahnarztberuf zusätzliche Informationen. Das Merkblatt der Landeszahnärztekammer Baden-Württemberg fasst sie für Zahnärzte zusammen; andere Kammern geben vergleichbare Hinweise:",
      ],
      table: {
        caption: "Pflichtangaben im Impressum einer Zahnarztpraxis",
        columns: ["Angabe", "Was konkret", "Grundlage"],
        rows: [
          ["Name und Anschrift", "Praxisname, Vor- und Nachname der Inhaberin oder des Inhabers; bei Gesellschaften Rechtsform und Vertretungsberechtigte; ladungsfähige Anschrift (kein Postfach)", "§ 5 Abs. 1 Nr. 1 DDG"],
          ["Schnelle Kontaktaufnahme", "E-Mail-Adresse und ein weiterer schneller Kontaktweg, in der Regel die Telefonnummer", "§ 5 Abs. 1 Nr. 2 DDG"],
          ["Aufsichtsbehörde", "Nach dem Merkblatt der LZK BW: Kammer, bei Vertragszahnärzten die Kassenzahnärztliche Vereinigung und je nach Land eine staatliche Behörde. Fragen Sie Ihre Kammer, wer in Ihrem Land zu nennen ist", "§ 5 Abs. 1 Nr. 3 DDG"],
          ["Register", "Partnerschaftsregister bei einer PartG, Handelsregister bei einer GmbH (z. B. MVZ), jeweils mit Registernummer", "§ 5 Abs. 1 Nr. 4 DDG"],
          ["Kammer", "Die zuständige Landeszahnärztekammer mit Anschrift", "§ 5 Abs. 1 Nr. 5 a DDG"],
          ["Berufsbezeichnung und Staat", "„Zahnärztin“ oder „Zahnarzt“ und der Staat, in dem die Approbation erteilt wurde", "§ 5 Abs. 1 Nr. 5 b DDG"],
          ["Berufsrechtliche Regelungen", "Zum Beispiel Zahnheilkundegesetz, Heilberufe-Kammergesetz des Landes, Berufsordnung der Kammer, GOZ, mit Link, wo sie abrufbar sind", "§ 5 Abs. 1 Nr. 5 c DDG"],
          ["Umsatzsteuer-ID oder Wirtschafts-ID", "Nur wenn vorhanden; niemals die normale Steuernummer", "§ 5 Abs. 1 Nr. 6 DDG"],
        ],
        note: "Die Aufzählung ersetzt nicht den Gesetzestext und das Merkblatt Ihrer eigenen Kammer.",
      },
      after: [
        "Ein häufiger Fehler, auf den die Fachpresse hinweist: Statt der Umsatzsteuer-Identifikationsnummer wird die Steuernummer veröffentlicht. Viele Zahnarztpraxen haben gar keine USt-ID, weil zahnärztliche Heilbehandlungen umsatzsteuerfrei sind; dann entfällt die Angabe.",
      ],
    },
    {
      heading: "Wo gehört der Impressum-Link auf Instagram hin?",
      paragraphs: [
        "Das Gesetz verlangt, dass die Angaben leicht erkennbar und unmittelbar erreichbar sind. Der Bundesgerichtshof hat 2006 entschieden, dass zwei Klicks über verständlich beschriftete Links wie „Kontakt“ und „Impressum“ genügen können (Urteil vom 20. Juli 2006, I ZR 228/03). Eine höchstrichterliche Entscheidung speziell zu Instagram ist uns nicht bekannt; die verbreitete Praxis orientiert sich an diesem Maßstab:",
      ],
      list: [
        "Schreiben Sie das Wort „Impressum“ sichtbar in die Profilbeschreibung (Bio) und setzen Sie den Link direkt auf die Impressumsseite der Praxis-Website, nicht nur auf die Startseite.",
        "Nutzen Sie mehrere Profil-Links oder eine Link-Seite, dann gehört „Impressum“ als eigener, klar beschrifteter Eintrag dazu, ohne Scrollen auffindbar.",
        "Prüfen Sie auf dem Smartphone, ob ein Besucher vom Profil aus in höchstens zwei Schritten beim Impressum ankommt.",
        "Wiederholen Sie das für jedes Netzwerk: Facebook-Seite, TikTok, YouTube, LinkedIn und das Google-Unternehmensprofil der Praxis.",
        "Halten Sie die verlinkte Seite aktuell: Ein Inhaberwechsel, eine neue Partnerin oder ein Umzug muss auch dort ankommen.",
      ],
    },
    {
      heading: "Was ist veraltet und kann raus?",
      paragraphs: [
        "Viele Praxis-Impressen enthalten noch einen Hinweis auf die EU-Plattform zur Online-Streitbeilegung. Diese Plattform wurde zum 20. Juli 2025 eingestellt, die zugrunde liegende Verordnung durch die Verordnung (EU) 2024/3228 aufgehoben. Der Link führt ins Leere und kann entfernt werden. Wer wegen eines fehlenden OS-Links früher eine Unterlassungserklärung abgegeben hat, sollte vor dem Löschen anwaltlich klären, wie mit ihr umzugehen ist.",
        "Unabhängig davon bleibt die Pflicht aus § 36 Verbraucherstreitbeilegungsgesetz für Praxen, die am 31. Dezember des Vorjahres mehr als zehn Personen beschäftigt haben: Sie müssen angeben, ob sie an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilnehmen. Pauschale Haftungsausschlüsse für Links („Disclaimer“) bringen nach Einschätzung der Fachpresse in der Regel keinen Vorteil und können entfallen.",
      ],
    },
    {
      heading: "Gilt zusätzlich der Medienstaatsvertrag?",
      paragraphs: [
        "Wer journalistisch-redaktionell gestaltete Inhalte anbietet, muss nach § 18 Abs. 2 Medienstaatsvertrag zusätzlich eine verantwortliche Person mit Namen und Anschrift nennen. Ob regelmäßige Aufklärungsbeiträge einer Praxis darunter fallen, ist eine Frage des Einzelfalls. Viele Praxen nennen vorsorglich die Praxisinhaberin als „Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV“. Das kostet nichts und schadet nicht.",
        "Neben dem Impressum braucht ein Praxisprofil auch Datenschutzhinweise. Der Europäische Gerichtshof hat 2018 entschieden, dass der Betreiber einer Facebook-Fanpage gemeinsam mit dem Netzwerk für die Datenverarbeitung verantwortlich sein kann (Rechtssache C-210/16). Verlinken Sie deshalb neben dem Impressum auch die Datenschutzerklärung der Praxis, die die Social-Media-Profile ausdrücklich erwähnt.",
      ],
    },
    {
      heading: "Was droht bei einem fehlenden oder falschen Impressum?",
      paragraphs: [
        "Ein fehlendes oder unvollständiges Impressum ist eine Ordnungswidrigkeit nach den Bußgeldvorschriften des DDG. Praktisch häufiger sind Abmahnungen: Fehlende Pflichtangaben können ein Wettbewerbsverstoß sein, den Mitbewerber oder Verbände geltend machen. Hinzu kommt die berufsrechtliche Seite: Die Musterberufsordnung erlaubt sachliche, berufsbezogene Information, und die Kammern achten auch auf korrekte Berufsbezeichnungen und Titel.",
        "Das Impressum ist dabei nur der formale Teil. Was Sie inhaltlich posten dürfen, regeln vor allem das Heilmittelwerbegesetz und die Berufsordnung; dazu unser [Ratgeber zum Heilmittelwerbegesetz in Social Media](guide:heilmittelwerbegesetz-zahnarzt-social-media). Ob ein einzelner Satz in Bio, Beitrag oder Anzeige riskant ist, zeigt Ihnen unser kostenloser [Werbe-Check „Ist mein Post erlaubt?“](checker:) mit dem Markt Deutschland: Er markiert jeden Satz und schlägt eine ruhigere Formulierung vor. Das ist keine Rechtsberatung.",
      ],
    },
    {
      heading: "Checkliste für das Praxisprofil",
      paragraphs: ["Gehen Sie diese Punkte einmal für jedes Netzwerk durch und wiederholen Sie die Prüfung nach jeder Änderung in der Praxis:"],
      list: [
        "Steht „Impressum“ sichtbar in der Bio oder in den Profil-Links?",
        "Führt der Link direkt auf die Impressumsseite, erreichbar in höchstens zwei Schritten?",
        "Sind Name, Anschrift, E-Mail und Telefon vollständig und aktuell?",
        "Sind Kammer, Berufsbezeichnung, verleihender Staat und berufsrechtliche Regelungen mit Link genannt?",
        "Ist bei einer PartG oder GmbH das Register mit Nummer angegeben?",
        "Steht dort keine Steuernummer und, falls vorhanden, die richtige USt-ID?",
        "Ist der Hinweis auf die eingestellte OS-Plattform entfernt?",
        "Ist die Datenschutzerklärung verlinkt und erwähnt sie die Social-Media-Profile?",
      ],
    },
    {
      heading: "Wie bleibt das Profil danach lebendig?",
      paragraphs: [
        "Ein korrektes Impressum ist die Pflicht; die Kür sind Beiträge, die Patientinnen und Patienten wirklich weiterhelfen. Themen, die mit HWG und Berufsordnung gut vereinbar sind, finden Sie in den [Social-Media-Ideen für Zahnarztpraxen](guide:social-media-zahnarztpraxis-ideen). [DentVideo](landing:) erstellt jede Woche fünf kurze Aufklärungsvideos im Logo und in den Farben Ihrer Praxis und prüft jedes Skript auf fachliche Richtigkeit und typische Werbeverbote; veröffentlicht wird nur, was Sie freigeben, und zwar von Ihrem eigenen Profil.",
      ],
    },
  ],
  faq: [
    { q: "Reicht ein Link auf die Website im Instagram-Profil?", a: "Nur wenn er klar als Impressum erkennbar ist und schnell zum Impressum führt. Sicherer ist ein Link direkt auf die Impressumsseite und das Wort „Impressum“ sichtbar in der Bio." },
    { q: "Muss ich das ganze Impressum in die Bio schreiben?", a: "Nein. Ein klar beschrifteter Link auf eine vollständige Impressumsseite ist üblich und nach dem Maßstab des BGH (zwei Klicks) in der Regel ausreichend." },
    { q: "Braucht auch das private Profil der Zahnärztin ein Impressum?", a: "Ein rein privates Profil nicht. Werden dort aber regelmäßig Praxisinhalte gepostet oder Termine beworben, wird es geschäftlich genutzt, und dann gilt die Impressumspflicht." },
    { q: "Welche Kammer gehört ins Impressum?", a: "Die Landeszahnärztekammer, der Sie angehören, mit Anschrift. Bei Vertragszahnärzten nennen viele Kammer-Merkblätter zusätzlich die Kassenzahnärztliche Vereinigung als Aufsichtsbehörde." },
    { q: "Muss die Steuernummer ins Impressum?", a: "Nein. Anzugeben ist nur eine vorhandene Umsatzsteuer-Identifikationsnummer oder Wirtschafts-Identifikationsnummer. Die normale Steuernummer gehört nicht ins Impressum." },
    { q: "Ist dieser Ratgeber Rechtsberatung?", a: "Nein. Er gibt einen allgemeinen Überblick. Für Ihre Praxis sind das Merkblatt Ihrer Kammer und im Zweifel eine Fachanwältin für Medizin- oder IT-Recht maßgeblich." },
  ],
  sources: [DDG5, LZK_BW, BGH_2006, EU_ODR, BZAEK, ZM_2026],
};
