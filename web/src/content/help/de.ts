import type { HelpContent } from "./types";

export const de: HelpContent = {
  meta: {
    title: "DentVideo Hilfe-Center: Antworten für Praxen",
    description: "Schritt-für-Schritt-Antworten für Praxen mit DentVideo: erste Videos, Freigabe, Posten, Einstellungen, Aufnahmen, Abrechnung, Rechnungen, Datenschutz und Konto.",
  },
  nav: "Hilfe",
  h1: "Wie können wir helfen?",
  lead: "Kurze Antworten für Praxen, die DentVideo nutzen: von der ersten Videowoche bis zu Rechnungen und Ihren Daten. Suchen Sie oder wählen Sie ein Thema.",
  search: {
    label: "Hilfe-Center durchsuchen",
    placeholder: "Zum Beispiel: kündigen, Rechnung, freigeben",
    none: "Zu dieser Suche passt keine Antwort. Versuchen Sie ein anderes Wort oder schreiben Sie uns.",
    count: { one: "1 Antwort", other: "{n} Antworten" },
  },
  topics: "Themen",
  categories: {
    start: "Erste Schritte",
    review: "Prüfen und freigeben",
    posting: "Videos posten",
    settings: "Die Videos Ihrer Praxis",
    recording: "Eigene Aufnahmen",
    billing: "Tarif, Abrechnung und Rechnungen",
    account: "Daten, Datenschutz und Konto",
  },
  readMore: "Mehr dazu:",
  shots: {
    setup: "Einstellungen: Angaben zur Praxis, Logo und Farbe.",
    week: "Videos: die Videos dieser Woche warten auf Ihre Freigabe.",
    card: "Ein Video mit „Bitte ansehen“ und dem Hinweis, was vor dem Posten zu prüfen ist.",
  },
  stuck: {
    title: "Noch Fragen offen?",
    body: "Schreiben Sie an {email}. Jede Nachricht liest ein Mensch. Schreiben Sie aus der App (Einstellungen → Hilfe & Kontakt), ist Ihre Praxis-ID schon eingetragen und wir finden Ihr Konto sofort.",
  },
  articles: {
    "first-videos": {
      q: "Wann kommen meine ersten Videos?",
      a: "Die Videos Ihrer ersten Woche entstehen direkt nach der Zahlung, meist in etwa 15 Minuten. Die Seite „Videos“ aktualisiert sich von selbst, und wir schicken Ihnen eine E-Mail, sobald die Videos zur Freigabe bereitstehen.\n\nDanach kommen jeden Montag fünf neue Videos, jedes Mal mit einer E-Mail.",
    },
    "no-videos-this-week": {
      q: "Die Videos dieser Woche sind noch nicht da. Was tun?",
      a: "Neue Videos entstehen jeden Montag. Sind die Videos dieser Woche noch nicht in Ihrer Bibliothek, tippen Sie auf der Seite „Videos“ auf „Videos dieser Woche erstellen“. Das dauert etwa 15 Minuten.\n\nSteht dort, dass sich die Videos verzögern, versuchen wir es bereits erneut und schreiben Ihnen, sobald sie fertig sind. Sie können auch auf „Jetzt erneut versuchen“ tippen.\n\nBei einem Video mit „Konnte nicht erstellt werden“ müssen Sie nichts tun. Passiert es wieder, schreiben Sie uns.",
    },
    topics: {
      q: "Wie werden die Themen gewählt, und kann ich eines vorschlagen?",
      a: "Jede Woche wählen wir fünf Themen aus den Leistungen in Ihren Einstellungen und den Fragen, die Patienten dazu stellen. Videos entstehen nur zu Leistungen, die Sie anbieten. Am wichtigsten ist deshalb eine vollständige, richtige Liste Ihrer Leistungen.\n\nUm ein Thema vorzuschlagen, nutzen Sie „Thema für nächste Woche vorschlagen“ auf der Seite „Videos“ oder in den Einstellungen: eine Patientenfrage oder ein Thema, bis zu 140 Zeichen. Wartende Vorschläge nutzen wir zuerst, bis zu drei pro Woche, wenn sie zu Ihren Leistungen passen und dieselben fachlichen und werberechtlichen Prüfungen bestehen wie jedes Video. Unter „Ihre Vorschläge“ sehen Sie, was aus jedem geworden ist; bei einem nicht umgesetzten steht der Grund. Unter „Themen, die wir nicht umgesetzt haben“ sehen Sie die übrigen ausgelassenen Themen.",

    },
    "sign-in": {
      q: "Ich kann mich nicht anmelden, oder der Code kommt nicht an.",
      a: "Sehen Sie im Spam- oder Werbung-Ordner nach E-Mails von {email} und markieren Sie sie als „kein Spam“, damit die nächsten ankommen. Ein Code gilt 15 Minuten; auf dem Anmeldebildschirm können Sie einen neuen anfordern.\n\nPasswort vergessen? Tippen Sie auf dem Anmeldebildschirm auf „Passwort vergessen?“. Kommt gar keine E-Mail an, schreiben Sie uns mit der Adresse, mit der Sie sich registriert haben.",
    },
    approve: {
      q: "Wie gebe ich ein Video frei?",
      a: "Ohne Ihre Freigabe wird nichts veröffentlicht, und die Freigabe markiert ein Video nur als bereit zum Posten. Wir posten nie für Sie.",
      steps: [
        "Öffnen Sie „Videos“ und tippen Sie auf „Ansehen und freigeben“.",
        "Sehen Sie jedes Video an und tippen Sie auf „Freigeben“, oder auf „Ablehnen“, wenn etwas nicht passt.",
        "Sind mehrere Videos bereit, geben Sie sie mit „Alle freigeben“ in einem Schritt frei. Videos mit „Bitte ansehen“ sind dabei nie eingeschlossen.",
      ],
    },
    "needs-a-look": {
      q: "Was bedeutet „Bitte ansehen“?",
      a: "Unsere Software-Prüfung hat in diesem Video etwas markiert, das Sie noch einmal lesen sollten, zum Beispiel eine Formulierung, die das Werberecht Ihres Landes streng sehen kann. Der Grund steht auf der Karte unter „Vor dem Posten bitte prüfen“.\n\nSehen Sie das Video mit diesem Grund im Kopf an. Passt es für Ihre Praxis, geben Sie es frei. Wenn nicht, lehnen Sie es mit einer kurzen Notiz ab. Ein markiertes Video wird nie ohne Sie freigegeben.",
    },
    "software-check": {
      q: "Was prüft die Software, und was nicht?",
      a: "Bevor Sie ein Skript sehen, prüft die Software es zweimal: einmal auf Aussagen, die das Heilmittelwerberecht häufig einschränkt (Erfolgsversprechen, „schmerzfrei“, „dauerhaft“, Superlative, Preise, Sonderangebote, Vorher-nachher-Versprechen, Patientenstimmen), und einmal gegen anerkannte fachliche Empfehlungen. Was durchfällt, wird umgeschrieben oder nicht erstellt; alles, was einen zweiten Blick verdient, wird mit Begründung markiert.\n\nDas ist eine automatische Prüfung, keine Rechtsberatung und keine Prüfung durch einen Anwalt oder Ihre Kammer. Die Regeln unterscheiden sich je nach Land und ändern sich, deshalb haben Sie das letzte Wort.",
    },
    responsibility: {
      q: "Wer ist für unsere Beiträge verantwortlich?",
      a: "Ihre Praxis. Sie geben jedes Video frei und posten es über Ihre eigenen Konten, deshalb bleiben Sie für das Veröffentlichte verantwortlich, auch nach dem Werberecht Ihres Landes.\n\nDie Software-Prüfung hilft, typische Probleme zu erkennen, ersetzt aber weder Ihr eigenes Urteil noch eine Rechtsberatung. Sind Sie bei einem Thema oder einer Formulierung unsicher, lehnen Sie das Video ab oder fragen Sie vor dem Posten Ihre Kammer.",
    },
    "wrong-video": {
      q: "Ein Video ist falsch. Was kann ich tun?",
      a: "Geben Sie es nicht frei: Ein nicht freigegebenes Video geht nirgendwohin. Tippen Sie auf „Ablehnen“, wählen Sie, was nicht stimmt, und schreiben Sie bei Bedarf eine Notiz. Die Notiz erreicht unser Team zusammen mit dem Video.\n\nSoll ein einzelnes Video geändert werden, tippen Sie auf seiner Karte auf „Änderung anfragen“ und schreiben Sie, was anders sein soll. Nur dieses Video wird mit denselben Prüfungen neu erstellt, und Sie geben es vor dem Posten erneut frei. Bis zu 3 Änderungen pro Woche sind möglich. Besteht die geänderte Fassung die Prüfungen nicht, bleibt Ihr bisheriges Video unverändert, und die Karte sagt es Ihnen. Für alle künftigen Videos (Logo, Farbe, Leistungen, Sprache, Stimme) nutzen Sie die Einstellungen.",

    },
    "background-photos": {
      q: "Kann ich die Hintergrundfotos eines Videos ändern?",
      a: "Ja. Öffnen Sie auf der Karte des Videos „Beitragstext und Hashtags · Hintergrundfotos“, tippen Sie ein bis vier Fotos an und dann „Übernehmen“. Das Video wird damit neu erstellt. Bis die neue Fassung fertig ist, zeigt die Karte „Fotos werden aktualisiert“.",
    },
    share: {
      q: "Wie poste ich ein Video?",
      a: "Klappt das Teilen auf Ihrem Gerät nicht, tippen Sie auf „Herunterladen“ und posten das Video wie gewohnt. DentVideo postet nie für Sie und fragt nie nach Passwörtern Ihrer Social-Media-Konten; betreut eine Agentur oder eine Kollegin Ihre Konten, geben Sie ihr die freigegebenen Videos.",
      steps: [
        "Öffnen Sie ein freigegebenes Video und tippen Sie auf „Posten“.",
        "Auf dem Handy tippen Sie auf „Video sichern + Text kopieren“: Das Video wird gespeichert, der Beitragstext mit Hashtags kopiert. Am Computer wird das Video stattdessen heruntergeladen.",
        "Öffnen Sie Instagram, TikTok, Facebook oder WhatsApp, wählen Sie das Video aus Ihrer Galerie und fügen Sie den Text ein.",
        "Tippen Sie danach in DentVideo auf „Als gepostet markieren“, damit Sie sehen, was noch fehlt.",
      ],
    },
    instagram: {
      q: "Wie poste ich ein Reel auf Instagram?",
      a: "Posten Sie über das Konto Ihrer Praxis. Der Beitragstext enthält schon Hashtags; Sie können ihn vor dem Teilen kürzen oder ändern.",
      steps: ["Tippen Sie in DentVideo auf „Posten“ und sichern Sie das Video mit seinem Text.", "Tippen Sie in Instagram auf + und wählen Sie Reel.", "Wählen Sie das Video aus Ihrer Galerie, fügen Sie den Text ein und teilen Sie es."],
    },
    "tiktok-shorts": {
      q: "Wie poste ich auf TikTok oder bei YouTube Shorts?",
      a: "Nehmen Sie unter „Posten“ den kürzeren Text „TikTok · Shorts“.\n\nTikTok: Tippen Sie auf +, wählen Sie das Video aus Ihrer Galerie, fügen Sie den Text ein und posten Sie.\n\nYouTube: Tippen Sie in der YouTube-App auf + und laden Sie das Video aus Ihrer Galerie hoch. Kurze Hochformat-Videos zeigt YouTube als Shorts. Fügen Sie den Text als Titel oder Beschreibung ein.",
    },
    facebook: {
      q: "Wie poste ich auf Facebook?",
      a: "Die Videos sind MP4-Dateien im Hochformat, das Format für Facebook-Reels.",
      steps: ["Wechseln Sie zur Seite Ihrer Praxis, nicht zu Ihrem privaten Profil.", "Erstellen Sie ein Reel und wählen Sie das Video.", "Fügen Sie den Text ein und teilen Sie es."],
    },
    "google-business": {
      q: "Kann ich die Videos in unserem Google-Unternehmensprofil zeigen?",
      a: "DentVideo ist nicht direkt mit Google verbunden, Sie können ein gesichertes Video aber selbst hochladen: Öffnen Sie Ihr Unternehmensprofil in der Google-Suche oder in Maps, fügen Sie ein Foto oder Video hinzu und wählen Sie die Datei.\n\nGoogle prüft Videos, bevor sie erscheinen, und nimmt nur kurze Clips an. Die aktuellen Grenzen stehen in Googles eigener Hilfe. Lehnt Google ein Video ab, teilen Sie es auf Ihren anderen Kanälen. Hashtags bewirken dort nichts, lassen Sie sie weg.",
    },
    "posting-times": {
      q: "Wann ist ein guter Zeitpunkt zum Posten?",
      a: "Jedes freigegebene Video zeigt einen vorgeschlagenen Tag und eine Uhrzeit. Wir verteilen die Videos der Woche auf Montag bis Freitag und wechseln zwischen Mittagszeit und Abend in Ihrem Land, wenn viele Menschen aufs Handy schauen.\n\nDas sind Vorschläge, keine Regeln: Regelmäßig zu posten zählt mehr als die genaue Minute. Ihre Instagram- oder TikTok-Statistik zeigt, wann Ihre eigenen Follower online sind.",
    },
    captions: {
      q: "Haben die Videos Untertitel? Sind sie barrierearm?",
      a: "Jedes Video zeigt seine Kernaussagen als Text im Bild, sodass man ihm auch ohne Ton folgen kann. Der Bildtext ist eine Kurzfassung dessen, was die Stimme sagt, keine wörtliche Abschrift.\n\nFür den vollständigen Sprechertext tippen Sie unter „Posten“ neben dem Video-Download auf „Untertitel herunterladen (.srt)“. Die Datei enthält genau die Worte der Stimme. Die Zeiten werden aus den Pausen der Sprachaufnahme berechnet; sie passen gut, aber nicht auf das Wort genau. Sehen Sie sie vor dem Hochladen einmal mit dem Video an. Videos, die vor den Untertiteldateien entstanden sind, und Clips aus Ihren eigenen Aufnahmen haben keine .srt-Datei (die Clips zeigen Ihre Worte bereits im Bild).\n\nBei YouTube und Facebook können Sie eine .srt-Datei mit dem Video hochladen, dort wo Untertitel angeboten werden. Instagram und TikTok nehmen keine Untertiteldatei: Die Kernaussagen stehen schon im Video, und beim Posten können Sie zusätzlich die automatischen Untertitel der App einschalten und mit dem Text aus der .srt-Datei korrigieren. Achten Sie darauf, dass kein Text doppelt erscheint.",

    },
    "other-uses": {
      q: "Dürfen wir die Videos auf unserer Website oder im Wartezimmer zeigen?",
      a: "Ja. Die für Ihre Praxis erstellten Videos dürfen Sie für die Kommunikation Ihrer Praxis nutzen, etwa auf Ihrer Website, in einem Newsletter oder auf einem Bildschirm im Wartezimmer. Heruntergeladene Videos dürfen Sie auch nach einer Kündigung weiter nutzen.\n\nManche Videos enthalten lizenziertes Stock-Material, das nur als Teil des Videos genutzt werden darf, nicht für sich allein.",
    },
    "logo-colors": {
      q: "Wie ändere ich Logo oder Markenfarbe?",
      a: "Ihre nächsten Videos verwenden das neue Logo und die neue Farbe. Bereits erstellte Videos behalten die bisherigen.",
      steps: [
        "Öffnen Sie die Einstellungen.",
        "Laden Sie unter „Logo und Farbe“ ein neues Logo hoch (ideal ist ein PNG mit transparentem Hintergrund, bis 5 MB) oder wählen Sie eine Farbe.",
        "Tippen Sie auf „Änderungen speichern“.",
      ],
    },
    language: {
      q: "Können wir die Sprache der Videos oder die Anrede der Patienten ändern?",
      a: "Ja, in den Einstellungen: „Sprache Ihrer Videos“ und „Wie Sie Patienten ansprechen“ (Sie oder du). Videos entstehen auf Englisch, Deutsch, Spanisch, Französisch, Italienisch, Portugiesisch, Türkisch, Japanisch, Arabisch und Polnisch.\n\nDie Änderung gilt für Ihre nächsten Videos. Auch die App wechselt in diese Sprache, sofern es sie dafür gibt.",
    },
    services: {
      q: "Warum sind die Leistungen in den Einstellungen so wichtig?",
      a: "Videos entstehen nur zu den Behandlungen unter „Ihre Leistungen“: Eine fehlende Behandlung bekommt nie ein Video, und eine, die Sie nicht anbieten, kommt nie vor. Trennen Sie die Leistungen mit Kommas oder nutzen Sie die Schnellauswahl.\n\nDie „Tonalität“ (herzlich, fachlich, ruhig oder locker) bestimmt, wie die Skripte geschrieben werden. Änderungen gelten für Ihre nächsten Videos.",
    },
    "narrator-voice": {
      q: "Können wir die Stimme im Video wählen?",
      a: "Ja. Wählen Sie in den Einstellungen unter „Stimme im Video“ eine weibliche oder männliche Stimme. Die Sprecherstimme ist eine synthetische Stimme in der Sprache Ihrer Videos, und das sagen wir offen.\n\nDie Wahl gilt für neue Videos; bereits erstellte behalten ihre Stimme. Möchten Sie Ihre eigene Stimme, macht der Tarif Practice aus Ihren Aufnahmen Clips.",
    },
    "closing-line": {
      q: "Was ist der Schlusssatz, und warum wurde meiner nicht angenommen?",
      a: "Ein optionaler, ruhiger Satz unter dem Text jedes Beitrags, zum Beispiel „Fragen zu Ihrem Zahnfleisch? Sprechen Sie uns bei Ihrer nächsten Kontrolle an.“ Bleibt das Feld leer, verwenden Ihre Beiträge unsere eigenen Schlusssätze.\n\nVor dem Speichern wird der Satz nach denselben Werberegeln geprüft wie die Videos. Er darf keine Erfolge versprechen, nicht drängen, kein Ausrufezeichen tragen, kein allgemeines „Kontaktieren Sie uns“ sein und nicht zur Terminbuchung lenken, wo Ihr Land das einschränkt. Der Hinweis unter dem Feld sagt, was zu ändern ist.",
    },
    record: {
      q: "Wie nehme ich mich selbst auf? (Tarif Practice)",
      a: "Wir schneiden Ihre Aufnahme in kurze Clips mit Untertiteln und Ihrem Logo, prüfen jeden Clip und schicken Ihnen eine E-Mail, wenn sie fertig sind, meist innerhalb von 10 Minuten. Ihre Worte werden nie verändert; was einen zweiten Blick verdient, wird markiert.\n\nDateien: MP4, MOV oder WebM, bis 500 MB. Aufnahmen gehören zum Tarif Practice; bei Starter zeigt die Seite „Aufnehmen“, wie Sie wechseln. Ist ein Patient zu sehen oder zu hören, brauchen Sie vorher seine dokumentierte Einwilligung.",
      steps: [
        "Öffnen Sie „Aufnehmen“ und wählen Sie eine der Drehkarten dieser Woche.",
        "Stellen Sie das Handy auf Augenhöhe nahe an ein Fenster und sprechen Sie die Karte durch, eine bis zehn Minuten.",
        "Wählen Sie das Video, tippen Sie auf „Hochladen und Clips erstellen“ und lassen Sie die Seite offen, bis das Hochladen fertig ist.",
      ],
    },
    plans: {
      q: "Was unterscheidet Starter und Practice, und wie wechseln wir?",
      a: "Beide enthalten jeden Montag fünf vertonte, untertitelte Videos, die Software-Prüfung sowie Ihr Logo und Ihre Farben. Practice macht zusätzlich Clips aus Ihren eigenen Aufnahmen, mit Drehkarten, die sagen, was Sie aufnehmen. Die aktuellen Preise stehen auf der Tarifseite in der App.\n\nZum Wechseln öffnen Sie Einstellungen → Tarif und Abrechnung → „Tarif wechseln“. Die Differenz für den Rest des Abrechnungszeitraums wird am selben Tag berechnet oder gutgeschrieben. Sehen Sie dort nur eine Karte „E-Mail schreiben“, schreiben Sie uns, wir stellen um.",
    },
    invoices: {
      q: "Wo finde ich Rechnungen und Belege?",
      a: "Die Zahlungen wickelt Dodo Payments als Merchant of Record ab: Dodo verkauft Ihnen das Abonnement, belastet Ihre Karte, führt die Steuern ab und stellt die Rechnung aus. Dieser Name steht auch auf Ihrer Kartenabrechnung.\n\nNach jeder Zahlung bekommen Sie einen Beleg per E-Mail, und unter Einstellungen → Tarif und Abrechnung → „Abrechnung verwalten“ laden Sie Rechnungen herunter. Da Dodo die Rechnung ausstellt, schickt DentVideo keine zweite.",
    },
    "update-card": {
      q: "Wie ändern wir die Karte, mit der wir zahlen?",
      a: "Öffnen Sie Einstellungen → Tarif und Abrechnung und tippen Sie auf „Abrechnung verwalten“. Die Karte ändern Sie im sicheren Portal unseres Zahlungsanbieters; Ihre vollständigen Kartendaten sehen wir nie.\n\nFehlt die Schaltfläche, schreiben Sie uns, wir schicken Ihnen einen sicheren Link. Senden Sie Kartendaten nie per E-Mail.",
    },
    "payment-failed": {
      q: "Die Zahlung ist fehlgeschlagen und die Videos sind pausiert. Was nun?",
      a: "Ihre Videos bleiben in Ihrer Bibliothek, und Sie können sie weiter teilen. Nur neue Wochenvideos pausieren, bis eine Zahlung durchgeht.\n\nTippen Sie auf der Seite „Videos“ oder in den Einstellungen auf „Zahlungsdaten aktualisieren“ oder auf „Sicheren Link per E-Mail anfordern“. Bitte kaufen Sie keinen neuen Tarif, sonst zahlen Sie doppelt. Sobald die Karte funktioniert, kommen Ihre Wochenvideos wieder.",
    },
    cancel: {
      q: "Wie kündigen wir?",
      a: "Die Tarife laufen monatlich, ohne Mindestlaufzeit. Öffnen Sie Einstellungen → Tarif und Abrechnung → „Abrechnung verwalten“ und kündigen Sie im Zahlungsportal, oder schreiben Sie uns, dann erledigen wir das.\n\nNach der Kündigung wird nichts mehr abgebucht, und Sie behalten den Zugang bis zum Ende des bezahlten Zeitraums. Ein begonnener Zeitraum wird nicht anteilig erstattet, außer das Gesetz verlangt es oder der Dienst hat versagt; Einzelheiten stehen in unserer Erstattungsrichtlinie.",
    },
    "after-cancel": {
      q: "Was passiert nach der Kündigung mit unseren Videos?",
      a: "Nach dem Ende des bezahlten Zeitraums entstehen keine neuen Videos. Ihre Bibliothek bleibt danach 90 Tage bestehen: Sie können Ihre Videos weiter ansehen, herunterladen und teilen, und die Seite „Videos“ zeigt das Datum. Wir schreiben Ihnen 14 Tage und 1 Tag vorher. Nach den 90 Tagen werden die Videos, Aufnahmen und Untertiteldateien gelöscht; Ihre Einstellungen und Ihr Logo bleiben erhalten.\n\nHeruntergeladene Videos dürfen Sie auch nach der Kündigung nutzen. Laden Sie also die herunter, die Sie behalten möchten, oder alles auf einmal unter Einstellungen → Ihre Daten → „Meine Daten herunterladen“. Wählen Sie vorher auf der Seite „Videos“ wieder einen Tarif, bleibt alles erhalten. Löschen Sie Ihr Konto, wird sofort alles entfernt.",

    },
    group: {
      q: "Wir haben einen zweiten Standort. Wie fügen wir ihn hinzu?",
      a: "Praxisgruppen und Praxen mit mehreren Standorten richten wir gemeinsam mit Ihnen ein, nicht in der App. Schreiben Sie uns Ihre Standorte, wir richten sie mit Ihnen ein. Der Preis gilt pro Standort.",
    },
    "patient-data": {
      q: "Dürfen wir Patientendaten oder Videos mit Patienten hochladen?",
      a: "DentVideo funktioniert ohne Patientendaten. Laden Sie bitte keine Patientenakten hoch und schicken Sie uns auch per E-Mail keine Patienteninformationen.\n\nZeigt oder nennt eine Aufnahme einen Patienten, brauchen Sie vor dem Hochladen seine ausdrückliche, dokumentierte Einwilligung. DentVideo ist nicht für geschützte Gesundheitsdaten nach dem US-Gesetz HIPAA ausgelegt.",
    },
    "privacy-dpa": {
      q: "Wie sind unsere Daten geschützt? Gibt es einen Auftragsverarbeitungsvertrag?",
      a: "Unsere Datenschutzerklärung nennt, was wir verarbeiten, welche Dienstleister es erhalten und wie lange es gespeichert wird. Für personenbezogene Daten in Ihren Uploads ist Ihre Praxis Verantwortliche und wir sind Auftragsverarbeiter, nach unserem Auftragsverarbeitungsvertrag, der Teil unserer Bedingungen ist.\n\nWir nutzen Ihre Uploads und Videos nicht zum Training von KI-Modellen und zeigen die Videos Ihrer Praxis keinen anderen Kunden.",
    },
    "export-data": {
      q: "Wie laden wir alle unsere Daten herunter?",
      a: "Öffnen Sie Einstellungen → Ihre Daten → „Meine Daten herunterladen“. Sie erhalten eine Datei mit Ihren Praxisangaben, Skript, Beitragstext und Prüfung jedes Videos sowie Download-Links für Ihre Videos, Aufnahmen und Ihr Logo. Die Links gelten 24 Stunden; laden Sie also bald herunter, was Sie brauchen.",
    },
    "delete-account": {
      q: "Wie löschen wir unser Konto?",
      a: "Öffnen Sie Einstellungen → Ihre Daten → „Konto löschen …“ und geben Sie zur Bestätigung den Namen Ihrer Praxis ein. Praxisangaben, Videos, Aufnahmen, Logo und Zugang werden sofort entfernt und können nicht wiederhergestellt werden. Laden Sie Ihre Daten vorher herunter, wenn Sie eine Kopie möchten.\n\nIst Ihr Tarif noch aktiv, sagt der Dialog, ob er gleichzeitig gekündigt wird oder ob Sie zuerst kündigen müssen. Unser Zahlungsanbieter bewahrt Rechnungen so lange auf, wie das Steuerrecht es verlangt, und Kopien in Sicherungen werden innerhalb von 30 Tagen überschrieben.",
    },
    "reminder-emails": {
      q: "Können wir die Erinnerungs-E-Mails abbestellen?",
      a: "Ja. Jede Erinnerung und jede Monatsübersicht hat unten einen Link „Abmelden“. E-Mails zu Ihrem Konto, zu Zahlungen und zu fertigen Videos kommen weiterhin, weil sie zum Dienst gehören.",
    },
  },
};
