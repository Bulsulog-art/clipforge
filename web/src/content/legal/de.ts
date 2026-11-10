import type { LegalText } from "./types";

/** Deutsch. Übersetzung; maßgeblich ist die englische Fassung (das Impressum ist deutschsprachig). */
export const DE: LegalText = {
  ui: {
    updated: "Zuletzt aktualisiert",
    prevails: "Dies ist eine Übersetzung. Rechtlich maßgeblich ist die {english}; bei Abweichungen geht sie vor.",
    englishVersion: "englische Fassung",
    country: "Montenegro",
    operator: {
      company: "Unternehmen",
      legalForm: "Rechtsform",
      legalFormValue: "Gesellschaft mit beschränkter Haftung nach montenegrinischem Recht",
      office: "Sitz und Anschrift",
      register: "Register",
      registerValue: "Zentrales Register der Wirtschaftssubjekte (CRPS), Montenegro",
      registrationNumber: "Registernummer",
      taxId: "Steuernummer (PIB)",
      director: "Geschäftsführer",
      contact: "E-Mail",
      brand: "Marke",
      brandValue: "{brand} — Produkt: DentVideo",
    },
    table: { provider: "Anbieter", purpose: "Zweck", data: "Daten", location: "Standort" },
  },

  subprocessors: {
    hostinger: {
      purpose: "Virtueller Server, auf dem dentvideo.com, die Video-Verarbeitung, unsere Datenbank, Logins und Dateiablage laufen (unsere eigene Installation der Open-Source-Software Supabase).",
      data: "Alle Dienstdaten: Konto, Praxisprofil, Uploads, Videos, Abrechnungsreferenzen, Logs.",
      location: "Standort des Rechenzentrums wird noch bestätigt; diese Liste wird aktualisiert.",
    },
    openai: {
      purpose: "Schreibt und prüft Skripte, erzeugt die synthetische Sprecherstimme und transkribiert hochgeladene Aufnahmen, wenn unser eigener Transkriptionsdienst nicht verfügbar ist.",
      data: "In Skripten verwendete Praxisangaben, Skripttext, Tonspur von Aufnahmen (zur Transkription).",
      location: "USA",
    },
    resend: {
      purpose: "Versand von Service-E-Mails (Bestätigungscodes, „Ihre Videos sind fertig“, Zahlungshinweise).",
      data: "E-Mail-Adresse, Praxisname, Inhalt der E-Mail.",
      location: "USA",
    },
    dodo: {
      purpose: "Checkout, Abonnements, Rechnungen, Steuern und Erstattungen als Händler (Merchant of Record). Für Zahlungsdaten ist Dodo Payments eigenständiger Verantwortlicher.",
      data: "E-Mail-Adresse, Name und Rechnungsangaben, Zahlungsdaten, Abostatus.",
      location: "Siehe Datenschutzerklärung von Dodo Payments",
    },
  },

  docs: {
    terms: {
      title: "Nutzungsbedingungen",
      description: "Die Bedingungen für DentVideo, den Dienst für Patientenaufklärungsvideos für Zahnarztpraxen, betrieben von BLS AI Automation DOO (Bulsu Labs), Podgorica, Montenegro.",
      intro: [
        "Diese Bedingungen sind der Vertrag zwischen {legalName} („wir“), die DentVideo unter der Marke {brand} betreibt, und der Praxis oder Fachperson, die ein DentVideo-Konto anlegt („Sie“). Mit dem Anlegen eines Kontos oder der Zahlung eines Tarifs akzeptieren Sie sie. Wenn Sie sie für eine Praxis akzeptieren, bestätigen Sie, dass Sie diese Praxis vertreten dürfen.",
        "Wir haben sie in einfacher Sprache geschrieben. Wenn etwas unklar ist, schreiben Sie vor dem Abschluss an {email}.",
      ],
      sections: [
        { heading: "1. Wer wir sind", blocks: [{ operator: true }] },
        {
          heading: "2. Nur für Unternehmen",
          blocks: [
            "DentVideo ist ein Werkzeug für Zahnarztpraxen und zahnmedizinische Fachleute. Es wird nur Unternehmen und Fachleuten angeboten, die für ihre Praxis handeln, nicht Verbrauchern oder Patienten. Mit der Nutzung bestätigen Sie, dass Sie in Ausübung Ihrer gewerblichen oder beruflichen Tätigkeit handeln.",
          ],
        },
        {
          heading: "3. Der Dienst",
          blocks: [
            "DentVideo erstellt kurze, vertonte und untertitelte Aufklärungsvideos für Zahnarztpraxen. Jede Woche plant es Themen aus Ihren Leistungen, schreibt Skripte, vertont sie mit einer synthetischen Stimme, rendert die Videos mit Name, Farben und Logo Ihrer Praxis und prüft sie automatisch auf Formulierungen, die in der Heilmittelwerbung problematisch sind, und auf fachliche Plausibilität. In Tarifen, die das enthalten, macht es aus hochgeladenen Aufnahmen kurze untertitelte Clips.",
            "DentVideo ist kein Medizinprodukt und erteilt keine medizinische, rechtliche oder regulatorische Beratung.",
          ],
        },
        {
          heading: "4. Sie geben alles frei, bevor es veröffentlicht wird",
          blocks: [
            "Nichts, was DentVideo erstellt, wird automatisch veröffentlicht, und DentVideo postet nicht in sozialen Netzwerken. Sie entscheiden, ob Sie ein Video freigeben, herunterladen und teilen, und Sie sind Herausgeber dessen, was Sie teilen.",
            "Unsere Prüfungen sind eine Hilfe, keine Garantie. Skripte werden von KI-Modellen geschrieben und geprüft und können Fehler enthalten. Vor der Veröffentlichung sind Sie dafür verantwortlich, dass jedes Video für Ihre Praxis zutrifft und die für Sie geltenden Regeln einhält: Berufsordnung, Heilmittelwerberecht und Plattformregeln.",
          ],
        },
        {
          heading: "5. Ihr Konto",
          blocks: [
            "Machen Sie richtige Angaben zu Ihrer Praxis und halten Sie Ihre Zugangsdaten geheim. Sie sind für alles verantwortlich, was unter Ihrem Konto geschieht. Melden Sie sich unter {email}, wenn Sie vermuten, dass jemand anderes es genutzt hat.",
          ],
        },
        {
          heading: "6. Tarife, Preise und Zahlung",
          blocks: [
            "DentVideo wird im Voraus bezahlt; es gibt keine kostenlose Testphase. Vor der Zahlung sehen Sie eine Live-Vorschau von Videos mit Name, Farben und Logo Ihrer Praxis. Aktuelle Tarife in US-Dollar:",
            {
              list: [
                "Starter: {starter} pro Monat.",
                "Practice: {practice} pro Monat oder {practiceYear} pro Jahr.",
                "Group (Praxisgruppen und Praxen mit mehreren Standorten): individuelle Bedingungen nach Vereinbarung — Kontakt {email}. Group kann nicht auf der Website gekauft werden.",
                "Gründungsangebot: Practice monatlich für {foundingPrice} pro Monat in Ihren ersten {foundingMonths} Monaten, nur für die ersten {foundingClinics} Praxen. Nach diesen {foundingMonths} Monaten läuft das Abonnement zum regulären Practice-Preis von {practice} pro Monat weiter, sofern Sie nicht kündigen. Das Angebot endet, sobald {foundingClinics} Praxen es genutzt haben.",
              ],
            },
            "Zahlungen wickelt Dodo Payments ab, das als Händler (Merchant of Record) und autorisierter Wiederverkäufer handelt: Es verkauft Ihnen das Abonnement, belastet Ihr Zahlungsmittel, erscheint auf Ihrer Kartenabrechnung, berechnet und erhebt anfallende Steuern und stellt Ihre Rechnung aus. Für den Kauf gelten zusätzlich die Käuferbedingungen von Dodo Payments. Wir sehen Ihre vollständigen Kartendaten nie.",
            "Abonnements verlängern sich am Ende jedes Abrechnungszeitraums (monatlich oder jährlich) automatisch, bis sie gekündigt werden. Schlägt eine Zahlung fehl, können wir neue Videos pausieren, bis sie geklärt ist.",
            "Wir können Listenpreise ändern. Wir informieren Sie mindestens 30 Tage vorher per E-Mail; ein neuer Preis gilt erst ab Ihrer nächsten Verlängerung nach dieser Mitteilung.",
          ],
        },
        {
          heading: "7. Kündigung und Erstattungen",
          blocks: [
            "Sie können jederzeit kündigen; die Kündigung wird zum Ende des bezahlten Zeitraums wirksam, bis dahin behalten Sie den Zugang. Zahlungen für einen begonnenen Zeitraum werden nicht anteilig erstattet, außer wenn das Gesetz es verlangt oder der Dienst versagt hat. Einzelheiten stehen in unserer [Erstattungsrichtlinie](refunds), die Teil dieser Bedingungen ist.",
          ],
        },
        {
          heading: "8. Ihre Inhalte und Patientendaten",
          blocks: [
            "Alle Rechte an dem, was Sie hochladen (Logo, Praxisangaben, Aufnahmen), bleiben bei Ihnen. Sie erlauben uns, diese Inhalte nur zum Betrieb von DentVideo für Sie zu speichern und zu verarbeiten, einschließlich der Weitergabe an die in unserer [Datenschutzerklärung](privacy) genannten Anbieter.",
            "Sie bestätigen, dass Sie das Hochgeladene nutzen dürfen und dass alle Personen, die in einer Aufnahme zu sehen oder zu hören sind, eingewilligt haben.",
            "DentVideo ist so gebaut, dass es ohne Patientendaten funktioniert. Laden Sie keine Patientenakten hoch. Zeigt oder nennt eine Aufnahme einen Patienten, brauchen Sie dessen ausdrückliche, dokumentierte Einwilligung. Für personenbezogene Daten in Ihren Uploads sind Sie Verantwortlicher und wir Ihr Auftragsverarbeiter nach unserem [Auftragsverarbeitungsvertrag](dpa), der Teil dieser Bedingungen ist.",
            "DentVideo ist nicht dafür ausgelegt, als „Business Associate“ im Sinne von HIPAA zu handeln, und darf nicht zur Speicherung oder Verarbeitung von geschützten Gesundheitsdaten nach US-Recht genutzt werden.",
          ],
        },
        {
          heading: "9. Was Sie erhalten",
          blocks: [
            "Die für Ihre Praxis erstellten Videos, Skripte und Untertitel dürfen Sie für die Kommunikation Ihrer Praxis nutzen, für alles Heruntergeladene auch nach einer Kündigung.",
            "Manche Videos enthalten Stock-Aufnahmen von Pexels (unter der Pexels-Lizenz) und eine synthetische Stimme. Sie dürfen diese als Teil der Videos nutzen, aber nicht gesondert (etwa die Aufnahmen herauslösen und weiterverkaufen).",
            "Wir nutzen Ihre Uploads und Videos nicht zum Training von KI-Modellen und zeigen die Videos Ihrer Praxis keinen anderen Kunden.",
            "DentVideo selbst (Software, Design, Vorlagen und Marke) bleibt unser Eigentum.",
          ],
        },
        {
          heading: "10. Zulässige Nutzung",
          blocks: [
            "Nutzen Sie DentVideo nicht für irreführende, rechtswidrige oder Behandlungserfolge versprechende Inhalte, und versuchen Sie nicht, den Dienst zu stören, zu überlasten, zu kopieren oder weiterzuverkaufen oder auf Daten anderer Praxen zuzugreifen.",
            "Wir können ein Konto sperren oder schließen, das gegen diese Bedingungen verstößt. Wo möglich, informieren wir Sie vorher und geben Ihnen Gelegenheit zur Abhilfe.",
          ],
        },
        {
          heading: "11. Verfügbarkeit und Änderungen",
          blocks: [
            "Wir arbeiten daran, Ihre Videos jede Woche zu liefern, können aber nicht zusichern, dass der Dienst immer verfügbar oder fehlerfrei ist. Die wöchentliche Lieferung kann sich verzögern, etwa durch einen Ausfall bei einem unserer Anbieter.",
            "Wir entwickeln DentVideo laufend weiter und können die Funktionsweise ändern. Entfernen wir etwas Wesentliches aus Ihrem Tarif, sagen wir es vorher, und Sie können kündigen.",
          ],
        },
        {
          heading: "12. Haftung",
          blocks: [
            "Nichts in diesen Bedingungen beschränkt eine Haftung, die gesetzlich nicht beschränkt werden kann, etwa für Vorsatz oder grobe Fahrlässigkeit.",
            "Im Übrigen haften wir nicht für mittelbare Schäden oder Folgeschäden (etwa entgangenen Gewinn, verlorene Patienten oder Rufschäden), und unsere Gesamthaftung für alle Ansprüche ist auf den Betrag begrenzt, den Sie uns in den 12 Monaten vor Entstehung des Anspruchs gezahlt haben.",
            "Da Sie jedes Video freigeben und veröffentlichen, sind Sie für Ansprüche aus von Ihnen veröffentlichten Inhalten verantwortlich, einschließlich Beanstandungen nach dem Heilmittelwerberecht.",
          ],
        },
        {
          heading: "13. Vertragsende",
          blocks: [
            "Sie können den Vertrag beenden, indem Sie Ihren Tarif kündigen und Ihr Konto in den Einstellungen löschen. Wir können ihn mit 30 Tagen Frist beenden oder sofort nach Abschnitt 10. Wird ein Konto gelöscht, löschen wir seine Daten wie in der [Datenschutzerklärung](privacy) beschrieben.",
          ],
        },
        {
          heading: "14. Änderungen dieser Bedingungen",
          blocks: [
            "Wir können diese Bedingungen ändern. Über wesentliche Änderungen informieren wir Sie mindestens 30 Tage vor ihrem Inkrafttreten per E-Mail. Nutzen Sie DentVideo danach weiter, gelten die neuen Bedingungen; wenn Sie sie nicht akzeptieren, können Sie vorher kündigen.",
          ],
        },
        {
          heading: "15. Anwendbares Recht und Gerichtsstand",
          blocks: [
            "Es gilt das Recht Montenegros; zuständig sind die Gerichte in Podgorica. Dies nimmt Ihnen keinen Schutz, den Ihnen das zwingende Recht des Landes gewährt, in dem Sie ansässig sind, und der nicht durch Vereinbarung ausgeschlossen werden kann.",
            "Maßgeblich ist der englische Text dieser Bedingungen. Übersetzungen dienen der Verständlichkeit; bei Abweichungen geht die englische Fassung vor.",
          ],
        },
        { heading: "16. Kontakt", blocks: ["Fragen zu DentVideo: {email}. Unternehmensangelegenheiten: {companyEmail}."] },
      ],
    },

    privacy: {
      title: "Datenschutzerklärung",
      description: "Welche personenbezogenen Daten DentVideo verarbeitet, warum, welche Anbieter sie erhalten, wie lange sie gespeichert werden und welche Rechte Sie haben.",
      intro: [
        "Diese Erklärung beschreibt, welche personenbezogenen Daten {legalName} („wir“) verarbeitet, wenn eine Praxis DentVideo nutzt oder jemand dentvideo.com besucht, warum, wer sie außerdem erhält und wie lange wir sie aufbewahren.",
        "DentVideo funktioniert ohne Patientendaten. Patienten nutzen DentVideo nicht, und wir bitten Praxen, nichts hochzuladen, was einen Patienten ohne dessen Einwilligung erkennbar macht.",
      ],
      sections: [
        {
          heading: "1. Verantwortlicher",
          blocks: [
            "Verantwortlich für Konto-, Abrechnungs- und Websitedaten ist:",
            { operator: true },
            "Für Aufnahmen und andere Inhalte, die eine Praxis hochlädt, entscheidet die Praxis, was und wozu: Sie ist Verantwortliche, und wir verarbeiten diese Daten in ihrem Auftrag nach unserem [Auftragsverarbeitungsvertrag](dpa).",
            "Fragen und Anfragen zum Datenschutz: {email}.",
          ],
        },
        {
          heading: "2. Welche Daten wir erheben",
          blocks: [
            {
              list: [
                "Konto: Ihre E-Mail-Adresse und Ihr Login (wir speichern einen Passwort-Hash, nie das Passwort) sowie, ob Ihre E-Mail-Adresse bestätigt ist.",
                "Praxisprofil: Praxisname, Ort und Land, Sprache, angebotene Behandlungen, Tonalität, Social-Media-Name, Buchungslink, Markenfarben und Logo.",
                "Hochgeladene Aufnahmen (in Tarifen, die sie enthalten): Video und Ton mit Stimme und Bild der aufgenommenen Personen sowie ein Transkript.",
                "Was wir für Sie erstellen: Themen, Skripte, Untertitel, Vertonung, gerenderte Videos, Prüfergebnisse und Ihre Freigaben.",
                "Abrechnung: Tarif, Abostatus, Verlängerungsdatum und die Abo-, Kunden- und Zahlungsreferenzen von Dodo Payments. Kartendaten verarbeitet Dodo Payments; sie erreichen uns nie.",
                "E-Mails: welche Service-E-Mails wir an Ihre Praxis gesendet haben und ob Sie Erinnerungen abbestellt haben.",
                "Nutzungsereignisse: eine kleine eigene Aufzeichnung von Schritten wie „Startseite angesehen“ oder „Tarif gewählt“, mit Seitensprache, Kampagnen-Tags (utm) und dem Host der verweisenden Website. Sie enthalten keine Cookie-ID, keine IP-Adresse, keine Browserdaten und keinen Namen oder E-Mail-Adresse.",
                "Technische Daten: Ihre IP-Adresse und Anfragedaten werden verarbeitet, um Seiten auszuliefern, den Dienst zu sichern und Missbrauch zu begrenzen (kurzlebige Zähler für Ratenbegrenzung).",
              ],
            },
          ],
        },
        {
          heading: "3. Cookies und Browserspeicher",
          blocks: [
            "Wir nutzen nur, was der Dienst braucht: Sitzungs-Cookies für die Anmeldung, ein Cookie für Ihre Sprache, ein Cookie für Ihren Fortschritt bei der Registrierung und kurzlebigen Browserspeicher während der Registrierung. Wir nutzen keine Werbe- oder Analyse-Cookies Dritter.",
          ],
        },
        {
          heading: "4. Zwecke und Rechtsgrundlagen",
          blocks: [
            {
              list: [
                "Bereitstellung von DentVideo nach unserem Vertrag mit Ihnen: Videos erstellen, Aufnahmen verarbeiten, sie in Ihrer Bibliothek zeigen und Sie per E-Mail informieren (Vertrag, Art. 6 Abs. 1 lit. b DSGVO).",
                "Zahlung und Verwaltung Ihres Abonnements (Vertrag).",
                "Sicherheit des Dienstes, Missbrauchsabwehr und Fehlerbehebung (berechtigte Interessen, Art. 6 Abs. 1 lit. f DSGVO).",
                "Verstehen, welche Seiten und Kanäle Praxen bringen, mit den anonymen Nutzungsereignissen oben (berechtigte Interessen).",
                "Erinnerungen an eine nicht abgeschlossene Registrierung, abbestellbar per Link (berechtigte Interessen).",
                "Erfüllung gesetzlicher Pflichten, etwa Buchhaltungs- und Steuerunterlagen (rechtliche Verpflichtung, Art. 6 Abs. 1 lit. c DSGVO).",
              ],
            },
            "Wir verkaufen keine personenbezogenen Daten, nutzen sie nicht für Werbung und trainieren mit Ihren Uploads oder Videos keine KI-Modelle.",
          ],
        },
        {
          heading: "5. Empfänger",
          blocks: [
            "Wir arbeiten mit wenigen Anbietern. Jeder erhält nur, was er für seine Aufgabe braucht:",
            { subprocessors: true },
            "Außerdem fragen wir allgemeine Suchbegriffe (etwa einen Behandlungsnamen und eine Sprache) bei den öffentlichen Suchvorschlägen von Google und in der Stock-Video-Bibliothek von Pexels ab. Diese Anfragen enthalten keine personenbezogenen Daten. Datenbank, Logins und Dateiablage laufen auf unserer eigenen Installation der Open-Source-Software Supabase auf unserem Server; Supabase Inc. erhält die Daten nicht.",
          ],
        },
        {
          heading: "6. Übermittlung in Drittländer",
          blocks: [
            "Wir haben unseren Sitz in Montenegro, außerhalb der EU/des EWR. Einige Anbieter verarbeiten Daten in anderen Ländern, auch in den USA. Wo das auf die Daten anwendbare Recht für eine solche Übermittlung eine Garantie verlangt, stützen wir uns auf einen Angemessenheitsbeschluss, soweit vorhanden, oder auf Standardvertragsklauseln (für das Vereinigte Königreich mit dem UK-Addendum) in unseren Verträgen mit diesen Anbietern.",
          ],
        },
        {
          heading: "7. Speicherdauer",
          blocks: [
            {
              list: [
                "Konto, Praxisprofil, Uploads und Videos: solange Ihr Konto besteht. Löschen Sie Ihr Konto in den Einstellungen, löschen wir Ihre Dateien, Videos, Ihr Praxisprofil und Ihre Abrechnungsreferenzen sofort aus unseren Live-Systemen, und Ihren Login, sofern Sie ihn nicht auch für eine andere App von {brand} nutzen. Kopien in Server-Backups werden überschrieben, wenn die Backups rotieren; spätestens 30 Tage nach der Löschung liegen bei uns keine DentVideo-Daten zu Ihrem Konto mehr vor, außer wie unten genannt. Gelöschte Konten stellen wir nicht aus Backups wieder her.",
                "Nutzungsereignisse: bleiben als anonyme Statistik; die Löschung Ihres Kontos entfernt ihre Verbindung zu Ihrer Praxis.",
                "Rechnungen und Zahlungsbelege: bewahrt Dodo Payments als Händler nach eigenen gesetzlichen Pflichten auf, und wir, soweit Buchhaltungs- und Steuerrecht es verlangen.",
                "Zähler für Ratenbegrenzung: Minuten bis Stunden.",
              ],
            },
          ],
        },
        {
          heading: "8. Ihre Rechte",
          blocks: [
            "Je nach anwendbarem Recht können Sie Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und eine Kopie in einem übertragbaren Format verlangen und einer auf berechtigte Interessen gestützten Verarbeitung widersprechen. Ihr Konto können Sie selbst in den Einstellungen löschen. Schreiben Sie an {email}; wir antworten innerhalb eines Monats.",
            "Sie können sich auch bei einer Datenschutzaufsichtsbehörde beschweren: in Montenegro bei der Agentur für den Schutz personenbezogener Daten und den freien Zugang zu Informationen; in der EU/im EWR bei der Behörde in Ihrem Land; im Vereinigten Königreich beim Information Commissioner's Office; in der Türkei bei der Datenschutzbehörde (KVKK).",
            "Wir wenden das montenegrinische Datenschutzrecht an und, soweit sie auf unsere Verarbeitung anwendbar sind, die Datenschutz-Grundverordnung der EU (DSGVO), die UK GDPR und das türkische Gesetz Nr. 6698 zum Schutz personenbezogener Daten (KVKK).",
          ],
        },
        {
          heading: "9. Sicherheit",
          blocks: [
            "Verbindungen sind verschlüsselt (HTTPS). Die Daten jeder Praxis sind in der Datenbank durch Zugriffsregeln getrennt, Dateien werden nur über kurzlebige signierte Links ausgeliefert, und Zugriff auf die Server haben nur die Personen, die DentVideo betreiben. Kein System ist vollkommen sicher; betrifft eine Datenpanne Ihre Daten, informieren wir Sie unverzüglich.",
          ],
        },
        { heading: "10. Kinder", blocks: ["DentVideo ist ein Dienst für Unternehmen und nicht für Personen unter 18 Jahren bestimmt."] },
        {
          heading: "11. Änderungen",
          blocks: [
            "Wir aktualisieren diese Erklärung, wenn sich ändert, was wir tun, und ändern das Datum oben. Über wesentliche Änderungen informieren wir Kontoinhaber per E-Mail.",
          ],
        },
      ],
    },

    refunds: {
      title: "Erstattungsrichtlinie",
      description: "Wie Kündigung und Erstattungen bei DentVideo-Abonnements funktionieren, einschließlich des Gründungsangebots.",
      intro: ["Diese Richtlinie ist Teil unserer [Nutzungsbedingungen](terms). Kurz gesagt: jederzeit kündbar, Zugang bis zum Ende des bezahlten Zeitraums, und wenn der Dienst versagt hat, machen wir es wieder gut."],
      sections: [
        {
          heading: "1. Kündigen",
          blocks: [
            "Sie können jederzeit in den Einstellungen (Abrechnung verwalten) oder per E-Mail an {email} kündigen. Die Kündigung stoppt die nächste Verlängerung; sie wird zum Ende des bereits bezahlten Monats- oder Jahreszeitraums wirksam, bis dahin behalten Sie vollen Zugang. Heruntergeladene Videos bleiben Ihre. Das Löschen Ihres Kontos kündigt das Abonnement ebenfalls, und zwar sofort.",
          ],
        },
        {
          heading: "2. Keine anteiligen Erstattungen",
          blocks: [
            "Den ungenutzten Teil eines begonnenen Zeitraums (monatlich oder jährlich) erstatten wir nicht, außer wenn das Gesetz eine Erstattung verlangt oder der Dienst wie unten beschrieben versagt hat. Wechseln Sie den Tarif, wird die Differenz für den Rest des laufenden Zeitraums sofort berechnet oder gutgeschrieben.",
          ],
        },
        {
          heading: "3. Wenn der Dienst versagt hat",
          blocks: [
            "Wurden durch einen Fehler auf unserer Seite die Videos einer Woche nicht geliefert oder waren nicht nutzbar, melden Sie es innerhalb von 14 Tagen an {email}. Wir erstellen die Videos dieser Woche dann neu oder erstatten den Anteil Ihrer Zahlung für diesen Zeitraum, nach unserer Wahl. Verzögerungen von wenigen Tagen durch einen Ausfall bei einem unserer Anbieter oder Videos, die Sie aus Geschmacksgründen ablehnen, gelten nicht als Versagen.",
          ],
        },
        {
          heading: "4. Gründungsangebot",
          blocks: [
            "Das Gründungsangebot gibt den ersten {foundingClinics} Praxen den Practice-Tarif für {foundingPrice} pro Monat für {foundingMonths} Monate, monatlich bezahlt. Nach diesen {foundingMonths} Monaten läuft dasselbe Abonnement zum regulären Practice-Preis von {practice} pro Monat weiter, sofern Sie nicht kündigen. Der Gründungspreis ist an dieses Abonnement gebunden: Kündigen Sie, endet er und ist möglicherweise nicht erneut verfügbar.",
          ],
        },
        {
          heading: "5. Wie Erstattungen gezahlt werden",
          blocks: [
            "Dodo Payments ist bei jedem DentVideo-Kauf Händler (Merchant of Record); Erstattungen zahlt daher Dodo Payments auf das ursprüngliche Zahlungsmittel, einschließlich der auf den erstatteten Betrag erhobenen Steuer. Wenden Sie sich zuerst an uns unter {email}; Sie können sich nach den Käuferbedingungen auch an Dodo Payments wenden. Bis Ihre Bank die Erstattung anzeigt, kann es einige Tage dauern.",
          ],
        },
        {
          heading: "6. Ihre gesetzlichen Rechte",
          blocks: [
            "DentVideo wird an Unternehmen und Fachleute verkauft. Wo zwingendes Recht Ihnen dennoch ein Widerrufs- oder Erstattungsrecht gibt, gilt es zusätzlich zu dieser Richtlinie.",
          ],
        },
      ],
    },

    dpa: {
      title: "Auftragsverarbeitungsvertrag",
      description: "Der Auftragsverarbeitungsvertrag von DentVideo nach Art. 28 DSGVO: was wir für Praxen verarbeiten, wie, und die Liste der Unterauftragsverarbeiter.",
      intro: [
        "Dieser Auftragsverarbeitungsvertrag („AVV“) ist Teil der [Nutzungsbedingungen](terms) zwischen der Praxis („Verantwortlicher“) und {legalName} („Auftragsverarbeiter“). Er gilt, wann immer Inhalte, die die Praxis in DentVideo einstellt, personenbezogene Daten enthalten, für die die Praxis Verantwortlicher ist. Er kommt mit der Annahme der Nutzungsbedingungen zustande; eine Unterschrift ist nicht nötig. Auf Wunsch stellen wir ihn auch unterzeichnet zur Verfügung.",
      ],
      sections: [
        { heading: "1. Auftragsverarbeiter", blocks: [{ operator: true }] },
        {
          heading: "2. Gegenstand, Art und Zweck",
          blocks: [
            "Wir verarbeiten die personenbezogenen Daten der Praxis nur, um DentVideo bereitzustellen: Uploads speichern, Aufnahmen transkribieren, Videos schreiben, vertonen und rendern, Prüfungen durchführen, Ergebnisse in der Bibliothek der Praxis zeigen und Service-E-Mails senden. Die Verarbeitung dauert, solange die Praxis DentVideo nutzt, zuzüglich der Löschfrist in Abschnitt 9.",
            {
              list: [
                "Betroffene Personen: Zahnärzte und Mitarbeitende der Praxis; Personen, die in von der Praxis hochgeladenen Aufnahmen zu sehen oder zu hören sind; Patienten nur, wenn die Praxis Inhalte hochlädt, die sie erkennbar machen.",
                "Datenkategorien: Namen, E-Mail-Adressen, Bild und Stimme, Transkripte, Angaben im Praxisprofil. Gesundheitsdaten braucht DentVideo nicht; sie werden nur verarbeitet, wenn die Praxis sie hochlädt — dann ist die Praxis für eine Rechtsgrundlage und die ausdrückliche Einwilligung des Patienten verantwortlich.",
              ],
            },
          ],
        },
        {
          heading: "3. Weisungen",
          blocks: [
            "Wir verarbeiten die Daten nur auf dokumentierte Weisung der Praxis — das sind die Nutzungsbedingungen, dieser AVV und die Nutzung der Einstellungen des Dienstes —, sofern das Recht nichts anderes verlangt; dann informieren wir die Praxis vorher, soweit das Recht es nicht verbietet. Halten wir eine Weisung für datenschutzwidrig, teilen wir das der Praxis mit.",
          ],
        },
        { heading: "4. Vertraulichkeit", blocks: ["Alle bei {shortName}, die auf die Daten zugreifen können, sind zur Vertraulichkeit verpflichtet."] },
        {
          heading: "5. Technische und organisatorische Maßnahmen",
          blocks: [
            {
              list: [
                "Transportverschlüsselung (HTTPS) für jede Verbindung zur Website, zur App und zu unserer Datenbank.",
                "Trennung der Daten jeder Praxis durch Zugriffsregeln in der Datenbank; eine Praxis kann nur ihre eigenen Zeilen und Dateien lesen.",
                "Auslieferung von Dateien nur über kurzlebige signierte Links; Uploads nach Typ und Größe begrenzt.",
                "Zugänge zu Servern und Anbietern nur für die Personen, die DentVideo betreiben.",
                "Raten- und Ausgabenlimits für jeden kostenpflichtigen Verarbeitungsschritt.",
                "Selbstständige Kontolöschung, die die Daten der Praxis entfernt, wie in Abschnitt 9 beschrieben.",
              ],
            },
          ],
        },
        {
          heading: "6. Unterauftragsverarbeiter",
          blocks: [
            "Die Praxis erteilt eine allgemeine Genehmigung für die unten genannten Unterauftragsverarbeiter. Wir erlegen jedem von ihnen Datenschutzpflichten auf, die nicht weniger schützen als dieser AVV, soweit ihre Standardbedingungen es zulassen, und bleiben für sie verantwortlich.",
            { subprocessors: true },
            "Wir informieren die Praxis mindestens 30 Tage per E-Mail, bevor wir einen Unterauftragsverarbeiter hinzufügen oder ersetzen. Widerspricht die Praxis aus berechtigten Datenschutzgründen und finden wir keine Lösung, kann sie kündigen, und wir erstatten vorausbezahlte Entgelte für den Zeitraum nach der Änderung.",
            "Keine Unterauftragsverarbeiter: Supabase ist Open-Source-Software, die wir selbst auf dem oben genannten Server betreiben (Supabase Inc. erhält keine Daten). Die Suchvorschläge von Google und die Stock-Video-Bibliothek von Pexels erhalten nur allgemeine Suchbegriffe, nie personenbezogene Daten. Dodo Payments handelt für Zahlungsdaten als eigenständiger Verantwortlicher nach eigenen Bedingungen.",
          ],
        },
        {
          heading: "7. Übermittlung in Drittländer",
          blocks: [
            "Wir haben unseren Sitz in Montenegro, außerhalb der EU/des EWR, und einige Unterauftragsverarbeiter verarbeiten Daten in den USA. Wo die DSGVO, die UK GDPR oder anderes anwendbares Recht für an uns oder einen Unterauftragsverarbeiter übermittelte Daten einen Übermittlungsmechanismus verlangt, stützen sich die Parteien auf einen Angemessenheitsbeschluss, soweit vorhanden, sonst auf die Standardvertragsklauseln der Europäischen Kommission (Modul Verantwortlicher–Auftragsverarbeiter oder Auftragsverarbeiter–Auftragsverarbeiter, gegebenenfalls mit UK-Addendum), die wir auf Wunsch unterzeichnen.",
          ],
        },
        {
          heading: "8. Unterstützung, Datenpannen und Kontrollen",
          blocks: [
            {
              list: [
                "Wir unterstützen die Praxis bei Anfragen betroffener Personen, etwa durch Auffinden oder Löschen von Inhalten, soweit der Dienst es erlaubt.",
                "Wir unterstützen die Praxis bei Sicherheit, Datenschutz-Folgenabschätzungen und Konsultationen von Behörden, soweit sie unsere Verarbeitung betreffen.",
                "Wir melden der Praxis eine Verletzung des Schutzes ihrer Daten unverzüglich, nachdem wir davon Kenntnis erlangt haben, mit den uns vorliegenden Informationen.",
                "Wir stellen die Informationen bereit, die zum Nachweis der Einhaltung dieses AVV nötig sind, und ermöglichen Kontrollen nach angemessener Ankündigung, höchstens einmal jährlich, sofern eine Behörde nicht mehr verlangt, auf Kosten der Praxis.",
              ],
            },
          ],
        },
        {
          heading: "9. Löschung am Ende",
          blocks: [
            "Die Praxis kann ihre Videos jederzeit herunterladen. Löscht die Praxis ihr Konto, löschen wir ihre Daten sofort aus unseren Live-Systemen; Kopien in Backups werden beim Rotieren überschrieben, und spätestens nach 30 Tagen liegen bei uns keine Daten der Praxis mehr vor, sofern das Recht keine Aufbewahrung verlangt.",
          ],
        },
        {
          heading: "10. Recht und Vorrang",
          blocks: [
            "Für diesen AVV gelten Recht und Gerichtsstand der Nutzungsbedingungen, ohne die Rechte betroffener Personen oder Behörden nach der DSGVO oder anderem anwendbarem Datenschutzrecht einzuschränken. Widerspricht dieser AVV den Nutzungsbedingungen in Datenschutzfragen, geht dieser AVV vor. Maßgeblich ist der englische Text.",
          ],
        },
      ],
    },

    imprint: {
      title: "Impressum",
      description: "Impressum von dentvideo.com: BLS AI Automation DOO, Podgorica, Montenegro — Register, Steuernummer, Geschäftsführer und Kontakt.",
      intro: ["Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG) und Art. 5 der EU-Richtlinie über den elektronischen Geschäftsverkehr."],
      sections: [
        { heading: "Anbieter", blocks: [{ operator: true }] },
        { heading: "Verantwortlich für den Inhalt", blocks: ["{director}, {address}."] },
        {
          heading: "Streitbeilegung",
          blocks: [
            "DentVideo richtet sich an Unternehmen und Fachleute. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
          ],
        },
      ],
    },
  },
};
