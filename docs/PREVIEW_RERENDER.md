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
   are the same renders as the preview's implant-stages, cleaning and whitening
   videos, compressed to the samples' size (~240 kbps video, AAC 96 kbps).
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

## Not changed on purpose

- `worker/src/dental/fixtures/baseline-scripts.json`: the November 2026 baseline
  that the offline quality eval grades. It records what the pipeline produced, so
  it keeps the old closings.
- `{web,worker}/.../backgrounds/fixtures.json`: input text for the background-photo
  ranking tests. These files are not shown to anyone.
- The ad checker's sample text and the guides that quote "hemen randevu alın" as
  an example of what not to write.
