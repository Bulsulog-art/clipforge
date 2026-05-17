#!/usr/bin/env bash
# clipforge one-shot dev setup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ installing web deps"
cd web
if command -v pnpm >/dev/null 2>&1; then pnpm install; else npm install; fi
cp -n .env.example .env.local || true

echo "→ installing worker deps"
cd ../worker
if command -v pnpm >/dev/null 2>&1; then pnpm install; else npm install; fi

echo "→ done. Next steps:"
echo "  1) fill web/.env.local with Supabase + OpenAI + RevenueCat keys"
echo "  2) supabase login && supabase link --project-ref <ref> && supabase db push"
echo "  3) docker compose up redis"
echo "  4) cd web && pnpm dev   |   cd worker && pnpm dev"
