# Supabase Setup

## 1. Yeni proje oluştur

1. https://supabase.com/dashboard giriş yap (`berkebulsu@gmail.com`)
2. **New project**
   - Name: `clipforge-prod`
   - Region: `Frankfurt (eu-central-1)` (TR'ye yakın)
   - Pricing plan: **Pro** ($25/ay) — production için şart (auto-pause yok)
   - DB password: güçlü bir password → **1Password'e kaydet**
3. Proje hazırlanır (~2 dk)

## 2. Auth ayarları

`Authentication → Providers`:
- ✅ **Email** (magic link + password)
- ✅ **Google OAuth**
  - Google Cloud Console'da yeni OAuth client oluştur
  - Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`
  - Client ID + Secret'i Supabase'e yapıştır

`Authentication → URL Configuration`:
- Site URL: `https://clipforge.bulsulabs.com`
- Redirect URLs:
  - `https://clipforge.bulsulabs.com/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `clipforge://auth/callback` (iOS deeplink)

## 3. Migration uygula

İki seçenek:

### A) Supabase CLI ile (önerilen)
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-ref>
supabase db push
```

### B) SQL Editor üzerinden manuel
`supabase/migrations/00001_init.sql` içeriğini `SQL Editor → New query`'ye yapıştırıp **Run** de.

## 4. Storage buckets

`Storage → New bucket`:
- `videos-raw` (private) — kullanıcı yüklemeleri
- `videos-rendered` (private) — render edilmiş klipler
- `thumbnails` (public) — preview kapakları
- `avatars` (public) — kullanıcı profil resmi

Her bucket için RLS policy (zaten migration içinde var).

## 5. Edge Functions deploy

```bash
supabase functions deploy ingest-video
supabase functions deploy revenuecat-webhook
supabase functions deploy tiktok-callback
supabase functions deploy schedule-publish
```

## 6. Environment variables (`.env`)

Web ve worker `.env` dosyalarına:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # SUNUCU TARAFI, asla client'a verme
SUPABASE_JWT_SECRET=...
SUPABASE_DB_URL=postgres://...
```

`Settings → API`'dan kopyala.
