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
brand look, as in the earlier samples. Demo clinic: "Demo Diş Kliniği"
(rendered then with a handle, removed on 17.11.2026: see the seventh pass).

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

## Fifth pass (15.11.2026): on-screen fixes from the known-mistakes register

No API call. The flawed text was fixed in each sample's saved `render-plan.json`. The video was then re-rendered locally with Remotion, reusing the original `voiceover.master.wav` (no LLM, no TTS). It was compressed and given a new poster exactly as above, and checked frame by frame against the published version.

- `es/limpieza-dental`: "Llega al borde de la encía." became "La limpieza llega al borde de la encía." (KM-16). Same timing, so the hero skip still holds. -14.3 LUFS.
- `fr/blanchiment-email`: the cards "Évitez café et thé" and "Évitez vin rouge" now read "Évitez le café et le thé" and "Évitez le vin rouge" (KM-17). -14.7 LUFS.

These still needed a paid re-render, because the flaw is spoken; done in the sixth pass below.

## Sixth pass (15.11.2026): the spoken known mistakes, TTS only

The three samples whose narration carried a register mistake were fixed without generating a new script. For each, the reviewed `plan.json` of the published render was corrected, `scanKnownMistakes` and `week.ts scriptProblems` were run on it (no hit), and only the narration was synthesised again with `prepareNarration` (tts-1-hd, nova, mastered, cuts snapped to the new pauses). The render plan kept the original's brand colour, logo and backgrounds, and the video was rendered with `renderPlan` as `cli.ts --render` does. Compressed and postered as in the third pass.

| Sample | Fix | Now |
|---|---|---|
| `de/aligner-verfaerbung` (KM-18) | "Im Tray" / "Ohne Tray" → "Mit Schiene" / "Ohne Schiene"; "Nur Wasser im Tray" → "Mit Schiene nur Wasser"; spoken "Darum im Tray nur Wasser, vorher ausspülen," → "Darum mit Schiene nur Wasser, vor dem Einsetzen ausspülen," | Hook unchanged ("Kaffee macht Aligner schneller gelb als gedacht."), 28 s, -14.3 LUFS |
| `fr/blanchiment-email` (KM-17) | spoken "évitez café, thé, vin rouge, et suivez" → "évitez le café, le thé et le vin rouge, et suivez" (cards as in the fifth pass) | Hook unchanged ("Le blanchiment fragilise vraiment l’émail ?"), 27 s, -14.5 LUFS |
| TR preview `aligners-seffaf-plak-ve-icecekler` (KM-19) | spoken "plağınızın rengi hemen dönmeye başladı mı?" → "plağınız hemen renk aldı mı?" | Hook unchanged, 25.7 s, -14.5 LUFS; library rebuilt with `build-dentvideo-preview.mts` (only this video changed) |

Checked: a contact sheet per video (hook, every scene, the sign-off; dental photos only: aligner case, glass, aligner, whitening tray, chair; the TR md. 7/1-k notice), and a local Whisper transcript of each new narration, which has the corrected words. A first render of all three came out on the light default look because `plan.json` has no `brandColor` (the week adds it at render time); it was not published, and the published renders carry the clinics' colours like the originals.

Spend: narration only, 1,199 characters at the tts-1-hd ceiling ($30/M): **$0.036** against a $0.60 cap. No chat call.

## Seventh pass (17.11.2026): no invented @handle on any sample

Every sample's sign-off showed a made-up Instagram handle (`@demodisklinigi`,
`@demodentalstudio`, `@demozahnarztpraxis`, `@clinicadentaldemo`,
`@cabinetdentairedemo`, `@demo_shika_tokyo`, `@demodental.dubai`,
`@gabinet.demo.krakow`). A handle like that can belong to a real account, so the
samples now carry none: the sign-off shows the CTA line, and the logo and clinic
name where the sample had them. The handle came from the demo clinic profiles
(`week.ts` puts `profile.handle` on the cta scene), so:

- Sample profiles have no `handle` (`worker/dental-examples/*.json`, checked by
  `worker/src/dental/sample-profiles.test.ts`; the demo profiles used for the
  renders above are re-run without one). `scripts/build-dentvideo-preview.mts`
  takes `handle` as optional.
- All 24 sample MP4s were rendered again locally from the plan each one was
  rendered from, with the cta `handle` removed and the video's own narration
  file. Nothing was synthesised or generated: no TTS, no LLM, no stock footage.
  The 16 current-pipeline samples (TR, EN, DE, ES, FR, `pl/wybielanie-przed-slubem`)
  reuse `render-plan.json` + `voiceover.master.wav`; the 8 older JA/AR/PL samples
  reuse `plan.json` + `voiceover.loud.mp3`, timed with `fitPlanToVoice` as the
  worker timed them, and the profile's brand colour.
- Compressed as before (~240 kbps video, AAC 96 kbps, `+faststart`); posters
  unchanged (frame 0.9 s, which has no sign-off). Each new file was checked for
  length against the old one, loudness, and a look at its last frame.

## Eighth pass (24.11.2026): the English and German live preview, and gates for every language

The live preview's English and German libraries (`web/public/dentvideo/preview/en|de/`)
were still the set from 8 November: all six English and all four German videos closed on
"Got questions? Ask us or book a check-up!" or "… buchen Sie einen Termin!", and the
English ones showed "That funky smell", "Cleaning your aligners is super important",
"Avoid strong colored foods" and Title Case headings. The gate in
`preview-library.test.ts` only looked at Turkish, and KM-13 did not match "strong colored".

**No API call, no new narration.** Both libraries were rebuilt with
`scripts/build-dentvideo-preview.mts` from the published render folders of the third,
fourth and sixth passes (`render-plan.json` + `voiceover.master.wav` + `week.json`),
copied first to `/home/user/dv-preview-sources/` (outside the repo; `SOURCES.txt` there
says where each came from). Selection: title in sentence case, `name`/`handle` the demo
clinic's, so its name and handle become `{name}`/`{handle}`.

| Language | Now (id) | From |
|---|---|---|
| en | `whitening-does-whitening-thin-your-enamel` ("Whitening your teeth? Not as harsh as you think.", 25 s) | the EN hero render (`en/whitening-myths-debunked`) |
| en | `aligners-keeping-clear-aligners-fresh` ("Aligners smelling off by evening?", 22 s) | `en/caring-for-clear-aligners` |
| en | `cleaning-brushing-the-spots-most-people-miss` ("Your toothbrush skips one spot every morning.", 27 s) | `en/proper-brushing-technique` |
| de | `aligners-warum-aligner-sich-verfaerben` ("Kaffee macht Aligner schneller gelb als gedacht.", 28 s) | `de/aligner-verfaerbung` (sixth pass, "Mit Schiene") |
| de | `whitening-bleaching-und-zahnschmelz` ("Bleaching heißt nicht gleich schwacher Zahnschmelz.", 28 s) | `de/bleaching-zahnschmelz` |
| de | `children-kind-ruhig-auf-den-zahnarztbesuch-vorbereiten` ("Ihr Kind spürt Ihre Nervosität sofort.", 30 s) | `de/kinder-zahnarztangst` |

Every old English and German entry was removed, because its narration says the pushy
closing and re-voicing costs money. English has no children's video and German no
cleaning video for now; a clinic that lists one sees the "no sample yet" line in the wizard.
The build left every other language's manifest entries as they were.

Other languages (on-screen text only; the narration was transcribed locally, with an
open-source speech recognizer and no API call, to decide):

- `es/children-cuidado-de-dientes-en-ninos` removed: its card read "¡Consulta con nosotros
  o agenda tu cita!" and the narration says "¿Tienes dudas? Pregúntanos o agenda tu cita."
  Spanish keeps 4.
- `fr/cleaning-detartrage` removed: card "Posez vos questions ou prenez rendez-vous !",
  narration "N'hésitez pas à poser vos questions ou à prendre rendez-vous chez nous."
  French keeps 5.
- French closings that were generic or used twice now name the topic and follow what the
  narration says: whitening "Une question sur le blanchiment ? Demandez-nous ou prenez
  rendez-vous." (was "Pour plus d'informations, …"), implant "Une question sur l'entretien
  de votre implant ? Parlez-nous-en.", gum visits "Posez vos questions ou prenez
  rendez-vous pour un contrôle."
- Japanese closings used twice: stains "着色が気になる方はご相談ください", cold sensitivity
  "しみたら、気軽にご相談ください".
- Still spoken, not fixable without paid re-voicing (from the local transcripts):
  French aligners "n'hésitez pas à nous contacter ou à prendre rendez-vous", both gum videos
  "n'hésitez pas à poser vos questions ou à prendre rendez-vous" (+ "pour un contrôle" /
  "chez nous"), whitening the generic "Pour en savoir plus, n'hésitez pas à demander à notre
  clinique ou à prendre rendez-vous" (the card no longer shows it, so viewers hear one
  closing and read another); French implant ends "n'hésitez pas à nous en parler", with no
  booking. Of the Spanish narrations only whitening ends "Pregunta en nuestra clínica o
  agenda tu revisión"; cleaning ends "pregúntanos en la clínica", gum bleeding "… en la
  clínica", gum treatment "¿Dudas? Pregunta en nuestra clínica." No exclamation mark is on
  screen in any language.

**One look.** Every preview plan in all 8 languages now uses the `editorial` theme, as the
published samples do. Contact sheets of every plan that changed theme (and of the new
English and German ones), drawn with Remotion `renderStill` as a visitor sees them (typed
clinic name, no logo, a brand colour, library photos), showed no text overflowing in any
language, so none was reverted. One Japanese closing was reworded after its sheet showed
an awkward break ("しみる / 時は気軽に").

**The clinic's name.** `live-preview-player.tsx` now builds its plan with
`preview-library.ts previewPlan`, which sets `clinic` from the typed name as a real week
does (`worker/src/dental/week.ts`): small in the top corner while there is no logo, and on
the sign-off. An empty or blank name adds nothing.

**Gates** (`web/src/lib/dentvid/preview-library.test.ts`, every language): no `!` on screen,
no hard-rule claim, `closing-line.ts ctaProblems` finds no exclamation, pressure or generic
closing, no English or German booking push, no closing used twice in a language, no
off-register words (mirrored from `worker/src/dental/claims.ts` OFF_REGISTER, plus "super
important"), English labels in sentence case, at least 3 videos per language, every
manifest file on disk and nothing on disk outside the manifest, the editorial theme. They
fail on the library as it was on main (46 failures). KM-13 now matches
`strong(ly)? colo(u)r(s|ed)` with a space or a hyphen (`known-mistakes.ts`, mirrored to web).

### Review round (24.11.2026)

Two reviewers checked the branch; what they found, and what changed:

- **The name chip ran under the buttons.** Without a logo the composition signs the video
  with a chip up to 60% of the frame wide (`remotion/Video.tsx` ClinicName). On a 390 px
  phone a name from about 28 characters reached under the Pause button, and a 38-character
  one showed as "L…side Family…". While the chip is drawn the preview's mute and play
  buttons now sit in the bottom corner on the same side, which the composition keeps clear
  for the platform's UI (`preview-library.ts previewControlsEdge`); beside a logo they stay
  at the top. The name is cut at a whole character (an emoji is never split).
- **KM-13 against the writer's own reference.** The wider pattern also caught
  `accuracy.ts AFTERCARE_GUIDE`'s whitening line ("avoiding strongly coloured food and
  drink (coffee, tea, red wine) …"), which the writer and the accuracy reviewer are both
  given, so a whitening script in those words would have been sent back. A line that names
  what to skip (coffee, tea, wine, cola, curry, berries …) now passes; without the drinks it
  is still caught. A worker test pins the guide's line.
- **German whitening said the German KM-13.** The card "Nach dem Bleaching sind stark
  gefärbte Getränke kurz eher ungünstig." is now "Verzichten Sie nach dem Bleaching ein,
  zwei Tage auf Kaffee, Tee und Rotwein." The narration still says "Kräftige Farben sind
  kurz danach oft ungünstig.": a candidate for a German KM row when a re-voice is approved.
  The German children compare label "Unhilfreich" is now "Weniger gut", as the narration says.
- **Closings that were one line with a few words added.** French aligners, gum bleeding and
  gum visits closed on "Posez vos questions ou prenez rendez-vous" (+ "avec nous." /
  nothing / "pour un contrôle."); Arabic aligners and cleaning on the same "لأي سؤال، راسلوا
  العيادة أو احجزوا فحصًا" (one with "للأسنان" added); Japanese "気になる方はご相談ください"
  sat inside the stains closing. Now: French aligners "Des questions sur les aligneurs ?
  Écrivez-nous ou prenez rendez-vous.", gum bleeding "Vos gencives saignent ? Posez-nous la
  question ou prenez rendez-vous."; Arabic aligners "إذا لم يجلس القالب الجديد جيدًا، راسلوا
  العيادة أو احجزوا فحصًا."; Japanese brushing "磨き方は、診察のときに気軽にお尋ねください".
  Spanish cards now say what the narration says, without the "pide revisión" it never
  says: cleaning "Si dura o te preocupa, pregúntanos en la clínica.", gum bleeding "¿Te
  sangran las encías? Cuéntanoslo en la clínica.", gum treatment "¿Dudas tras el
  tratamiento? Pregunta en nuestra clínica." Contact sheets of every changed plan:
  `/home/user/wt-shots/preview-quality/stills-r1/`.
- **`ja/general-tsumetai-mono-de-shimiru` removed.** Its last ~3 seconds do not sound
  Japanese: decoded as Japanese they come out as English words ("… rice with in my kitty
  watershed"), the language guess drops to 0.87, and the fit is far worse than the other
  five Japanese endings (log-prob −0.60 against −0.23 to −0.49), whose English decode is
  plain romaji. The plan says "…様子を見ることもありますが、長く続く時は受診が安心です。" there.
  Japanese keeps 5. **The published Japanese sample `samples/ja/tsumetai-mono-de-shimiru.mp4`
  (examples page, Japanese hero) has the same ending** (language guess English 0.64): listen
  to its last 4 seconds; it is outside this library. To bring the preview back after a
  re-voice, rebuild it with `scripts/build-dentvideo-preview.mts` and raise the Japanese
  count in the test.
- **Arabic endings not settled.** The local recognizer is weak on this Arabic voice for
  every file, good or not, so it proves nothing either way; for aligners its English guess
  is a transliteration of the expected "راسلوا العيادة أو احجزوا فحصًا". Worth a listen:
  the last 6 seconds of `ar/aligners-tabdil-altaqwim-alshaffaf.mp3` and
  `ar/whitening-qahwa-baad-altabyid.mp3`.
- **Gates, wider:** every string a scene carries is read (the hook's sub-line and a stat's
  value were not), a closing that contains another or shares three quarters of it at
  either end counts as used twice, the German cards may not say "stark gefärbt" or
  "kräftige Farben", and the count per language is pinned (en 3, de 3, es 4, fr 5, tr 5,
  ja 5, ar 5, pl 5) so removing a video is a decision written in the test.

Not changed here (other packages' files): the landing passes the input's placeholder as
the name while the field is empty, so the corner reads "Your clinic" / "Ihre Praxis" and,
in Japanese, "医院名" ("clinic name", a form label) until the visitor types (`teaser.tsx`,
`content/landing/ja.ts`); a 40+ character name with no spaces runs off the sign-off, and a
Latin name in an Arabic video loses its trailing full stop to the wrong side (the
composition's `CtaScene` and `ClinicName`); the dev bench (`worker/src/bench/frames.ts`)
and `scripts/render-social-kit.mts` still name removed preview ids; the KM-13 row in
`docs/KNOWN_MISTAKES.md` still quotes only "strong colors".

## Not changed on purpose

- `worker/src/dental/fixtures/baseline-scripts.json`: the November 2026 baseline
  that the offline quality eval grades. It records what the pipeline produced, so
  it keeps the old closings.
- `{web,worker}/.../backgrounds/fixtures.json`: input text for the background-photo
  ranking tests. These files are not shown to anyone.
- The ad checker's sample text and the guides that quote "hemen randevu alın" as
  an example of what not to write.
