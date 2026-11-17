# DentVideo for iPhone: App Store package

Everything the owner needs to put the DentVideo iPhone app (`ios/DentVideo`, bundle id
`com.bulsulabs.dentvideo`) on the App Store. The plan and the review-risk analysis are in
`docs/IOS_APP_PLAN.md`; the mobile API's security notes are in `docs/SECURITY.md`.

Rules for every text here (CLAUDE.md): no "best", "#1", "leading", no invented numbers or
customers, no prices, no medical or outcome claims, nothing that tells people to buy or subscribe
on the web.

---

## 1. Owner setup, in order

### 1.1 Apple Developer (developer.apple.com → Certificates, Identifiers & Profiles)

1. **Identifiers → +** → App IDs → App → Bundle ID (explicit) `com.bulsulabs.dentvideo`,
   description "DentVideo". Team `YA6Y85MSY6` (the same team as ClipForge, already in
   `ios/DentVideo/project.yml`).
2. Capabilities on that App ID: **Push Notifications** and **Associated Domains**. Nothing else
   (no Sign in with Apple, no App Groups, no In-App Purchase needed).
3. **Keys**: the team's existing APNs key (the one ClipForge's worker uses) works for every app of
   the team. If there is none: Keys → + → "Apple Push Notifications service (APNs)", download the
   `.p8` once, note the Key ID.

### 1.2 Server (Coolify, web app `y11bhiffmpb3u2hdekwhjhdq`)

| Variable | Value |
|---|---|
| `APNS_KEY_ID` | the key's Key ID |
| `APNS_TEAM_ID` | `YA6Y85MSY6` |
| `APNS_KEY_P8` | the `.p8` file's contents, line breaks written as `\n` |
| `DENTVID_APNS_BUNDLE_ID` | `com.bulsulabs.dentvideo` (also the default) |
| `APPLE_TEAM_ID` | `YA6Y85MSY6` (already used for ClipForge's universal links) |

Then apply `supabase/liman/0023_dentvid_devices.sql` by hand (check queries at its end). Without
it the app works but no push is sent (the "ready" email still goes).

Check after deploy: `curl -s https://dentvideo.com/.well-known/apple-app-site-association` must
answer `{"applinks":{"apps":[],"details":[{"appID":"YA6Y85MSY6.com.bulsulabs.dentvideo","paths":["/app","/app/*"]}]}}`
with `Content-Type: application/json`, and the same URL on clipforge.bulsulabs.com must still
name ClipForge.

### 1.3 Build on a Mac (or let CI build it)

```bash
brew install xcodegen
cd ios/DentVideo && xcodegen generate && open DentVideo.xcodeproj
```

- Core tests: `cd ios/DentVideo/Core && swift test` (also runs on Linux).
- CI: GitHub → Actions → "iOS DentVideo" → Run workflow (or open a PR that touches
  `ios/DentVideo/**`). It runs the Core tests and builds the app for the simulator, unsigned.
- Archive: Xcode → Product → Archive (scheme DentVideo, Release) → Distribute → App Store Connect.
  Automatic signing creates the profiles; `aps-environment` is `production` in Release.

### 1.4 App Store Connect → My Apps → +

- Platform iOS, name **DentVideo**, primary language English (U.S.), bundle id
  `com.bulsulabs.dentvideo`, SKU `dentvideo-ios`, full access.
- **Pricing**: Free. **No in-app purchases** (do not create any).
- **Availability**: the countries DentVideo serves.
- **Category**: primary **Business**, secondary **Photo & Video**.
  *Why not Medical*: the app does not diagnose, treat or give health advice to anyone; it is a
  workflow tool for a clinic's own social-media videos (review, approve, post, record). Medical
  would set wrong expectations for users and draws the medical-app checks (1.4.1) that do not
  apply; Business matches what it is: software a company uses to run part of its business.
- **Support URL**: `https://dentvideo.com/help`. **Marketing URL**: `https://dentvideo.com`.
  **Privacy Policy URL**: `https://dentvideo.com/privacy`.
- **Copyright**: `2026 BLS AI AUTOMATION DOO`.

### 1.5 Demo account for App Review (never commit its password)

One command creates it on Liman, with the service role and no payment, **after** the worker with
`review_demo` (migration 0024, worker `getsWeeks`) is deployed:

```
scripts/dentvideo-review-demo/run.sh --worker-has-review-demo
```

It backs up the dentvid tables, applies 0024 (idempotent), creates `appreview@dentvideo.com`
(confirmed, `app_metadata.internal`, so it stays out of the metrics) with the password from
`~/.config/dentvideo/inceleme-demo.env` (chmod 600, sent over ssh stdin, never printed), and a clinic
"DentVideo Review Clinic" (English, US, Practice set by hand, emails opted out, `review_demo = true`).
Its current week holds the three English site samples (`web/public/dentvideo/samples/en`: no
render, no API spend), all "ready" and undecided, each with a filming card, so the reviewer can
approve, decline, post and record.

- `review_demo = true` keeps the clinic out of the Monday batch and the delivery watchdogs, and a
  "week" or "restyle" job for it makes nothing (worker `getsWeeks`, `paying`). The reviewer's own
  recording is still processed (transcription plus the script checks per clip, under the spend
  guard), so the recording flow works; that is the only paid work the demo clinic can cause.
- Put the email and password in App Store Connect → App Review Information → Sign-in required.
- The week moves on every Saturday 18:00 UTC. The day before submitting, bring the samples into the
  current week: `update dentvid_items set week_of = date_trunc('week', now() + interval '30 hours')::date,
  approval = 'pending', posted_at = null where clinic_id = (select id from dentvid_clinics where review_demo);`
- If a reviewer deletes the account (5.1.1(v)), run the script again before resubmitting.

---

## 1.6 In-app purchase (planned, not live)

The app will sell Starter and Practice monthly through Apple in-app purchase (RevenueCat project
"DentVideo", subscription group "DentVideo", products `dentvideo_starter_monthly` /
`dentvideo_practice_monthly`). Server side, App Store Connect / RevenueCat runbook, price points and
review notes: `docs/DENTVIDEO_IAP_PLAN.md`. Until that build ships, the notes below (no purchase in the
app) are the ones to use; the IAP build replaces the 3.1.3 paragraph with §11 of that file.

## 2. App Review notes (paste into "Notes")

> DentVideo is a business service for dental clinics. Each week it delivers short patient-education
> videos made for the clinic; this app lets the clinic's dentist review them, approve or decline
> them, save them to Photos with the caption copied for posting on the clinic's own Instagram or
> TikTok, and record their own clips with on-screen prompts.
>
> Sign in with the demo clinic account provided above. Then: open a video in "This week", play it,
> approve it, tap "Post this video" → "Save video and copy text". In "Record", open a filming card
> and record a short take (camera and microphone permissions are requested only there).
> Settings contains account deletion (Settings → Delete account), which deletes the account on our
> server.
>
> Purchasing: DentVideo is sold only to dental clinics (businesses), under a business agreement
> between the clinic and us, for use by the clinic's own staff, under guideline 3.1.3(c) Enterprise
> Services. Payment is processed on our website by our payment provider (merchant of record). The app contains no purchasing,
> no prices, and no buttons, links or text directing users to purchase. Accounts without an active
> plan see a neutral account-status screen with sign-out and account deletion only. Account
> creation happens outside the app.
>
> Notifications: one push when the clinic's weekly videos are ready (Monday morning) and optional
> local posting reminders the user turns on in Settings. No tracking, no ads, no third-party SDKs.

---

## 3. Metadata in eight languages

Limits: name 30, subtitle 30, keywords 100 characters (commas between), promotional text
170, description 4000. Name is "DentVideo" in every language.

### English (en-US, primary)

- **Subtitle**: Weekly videos for your clinic
- **Keywords**: dentist,dental,clinic,practice,video,reels,patient education,social media,captions,approve
- **Promotional text**: Your week's patient-education videos on your phone: watch, approve, and post to Instagram or TikTok in a few taps.
- **Description**:

  DentVideo is the companion app for dental clinics that use DentVideo.

  Every Monday your clinic receives short, narrated and captioned patient-education videos in your
  language, with your clinic's name, colours and logo. Each script is software-checked for clinical
  accuracy and your country's health-advertising rules before you see it. Nothing is published
  without your approval, and you post from your own accounts.

  This app makes the weekly routine quick:

  • THIS WEEK — watch each video full screen, read the check notes, approve or decline, or approve
  all ready videos at once.
  • POST — save the video to Photos and copy the caption and hashtags in one tap, then open
  Instagram, TikTok or any app you post with. Each video comes with a suggested day and time, and
  optional reminders.
  • RECORD — film yourself with the talking points on screen. Your clip uploads in the background;
  we edit it, add captions and your logo.
  • OFFLINE — approved videos stay on your phone, ready to post without waiting.
  • SETTINGS — clinic details, video language, narrator voice, tone and closing line.

  A notification on Monday morning tells you when your week is ready.

  Sign in with your clinic's DentVideo account. Available in English, German, Spanish, Turkish,
  French, Japanese, Arabic and Polish.

- **What's new (1.0)**: First release: review, approve and post your weekly videos, record with filming cards, and get notified when your week is ready.

### Deutsch (de-DE)

- **Subtitle**: Wochenvideos für Ihre Praxis
- **Keywords**: zahnarzt,zahnarztpraxis,praxis,video,reels,patientenaufklärung,social media,untertitel,freigabe
- **Promotional text**: Die Patientenvideos Ihrer Woche auf dem Telefon: ansehen, freigeben und mit wenigen Tippern auf Instagram oder TikTok posten.
- **Description**:

  DentVideo ist die Begleit-App für Zahnarztpraxen, die DentVideo nutzen.

  Jeden Montag erhält Ihre Praxis kurze, vertonte und untertitelte Patientenvideos in Ihrer
  Sprache, mit Name, Farben und Logo Ihrer Praxis. Jedes Skript wird vorher softwaregestützt auf
  fachliche Richtigkeit und die Werberegeln Ihres Landes geprüft. Nichts wird ohne Ihre Freigabe
  veröffentlicht, und Sie posten von Ihren eigenen Konten.

  Mit der App geht die Woche schnell:

  • DIESE WOCHE – jedes Video im Vollbild ansehen, Prüfhinweise lesen, freigeben oder ablehnen,
  oder alle fertigen Videos auf einmal freigeben.
  • POSTEN – Video in Fotos sichern und Text samt Hashtags mit einem Tipp kopieren, dann Instagram,
  TikTok oder eine andere App öffnen. Zu jedem Video gibt es einen Vorschlag für Tag und Uhrzeit,
  auf Wunsch mit Erinnerung.
  • AUFNEHMEN – sich selbst filmen, mit den Stichpunkten im Bild. Der Clip wird im Hintergrund
  hochgeladen; wir schneiden ihn und fügen Untertitel und Ihr Logo hinzu.
  • OFFLINE – freigegebene Videos bleiben auf dem Telefon, bereit zum Posten.
  • EINSTELLUNGEN – Praxisdaten, Videosprache, Sprecherstimme, Tonfall und Schlusssatz.

  Am Montagmorgen sagt Ihnen eine Mitteilung, dass Ihre Woche fertig ist.

  Melden Sie sich mit dem DentVideo-Konto Ihrer Praxis an. Verfügbar auf Deutsch, Englisch,
  Spanisch, Türkisch, Französisch, Japanisch, Arabisch und Polnisch.

- **What's new**: Erste Version: Wochenvideos prüfen, freigeben und posten, mit Drehkarten aufnehmen und benachrichtigt werden, sobald die Woche fertig ist.

### Español (es-ES)

- **Subtitle**: Vídeos semanales de tu clínica
- **Keywords**: dentista,clínica dental,odontología,vídeo,reels,educación del paciente,redes sociales,subtítulos
- **Promotional text**: Los vídeos de la semana para tus pacientes, en tu teléfono: míralos, apruébalos y publícalos en Instagram o TikTok en pocos toques.
- **Description**:

  DentVideo es la app complementaria para clínicas dentales que usan DentVideo.

  Cada lunes tu clínica recibe vídeos cortos de educación para pacientes, narrados y subtitulados
  en tu idioma, con el nombre, los colores y el logo de tu clínica. Cada guion se revisa por
  software en cuanto a exactitud clínica y normas de publicidad sanitaria de tu país antes de que
  lo veas. Nada se publica sin tu aprobación y publicas desde tus propias cuentas.

  La app agiliza tu semana:

  • ESTA SEMANA: mira cada vídeo a pantalla completa, lee las notas de la revisión, apruébalo o
  recházalo, o aprueba de una vez todos los que están listos.
  • PUBLICAR: guarda el vídeo en Fotos y copia el texto con los hashtags en un toque; después abre
  Instagram, TikTok o la app que uses. Cada vídeo trae un día y una hora sugeridos y recordatorios
  opcionales.
  • GRABAR: grábate con los puntos clave en pantalla. El clip se sube en segundo plano; lo editamos
  y añadimos subtítulos y tu logo.
  • SIN CONEXIÓN: los vídeos aprobados se quedan en el teléfono, listos para publicar.
  • AJUSTES: datos de la clínica, idioma de los vídeos, voz del narrador, tono y frase de cierre.

  El lunes por la mañana un aviso te dice que tu semana está lista.

  Inicia sesión con la cuenta de DentVideo de tu clínica. Disponible en español, inglés, alemán,
  turco, francés, japonés, árabe y polaco.

- **What's new**: Primera versión: revisa, aprueba y publica tus vídeos semanales, graba con tarjetas y recibe un aviso cuando tu semana esté lista.

### Türkçe (tr)

- **Subtitle**: Kliniğinize haftalık videolar
- **Keywords**: diş hekimi,diş kliniği,muayenehane,video,reels,hasta bilgilendirme,sosyal medya,altyazı
- **Promotional text**: Haftanın hasta bilgilendirme videoları telefonunuzda: izleyin, onaylayın ve birkaç dokunuşla Instagram'da ya da TikTok'ta paylaşın.
- **Description**:

  DentVideo, DentVideo kullanan diş klinikleri için yardımcı uygulamadır.

  Her pazartesi kliniğinize kendi dilinizde, seslendirmeli ve altyazılı, kliniğinizin adı, renkleri
  ve logosuyla kısa hasta bilgilendirme videoları gelir. Her senaryo, siz görmeden önce klinik
  doğruluk ve ülkenizin sağlık reklamı kuralları açısından yazılımla kontrol edilir. Onayınız
  olmadan hiçbir şey yayınlanmaz; paylaşımı kendi hesaplarınızdan yaparsınız.

  Uygulama haftalık işi kısaltır:

  • BU HAFTA: her videoyu tam ekran izleyin, kontrol notlarını okuyun, onaylayın ya da reddedin;
  dilerseniz hazır olanların hepsini tek seferde onaylayın.
  • PAYLAŞ: videoyu Fotoğraflar'a kaydedin, açıklama ve etiketleri tek dokunuşla kopyalayın, sonra
  Instagram'ı, TikTok'u ya da kullandığınız uygulamayı açın. Her video için önerilen gün ve saat
  vardır; isterseniz hatırlatma da alırsınız.
  • KAYDET: konuşma maddeleri ekrandayken kendinizi çekin. Klip arka planda yüklenir; düzenler,
  altyazı ve logonuzu ekleriz.
  • ÇEVRİMDIŞI: onaylanan videolar telefonunuzda kalır, paylaşmaya hazırdır.
  • AYARLAR: klinik bilgileri, video dili, anlatıcı sesi, üslup ve kapanış cümlesi.

  Haftanız hazır olduğunda pazartesi sabahı bir bildirim gelir.

  Kliniğinizin DentVideo hesabıyla giriş yapın. Türkçe, İngilizce, Almanca, İspanyolca, Fransızca,
  Japonca, Arapça ve Lehçe olarak kullanılabilir.

- **What's new**: İlk sürüm: haftalık videolarınızı inceleyin, onaylayın ve paylaşın, çekim kartlarıyla kayıt yapın, haftanız hazır olduğunda bildirim alın.

### Français (fr-FR)

- **Subtitle**: Les vidéos de votre cabinet
- **Keywords**: dentiste,cabinet dentaire,chirurgien-dentiste,vidéo,reels,information patient,réseaux sociaux
- **Promotional text**: Les vidéos patients de votre semaine sur votre téléphone : regardez, validez et publiez sur Instagram ou TikTok en quelques gestes.
- **Description**:

  DentVideo est l'application compagnon des cabinets dentaires qui utilisent DentVideo.

  Chaque lundi, votre cabinet reçoit de courtes vidéos d'information patient, narrées et
  sous-titrées dans votre langue, aux nom, couleurs et logo de votre cabinet. Chaque script est
  vérifié par logiciel pour l'exactitude clinique et les règles de publicité de santé de votre pays
  avant que vous ne le voyiez. Rien n'est publié sans votre validation, et vous publiez depuis vos
  propres comptes.

  L'app rend la semaine rapide :

  • CETTE SEMAINE – regardez chaque vidéo en plein écran, lisez les notes de vérification, validez
  ou refusez, ou validez d'un coup toutes les vidéos prêtes.
  • PUBLIER – enregistrez la vidéo dans Photos et copiez la légende et les hashtags d'un geste, puis
  ouvrez Instagram, TikTok ou l'app de votre choix. Chaque vidéo a un jour et une heure suggérés,
  avec rappels facultatifs.
  • FILMER – filmez-vous avec les points clés à l'écran. Le clip s'envoie en arrière-plan ; nous le
  montons et ajoutons sous-titres et logo.
  • HORS LIGNE – les vidéos validées restent sur le téléphone, prêtes à publier.
  • RÉGLAGES – informations du cabinet, langue des vidéos, voix off, ton et phrase de fin.

  Le lundi matin, une notification vous prévient que votre semaine est prête.

  Connectez-vous avec le compte DentVideo de votre cabinet. Disponible en français, anglais,
  allemand, espagnol, turc, japonais, arabe et polonais.

- **What's new**: Première version : vérifiez, validez et publiez vos vidéos de la semaine, filmez avec des fiches et soyez prévenu quand votre semaine est prête.

### 日本語 (ja)

- **Subtitle**: 歯科医院の毎週の動画
- **Keywords**: 歯科,歯医者,歯科医院,クリニック,動画,リール,患者説明,SNS,字幕,インスタ
- **Promotional text**: 今週の患者さん向け動画をスマホで。確認して承認し、数回のタップでInstagramやTikTokに投稿できます。
- **Description**:

  DentVideoは、DentVideoをご利用の歯科医院のためのアプリです。

  毎週月曜日、医院の名前・色・ロゴが入った、ナレーションと字幕付きの短い患者さん向け動画が、
  ご希望の言語で届きます。すべての台本は、臨床的な正確さと国の医療広告ルールについて、
  事前にソフトウェアでチェックされます。承認なしに公開されることはなく、投稿は医院ご自身の
  アカウントから行います。

  アプリで毎週の作業がすぐに終わります。

  • 今週 ― 動画を全画面で再生し、チェックのメモを読んで、承認または見送り。準備できた動画を
  まとめて承認することもできます。
  • 投稿 ― ワンタップで動画を「写真」に保存し、キャプションとハッシュタグをコピー。あとは
  InstagramやTikTokなど投稿に使うアプリを開くだけです。動画ごとにおすすめの曜日と時間があり、
  リマインダーも設定できます。
  • 撮影 ― 話すポイントを画面に表示したまま撮影。動画はバックグラウンドでアップロードされ、
  編集・字幕・ロゴ入れを行います。
  • オフライン ― 承認した動画は端末に保存され、すぐに投稿できます。
  • 設定 ― 医院の情報、動画の言語、ナレーションの声、トーン、締めのひと言。

  動画ができた月曜の朝に通知でお知らせします。

  医院のDentVideoアカウントでサインインしてください。日本語、英語、ドイツ語、スペイン語、
  トルコ語、フランス語、アラビア語、ポーランド語に対応しています。

- **What's new**: 最初のリリース：毎週の動画の確認・承認・投稿、撮影カードを使った撮影、準備完了のお知らせに対応しました。

### العربية (ar-SA)

- **Subtitle**: فيديوهات أسبوعية لعيادتك
- **Keywords**: طبيب أسنان,عيادة أسنان,عيادة,فيديو,ريلز,توعية المرضى,تواصل اجتماعي,ترجمة
- **Promotional text**: فيديوهات توعية المرضى لهذا الأسبوع على هاتفك: شاهدها ووافق عليها وانشرها على Instagram أو TikTok ببضع لمسات.
- **Description**:

  DentVideo هو التطبيق المرافق لعيادات الأسنان التي تستخدم DentVideo.

  كل يوم اثنين تتلقى عيادتك فيديوهات قصيرة لتوعية المرضى بلغتك، مع تعليق صوتي وترجمة، وتحمل اسم
  عيادتك وألوانها وشعارها. يُراجَع كل نص آليًا من حيث الدقة السريرية وقواعد الإعلان الصحي في بلدك
  قبل أن تراه. لا يُنشر شيء دون موافقتك، وتنشر من حساباتك الخاصة.

  يجعل التطبيق عمل الأسبوع سريعًا:

  • هذا الأسبوع: شاهد كل فيديو بملء الشاشة، واقرأ ملاحظات المراجعة، ووافق أو ارفض، أو وافق على كل
  الفيديوهات الجاهزة دفعة واحدة.
  • النشر: احفظ الفيديو في الصور وانسخ النص والوسوم بلمسة واحدة، ثم افتح Instagram أو TikTok أو
  التطبيق الذي تنشر منه. لكل فيديو يوم ووقت مقترحان مع تذكيرات اختيارية.
  • التسجيل: صوّر نفسك والنقاط الرئيسية على الشاشة. يُرفع المقطع في الخلفية، ثم نحرره ونضيف
  الترجمة وشعارك.
  • دون اتصال: تبقى الفيديوهات المعتمدة على هاتفك جاهزة للنشر.
  • الإعدادات: بيانات العيادة ولغة الفيديوهات وصوت الراوي والنبرة وجملة الختام.

  يصلك إشعار صباح الاثنين عندما يصبح أسبوعك جاهزًا.

  سجّل الدخول بحساب DentVideo الخاص بعيادتك. متوفر بالعربية والإنجليزية والألمانية والإسبانية
  والتركية والفرنسية واليابانية والبولندية.

- **What's new**: الإصدار الأول: راجع فيديوهاتك الأسبوعية ووافق عليها وانشرها، وسجّل باستخدام بطاقات التصوير، واحصل على إشعار عندما يصبح أسبوعك جاهزًا.

### Polski (pl)

- **Subtitle**: Cotygodniowe filmy gabinetu
- **Keywords**: dentysta,stomatolog,gabinet stomatologiczny,wideo,rolki,edukacja pacjenta,social media,napisy
- **Promotional text**: Filmy dla pacjentów z tego tygodnia w telefonie: obejrzyj, zaakceptuj i opublikuj na Instagramie lub TikToku kilkoma dotknięciami.
- **Description**:

  DentVideo to aplikacja towarzysząca dla gabinetów stomatologicznych korzystających z DentVideo.

  W każdy poniedziałek gabinet otrzymuje krótkie filmy edukacyjne dla pacjentów, z narracją i
  napisami w Twoim języku, z nazwą, kolorami i logo gabinetu. Każdy scenariusz jest wcześniej
  sprawdzany przez oprogramowanie pod kątem poprawności klinicznej i zasad reklamy usług zdrowotnych
  w Twoim kraju. Nic nie zostanie opublikowane bez Twojej akceptacji, a publikujesz z własnych kont.

  Aplikacja skraca cotygodniową pracę:

  • TEN TYDZIEŃ – oglądaj każdy film na pełnym ekranie, czytaj uwagi ze sprawdzenia, akceptuj lub
  odrzucaj, albo zaakceptuj od razu wszystkie gotowe.
  • PUBLIKACJA – zapisz film w Zdjęciach i jednym dotknięciem skopiuj opis z hashtagami, potem
  otwórz Instagram, TikTok lub inną aplikację. Każdy film ma sugerowany dzień i godzinę oraz
  opcjonalne przypomnienia.
  • NAGRYWANIE – nagraj siebie z punktami wypowiedzi na ekranie. Klip przesyła się w tle; montujemy
  go i dodajemy napisy oraz logo.
  • OFFLINE – zaakceptowane filmy zostają w telefonie, gotowe do publikacji.
  • USTAWIENIA – dane gabinetu, język filmów, głos lektora, ton i zdanie końcowe.

  W poniedziałek rano powiadomienie informuje, że tydzień jest gotowy.

  Zaloguj się kontem DentVideo swojego gabinetu. Dostępna po polsku, angielsku, niemiecku,
  hiszpańsku, turecku, francusku, japońsku i arabsku.

- **What's new**: Pierwsza wersja: przeglądaj, akceptuj i publikuj cotygodniowe filmy, nagrywaj z kartami i otrzymuj powiadomienie, gdy tydzień jest gotowy.

---

## 4. Age rating (App Store Connect questionnaire)

All "None" / "No", except: **Medical or Treatment Information: Frequent** (every video is dental
patient education about a treatment or care topic, so "Frequent" is the honest answer; expect 16+,
which does not matter for a business app; 2.3.6 wants honest answers). Unrestricted web access:
**No** (the privacy link opens Safari; there are no in-app Help or Terms links, because the help
center covers billing and the terms list prices, see 3.1.3). User-generated content shared with other users: **No** (a
clinic's recordings are visible only to that clinic). Messaging, gambling, contests, ads: **No**.
Accept whatever rating Apple computes from these answers.

## 5. App Privacy ("Data Collection")

Tracking: **No** (no data is used to track people across apps or websites, no IDFA, no ad SDK).
Matches `ios/DentVideo/App/Resources/PrivacyInfo.xcprivacy`.

| Data type | Collected | Linked to the user | Purpose | Notes |
|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | App Functionality | sign-in |
| User Content → Photos or Videos | Yes | Yes | App Functionality | recordings the dentist uploads |
| User Content → Audio Data | Yes | Yes | App Functionality | the sound of those recordings |
| User Content → Other User Content | Yes | Yes | App Functionality | clinic profile edited in Settings, decline notes |
| Identifiers → Device ID | Yes | Yes | App Functionality | the APNs push token, to deliver the "week ready" notification (declared to be safe; it identifies the phone for push only) |
| Usage Data → Product Interaction | Yes | Yes | Analytics | approving a video records a `video_approved` event on the clinic (`dentvid_events`, owner metrics); no third party |
| Everything else (location, contacts, health, financial, browsing, search, diagnostics, purchases) | No | | | the app has no analytics or crash SDK |

Payment data is not collected by the app (no purchases in the app).

**Privacy policy addition (owner, all eight languages)**: dentvideo.com/privacy describes
recordings and clinic data already, but not the iPhone app's push token. Suggested English
paragraph for section 2 ("What we collect"):

> If you use the DentVideo iPhone app and allow notifications, we store your phone's push
> notification token with your account to send you the "your week is ready" notice. It is deleted
> when you sign out on that phone, turn the notice off, or delete your account. The app contains no
> analytics, advertising or tracking software.

## 6. Screenshots

Taken from the simulator with the demo clinic (or the `#Preview` sample data), light mode, English
first, then each language from the same screens. No device frames with invented reviews, no prices,
no claims in captions.

| # | Screen | Caption idea (EN) |
|---|---|---|
| 1 | This week (progress bar, five cards, "Approve all ready") | Your week's videos, ready on Monday |
| 2 | Video detail (player, "Software-checked…", Approve / Decline) | Watch, then approve or decline |
| 3 | Post sheet after "Save video and copy text" | Saved and copied, ready to post |
| 4 | Record: camera with the filming card overlay | Record with your talking points on screen |
| 5 | Settings (video language, narrator, closing line) | Your language, your voice, your closing line |
| 6 | Arabic This week (right to left), optional | Eight languages |

Sizes: **iPhone 6.9"** 1320 × 2868 (required); App Store Connect scales it down for smaller
iPhones. Because the app also runs on iPad (`TARGETED_DEVICE_FAMILY 1,2`), **iPad 13"**
2064 × 2752 screenshots are required too (same screens, iPad simulator). If the owner prefers not
to make iPad screenshots, set `TARGETED_DEVICE_FAMILY: "1"` in `project.yml` (iPhone only).

Simulator: `xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100`
before capturing; capture with `xcrun simctl io booted screenshot shot.png`.

## 7. Universal links and deep links

- `https://dentvideo.com/app` and `/app/*` open the app when installed (the emails' "Check it in the
  app" links included); served by `web/src/app/.well-known/apple-app-site-association/route.ts`
  (per host, `lib/dentvid/aasa.ts`), entitlement `applinks:dentvideo.com`.
- The email's signed "approve & share" links (`/post?…`, `/api/dentvideo/approve?…`) stay on the
  web on purpose (they work without signing in).
- A push or a posting reminder opens the week (or the video it names).

## 8. Before each submission

- [ ] Demo account signs in, has an active plan and a ready week.
- [ ] `swift test` in `ios/DentVideo/Core` green; CI "iOS DentVideo" green.
- [ ] Archive installs on a real iPhone: sign in, push arrives (it comes with the Monday notice;
      to test earlier, POST `/api/internal/dentvideo/notify` for the demo clinic with the worker's
      `WORKER_INTERNAL_TOKEN` — it also sends the email; the admin "resend" sends the email only),
      offline start in airplane mode,
      save to Photos, Instagram and TikTok hand-off, a recording uploads while the app is in the
      background, VoiceOver pass, Arabic, largest text size, dark mode.
- [ ] No price, no purchase wording in the build (the Core localisation test enforces it for
      strings; check screenshots by eye).
- [ ] Version and build number raised in `project.yml`.
