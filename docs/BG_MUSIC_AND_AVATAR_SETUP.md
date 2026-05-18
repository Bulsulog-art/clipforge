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
ELEVENLABS_API_KEY=...        # used for TTS (avatar feature)
REPLICATE_API_TOKEN=...       # used for SadTalker lip-sync
OPENAI_API_KEY=...            # used for caption word-timing on avatar clips
AVATAR_CONCURRENCY=2          # optional; defaults to 2
```

## 5. Voice catalog

`avatars.default_voice_id` references **ElevenLabs voice IDs**, not
ClipForge-internal IDs. Defaults seeded in the migration:

| Avatar | ElevenLabs voice | Notes |
|---|---|---|
| Alex   | `pNInz6obpgDQGcFmaJgB` | Adam — calm masculine |
| Maya   | `EXAVITQu4vr4xnSDxMAc` | Bella — bright feminine |
| Theo   | `TxGEqnHWrfWFTfGW9XjX` | Josh — narrator |
| Iris   | `21m00Tcm4TlvDq8ikWAM` | Rachel — warm |

All four exist in every free-tier ElevenLabs account. Swap via
`update avatars set default_voice_id = '...' where name = '...'`.

## 6. Economics

Per-clip cost at typical 30-second avatar render:

| Component | Cost |
|---|---|
| ElevenLabs TTS (~150 chars) | $0.045 |
| Replicate SadTalker (30s) | ~$0.06 |
| Whisper transcribe (30s) | $0.003 |
| FFmpeg compute (Coolify VPS) | negligible |
| **Total** | **~$0.11** |

Revenue: 5 credits × $0.20/credit = **$1.00 perceived value**
(weekly Plus) or **$0.74** (monthly Plus).

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
