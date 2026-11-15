# Turkish samples to re-render (RG 33075)

Status: open, since 15.11.2026.

Türkiye's 2025 regulation on health-service promotion (Resmî Gazete 12.11.2025,
no. 33075) allows information, not drawing patients in. Every Turkish sample we
show was made before the pipeline enforced that, and each one closes by steering
the viewer to book or to the clinic, often with an exclamation mark
("Sorularınız için bize ulaşın veya randevu alın!"). Today's pipeline would not
produce these closings: the writers are told not to (`worker/src/dental/style.ts`
`ctaGuide`, `copywriter.ts`, `locale.ts`), the post-checks in `week.ts`
(`trSteering`) flag them in the narration and caption, and `hard-rules.ts` MARKET_HARD_RULES TR `booking` now flags
them deterministically in every script, caption and recording clip.

Text in the repo has been fixed. Audio and video files cannot be fixed by hand and
are listed below.

## 1. Live preview library (`web/public/dentvideo/preview/tr/`)

The on-screen text (`*.json`) was rewritten: each closing now points the viewer to
their own dentist, and the one exclamation mark in a hook was removed. The
narration (`*.mp3`) still says the old closing, so all six play **silent**
(`web/src/lib/dentvid/preview-library.ts` `NARRATION_HELD`). They stay in the
library because hiding them would leave the Turkish preview with no videos.

| File (`.mp3`) | Closing the narration still says |
| --- | --- |
| `aligners-seffaf-plak-tedavisi-islem` | Daha fazla bilgi için bizimle iletişime geçin ya da randevu alın! |
| `children-cocuk-dis-hekimligi-onleme` | Daha fazla bilgi için kliniğimizle iletişime geçin veya randevu alın. |
| `cleaning-dis-tasi-temizligi-saglikli-bir-gulumseme-icin-t` | Diş taşı temizliği hakkında daha fazla bilgi için bize ulaşın! |
| `implant-implant-tedavisi-sonrasi-bakim` | Sorularınız için bize ulaşın veya randevu alın! |
| `implant-implant-tedavisinin-asamalari` | Daha fazla bilgi için bize ulaşın veya randevu alın. |
| `whitening-dis-beyazlatma-mit` | Daha fazla bilgi için {handle} ile iletişime geçin veya randevu alın. |

To fix: render a new Turkish demo week (`worker/src/dental/cli.ts --render`, a TR
profile), then rebuild the library with `scripts/build-dentvideo-preview.mts`. The
build now refuses a Turkish video whose narration or on-screen text trips a TR
market rule or has an exclamation mark. Then empty `NARRATION_HELD.tr`.

## 2. Landing samples and example pages (`web/public/dentvideo/samples/tr/`)

These are finished `.mp4` files with the closing burned in and narrated. They are
the Turkish hero video, the "sample week" on the Turkish landing, and the three
`/tr/examples/<slug>` pages (`web/src/content/dentvideo-samples.ts`,
`dentvideo-examples.ts`, whose `onScreen` lists transcribe the videos and so
still quote the old closings).

| File (`.mp4`) | Closing in the video |
| --- | --- |
| `implant-asamalari` (hero) | Daha fazla bilgi için bize ulaşın veya randevu alın. (hook: "İlk randevuda implant bitmiyor!") |
| `dis-tasi-temizligi` | Diş taşı temizliği hakkında daha fazla bilgi için bize ulaşın! |
| `beyazlatma-hassasiyet` | Daha fazla bilgi için iletişime geçin veya randevu alın. |

They are still shown. Hiding them would remove the Turkish hero, the whole sample
week and three indexed pages. These pages show DentVideo's own product to dentists
and are labelled as a demo clinic's videos, so they are not a clinic's
patient-facing promotion. But they contradict what the product promises, so they
should be replaced first.

To fix: render three new Turkish videos (procedure topics will also carry the
on-screen md. 7/1-k warning). Replace the `.mp4`/`.jpg` files, update `name`,
`seconds` and `hero` in `dentvideo-samples.ts`, and update `onScreen` and `summary`
in `dentvideo-examples.ts` from the new videos.

## Not changed on purpose

- `worker/src/dental/fixtures/baseline-scripts.json`: the November 2026 baseline
  that the offline quality eval grades. It records what the pipeline produced, so
  it keeps the old closings.
- `{web,worker}/.../backgrounds/fixtures.json`: input text for the background-photo
  ranking tests. These files are not shown to anyone.
- The ad checker's sample text and the guides that quote "hemen randevu alın" as
  an example of what not to write.
