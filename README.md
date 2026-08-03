# ClipForge

> Long-form video → 100+ viral short clips → auto-post to TikTok / Reels / Shorts.

**Domain:** `clipforge.bulsulabs.com`
**Pricing:** Free / $29 / $79 / $199 monthly

## Quick start

```bash
# Web
cd web
pnpm install
cp .env.example .env.local
pnpm dev

# Worker
cd ../worker
pnpm install
pnpm dev

# Supabase (local)
cd ..
supabase start
supabase db push
```

## Repo layout

```
clipforge/
├── PROJECT_PLAN.md       # master plan (read first)
├── web/                  # Next.js 15 app
├── worker/               # BullMQ + FFmpeg + Remotion worker
├── ios/ClipForge/        # SwiftUI iOS app
├── supabase/             # SQL migrations
├── docs/                 # setup guides (per service)
└── scripts/              # ops scripts
```

## Setup guides

- [Supabase](docs/SUPABASE_SETUP.md)
- [RevenueCat](docs/REVENUECAT_SETUP.md)
- [Coolify deploy](docs/COOLIFY_SETUP.md)
- [Apple Developer](docs/APPLE_DEVELOPER.md)
- [Domain & DNS](docs/DOMAIN_SETUP.md)
