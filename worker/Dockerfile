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

# ffmpeg + libass (for ASS karaoke captions) + Inter font + emoji + Twemoji
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libass9 \
    fonts-inter \
    fonts-noto-color-emoji \
    fontconfig \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /usr/local/bin/yt-dlp /usr/local/bin/yt-dlp
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Build-time sanity: fonts, libass, AND yt-dlp actually executing in THIS
# image. The yt-dlp check is the one that matters most — it is the exact
# assertion whose absence let a Python-dependent binary ship into a
# Python-less runtime and silently kill every job for months. If yt-dlp
# cannot run here, the build must fail loudly instead of the product dying
# quietly in production.
RUN fc-match "Inter Bold" \
  && ffmpeg -h filter=ass > /dev/null \
  && yt-dlp --version

USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "dist/index.js"]
