# DentVideo for iPhone: App Store Connect listing (paste-ready)

Everything to paste into App Store Connect for the DentVideo app (`com.bulsulabs.dentvideo`),
version 1.0, in eight languages. Setup steps, the demo-account script and the build pipeline are in
`docs/APP_STORE_DENTVIDEO.md`; in-app purchase design is in `docs/DENTVIDEO_IAP_PLAN.md` (branch
`claude/dentvideo-iap-server`).

**This listing is written for the build that sells the two plans with In-App Purchase** (sign-up,
clinic setup, preview and paywall in the app, `DENTVIDEO_IAP_PLAN.md` §6). That UI is not built yet.
If 1.0 is submitted before it exists, see "Owner decisions" item 1 for what to change.

Every value to paste is in a code block (GitHub shows a copy button on each). The tag after the
opening fence (`id=en-US.subtitle` and so on) is for the checker and is not part of the text.

Check after any edit:

```
python3 scripts/dentvideo-appstore-listing-check.py docs/APP_STORE_LISTING_DENTVIDEO.md \
  [--shots-dir <folder with en/ tr/ ... ipad-en/>] [--shots-script ios/DentVideo/scripts/appstore_shots.py]
```

It checks every length below, keyword bytes and form, banned words (superlatives, "free",
discounts, guarantees, medical promises, prices, web purchase), digits, links, that each language
has every field, and, with the options, that the screenshot files exist at the accepted sizes and
that the captions here are the ones printed on the images.

---

## 0. Apple's limits (read from Apple's documentation on 2026-11-17)

| Field | Limit | Source |
|---|---|---|
| Name | 2 to 30 characters | [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information) |
| Subtitle | 30 characters | same page |
| Promotional text | 170 characters (can be changed without a new version) | [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information) |
| Description | 4000 characters, plain text | same page |
| Keywords | **100 bytes** (not characters: a Turkish, Polish, German, Spanish or French letter with an accent is 2 bytes, Arabic 2, Japanese 3), each keyword longer than two characters, no names of other apps or companies, no repeat of the app or company name | same page |
| What's New | 4000 characters; **not shown for the first version of an app** | same page |
| App Review notes | 4000 bytes | same page |
| In-App Purchase display name | 2 to 30 characters; subscription display names must not contain diacritics, emoji or special characters | [In-App Purchase information](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information/), [Auto-renewable subscription information](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information/) |
| In-App Purchase description | 45 characters | In-App Purchase information |

Apple's older "Creating your product page" article still says 35 / 55 for In-App Purchase names and
descriptions; App Store Connect's own reference says 30 / 45, so the stricter numbers are used.

---

## 1. App information (shared by all languages)

| Field | Value |
|---|---|
| Name (every language) | `DentVideo` |
| Primary language | English (U.S.) |
| Bundle ID / SKU | `com.bulsulabs.dentvideo` / `dentvideo-ios` |
| Primary category | **Business** |
| Secondary category | **Photo & Video** |
| Copyright | `2026 BLS AI AUTOMATION DOO` |
| Content rights | No third-party content (the videos are made for the clinic; music and voices are licensed by us) |
| License agreement | Apple's standard EULA, plus our Terms linked in every description (guideline 3.1.2) |
| Price | Free download; the plans are In-App Purchases (§4) |

**Why Business first.** The app is software a dental clinic uses to run one part of its business:
reviewing, approving and posting the clinic's own patient-education videos, and recording the
dentist for them. Its users are clinic staff, not patients. **Photo & Video second**, because what
the user does all day in it is watch, save, post and record video. **Not Medical, not Health &
Fitness**: the app does not diagnose, treat or advise anyone about their health, and those
categories would set the wrong expectation and bring the medical-app checks (guideline 1.4.1) that
do not apply.

### URLs (all answered 200 on 2026-11-17)

| Language | Support URL | Marketing URL | Privacy Policy URL |
|---|---|---|---|
| en-US | `https://dentvideo.com/help` | `https://dentvideo.com` | `https://dentvideo.com/privacy` |
| tr | `https://dentvideo.com/tr/help` | `https://dentvideo.com/tr` | `https://dentvideo.com/tr/privacy` |
| de-DE | `https://dentvideo.com/de/help` | `https://dentvideo.com/de` | `https://dentvideo.com/de/privacy` |
| es-ES | `https://dentvideo.com/es/help` | `https://dentvideo.com/es` | `https://dentvideo.com/es/privacy` |
| fr-FR | `https://dentvideo.com/fr/help` | `https://dentvideo.com/fr` | `https://dentvideo.com/fr/privacy` |
| ja | `https://dentvideo.com/ja/help` | `https://dentvideo.com/ja` | `https://dentvideo.com/ja/privacy` |
| ar-SA | `https://dentvideo.com/ar/help` | `https://dentvideo.com/ar` | `https://dentvideo.com/ar/privacy` |
| pl | `https://dentvideo.com/pl/help` | `https://dentvideo.com/pl` | `https://dentvideo.com/pl/privacy` |

The terms pages (`/terms`, `/<lang>/terms`) also answered 200. The help page carries the contact
address hello@dentvideo.com (Apple: the support URL must lead to contact information). The
localized home pages answer with a trailing slash as a 308 redirect, so paste them without it.

### Age rating questionnaire

Apple computes the rating; these are the honest answers.

| Section | Item | Answer | Why |
|---|---|---|---|
| In-App Controls | Parental Controls | No | |
| | Age Assurance | No | |
| Capabilities | Unrestricted Web Access | No | Links (privacy, terms, Apple's subscription page) open outside the app; there is no browser |
| | User-Generated Content | No | A clinic's recordings are seen only by that clinic; nothing is distributed to other users |
| | Social Media | No | No feed, likes or comments; posting happens in the other app, from the clinic's own account |
| | Messaging and Chat | No | |
| | Advertising | No | |
| Mature Themes | Profanity, Horror, Alcohol/Tobacco/Drugs | None | |
| Medical or Wellness | Medical or Treatment Information | **Frequent** | Every video is dental patient education about a treatment or care topic |
| | Health or Wellness Topics | **Yes** | Some videos are about home care (brushing, flossing) |
| Sexuality or Nudity | all three | None | |
| Violence | all four | None | |
| Chance-Based | Gambling, Simulated Gambling, Contests, Loot Boxes | None | |

Expected result: **16+** (driven by "Frequent" medical or treatment information). That does not
matter for a business app; guideline 2.3.6 wants honest answers. "Infrequent" would give 13+, but
it would not be true (owner decision 4).

**Regulated Medical Devices** (App information; asked because of the "Frequent" answer, for the
EU/EEA, UK and US): **No, the app is not a regulated medical device** in any of the three. It does
not diagnose, monitor or treat; it shows a clinic its own marketing videos.

**Digital Services Act**: the account is a trader (the company sells to businesses). App Store
Connect shows the company's address, phone and email to EU customers; this is set once per account
(Business section), not per app.

---

## 2. Metadata per language

Name is `DentVideo` everywhere. Plan names stay "Starter" and "Practice" in every language, as on
the website and in the app. The words for the filming card follow the app and the screenshots in
each language.

### English (en-US, primary)

Subtitle (30)

```text id=en-US.subtitle
Weekly videos for your clinic
```

Promotional text (170)

```text id=en-US.promo
This week's patient-education videos on your phone: watch each one, approve it, then save it and post it from your clinic's own accounts.
```

Keywords (100 bytes)

```text id=en-US.keywords
dentist,dental,dentistry,practice,patient education,social media,content,captions,orthodontist
```

Description (4000)

```text id=en-US.description
DentVideo makes short patient-education videos for dental clinics. Every Monday, five new videos arrive on your phone, ready for you to review.

Each video is narrated and captioned in your language, with your clinic's name, colours and logo. Before you see a script, software checks it for clinical accuracy and against your country's health-advertising rules. Nothing is published without your approval, and you post from your own accounts.

THIS WEEK
Watch each video full screen, read the check notes, then approve or decline it. You can also approve all ready videos at once.

POST
Save a video to Photos and copy its caption and hashtags in one tap, then open Instagram, TikTok or the app you post with. Each video has a suggested day and time, with optional reminders.

RECORD
Film yourself while a filming card on screen shows what to say. Your clip uploads in the background; we edit it and add captions and your logo. (Practice plan)

OFFLINE
Approved videos stay on your phone, ready to post.

SETTINGS
Clinic details, video language, narrator voice, tone and closing line.

A notification on Monday morning tells you when your week is ready.

GETTING STARTED
Create your clinic's account in the app, add your clinic's details and see sample videos in your colours. Then choose a monthly plan: Starter for the weekly videos, or Practice, which adds your own recordings. Is your clinic already using DentVideo? Sign in with your account.

SUBSCRIPTIONS
Starter and Practice are auto-renewable monthly subscriptions. Payment is charged to your Apple Account when you confirm the purchase. The subscription renews each month unless it is cancelled at least 24 hours before the end of the current period. You can manage or cancel it in your Apple Account settings. Deleting your DentVideo account does not cancel an App Store subscription.

Available in English, German, Spanish, Turkish, French, Japanese, Arabic and Polish.

Terms of Use: https://dentvideo.com/terms
Privacy Policy: https://dentvideo.com/privacy
```

What's New in 1.0 (see the note in §0: App Store Connect does not show this field for a first
version; use it as TestFlight "What to Test" and keep it for 1.0.1)

```text id=en-US.whatsnew
First release: review, approve and post your weekly videos, record with filming cards, and get a notification when your week is ready. Create your clinic's account and choose a plan in the app.
```

### Türkçe (tr)

```text id=tr.subtitle
Kliniğinize haftalık videolar
```

```text id=tr.promo
Haftanın hasta bilgilendirme videoları telefonunuzda: her birini izleyin, onaylayın, sonra kaydedip kliniğinizin kendi hesaplarından paylaşın.
```

```text id=tr.keywords
diş hekimi,diş kliniği,dişçi,hasta bilgilendirme,sosyal medya,içerik,altyazı,ortodonti
```

```text id=tr.description
DentVideo, diş klinikleri için kısa hasta bilgilendirme videoları hazırlar. Her pazartesi beş yeni video, incelemeniz için telefonunuza gelir.

Her video kendi dilinizde seslendirilir ve altyazılanır; kliniğinizin adını, renklerini ve logosunu taşır. Siz görmeden önce her senaryo, klinik doğruluk ve ülkenizin sağlık reklamı kuralları açısından yazılımla kontrol edilir. Onayınız olmadan hiçbir şey yayınlanmaz; paylaşımı kendi hesaplarınızdan yaparsınız.

BU HAFTA
Her videoyu tam ekran izleyin, kontrol notlarını okuyun, sonra onaylayın ya da reddedin. Hazır olanların hepsini tek seferde de onaylayabilirsiniz.

PAYLAŞ
Videoyu Fotoğraflar'a kaydedin, açıklamayı ve etiketleri tek dokunuşla kopyalayın, sonra Instagram'ı, TikTok'u ya da paylaşım için kullandığınız uygulamayı açın. Her video için önerilen bir gün ve saat vardır; isterseniz hatırlatma da alırsınız.

KAYDET
Ne söyleyeceğinizi gösteren çekim kartı ekrandayken kendinizi çekin. Klibiniz arka planda yüklenir; biz düzenler, altyazıyı ve logonuzu ekleriz. (Practice planı)

ÇEVRİMDIŞI
Onayladığınız videolar telefonunuzda kalır, paylaşmaya hazırdır.

AYARLAR
Klinik bilgileri, video dili, anlatıcı sesi, üslup ve kapanış cümlesi.

Haftanız hazır olduğunda pazartesi sabahı bir bildirim gelir.

BAŞLARKEN
Kliniğinizin hesabını uygulamada oluşturun, klinik bilgilerinizi girin ve kendi renklerinizle hazırlanmış örnek videoları görün. Ardından aylık bir plan seçin: haftalık videolar için Starter ya da buna kendi kayıtlarınızı ekleyen Practice. Kliniğiniz DentVideo'yu zaten kullanıyorsa hesabınızla giriş yapın.

ABONELİKLER
Starter ve Practice, otomatik yenilenen aylık aboneliklerdir. Ödeme, satın almayı onayladığınızda Apple Hesabınızdan alınır. Abonelik, mevcut dönemin bitiminden en az 24 saat önce iptal edilmezse her ay yenilenir. Aboneliği Apple Hesabı ayarlarınızdan yönetebilir veya iptal edebilirsiniz. DentVideo hesabınızı silmek App Store aboneliğini iptal etmez.

Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, Japonca, Arapça ve Lehçe olarak kullanılabilir.

Kullanım Koşulları: https://dentvideo.com/tr/terms
Gizlilik Politikası: https://dentvideo.com/tr/privacy
```

```text id=tr.whatsnew
İlk sürüm: haftalık videolarınızı inceleyin, onaylayın ve paylaşın, çekim kartlarıyla kayıt yapın, haftanız hazır olduğunda bildirim alın. Kliniğinizin hesabını oluşturup planınızı uygulamada seçin.
```

### Deutsch (de-DE)

```text id=de-DE.subtitle
Wochenvideos für Ihre Praxis
```

```text id=de-DE.promo
Die Patientenvideos Ihrer Woche auf dem Telefon: jedes ansehen, freigeben, dann sichern und von den eigenen Konten Ihrer Praxis posten.
```

```text id=de-DE.keywords
Zahnarzt,Zahnarztpraxis,Zahnmedizin,Patientenaufklärung,Social Media,Untertitel,Kieferorthopädie
```

```text id=de-DE.description
DentVideo erstellt kurze Patientenvideos für Zahnarztpraxen. Jeden Montag kommen fünf neue Videos auf Ihr Telefon, bereit zur Prüfung.

Jedes Video ist in Ihrer Sprache vertont und untertitelt, mit Name, Farben und Logo Ihrer Praxis. Bevor Sie ein Skript sehen, prüft eine Software es auf fachliche Richtigkeit und auf die Werberegeln für Gesundheitsleistungen in Ihrem Land. Nichts wird ohne Ihre Freigabe veröffentlicht, und Sie posten von Ihren eigenen Konten.

DIESE WOCHE
Jedes Video im Vollbild ansehen, die Prüfhinweise lesen, dann freigeben oder ablehnen. Alle fertigen Videos lassen sich auch auf einmal freigeben.

POSTEN
Video in Fotos sichern und Text samt Hashtags mit einem Tippen kopieren, dann Instagram, TikTok oder die App öffnen, mit der Sie posten. Zu jedem Video gibt es einen Vorschlag für Tag und Uhrzeit, auf Wunsch mit Erinnerung.

AUFNEHMEN
Filmen Sie sich selbst, während eine Drehkarte im Bild zeigt, was Sie sagen. Der Clip wird im Hintergrund hochgeladen; wir schneiden ihn und fügen Untertitel und Ihr Logo hinzu. (Tarif Practice)

OFFLINE
Freigegebene Videos bleiben auf dem Telefon, bereit zum Posten.

EINSTELLUNGEN
Praxisdaten, Videosprache, Sprecherstimme, Tonfall und Schlusssatz.

Am Montagmorgen sagt Ihnen eine Mitteilung, dass Ihre Woche fertig ist.

SO STARTEN SIE
Legen Sie das Konto Ihrer Praxis in der App an, geben Sie die Praxisdaten ein und sehen Sie Beispielvideos in Ihren Farben. Danach wählen Sie einen Monatstarif: Starter für die Wochenvideos oder Practice, der Ihre eigenen Aufnahmen dazunimmt. Ihre Praxis nutzt DentVideo schon? Melden Sie sich mit Ihrem Konto an.

ABONNEMENTS
Starter und Practice sind sich automatisch verlängernde Monatsabonnements. Die Zahlung wird bei Bestätigung des Kaufs über Ihren Apple Account abgerechnet. Das Abonnement verlängert sich jeden Monat, sofern es nicht mindestens 24 Stunden vor Ende des laufenden Zeitraums gekündigt wird. Sie verwalten oder kündigen es in den Einstellungen Ihres Apple Accounts. Das Löschen Ihres DentVideo-Kontos kündigt kein App-Store-Abonnement.

Verfügbar auf Deutsch, Englisch, Spanisch, Türkisch, Französisch, Japanisch, Arabisch und Polnisch.

Nutzungsbedingungen: https://dentvideo.com/de/terms
Datenschutzerklärung: https://dentvideo.com/de/privacy
```

```text id=de-DE.whatsnew
Erste Version: Wochenvideos prüfen, freigeben und posten, mit Drehkarten aufnehmen und benachrichtigt werden, sobald die Woche fertig ist. Praxiskonto anlegen und Tarif in der App wählen.
```

### Español (es-ES)

```text id=es-ES.subtitle
Vídeos semanales de tu clínica
```

```text id=es-ES.promo
Los vídeos para pacientes de tu semana, en tu teléfono: míralos, apruébalos y publícalos desde las cuentas de tu clínica.
```

```text id=es-ES.keywords
dentista,dental,odontología,educación del paciente,redes sociales,contenido,subtítulos,ortodoncia
```

```text id=es-ES.description
DentVideo prepara vídeos cortos de educación para pacientes para clínicas dentales. Cada lunes llegan cinco vídeos nuevos a tu teléfono, listos para que los revises.

Cada vídeo va narrado y subtitulado en tu idioma, con el nombre, los colores y el logo de tu clínica. Antes de que veas un guion, un software lo revisa en cuanto a exactitud clínica y normas de publicidad sanitaria de tu país. Nada se publica sin tu aprobación y publicas desde tus propias cuentas.

ESTA SEMANA
Mira cada vídeo a pantalla completa, lee las notas de la revisión y apruébalo o recházalo. También puedes aprobar de una vez todos los que están listos.

PUBLICAR
Guarda el vídeo en Fotos y copia el texto con los hashtags en un toque; después abre Instagram, TikTok o la app con la que publicas. Cada vídeo trae un día y una hora sugeridos, con recordatorios opcionales.

GRABAR
Grábate mientras una tarjeta de grabación en pantalla te indica qué decir. El clip se sube en segundo plano; lo editamos y añadimos subtítulos y tu logo. (Plan Practice)

SIN CONEXIÓN
Los vídeos aprobados se quedan en el teléfono, listos para publicar.

AJUSTES
Datos de la clínica, idioma de los vídeos, voz del narrador, tono y frase de cierre.

El lunes por la mañana un aviso te dice que tu semana está lista.

PARA EMPEZAR
Crea la cuenta de tu clínica en la app, añade los datos de la clínica y mira vídeos de ejemplo con tus colores. Después elige un plan mensual: Starter para los vídeos semanales o Practice, que añade tus propias grabaciones. ¿Tu clínica ya usa DentVideo? Inicia sesión con tu cuenta.

SUSCRIPCIONES
Starter y Practice son suscripciones mensuales de renovación automática. El pago se carga en tu cuenta de Apple al confirmar la compra. La suscripción se renueva cada mes salvo que se cancele al menos 24 horas antes del final del periodo en curso. Puedes gestionarla o cancelarla en los ajustes de tu cuenta de Apple. Eliminar tu cuenta de DentVideo no cancela una suscripción del App Store.

Disponible en español, inglés, alemán, turco, francés, japonés, árabe y polaco.

Términos de uso: https://dentvideo.com/es/terms
Política de privacidad: https://dentvideo.com/es/privacy
```

```text id=es-ES.whatsnew
Primera versión: revisa, aprueba y publica tus vídeos semanales, graba con tarjetas de grabación y recibe un aviso cuando tu semana esté lista. Crea la cuenta de tu clínica y elige un plan en la app.
```

### Français (fr-FR)

```text id=fr-FR.subtitle
Les vidéos de votre cabinet
```

```text id=fr-FR.promo
Les vidéos patients de votre semaine sur votre téléphone : regardez-les, validez-les, puis publiez-les depuis les comptes de votre cabinet.
```

```text id=fr-FR.keywords
dentiste,chirurgien-dentiste,dentaire,information patient,réseaux sociaux,sous-titres,orthodontie
```

```text id=fr-FR.description
DentVideo réalise de courtes vidéos d'information patient pour les cabinets dentaires. Chaque lundi, cinq nouvelles vidéos arrivent sur votre téléphone, prêtes à être vérifiées.

Chaque vidéo est narrée et sous-titrée dans votre langue, aux nom, couleurs et logo de votre cabinet. Avant que vous ne voyiez un script, un logiciel le vérifie pour l'exactitude clinique et selon les règles de publicité en santé de votre pays. Rien n'est publié sans votre validation, et vous publiez depuis vos propres comptes.

CETTE SEMAINE
Regardez chaque vidéo en plein écran, lisez les notes de vérification, puis validez ou refusez. Vous pouvez aussi valider d'un coup toutes les vidéos prêtes.

PUBLIER
Enregistrez la vidéo dans Photos et copiez la légende et les hashtags d'un geste, puis ouvrez Instagram, TikTok ou l'app avec laquelle vous publiez. Chaque vidéo a un jour et une heure suggérés, avec rappels facultatifs.

FILMER
Filmez-vous pendant qu'une fiche de tournage à l'écran vous indique quoi dire. Le clip s'envoie en arrière-plan ; nous le montons et ajoutons sous-titres et logo. (Formule Practice)

HORS LIGNE
Les vidéos validées restent sur le téléphone, prêtes à publier.

RÉGLAGES
Informations du cabinet, langue des vidéos, voix off, ton et phrase de fin.

Le lundi matin, une notification vous prévient que votre semaine est prête.

POUR COMMENCER
Créez le compte de votre cabinet dans l'app, renseignez ses informations et découvrez des vidéos d'exemple à vos couleurs. Choisissez ensuite une formule mensuelle : Starter pour les vidéos de la semaine, ou Practice, qui ajoute vos propres enregistrements. Votre cabinet utilise déjà DentVideo ? Connectez-vous avec votre compte.

ABONNEMENTS
Starter et Practice sont des abonnements mensuels à renouvellement automatique. Le paiement est débité de votre compte Apple à la confirmation de l'achat. L'abonnement se renouvelle chaque mois, sauf résiliation au moins 24 heures avant la fin de la période en cours. Vous pouvez le gérer ou le résilier dans les réglages de votre compte Apple. Supprimer votre compte DentVideo ne résilie pas un abonnement App Store.

Disponible en français, anglais, allemand, espagnol, turc, japonais, arabe et polonais.

Conditions d'utilisation : https://dentvideo.com/fr/terms
Politique de confidentialité : https://dentvideo.com/fr/privacy
```

```text id=fr-FR.whatsnew
Première version : vérifiez, validez et publiez vos vidéos de la semaine, filmez avec des fiches de tournage et soyez prévenu quand votre semaine est prête. Créez le compte du cabinet et choisissez une formule dans l'app.
```

### 日本語 (ja)

```text id=ja.subtitle
歯科医院向け、毎週の患者説明動画
```

```text id=ja.promo
今週の患者さん向け動画をスマホで。再生して承認し、保存したら医院のアカウントから投稿できます。
```

```text id=ja.keywords
歯医者,歯科医師,デンタル,クリニック,歯のケア,SNS運用,字幕動画,矯正歯科
```

```text id=ja.description
DentVideoは、歯科医院のために短い患者さん向け説明動画を制作します。毎週月曜日に新しい動画が五本、スマートフォンに届き、すぐに確認できます。

動画はご希望の言語でナレーションと字幕が入り、医院の名前・カラー・ロゴが入ります。台本はお届けする前に、臨床的な正確さと、国ごとの医療広告のルールについてソフトウェアでチェックしています。承認なしに公開されることはなく、投稿は医院ご自身のアカウントから行います。

今週
動画を全画面で再生し、チェックのメモを読んでから、承認または見送りを選びます。準備できた動画をまとめて承認することもできます。

投稿
ワンタップで動画を「写真」に保存し、キャプションとハッシュタグをコピー。あとはInstagramやTikTokなど、投稿に使うアプリを開くだけです。動画ごとにおすすめの曜日と時間があり、リマインダーも設定できます。

撮影
話す内容を示す撮影カードを画面に表示したまま、ご自身を撮影できます。動画はバックグラウンドでアップロードされ、編集・字幕・ロゴ入れは私たちが行います。（Practiceプラン）

オフライン
承認した動画は端末に保存され、そのまま投稿できます。

設定
医院の情報、動画の言語、ナレーションの声、トーン、締めのひと言。

その週の動画が準備できると、月曜の朝に通知でお知らせします。

はじめかた
アプリで医院のアカウントを作成し、医院の情報を入力すると、医院のカラーで作ったサンプル動画をご覧いただけます。そのうえで月額プランをお選びください。毎週の動画が届くStarterと、ご自身で撮影した動画の編集が加わるPracticeがあります。すでにDentVideoをご利用の医院は、お持ちのアカウントでサインインしてください。

サブスクリプション
StarterとPracticeは、自動更新の月額サブスクリプションです。お支払いは購入の確定時にApple Accountに請求されます。現在の期間が終わる24時間前までに解約しない限り、毎月自動で更新されます。管理や解約はApple Accountの設定から行えます。DentVideoのアカウントを削除しても、App Storeのサブスクリプションは解約されません。

日本語、英語、ドイツ語、スペイン語、トルコ語、フランス語、アラビア語、ポーランド語に対応しています。

利用規約：https://dentvideo.com/ja/terms
プライバシーポリシー：https://dentvideo.com/ja/privacy
```

```text id=ja.whatsnew
最初のリリースです。毎週の動画の確認・承認・投稿、撮影カードを使った撮影、準備完了のお知らせに対応しました。医院のアカウント作成とプランの選択もアプリでできます。
```

### العربية (ar-SA)

```text id=ar-SA.subtitle
فيديوهات أسبوعية لعيادتك
```

```text id=ar-SA.promo
فيديوهات توعية المرضى لهذا الأسبوع على هاتفك: شاهدها ووافق عليها، ثم احفظها وانشرها من حسابات عيادتك.
```

```text id=ar-SA.keywords
طبيب أسنان,طب الأسنان,توعية المرضى,محتوى,ترجمة,تقويم
```

```text id=ar-SA.description
يُعدّ DentVideo فيديوهات قصيرة لتوعية المرضى لعيادات الأسنان. كل يوم اثنين تصل إلى هاتفك خمسة فيديوهات جديدة جاهزة لمراجعتك.

كل فيديو بتعليق صوتي وترجمة بلغتك، ويحمل اسم عيادتك وألوانها وشعارها. قبل أن ترى أي نص، يراجعه برنامج من حيث الدقة السريرية وقواعد الإعلان الصحي في بلدك. لا يُنشر شيء دون موافقتك، وتنشر من حساباتك الخاصة.

هذا الأسبوع
شاهد كل فيديو بملء الشاشة، واقرأ ملاحظات المراجعة، ثم وافق أو ارفض. ويمكنك أيضًا الموافقة على كل الفيديوهات الجاهزة دفعة واحدة.

النشر
احفظ الفيديو في الصور وانسخ النص والوسوم بلمسة واحدة، ثم افتح Instagram أو TikTok أو التطبيق الذي تنشر منه. لكل فيديو يوم ووقت مقترحان، مع تذكيرات اختيارية.

التسجيل
صوّر نفسك وأمامك على الشاشة بطاقة تصوير تذكّرك بما تقوله. يُرفع المقطع في الخلفية، ثم نحرره ونضيف الترجمة وشعارك. (باقة Practice)

دون اتصال
تبقى الفيديوهات التي وافقت عليها على هاتفك، جاهزة للنشر.

الإعدادات
بيانات العيادة، ولغة الفيديوهات، وصوت الراوي، والنبرة، وجملة الختام.

يصلك إشعار صباح الاثنين عندما يصبح أسبوعك جاهزًا.

البداية
أنشئ حساب عيادتك في التطبيق، وأدخل بيانات العيادة، وشاهد فيديوهات نموذجية بألوانك. ثم اختر باقة شهرية: Starter للفيديوهات الأسبوعية، أو Practice التي تضيف تسجيلاتك الخاصة. هل تستخدم عيادتك DentVideo بالفعل؟ سجّل الدخول بحسابك.

الاشتراكات
Starter وPractice اشتراكان شهريان يتجددان تلقائيًا. تُحتسب الدفعة على حساب Apple الخاص بك عند تأكيد الشراء. يتجدد الاشتراك كل شهر ما لم يُلغَ قبل نهاية الفترة الحالية بـ 24 ساعة على الأقل. يمكنك إدارة الاشتراك أو إلغاؤه من إعدادات حساب Apple. حذف حسابك في DentVideo لا يلغي اشتراك App Store.

متوفر بالعربية والإنجليزية والألمانية والإسبانية والتركية والفرنسية واليابانية والبولندية.

شروط الاستخدام: https://dentvideo.com/ar/terms
سياسة الخصوصية: https://dentvideo.com/ar/privacy
```

```text id=ar-SA.whatsnew
الإصدار الأول: راجع فيديوهاتك الأسبوعية ووافق عليها وانشرها، وسجّل باستخدام بطاقات التصوير، واحصل على إشعار عندما يصبح أسبوعك جاهزًا. أنشئ حساب عيادتك واختر باقتك من التطبيق.
```

### Polski (pl)

```text id=pl.subtitle
Cotygodniowe filmy gabinetu
```

```text id=pl.promo
Filmy dla pacjentów z tego tygodnia w telefonie: obejrzyj, zaakceptuj, zapisz i opublikuj z kont swojego gabinetu.
```

```text id=pl.keywords
dentysta,stomatolog,stomatologia,edukacja pacjenta,media społecznościowe,napisy,ortodoncja
```

```text id=pl.description
DentVideo przygotowuje krótkie filmy edukacyjne dla pacjentów gabinetów stomatologicznych. W każdy poniedziałek na Twój telefon trafia pięć nowych filmów, gotowych do przejrzenia.

Każdy film ma narrację i napisy w Twoim języku oraz nazwę, kolory i logo gabinetu. Zanim zobaczysz scenariusz, oprogramowanie sprawdza go pod kątem poprawności klinicznej i zasad reklamy usług zdrowotnych w Twoim kraju. Nic nie zostanie opublikowane bez Twojej akceptacji, a publikujesz z własnych kont.

TEN TYDZIEŃ
Obejrzyj każdy film na pełnym ekranie, przeczytaj uwagi ze sprawdzenia, a potem zaakceptuj lub odrzuć. Wszystkie gotowe filmy możesz też zaakceptować naraz.

PUBLIKACJA
Zapisz film w Zdjęciach i jednym dotknięciem skopiuj opis z hashtagami, potem otwórz Instagram, TikTok lub aplikację, w której publikujesz. Każdy film ma sugerowany dzień i godzinę oraz opcjonalne przypomnienia.

NAGRYWANIE
Nagraj siebie, a karta nagrania na ekranie podpowie, co powiedzieć. Klip przesyła się w tle; montujemy go i dodajemy napisy oraz logo. (Plan Practice)

OFFLINE
Zaakceptowane filmy zostają w telefonie, gotowe do publikacji.

USTAWIENIA
Dane gabinetu, język filmów, głos lektora, ton i zdanie końcowe.

W poniedziałek rano powiadomienie informuje, że Twój tydzień jest gotowy.

NA POCZĄTEK
Załóż konto gabinetu w aplikacji, uzupełnij jego dane i obejrzyj przykładowe filmy w Twoich kolorach. Potem wybierz plan miesięczny: Starter z cotygodniowymi filmami lub Practice, który dodaje Twoje własne nagrania. Twój gabinet już korzysta z DentVideo? Zaloguj się na swoje konto.

SUBSKRYPCJE
Starter i Practice to automatycznie odnawiane subskrypcje miesięczne. Płatność jest pobierana z Twojego konta Apple po potwierdzeniu zakupu. Subskrypcja odnawia się co miesiąc, chyba że zostanie anulowana co najmniej 24 godziny przed końcem bieżącego okresu. Możesz nią zarządzać lub ją anulować w ustawieniach konta Apple. Usunięcie konta DentVideo nie anuluje subskrypcji w App Store.

Dostępna po polsku, angielsku, niemiecku, hiszpańsku, turecku, francusku, japońsku i arabsku.

Warunki korzystania: https://dentvideo.com/pl/terms
Polityka prywatności: https://dentvideo.com/pl/privacy
```

```text id=pl.whatsnew
Pierwsza wersja: przeglądaj, akceptuj i publikuj cotygodniowe filmy, nagrywaj z kartami nagrania i otrzymuj powiadomienie, gdy tydzień jest gotowy. Załóż konto gabinetu i wybierz plan w aplikacji.
```

---

## 3. App Privacy ("Data Collection")

Derived from the code on `claude/dentvideo-ios-polish` (`Core/Sources/DentVideoCore/APIClient.swift`:
sign-in, devices, items, clinic, upload-url, recording, account/delete) and the server routes on
`claude/dentvideo-iap-server`. The app contains no analytics, advertising, crash-reporting or
tracking SDK; the only third-party SDK in the IAP build is RevenueCat (purchases).

**Tracking: No.** No data is used to track people across other companies' apps or websites, no
IDFA, no data broker. `NSPrivacyTracking` is `false` and there are no tracking domains.

### Current build (matches `ios/DentVideo/App/Resources/PrivacyInfo.xcprivacy` exactly)

| App Store Connect data type | Collected | Linked to user | Tracking | Purpose | What it is in the code |
|---|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | No | App Functionality | sign-in (`POST session`), password reset |
| User Content → Photos or Videos | Yes | Yes | No | App Functionality | the dentist's recordings (`upload-url`, `recording`) |
| User Content → Audio Data | Yes | Yes | No | App Functionality | the sound of those recordings |
| User Content → Other User Content | Yes | Yes | No | App Functionality | clinic profile from Settings (`POST clinic`: name, city, country, language, services, tone, address, handle, booking link, brand colour, closing line, narrator voice) and decline notes (`PATCH items`) |
| Identifiers → Device ID | Yes | Yes | No | App Functionality | the APNs push token (`POST devices`) for the "week ready" notification; deleted on sign-out |
| Usage Data → Product Interaction | Yes | Yes | No | Analytics | approving a video records a `video_approved` event for the clinic (`dentvid_events`, first-party only) |
| Diagnostics → Crash Data, Performance Data | **No** | | | | no crash or performance SDK; crash reports a user chooses to share with developers are collected by Apple, not by the app |
| Location, Health & Fitness, Financial Info, Contacts, Browsing/Search History, Sensitive Info, Name, Phone, Physical Address, Other Diagnostic Data | No | | | | not collected |

Payment card data is never collected: Apple handles the payment.

### IAP build: add these two (and to `PrivacyInfo.xcprivacy` in the same PR as the paywall)

| Data type | Collected | Linked | Tracking | Purpose | Why |
|---|---|---|---|---|---|
| Purchases → Purchase History | Yes | Yes | No | App Functionality | RevenueCat and our webhook record which plan the clinic bought, renewals and refunds (RevenueCat's own guidance: linked when the app user id can be tied to an email, which ours is) |
| Identifiers → User ID | Yes | Yes | No | App Functionality | the account's id is passed to RevenueCat as `app_user_id` (`Purchases.logIn`) |

With in-app sign-up, the email address of a person who signs up but does not buy also receives up to
three "finish your setup" emails (`web/src/lib/dentvid/lifecycle.ts`). That is marketing for our own
product, so Email Address should then also carry the purpose **Developer's Advertising or
Marketing** (owner decision 5).

### Privacy policy check (dentvideo.com/privacy, read 2026-11-17)

The policy covers recordings, clinic data, approvals and Dodo billing. It does **not** mention the
iPhone app's push token, App Store / Apple billing or RevenueCat. Add before submitting (all eight
languages), suggested English text:

> **iPhone app.** If you allow notifications, we store your phone's push notification token with
> your account to send the "your week is ready" notice; it is deleted when you sign out on that
> phone, turn the notice off, or delete your account. If you subscribe in the app, Apple processes
> the payment; Apple and our subscription service provider RevenueCat, Inc. (USA) tell us which plan
> was bought, when it renews and whether it was refunded, linked to your DentVideo account. The app
> contains no advertising or tracking software.

---

## 4. In-app purchases (subscription group "DentVideo")

Product ids, levels and prices: `DENTVIDEO_IAP_PLAN.md` §1 and §2. Display names stay the plan names
used everywhere ("Starter", "Practice"): Apple does not allow diacritics in subscription display
names, and the website and app use the same untranslated names in all eight languages. No prices and
no numbers in any text.

Subscription group display name, every language:

```text id=iap.group
DentVideo
```

App name display option: "Use App Name".

Per language: Starter display name (30), Starter description (45), Practice display name (30),
Practice description (45).

```text id=en-US.iap.starter.name
Starter
```

```text id=en-US.iap.starter.desc
Weekly videos for your clinic
```

```text id=en-US.iap.practice.name
Practice
```

```text id=en-US.iap.practice.desc
Weekly videos plus your own recordings
```

```text id=tr.iap.starter.name
Starter
```

```text id=tr.iap.starter.desc
Kliniğinize haftalık videolar
```

```text id=tr.iap.practice.name
Practice
```

```text id=tr.iap.practice.desc
Haftalık videolar ve kendi kayıtlarınız
```

```text id=de-DE.iap.starter.name
Starter
```

```text id=de-DE.iap.starter.desc
Wochenvideos für Ihre Praxis
```

```text id=de-DE.iap.practice.name
Practice
```

```text id=de-DE.iap.practice.desc
Wochenvideos und Ihre eigenen Aufnahmen
```

```text id=es-ES.iap.starter.name
Starter
```

```text id=es-ES.iap.starter.desc
Vídeos semanales para tu clínica
```

```text id=es-ES.iap.practice.name
Practice
```

```text id=es-ES.iap.practice.desc
Vídeos semanales y tus propias grabaciones
```

```text id=fr-FR.iap.starter.name
Starter
```

```text id=fr-FR.iap.starter.desc
Les vidéos de la semaine du cabinet
```

```text id=fr-FR.iap.practice.name
Practice
```

```text id=fr-FR.iap.practice.desc
Vidéos de la semaine et vos enregistrements
```

```text id=ja.iap.starter.name
Starter
```

```text id=ja.iap.starter.desc
医院向けの毎週の患者説明動画
```

```text id=ja.iap.practice.name
Practice
```

```text id=ja.iap.practice.desc
毎週の動画と、ご自身で撮影した動画の編集
```

```text id=ar-SA.iap.starter.name
Starter
```

```text id=ar-SA.iap.starter.desc
فيديوهات أسبوعية لعيادتك
```

```text id=ar-SA.iap.practice.name
Practice
```

```text id=ar-SA.iap.practice.desc
فيديوهات أسبوعية وتسجيلاتك الخاصة
```

```text id=pl.iap.starter.name
Starter
```

```text id=pl.iap.starter.desc
Cotygodniowe filmy dla gabinetu
```

```text id=pl.iap.practice.name
Practice
```

```text id=pl.iap.practice.desc
Filmy co tydzień i Twoje własne nagrania
```

Each subscription also needs a **review screenshot** of the paywall (one image, not shown to
customers) once the paywall exists, and the review note below.

---

## 5. App Review information

**Sign-in required** (the field above the notes): `appreview@dentvideo.com` and its password from
`~/.config/dentvideo/inceleme-demo.env` (never in the repo or a chat). This is the demo clinic
**with** a plan (`APP_STORE_DENTVIDEO.md` §1.5).

**Second account** (for the paywall and the sandbox purchase, `DENTVIDEO_IAP_PLAN.md` §11): proposed
address `appreview.purchase@dentvideo.com`, no plan, no clinic yet. Before submitting: create it,
enter the 6-digit code to prove the address (an unproven address can never activate a sandbox
purchase), and put it in `DENTVID_IAP_SANDBOX_ALLOW_EMAILS` on the web app. Its password goes into
the notes in App Store Connect only, where `<PASSWORD 2>` stands below.

**Contact**: the owner's name, email and phone (international format with +).

**Notes** (4000 bytes; replace the two placeholders in App Store Connect, not here):

```text id=review.notes
DentVideo is a service for dental clinics. Every Monday it delivers short patient-education videos made for the clinic. In this app the clinic's dentist reviews them, approves or declines them, saves them to Photos with the caption copied for posting on the clinic's own Instagram or TikTok, and records their own clips with filming cards (on-screen prompts).

WHY THE DENTIST APPROVES EVERY VIDEO
The videos are health information published under the clinic's name, and the clinic is responsible for what it publishes. Our software checks each script for clinical accuracy and for the clinic's national health-advertising rules, but the dentist is the professional who decides. We never post anything: the app saves the video and copies the text, and the clinic posts from its own accounts.

ACCOUNT 1, WITH A PLAN (entered under Sign-in required)
This clinic's week holds three ready videos. Please try:
- This week > open a video > play it > Approve (or Decline with a note).
- "Post this video" > "Save video and copy text" (Photos permission is asked here).
- Record > open a filming card > record a short take (camera and microphone are asked only here).
- Settings > Delete account: type the confirmation word; the account is deleted on our server.
This clinic's plan was arranged outside the app, so it sees no paywall, only a neutral note that its plan is managed outside the app (no link, no price).

ACCOUNT 2, WITHOUT A PLAN (for the purchase)
Email: appreview.purchase@dentvideo.com  Password: <PASSWORD 2>
Sign in, fill in the short clinic form (any name and city), look at the sample videos, then the plan screen shows Starter and Practice with the price from the App Store, the renewal terms, Terms of Use, Privacy Policy and Restore Purchases. Buy either plan with your sandbox Apple Account. The plan shows as active once our server receives the App Store notification, usually within a minute.
Please use this account for the purchase: sandbox purchases switch on the service only for our own test accounts, so that test builds cannot activate a real clinic's paid service. An account you create yourself in the app can see the paywall, but a sandbox purchase on it stays pending.

IN-APP PURCHASE
The two plans are auto-renewable monthly subscriptions in one group (Starter, level 2; Practice, level 1, adds the dentist's own recordings). There are no free trials, offers or other purchasable items. Purchases go through StoreKit (RevenueCat). Restore Purchases is on the plan screen. If an account with an App Store subscription is deleted, the app explains that deleting the account does not cancel the subscription and opens Apple's subscription management.

ACCOUNT CREATION AND DELETION
New clinics can sign up on the first screen with an email and a password; a 6-digit code is sent by email. Account deletion is in Settings for every account.

PERMISSIONS AND DATA
Camera and microphone only in Record; Photos (add only) when saving a video; notifications for one push when the week's videos are ready (Monday morning) and optional local posting reminders set in Settings. No tracking, no ads, no analytics or crash SDKs.
```

---

## 6. Screenshots

The set in the scratchpad (`ios/appstore/`, made by `ios/DentVideo/scripts/appstore_shots.py` from
the CI `dentvideo-screens-store` artifact, demo mode, fictional "Riverside" clinic) holds 53 files:

| Folder | Files | Size | Use |
|---|---|---|---|
| `en/`, `tr/`, `de/`, `es/`, `fr/`, `ja/`, `ar/`, `pl/` | `1-week-full`, `2-video-review`, `3-post-ready`, `4-camera-live`, `5-record`, `6-videos` (6 each, 48) | 1320 × 2868 | iPhone 6.9", per language |
| `ipad-en/` | `1-week-full`, `3-post-ready`, `4-camera-live`, `5-record`, `6-videos` (5; **no `2-video-review`**) | 2064 × 2752 | iPad 13", English; other languages fall back to the primary language's iPad set |

Checked by eye on 2026-11-17, every image: the caption is in the same language as the screen under
it, Arabic is right to left, the caption text equals `CAPTIONS` in `appstore_shots.py`, no price, no
purchase wording, no device frame, no rating or review. The terms match this listing: "Monday" (1),
approve / decline (2), save and copy (3), the filming card word of each language (4, 5: filming card,
çekim kartı, Drehkarte, tarjeta de grabación, fiche de tournage, 撮影カード, بطاقة تصوير, karta
nagrania), language, voice and closing line (6). Screens 4 and 5 show the Record feature, which the
description marks as part of the Practice plan (guideline 2.3.2).

Captions as printed on the images (the checker compares these with `appstore_shots.py`):

```text id=en-US.captions
Your week’s videos, ready on Monday
Watch, then approve or decline
Saved and copied, ready to post
Record with your talking points on screen
A filming card for every topic
Your language, your voice, your closing line
```

```text id=tr.captions
Haftanın videoları pazartesi hazır
İzleyin, sonra onaylayın ya da reddedin
Kaydedildi, kopyalandı, paylaşıma hazır
Konuşma maddeleri ekranda, siz kayıtta
Her konu için bir çekim kartı
Diliniz, sesiniz, kapanış cümleniz
```

```text id=de-DE.captions
Ihre Wochenvideos, fertig am Montag
Ansehen, dann freigeben oder ablehnen
Gesichert und kopiert, bereit zum Posten
Aufnehmen mit den Stichpunkten im Bild
Eine Drehkarte für jedes Thema
Ihre Sprache, Ihre Stimme, Ihr Schlusssatz
```

```text id=es-ES.captions
Los vídeos de tu semana, listos el lunes
Míralo y apruébalo o recházalo
Guardado y copiado, listo para publicar
Graba con tus puntos clave en pantalla
Una tarjeta de grabación por tema
Tu idioma, tu voz, tu frase de cierre
```

```text id=fr-FR.captions
Les vidéos de la semaine, prêtes le lundi
Regardez, puis validez ou refusez
Enregistrée et copiée, prête à publier
Filmez avec vos points clés à l’écran
Une fiche de tournage par sujet
Votre langue, votre voix, votre phrase de fin
```

```text id=ja.captions
今週の動画は月曜日に届きます
見て、承認または見送り
保存とコピーが完了、すぐに投稿
話すポイントを画面に表示して撮影
テーマごとの撮影カード
言語も声も、締めのひと言も
```

```text id=ar-SA.captions
فيديوهات أسبوعك جاهزة يوم الاثنين
شاهد، ثم وافق أو ارفض
تم الحفظ والنسخ، جاهز للنشر
سجّل والنقاط الرئيسية على الشاشة
بطاقة تصوير لكل موضوع
لغتك وصوتك وجملة الختام
```

```text id=pl.captions
Filmy na ten tydzień, gotowe w poniedziałek
Obejrzyj, potem zaakceptuj lub odrzuć
Zapisane i skopiowane, gotowe do publikacji
Nagrywaj z punktami wypowiedzi na ekranie
Karta nagrania do każdego tematu
Twój język, Twój głos, Twoje zdanie końcowe
```

Small points, none blocking: the iPad set has no video-review screen (five are enough; Apple
needs one to ten); the filming-card screens show a fictional dentist's script ("Whitening is safe on
healthy enamel"), which is sample content inside the app, not a claim of the listing; none of the
screenshots shows sign-up or the paywall, which is fine for the store (the paywall goes to the
In-App Purchase review screenshot instead).

---

## 7. Owner decisions

1. **Which build is 1.0.** This listing describes the IAP build. If 1.0 goes out before the paywall
   exists: delete the "GETTING STARTED" and "SUBSCRIPTIONS" paragraphs and the Terms line, replace
   them with the sign-in sentence of `APP_STORE_DENTVIDEO.md` §3 ("Sign in with your clinic's
   DentVideo account."), drop the second sentence of What's New, create no In-App Purchases, and use
   the review notes of `APP_STORE_DENTVIDEO.md` §2 (3.1.3(c)). The "(Practice plan)" marker on
   Record can stay.
2. **App Review and pending sandbox purchases.** With `DENTVID_IAP_SANDBOX=internal`, a reviewer
   who creates their own account and buys in the sandbox gets no activation (the server ignores it
   on purpose). The notes ask them to use account 2, but a reviewer who ignores that may report
   "purchase does not unlock" (guideline 2.1). Options: keep `internal` and rely on the notes
   (recommended; it is the security decision of 2026-11-17), or make sure the app's "activating"
   state says clearly that the purchase is being confirmed. Either way, the paywall build must show
   a calm pending state, not an error.
3. **Second review account**: create `appreview.purchase@dentvideo.com` (or another `@dentvideo.com`
   address whose mail you can read, for the 6-digit code), prove it, add it to
   `DENTVID_IAP_SANDBOX_ALLOW_EMAILS`, and reset it (delete the clinic's App Store plan) before each
   resubmission.
4. **Age rating**: "Frequent" medical or treatment information gives 16+ and asks for the Regulated
   Medical Devices declaration (answer: not a device). "Infrequent" would give 13+ but is not true
   for an app whose every video is patient education. Recommended: Frequent.
5. **Marketing purpose for email**: with in-app sign-up, people who do not buy receive the
   activation emails. Declare Email Address also for "Developer's Advertising or Marketing" and add
   `NSPrivacyCollectedDataTypePurposeDeveloperAdvertising` to the manifest, or stop those emails for
   accounts created in the app. Recommended: declare it.
6. **Privacy policy and terms**: add the iPhone app paragraph (§3) to `/privacy` in eight languages,
   and an "App Store subscriptions" section to `/terms` (billed by Apple, cancel in Apple Account
   settings, Apple's refund process). Today `/terms` lists only the web prices and Dodo; App Review
   opens the terms link from the description and the paywall. The web prices on that page are
   allowed (it is not in the app), but say nothing there that tells app users to buy on the web.
7. **Name**: kept as plain "DentVideo" everywhere. A descriptive name ("DentVideo: Clinic Videos")
   would add search words, but changes the brand on the home screen label too (the label comes from
   the build, not from App Store Connect, so they would differ). Recommended: keep "DentVideo".
8. **What's New**: Apple does not show it for version 1.0. The texts are for TestFlight "What to
   Test" now and for 1.0.1 later.
9. **Prices** (not in this file on purpose): set them in App Store Connect per
   `DENTVIDEO_IAP_PLAN.md` §2 and §12 (match the number, nearest Apple price point), and list the exact
   points for the owner before saving.
