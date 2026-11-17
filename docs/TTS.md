# DentVideo narration (TTS)

DentVideo narrates every video with a text-to-speech voice. Two providers are
built in:

| Provider | When | Voices |
|---|---|---|
| OpenAI `tts-1-hd` | default, and the fallback | `nova` (female) / `onyx` (male); Arabic uses `shimmer` / `echo` (`worker/src/dental/voice.ts`) |
| ElevenLabs `eleven_multilingual_v2` | `DENTVID_TTS_PROVIDER=elevenlabs` | per language × narrator in `worker/src/dental/elevenlabs.ts` |

Every clinic picks its narrator in **Settings → Narrator voice: Female / Male**
(`profile.narratorVoice`, default female). The choice applies to both
providers, to new weekly videos and to restyles.

## Switching ElevenLabs on

ElevenLabs is built but **off** until a paid plan exists. **ElevenLabs' free
plan does not allow commercial use**: buy at least the Starter or Creator plan
before turning it on for paying clinics.

1. Buy the plan and create an API key (ElevenLabs → Developers → API keys). The
   key only needs the Text to Speech permission.
2. In Coolify, on the **worker** service (not web), set:
   ```
   DENTVID_TTS_PROVIDER=elevenlabs
   ELEVENLABS_API_KEY=<the key>
   DENTVID_ELEVEN_USD_PER_1K_CHARS=<your plan's rate, e.g. 0.22>   # optional, default 0.30
   ```
3. Redeploy the worker. Nothing on the web side changes.
4. Check the first run's logs for `dentvid: narration tts metered` with
   `provider: "elevenlabs"`. A `dentvid: elevenlabs tts failed, narrated with
   openai` line means a video fell back (see below).

To switch back, set `DENTVID_TTS_PROVIDER=openai` (or remove it) and redeploy.

### All settings

| Variable | Default | Meaning |
|---|---|---|
| `DENTVID_TTS_PROVIDER` | `openai` | `elevenlabs` to narrate with ElevenLabs |
| `ELEVENLABS_API_KEY` | none | needed for ElevenLabs; without it every video falls back to OpenAI |
| `DENTVID_ELEVEN_MODEL` | `eleven_multilingual_v2` | ElevenLabs model id |
| `DENTVID_ELEVEN_VOICE_<LANG>_<F\|M>` | the map below | per-language voice override, e.g. `DENTVID_ELEVEN_VOICE_DE_F=<voice id>` |
| `DENTVID_ELEVEN_USD_PER_1K_CHARS` | `0.30` | cost estimate for logs and the spend guard |
| `DENTVID_TTS_CHARS_PER_VIDEO` | `450` | characters budgeted per narration by the spend guard |

## Voice map

The owner listened to ElevenLabs takes and approved these two voices:

| Narrator | Voice | Id |
|---|---|---|
| Female | Sarah Explains (clear explainer, US English) | `Nhs7eitvQWFTQBsf0yiT` |
| Male | Max (friendly eLearning, US English) | `Gfpl8Yo74Is0W6cPUWWT` |

Elise (`EST9Ui6982FZPSi7gCHi`, warm natural US) was heard too and is kept only
as a commented alternative.

`eleven_multilingual_v2` speaks every DentVideo language (en, tr, de, es, fr,
it, pt, ja, ar, pl) with the same voice, so Sarah and Max are the fallback for
all of them. Each non-English entry carries a TODO: a native voice per
language will sound more local. To try one without a deploy, set
`DENTVID_ELEVEN_VOICE_<LANG>_<F|M>` in Coolify. To make it permanent, change
`ELEVEN_VOICES` in `worker/src/dental/elevenlabs.ts`.

Request sent per video:

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
xi-api-key: $ELEVENLABS_API_KEY
{ "text": "...", "model_id": "eleven_multilingual_v2",
  "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "style": 0, "use_speaker_boost": true } }
```

`language_code` is sent only to models that document language enforcement
(`eleven_turbo_v2_5`, `eleven_flash_v2_5`, `eleven_v3`); `eleven_multilingual_v2`
detects the language from the text.

## Timing and loudness

Nothing changes after synthesis. The same mastering chain runs on either
provider's audio (`worker/src/dental/audio-master.ts`: trimmed edges, shortened
long pauses, about -14 LUFS / -1 dBTP), so the loudness checks still apply. The
cuts between scenes are still placed by silence detection on the mastered voice
(`detectPauses` + `snapScenesToPauses`), so the plain endpoint is used, not
`/with-timestamps`. The per-language tempo factors were measured on `tts-1-hd`
only; ElevenLabs keeps its own pace (factor 1).

## Fallback

When ElevenLabs is selected but cannot narrate a video, that video is narrated
by OpenAI and the reason is logged at warn level
(`dentvid: elevenlabs tts failed, narrated with openai`). This happens when:

- `ELEVENLABS_API_KEY` is missing (no request is sent),
- the API answers non-2xx (bad key, quota used up, unknown voice, outage),
- the request takes longer than 60 s,
- the answer has no audio.

The next video tries ElevenLabs again. The OpenAI path keeps its own fallback
to `tts-1-hd`. Nothing fails silently, and the video is always narrated.

## Cost

A DentVideo narration is about **370–410 characters**. ElevenLabs bills one
credit per character on `eleven_multilingual_v2`, so:

```
cost per video ≈ characters × plan rate per character
```

| Plan (Nov 2026 list prices, check before buying) | Rate | Per video (~400 chars) | Per clinic week (5 videos) |
|---|---|---|---|
| Creator: $22 / 100k credits | $0.22 / 1k | ~$0.09 | ~$0.44 |
| Pro: $99 / 500k credits | ~$0.20 / 1k | ~$0.08 | ~$0.40 |
| OpenAI `tts-1-hd` (for comparison) | $0.03 / 1k | ~$0.012 | ~$0.06 |

100k credits cover about 250 videos, i.e. about 50 clinic weeks a month. Size
the plan to the number of active clinics × ~4.5 weeks × 5 videos × ~400
characters, plus restyles.

### Metering and spend guard

- Each narration logs `dentvid: narration tts metered` with `provider`, `model`,
  `chars` and `estUsd`.
- The characters are also counted in Redis (best effort): per month
  `dv:tts:chars:<provider>:month:YYYY-MM`, per clinic per day
  `dv:tts:chars:<provider>:clinic:<id>:YYYY-MM-DD`. Compare the monthly count
  with the plan's credit quota.
- The spend guard (`worker/src/dentvid/spend-guard.ts`) reserves money before
  a job runs. With ElevenLabs selected, every default estimate grows by the
  ElevenLabs surcharge per narration (450 chars × (ElevenLabs rate − OpenAI
  rate), about $0.12 at the default rate): week +5 narrations, top-up +3,
  restyle +1, recording +0. The per-clinic daily cap default grows with the
  estimates (never below $5), and the global caps grow per active clinic as
  before. An explicit `DENTVID_COST_*_USD` is taken as the whole estimate.
