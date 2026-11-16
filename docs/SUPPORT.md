# DentVideo support playbook (internal)

Who answers: whoever is on the `hello@dentvideo.com` mailbox (Hostinger). Every
DentVideo email is sent from `DentVideo <hello@dentvideo.com>` with
`reply_to: hello@dentvideo.com`, so a clinic's reply to any email (welcome,
"videos ready", payment problem, reminders) lands here. The in-app
**Settings → Help & contact** button opens a mail with the subject
`DentVideo help · <clinic name> · <clinic id>` and the clinic id in the body;
the app footer link opens one with the subject `DentVideo help`.

## How to work a message

1. **Find the clinic.** Copy the clinic id from the subject (a UUID) into the
   admin panel: `/dentvideo/admin/clinic/<id>`. No id? Search the admin by the
   sender's email.
2. **Check before you answer.** Admin → clinic: plan state, this week's videos
   (made / flagged / approved), emails sent (`dentvid_email_sends`), billing
   events. Admin → System for a delayed week run.
3. **Answer in the clinic's language** (the language in its profile; the
   message's language if they wrote in another one). Use the approved answers
   below, then add the one sentence that is specific to them.
4. **Tone:** warm, short, plain. Sign with your first name and "DentVideo".
   No exclamation marks in a row, no emoji, no jargon ("pipeline", "job",
   "render"). Say "software-assisted check" / "you approve", the words the app
   and emails use.

## Help center

Public answers for paying clinics live at `dentvideo.com/help` (and `/de/help`,
`/es/help`, `/tr/help`, `/fr/help`, `/ja/help`, `/ar/help`, `/pl/help`), one
anchor per answer, e.g. `dentvideo.com/de/help#cancel`. Content:
`web/src/content/help/<locale>.ts`; anchors: `web/src/content/dentvideo-help-links.ts`.
The app links the matching answer from settings fields, the record page, empty
or delayed weeks, billing problems and the post sheet; the welcome, "videos
ready", payment-problem and "not posted" emails link one too. When you answer a
question the help center covers, add the link to the answer in the clinic's
language. When a question keeps coming that it doesn't cover, add an answer in
all eight languages (the tests require it).

## Rules (never break these)

- Never say a video is "legally approved", "compliant" or "guaranteed". The
  check is software-assisted; **the dentist approves** and has the final say.
- Never promise patients, results, rankings or reach.
- Never post on a clinic's behalf, and never ask for their social media
  passwords. DentVideo does not post; the clinic shares.
- Never take card details by email. Payments are handled by Dodo Payments
  (merchant of record): Settings → Plan and billing, or we send a secure link.
- Never quote a price from memory. Prices come from `web/src/lib/dentvid/pricing.ts`
  and the plan screen in the app; send the clinic to the plan screen.
- Don't promise a response time we cannot keep. "A person reads every
  message" is what the emails promise.
- A clinic asking to stop reminders: unsubscribe them (Admin), and confirm
  that account, payment and "videos ready" emails continue.
- Health data: if a clinic sends patient information or a recording showing
  a patient, don't forward it; answer from the admin panel and delete the
  attachment from the mailbox.

## Top questions with approved answers

### 1. When do my first videos arrive?

- **EN:** Your first week of videos is made right after payment, usually in about 15 minutes. We email you as soon as they're ready for your review. After that, a new week arrives every Monday.
- **TR:** İlk haftanızın videoları ödemeden hemen sonra hazırlanır, genellikle yaklaşık 15 dakika sürer. İncelemeye hazır olduklarında size e-posta göndeririz. Sonrasında her pazartesi yeni haftanın videoları gelir.
- **DE:** Die Videos Ihrer ersten Woche entstehen direkt nach der Zahlung, meist in etwa 15 Minuten. Sobald sie zur Freigabe bereitstehen, schicken wir Ihnen eine E-Mail. Danach kommt jeden Montag eine neue Woche.

*Check first:* Admin → clinic → first week job. If it is delayed or failed, say so honestly and give a new time only once it is running.

### 2. How do I approve a video?

- **EN:** Open the video in your library, watch it, and tap Approve. You can also tap "Approve & share" next to a video in the "videos ready" email. Nothing is published until you approve it, and approving only marks it ready to post; we never post for you.
- **TR:** Videoyu kütüphanenizde açın, izleyin ve Onayla'ya dokunun. "Videolar hazır" e-postasında her videonun yanındaki "Onayla ve paylaş" düğmesini de kullanabilirsiniz. Siz onaylamadan hiçbir şey yayınlanmaz; onay yalnızca videoyu paylaşıma hazır işaretler, sizin adınıza paylaşım yapmayız.
- **DE:** Öffnen Sie das Video in Ihrer Bibliothek, sehen Sie es an und tippen Sie auf „Freigeben“. Sie können auch in der E-Mail „Videos sind fertig“ neben einem Video auf „Freigeben & teilen“ tippen. Ohne Ihre Freigabe wird nichts veröffentlicht, und eine Freigabe markiert das Video nur als bereit zum Posten; wir posten nie für Sie.

### 3. How do I post a video on Instagram / Facebook?

- **EN:** On an approved video, tap Share. On a phone, the share sheet opens and the caption is copied, so you can paste it into your post. If sharing doesn't work on your device, tap Download, post the video from Instagram or Facebook as usual and paste the caption. Each video shows a suggested day and time to post.
- **TR:** Onaylı bir videoda Paylaş'a dokunun. Telefonda paylaşım menüsü açılır ve açıklama metni kopyalanır; gönderinize yapıştırmanız yeterli. Cihazınızda paylaşım çalışmazsa İndir'e dokunun, videoyu Instagram ya da Facebook'tan her zamanki gibi paylaşın ve metni yapıştırın. Her video için önerilen bir paylaşım günü ve saati gösterilir.
- **DE:** Tippen Sie bei einem freigegebenen Video auf „Teilen“. Auf dem Handy öffnet sich das Teilen-Menü und die Bildunterschrift wird kopiert, Sie fügen sie nur noch ein. Klappt das Teilen auf Ihrem Gerät nicht, tippen Sie auf „Herunterladen“, posten das Video wie gewohnt über Instagram oder Facebook und fügen den Text ein. Zu jedem Video schlagen wir einen Tag und eine Uhrzeit vor.

### 4. Is the content medically accurate? Is it allowed in my country?

- **EN:** Every video gets a software-assisted check for clinical accuracy and health-advertising rules before you see it, and anything worth a second look is marked with the reason. It is an automated check, not legal advice: you know your patients and your rules, so the final say is yours, and nothing is published until you approve it.
- **TR:** Her video, siz görmeden önce klinik doğruluk ve sağlık reklamı kuralları açısından yazılım destekli bir kontrolden geçer; ikinci bir bakış gerektiren her şey nedeniyle birlikte işaretlenir. Bu otomatik bir kontroldür, hukuki görüş değildir: hastalarınızı ve kurallarınızı siz bilirsiniz, son karar sizindir ve siz onaylamadan hiçbir şey yayınlanmaz.
- **DE:** Jedes Video wird softwaregestützt auf fachliche Richtigkeit und Heilmittelwerberecht geprüft, bevor Sie es sehen; alles, was einen zweiten Blick verdient, ist mit Begründung markiert. Das ist eine automatische Prüfung, keine Rechtsberatung: Das letzte Wort haben Sie, und ohne Ihre Freigabe wird nichts veröffentlicht.

### 5. A video is "marked for a look". What do I do?

- **EN:** The card shows why it was marked. Watch it with that reason in mind: if it's fine for your clinic, approve it; if not, just leave it unapproved. It is never published unless you approve it. Reply to this email if you'd like us to change something.
- **TR:** Kartta neden işaretlendiği yazar. Videoyu bu nedeni düşünerek izleyin: kliniğiniz için uygunsa onaylayın, değilse onaylamadan bırakın. Siz onaylamadıkça asla yayınlanmaz. Bir şeyin değişmesini isterseniz bu e-postayı yanıtlayın.
- **DE:** Auf der Karte steht der Grund. Sehen Sie das Video mit diesem Grund im Kopf an: Passt es für Ihre Praxis, geben Sie es frei; wenn nicht, lassen Sie es einfach unfreigegeben. Ohne Ihre Freigabe wird es nie veröffentlicht. Antworten Sie auf diese E-Mail, wenn wir etwas ändern sollen.

### 6. Can you change a video (wording, topic, my logo or colours)?

- **EN:** Logo, colours, services and language are in Settings, and the next videos use them. To change one specific video, tap "Ask for a change" on its card and write what should be different. Only that video is made again, with the same checks, and you approve it again before posting. You can ask for up to 3 changes a week; if the changed version doesn't pass the checks, your current video stays as it is.
- **TR:** Logo, renkler, hizmetler ve dil Ayarlar'dadır; sonraki videolar bunları kullanır. Tek bir videoyu değiştirmek için kartındaki "Değişiklik iste"ye dokunup neyin farklı olması gerektiğini yazın. Yalnızca o video aynı kontrollerle yeniden hazırlanır ve paylaşmadan önce yeniden onaylarsınız. Haftada en fazla 3 değişiklik isteyebilirsiniz; değiştirilmiş sürüm kontrollerden geçmezse mevcut videonuz olduğu gibi kalır.
- **DE:** Logo, Farben, Leistungen und Sprache stellen Sie in den Einstellungen ein; die nächsten Videos übernehmen das. Um ein einzelnes Video zu ändern, tippen Sie auf seiner Karte auf „Änderung anfragen“ und schreiben, was anders sein soll. Nur dieses Video wird mit denselben Prüfungen neu erstellt, und Sie geben es vor dem Posten erneut frei. Bis zu 3 Änderungen pro Woche sind möglich; besteht die geänderte Fassung die Prüfungen nicht, bleibt Ihr bisheriges Video unverändert.

*Internal:* Admin → Requests (or the clinic's page) shows each change request, its note and status. A request that failed "technical" or "busy" also sent you an alert; the clinic's old video is untouched. If a clinic needs more than 3 a week, do it by hand rather than raising the cap for everyone (`DENTVID_MAX_CHANGES_PER_CLINIC_WEEK`).

### 7. I didn't get the email / the code doesn't arrive.

- **EN:** Please check your spam or promotions folder for mail from hello@dentvideo.com and mark it "not spam" so the next ones arrive. A sign-in code works for 15 minutes; you can ask for a new one on the sign-in screen. If it still doesn't arrive, tell us the address you used and we'll check.
- **TR:** Lütfen hello@dentvideo.com adresinden gelen e-postalar için spam veya promosyonlar klasörünüze bakın ve "spam değil" olarak işaretleyin, böylece sonrakiler gelen kutunuza düşer. Giriş kodu 15 dakika geçerlidir; giriş ekranından yeni kod isteyebilirsiniz. Yine gelmezse kullandığınız adresi bize yazın, kontrol edelim.
- **DE:** Bitte sehen Sie im Spam- oder Werbung-Ordner nach E-Mails von hello@dentvideo.com und markieren Sie sie als „kein Spam“, damit die nächsten ankommen. Ein Anmeldecode gilt 15 Minuten; auf dem Anmeldebildschirm können Sie einen neuen anfordern. Kommt er weiterhin nicht an, nennen Sie uns die verwendete Adresse, wir prüfen das.

*Check first:* Admin → Emails for a failed send to that clinic.

### 8. My payment failed / my videos are paused.

- **EN:** Your videos stay in your library. To carry on, open DentVideo, go to Settings → Plan and billing and update your card; it takes a minute. Please don't buy a new plan, as that would charge you twice. If the button doesn't work, reply and we'll send you a secure link.
- **TR:** Videolarınız kütüphanenizde kalır. Devam etmek için DentVideo'yu açın, Ayarlar → Plan ve faturalandırma bölümünden kartınızı güncelleyin; bir dakika sürer. Lütfen yeni plan satın almayın, iki kez ücretlendirilirsiniz. Düğme çalışmazsa yanıtlayın, size güvenli bir bağlantı gönderelim.
- **DE:** Ihre Videos bleiben in Ihrer Bibliothek. Um weiterzumachen, öffnen Sie DentVideo, gehen zu Einstellungen → Tarif und Abrechnung und aktualisieren Ihre Karte; das dauert eine Minute. Bitte kaufen Sie keinen neuen Tarif, sonst zahlen Sie doppelt. Funktioniert die Schaltfläche nicht, antworten Sie, wir schicken Ihnen einen sicheren Link.

### 9. How do I cancel? Do I get a refund? Where is my invoice? What happens to our videos?

- **EN:** Plans are monthly and you can cancel any time in Settings → Plan and billing. You keep access until the end of the period you've paid for. After that, your library stays for 90 days, so you can still watch and download your videos; we email you 14 days and 1 day before they are deleted, and the videos you've downloaded stay yours to use. A started period isn't refunded in part, unless the law requires it or the service failed; details are in our Refund Policy. Invoices are issued by Dodo Payments, our payment provider, and are in your payment receipt email.
- **TR:** Planlar aylıktır, istediğiniz zaman Ayarlar → Plan ve faturalandırma bölümünden iptal edebilirsiniz. Ödediğiniz dönemin sonuna kadar erişiminiz devam eder. Sonrasında kütüphaneniz 90 gün daha kalır; videolarınızı izleyip indirebilirsiniz. Silinmeden 14 gün ve 1 gün önce size e-posta göndeririz; indirdiğiniz videoları kullanmaya devam edebilirsiniz. Başlamış bir dönem için kısmi iade yapılmaz; yasanın gerektirdiği ya da hizmetin aksadığı durumlar hariç. Ayrıntılar İade Politikamızda. Faturaları ödeme sağlayıcımız Dodo Payments düzenler; ödeme makbuzu e-postanızda bulunur.
- **DE:** Die Tarife sind monatlich und jederzeit in Einstellungen → Tarif und Abrechnung kündbar. Sie behalten den Zugang bis zum Ende des bezahlten Zeitraums. Danach bleibt Ihre Bibliothek noch 90 Tage, damit Sie Ihre Videos ansehen und herunterladen können; wir schreiben Ihnen 14 Tage und 1 Tag vor der Löschung, und heruntergeladene Videos dürfen Sie weiter nutzen. Ein begonnener Zeitraum wird nicht anteilig erstattet, außer das Gesetz verlangt es oder der Dienst hat versagt; Einzelheiten stehen in unserer Erstattungsrichtlinie. Rechnungen stellt unser Zahlungsanbieter Dodo Payments aus; Sie finden sie in der Zahlungsbestätigung per E-Mail.

*Internal:* the 90 days count from the end of the paid period (`dentvid_clinics.plan_ended_at`); the deletion date is on the clinic's admin page and in the app. A clinic that asks for more time: choosing a plan again keeps everything; otherwise point them to Settings → Your data → "Download my data". The worker's daily retention job (`DENTVID_RETENTION_MODE`: `delete` by default, `dry-run`, `off`) never touches active, paused or trial clinics, keeps settings and the logo, and emails you the counts whenever it deletes anything.

### 10. Can I stop the reminder emails?

- **EN:** Of course. Every reminder has an Unsubscribe link at the bottom, and I've also turned them off for you now. Emails about your account, payments and ready videos still arrive, because they're part of the service.
- **TR:** Elbette. Her hatırlatmanın altında "Abonelikten çık" bağlantısı var; ben de şimdi sizin için kapattım. Hesabınız, ödemeleriniz ve hazır videolarınızla ilgili e-postalar hizmetin parçası olduğu için gelmeye devam eder.
- **DE:** Selbstverständlich. Jede Erinnerung hat unten einen Abmelden-Link, und ich habe sie jetzt auch für Sie abgestellt. E-Mails zu Ihrem Konto, zu Zahlungen und zu fertigen Videos kommen weiterhin, weil sie zum Dienst gehören.

### 11. Can I suggest a topic?

- **EN:** Yes. Use "Suggest a topic for next week" on the Videos page or in Settings: one patient question or subject, up to 140 characters. We use waiting suggestions first, up to three a week, when they fit your services and pass the same checks as every video. Under "Your suggestions" you can see what became of each one, with the reason if we couldn't make it.
- **TR:** Evet. Videolar sayfasında veya Ayarlar'da "Gelecek hafta için konu önerin" bölümünü kullanın: bir hasta sorusu ya da konu, en fazla 140 karakter. Bekleyen önerileri, hizmetlerinize uyduklarında ve her video gibi aynı kontrollerden geçtiklerinde, haftada en fazla üç tane olmak üzere önce kullanırız. "Önerileriniz" bölümünde her birine ne olduğunu, hazırlanamadıysa nedenini görebilirsiniz.
- **DE:** Ja. Nutzen Sie „Thema für nächste Woche vorschlagen“ auf der Seite „Videos“ oder in den Einstellungen: eine Patientenfrage oder ein Thema, bis zu 140 Zeichen. Wartende Vorschläge nutzen wir zuerst, bis zu drei pro Woche, wenn sie zu Ihren Leistungen passen und dieselben Prüfungen bestehen wie jedes Video. Unter „Ihre Vorschläge“ sehen Sie, was aus jedem geworden ist, und bei einem nicht umgesetzten den Grund.

*Internal:* Admin → Requests lists every suggestion with its status and reason. A suggestion about a service the clinic doesn't list is refused "not offered": suggest they add the service in Settings.

### 12. Do the videos have subtitles? (accessibility, YouTube, TikTok)

- **EN:** Every video shows its key points on screen. For the full narration, tap "Download subtitles (.srt)" in "Post it": the file has the narrator's exact words, timed from the pauses in the narration (close, but not exact to the word, so watch it once with the video). YouTube and Facebook accept the .srt file; Instagram and TikTok don't take subtitle files, but you can turn on the app's own automatic captions and correct them with the .srt text. Videos made before subtitle files existed, and clips from your own recordings, have no .srt file.
- **TR:** Her video ana mesajlarını ekranda gösterir. Seslendirmenin tamamı için "Paylaş" adımındaki "Altyazıyı indir (.srt)"ye dokunun: dosya seslendirmenin birebir sözlerini içerir; zamanlamalar seslendirmedeki duraklardan hesaplanır (yakındır ama kelimesi kelimesine değildir, bir kez videoyla izleyin). YouTube ve Facebook .srt dosyasını kabul eder; Instagram ve TikTok altyazı dosyası almaz, ancak uygulamanın otomatik altyazısını açıp .srt metniyle düzeltebilirsiniz. Altyazı dosyalarından önce hazırlanan videoların ve kendi kayıtlarınızdan çıkan kliplerin .srt dosyası yoktur.
- **DE:** Jedes Video zeigt seine Kernaussagen im Bild. Für den vollständigen Sprechertext tippen Sie unter „Posten“ auf „Untertitel herunterladen (.srt)“: Die Datei enthält genau die Worte der Stimme, zeitlich aus den Pausen der Sprachaufnahme berechnet (gut passend, aber nicht wortgenau; sehen Sie sie einmal mit dem Video an). YouTube und Facebook nehmen die .srt-Datei an; Instagram und TikTok nehmen keine Untertiteldatei, aber Sie können die automatischen Untertitel der App einschalten und mit dem .srt-Text korrigieren. Videos aus der Zeit vor den Untertiteldateien und Clips aus Ihren eigenen Aufnahmen haben keine .srt-Datei.

## Escalate to Berke (owner) when

- a clinic disputes a charge or mentions a chargeback;
- a clinic says a published video caused a complaint from a patient, a
  chamber/association or a regulator;
- anything about personal data (access, deletion beyond Settings, a breach);
- the same failure (emails, week run, checkout) shows for more than one clinic.

## Which email says what (for reference)

| Email | When | Unsubscribe | Main action |
|---|---|---|---|
| Code | sign-up | no (transactional) | enter the 6-digit code |
| Reset | password reset | no | choose a new password |
| Welcome | first payment | no | open the library |
| Videos ready | each week / each recording | no | review; per video "Approve & share"; "Approve all ready videos" |
| Payment failed / on hold | billing webhook | no | update the card |
| Start / sample / objections | unpaid clinic, day 0 / 1 / 3 | yes (one-click) | finish preview / choose a plan |
| Not posted | paying, nothing shared this week | yes | open this week's videos |
| Monthly | paying, once a month | yes | open the library |
| Library deletion notice | plan ended: 14 days and 1 day before the videos are deleted | no (about their data) | open the library / download |

Previews of every email in every language: `/dentvideo/dev/email?kind=<kind>&lang=<lang>`
(kinds in `web/src/lib/dentvid/email-samples.ts`).
