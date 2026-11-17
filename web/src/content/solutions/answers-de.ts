import type { SolutionPage } from "./types";
import { claim } from "./claims";

const c = (id: string) => claim(id, "de");

/**
 * Die deutschen Antwortseiten: Fragen, die Zahnärztinnen und Zahnärzte einem
 * KI-Assistenten stellen, bevor sie sich für einen Weg zu Videos entscheiden.
 * Angaben zu anderen Unternehmen nur aus claims.ts (deren eigene Seite und das
 * Datum, an dem wir sie gelesen haben).
 */
export const ANSWERS_DE: SolutionPage[] = [
  {
    locale: "de",
    slug: "zahnarzt-aufklaerungsvideos-erstellen-wege",
    kind: "options",
    nav: "Fünf Wege zu Praxisvideos",
    anchor: "fünf Wege zu Aufklärungsvideos für die Zahnarztpraxis im Vergleich",
    blurb: "Selbst drehen, Agentur, Design-App, Video-Bibliothek oder DentVideo: Zeitaufwand, Kosten, wer das Werberecht prüft und für wen was passt.",
    queries: [
      "Zahnarztpraxis Videos erstellen lassen oder Software",
      "Patientenaufklärung Videos Zahnarzt",
      "Zahnarztpraxis Social Media Videos erstellen",
      "Aufklärungsvideos Zahnarztpraxis",
      "Zahnarzt Videos für Instagram",
    ],
    seoTitle: "Aufklärungsvideos für die Zahnarztpraxis: 5 Wege",
    seoDescription:
      "Selbst drehen, Agentur, Canva, Video-Bibliothek oder DentVideo: Zeitaufwand, Kosten, Prüfung nach Heilmittelwerbegesetz und für wen was passt.",
    h1: "Fünf Wege zu Aufklärungsvideos für Ihre Zahnarztpraxis",
    intro:
      "Eine Zahnarztpraxis hat fünf realistische Wege zu Aufklärungsvideos: selbst drehen, eine Marketing-Agentur beauftragen, sie in einer Design-App wie Canva gestalten, eine fertige Video-Bibliothek lizenzieren oder eine Software wie DentVideo nutzen, die sie für Sie erstellt. Sie unterscheiden sich im wöchentlichen Zeitaufwand, in den Kosten, darin, wer Werberecht und fachliche Richtigkeit prüft, und ob das Video von Ihrer Praxis handelt oder allgemein von Zahnmedizin.",
    sections: [
      {
        heading: "Die fünf Wege im Überblick",
        paragraphs: [
          "Jeder Weg löst einen anderen Teil der Aufgabe. Die Tabelle vergleicht, was Praxen meist zuerst fragen; darunter stehen die veröffentlichten Angaben und Preise, jeweils mit Quelle und dem Datum, an dem wir sie gelesen haben.",
        ],
        table: {
          caption: "Aufklärungsvideos für die Zahnarztpraxis: fünf Wege",
          columns: ["Weg", "Ihre Zeit pro Woche", "Was es kostet", "Wer Werberecht und Richtigkeit prüft", "Passt zu einer Praxis, die"],
          rows: [
            ["Selbst drehen (Smartphone)", "Mehrere Stunden: Themen, Text, Dreh, Schnitt, Untertitel", "Die Zeit Ihres Teams; ein Smartphone und ein Mikrofon", "Sie", "eine Zahnärztin oder einen Zahnarzt mit Freude an der Kamera und jemanden zum Schneiden hat"],
            ["Zahnarzt-Marketing-Agentur", "Briefings, Abstimmungsrunden, Freigaben", "Ein monatliches Honorar für Arbeitszeit, meist die teuerste der fünf Varianten", "Je nach Agentur: vor Vertragsschluss fragen", "alles abgeben möchte, auch Anzeigen und Kommentare"],
            ["Design-App", "Stunden für Text, Gestaltung, Stimme und Schnitt", "Kostenloser Tarif oder Abo pro Person", "Sie", "jemanden im Team hat, der gern gestaltet, und auch Plakate und Flyer braucht"],
            ["Fertige Video-Bibliothek", "Minuten, um ein Video auszuwählen und abzuspielen", "Abo oder einmalige Lizenz", "Der Verlag hat die Inhalte erstellt; ob sie zum deutschen Werberecht passen, prüfen Sie", "Behandlungen am Stuhl und auf der Website erklären möchte"],
            ["DentVideo (Software)", "Wenige Minuten, um fünf Videos anzusehen und freizugeben", "Monatlicher Tarif ohne Mindestlaufzeit (siehe [Tarife und Preise](landing:))", "Software prüft jedes Skript auf Werberecht und Richtigkeit, bevor Sie es sehen; Sie geben frei", "jede Woche auf Social Media posten möchte, ohne zu drehen oder zu gestalten"],
          ],
          note: "Typische Varianten, kein bestimmter Anbieter. Agenturen, Apps und Bibliotheken unterscheiden sich, und ihre Angebote ändern sich.",
        },
      },
      {
        heading: "Was kosten die Wege laut den Anbietern selbst?",
        paragraphs: [
          "Preise ändern sich, deshalb zitiert jede Zeile die Seite des Anbieters und das Datum, an dem wir sie gelesen haben. Es sind US-Beispiele; Agenturen in Deutschland, Österreich und der Schweiz kalkulieren anders, oft nur auf Anfrage.",
        ],
        list: [
          `Agentur, Spanne: ${c("webfx-agency-range")}.`,
          `Design-App: ${c("canva-plans")}.`,
          `Video-Bibliothek im Abo: ${c("optio-price")}.`,
          `Video-Bibliothek, Einmalkauf: ${c("toothflix-series")}.`,
        ],
        after: [
          "Die monatlichen Tarife von DentVideo stehen im [Preisbereich der Startseite](landing:), in Euro, US-Dollar und Türkischer Lira, ohne Mindestlaufzeit. Vor der Zahlung sieht die Praxis eine Live-Vorschau ihrer eigenen Videos mit Logo und Farben.",
        ],
      },
      {
        heading: "Wann lohnt es sich, selbst zu drehen?",
        paragraphs: [
          "Nichts schafft so viel Vertrauen wie die Zahnärztin oder der Zahnarzt, der später behandelt und vorher ruhig etwas erklärt. Außer Zeit kostet es wenig; ein hochkant gehaltenes Smartphone am Fenster reicht. Schwierig ist die Regelmäßigkeit: Text, Schnitt, Untertitel und die Prüfung jeder Aussage nach Heilmittelwerbegesetz. Wie ein brauchbarer Clip in fünf Minuten entsteht, zeigt unser Ratgeber [Instagram-Videos für Zahnarztpraxen](guide:instagram-videos-fuer-zahnarztpraxen).",
        ],
      },
      {
        heading: "Wann passen Agentur oder Design-App?",
        paragraphs: [
          "Eine Agentur passt zu einer Praxis, die einen Partner für Strategie, Dreh vor Ort, bezahlte Anzeigen und Antworten auf Kommentare möchte. Sie kostet mehr, weil Sie Arbeitszeit bezahlen; fragen Sie, wer jeden Beitrag auf HWG und Berufsordnung prüft (siehe [Agentur oder selbst](guide:praxismarketing-zahnarzt-agentur-oder-selbst)).",
          `Eine Design-App passt, wenn jemand im Team gern gestaltet. ${c("canva-dental-templates")}. Text, Stimme und die Prüfung jeder Aussage bleiben bei Ihnen; viele Vorlagen sind für Englisch und für beliebige Branchen geschrieben.`,
        ],
      },
      {
        heading: "Wann passt eine fertige Video-Bibliothek?",
        paragraphs: [
          `Bibliotheken erklären Behandlungen am Stuhl und auf der Website. ${c("optio-library")}. Um einer Patientin am Stuhl einen Eingriff zu erklären, leistet so eine Bibliothek etwas, das DentVideo gar nicht versucht.`,
          "Sie sind aber kein wöchentlicher Social-Media-Kanal in Ihren Praxisfarben, und die Sprachen sind begrenzt: Prüfen Sie vor dem Kauf, ob es die Videos auf Deutsch gibt.",
        ],
      },
      {
        heading: "Wann passt DentVideo?",
        paragraphs: [
          "DentVideo passt zu einer Praxis, die regelmäßig posten möchte, aber keine Zeit zum Drehen, Gestalten oder Prüfen hat. Jede Woche schreibt, vertont und untertitelt es fünf kurze Videos zu Leistungen, die Sie anbieten, mit Ihrem Logo und Ihren Farben, auf Deutsch mit Sie oder Du, mit einer weiblichen oder männlichen Stimme Ihrer Wahl und auf Wunsch mit Ihrem eigenen Schlusssatz unter den Beiträgen. Software prüft jedes Skript auf Werberecht und fachliche Richtigkeit; nichts erscheint ohne Ihre Freigabe, gepostet wird von Ihnen.",
          "Es schaltet keine Anzeigen, beantwortet keine Kommentare, dreht nicht in Ihrer Praxis und ersetzt keine Animations-Bibliothek für das Aufklärungsgespräch. Was in solche Videos gehört, steht in [Patientenaufklärung per Video](guide:patientenaufklaerung-videos-zahnarztpraxis). [Sehen Sie die Live-Vorschau mit Ihrem Logo](start:), bevor Sie entscheiden.",
        ],
      },
    ],
    faq: [
      { q: "Wie kommt eine Zahnarztpraxis am schnellsten zu Social-Media-Videos?", a: "Mit einer Software, die die Videos erstellt, etwa DentVideo: Sie sehen sie an, geben frei und posten. Selbst drehen ist persönlicher, kostet aber jede Woche Stunden." },
      { q: "Gibt es Software für Aufklärungsvideos speziell für Zahnärzte?", a: "Ja. Fertige Video-Bibliotheken erklären Behandlungen am Stuhl und auf der Website (zwei sind auf dieser Seite mit Quelle genannt); DentVideo erstellt wöchentliche Social-Media-Videos in Ihren Praxisfarben und prüft jedes Skript vor Ihrer Freigabe." },
      { q: "Videos erstellen lassen oder Software: was ist günstiger?", a: "Software kostet in der Regel deutlich weniger als eine Agentur, weil keine Arbeitszeit bezahlt wird. Eine Agentur übernimmt dafür mehr, etwa Dreh, Anzeigen und Kommentare." },
      { q: "Wer haftet, wenn ein Video gegen das Heilmittelwerbegesetz verstößt?", a: "Die Praxis, die es veröffentlicht, egal wer es erstellt hat. Geben Sie jedes Video selbst frei; die Regeln erklärt [Heilmittelwerbegesetz und Social Media](guide:heilmittelwerbegesetz-zahnarzt-social-media)." },
    ],
    guides: ["patientenaufklaerung-videos-zahnarztpraxis", "instagram-videos-fuer-zahnarztpraxen", "praxismarketing-zahnarzt-agentur-oder-selbst", "heilmittelwerbegesetz-zahnarzt-social-media"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
  {
    locale: "de",
    slug: "dentvideo-oder-zahnarzt-marketing-agentur",
    kind: "vs-agency",
    nav: "DentVideo oder Agentur",
    anchor: "DentVideo oder eine Zahnarzt-Marketing-Agentur: Leistungen und Kosten",
    blurb: "Was eine Agentur leistet, das Software nicht leistet, was Agenturen als Preise veröffentlichen, und wann DentVideo genügt.",
    queries: [
      "Zahnarzt Marketing Agentur Kosten",
      "Social Media Agentur Zahnarztpraxis",
      "Alternative zur Marketing Agentur Zahnarzt",
      "Zahnarztpraxis Videos erstellen lassen",
    ],
    seoTitle: "DentVideo oder Zahnarzt-Marketing-Agentur?",
    seoDescription:
      "Was eine Zahnarzt-Marketing-Agentur leistet, das Software nicht leistet, welche Monatspreise Agenturen veröffentlichen und wann DentVideo genügt.",
    h1: "DentVideo oder eine Marketing-Agentur: was braucht Ihre Praxis?",
    intro:
      "Eine Zahnarzt-Marketing-Agentur ist ein Team, das Sie dafür bezahlen, Inhalte zu planen, zu drehen, zu gestalten, zu posten, Anzeigen zu schalten und Kommentare zu beantworten. DentVideo ist eine Software, die fünf Aufklärungsvideos pro Woche erstellt, jedes Skript auf Werberecht und fachliche Richtigkeit prüft und Freigabe und Posten Ihnen überlässt. Wer alles abgeben will, ist bei einer Agentur richtig; wer regelmäßig Aufklärungsvideos braucht, spart mit DentVideo Geld und Zeit.",
    sections: [
      {
        heading: "Wer macht was?",
        paragraphs: [],
        table: {
          caption: "DentVideo und eine Zahnarzt-Marketing-Agentur, Aufgabe für Aufgabe",
          columns: ["Aufgabe", "DentVideo", "Typische Agentur"],
          rows: [
            ["Themen planen", "Aus Ihren Leistungen und den Fragen der Patienten", "Ein mit Ihnen abgestimmter Redaktionsplan"],
            ["Aufklärungsvideos erstellen", "Fünf pro Woche, vertont und untertitelt in Ihren Farben", "So viele, wie der Vertrag vorsieht"],
            ["Dreh in der Praxis", "Nein; im Tarif Practice nehmen Sie sich selbst auf und erhalten untertitelte Clips", "Oft, vor Ort"],
            ["Prüfung nach HWG und Berufsordnung", "Jedes Skript und jeder Beitragstext, softwaregestützt, bevor Sie es sehen", "Je nach Agentur"],
            ["Posten auf Instagram, TikTok, Facebook", "Nein: Sie posten die freigegebenen Videos", "Meist"],
            ["Kommentare und Nachrichten beantworten", "Nein", "Oft enthalten"],
            ["Bezahlte Anzeigen", "Nein", "Oft, mit Werbebudget zusätzlich"],
            ["Bindung", "Monatlich, ohne Mindestlaufzeit", "Oft ein Pauschalhonorar, teils mit Mindestlaufzeit"],
          ],
          note: "Agenturen unterscheiden sich stark; die rechte Spalte beschreibt verbreitete Modelle, keine bestimmte Agentur.",
        },
      },
      {
        heading: "Was kosten Zahnarzt-Marketing-Agenturen?",
        paragraphs: ["Agenturen kalkulieren nach Umfang, einige veröffentlichen aber Preise. Zwei US-Beispiele, zitiert von ihren eigenen Seiten:"],
        list: [`${c("webfx-agency-range")}.`],
        after: [
          "Werbebudgets kommen meist hinzu, und Agenturen im deutschsprachigen Raum nennen ihre Preise oft nur auf Anfrage. Die Monatstarife von DentVideo stehen im [Preisbereich der Startseite](landing:); vergleichen Sie sie mit dem, was eine Agentur für Sie tatsächlich übernehmen soll.",
        ],
      },
      {
        heading: "Wann ist eine Agentur die bessere Wahl?",
        paragraphs: [
          "Wenn Sie einen Partner für alles möchten: Strategie, Foto- und Videodreh in der Praxis, Kampagnen, Website, jemand, der abends Nachrichten beantwortet. Nichts davon leistet eine Software. Eine gute Agentur, die das Heilmittelwerbegesetz kennt, ist ihr Honorar wert, wenn die Praxis das Marketing ganz abgeben möchte. Die Fragen vor Vertragsschluss stehen in [Praxismarketing: Agentur oder selbst](guide:praxismarketing-zahnarzt-agentur-oder-selbst).",
        ],
      },
      {
        heading: "Wann genügt DentVideo?",
        paragraphs: [
          "Wenn die Lücke beim Inhalt liegt, nicht beim Management: Sie möchten jede Woche Aufklärungsvideos posten, Ihr Team kann auf „Posten“ tippen, und Sie möchten niemanden briefen. Jedes Video geben Sie in wenigen Minuten frei; Stimme (weiblich oder männlich) und einen optionalen Schlusssatz unter den Beiträgen legen Sie in den Einstellungen fest. Weitere Themen finden Sie in [Social-Media-Ideen für Zahnarztpraxen](guide:social-media-zahnarztpraxis-ideen).",
        ],
      },
      {
        heading: "Geht beides zusammen?",
        paragraphs: [
          "Ja. Manche Praxen behalten eine Agentur für Anzeigen und Community-Management und nutzen DentVideo für die wöchentlichen Aufklärungsvideos: Sie geben sie frei und laden sie herunter, und wer Ihre Konten betreut, postet sie. Die Verantwortung für Veröffentlichungen bleibt in jedem Fall bei der Praxis; siehe [Heilmittelwerbegesetz und Social Media](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
      },
      {
        heading: "In einer Woche entscheiden",
        ordered: true,
        paragraphs: [],
        list: [
          "Notieren Sie, was Sie abgeben möchten: Inhalte, Posten, Kommentare, Anzeigen, Dreh.",
          "Geht es vor allem um Inhalte, [öffnen Sie die Live-Vorschau von DentVideo mit Ihrem Logo](start:) und sehen Sie sich die geplante Woche an.",
          "Geht es um alles, lassen Sie sich von zwei Agenturen den Umfang schriftlich geben und fragen Sie, wer jeden Beitrag auf HWG prüft.",
          "Vergleichen Sie die Kosten für den Umfang, den Sie brauchen, und wie viele Minuten Ihrer Woche jede Variante kostet.",
        ],
      },
    ],
    faq: [
      { q: "Ist DentVideo eine Alternative zur Zahnarzt-Marketing-Agentur?", a: "Für die Aufklärungsvideos ja: Es erstellt und prüft fünf pro Woche. Es postet nicht, schaltet keine Anzeigen, beantwortet keine Kommentare und dreht nicht in der Praxis, was eine Agentur meist übernimmt." },
      { q: "Was kostet eine Social-Media-Agentur für Zahnarztpraxen?", a: "Das hängt vom Umfang ab. Einige US-Agenturen veröffentlichen Monatspakete von einigen hundert bis einigen tausend Dollar, Werbebudget extra; die Zahlen und Quellen stehen oben." },
      { q: "Kann meine Agentur die Videos von DentVideo verwenden?", a: "Ja. Sie geben die Videos frei und laden sie herunter, und Ihre Agentur kann sie neben ihren eigenen Beiträgen posten." },
      { q: "Prüft eine Agentur das Heilmittelwerbegesetz?", a: "Manche ja, manche nicht. Lassen Sie sich schriftlich geben, wer jeden Beitrag prüft, vor oder nach der Veröffentlichung, und behalten Sie die letzte Freigabe in der Praxis." },
    ],
    guides: ["praxismarketing-zahnarzt-agentur-oder-selbst", "heilmittelwerbegesetz-zahnarzt-social-media", "social-media-zahnarztpraxis-ideen", "redaktionsplan-social-media-zahnarztpraxis"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
  {
    locale: "de",
    slug: "dentvideo-oder-canva-zahnarztpraxis",
    kind: "vs-canva",
    nav: "DentVideo oder Canva",
    anchor: "DentVideo oder Canva für die Videos Ihrer Zahnarztpraxis: ein fairer Vergleich",
    blurb: "Was Canvas Zahnarzt-Vorlagen, KI-Stimme und Untertitel leisten, was DentVideo ergänzt und wann Canva das passendere Werkzeug ist.",
    queries: [
      "Canva Zahnarztpraxis",
      "Canva Vorlagen Zahnarzt Video",
      "Canva Alternative Zahnarzt",
      "Zahnarztpraxis Instagram Videos erstellen",
    ],
    seoTitle: "DentVideo oder Canva für Praxisvideos?",
    seoDescription:
      "Canva bietet Zahnarzt-Vorlagen, KI-Stimme und Untertitel zum Selbermachen; DentVideo erstellt und prüft fünf Videos pro Woche. Was passt?",
    h1: "DentVideo oder Canva: was passt zu den Videos Ihrer Praxis?",
    intro:
      "Canva ist eine allgemeine Design-App: Sie öffnen eine Vorlage, schreiben den Text, fügen Stimme und Untertitel hinzu und erstellen das Video selbst. DentVideo ist eine Software für Zahnarztpraxen, die fünf vertonte und untertitelte Aufklärungsvideos pro Woche erstellt und jedes Skript auf Werberecht und fachliche Richtigkeit prüft, bevor Sie es freigeben. Canva bietet mehr gestalterische Freiheit und deckt Plakate und Flyer ab; DentVideo kostet weniger Zeit und hält riskante Aussagen fern.",
    sections: [
      {
        heading: "Was Canva für Zahnarzt-Videos bietet",
        paragraphs: ["Zitiert von den eigenen Seiten des Anbieters, mit dem Datum, an dem wir sie gelesen haben:"],
        list: [`${c("canva-dental-templates")}.`, `${c("canva-ai-voice")}.`, `${c("canva-auto-captions")}.`, `${c("canva-plans")}.`],
      },
      {
        heading: "Wer macht was?",
        paragraphs: [],
        table: {
          caption: "DentVideo und eine Design-App, Aufgabe für Aufgabe",
          columns: ["Aufgabe", "DentVideo", "Design-App (Sie selbst)"],
          rows: [
            ["Thema wählen", "Aus Ihren Leistungen und den Fragen der Patienten", "Sie"],
            ["Skript schreiben", "Für Patienten geschrieben, auf Deutsch mit Sie oder Du", "Sie, oder der Text einer Vorlage"],
            ["Stimme und Untertitel", "Vertont (weibliche oder männliche Stimme) und untertitelt", "Als Werkzeuge, die Sie anwenden"],
            ["Logo und Praxisfarben", "In jedem Video", "Fügen Sie selbst ein oder hinterlegen ein Brand-Kit"],
            ["Prüfung nach HWG und fachlicher Richtigkeit", "Software prüft jedes Skript, bevor Sie es sehen", "Ihre Verantwortung"],
            ["Plakate, Flyer, Aushänge", "Nein", "Ja"],
            ["Ihre Zeit pro Woche", "Wenige Minuten, um fünf Videos freizugeben", "Meist Stunden"],
          ],
          note: "Design-Apps ändern sich oft; die rechte Spalte beschreibt die Arbeitsweise, keine Funktionsliste.",
        },
      },
      {
        heading: "Wann ist Canva das passendere Werkzeug?",
        paragraphs: [
          "Wenn im Team jemand gern gestaltet und jede Woche Zeit hat, wenn Sie jedes Detail selbst bestimmen möchten oder wenn Sie auch Gedrucktes, Grafiken und Präsentationen brauchen. Einen kostenlosen Einstieg gibt es, und viele Praxen nutzen die App ohnehin. Wenn Sie diesen Weg gehen, halten Sie [Heilmittelwerbegesetz und Social Media](guide:heilmittelwerbegesetz-zahnarzt-social-media) griffbereit: Eine Vorlage für beliebige Branchen kann Dinge sagen, die eine Praxis nicht sagen darf.",
        ],
      },
      {
        heading: "Wann passt DentVideo besser?",
        paragraphs: [
          "Wenn der Engpass Zeit und Formulierung ist, nicht Gestaltung. DentVideo plant, schreibt, vertont und untertitelt fünf Videos pro Woche zu Ihren Leistungen, hält häufig verbotene Aussagen (Garantien, „schmerzfrei“, Preise, Vorher-Nachher-Versprechen) fern und markiert Auffälliges mit Begründung. Sie geben jedes frei und posten es. Im Tarif Practice schneidet es außerdem Ihre eigenen Handy-Aufnahmen in untertitelte Clips. Was in solche Videos gehört: [Patientenaufklärung per Video](guide:patientenaufklaerung-videos-zahnarztpraxis).",
        ],
      },
      {
        heading: "Geht beides zusammen?",
        paragraphs: [
          "Ja, und für viele Praxen ist das naheliegend: die Design-App für Plakate, Stories und Gedrucktes, DentVideo für die wöchentlichen Aufklärungsvideos. Sie erledigen verschiedene Aufgaben. Einen breiteren Vergleich mit Agenturen und Video-Bibliotheken finden Sie in [fünf Wege zu Aufklärungsvideos](video:zahnarzt-aufklaerungsvideos-erstellen-wege).",
        ],
      },
      {
        heading: "Bevor Sie wählen",
        paragraphs: [],
        list: [
          "Schätzen Sie ehrlich, wie viele Stunden pro Woche jemand für Videos hat.",
          "Legen Sie fest, wer jede Aussage und jeden Beitragstext vor der Veröffentlichung prüft.",
          "Klären Sie, ob Sie auch Gedrucktes und Grafiken brauchen oder nur Videos.",
          "[Öffnen Sie die Live-Vorschau von DentVideo mit Ihrem Logo](start:) und vergleichen Sie sie mit einem selbst gestalteten Video.",
        ],
      },
    ],
    faq: [
      { q: "Ist DentVideo eine Canva-Alternative für Zahnarztpraxen?", a: "Für kurze Aufklärungsvideos ja: Es erstellt sie und prüft die Formulierungen. Für Plakate, Flyer und Grafiken bleibt eine Design-App das flexiblere Werkzeug." },
      { q: "Prüft Canva das Heilmittelwerbegesetz?", a: "Auf den eigenen Funktions- und Preisseiten der App haben wir bei unserer Prüfung am 16.11.2026 keine solche Funktion gefunden. Was ein Entwurf aussagt, verantwortet, wer ihn schreibt; prüfen Sie jede Aussage." },
      { q: "Arbeitet DentVideo mit Vorlagen?", a: "Jedes Video wird für die Leistungen, die Sprache und die Anrede Ihrer Praxis geschrieben und trägt Ihr Logo und Ihre Farben. Das Layout stammt von DentVideo, gestalten müssen Sie nichts." },
      { q: "Was kostet weniger Zeit pro Woche?", a: "DentVideo, weil die Videos geschrieben, vertont, untertitelt und geprüft ankommen und Sie nur freigeben. Mit einer Design-App erstellt jemand jedes Video selbst." },
    ],
    guides: ["patientenaufklaerung-videos-zahnarztpraxis", "heilmittelwerbegesetz-zahnarzt-social-media", "instagram-videos-fuer-zahnarztpraxen", "social-media-zahnarztpraxis-ideen"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
];
