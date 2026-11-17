FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm install; fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# IP -> country database for /api/dentvideo/geo and the funnel's country
# (src/lib/dentvid/geo-ip.ts): DB-IP "IP to Country Lite", CC BY 4.0, read
# in-process, no third-party call at runtime. This layer re-runs with every
# source change, so each deploy takes the month's current file. Never fails
# the build: without the file the country is just unknown (as before).
RUN mkdir -p geoip && (node scripts/fetch-geoip.mjs geoip || true)

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# Docker sets HOSTNAME to the container id, and the standalone server binds
# to $HOSTNAME — so it never listened on localhost and Coolify's healthcheck
# (GET localhost:3000/api/health) was refused, rolling back every deploy.
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Empty when the download failed; geo-ip.ts then answers "unknown".
COPY --from=builder --chown=nextjs:nodejs /app/geoip ./geoip

USER nextjs
EXPOSE 3000
# curl is not in node:alpine; check health with node itself.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
