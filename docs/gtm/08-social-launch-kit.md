# 08 — DentVideo's own social launch kit (Instagram + LinkedIn)

Written 2026-11-12. Everything a founder needs to make the DentVideo Instagram business account and LinkedIn page look
credible on Day 1, before the first DM (02 requires "bio, link, 9+ posts of sample videos" before any Instagram DM).

**Where the files are.** Videos and images are not in git. They are rendered locally by
[`scripts/render-social-kit.mts`](../../scripts/render-social-kit.mts) (compositions in
[`scripts/social-kit/Kit.tsx`](../../scripts/social-kit/Kit.tsx)) into one folder:

```
social-kit/
  reels/NN-<id>.mp4                     12 Reels, 1080×1920, H.264 + AAC, ≤ 30 s
  covers/NN-<id>-1080x1920.jpg          the Reel's cover (upload as cover)
  covers/NN-<id>-1080x1350.jpg          4:5 grid crop
  covers/NN-<id>-1080x1440.jpg          3:4 grid crop (Instagram's current, taller grid)
  profile/avatar-1080.png               profile picture
  profile/highlight-<id>-1080x1920.png  6 highlight covers
  profile/linkedin-banner-1584x396.png  LinkedIn page banner
  profile/grid-contact-sheet-day0.jpg   how the grid looks after posts 1–9 (3 pinned)
  profile/grid-contact-sheet-week4.jpg  … and after post 12
  render-report.txt                     what was tightened, which background photos
```

To render again (zero API spend: it reuses the preview library's narration; nothing calls OpenAI or Pexels):

```bash
# 1. the dev harness, for the screen recordings (the /dentvideo/dev/* pages 404 without the flag)
cd web && DENTVIDEO_DEV_PREVIEW=1 npx next dev -p 3000      # plus the dummy env vars from .env.example
# 2. render (from worker/, like the other scripts)
cd worker && npx tsx ../scripts/render-social-kit.mts ~/social-kit --capture http://localhost:3000
#    --only tr-beyazlatma,kontrol   one or a few posts   --skip-video   covers only
#    --flows check                  with --capture: re-record only those screens
#    reels already in reels/ are kept (resumable); delete one or pass --force to render it again
```

## Ground rules this kit keeps (and you must keep when you edit captions)

1. **Every clinic video here is a sample.** The clinics are fictional and named as such: *Örnek Diş Kliniği*,
   *Clínica Dental de Ejemplo*, *Beispiel-Zahnarztpraxis*. No handle is shown (a made-up handle could be someone's real
   account). A badge on every sample Reel says so on screen, and every caption says so in words.
2. **No superlatives, no promised results, no testimonials, no client counts.** We have no customers to quote.
3. **The check is "a careful filter, not legal advice"**, and **the dentist approves every video**. Say both whenever the
   check is mentioned.
4. **The narration is a synthetic voice** (the landing's own FAQ says so). Turn on Instagram's **AI label** for the 9
   sample Reels (Advanced settings → "Add AI label") and keep the line in the caption. The 3 explainers have no voice.
5. Prices only as in `docs/gtm/README.md`: Starter $49/month; founding offer = Practice at $49/month for 12 months for
   the first 100 clinics. Never a countdown, never "only N left" unless read from `/admin` that day.
6. Sample videos are **general information, not a substitute for an examination** — each caption says that too.

## The 12 posts (posting order)

| # | File id | Kind | Language | Topic | Grid tile |
| --- | --- | --- | --- | --- | --- |
| 01 | `dentvideo-nedir` | Explainer | TR | What DentVideo is | paper (pinned) |
| 02 | `tr-implant-asamalari` | Sample clinic | TR | İmplant tedavisinin aşamaları | teal |
| 03 | `tr-beyazlatma` | Sample clinic | TR | Beyazlatma ve hassasiyet | teal |
| 04 | `nasil-calisir` | Explainer | TR | How it works, 3 steps | paper (pinned) |
| 05 | `tr-cocuk` | Sample clinic | TR | Çocuklarda çürüğü önlemek | teal |
| 06 | `tr-dis-tasi` | Sample clinic | TR | Diş taşı temizliği | teal |
| 07 | `kontrol` | Explainer | TR | The two checks; what we don't do | paper (pinned) |
| 08 | `tr-seffaf-plak` | Sample clinic | TR | Şeffaf plak nasıl uygulanır? | teal |
| 09 | `es-blanqueamiento` | Sample clinic | ES | Blanqueamiento y sensibilidad | teal |
| 10 | `tr-implant-bakim` | Sample clinic | TR | İmplant sonrası bakım | teal |
| 11 | `de-aligner-pflege` | Sample clinic | DE | Aligner richtig pflegen | teal |
| 12 | `es-limpieza` | Sample clinic | ES | Después de una limpieza | teal |

Sample clinic Reels are the product's own composition (`worker/src/remotion/Video.tsx`) drawing the live-preview library
plans with the sample clinic's name, colour (TR clay `#b6774f`, ES blue `#1f4e79`, DE green `#2e7d6b`), a plain monogram
logo and the background photos a real week would pick. Three TR originals ran 32–38 s; they were tightened to ≤ 30 s
the way an editor would (pauses between sentences cut to 0.25 s, then a speed-up of at most 18 %, with every scene moved
by the same time map so captions stay on the words) — see `render-report.txt` for the exact numbers.

## Captions and hashtags

Paste as written. Hashtags go at the end of the caption (not in a comment). Keep the "sample" line; it is the
compliance line, not decoration.

### 01 · `dentvideo-nedir` (TR, explainer)

> Diş klinikleri için hasta bilgilendirme videoları: her pazartesi beş kısa dikey video. Seslendirilmiş, altyazılı,
> kliniğinizin logosu ve renkleriyle.
>
> Her metin, siz görmeden önce iki kez kontrol edilir: bir kez sağlık tanıtım kurallarına, bir kez klinik doğruluğa
> göre. Bu dikkatli bir filtredir, hukuki danışmanlık değildir. Videoyu siz onaylarsınız, siz paylaşırsınız; DentVideo
> hiçbir şeyi kendi kendine paylaşmaz.
>
> Ödeme yapmadan önce kendi logonuz ve renginizle canlı önizlemeyi görebilirsiniz. Bağlantı profilde.
>
> Bu hesaptaki klinik videoları örnektir; “Örnek Diş Kliniği” gerçek bir klinik değildir.
>
> #dişhekimi #dişhekimliği #dişkliniği #hastabilgilendirme #ağızvedişsağlığı #klinikyönetimi

### 02 · `tr-implant-asamalari` (TR, sample)

> Örnek video · İmplant tedavisinin aşamaları
>
> Bir kliniğin DentVideo'dan aldığı videolardan biri böyle görünür: Türkçe seslendirme, altyazı, kliniğin logosu ve
> rengi. Metin, paylaşılmadan önce sağlık tanıtım kurallarına ve klinik doğruluğa göre kontrol edilir; son onay diş
> hekimindedir.
>
> “Örnek Diş Kliniği” gerçek bir klinik değildir; logo ve renk örnek içindir. Seslendirme sentetik bir sestir. Video
> genel bilgi verir, muayenenin yerini tutmaz.
>
> Kendi kliniğinizin adı ve renginde önizleme: profildeki bağlantı.
>
> #dişhekimi #dişkliniği #implant #hastabilgilendirme #dişhekimliği

### 03 · `tr-beyazlatma` (TR, sample)

> Örnek video · Beyazlatma ve hassasiyet
>
> Hastaların sık sorduğu bir soru, kliniğinizin renkleriyle kısa bir videoda. DentVideo her hafta bu tür konuları,
> hastaların gerçekten aradığı sorulardan seçer; metin iki kez kontrol edilir, siz onaylamadan hiçbir şey paylaşılmaz.
>
> “Örnek Diş Kliniği” gerçek bir klinik değildir. Seslendirme sentetik bir sestir. Video genel bilgi verir, muayenenin
> yerini tutmaz.
>
> Önizleme: profildeki bağlantı.
>
> #dişhekimi #dişbeyazlatma #dişkliniği #hastabilgilendirme #ağızvedişsağlığı

### 04 · `nasil-calisir` (TR, explainer)

> DentVideo nasıl çalışır?
>
> 1. Kliniğinizi tanıtın: ad, hizmetler, logo ve renk. Yalnızca bir kez, yaklaşık iki dakika.
> 2. Canlı önizleme: videolarınızın kendi renginizle nasıl görüneceğini ödeme yapmadan önce görün.
> 3. Her pazartesi yeni videolar gelir: izleyin, onaylayın, telefonunuzdan paylaşın.
>
> Ücretsiz deneme yok; onun yerine ödemeden önce kendi önizlemeniz var. Aylık plan, taahhüt yok. İlk 100 kliniğe
> kurucu fiyatı: Practice planı 12 ay boyunca aylık $49.
>
> Ekrandaki klinik adı örnektir.
>
> #dişhekimi #dişkliniği #klinikyönetimi #hastabilgilendirme #dişhekimliği

### 05 · `tr-cocuk` (TR, sample)

> Örnek video · Çocuklarda çürüğü önlemek
>
> Ebeveynlerin sorduğu sorular için kısa, sakin bir anlatım: kliniğinizin logosu ve rengiyle, seslendirilmiş ve
> altyazılı. Metin sağlık tanıtım kurallarına ve klinik doğruluğa göre kontrol edilir; son onay hekimde.
>
> “Örnek Diş Kliniği” gerçek bir klinik değildir. Seslendirme sentetik bir sestir. Video genel bilgi verir, muayenenin
> yerini tutmaz.
>
> Önizleme: profildeki bağlantı.
>
> #dişhekimi #çocukdişhekimi #pedodonti #dişkliniği #hastabilgilendirme

### 06 · `tr-dis-tasi` (TR, sample)

> Örnek video · Diş taşı temizliği neden önemli?
>
> Hastaların randevudan önce merak ettiği bir konu. DentVideo'da her video kliniğin kimliğinde gelir; altyazılar sesi
> kapalı izleyenler için de okunur.
>
> “Örnek Diş Kliniği” gerçek bir klinik değildir. Seslendirme sentetik bir sestir. Video genel bilgi verir, muayenenin
> yerini tutmaz.
>
> Önizleme: profildeki bağlantı.
>
> #dişhekimi #diştaşı #ağızvedişsağlığı #dişkliniği #hastabilgilendirme

### 07 · `kontrol` (TR, explainer)

> “Acısız”, “garantili”, “bembeyaz”: sağlık hizmetleri tanıtımında tek bir kelime bile kurallara aykırı olabilir.
>
> DentVideo her metni siz görmeden önce iki kez kontrol eder: sağlık tanıtım kuralları ve klinik doğruluk. Göz
> atılması gereken bir video varsa nedeni kartın üzerinde yazar. Bu dikkatli bir filtredir, hukuki danışmanlık değildir;
> son söz hekimindir.
>
> DentVideo'da avatar doktor, sahte hasta, otomatik paylaşım ya da hasta sayısı vaadi yok.
>
> Ekrandaki klinik adı örnektir.
>
> #dişhekimi #dişkliniği #sağlıkiletişimi #klinikyönetimi #dişhekimliği

### 08 · `tr-seffaf-plak` (TR, sample)

> Örnek video · Şeffaf plak nasıl uygulanır?
>
> Tedavi sürecini adım adım anlatan kısa bir video, kliniğinizin renginde. Her pazartesi beş video gelir; hangilerini
> paylaşacağınıza siz karar verirsiniz.
>
> “Örnek Diş Kliniği” gerçek bir klinik değildir. Seslendirme sentetik bir sestir. Video genel bilgi verir, muayenenin
> yerini tutmaz.
>
> Önizleme: profildeki bağlantı.
>
> #dişhekimi #şeffafplak #ortodonti #dişkliniği #hastabilgilendirme

### 09 · `es-blanqueamiento` (ES, sample)

> Vídeo de ejemplo · Blanqueamiento y sensibilidad
>
> Así es uno de los vídeos que recibe una clínica con DentVideo: vertical, narrado en español, con subtítulos, el logo
> y el color de la clínica. Antes de que el dentista lo vea, el guion se revisa dos veces: normas de publicidad
> sanitaria y exactitud clínica. Es un filtro cuidadoso, no asesoría legal; el dentista aprueba cada vídeo y lo comparte
> desde su móvil.
>
> «Clínica Dental de Ejemplo» no es una clínica real. La voz es sintética. El vídeo es información general y no
> sustituye una consulta.
>
> Mira la vista previa con el nombre y los colores de tu clínica: enlace en el perfil.
>
> #odontologia #dentista #clinicadental #saluddental #blanqueamientodental

(For Mexico: "video" instead of "vídeo", "celular" instead of "móvil".)

### 10 · `tr-implant-bakim` (TR, sample)

> Örnek video · İmplant sonrası bakım
>
> Tedavi sonrası hastaların en çok sorduğu konular, kısa ve anlaşılır biçimde. Video kliniğin kimliğinde hazırlanır,
> hekim onayından sonra klinik tarafından paylaşılır.
>
> “Örnek Diş Kliniği” gerçek bir klinik değildir. Seslendirme sentetik bir sestir. Video genel bilgi verir; tedavi
> sonrası talimatlar için kendi diş hekiminize danışın.
>
> Önizleme: profildeki bağlantı.
>
> #dişhekimi #implant #dişkliniği #hastabilgilendirme #ağızvedişsağlığı

("en çok sorduğu" describes patients' questions, not a claim about the clinic; if in doubt write "sık sorduğu".)

### 11 · `de-aligner-pflege` (DE, sample)

> Beispielvideo · Aligner richtig pflegen
>
> So sieht eines der Videos aus, die eine Praxis mit DentVideo bekommt: Hochformat, auf Deutsch vertont, untertitelt,
> mit Logo und Farbe der Praxis. Bevor die Zahnärztin oder der Zahnarzt es sieht, wird jedes Skript zweimal geprüft:
> auf Werberecht im Gesundheitswesen und auf fachliche Richtigkeit. Die Prüfung ist ein sorgfältiger Filter, keine
> Rechtsberatung; freigegeben und geteilt wird von der Praxis selbst.
>
> „Beispiel-Zahnarztpraxis“ ist keine echte Praxis. Die Stimme ist synthetisch. Das Video ist allgemeine Information
> und ersetzt keine Untersuchung.
>
> Live-Vorschau mit Ihrem Praxisnamen und Ihren Farben: Link im Profil.
>
> #zahnarzt #zahnarztpraxis #zahnmedizin #patientenaufklärung #aligner

### 12 · `es-limpieza` (ES, sample)

> Vídeo de ejemplo · Después de una limpieza dental
>
> Una duda frecuente de los pacientes, explicada en menos de 30 segundos y con los colores de la clínica. Cada lunes
> llegan cinco vídeos; tú decides cuáles compartir.
>
> «Clínica Dental de Ejemplo» no es una clínica real. La voz es sintética. El vídeo es información general y no
> sustituye una consulta.
>
> Vista previa con tu logo y tus colores: enlace en el perfil.
>
> #odontologia #dentista #clinicadental #higienedental #saluddental

## Profile kit

### Instagram

| Field | Text |
| --- | --- |
| Username | `dentvideo` (or the closest free one; never one that looks like a clinic) |
| Name (≤30, searchable) | `DentVideo · Klinik videoları` (28) |
| Category | Software company (Yazılım şirketi) |
| Profile picture | `profile/avatar-1080.png` |
| Bio, TR (≤150) | Diş klinikleri için haftalık hasta bilgilendirme videoları. Her metin iki kez kontrol edilir, hekim onaylar. Klinik videoları örnektir. (135) |
| Bio, EN (≤150) | Weekly patient-education videos for dental clinics. Every script checked twice; the dentist approves. Clinic videos here are samples. (133) |
| Link 1 (label "Önizleme") | `https://dentvideo.com/tr?utm_source=instagram&utm_medium=bio&utm_campaign=tr-launch` |
| Link 2, optional ("Vista previa") | `https://dentvideo.com/es?utm_source=instagram&utm_medium=bio&utm_campaign=es-launch` |
| Link 3, optional ("Vorschau") | `https://dentvideo.com/de?utm_source=instagram&utm_medium=bio&utm_campaign=de-launch` |
| Contact button | E-mail: hello@dentvideo.com. No phone/WhatsApp button unless a founder will answer it. |

Use the TR bio while Türkiye is the focus; switch to EN when ES/DE outreach starts in earnest (one bio at a time).

**Highlights** (cover file → title → what goes in it; add each as a Story first, then save to the highlight):

| Cover | Title | Contents |
| --- | --- | --- |
| `highlight-ornekler` (play) | Örnekler | Each sample Reel shared to Stories, with the "örnek" sticker text |
| `highlight-nasil` (steps) | Nasıl? | Explainer 04, then three Stories: clinic → preview → approve |
| `highlight-kontrol` (shield) | Kontrol | Explainer 07; a Story with "dikkatli bir filtre, hukuki danışmanlık değil" |
| `highlight-fiyat` (tag) | Fiyat | Starter $49/ay; Practice $99/ay; kurucu teklifi (ilk 100 klinik, Practice 12 ay $49/ay); ücretsiz deneme yok, önizleme var |
| `highlight-sss` (question) | SSS | 3–5 answers copied from the landing FAQ, word for word |
| `highlight-diller` (globe) | Diller | One Story per language sample (TR, ES, DE): "10 dilde video" |

### LinkedIn company page

- **Banner:** `profile/linkedin-banner-1584x396.png` (text sits right of where LinkedIn overlaps the page logo).
- **Logo:** `profile/avatar-1080.png`. **Tagline / About:** as in `05-listings-copy.md` → "LinkedIn company page".

**Launch post — EN** (company page; each founder reshares with one personal line):

> Today we're opening DentVideo to dental clinics.
>
> DentVideo is a web app that makes short patient-education videos for dental clinics: five vertical videos every
> Monday, narrated, captioned and in the clinic's own logo and colours. Before the dentist sees a script, it is checked
> twice — once for health-advertising rules, once for clinical accuracy. It's a careful filter, not legal advice. The
> dentist approves every video and shares it from their own phone; nothing is posted automatically.
>
> What we deliberately don't do: avatar doctors, fake patients, auto-posting, or promises of patient numbers.
>
> Videos in 10 languages. We're starting with clinics in Türkiye, then Spain, Mexico and the German-speaking countries.
>
> There's no free trial. Instead, you can see a live preview of your own clinic's video, with your logo and colours,
> before paying. Plans start at $49/month, monthly, no minimum term. The first 100 clinics get the Practice plan at
> $49/month for 12 months.
>
> We're a two-person team at Bulsu Labs, so there are no reviews yet — you'd be one of our first clinics. If you work in
> or with a dental clinic, we'd value honest feedback: what would make you trust a tool with your practice's name?
>
> [One true sentence on why we built it — fill in or delete; do not invent.]
>
> Preview: https://dentvideo.com/?utm_source=linkedin&utm_medium=social&utm_campaign=launch

Attach explainer 01 (`reels/01-dentvideo-nedir.mp4`) or the banner image.

**Launch post — TR** (founders' profiles; Turkish dentists and clinic managers):

> Bugün DentVideo'yu diş kliniklerine açıyoruz.
>
> DentVideo, diş klinikleri için kısa hasta bilgilendirme videoları hazırlayan bir web uygulaması: her pazartesi beş
> dikey video; seslendirilmiş, altyazılı, kliniğin kendi logosu ve renkleriyle. Hekim bir metni görmeden önce metin iki
> kez kontrol edilir: bir kez sağlık tanıtım kurallarına, bir kez klinik doğruluğa göre. Bu dikkatli bir filtredir,
> hukuki danışmanlık değildir. Her videoyu hekim onaylar ve kendi telefonundan paylaşır; hiçbir şey otomatik paylaşılmaz.
>
> Bilerek yapmadıklarımız: avatar doktor, sahte hasta, otomatik paylaşım ya da hasta sayısı vaadi.
>
> Videolar 10 dilde. Türkiye'deki kliniklerle başlıyoruz.
>
> Ücretsiz deneme yok; onun yerine ödeme yapmadan önce kendi kliniğinizin logosu ve renkleriyle canlı önizlemeyi
> görebilirsiniz. Planlar aylık $49'dan başlıyor, aylık, taahhütsüz. İlk 100 klinik, Practice planını 12 ay boyunca
> aylık $49'a kullanır.
>
> Bulsu Labs'te iki kişilik bir ekibiz; henüz yorum ya da referansımız yok — ilk kliniklerimizden biri olursunuz. Bir
> diş kliniğinde ya da kliniklerle çalışıyorsanız dürüst görüşünüzü çok isteriz: kliniğinizin adını bir araca emanet
> etmek için neye ihtiyaç duyardınız?
>
> [Neden yaptığımıza dair tek bir doğru cümle — doldurun ya da silin; uydurmayın.]
>
> Önizleme: https://dentvideo.com/tr?utm_source=linkedin&utm_medium=social&utm_campaign=tr-launch

## Content calendar — first 4 weeks (12 posts)

Day 1 = the Monday the first DMs go out (04). Example dates assume Day 1 = Mon 16 Nov 2026; shift as needed.
02 asks for 9+ sample posts **before** the first DM, so posts 1–9 go out on Day 0 and the grid is complete from the
first DM onwards. After that, one new post a week keeps the account alive without competing with outreach time.

| When | Instagram feed | Instagram Stories | LinkedIn |
| --- | --- | --- | --- |
| **Day 0** (Sun 15 Nov) | Posts **01 → 09** in order, ~10 min apart. Then pin **07, 04, 01** in that order so 01 sits top-left (check the profile; re-pin if Instagram orders them differently). Grid = `grid-contact-sheet-day0.jpg`. | Share 01 to Stories; build all 6 highlights. | Company page live with banner + About. |
| **Week 1** (Day 1, Mon 16 Nov) | — | Monday: one sample to Stories with "Her pazartesi" text. | **Launch post** EN (company page) + TR (both founders). |
| Week 1 (Thu 19 Nov) | — | Reply-to-question Story: "Hangi konuda video istersiniz?" (poll: implant / beyazlatma / çocuk) | Founders comment on replies only; no tagging of people who didn't engage. |
| **Week 2** (Thu 26 Nov) | Post **10** `tr-implant-bakim` | Share post 10; repost explainer 04 to Stories. | Upload explainer 04 natively with an EN caption ("How it works, in 3 steps — the clinic name on screen is a sample"). |
| **Week 3** (Thu 3 Dec) | Post **11** `de-aligner-pflege` | Share post 11 with "Auch auf Deutsch" text. | DE post by a founder: the OMR description (05) + post 11 video. |
| **Week 4** (Thu 10 Dec) | Post **12** `es-limpieza` | Share post 12 with "También en español". Grid now = `grid-contact-sheet-week4.jpg`. | ES post by a founder + post 12 video; then review: which posts brought profile visits / link taps (`/admin` UTMs). |

After week 4: the preview library still has unused samples (ES: 3, DE: 3, EN, FR, PL); render more with
`--only` after adding them to `POSTS`. Do not create new sample videos by spending on the pipeline just for social.

## Posting guide (each Reel)

1. Instagram → **+** → **Reel** → pick `reels/NN-<id>.mp4`. Don't add filters; don't add text on top (the video has it).
2. **Audio:** sample Reels keep their own narration — don't add music. Explainers are silent by design: add a quiet track
   from Instagram's audio library if you like (business accounts only get the commercial-use library), or leave silent.
3. **Edit cover → Add from camera roll** → `covers/NN-<id>-1080x1920.jpg`. In **profile grid crop** keep it centred;
   the title, phone and logo all sit inside the central 4:5 area, so both the 4:5 and the newer 3:4 grid show them whole.
4. Caption + hashtags from above. **Location:** none. **Tag people/products:** none.
5. **Advanced settings → Add AI label** on the 9 sample Reels (synthetic voice). Turn off "Allow remixing" for samples.
6. Share to Facebook only if the DentVideo Facebook page exists and someone will answer comments there.
7. After posting: check the Reel plays with sound off (captions are burned in) and the cover shows in the grid.
8. Comments: answer within the working day, in the commenter's language, with facts from `docs/gtm/README.md` only.
   Never argue about a competitor; never promise results; "you'd be one of our first clinics" if asked for references.
