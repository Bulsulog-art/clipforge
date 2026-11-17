# First six TikTok posts

Only real material: the TR sample videos in `web/public/dentvideo/samples/tr/`, screen recordings of the real app on
the **Örnek Diş Kliniği** test account, and screen recordings of the live site (dentvideo.com/tr and
dentvideo.com/tr/ad-checker). No AI imagery, no stock footage added, nothing filmed with people. The filmed sketches
in the content kit (KIT.md V1 to V7) come after these, once they are shot.

Why screen-led posts and not the samples themselves: TikTok makes "unoriginal or reused material without anything new"
ineligible for the For You feed (Community Guidelines, Integrity and Authenticity, effective 24 Sep 2026). A sample
posted as-is is template output. Each post below is an original screen recording with its own hook, and the sample
appears only inside it.

## Two things to fix before posting

1. **A made-up handle is burned into the TR samples.** The end card of `beyazlatma-hassasiyet` (and the implant
   sample) shows `@demodisklinigi` under "Demo Diş Kliniği". The 08 kit's rule is "no handle shown; a made-up handle
   could be someone's real account". It is free on TikTok today (checked), but Instagram was not checked. In every
   post below, **cut the sample before its end card**. Never blur or cover the mandatory TR sentence ("Her cerrahi
   veya girişimsel işlemde..."); cutting before the end card avoids it instead of masking it.
2. **Record on the Örnek Diş Kliniği test account, not the dev harness or the landing images.** The dev harness
   (`web/src/app/dentvideo/dev/app/page.tsx`) and the landing screenshots use **"Gülümse Diş Kliniği, İzmir"**, and the
   admin fixtures list "Dentpark İzmir" and "Beyaz Diş Kliniği". These read like real clinic names; any of them may
   exist. Nothing that shows them goes on TikTok. The covers in `covers/` use only crops where no clinic name is
   visible.

And one product finding while making cover 02: the ad checker marks **"Hastalarımız çok memnun." as Uygun**, while its
own FAQ on the same page says patient thanks and satisfaction statements are restricted under the 2025 regulation.
KIT V4 expects that line to be flagged as "hasta yorumu". Until the checker flags it, **leave that sentence out of the
on-screen text** in post 02 (the plan below already does), and pass the finding to whoever owns the checker rules.

## Settings that apply to every post

| Setting | Value |
|---|---|
| Content disclosure ("Disclose post content") | **On, "Your brand"**. Required: we promote our own product. TikTok then shows "Promotional content". |
| AI-generated content label | See the table further down: on when the sample's synthetic narration is audible, off otherwise. |
| Who can watch | Everyone |
| Comments | On (filters from SETTINGS.md) |
| Duet / Stitch | Off on posts where sample narration is audible (03, 05); on for the others |
| Allow download | Off (keeps sample health content from being re-posted without its context) |
| Music | None, or a Commercial Music Library track added in the app at low volume. Never a chart song. |
| Location tag | None (never tag a clinic or a city) |
| Language of caption | TR. EN/DE cuts later per KIT calendar. |

Hashtags: 3 to 5 real ones that dentists and their teams use (from KIT section 3). Base:
`#dişhekimi #dişhekimliği #dişkliniği`, plus one or two topic tags. No superlatives, no discount tags, no #fyp.

## Order and timing

Post two a week to start, Tuesday and Thursday or Sunday, around 21:30 Türkiye time (KIT section 3: TikTok is an
evening app for dentists). Pin 01, 02 and 03 after they are up. When KIT V1 ("Aynı cümle, bütün gün") is shot,
it goes in the pinned row in place of 01.

---

## 01 · Pazartesi sabahı gelen videolar

- **Cover:** `covers/01-pazartesi.png` (real card list screen, no clinic name visible)
- **Length:** 15 to 18 s, 9:16
- **Material:** iOS screen recording on the test phone, Örnek Diş Kliniği account, a delivered week with videos
  still waiting for approval.
- **Sequence:**
  1. 0 to 2 s: week screen. Text overlay (TikTok's own text tool), top third: **"Pazartesi sabahı, bir klinik
     hesabında"**
  2. 2 to 9 s: tap a card; the sample plays **muted** for a few seconds with its captions.
  3. 9 to 13 s: tap **Onayla**; the state changes.
  4. 13 to 16 s: tap **Paylaş**; stop as the share sheet opens. If the share sheet shows real contacts, cut before it.
  5. Last 2 s, small text: **"Örnek klinik. Siz onaylamadan hiçbir şey paylaşılmaz."**
- **Voice:** optional, the owner's own voice over the recording, recorded in a quiet room: "Pazartesi sabahı.
  Haftanın videoları kliniğin hesabında. Birini açıp izliyorum, uygunsa onaylıyorum. Onaylamadığım hiçbir şey
  paylaşılmıyor." A real human voice is the best signal this account has.
- **AI label:** off (sample muted, no synthetic audio; visuals are a real screen).
- **Caption:**
  > Pazartesi sabahı kliniğin hesabına haftanın hasta bilgilendirme videoları gelir, kliniğin dilinde ve logosuyla. Siz izleyip onaylamadan hiçbiri paylaşılmaz. Ekrandaki klinik örnektir.
  >
  > #dişhekimi #dişhekimliği #dişkliniği #hastabilgilendirme

## 02 · Klinik paylaşımında olmaması gereken kelimeler

- **Cover:** `covers/02-kirmizi-kalem.png` (a real result from the live checker, captured 17 Nov 2026 with the
  made-up text below; the check runs in the browser)
- **Length:** 18 to 22 s
- **Material:** phone screen recording of `dentvideo.com/tr/ad-checker` in Safari, no login.
- **Text to paste** (made up, belongs to no clinic):
  `Şehrin en iyi kliniğinde acısız implant. Sonuç garantili. Bu ay kampanyada.`
  (The fourth sentence from KIT V4 is left out because the checker currently passes it; see above.)
- **Sequence:**
  1. 0 to 2 s: the empty checker. Overlay: **"Bir klinik paylaşımında olmaması gereken kelimeler"**
  2. 2 to 6 s: paste the text, tap **Metnimi kontrol et**.
  3. 6 to 17 s: slow scroll through the result: "en iyi" (üstünlük iddiası), "acısız" (kesin vaat), "garantili"
     (garanti), "kampanyada" (Yasak · Türkiye), each with its "Bunun yerine" line readable for a beat.
  4. 17 to 20 s: hold on "Dikkatli bir filtre; hukuki görüş değildir."
  5. End text: **"Ücretsiz, hesap gerekmez. Metniniz tarayıcınızdan çıkmaz."**
- **Before filming:** paste the exact text once and film only what the checker really flags. If it flags differently
  on the day, change the overlay, not the checker.
- **AI label:** off.
- **Caption:**
  > "En iyi", "acısız", "garantili", "kampanyada". Klinik paylaşımlarında sık görülen ve sorun çıkarabilecek kelimeler. Kendi metninizi ücretsiz kontrol aracında deneyebilirsiniz, hesap gerekmez ve metin tarayıcınızdan çıkmaz. Dikkatli bir filtredir, hukuki danışmanlık değildir. Bağlantı profilde. Örnekteki metin uydurmadır.
  >
  > #dişhekimi #dişhekimliği #dişkliniği #sağlıkhukuku

## 03 · Logonuz bir videoda, hesap açmadan

- **Cover:** `covers/03-logo-onizleme.png` (the real "Logonuzla görün" button from dentvideo.com/tr)
- **Length:** 18 to 22 s
- **Material:** screen recording of dentvideo.com/tr: tap **Logonuzla görün**, upload the *Örnek Diş Kliniği*
  monogram (the plain monogram from the 08 kit), the preview builds, then plays **with its narration** for a few
  seconds.
- **Sequence:**
  1. 0 to 2 s: overlay **"Logonuz bir videoda. Hesap açmadan."**
  2. 2 to 10 s: logo upload and the preview building in the clinic's colour.
  3. 10 to 18 s: preview plays with sound. Cut before any end card with a handle.
  4. Small text throughout the playback: **"Örnek klinik. Seslendirme sentetiktir."**
- Do not call it a free video or a free trial. It is a free logo preview.
- **AI label:** **on** (audible synthetic narration; house rule, see below). Duet/Stitch off.
- **Caption:**
  > Logonuzu yükleyin, kliniğinizin logosu ve rengiyle örnek bir hasta bilgilendirme videosu görün. Hesap açmanız gerekmez. Videodaki klinik örnektir ve seslendirme sentetik bir sestir. Video genel bilgi verir, muayenenin yerini tutmaz. Bağlantı profilde.
  >
  > #dişhekimi #dişkliniği #dişhekimliği #hastabilgilendirme

## 04 · Sarı uyarı ne anlama geliyor?

- **Cover:** `covers/04-goz-atin.png` (real review screen with the "Göz atın" badge, no clinic name visible)
- **Length:** 15 to 18 s
- **Material:** screen recording on the Örnek account of a video that carries a **Göz atın** flag, if the test week
  has one. If no test video is flagged, skip this post until one is; do not stage a flag.
- **Sequence:**
  1. 0 to 2 s: overlay **"Sarı uyarı ne anlama geliyor?"**
  2. 2 to 10 s: open the flagged video; the box "Paylaşmadan önce kontrol edin" is visible; scroll so the flagged
     sentence is readable.
  3. 10 to 14 s: tap **Onayla** or **Reddet**, whichever the owner would really choose.
  4. End text: **"Dikkatli bir filtre, hukuki danışmanlık değil. Son karar hekimin."**
- **Voice (owner, optional):** "Bazen bir videonun yanında sarı bir uyarı görürsünüz. Yazılım bir ifadeyi
  işaretlemiş demektir. Paylaşmadan önce o cümleyi bir kez okuyun. Karar sizin."
- **AI label:** off (muted).
- **Caption:**
  > Her senaryo siz görmeden önce yazılımla kontrol edilir: sağlık tanıtım kuralları ve klinik doğruluk. Bir ifade işaretlenirse videonun yanında sarı bir uyarı çıkar. Dikkatli bir filtredir, hukuki danışmanlık değildir. Son karar her zaman hekimin. Ekrandaki klinik örnektir.
  >
  > #dişhekimi #dişhekimliği #dişkliniği #dişhekimiasistanı

## 05 · Diş taşı fırçayla çıkar mı?

- **Cover:** `covers/05-dis-tasi.png` (a frame of the real TR sample `dis-tasi-temizligi`, "Evde / Hekimde")
- **Length:** 16 to 20 s
- **Material:** screen recording on the Örnek account: open the card for the diş taşı video and let it play **with
  sound** for about ten seconds, then tap **Onayla**.
- **Sequence:**
  1. 0 to 2 s: overlay **"Hastalar soruyor: diş taşı fırçayla çıkar mı?"**
  2. 2 to 13 s: the sample plays inside the app screen (not full screen), audible, with its captions.
     Cut around the "Evde / Hekimde" and "Temizlikten sonra" frames; stop before the end card.
  3. 13 to 16 s: **Onayla**.
  4. Small text during playback: **"Örnek klinik. Seslendirme sentetiktir. Genel bilgidir."**
- Why this sample: it is a non-invasive, everyday topic. The implant and whitening samples are avoided at launch
  (SETTINGS.md section 5: invasive procedures and teeth whitening are the areas TikTok's commercial rules single out).
- **AI label:** **on**. Duet/Stitch off.
- **Caption:**
  > Hastaların sık sorduğu bir soru, kliniğin kendi videosunda sade bir dille. Klinik bu videoyu kendi logosu ve dilinde alır, hekim onaylarsa paylaşılır. Örnek klinik, seslendirme sentetik bir sestir. Video genel bilgi verir, muayenenin yerini tutmaz.
  >
  > #dişhekimi #dişkliniği #dişhekimliği #hastabilgilendirme #diştaşı

## 06 · Videolar kliniğinizin dilinde

- **Cover:** `covers/06-klinik-dili.png` (real settings fields "Ülke" and "Videolarınızın dili", cropped above the
  clinic name)
- **Length:** 12 to 15 s
- **Material:** screen recording on the Örnek account: Ayarlar, scroll to **Videolarınızın dili**, open the menu so
  the language list shows, close it on Türkçe; then back to the week screen.
- **Sequence:**
  1. 0 to 2 s: overlay **"Videolar kliniğinizin dilinde"**
  2. 2 to 9 s: the settings screen and the open language list.
  3. 9 to 12 s: the note under the title, "Değişiklikler bir sonraki videolardan itibaren geçerli olur", readable.
  4. End text: **"Kliniğin adı, dili ve logosu ayarlarda."**
- **AI label:** off.
- **Caption:**
  > Kliniğin adı, ülkesi ve videoların dili ayarlardan seçilir. Sonraki haftanın videoları o dilde ve kliniğin logosuyla gelir. Ekrandaki klinik örnektir.
  >
  > #dişhekimi #dişkliniği #dişhekimliği #dişhekimiasistanı

---

## Covers

`covers/01-pazartesi.png` to `covers/06-klinik-dili.png`, 1080 x 1920 PNG, brand paper background (#f7f1e7),
Instrument Serif headline and Plus Jakarta Sans line (the site's own fonts), all text inside the central 3:4 area
that the profile grid shows. Two ways to use them:

- **Upload as cover** where TikTok offers it (Edit cover, Upload). Verify in the UI; the option has moved between
  versions.
- If upload is not offered: put the cover PNG as the first half second of the video in the edit and choose that frame
  as the cover.

## The AI-content label, applied to our videos

**TikTok's rule** (Community Guidelines, Integrity and Authenticity, "Edited Media and AI-Generated Content",
released 25 Aug 2026, effective 24 Sep 2026, read from www.tiktok.com with curl):
- "You must label content that uses AI or includes significant edits to show realistic-looking people or scenes."
  You can use TikTok's AIGC label or "your own clear caption, sticker, or watermark".
- Disclosure **is needed** when, among others, "AI-generated audio mimics the voice of a real person".
- Disclosure **is not needed** for "generic text-to-speech (TTS) narration, when the TTS isn't a recognizable voice
  of a known individual", for colour correction and cropping, and for artistic styles.
- Unlabelled content that needed a label "may be removed, restricted, or labeled by our team".

**What that means for our material:**
- The sample narration is a generic synthetic voice, not a real person's. Under the rule as written, **TikTok does not
  require the label** for it.
- The sample visuals are stock photographs with text (the 08 kit renders them from Pexels backgrounds), not AI
  images, so they need no label either. Screen recordings need none.
- **Our policy is stricter: turn the label on whenever the synthetic narration is audible** (posts 03 and 05), and
  say so in the caption. Reasons: the kit's house rule (RESEARCH 5a, KIT house rules, 08 kit rule 4), consistency
  with Instagram and YouTube, health information is involved, and the brand's honesty is the product. When the
  sample is muted (01, 04) the label stays off.
- If any AI-generated footage is ever used (KIT 1.4 Seedance shots), the label is **required** by TikTok's rule.

**How to set it (verify the exact wording on the day; the menus move):**
- **Mobile app:** after editing, on the Post screen tap **More options** (sometimes shown under advanced settings),
  then turn on **AI-generated content**. The published video then shows "Creator labeled as AI-generated".
  (Path from secondary sources and memory: **unverified** on TikTok's help site.)
- **Web (TikTok Studio, tiktok.com/tiktokstudio/upload):** expand the extra settings under the caption ("Show more" /
  advanced settings) and turn on **AI-generated content**. Unverified on the help site; check that the toggle is on
  before Post.
- **Verification point:** open the published post from a second phone or a logged-out browser and confirm the label
  text appears under the caption. If it does not, the caption line ("seslendirme sentetik bir sestir") is still a valid
  disclosure under the rule quoted above.
- TikTok can also add the label itself if it detects AI provenance data in a file. Our exports carry none, so expect
  only the label you set.
