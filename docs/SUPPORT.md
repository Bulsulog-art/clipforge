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

## Top 10 questions with approved answers

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

- **EN:** Logo, colours, services and language are in Settings, and the next videos use them. For a change to a specific video, reply with the video's title and what you'd like different, and we'll take care of it.
- **TR:** Logo, renkler, hizmetler ve dil Ayarlar'dadır; sonraki videolar bunları kullanır. Belirli bir videoda değişiklik için videonun başlığını ve neyin farklı olmasını istediğinizi yazmanız yeterli, gerisini biz hallederiz.
- **DE:** Logo, Farben, Leistungen und Sprache stellen Sie in den Einstellungen ein; die nächsten Videos übernehmen das. Für eine Änderung an einem bestimmten Video antworten Sie mit dem Titel des Videos und was anders sein soll, wir kümmern uns darum.

*Internal:* log the request on the clinic in Admin; don't promise a delivery day until it is scheduled.

### 7. I didn't get the email / the code doesn't arrive.

- **EN:** Please check your spam or promotions folder for mail from hello@dentvideo.com and mark it "not spam" so the next ones arrive. A sign-in code works for 15 minutes; you can ask for a new one on the sign-in screen. If it still doesn't arrive, tell us the address you used and we'll check.
- **TR:** Lütfen hello@dentvideo.com adresinden gelen e-postalar için spam veya promosyonlar klasörünüze bakın ve "spam değil" olarak işaretleyin, böylece sonrakiler gelen kutunuza düşer. Giriş kodu 15 dakika geçerlidir; giriş ekranından yeni kod isteyebilirsiniz. Yine gelmezse kullandığınız adresi bize yazın, kontrol edelim.
- **DE:** Bitte sehen Sie im Spam- oder Werbung-Ordner nach E-Mails von hello@dentvideo.com und markieren Sie sie als „kein Spam“, damit die nächsten ankommen. Ein Anmeldecode gilt 15 Minuten; auf dem Anmeldebildschirm können Sie einen neuen anfordern. Kommt er weiterhin nicht an, nennen Sie uns die verwendete Adresse, wir prüfen das.

*Check first:* Admin → Emails for a failed send to that clinic.

### 8. My payment failed / my videos are paused.

- **EN:** Your videos stay in your library. To carry on, open DentVideo, go to Settings → Plan and billing and update your card; it takes a minute. Please don't buy a new plan, as that would charge you twice. If the button doesn't work, reply and we'll send you a secure link.
- **TR:** Videolarınız kütüphanenizde kalır. Devam etmek için DentVideo'yu açın, Ayarlar → Plan ve faturalandırma bölümünden kartınızı güncelleyin; bir dakika sürer. Lütfen yeni plan satın almayın, iki kez ücretlendirilirsiniz. Düğme çalışmazsa yanıtlayın, size güvenli bir bağlantı gönderelim.
- **DE:** Ihre Videos bleiben in Ihrer Bibliothek. Um weiterzumachen, öffnen Sie DentVideo, gehen zu Einstellungen → Tarif und Abrechnung und aktualisieren Ihre Karte; das dauert eine Minute. Bitte kaufen Sie keinen neuen Tarif, sonst zahlen Sie doppelt. Funktioniert die Schaltfläche nicht, antworten Sie, wir schicken Ihnen einen sicheren Link.

### 9. How do I cancel? Do I get a refund? Where is my invoice?

- **EN:** Plans are monthly and you can cancel any time in Settings → Plan and billing. You keep access until the end of the period you've paid for, and the videos you've downloaded stay yours to use. A started period isn't refunded in part, unless the law requires it or the service failed; details are in our Refund Policy. Invoices are issued by Dodo Payments, our payment provider, and are in your payment receipt email.
- **TR:** Planlar aylıktır, istediğiniz zaman Ayarlar → Plan ve faturalandırma bölümünden iptal edebilirsiniz. Ödediğiniz dönemin sonuna kadar erişiminiz devam eder ve indirdiğiniz videoları kullanmaya devam edebilirsiniz. Başlamış bir dönem için kısmi iade yapılmaz; yasanın gerektirdiği ya da hizmetin aksadığı durumlar hariç. Ayrıntılar İade Politikamızda. Faturaları ödeme sağlayıcımız Dodo Payments düzenler; ödeme makbuzu e-postanızda bulunur.
- **DE:** Die Tarife sind monatlich und jederzeit in Einstellungen → Tarif und Abrechnung kündbar. Sie behalten den Zugang bis zum Ende des bezahlten Zeitraums, und heruntergeladene Videos dürfen Sie weiter nutzen. Ein begonnener Zeitraum wird nicht anteilig erstattet, außer das Gesetz verlangt es oder der Dienst hat versagt; Einzelheiten stehen in unserer Erstattungsrichtlinie. Rechnungen stellt unser Zahlungsanbieter Dodo Payments aus; Sie finden sie in der Zahlungsbestätigung per E-Mail.

### 10. Can I stop the reminder emails?

- **EN:** Of course. Every reminder has an Unsubscribe link at the bottom, and I've also turned them off for you now. Emails about your account, payments and ready videos still arrive, because they're part of the service.
- **TR:** Elbette. Her hatırlatmanın altında "Abonelikten çık" bağlantısı var; ben de şimdi sizin için kapattım. Hesabınız, ödemeleriniz ve hazır videolarınızla ilgili e-postalar hizmetin parçası olduğu için gelmeye devam eder.
- **DE:** Selbstverständlich. Jede Erinnerung hat unten einen Abmelden-Link, und ich habe sie jetzt auch für Sie abgestellt. E-Mails zu Ihrem Konto, zu Zahlungen und zu fertigen Videos kommen weiterhin, weil sie zum Dienst gehören.

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

Previews of every email in every language: `/dentvideo/dev/email?kind=<kind>&lang=<lang>`
(kinds in `web/src/lib/dentvid/email-samples.ts`).
