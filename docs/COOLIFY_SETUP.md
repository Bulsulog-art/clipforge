# Coolify Setup

Coolify, self-hosted PaaS — Heroku/Vercel benzeri. `bulsulabs.com` VPS'inde çalışıyor varsayımı ile.

## 1. Coolify üzerinde proje aç

1. Coolify panel'e gir (`https://coolify.<your-vps-host>`)
2. **+ New** → **Project** → `ClipForge`
3. **Production** environment oluştur

## 2. Servisleri ekle

### Service 1 — `web` (Next.js)
- **+ New Resource** → **Public Repository** (veya kendi GitHub'ından)
- Repo: `https://github.com/bulsulabs/clipforge` (push edince)
- Build pack: **Dockerfile** (`web/Dockerfile`)
- Port: `3000`
- Domain: `clipforge.bulsulabs.com`
- Health check: `/api/health`

### Service 2 — `worker` (BullMQ + FFmpeg)
- Aynı repo, klasör: `worker/`
- Build pack: **Dockerfile** (`worker/Dockerfile`)
- **Persistent volume**: `/data/temp` → 50GB (video buffer)
- **Resource limits**: 4 CPU / 8GB RAM (FFmpeg ağır)

### Service 3 — `redis`
- **+ New Resource** → **Database** → Redis
- Persistence açık
- Internal-only (public erişim yok)

## 3. Environment variables

Her servis için `Environment Variables` sekmesinden ekle. Tüm liste `.env.example`'da.

**Önemli:** `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `REVENUECAT_SECRET_KEY` → "Sensitive" işaretle.

## 4. DNS (Cloudflare)

```
A    clipforge.bulsulabs.com    → <VPS IP>     proxied
A    api.clipforge.bulsulabs.com → <VPS IP>    proxied
```

SSL: Coolify otomatik Let's Encrypt ile halleder (Cloudflare proxied ise "Flexible" değil **"Full (strict)"** seç).

## 5. Auto-deploy

GitHub webhook ekle (Coolify > Service > Settings > Webhooks). Her push otomatik deploy.

## 6. Backup

- **Postgres**: Supabase zaten otomatik backup (Pro plan)
- **Coolify config**: Settings → Backup → S3 (Backblaze B2 ucuz)
- **Worker data**: temp dosyalar, backup gerekmez

## 7. Monitoring

- Coolify'da built-in resource graph
- Sentry (Next.js + worker)
- BetterStack / Uptime Robot — `/api/health` izle
