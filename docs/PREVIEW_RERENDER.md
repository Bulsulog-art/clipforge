# Turkish samples re-rendered (RG 33075)

Status: done 15.11.2026, except the Turkish aligner preview (below).

Türkiye's 2025 regulation on health-service promotion (Resmî Gazete 12.11.2025,
no. 33075) allows information, not drawing patients in. Every Turkish sample we
showed was made before the pipeline enforced that, and each one closed by steering
the viewer to book or to the clinic, often with an exclamation mark
("Sorularınız için bize ulaşın veya randevu alın!"). Today's pipeline does not
produce these closings: the writers are told not to (`worker/src/dental/style.ts`
`ctaGuide`, `copywriter.ts`, `locale.ts`), the post-checks in `week.ts`
(`trSteering`) flag them in the narration and caption, and `hard-rules.ts`
MARKET_HARD_RULES TR `booking` flags them deterministically in every script,
caption and recording clip.

## What was re-rendered (15.11.2026)

All with the current pipeline (`worker/src/dental/cli.ts --topics … --render`):
mastered narration (-14 LUFS / -1 dBTP) and the loudness guard, safe areas, the
hook on frame 0, cuts snapped to the narration's pauses, the on-screen md. 7/1-k
warning on procedure topics, and every TR market rule. No stock footage
(no Pexels key in the render box): footage scenes show their caption on the
brand look, as in the earlier samples. Demo clinic: "Demo Diş Kliniği",
@demodisklinigi.

1. **Live preview library** (`web/public/dentvideo/preview/tr/`), rebuilt with
   `scripts/build-dentvideo-preview.mts`, same ids as before:
   `cleaning-dis-tasi-temizligi-saglikli-bir-gulumseme-icin-t`,
   `whitening-dis-beyazlatma-mit`, `implant-implant-tedavisinin-asamalari`,
   `children-cocuk-dis-hekimligi-onleme`, `implant-implant-tedavisi-sonrasi-bakim`.
   Every closing now points to the viewer's own dentist ("… hekiminiz söyler",
   "… diş hekiminize sorabilirsiniz"), no exclamation marks. `NARRATION_HELD.tr`
   is empty: they play with sound. The preview now uses the mastered narration and
   the plan exactly as rendered, and keeps the on-screen warning.
   - **Not re-made: `aligners-seffaf-plak-tedavisi-islem`.** Three attempts were
     rejected by the reviewers (wear time "most of the day" vs 20–22 h, drinks
     with aligners in, an 8-scene plan), so the topic was dropped rather than
     retried further; the library has 5 Turkish videos. The social launch kit's
     `tr-seffaf-plak` reel (`scripts/render-social-kit.mts`) is out with it. To
     add one back: render a TR aligner topic, add it to the selection, rebuild.
2. **Landing samples and example pages** (`web/public/dentvideo/samples/tr/`):
   `implant-asamalari` (hero), `dis-tasi-temizligi`, `beyazlatma-hassasiyet`
   were the same renders as the preview's implant-stages, cleaning and whitening
   videos (re-rendered again in the third pass below, with dental photos), compressed to the samples' size (~240 kbps video, AAC 96 kbps).
   `dentvideo-samples.ts` (`name`, `seconds`, `hero`) and
   `dentvideo-examples.ts` (`summary`, `onScreen`, including the md. 7/1-k
   line) were rewritten from the new videos.

## How to re-render

```bash
cd worker
# topics.json: an array of strategist.ts topics; profile.json: the demo clinic
OPENAI_API_KEY=… npx tsx src/dental/cli.ts profile.json --topics topics.json --render --out /tmp/out
# selection.json: see the header of scripts/build-dentvideo-preview.mts
npx tsx --tsconfig ../web/tsconfig.json ../scripts/build-dentvideo-preview.mts selection.json
```

Outside the worker image, point Remotion at a local Chrome
(`REMOTION_BROWSER_EXECUTABLE=/usr/bin/google-chrome REMOTION_CHROME_MODE=chrome-for-testing`).
The render now refuses to start when the theme's fonts are missing
(`worker/src/remotion/render-fonts.ts`), so a box without them fails loudly
instead of producing a serif-fallback video (what happened to
`de/bleaching-zahnschmelz` and `pl/wybielanie-przed-slubem`, both re-rendered
the same day).

## English and German samples (15.11.2026, second pass)

A dentist's review of the landing samples found the English week and two German
videos were still pre-fix renders: white text on a teal gradient, no photos, no
logo, about -26 LUFS, and endings like "Got questions? Ask us or book a
check-up!". The German children's video also claimed things about the practice
("interaktive Spiele und kleine Belohnungen"). Re-rendered with the improved
pipeline (dental photos only, clinic logo and name on the sign-off, mastered
narration at -14 LUFS, the practice-fact and language checks in `week.ts`):

- `en/whitening-myths-debunked` (EN hero; 21 s, -14.2 LUFS). Demo clinic "Demo
  Dental Studio", Austin, @demodentalstudio, a "DS" logo.
- `de/kinder-zahnarztangst` (30 s, -14.5 LUFS). "Demo Zahnarztpraxis",
  München, @demozahnarztpraxis, a "DZ" logo. No statements about the practice.

`dentvideo-samples.ts` (`name`, `seconds`, `hero`) and `dentvideo-examples.ts`
(`summary`, `onScreen`) were rewritten from the new videos.

## Third pass (15.11.2026): the last old samples and the Turkish week

Re-rendered with the pipeline as of this pass (dental-only photos, logo and
clinic name on the sign-off, mastered narration, the stricter "not quite" and
Turkish hedging checks). 8 renders, 6 published:

| Sample | Now | Checked |
|---|---|---|
| `tr/implant-asamalari` (TR hero) | "İmplant yapıldı ama diş daha hazır değil." 30 s; instrument tray, implant screw, treatment chair; "DK" logo, "Demo Diş Kliniği", @demodisklinigi; md. 7/1-k notice; no booking push | 1080x1920, -14.4 LUFS, hook on frame 0. No dark scene any more, so the hero loop skips nothing. A first render was not published: its card read "Asıl parça iyileşmeden gelir." (before healing), the opposite of the narration |
| `tr/dis-tasi-temizligi` | "Fırçalasanız da diş taşı neden kalıyor?" 23 s; toothbrush photos | -14.4 LUFS. Known flaw: "Pek sayılmaz;" after a why-question; the check now sends that back (`week.ts`, wh-question), but the budget was used up |
| `tr/beyazlatma-hassasiyet` | "Beyazlatmadan sonra gelen o diş sızısı…" 24 s; whitening tray, chair | -14.5 LUFS. Narration hedges one sentence of eight (was 5 of 6 in the bench) |
| `en/caring-for-clear-aligners` | "Aligners smelling off by evening?" 22 s; aligner case | -14.2 LUFS; no "Not quite" |
| `en/proper-brushing-technique` | "Your toothbrush skips one spot every morning." 27 s; toothbrushes | -14.6 LUFS. A first render ("Your gumline after brushing? Take a look." → "Not quite if you only scrub…") was not published; the check now catches it |
| `de/aligner-verfaerbung` | "Kaffee drin? Aligner sehen es sofort." 28 s; aligner case, glass | -14.5 LUFS. Known flaw: a reflexive "Nicht ganz:" after the hook; the check now sends it back. A second render was rejected by the pipeline (a repeated line) |

Not re-rendered: `en/whitening-myths-debunked` (EN hero) still says "Sensitivity
can feel zippy" (render cap reached). The Turkish **live preview library**
(`web/public/dentvideo/preview/tr/`) is still the earlier pass; the samples are
no longer the same renders as the preview's.

Inputs for this pass: a TR demo profile ("Demo Diş Kliniği", İzmir, formal,
#0F5C5C) and topics written per sample, run as below.

```bash
cd worker
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 SUPABASE_SERVICE_ROLE_KEY=unused OPENAI_API_KEY=… \
  npx tsx src/dental/cli.ts en-profile.json --topics en-topics.json --render --logo en-logo.png --out /tmp/out
```

(`cli.ts` imports the recording path, which builds a Supabase client at import
time; the two variables only satisfy that, nothing is called.) Compress to the
samples' size: `ffmpeg -i video.mp4 -c:v libx264 -b:v 240k -maxrate 300k -bufsize 600k -c:a aac -b:a 96k -movflags +faststart`,
poster `-ss 0.9 -frames:v 1 -vf scale=540:960`.

## Not changed on purpose

- `worker/src/dental/fixtures/baseline-scripts.json`: the November 2026 baseline
  that the offline quality eval grades. It records what the pipeline produced, so
  it keeps the old closings.
- `{web,worker}/.../backgrounds/fixtures.json`: input text for the background-photo
  ranking tests. These files are not shown to anyone.
- The ad checker's sample text and the guides that quote "hemen randevu alın" as
  an example of what not to write.
