FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp
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
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true
RUN npm install --ignore-scripts && npm run build

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

# Verify fonts and libass load (build-time sanity)
RUN fc-match "Inter Bold" && ffmpeg -h filter=ass > /dev/null

USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "dist/index.js"]
