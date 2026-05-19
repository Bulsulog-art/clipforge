# Background Music + AI Avatar — Manual Setup

The code is shipped. These are the one-time asset uploads + env vars
required to make both features actually run in production.

## 1. Apply migrations

```
00007_bg_music.sql       # music catalog + per-job/per-clip flags
00008_avatars.sql        # avatar catalog + avatar_jobs queue
```

In Supabase SQL editor: paste each file, run. Migrations are idempotent
where it matters (`on conflict do nothing` on seeds).

## 2. Upload background music tracks

Bucket: `clipforge-music` (private — worker reads via signed URLs).

Storage paths must exactly match the `storage_path` column of the
`music_tracks` catalog:

```
motivational/rise-up.mp3
motivational/forward-motion.mp3
motivational/iron-will.mp3
dramatic/steel-and-stone.mp3
cinematic/open-sky.mp3
cinematic/skyline.mp3
lofi/slow-burn.mp3
lofi/after-hours.mp3
hype/glow-up.mp3
hype/wall-street-beat.mp3
chill/calm-tide.mp3
comedic/punchline.mp3
```

### Free royalty-free sources

- **Pixabay Music** — pixabay.com/music — CC0 (search by mood)
- **YouTube Audio Library** — studio.youtube.com → "Audio library" → filter "No attribution required"
- **Mixkit** — mixkit.co/free-stock-music — Mixkit License (free for commercial use)

Pick tracks 2:30–4:00 long so the FFmpeg `aloop` filter rarely needs to
loop within a single clip.

If a row exists in `music_tracks` but the matching file is missing in
storage, the worker logs `bg music track missing in storage — rendering
without music` and ships a voice-only clip. The user is not blocked.

## 3. Upload stock avatar portraits

Bucket: `clipforge-avatars` (public).

```
stock/alex.jpg   — Calm masculine coach face
stock/maya.jpg   — Bright feminine energy
stock/theo.jpg   — Authoritative narrator
stock/iris.jpg   — Warm storyteller
```

### Sources

Use AI-generated portraits to avoid likeness/rights issues:
- **thispersondoesnotexist.com** — single click, downloadable
- **generated.photos** — model gallery (free with attribution)

Format requirements:
- JPG or PNG
- 768×768 minimum (SadTalker upscales internally)
- Square crop, face centred, mouth visible
- Neutral expression, slightly closed lips (avoids spasms in lip-sync)

## 4. Environment variables (Coolify worker)

Already required, just confirm they're populated:

```
OPENAI_API_KEY=...           # used for TTS (avatar voices) + Whisper + GPT
FAL_KEY=...                  # used for SadTalker lip-sync + Flux thumbnails + face-swap
OPENAI_API_KEY=...            # used for caption word-timing on avatar clips
AVATAR_CONCURRENCY=2          # optional; defaults to 2
```

## 5. Voice catalog

`avatars.default_voice_id` stores ClipForge persona names (`alex`, `maya`,
`theo`, `iris`). The TTS step maps these to OpenAI voices:

| Avatar | OpenAI voice | Notes |
|---|---|---|
| Alex   | `alloy`   | Neutral mid-pitch — calm coach |
| Maya   | `nova`    | Warm energetic feminine |
| Theo   | `onyx`    | Deep masculine narrator |
| Iris   | `shimmer` | Bright feminine, gentle |

OpenAI has 6 built-in voices total (alloy/echo/fable/onyx/nova/shimmer);
all of them are unlocked with any OpenAI API key, no separate signup or
free-tier limit. Swap via `update avatars set default_voice_id = '...'
where name = '...'` (use any of the 6 OpenAI names or one of the persona
keys above).

> Voice cloning (user's own voice) is intentionally deferred to v1.1.
> Add an `ELEVENLABS_API_KEY` and swap `synthesizeSpeech` back to its
> ElevenLabs implementation when ready.

## 6. Economics

Per-clip cost at typical 30-second avatar render:

| Component | Cost |
|---|---|
| OpenAI TTS-1-HD (~150 chars) | $0.0045 |
| FAL SadTalker (30s) | ~$0.05 |
| OpenAI Whisper transcribe (30s) | $0.003 |
| FAL Flux Schnell thumbnail enhance | $0.003 |
| FFmpeg compute (Coolify VPS) | negligible |
| **Total** | **~$0.06** |

Revenue: 5 credits × $0.20/credit = **$1.00 perceived value**
(weekly Plus) or **$0.74** (monthly Plus). Net margin per avatar:
**$0.94 weekly / $0.68 monthly** — roughly 2× higher than the previous
Replicate + ElevenLabs stack.

Margin at 100% credit utilization: **~$0.63 per avatar render**.

## 7. Smoke test

```bash
cd worker
pnpm tsx src/cli/send-test-push.ts <userId> "Test" "APNs alive"
# Then in iOS app:
# Studio → "+" → "AI Avatar · 5 cr"
# script: "Three habits that quietly compound. First, write before you scroll."
# avatar: Alex
# Render → wait ~2 min → push arrives → clip in Library
```
