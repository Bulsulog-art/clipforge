# Domain Setup (`clipforge.bulsulabs.xyz`)

## Cloudflare DNS

`bulsulabs.com` zone'unda:

```
Type  Name                       Content       Proxy
A     clipforge                  <VPS IP>      Proxied (orange)
A     api.clipforge              <VPS IP>      Proxied
CNAME cdn.clipforge              <ref>.supabase.co  DNS only
```

iOS Universal Links için:

`.well-known/apple-app-site-association` Next.js'te serve edilecek (`web/src/app/.well-known/apple-app-site-association/route.ts`).

## SSL

- Cloudflare SSL mode: **Full (strict)**
- Coolify Let's Encrypt otomatik

## Email (opsiyonel)

`hello@clipforge.bulsulabs.xyz` için Cloudflare Email Routing → `berkebulsu@gmail.com` forward.

Outbound email: **Resend** (`resend.com`) — Supabase Auth + transactional.
DKIM/SPF/DMARC kayıtlarını Resend dashboard'dan al, Cloudflare DNS'e ekle.
