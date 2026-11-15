# Turkish samples re-rendered (RG 33075)

Status: done 15.11.2026. The fourth pass (below) rebuilt the Turkish live preview with the current pipeline and brought the aligner video back.

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
   - **Not re-made then (back in the fourth pass): `aligners-seffaf-plak-tedavisi-islem`.** Three attempts were
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

Not re-rendered in this pass (both done in the fourth pass below):
`en/whitening-myths-debunked` (EN hero) still said "Sensitivity can feel zippy",
and the Turkish **live preview library** (`web/public/dentvideo/preview/tr/`)
was still the earlier pass.

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

## Fourth pass (15.11.2026): the known flaws, the EN hero, the Turkish preview, ES and FR

Same pipeline, same demo clinics, run as in the third pass (`cli.ts … --render --logo`,
compressed to ~240 kbps, poster at 0.9 s). Every render below was watched as a
contact sheet (hook, each scene, the sign-off) before it was published.

Two pipeline fixes came first, because the writers lost both known-flaw topics
over two words, three rewrites out of three:

- **A reflexive "not quite" is taken off, not only sent back.** After a hook that
  states no belief ("Diş eti kanaması bazen diş taşıyla başlar." → "Pek sayılmaz;
  fırça diş taşını çıkaramaz."), `week.ts withoutReflexiveNotQuite` drops the
  opener on screen and at the start of a spoken sentence ("Fırça diş taşını
  çıkaramaz."). The belief test is shared with the check (`notQuiteDeniesNothing`);
  after a real belief ("Beyazlatma mineyi inceltir mi?") the answer keeps it.
- **A footage caption that repeats a later line is dropped** (`dropEchoes`): the
  German aligner topic was lost three times on the caption "Mit Wasser bleibt die
  Schiene meist klarer." against the compare side "Mit Wasser: Die Schiene bleibt
  meist klarer". Compare sides now count as said, too.
- **French punctuation stays on its word** (`remotion/script.ts layoutUnits`, mirrored
  to web): ":" ";" "!" "?" "»" are glued to the word before with a no-break space, so
  "Pas tout à fait :" no longer wraps to a line starting with ":". `fr/blanchiment-email`
  was re-rendered from its own render plan with this fix (no new text).
- `cli.ts` meters every chat call and prints the run's spend (`--max-usd` caps it).

| Sample | Now | Checked | Discarded renders |
|---|---|---|---|
| `tr/dis-tasi-temizligi` | "Diş eti kanaması bazen diş taşıyla başlar." 26 s; toothbrush photos | -14.3 LUFS; no "Pek sayılmaz"; md. 7/1-k notice; closes on the viewer's own dentist | 1 (lost at script: "Pek sayılmaz" kept three times, before the fix) |
| `de/aligner-verfaerbung` | "Kaffee macht Aligner schneller gelb als gedacht." 27 s; aligner case, glass | -14.4 LUFS; no "Nicht ganz" | 3: two lost at script (the repeated caption; then reviewers on "Getränke rausnehmen"), one ready but its hook was clickbait ("Der Grund überrascht.") and its narration opener awkward |
| `en/whitening-myths-debunked` (EN hero) | "Whitening your teeth? Not as harsh as you think." 25 s; whitening tray, chair; hero loop `start 0.9, skip [[6.8, 9.9]]` (the dark footage scene, luma 54-60 vs 78-91) | -14.3 LUFS; no "zippy", no "Not quite" | 2: a compare reading "Not the goal: Enamel thinning"; one with "Avoid strong colors briefly" |
| `es/limpieza-dental` (ES hero) | "Ese sarro junto a la encía…" 24 s; hero `skip [[4.3, 7.6]]` | -14.3 LUFS; tú | 2: narration "Aquí lo retiramos el dentista o el higienista" (ungrammatical); one lost at script (repeat) |
| `es/primer-diente` | "Asoma el primer diente… ¿ya lo cepillas?" 24 s | -14.4 LUFS; "muy poca pasta con flúor", the adult brushes if the child will not | 0 |
| `es/cuidado-encias` | "Tus encías tratadas también necesitan cepillo." 28 s | -14.3 LUFS | 0 |
| `fr/gencives-qui-saignent` (FR hero) | "Ce saignement quand vous vous brossez les dents…" 27 s; hero `skip [[10.4, 14.5]]` | -14.5 LUFS; vous; no booking push | 1 lost at script (reviewers: too reassuring, too directive) |
| `fr/blanchiment-email` | "Le blanchiment fragilise vraiment l’émail ?" 26 s | -14.7 LUFS; "Pas tout à fait" answers a real belief | 1: "La dent, elle, reste en place." (meaningless) |
| `fr/detartrage` | "Vous brossez bien, mais le tartre reste." 21 s | -14.4 LUFS | 0 |

ES and FR are no longer `legacy`: every landing now shows current-style videos only.
Demo clinics: "Clínica Dental Demo", Madrid, @clinicadentaldemo, "CD" logo (#2F5D8A);
"Cabinet Dentaire Démo", Lyon, @cabinetdentairedemo, "CD" logo (#5B3F6B).

**Turkish live preview library** rebuilt (`scripts/build-dentvideo-preview.mts`),
5 videos, all current pipeline: the cleaning, whitening and implant-stages videos
are the same renders as the TR samples; new are `implant-implant-sonrasi-bakim`
("İmplant tamamlandı, bakım kısmı şimdi başlıyor.") and, back after being dropped,
`aligners-seffaf-plak-ve-icecekler` ("Şeffaf plak çayla sandığınızdan çabuk renk
alır.", only water with the aligner in, take it out for everything else). The topic
was narrowed to drinks, because the wear-time question kept failing on "20–22 hours".
**Children's prevention was dropped**: four renders, none publishable (a compare
"Temizlik: Gece sonrası dişi hazırlar."; a hook about back molars over a video about
night brushing; "burada başlıyor" with nothing to point at; one lost at script).
A clinic that lists children's dentistry now sees other topics in the Turkish
preview until a good one is rendered and added to the selection.

Spend: $1.45 metered across 24 runs (chat at `eval.ts PRICES` plus narration at a
per-character ceiling), against a $4 cap.

## Not changed on purpose

- `worker/src/dental/fixtures/baseline-scripts.json`: the November 2026 baseline
  that the offline quality eval grades. It records what the pipeline produced, so
  it keeps the old closings.
- `{web,worker}/.../backgrounds/fixtures.json`: input text for the background-photo
  ranking tests. These files are not shown to anyone.
- The ad checker's sample text and the guides that quote "hemen randevu alın" as
  an example of what not to write.
