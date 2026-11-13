#!/usr/bin/env bash
# DentVideo browser smoke test in one command (see scripts/dentvideo-smoke.mjs):
#
#   bash scripts/dentvideo-smoke.sh                       # against https://dentvideo.com
#   SMOKE_URL=https://staging.example bash scripts/dentvideo-smoke.sh
#   DENTVIDEO_MONITOR_TOKEN=… bash scripts/dentvideo-smoke.sh   # skip per-IP limits / Turnstile
#
# Uses Playwright when it is already installed (node_modules or global);
# otherwise fetches a pinned version with npx and installs its Chromium once.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
PW_VERSION="${PLAYWRIGHT_VERSION:-1.49.1}"

if node -e 'import("playwright").then(()=>process.exit(0),()=>process.exit(1))' 2>/dev/null; then
  exec node "$here/dentvideo-smoke.mjs"
fi
npx --yes "playwright@${PW_VERSION}" install chromium >/dev/null
exec npx --yes -p "playwright@${PW_VERSION}" node "$here/dentvideo-smoke.mjs"
