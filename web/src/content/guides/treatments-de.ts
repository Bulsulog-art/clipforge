import type { Guide } from "../dentvideo";

// Aufklärungsvideos nach Behandlung, geschrieben für Praxen in Deutschland
// (Hinweise für Österreich und die Schweiz im Werberecht-Ratgeber): was
// Patienten fragen, welche kurzen Videos das beantworten und welche Aussagen
// HWG und Berufsordnung problematisch machen. Sie-Form, keine Preise,
// keine Statistiken, keine Patientenstimmen.

const HWG_11 = { label: "§ 11 Heilmittelwerbegesetz (HWG) — Werbeverbote außerhalb der Fachkreise, gesetze-im-internet.de", url: "https://www.gesetze-im-internet.de/heilmwerbg/__11.html" };
const HWG_3 = { label: "§ 3 Heilmittelwerbegesetz (HWG) — Verbot irreführender Werbung, gesetze-im-internet.de", url: "https://www.gesetze-im-internet.de/heilmwerbg/__3.html" };
const LGL_BLEACHING = { label: "Bayerisches Landesamt für Gesundheit und Lebensmittelsicherheit — Zahnbleichmittel (Kosmetikrecht)", url: "https://www.lgl.bayern.de/produkte/kosmetika/kosmetische_mittel/et_zahnbleichmittel.htm" };

const DATES = { published: "2026-11-14", updated: "2026-11-14", reviewed: "2026-11-14" } as const;

export const TREATMENTS_DE: Guide[] = [
  {
    locale: "de",
    slug: "implantat-aufklaerungsvideos-zahnarztpraxis",
    topic: "treatment-implants",
    category: "treatments",
    ...DATES,
    title: "Aufklärungsvideos zu Zahnimplantaten: Patientenfragen, Videothemen und Aussagen, die Sie vermeiden sollten",
    seoTitle: "Aufklärungsvideos zu Zahnimplantaten",
    seoDescription: "Welche kurzen Implantat-Videos Patienten wirklich helfen, wie Sie sie aufbauen und welche Erfolgs- und Haltbarkeitsversprechen nach HWG heikel sind.",
    description: "Ein Praxisleitfaden: Was Patienten vor einer Implantatbehandlung fragen, sechs kurze Videos dazu, ein Skript in fünf Schritten und die Formulierungen, die das Werberecht kritisch sieht.",
    h1: "Aufklärungsvideos zu Zahnimplantaten: was Sie zeigen und was Sie lassen sollten",
    intro:
      "Ein Aufklärungsvideo zu Zahnimplantaten erklärt in kurzer, verständlicher Form einen Schritt der Behandlung — Voruntersuchung, Implantation, Einheilzeit, Krone oder Nachsorge —, damit Patientinnen und Patienten mit realistischen Erwartungen ins Beratungsgespräch kommen. Gut funktionieren Videos, die eine einzige Frage in unter einer Minute beantworten, den üblichen Ablauf beschreiben, kein Ergebnis versprechen und mit der Einladung enden, die eigene Situation in der Praxis zu besprechen.",
    sections: [
      {
        heading: "Was fragen Patienten vor einer Implantatbehandlung?",
        paragraphs: [
          "Wer über ein Implantat nachdenkt, recherchiert oft wochenlang, bevor er einen Termin vereinbart. Im Erstgespräch tauchen dann fast immer dieselben Fragen auf — jede davon ist ein Videothema. Beginnen Sie mit den Fragen, die Ihr Team am häufigsten hört:",
        ],
        list: [
          "Ist alles an einem Termin erledigt, oder wie viele Sitzungen braucht ein Implantat?",
          "Warum muss ich zwischen Implantat und fertiger Krone warten?",
          "Habe ich während der Einheilzeit eine Lücke?",
          "Komme ich überhaupt infrage — bei Knochenabbau, als Raucher, mit Diabetes?",
          "Was spüre ich während des Eingriffs, und wie läuft der Tag ab?",
          "Wie reinige ich ein Implantat, und warum sind Kontrolltermine wichtig?",
          "Was unterscheidet Implantat, Brücke und Prothese?",
          "Was darf ich in den ersten Tagen essen?",
        ],
        after: [
          "Die Frage nach den Kosten ist real, gehört aber ins persönliche Gespräch und in den Heil- und Kostenplan, nicht in ein Social-Media-Video: Preiswerbung ist für Zahnärzte berufsrechtlich heikel.",
        ],
      },
      {
        heading: "Welche Implantat-Videos lohnen sich für die Praxis?",
        paragraphs: ["Sechs kurze Videos decken den Weg von der ersten Recherche bis zur Nachsorge ab. Jedes eignet sich für Social Media, für die Implantat-Seite Ihrer Website oder als Link vor dem Beratungstermin."],
        table: {
          caption: "Sechs Implantat-Videos und wo sie helfen",
          columns: ["Video", "Beantwortet", "Wo es am meisten hilft"],
          rows: [
            ["Die Phasen der Implantatbehandlung", "Warum es mehrere Termine sind, nicht einer", "Social Media; Implantat-Seite"],
            ["Komme ich für ein Implantat infrage?", "Untersuchung, Röntgen oder 3D-Aufnahme, Zahnfleisch und Knochen", "Vor dem ersten Beratungsgespräch"],
            ["Implantat, Brücke oder Prothese?", "Die Möglichkeiten neutral erklärt, Entscheidung nach Untersuchung", "Website; nach dem Beratungsgespräch"],
            ["Der Tag der Implantation", "Ablauf, örtliche Betäubung, Dauer", "Nachricht vor dem Eingriff"],
            ["Die erste Woche danach", "Schwellung, weiche Kost, Reinigung, wann Sie anrufen sollten", "Nachsorge-Nachricht; Wartezimmer-TV"],
            ["Implantate langfristig pflegen", "Reinigung, Kontrollen, Zahnfleisch rund ums Implantat", "Social Media; Recall-Erinnerung"],
          ],
        },
      },
      {
        heading: "Welche Aussagen sind in Implantat-Videos heikel?",
        paragraphs: [
          "Für Behandlungen gilt außerhalb der Fachkreise das Heilmittelwerbegesetz: § 3 HWG verbietet irreführende Werbung, insbesondere wenn ein Erfolg als sicher dargestellt wird, und § 11 HWG schränkt unter anderem Äußerungen Dritter und bestimmte Darstellungen ein. Dazu kommt die Berufsordnung Ihrer Kammer. Die Einzelheiten stehen in unserem [Ratgeber zum Heilmittelwerbegesetz auf Social Media](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
        table: {
          caption: "Implantat-Formulierungen: heikel und vorsichtiger",
          columns: ["Heikle Formulierung", "Warum problematisch", "Vorsichtiger formuliert"],
          rows: [
            ["„Feste Zähne für immer“", "Verspricht einen dauerhaften Erfolg; Implantate brauchen Pflege und können verloren gehen", "„Auf lange Haltbarkeit ausgelegt — mit guter Pflege und regelmäßigen Kontrollen“"],
            ["„Schmerzfreie Implantation“", "Absolute Aussage, die keine Praxis für jeden Patienten einhalten kann", "„Unter örtlicher Betäubung — wir erklären, was Sie danach spüren können“"],
            ["„Neue Zähne an einem Tag“ als Schlagzeile", "Irreführend, wenn es nur für manche Fälle gilt und die Einheilzeit verschweigt", "„In manchen Fällen ist ein Provisorium am selben Tag möglich — fragen Sie, ob das bei Ihnen infrage kommt“"],
            ["Vorher-Nachher-Fotos von Patienten", "Rechtlich riskant und nur mit schriftlicher Einwilligung denkbar", "Modell oder Grafik der Behandlungsphasen"],
            ["Patientenstimmen und Dankesschreiben", "Nach § 11 HWG riskant, wenn sie irreführend oder missbräuchlich wirken", "Den Ablauf in eigenen Worten erklären"],
          ],
        },
        after: [
          "Für eine schnelle erste Prüfung können Sie Ihren Beitragstext in unseren kostenfreien [Werbe-Check „Ist mein Post erlaubt?“](checker:) einfügen. Er ersetzt keine Rechtsberatung; für Österreich und die Schweiz lesen Sie den [Ratgeber zur Zahnarzt-Werbung in Österreich und der Schweiz](guide:zahnarzt-werbung-oesterreich-schweiz).",
        ],
      },
      {
        heading: "Wie erklären Sie ein Implantat in 30 Sekunden?",
        ordered: true,
        paragraphs: ["Nutzen Sie für jedes Implantat-Video dieselben fünf Schritte. Das hält die Clips kurz und eine Serie einheitlich:"],
        list: [
          "Die Patientenfrage in der ersten Sekunde, gesprochen und eingeblendet: „Warum bekomme ich die Krone nicht sofort?“",
          "Die Antwort in ein, zwei einfachen Sätzen: Das Implantat muss erst fest mit dem Knochen verwachsen, bevor es belastet wird.",
          "Ein praktisches Detail: Viele Patienten tragen in der Einheilzeit ein Provisorium.",
          "Die ehrliche Grenze: Dauer und Möglichkeiten hängen vom Einzelfall ab.",
          "Eine Einladung statt eines Versprechens: „Sprechen Sie uns beim nächsten Termin an.“",
        ],
        after: [
          "Untertitel sind hier besonders wichtig: Implantat-Videos sehen oft ältere Patienten, viele davon ohne Ton. Mehr zu Länge, Untertiteln und Wartezimmer-TV steht im Ratgeber zur [Patientenaufklärung per Video](guide:patientenaufklaerung-videos-zahnarztpraxis).",
        ],
      },
      {
        heading: "Wo passen Implantat-Videos in den Redaktionsplan?",
        paragraphs: [
          "Implantat-Themen wirken als kleine Serie besser als einzeln. Veröffentlichen Sie zuerst das Video zu den Behandlungsphasen und in den folgenden Wochen die Videos zur Eignung und zur Nachsorge — wer eines findet, schaut die anderen. Mischen Sie sie mit Prophylaxe- und Alltagsthemen: Ein Feed, der nur aus Implantaten besteht, wirkt wie Werbung. Wie ein ausgewogener Monat aussieht, zeigen die [Social-Media-Ideen für die Zahnarztpraxis](guide:social-media-zahnarztpraxis-ideen) und der [Redaktionsplan für 52 Wochen](guide:redaktionsplan-social-media-zahnarztpraxis).",
          "Nutzen Sie dieselben Videos auch außerhalb von Social Media: Ein Link zum Phasen-Video in der Terminbestätigung beantwortet die ersten Fragen, bevor der Patient auf dem Stuhl sitzt, und das Nachsorge-Video im Wartezimmer erinnert daran, warum Kontrolltermine zählen.",
        ],
      },
      {
        heading: "So erstellt DentVideo Implantat-Videos für Ihre Praxis",
        paragraphs: [
          "[DentVideo](landing:) plant Videos nur aus den Leistungen, die Sie angeben. Bieten Sie Implantologie an, kommen Themen wie Behandlungsphasen, Eignung und Nachsorge in Ihre wöchentlichen fünf Videos — neben Prophylaxe-Themen. Jedes Video wird in Ihrer Sprache und Ihren Farben vertont und untertitelt, und jedes Skript wird vor der Freigabe auf die oben genannten Aussagen und auf fachliche Richtigkeit geprüft. Veröffentlicht wird nichts ohne Ihre Freigabe. [Sehen Sie vorab eine Live-Vorschau mit Ihrem Logo](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Darf ich Animationen eines Implantat-Herstellers in Praxisvideos verwenden?",
        a: "Oft ja, wenn die Lizenz des Herstellers das erlaubt — prüfen Sie die Bedingungen. Achten Sie darauf, dass das Video keine Produktwerbung für eine Implantatmarke wird: Für Medizinprodukte gelten eigene Werberegeln.",
      },
      {
        q: "Sollten Implantat-Videos eine Haltbarkeit in Jahren nennen?",
        a: "Besser nicht. Erklären Sie, wovon die Haltbarkeit abhängt — Pflege, Kontrollen, Zahnfleischgesundheit, Rauchen. Eine Jahreszahl wirkt wie ein Erfolgsversprechen und lässt sich für den Einzelfall nicht belegen.",
      },
      {
        q: "Darf ich Röntgenbilder von Patienten zeigen?",
        a: "Nur mit ausdrücklicher schriftlicher Einwilligung für genau diese Nutzung und ohne identifizierende Angaben. Ein Modell oder eine Grafik erklärt die Phasen meist klarer und erspart die Einwilligungsfrage.",
      },
      {
        q: "Wie lang sollte ein Implantat-Aufklärungsvideo sein?",
        a: "Für Social Media etwa 20 bis 60 Sekunden mit einer Frage pro Video. Für die Website oder vor dem Eingriff eignen sich ein bis drei Minuten für den ganzen Ablauf.",
      },
    ],
    sources: [HWG_3, HWG_11],
  },
  {
    locale: "de",
    slug: "aligner-aufklaerungsvideos-zahnarztpraxis",
    topic: "treatment-aligners",
    category: "treatments",
    ...DATES,
    sample: "aligner-verfaerbung",
    title: "Aufklärungsvideos zu Alignern: Themen, Skriptaufbau und Aussagen, die Sie vermeiden sollten",
    seoTitle: "Aligner-Aufklärungsvideos für die Praxis",
    seoDescription: "Kurze Aligner-Videos, die Patienten wirklich brauchen: Tragezeit, Reinigung, Attachments, Retainer — ohne „unsichtbar“- und Zeitversprechen.",
    description: "Was Patienten zu Alignern fragen, sechs kurze Videos dazu, ein Skript in fünf Schritten und die Formulierungen, die nach Werberecht problematisch sind.",
    h1: "Aufklärungsvideos zu Alignern: was Sie zeigen und was Sie lassen sollten",
    intro:
      "Ein Aufklärungsvideo zu Alignern erklärt einen Teil der Behandlung mit durchsichtigen Schienen — Tragezeit, Reinigung, Attachments, Kontrolltermine, Retainer — in einem kurzen, untertitelten Clip. Hilfreich sind Videos, die Patienten beim Durchhalten unterstützen. Sie versprechen weder ein Ergebnis noch ein Enddatum, denn beides hängt vom Befund und davon ab, wie konsequent die Schienen getragen werden.",
    sections: [
      {
        heading: "Was fragen Patienten zu Alignern?",
        paragraphs: [
          "Es gibt zwei Arten von Fragen: vor der Behandlung („Kommt das für mich infrage?“) und während der Behandlung („Was mache ich jetzt?“). Bei der zweiten Art helfen Videos am meisten, denn wer die Routine versteht, hält sie eher ein.",
        ],
        list: [
          "Wie viele Stunden am Tag muss ich die Schienen wirklich tragen?",
          "Darf ich mit Alignern essen und trinken?",
          "Wie reinige ich die Schienen, und warum verfärben sie sich?",
          "Was sind die kleinen Erhebungen auf meinen Zähnen (Attachments)?",
          "Ist es normal, dass eine neue Schiene drückt?",
          "Was passiert, wenn ich eine Schiene verliere oder vergesse?",
          "Warum brauche ich nach der Behandlung einen Retainer?",
          "Reichen Aligner für meinen Fall, oder brauche ich eine feste Zahnspange?",
        ],
      },
      {
        heading: "Welche Aligner-Videos lohnen sich?",
        paragraphs: ["Diese sechs Videos beantworten die Fragen oben. Die meisten sind als Nachricht zu Behandlungsbeginn genauso nützlich wie auf Social Media."],
        table: {
          caption: "Sechs Aligner-Videos und wo sie helfen",
          columns: ["Video", "Beantwortet", "Wo es am meisten hilft"],
          rows: [
            ["Tragezeit, kurz erklärt", "Warum Aligner nur wirken, solange sie im Mund sind", "Nachricht zum Start; Social Media"],
            ["Essen und Trinken mit Alignern", "Für alles außer Wasser herausnehmen, danach Zähne putzen", "Social Media; Wartezimmer"],
            ["Verfärbungen vermeiden", "Kaffee, Tee, Rotwein — und warum heißes Wasser schadet", "Nachricht zum Start; Social Media"],
            ["Wozu Attachments da sind", "Kleine zahnfarbene Formen, an denen die Schiene greift", "Vor dem Attachment-Termin"],
            ["Die neue Schiene drückt", "Druck ist ein, zwei Tage üblich; wann Sie anrufen sollten", "Social Media; Folgenachricht"],
            ["Warum danach ein Retainer kommt", "Zähne können zurückwandern; der Retainer hält das Ergebnis", "Nachricht zum Behandlungsende"],
          ],
        },
      },
      {
        heading: "Welche Aussagen sind in Aligner-Videos heikel?",
        paragraphs: [
          "Hersteller und Direktanbieter bewerben Aligner sehr offensiv, und Praxisvideos übernehmen diesen Ton manchmal unbewusst. Für die Praxis gilt aber das Heilmittelwerbegesetz: Erfolgsversprechen und irreführende Angaben sind nach § 3 HWG unzulässig. Mehr dazu im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
        table: {
          caption: "Aligner-Formulierungen: heikel und vorsichtiger",
          columns: ["Heikle Formulierung", "Warum problematisch", "Vorsichtiger formuliert"],
          rows: [
            ["„Völlig unsichtbar“", "Absolute Aussage; Aligner sind unauffälliger, nicht unsichtbar", "„Durchsichtig und deutlich unauffälliger als eine feste Spange“"],
            ["„Gerade Zähne in sechs Monaten“", "Verspricht Ergebnis und Dauer, die vom Befund abhängen", "„Die Dauer hängt von Ihren Zähnen ab; wir erklären sie nach der Untersuchung“"],
            ["„Ganz ohne Zahnarztbesuche“", "Irreführend; Aligner-Behandlung braucht zahnärztliche Kontrolle", "„Regelmäßige Kontrollen zeigen, wie sich Ihre Zähne bewegen“"],
            ["Markennamen als Schlagzeile", "Macht aus Aufklärung Produktwerbung", "Die Behandlung erklären, nicht die Marke"],
            ["Vorher-Nachher-Lächeln von Patienten", "Rechtlich riskant und nur mit Einwilligung denkbar", "Ablauf mit Modell oder Grafik zeigen"],
          ],
        },
        after: [
          "Prüfen Sie Beitragstexte vor dem Posten mit unserem kostenfreien [Werbe-Check „Ist mein Post erlaubt?“](checker:). Bevor Sie Fotos von Patienten zeigen, lesen Sie die Hinweise zur Einwilligung im [HWG-Ratgeber](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
      },
      {
        heading: "Wie bauen Sie ein Aligner-Video auf?",
        ordered: true,
        paragraphs: ["Fünf Schritte halten jedes Video kurz und bei einem Punkt:"],
        list: [
          "Einstieg mit einer echten Alltagssituation: „Ihre Aligner verfärben sich?“",
          "Die Ursache in einem Satz: Farbstoffe aus Getränken setzen sich in der Schiene fest.",
          "Die Gewohnheit: Schienen zum Essen und für farbige Getränke herausnehmen, Zähne putzen, Schiene schonend reinigen.",
          "Die Grenze: Wenn etwas schmerzt oder eine Schiene bricht, melden Sie sich in der Praxis.",
          "Die Einladung: „Fragen zu Ihren Alignern? Sprechen Sie uns beim nächsten Kontrolltermin an.“",
        ],
      },
      {
        heading: "Wann sollten Sie Aligner-Videos posten oder verschicken?",
        paragraphs: [
          "Aligner-Videos arbeiten doppelt. Auf Social Media zeigen sie Interessierten, wie der Alltag mit Schienen aussieht — das überzeugt mehr als ein Versprechen und ist rechtlich sicherer. Als Nachricht an Patienten ersparen sie Ihrem Team viele telefonische Routinefragen. Schicken Sie das Tragezeit- und das Reinigungsvideo zu Behandlungsbeginn, das Video zur drückenden Schiene mit der zweiten oder dritten Schiene und das Retainer-Video gegen Ende.",
          "Wenn Ihre Praxis einige Male pro Woche postet, reicht ein Aligner-Video pro Woche neben Prophylaxe-Themen. Die [Instagram-Videos für Zahnarztpraxen](guide:instagram-videos-fuer-zahnarztpraxen) zeigen, wie Sie solche Clips selbst drehen.",
        ],
      },
      {
        heading: "Was gehört in den Beitragstext unter einem Aligner-Video?",
        paragraphs: [
          "Der Text unter dem Video wird genauso als Werbung gelesen wie das Video selbst. Halten Sie ihn kurz und sachlich: Wiederholen Sie die Frage aus dem Video, fassen Sie die Antwort in einem Satz zusammen und schließen Sie mit dem Hinweis, dass die Eignung erst nach einer Untersuchung feststeht. Verzichten Sie auf Rabattcodes, Markenslogans und Hashtags, die ein Ergebnis versprechen.",
        ],
        list: [
          "Die Frage aus dem Video als erste Zeile, damit sie in der Vorschau sichtbar ist.",
          "Ein Satz Antwort, ohne „unsichtbar“ und ohne Zeitangabe für das Ergebnis.",
          "Ein Satz zur Grenze: „Ob Aligner für Sie infrage kommen, klären wir nach der Untersuchung.“",
          "Neutrale Hashtags zum Thema statt Hashtags mit Versprechen.",
          "Ein Link auf Ihr Impressum im Profil, wie es für geschäftliche Konten üblich ist.",
        ],
      },
      {
        heading: "So erstellt DentVideo Aligner-Videos",
        paragraphs: [
          "Das Video oben ist ein echtes DentVideo-Video für eine Demo-Praxis. Geben Sie Aligner als Leistung an, plant [DentVideo](landing:) solche Themen in Ihre wöchentlichen Videos ein, vertont und untertitelt sie in Ihren Farben und prüft jedes Skript vor der Freigabe auf absolute Aussagen, Zeitversprechen, Markenwerbung und fachliche Richtigkeit. Sie geben jedes Video frei und posten selbst. [Sehen Sie vor der Zahlung Ihre Live-Vorschau](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Darf die Praxis in Videos die Aligner-Marke nennen?",
        a: "Als sachliche Information, welches System Sie verwenden, meist ja. Ein Video, das sich um die Marke dreht und Herstellerslogans übernimmt, wirkt dagegen wie Produktwerbung — bleiben Sie bei der Behandlung und den Fragen der Patienten.",
      },
      {
        q: "Sollten Aligner-Videos eine Tragezeit in Stunden nennen?",
        a: "Ja, wenn es die Anweisung ist, die Ihre Praxis tatsächlich gibt. Stellen Sie sie als Empfehlung Ihrer Praxis dar und erinnern Sie daran, den Anweisungen der eigenen Zahnärztin oder des Kieferorthopäden zu folgen.",
      },
      {
        q: "Dürfen wir Aligner-Selfies von Patienten teilen?",
        a: "Nur mit ausdrücklicher schriftlicher Einwilligung für genau diese Nutzung. Je nach Darstellung kann ein Patientenfoto zudem als Äußerung Dritter im Sinne des HWG gelten. Im Zweifel erklären statt zeigen.",
      },
    ],
    sources: [HWG_3, HWG_11],
  },
  {
    locale: "de",
    slug: "bleaching-aufklaerungsvideos-zahnarztpraxis",
    topic: "treatment-whitening",
    category: "treatments",
    ...DATES,
    sample: "bleaching-zahnschmelz",
    title: "Aufklärungsvideos zum Bleaching: Mythen, Empfindlichkeit und Werbeaussagen, die Sie vermeiden sollten",
    seoTitle: "Bleaching-Aufklärungsvideos für Zahnarztpraxen",
    seoDescription: "Kurze Bleaching-Videos für die Praxis: Zahnschmelz-Mythen, Empfindlichkeit, Kronen und Füllungen — ohne Vorher-Nachher-Bilder und Rabattaktionen.",
    description: "Was Patienten zum Bleaching fragen, sechs kurze Videos dazu, ein Skript in fünf Schritten und die Aussagen, die bei ästhetischen Behandlungen werberechtlich riskant sind.",
    h1: "Aufklärungsvideos zum Bleaching: was Sie zeigen und was Sie lassen sollten",
    intro:
      "Ein Aufklärungsvideo zum Bleaching beantwortet eine Frage zur Zahnaufhellung — schadet es dem Zahnschmelz, warum werden die Zähne empfindlich, hellen Kronen mit auf, sind Drogerieprodukte dasselbe — in einem kurzen, untertitelten Clip. Bleaching ist eine ästhetische Behandlung und damit das Thema, bei dem Praxisvideos am leichtesten in Werbung abrutschen. Gute Videos erklären Fakten und überlassen die Entscheidung dem Beratungsgespräch.",
    sections: [
      {
        heading: "Was fragen Patienten zum Bleaching?",
        paragraphs: ["Fragen zum Bleaching drehen sich meist um Sicherheit und Erwartungen. Jede ergibt ein kurzes Video:"],
        list: [
          "Schadet Bleaching dem Zahnschmelz oder macht es ihn dünner?",
          "Warum sind die Zähne danach empfindlich, und wie lange hält das an?",
          "Werden Kronen, Veneers und Füllungen mit aufgehellt?",
          "Ist Home-Bleaching mit Schienen aus der Praxis etwas anderes als ein Set aus der Drogerie?",
          "Darf ich nach dem Bleaching Kaffee oder Rotwein trinken?",
          "Wie lange hält das Ergebnis?",
          "Ist Bleaching in der Schwangerschaft oder für Jugendliche geeignet?",
          "Warum möchte die Praxis die Zähne vorher untersuchen?",
        ],
      },
      {
        heading: "Welche Bleaching-Videos lohnen sich?",
        paragraphs: ["Sechs Videos beantworten die meisten Fragen, ohne eine Farbstufe oder ein Ergebnis zu versprechen."],
        table: {
          caption: "Sechs Bleaching-Videos und wo sie helfen",
          columns: ["Video", "Beantwortet", "Wo es am meisten hilft"],
          rows: [
            ["Bleaching und Zahnschmelz: der Mythos", "Was professionelles Bleaching mit dem Schmelz macht und was nicht", "Social Media"],
            ["Empfindlichkeit nach dem Bleaching", "Warum sie auftritt, dass sie meist vorübergeht, was hilft", "Nachsorge-Nachricht; Social Media"],
            ["Kronen und Füllungen hellen nicht auf", "Warum vorhandene Versorgungen eingeplant werden müssen", "Vor dem Beratungsgespräch"],
            ["Praxis oder Drogerie?", "Kontrolle, Passform und wer welche Mittel anwenden darf", "Social Media; Website"],
            ["Die ersten Tage danach", "Färbende Lebensmittel, Rauchen, wann Sie anrufen sollten", "Nachsorge-Nachricht"],
            ["Warum wir vorher untersuchen", "Karies, Zahnfleisch und Versorgungen zuerst abklären", "Website; Wartezimmer-TV"],
          ],
        },
        after: [
          "Ein sachlicher Punkt für das Video „Praxis oder Drogerie?“: Nach EU-Kosmetikrecht dürfen Zahnbleichmittel mit höherem Wasserstoffperoxidgehalt nur an Zahnärzte abgegeben werden, die erste Anwendung ist der Praxis vorbehalten, und sie sind nicht für Personen unter 18 Jahren bestimmt (siehe Quellen).",
        ],
      },
      {
        heading: "Welche Aussagen sind in Bleaching-Videos heikel?",
        paragraphs: [
          "Bei ästhetischen Behandlungen schauen Gerichte und Kammern besonders genau hin. Ob Vorher-Nachher-Bilder beim Bleaching zulässig sind, ist nicht abschließend geklärt; die Rechtsprechung zu ästhetischen Behandlungen ist zuletzt strenger geworden, und das Verbot erfasst auch flüchtige Inhalte wie Instagram-Stories. Im Zweifel verzichten Sie. Hintergründe im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
        table: {
          caption: "Bleaching-Formulierungen: heikel und vorsichtiger",
          columns: ["Heikle Formulierung", "Warum problematisch", "Vorsichtiger formuliert"],
          rows: [
            ["„Acht Stufen heller“ oder „Hollywood-Lächeln“", "Verspricht ein Ergebnis, das von Mensch zu Mensch verschieden ist", "„Wie hell die Zähne werden, hängt von der Ausgangsfarbe ab“"],
            ["„Sofort strahlend weiß“", "Irreführend, wenn mehrere Sitzungen oder Tage üblich sind", "„Wir erklären, wie viele Sitzungen oder Tage Ihre Behandlung meist dauert“"],
            ["„Ohne Empfindlichkeit“", "Vorübergehende Empfindlichkeit ist eine häufige Nebenwirkung", "„Manche spüren vorübergehend Empfindlichkeit; wir erklären, was hilft“"],
            ["Vorher-Nachher-Fotos", "Rechtlich riskant; zusätzlich ist eine Einwilligung nötig", "Mit Farbskala oder Grafik erklären"],
            ["„Sommer-Bleaching zum Aktionspreis“", "Rabatt- und Preiswerbung ist berufsrechtlich heikel", "Aktionen und Preise aus Social-Media-Videos weglassen"],
          ],
        },
        after: [
          "Einen schnellen ersten Check Ihres Beitragstextes bietet unser kostenfreier [Werbe-Check „Ist mein Post erlaubt?“](checker:).",
        ],
      },
      {
        heading: "Wie erklären Sie Bleaching in 30 Sekunden?",
        ordered: true,
        paragraphs: ["Dieselben fünf Schritte passen zu jedem Bleaching-Thema:"],
        list: [
          "Mit dem Mythos oder der Frage beginnen: „Ihr Zahnschmelz beim Bleaching in Gefahr?“",
          "Die einfache Antwort in ein, zwei Sätzen — ohne Zahl von Farbstufen.",
          "Der praktische Tipp: was Sie die ersten Tage meiden oder was gegen Empfindlichkeit hilft.",
          "Die Grenze: Kronen und Füllungen behalten ihre Farbe; Ergebnisse sind individuell.",
          "Einladen statt verkaufen: „Fragen Sie uns, ob Bleaching für Ihre Zähne infrage kommt.“",
        ],
      },
      {
        heading: "Wann passen Bleaching-Videos in den Redaktionsplan?",
        paragraphs: [
          "Das Interesse an Zahnaufhellung steigt vor Hochzeiten, Urlauben und dem Jahreswechsel. Halten Sie den Feed trotzdem ausgewogen: Lauter Bleaching-Beiträge wirken wie Werbung. Ein aufklärendes Bleaching-Video im Monat neben Prophylaxe-Themen ist ein guter Rhythmus; wo ästhetische Themen im Jahr hinpassen, zeigt der [Redaktionsplan für die Zahnarztpraxis](guide:redaktionsplan-social-media-zahnarztpraxis).",
          "Das Nachsorge-Video ist auch außerhalb von Social Media wertvoll: Schicken Sie es am Behandlungstag, damit die Hinweise zu Hause griffbereit sind.",
          "Bleaching-Videos zeigen außerdem, wie Ihre Praxis arbeitet. Wer erklärt, warum vorher Karies und Zahnfleisch geprüft werden, und offen sagt, dass Ergebnisse unterschiedlich ausfallen, gewinnt mehr Vertrauen als mit einem versprochenen Farbton — und bleibt zugleich auf der sicheren Seite.",
        ],
      },
      {
        heading: "Wie nutzen Sie Bleaching-Videos im Beratungsgespräch?",
        paragraphs: [
          "Bleaching-Interessierte kommen oft mit Bildern aus sozialen Netzwerken, die mit Filtern bearbeitet sind. Ein kurzes Video, das vor dem Termin verschickt wird, setzt realistische Erwartungen: Es erklärt, dass Kronen und Füllungen ihre Farbe behalten, dass die erreichbare Aufhellung von der Ausgangsfarbe abhängt und dass vorübergehende Empfindlichkeit vorkommen kann. Im Gespräch bleibt dann mehr Zeit für die Fragen, die nur die individuelle Situation betreffen.",
          "Wer nach dem Termin noch unsicher ist, bekommt das Mythen-Video zum Zahnschmelz mit der Zusammenfassung des Gesprächs. So hat die Patientin die Fakten zu Hause griffbereit und entscheidet in Ruhe — genau das, was eine Aufklärung leisten soll.",
        ],
      },
      {
        heading: "So erstellt DentVideo Bleaching-Videos",
        paragraphs: [
          "Das Video oben ist ein echtes DentVideo-Video für eine Demo-Praxis. Gehört Bleaching zu Ihren Leistungen, plant [DentVideo](landing:) aufklärende Themen wie Mythen und Nachsorge in Ihre wöchentlichen Videos ein, vertont und untertitelt sie in Ihren Farben und prüft jedes Skript vor der Freigabe auf versprochene Farbstufen, „sofort“-Aussagen, Preiswerbung und fachliche Richtigkeit. [Sehen Sie Ihre Live-Vorschau mit Logo](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Darf eine Zahnarztpraxis Vorher-Nachher-Bilder vom Bleaching posten?",
        a: "Das ist rechtlich nicht abschließend geklärt, und die Rechtsprechung zu ästhetischen Behandlungen ist strenger geworden. Dazu braucht es immer die Einwilligung des Patienten. Aufklärungsvideos ohne Patientenfotos umgehen das Problem.",
      },
      {
        q: "Sollen Bleaching-Videos Drogerie-Produkte erwähnen?",
        a: "Ja, sachlich: Erklären Sie den Unterschied zwischen zahnärztlich begleitetem Bleaching und frei verkäuflichen Produkten und dass stärkere Mittel der Praxis vorbehalten sind. Machen Sie dabei keine konkreten Produkte schlecht.",
      },
      {
        q: "Ist ein Bleaching-Video pro Woche zu viel?",
        a: "Meist ja. Ein Feed, der von einer ästhetischen Behandlung dominiert wird, wirkt wie Werbung. Mischen Sie Bleaching mit Prophylaxe, Kinderzahnheilkunde und Alltagsfragen.",
      },
    ],
    sources: [LGL_BLEACHING, HWG_3],
  },
  {
    locale: "de",
    slug: "kinderzahnheilkunde-videos-zahnarztpraxis",
    topic: "treatment-kids",
    category: "treatments",
    ...DATES,
    sample: "kinder-zahnarztangst",
    title: "Videos zur Kinderzahnheilkunde: Themen für Eltern, Einwilligung und was das HWG bei Kindern verbietet",
    seoTitle: "Kinderzahnheilkunde-Videos für Eltern",
    seoDescription: "Kurze Videos für Eltern: erster Zahnarztbesuch, Putzen, Zucker, Nuckelflasche, Zahnarztangst — plus Einwilligung und § 11 HWG bei Kindern.",
    description: "Was Eltern zu den Zähnen ihrer Kinder fragen, sechs kurze Videos dazu, wie Sie über Zahnarztangst sprechen, und warum sich Werbung nicht an Kinder unter 14 richten darf.",
    h1: "Videos zur Kinderzahnheilkunde: was Sie für Eltern drehen sollten",
    intro:
      "Ein Video zur Kinderzahnheilkunde richtet sich an Eltern, nicht an Kinder, und beantwortet eine Frage zu Kinderzähnen: wann der erste Zahnarztbesuch sinnvoll ist, wie man Kleinkindern die Zähne putzt, was Zucker und die Nuckelflasche anrichten, wie man ein ängstliches Kind vorbereitet. Gute Videos sind ruhig und praktisch, zeigen keine echten Kinder ohne Einwilligung und machen Eltern keine Angst.",
    sections: [
      {
        heading: "Was fragen Eltern zu den Zähnen ihrer Kinder?",
        paragraphs: ["Die Fragen von Eltern sind praktisch und oft besorgt. Jede ergibt ein kurzes, beruhigendes Video:"],
        list: [
          "Wann sollte mein Kind das erste Mal zum Zahnarzt?",
          "Wie putze ich die Zähne meines Babys oder Kleinkinds, und mit wie viel Zahnpasta?",
          "Ist es schlimm, wenn mein Kind mit der Flasche einschläft?",
          "Welche Snacks und Getränke sind für Kinderzähne besonders ungünstig?",
          "Zahnen: Was ist normal, und wann sollte ich mir Sorgen machen?",
          "Mein Kind hat Angst vor dem Zahnarzt — was sage ich vorher?",
          "Was sind Fissurenversiegelung und Fluoridlack?",
          "Sind Milchzähne wichtig, wenn sie doch ausfallen?",
        ],
      },
      {
        heading: "Welche Videos zur Kinderzahnheilkunde lohnen sich?",
        paragraphs: ["Diese sechs Videos richten sich an Eltern und sind vor dem ersten Termin eines Kindes genauso nützlich wie auf Social Media."],
        table: {
          caption: "Sechs Videos für Eltern und wo sie helfen",
          columns: ["Video", "Beantwortet", "Wo es am meisten hilft"],
          rows: [
            ["Der erste Zahnarztbesuch", "Wann und was passiert — vor allem schauen und kennenlernen", "Social Media; Terminbestätigung"],
            ["Kleine Zähne putzen", "Technik, Nachputzen durch die Eltern, Zahnpasta nach aktueller Empfehlung", "Social Media; Wartezimmer-TV"],
            ["Flasche und Getränke in der Nacht", "Warum Milch oder Saft nachts den Zähnen schadet", "Social Media"],
            ["Snacks und wie oft", "Nicht nur die Menge, auch die Häufigkeit von Zucker zählt", "Social Media; Schulstart"],
            ["Ein ängstliches Kind vorbereiten", "Worte, die helfen, und Worte, die schaden", "Nachricht vor dem Termin"],
            ["Versiegelung und Fluoridlack", "Was das ist und warum die Praxis es vorschlagen kann", "Website; Folgenachricht"],
          ],
        },
        after: [
          "Halten Sie sich bei Zahnpasta-Mengen und dem Alter für den ersten Besuch an die aktuellen Empfehlungen der zahnärztlichen Fachgesellschaften und nennen Sie sie im Video als Empfehlung, nicht als starre Regel.",
        ],
      },
      {
        heading: "Was verbietet das Werberecht bei Kindern?",
        paragraphs: [
          "Zwei zusätzliche Ebenen kommen hinzu: die Einwilligung für jedes Bild eines Kindes und der besondere Schutz von Kindern im Heilmittelwerberecht. Nach § 11 Abs. 1 Satz 1 Nr. 12 HWG darf außerhalb der Fachkreise nicht mit Werbemaßnahmen geworben werden, die sich ausschließlich oder überwiegend an Kinder unter 14 Jahren richten. Sprechen Sie also die Eltern an, nicht die Kinder. Weitere Regeln im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
        table: {
          caption: "Videos für Eltern: heikel und vorsichtiger",
          columns: ["Heikler Inhalt", "Warum problematisch", "Vorsichtiger"],
          rows: [
            ["Ein echtes Kind auf dem Behandlungsstuhl", "Braucht die schriftliche Einwilligung der Sorgeberechtigten; das Kind selbst kann nicht einwilligen", "Grafiken, Kuscheltiere, nur Hände — oder ganz ohne Gesichter"],
            ["„Das tut gar nicht weh“", "Absolutes Versprechen; bringt das Thema Schmerz erst ins Spiel", "„Die Zahnärztin zählt deine Zähne und zeigt dir ihre Instrumente“"],
            ["Erschreckende Bilder kariöser Milchzähne", "Arbeitet mit Angst; abstoßende Darstellungen sind nach § 11 HWG riskant", "Ursache und schützende Gewohnheit erklären"],
            ["Gewinnspiele oder Aktionen für Kinder", "Richtet sich an Kinder unter 14 — nach § 11 HWG unzulässig", "Eltern mit praktischen Informationen ansprechen"],
            ["„Kinder-Prophylaxe zum Sonderpreis“", "Preiswerbung ist berufsrechtlich heikel", "Preise und Aktionen aus Social-Media-Videos weglassen"],
          ],
        },
        after: [
          "Unser kostenfreier [Werbe-Check „Ist mein Post erlaubt?“](checker:) findet typische Problemformulierungen in Beitragstexten, bevor Sie posten.",
        ],
      },
      {
        heading: "Wie sprechen Sie in einem Video über Zahnarztangst?",
        paragraphs: [
          "Eltern sagen „Du brauchst keine Angst zu haben“ oder „Es tut nicht weh“ in guter Absicht — doch beides pflanzt dem Kind die Idee von Angst und Schmerz erst ein. Ein kurzes Video für Eltern kann ruhigere Worte vorschlagen: neutral beschreiben, was passiert („Die Zahnärztin zählt deine Zähne“), vorher ein Bilderbuch über den Zahnarztbesuch lesen, das Lieblingskuscheltier mitnehmen und die eigenen Sorgen für sich behalten.",
          "Solche Videos werden oft geteilt, weil sie Eltern direkt helfen — und sie zeigen, wie Ihre Praxis mit Kindern umgeht, ganz ohne ein einziges Kinderbild.",
        ],
      },
      {
        heading: "Wann sollten Videos für Eltern erscheinen?",
        ordered: true,
        paragraphs: ["Kinderthemen folgen dem Familienkalender. Ein einfacher Rhythmus:"],
        list: [
          "Vor dem Schul- oder Kitastart: das Video zum ersten Besuch und das Putzvideo.",
          "Vor Feiertagen mit vielen Süßigkeiten: das Video zu Snacks und Häufigkeit.",
          "Mit der Terminbestätigung für den ersten Besuch eines Kindes: das Video zur Zahnarztangst.",
          "Alle paar Monate: das Video zu Versiegelung und Fluoridlack für Eltern von Schulkindern.",
        ],
        after: [
          "Der [Redaktionsplan für 52 Wochen](guide:redaktionsplan-social-media-zahnarztpraxis) ordnet diese Themen ins ganze Jahr ein, und der Ratgeber zur [Patientenaufklärung per Video](guide:patientenaufklaerung-videos-zahnarztpraxis) erklärt den Einsatz im Wartezimmer.",
        ],
      },
      {
        heading: "Was gehört in einen Beitrag für Eltern?",
        paragraphs: [
          "Eltern lesen Beiträge zur Kinderzahnheilkunde oft nebenbei, mit einem Kind auf dem Arm. Halten Sie den Text deshalb besonders kurz und konkret: eine Frage, eine Antwort, ein Tipp für zu Hause. Formulieren Sie die Ansprache an die Eltern („Ihr Kind“), nicht an das Kind. Verzichten Sie auf Comicfiguren, Gewinnspiele und Aktionen, die Kinder direkt ansprechen, und auf Fotos von Kindern aus der Praxis.",
          "Gut funktionieren Beiträge, die eine typische Alltagssituation aufgreifen: das Einschlafen mit der Flasche, der Streit ums Zähneputzen am Abend, die Süßigkeiten nach dem Kindergeburtstag. Eltern erkennen sich darin wieder und speichern den Beitrag für später.",
        ],
      },
      {
        heading: "So erstellt DentVideo Videos zur Kinderzahnheilkunde",
        paragraphs: [
          "Das Video oben ist ein echtes DentVideo-Video für eine Demo-Praxis. Geben Sie Kinderzahnheilkunde als Leistung an, plant [DentVideo](landing:) elternorientierte Themen in Ihre wöchentlichen Videos ein. Es gibt keine Avatar-Kinder und keine echten Patienten — gezeigt werden nur Gegenstände —, und jedes Skript wird vor der Freigabe auf absolute Versprechen, angstmachende Formulierungen und fachliche Richtigkeit geprüft. [Sehen Sie Ihre Live-Vorschau](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Darf ich Fotos von Kindern zeigen, die in der Praxis behandelt wurden?",
        a: "Nur mit ausdrücklicher schriftlicher Einwilligung der Sorgeberechtigten für genau diese Nutzung — viele Praxen verzichten ganz darauf. Videos für Eltern funktionieren gut ohne ein Kind im Bild.",
      },
      {
        q: "Sollten Kinder-Videos für Kinder oder für Eltern gemacht werden?",
        a: "Für Eltern. § 11 HWG verbietet Werbemaßnahmen, die sich ausschließlich oder überwiegend an Kinder unter 14 Jahren richten, und es sind ohnehin die Eltern, die Termine vereinbaren.",
      },
      {
        q: "Ab wann sollte ein Kind zum Zahnarzt?",
        a: "Die Empfehlungen sehen den ersten Besuch etwa mit dem Durchbruch der ersten Zähne vor; in Deutschland gibt es zudem zahnärztliche Früherkennungsuntersuchungen für Kleinkinder. Nennen Sie im Video die aktuelle Empfehlung, keine starre Regel.",
      },
    ],
    sources: [HWG_11],
  },
  {
    locale: "de",
    slug: "parodontitis-aufklaerungsvideos-zahnarztpraxis",
    topic: "treatment-gum-disease",
    category: "treatments",
    ...DATES,
    title: "Aufklärungsvideos zu Parodontitis: Zahnfleischbluten, Behandlung, Nachsorge und heikle Aussagen",
    seoTitle: "Parodontitis-Aufklärungsvideos für die Praxis",
    seoDescription: "Kurze Parodontitis-Videos: Zahnfleischbluten, Gingivitis oder Parodontitis, Behandlung, Nachsorge — ohne Angstmache und abstoßende Bilder.",
    description: "Was Patienten zu Parodontitis fragen, sechs kurze Videos dazu, wie Sie Zusammenhänge mit der Allgemeingesundheit erklären, ohne Angst zu machen, und welche Aussagen das HWG kritisch sieht.",
    h1: "Aufklärungsvideos zu Parodontitis: was Sie zeigen und was Sie lassen sollten",
    intro:
      "Ein Aufklärungsvideo zu Parodontitis erklärt einen Aspekt der Zahnfleischgesundheit — warum Zahnfleisch blutet, was Gingivitis von Parodontitis unterscheidet, wie die Behandlung abläuft, warum die Nachsorge danach so wichtig ist — in einem kurzen, ruhigen Clip. Parodontitis ist häufig und verursacht anfangs oft keine Schmerzen. Deshalb helfen solche Videos, Warnzeichen früh zu erkennen; sie sollen informieren, nicht erschrecken.",
    sections: [
      {
        heading: "Was fragen Patienten zu Parodontitis?",
        paragraphs: ["Viele erfahren erst in der Praxis, dass ihr Zahnfleisch erkrankt ist. Ihre Fragen sind eine gute Themenliste:"],
        list: [
          "Mein Zahnfleisch blutet beim Putzen — soll ich die Stelle schonen?",
          "Was ist der Unterschied zwischen Gingivitis und Parodontitis?",
          "Ist Parodontitis heilbar?",
          "Wie läuft eine Parodontitis-Behandlung ab?",
          "Warum soll ich jetzt öfter zur Nachsorge kommen?",
          "Welche Rolle spielt Rauchen?",
          "Hängt Parodontitis mit Diabetes oder anderen Erkrankungen zusammen?",
          "Wie reinige ich die Zahnzwischenräume richtig?",
        ],
        after: [
          "Die erste Frage ist die häufigste: Viele putzen blutende Stellen weniger, was das Problem meist verschärft. Ein 30-Sekunden-Video mit der Botschaft „weiter sanft reinigen und einen Termin vereinbaren“ hilft direkt.",
        ],
      },
      {
        heading: "Welche Parodontitis-Videos lohnen sich?",
        paragraphs: ["Diese sechs Videos begleiten vom ersten Warnzeichen bis zur langfristigen Nachsorge:"],
        table: {
          caption: "Sechs Parodontitis-Videos und wo sie helfen",
          columns: ["Video", "Beantwortet", "Wo es am meisten hilft"],
          rows: [
            ["Zahnfleischbluten: ein Warnzeichen", "Warum es blutet und warum Sie weiter sanft putzen sollten", "Social Media"],
            ["Gingivitis oder Parodontitis?", "Die frühe, umkehrbare Entzündung und die tiefere Erkrankung", "Social Media; Website"],
            ["So läuft die Behandlung ab", "Gründliche Reinigung der Zahnfleischtaschen in einfachen Worten", "Nachricht vor dem Termin"],
            ["Zahnzwischenräume reinigen", "Interdentalbürsten oder Zahnseide nach Empfehlung der Praxis", "Wartezimmer-TV; Social Media"],
            ["Warum die Nachsorge zählt", "Parodontitis braucht dauerhafte Betreuung", "Recall-Erinnerung"],
            ["Rauchen und Zahnfleisch", "Wie Rauchen Bluten verdecken und die Heilung beeinflussen kann", "Social Media"],
          ],
        },
      },
      {
        heading: "Welche Aussagen sind in Parodontitis-Videos heikel?",
        paragraphs: [
          "Bei Parodontitis ist Angstmache besonders verlockend: drastische Fotos, drohender Zahnverlust, große Aussagen über Herzinfarkte. § 11 Abs. 1 Satz 1 Nr. 5 HWG verbietet bildliche Darstellungen, die Veränderungen des Körpers durch Krankheiten in missbräuchlicher, abstoßender oder irreführender Weise zeigen, und § 3 HWG verbietet Irreführung. Mehr im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
        table: {
          caption: "Parodontitis-Formulierungen: heikel und vorsichtiger",
          columns: ["Heikle Formulierung oder Darstellung", "Warum problematisch", "Vorsichtiger"],
          rows: [
            ["Nahaufnahmen schwerer Parodontitis", "Abstoßende Darstellungen sind nach § 11 HWG riskant und schrecken ab", "Grafiken oder eine ruhige Erklärung der Warnzeichen"],
            ["„Parodontitis verursacht Herzinfarkte“", "Überzeichnet Studien, die Zusammenhänge zeigen, keine einfache Ursache", "„Studien zeigen Zusammenhänge mit der Allgemeingesundheit — fragen Sie uns, was das für Sie bedeutet“"],
            ["„Sonst fallen Ihnen die Zähne aus“", "Arbeitet mit Angst und trifft nicht auf jeden zu", "„Unbehandelt können sich Zähne lockern — früh erkannt, lässt sich das oft gut behandeln“"],
            ["„Parodontitis endgültig heilen“", "Parodontitis braucht meist dauerhafte Nachsorge", "„Behandlung und regelmäßige Nachsorge können sie gut unter Kontrolle halten“"],
            ["„Schmerzfreie Parodontitis-Behandlung“", "Absolute Aussage über das Empfinden", "„Meist unter örtlicher Betäubung — wir erklären, was Sie erwartet“"],
          ],
        },
        after: [
          "Unser kostenfreier [Werbe-Check „Ist mein Post erlaubt?“](checker:) findet „schmerzfrei“, Garantien und ähnliche Aussagen in zehn Sprachen.",
        ],
      },
      {
        heading: "Wie bauen Sie ein Parodontitis-Video auf?",
        ordered: true,
        paragraphs: ["Dieselben fünf Schritte halten jedes Video ruhig und kurz:"],
        list: [
          "Mit dem Zeichen einsteigen, nicht mit der Krankheit: „Blut im Waschbecken beim Zähneputzen?“",
          "In einem Satz erklären: Bluten ist oft die Reaktion des Zahnfleischs auf Beläge am Zahnfleischrand.",
          "Die Gewohnheit: weiter sanft putzen, Zwischenräume reinigen, die Stelle nicht auslassen.",
          "Die Grenze: Blutet es länger als ein, zwei Wochen, gehört es untersucht.",
          "Die Einladung: „Vereinbaren Sie einen Termin, damit wir Ihr Zahnfleisch ansehen können.“",
        ],
      },
      {
        heading: "Wann passen Parodontitis-Videos in den Redaktionsplan?",
        paragraphs: [
          "Zahnfleischgesundheit passt in jeden Monat; Aktionstage rund um Mundgesundheit finden Sie im [Redaktionsplan für die Zahnarztpraxis](guide:redaktionsplan-social-media-zahnarztpraxis). Beginnen Sie eine Serie mit dem Video zum Zahnfleischbluten — darin erkennen sich die meisten wieder. Schicken Sie das Behandlungsvideo vor dem Termin und das Nachsorge-Video mit der Recall-Erinnerung.",
          "Parodontitis-Themen gleichen außerdem einen Feed aus, der stark von ästhetischen Behandlungen geprägt ist; die [Social-Media-Ideen für die Zahnarztpraxis](guide:social-media-zahnarztpraxis-ideen) zeigen einen ausgewogenen Monat.",
          "Für Zahnfleischthemen sind Dentalhygienikerinnen und ZMPs oft die überzeugendsten Gesichter. Ein kurzer Clip, in dem jemand aus Ihrem Team eine Interdentalbürste am Modell zeigt, wirkt glaubwürdiger als jede drastische Aufnahme.",
        ],
      },
      {
        heading: "Wie erklären Sie die Nachsorge, ohne zu drängen?",
        paragraphs: [
          "Nach einer Parodontitis-Behandlung entscheidet die Nachsorge über den langfristigen Erfolg — und genau hier springen viele Patienten ab. Ein kurzes Video kann erklären, warum: Zahnfleischtaschen lassen sich zu Hause nicht vollständig reinigen, und regelmäßige Kontrollen zeigen früh, ob sich etwas verändert. Formulieren Sie das als Information, nicht als Drohung.",
        ],
        list: [
          "Das Ziel benennen: das Erreichte erhalten und Veränderungen früh erkennen.",
          "Erklären, was bei einem Nachsorgetermin passiert: Messen, Reinigen, Pflegetipps.",
          "Den Abstand der Termine als individuelle Empfehlung der Praxis darstellen.",
          "Zur Frage einladen, statt mit Zahnverlust zu drohen.",
        ],
      },
      {
        heading: "So erstellt DentVideo Parodontitis-Videos",
        paragraphs: [
          "[DentVideo](landing:) plant Themen zur Zahnfleischgesundheit aus Ihren Leistungen in die wöchentlichen Videos ein, vertont und untertitelt sie in Ihren Farben und prüft jedes Skript vor der Freigabe auf angstmachende Formulierungen, überzeichnete Gesundheitsaussagen, „schmerzfrei“-Versprechen und fachliche Richtigkeit. Drastische Bilder gibt es nicht: Gezeigt werden nur Gegenstände. [Sehen Sie Ihre Live-Vorschau](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Darf die Praxis sagen, dass Parodontitis mit Diabetes oder Herzerkrankungen zusammenhängt?",
        a: "Vorsichtig. Studien zeigen Zusammenhänge zwischen Zahnfleischgesundheit und einigen Allgemeinerkrankungen, aber keine einfache Ursache-Wirkung-Beziehung. Sprechen Sie von Zusammenhängen und laden Sie zum Gespräch ein.",
      },
      {
        q: "Darf ich Fotos von Parodontitis zeigen?",
        a: "Klinische Fotos schwerer Befunde können abstoßend wirken und sind nach § 11 HWG riskant; stammen sie von Patienten, braucht es zudem eine Einwilligung. Grafiken oder eine klare Erklärung der Warnzeichen funktionieren meist besser.",
      },
      {
        q: "Wie oft sollte die Praxis über Zahnfleischgesundheit posten?",
        a: "Ein Video alle paar Wochen hält das Thema präsent, ohne den Feed zu dominieren. Kombinieren Sie es mit Prophylaxe-Themen wie der Reinigung der Zahnzwischenräume.",
      },
      {
        q: "Wer sollte in Parodontitis-Videos sprechen?",
        a: "Oft die Dentalhygienikerin oder ZMP, die die Patienten in der Nachsorge betreut. Ein vertrautes Gesicht macht den Recall-Termin greifbarer. Wer nicht vor die Kamera möchte, kann auch nur die Hände am Modell zeigen.",
      },
    ],
    sources: [HWG_11, HWG_3],
  },
  {
    locale: "de",
    slug: "wurzelbehandlung-aufklaerungsvideos-zahnarztpraxis",
    topic: "treatment-root-canal",
    category: "treatments",
    ...DATES,
    title: "Aufklärungsvideos zur Wurzelbehandlung: Ablauf, Angst, Mythen und Aussagen, die Sie vermeiden sollten",
    seoTitle: "Aufklärungsvideos zur Wurzelbehandlung",
    seoDescription: "Kurze Videos zur Wurzelbehandlung: Ablauf, warum oft eine Krone folgt, Nachsorge, Mythen — ohne absolute Versprechen und ohne Angstmache.",
    description: "Was Patienten zur Wurzelbehandlung fragen, sechs kurze Videos dazu, wie Sie mit Angst und Mythen umgehen und welche Aussagen in Beitragstexten heikel sind.",
    h1: "Aufklärungsvideos zur Wurzelbehandlung: was Sie zeigen und was Sie lassen sollten",
    intro:
      "Ein Aufklärungsvideo zur Wurzelbehandlung erklärt einen Teil der Behandlung — warum sie nötig ist, was auf dem Stuhl passiert, was danach zu erwarten ist, warum oft eine Krone folgt — in einem kurzen, ruhigen Clip. Die Wurzelbehandlung hat einen schlechteren Ruf, als viele Patienten sie hinterher beschreiben. Am meisten helfen deshalb Videos, die Mythen durch einfache Fakten ersetzen, ohne zu versprechen, dass niemand etwas spürt.",
    sections: [
      {
        heading: "Was fragen Patienten zur Wurzelbehandlung?",
        paragraphs: ["Die meisten Fragen entstehen aus Angst oder aus Geschichten, die Patienten gehört haben. Jede ist ein gutes kurzes Video:"],
        list: [
          "Warum brauche ich eine Wurzelbehandlung — reicht keine Füllung?",
          "Tut eine Wurzelbehandlung weh?",
          "Was passiert während der Behandlung genau?",
          "Wie viele Termine sind nötig?",
          "Warum brauche ich danach eine Krone?",
          "Was erwartet mich in den Tagen danach?",
          "Wäre es nicht einfacher, den Zahn zu ziehen?",
          "Stimmt es, dass wurzelbehandelte Zähne krank machen?",
        ],
      },
      {
        heading: "Welche Videos zur Wurzelbehandlung lohnen sich?",
        paragraphs: ["Diese sechs Videos begleiten von der Diagnose bis zur Nachsorge:"],
        table: {
          caption: "Sechs Videos zur Wurzelbehandlung und wo sie helfen",
          columns: ["Video", "Beantwortet", "Wo es am meisten hilft"],
          rows: [
            ["Warum eine Wurzelbehandlung?", "Entzündeter oder infizierter Zahnnerv — und das Ziel, den Zahn zu erhalten", "Social Media; Website"],
            ["Was auf dem Stuhl passiert", "Örtliche Betäubung, Kanäle reinigen, füllen und verschließen", "Nachricht vor dem Termin"],
            ["Ein Termin oder mehrere?", "Warum das vom Zahn und der Entzündung abhängt", "Nachricht vor dem Termin"],
            ["Warum oft eine Krone folgt", "Schutz für einen Seitenzahn nach der Behandlung", "Folgenachricht"],
            ["Die Tage danach", "Empfindlichkeit, auf der anderen Seite kauen, wann Sie anrufen sollten", "Nachsorge-Nachricht"],
            ["Mythen zur Wurzelbehandlung", "Verbreitete Geschichten und was die zahnmedizinischen Fachgesellschaften sagen", "Social Media"],
          ],
        },
      },
      {
        heading: "Welche Aussagen sind in Videos zur Wurzelbehandlung heikel?",
        paragraphs: [
          "„Schmerzfreie Wurzelbehandlung“ ist vermutlich die häufigste problematische Aussage in Zahnarzt-Beiträgen. Absolute Versprechen zum Empfinden des Patienten gelten als Erfolgsversprechen im Sinne von § 3 HWG. Einzelheiten im [Ratgeber zum Heilmittelwerbegesetz](guide:heilmittelwerbegesetz-zahnarzt-social-media).",
        ],
        table: {
          caption: "Formulierungen zur Wurzelbehandlung: heikel und vorsichtiger",
          columns: ["Heikle Formulierung", "Warum problematisch", "Vorsichtiger formuliert"],
          rows: [
            ["„Schmerzfreie Wurzelbehandlung“", "Absolutes Versprechen, das keine Praxis einhalten kann", "„Unter örtlicher Betäubung — viele Patienten empfinden es ähnlich wie eine Füllung“"],
            ["„Rettet Ihren Zahn für immer“", "Verspricht ein dauerhaftes Ergebnis", "„Ziel ist es, Ihren eigenen Zahn zu erhalten; mit guter Versorgung kann er lange halten“"],
            ["„Wurzelbehandlung oder Zahn weg!“", "Druck durch Angst", "„Die Alternative ist meist das Ziehen des Zahns; wir erklären beide Wege“"],
            ["Drastische Aufnahmen eines eröffneten Zahns", "Abstoßend; verstärkt die Angst, statt sie zu nehmen", "Grafik der Zahnschichten"],
            ["Patientenzitate wie „Ich habe nichts gespürt“", "Äußerungen Dritter — nach § 11 HWG riskant", "Die Betäubung in eigenen Worten erklären"],
          ],
        },
        after: [
          "Unser kostenfreier [Werbe-Check „Ist mein Post erlaubt?“](checker:) markiert „schmerzfrei“ und ähnliche Wörter, bevor Sie posten.",
        ],
      },
      {
        heading: "Wie nehmen Sie in einem kurzen Video die Angst?",
        paragraphs: [
          "Angst wächst in der Lücke zwischen dem, was Patienten sich vorstellen, und dem, was tatsächlich passiert. Ein gutes Video schließt diese Lücke: Es nennt die Sorge in der ersten Sekunde, beschreibt die Schritte in neutralen Worten und sagt, was der Patient tun kann, wenn er während der Behandlung etwas spürt (Hand heben, und es wird pausiert). Es verspricht nicht, dass man nichts spürt.",
          "Beim Mythen-Video ist Sorgfalt gefragt. Manche Patienten haben gelesen, wurzelbehandelte Zähne würden krank machen. Die zahnmedizinischen Fachgesellschaften sehen dafür nach heutigem Wissensstand keine Belege. Das können Sie sagen, eine seriöse Quelle verlinken und niemanden vorführen, der fragt.",
        ],
        ordered: true,
        list: [
          "Einstieg: „Wurzelbehandlung — das Schlimmste überhaupt? So läuft sie wirklich ab.“",
          "Ein Satz zum Warum: Das Innere des Zahns ist entzündet oder infiziert.",
          "Drei Schritte: betäuben, Kanäle reinigen, füllen und verschließen.",
          "Eine ehrliche Grenze: Der Zahn kann einige Tage empfindlich sein.",
          "Einladung: „Fragen Sie uns alles vor Ihrem Termin.“",
        ],
      },
      {
        heading: "Wo helfen Videos zur Wurzelbehandlung am meisten?",
        paragraphs: [
          "Eher außerhalb von Social Media. Der wichtigste Moment ist die Terminbestätigung: Eine Erklärung von 40 Sekunden, die der Patient zu Hause ansehen kann, nimmt Angst und beugt Absagen vor. Das Nachsorge-Video gehört in die Nachricht am Behandlungstag. Auf Social Media funktionieren das Mythen-Video und das Warum-Video als Teil einer ausgewogenen Mischung — siehe [Social-Media-Ideen für die Zahnarztpraxis](guide:social-media-zahnarztpraxis-ideen) und [Patientenaufklärung per Video](guide:patientenaufklaerung-videos-zahnarztpraxis).",
        ],
      },
      {
        heading: "Was hilft Angstpatienten vor einer Wurzelbehandlung?",
        paragraphs: [
          "Für Angstpatienten ist schon der Weg in die Praxis eine Hürde. Ein Video, das sie in Ruhe zu Hause ansehen, nimmt einen Teil der Unsicherheit vorweg: Es zeigt, wie der Termin abläuft, wie lange er ungefähr dauert und dass jederzeit eine Pause möglich ist. Hilfreich ist auch ein Satz dazu, dass die Praxis Angst ernst nimmt und man sie beim Termin ansprechen darf.",
          "Vermeiden Sie dabei Floskeln wie „keine Sorge“: Sie verstärken die Sorge eher, als sie zu nehmen. Beschreiben Sie lieber konkret, was passiert, und wiederholen Sie das Handzeichen für eine Pause am Ende des Videos.",
        ],
      },
      {
        heading: "So erstellt DentVideo Videos zur Wurzelbehandlung",
        paragraphs: [
          "Bieten Sie Endodontie an, plant [DentVideo](landing:) Themen zur Wurzelbehandlung in Ihre wöchentlichen Videos ein, vertont und untertitelt in Ihrer Sprache und Ihren Farben. Jedes Skript wird vor der Freigabe auf „schmerzfrei“ und andere absolute Aussagen, Angstmache, Patientenstimmen und fachliche Richtigkeit geprüft; veröffentlicht wird nichts ohne Ihre Freigabe. [Sehen Sie Ihre Live-Vorschau mit Logo](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Darf eine Praxis sagen, dass eine Wurzelbehandlung nicht wehtut?",
        a: "Vermeiden Sie absolute Versprechen wie „schmerzfrei“. Sie können erklären, dass unter örtlicher Betäubung behandelt wird, dass viele Patienten es ähnlich wie eine Füllung empfinden und dass der Zahn danach einige Tage empfindlich sein kann.",
      },
      {
        q: "Sollte ein Video das Ziehen des Zahns als Alternative nennen?",
        a: "Ja. Die Möglichkeiten fair darzustellen gehört zur Aufklärung und macht das Video glaubwürdiger. Erklären Sie, dass die Entscheidung vom Zahn abhängt und nach der Untersuchung fällt.",
      },
      {
        q: "Wie reagiere ich auf Kommentare, Wurzelbehandlungen machten krank?",
        a: "Sachlich und ohne öffentliche Diskussion: Die Fachgesellschaften sehen dafür keine Belege, verlinken Sie eine seriöse Quelle und laden Sie die Person ein, ihre Sorgen in der Praxis zu besprechen.",
      },
    ],
    sources: [HWG_3, HWG_11],
  },
];
