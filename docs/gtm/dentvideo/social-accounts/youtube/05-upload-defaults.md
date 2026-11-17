# Upload defaults, AI disclosure, audience, playlists

## 1. Audience: not made for kids (channel level)

YouTube Studio → **Settings → Channel → Advanced settings → Audience** →
**"No, set this channel as not made for kids. I never upload content that's made for kids."** → Save.

The audience is dentists and clinic teams. Leaving this unset makes YouTube ask on every upload, and a "made for
kids" setting would switch off comments and the watermark.

## 2. Upload defaults

YouTube Studio → **Settings → Upload defaults**.

**Basic info**

| Field | Value |
|---|---|
| Title | empty (each Short gets its own) |
| Description | the footer below |
| Visibility | **Private**. Every upload starts private, then is scheduled or published by hand after a last read. Nothing goes public by accident. |
| Tags | `dentvideo, diş kliniği, hasta bilgilendirme, dental clinic, patient education` |

Description footer (default, edited per video):

```
Videoda görünen klinik örnektir. Videolar genel bilgi verir, muayenenin yerini tutmaz.
dentvideo.com
```

**Advanced settings**

| Field | Value | Why |
|---|---|---|
| License | **Standard YouTube License** | Creative Commons would let anyone reuse the clinic-style footage and the product screens. |
| Category | **Science & Technology** | The channel shows a software product to professionals. "Education" would suggest the channel teaches patients, which it does not. |
| Title and description language | **Turkish** (switch to English on EN uploads) | Türkiye first. |
| Video language | **Turkish** (English on EN uploads) | Drives automatic captions and search. |
| Caption certification | **None** | US TV rule, not relevant. |
| Comments | **On**, **Hold potentially inappropriate comments for review** | Health topics attract spam and medical questions. Do not answer individual medical questions in comments. |
| Sort by | Top | |
| Show how many viewers like this video | On | |
| Allow remixing | **Off** for videos where a sample plays | The sample narration is a synthetic voice; remixing would carry it out of context. |

If the Upload defaults page shows an **Altered content** default, leave it on **No** and set it per upload as
in section 3. A default of Yes would label videos that contain no synthetic material.

## 3. Altered or synthetic content: when YouTube requires it, and the setting

From YouTube's help (https://support.google.com/youtube/answer/14328491, read 2026-11-17):

- "We require creators to disclose AI-generated or altered content that seems realistic." Required when content
  makes a real person appear to say or do something they did not, alters footage of a real event or place,
  generates a realistic scene that did not happen, or creates music that is the focus of the video.
- Not required for non-realistic content or minor edits, including "production assistance, like using generative
  AI tools to create or improve a video outline, script, thumbnail, title, or infographic", "caption creation", and
  "cloning one's own voice to create voice overs or dubs".
- Labels "may appear in the expanded description for non-music AI-generated audio". Photorealistic or music content
  may also get a label on the player.
- "Disclosing AI content alone won't limit a video's audience or impact its eligibility to earn money."
- Creators who keep not disclosing can get a label applied manually, content removed, or other penalties.

**How this applies to DentVideo.** The sample videos use stock footage (Pexels) and a synthetic narrator voice that
sounds like a real person speaking. The voice is not anyone's clone and makes no real person say anything, so a
strict reading may not require disclosure. It is still realistic AI audio, the house rule in
`docs/gtm/08-social-launch-kit.md` (rule 4) and the social KIT is to label it, and disclosure costs nothing in reach.

**Setting, per upload** (Details → **Altered content**, or under "Attributes" in Studio):

| The Short contains | Altered content |
|---|---|
| A sample video **with its narration audible**, or the logo preview playing with sound | **Yes** |
| Only screen recordings, real hands, real sound, samples **muted** | **No** |
| Any AI-generated shot (the optional Seedance shots in the KIT) | **Yes** |

Every "Yes" video also says it in the description: "Örnek videodaki anlatıcı sesi sentetiktir." /
"The narrator in the sample video is a synthetic voice."

## 4. Watermark

YouTube Studio → **Customization → Profile → Video watermark** → `images/watermark-150x150.png` (transparent PNG,
150 x 150, well under the 1 MB limit) → display time **End of video** → Publish.

Note from YouTube's help: the watermark appears "in landscape view" on computers and mobile, and not on videos
set as made for kids. **Shorts in the vertical Shorts player do not show it.** It is set now so that future
landscape videos carry it.

## 5. The first three playlists

Create them in Studio → **Content → Playlists → New playlist**, visibility **Public**, before the first upload, so
each Short can be added from its Details page.

| # | Title (TR · EN) | Description | Gets |
|---|---|---|---|
| 1 | **Sağlık reklamı kuralları · Health advertising rules** | TR: Klinik paylaşımlarında sorun çıkarabilecek kelimeler ve ücretsiz kontrol aracı. Dikkatli bir filtre, hukuki danışmanlık değil. EN: Words that can cause trouble in a clinic post, and a free checker. A careful filter, not legal advice. | Shorts 1 and 5, later KIT V4 |
| 2 | **DentVideo nasıl çalışır · How DentVideo works** | TR: Pazartesi gelen hafta, logonuzla önizleme, onay ekranı. Ürünün gerçek ekranları. EN: The Monday week, the logo preview, the approval screen. The real product screens. | Shorts 2 and 3, later KIT V3, V5, V6 |
| 3 | **Hastaya giden video · What the patient sees** | TR: Örnek hasta bilgilendirme videoları, onaylandıkları ekranla birlikte. Klinikler örnektir, anlatıcı sesi sentetiktir. EN: Sample patient-education videos, shown with the screen where they are approved. Sample clinics, synthetic narrator voice. | Shorts 4 and 6, later KIT V7 |

The sketches in the social KIT (V1, V2) can open a fourth playlist, "Klinikten · From the practice", once they
are shot.
