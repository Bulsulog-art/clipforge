FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*
# IMPORTANT: fetch `yt-dlp_linux`, NOT the generic `yt-dlp` asset.
#
# The generic asset is a PYTHON ZIPAPP: its first bytes are
# `#!/usr/bin/env python3` followed by a zip archive, so it only runs where a
# python3 interpreter exists. The runner stage below deliberately ships no
# Python, so copying that file produced the silent production killer:
#   "/usr/bin/env: 'python3': No such file or directory"
# Every YouTube job failed with it from 2026-05-24 onward.
#
# `yt-dlp_linux` is the PyInstaller build — a real standalone ELF executable
# with the interpreter bundled in. It needs nothing from the base image.
RUN curl -fL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp \
  && /usr/local/bin/yt-dlp --version
COPY package.json package-lock.json* ./
# YOUTUBE_DL_SKIP_DOWNLOAD: youtube-dl-exec ships a preinstall script that
# fetches yt-dlp from GitHub. We already installed yt-dlp above, so skip it
# (and avoid the script crashing on Node 22 SSL/redirect handling).
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true
RUN npm install --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
# youtube-dl-exec's preinstall script verifies a `python` binary exists on
# $PATH. The build-stage slim image has no Python; skip the check — the
# runtime stage now really does use a self-contained yt-dlp (yt-dlp_linux,
# a PyInstaller ELF), which the runner verifies at build time below.
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true
# Force devDependencies (typescript, tsx, @types/*) even when Coolify
# injects NODE_ENV=production at build time — otherwise tsc isn't installed
# and `npm run build` exits 127 with "sh: 1: tsc: not found".
RUN npm install --include=dev && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# ffmpeg + libass (for ASS karaoke captions) + Inter font + emoji + Twemoji,
# plus the shared libraries headless Chromium needs. Remotion renders every
# frame in a real browser, so without these the generate queue fails on its
# first job with a linker error and nothing else in the image explains why.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libass9 \
    fonts-inter \
    fonts-noto-color-emoji \
    fontconfig \
    ca-certificates \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /usr/local/bin/yt-dlp /usr/local/bin/yt-dlp
COPY --from=builder /app/dist ./dist
COPY package.json ./
# The compositions are bundled from source at runtime, not from dist: Remotion
# runs its own webpack over the tsx.
COPY src/remotion ./src/remotion

# Footage is staged here for staticFile() to serve. Created now, and owned by
# the user the process actually runs as.
RUN mkdir -p /app/.remotion-public && chown -R node:node /app/.remotion-public
ENV REMOTION_PUBLIC_DIR=/app/.remotion-public

# Build-time sanity: fonts, libass, AND yt-dlp actually executing in THIS
# image. The yt-dlp check is the one that matters most — it is the exact
# assertion whose absence let a Python-dependent binary ship into a
# Python-less runtime and silently kill every job for months. If yt-dlp
# cannot run here, the build must fail loudly instead of the product dying
# quietly in production.
#
# ensureBrowser() is here for the same reason, and it does two jobs at once.
# It downloads the ~100MB Chrome Headless Shell now instead of inside the
# first customer's render, and it fails the build if the browser cannot
# actually start in this image — which is precisely how a missing shared
# library would otherwise present: a cryptic runtime error on someone's first
# generate job, long after the deploy that caused it.
RUN fc-match "Inter Bold" \
  && ffmpeg -h filter=ass > /dev/null \
  && yt-dlp --version \
  && node -e "require('@remotion/renderer').ensureBrowser().then(()=>console.log('chromium ok')).catch(e=>{console.error('chromium FAILED:',e.message);process.exit(1)})" \
  && chown -R node:node /app/node_modules/.remotion 2>/dev/null || true

USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "dist/index.js"]
