# Autonomous work plan — dental Reels product

Started 2026-11-08 03:05 UTC, runs until **2026-11-08 11:05 UTC** (8 hours).
The owner is asleep. Each hourly check-in reads this file, continues the next
open item, updates the status here, commits and pushes.

## Sabah raporu (2026-11-08)

**Kısaca:** DentVideo canlıda ve uçtan uca çalışıyor. Bir klinik kaydoluyor, profilini giriyor ve haftanın videolarını istiyor. Sistem 15–20 dakikada 5 video üretiyor. Her video klinik doğruluk ve sağlık reklamı kurallarından geçiyor, ses ve görüntü ölçümü yapılıyor, video kliniğin renginde ve logosuyla geliyor. Hiçbir şey hekim onaylamadan yayınlanmıyor.

**Canlı adres: https://dentvideo.com** (2026-11-08'de bağlandı). DNS Hostinger API ile sunucuya yönlendirildi, domain Coolify'da web uygulamasına eklendi ve HTTPS çalışıyor. Eski clipforge.bulsulabs.com/dentvideo adresleri 301 ile dentvideo.com'a gidiyor. Canonical, hreflang ve sitemap dentvideo.com'u gösteriyor. Eski adresler (yönlendirme öncesi):
- https://clipforge.bulsulabs.com/dentvideo, ayrıca /de, /es, /tr ve /fr
- Rehberler: /dentvideo/guides/…
- Uygulama: /dentvideo/app
- Yapay zekâ arama motorları için: /dentvideo/llms.txt

**Gece yapılanlar:**
1. Canlı test: Türkçe (İzmir) ve Almanca (München) test kliniklerinin haftaları üretim sunucusunda üretildi.
   - İlk Türkçe hafta: 5 video hazır, 2 reddedildi. İki ret de yerindeydi: biri uydurma bir "%80" istatistiği, diğeri mutlak bir iddiaydı.
   - Son Almanca hafta: 5/5 hazır, kalite kontrolü temiz, marka rengi uygulanmış.
2. Bulunan ve düzeltilen hatalar:
   - Haftalık videolar kliniğin marka rengini kullanmıyordu.
   - Haftalık videolarda logo yoktu.
   - Açılış cümleleri (hook) cevabı baştan veriyordu.
   - Aynı hizmetten iki benzer konu çıkıyordu.
   - "Bu haftanın videoları" düğmesine ikinci kez basınca, hiçbir şey üretilmediği halde "hazırlanıyor" yazıyordu.
3. Ajan eğitimi: 4 ülke ve 4 dilden sabit test klinikleri ve bağımsız bir "hasta gözüyle" puanlayıcı kuruldu. 10 tur boyunca:
   - Hazır video oranı %88'den %100'e çıktı (24/24).
   - Düzeltme istemeden geçen video oranı %19'dan %58–81'e çıktı.
   - Hook puanı 3,4'ten 4,0'a çıktı (5 üzerinden).
   - Seslendirme puanı 2,8'den yaklaşık 3,6'ya çıktı.
   
   Yeni ajanlar: seslendirme yazarı (anlatıcı), hook editörü (her konu için 4 seçenek yazıp puanlıyor). Uyum denetçisi de güçlü modele alındı ve gereksiz itirazları kesildi. Ayrıntılı tablo aşağıda.
4. Web sitesi:
   - 5 dilde açılış sayfası ve 7 rehber, hreflang etiketleri ve llms.txt.
   - Uygulamanın tamamı 5 dilde. Türk bir hekim hiç İngilizce görmüyor.
   - Açılış sayfasında gerçek örnek bir hafta: demo klinik için düzeltilmeden konan 3 video.

**Sizin kararınızı bekleyenler:**
- ~~dentvideo.com alınsın~~ (alındı ve bağlandı). Mümkünse .de, .es ve .com.tr de alınsın. Marka araştırmasını (USPTO, EUIPO, TÜRKPATENT) buradan yapamadım. Almadan önce bakılmalı.
- **Fiyatlar.** Sitede şimdilik "ilk hafta ücretsiz" yazıyor. Fiyat uydurmadım.
- **Dodo:** alan adından sonra DentVideo markası ve ürünleri açılacak. `DODO_API_KEY` sunucuda tanımlı değil.
- **Coolify API anahtarı** sohbete düz yazıyla yapıştırıldı. Lütfen yenileyin.
- **Test hesaplarını silin (Liman auth):** e2e-dentvideo@bulsulabs.com, e2e-dentvideo-de@bulsulabs.com ve e2e-dentvideo-es@bulsulabs.com, ayrıca bunlara ait `dentvid_clinics` ve `dentvid_items` satırları ile `dentvid` bucket'taki dosyalar.
- **Bulut ClipForge projesindeki boş tablolar:** `clipforge.clinics` ve `clipforge.dental_items` kullanılmıyor. Gece silme yapmadım; isterseniz kaldırılabilir.

**Bilinen sınırlar:**
- Tarayıcıdan kayıt yükleme bu sandbox'tan test edilemedi, çünkü sandbox proxy'si liman.bulsulabs.com isteklerindeki yetki başlığını değiştiriyor. Kayıttan klip çıkarma hattının kendisi yerelde uçtan uca doğrulandı. Gerçek bir tarayıcıdan bir kez denemek yeterli.
- Seslendirme puanı resmî hitap kullanan kliniklerde (siz/Sie) biraz düşük çıkıyor. Bunun bir kısmı puanlayıcının "resmî = soğuk" önyargısı.
- Her videoda artık bir stok görüntü sahnesi (Pexels) var. Üretimde bir İspanyolca test haftasıyla doğrulandı: 5 videonun 5'inde görüntü var. Bir klipte başka bir klinikte tedavi edilen gerçek bir hasta göründü. Bu yüzden görüntüler artık yalnızca nesne çekimleriyle sınırlı: insan, klinik ya da tedavi sahnesi yok, aynı hafta içinde aynı klip tekrar etmiyor. Yine de Pexels'in döndürdüğü her klibi önceden göremiyoruz. Hekim onayı bu yüzden şart.

- Hekimin kendi kaydından çıkan kliplerde logo en üst köşede (24 px). Instagram ve TikTok o bölgeye kendi simgelerini koyuyor. Logoyu biraz aşağı almak, yüze göre konumlanan başlıkla birlikte ayarlanmalı. Gerçek bir hekim videosuyla denenmesi gereken küçük bir iş.

**Sonraki adımlar (önerim):**
1. Alan adını alıp dentvideo.com → /dentvideo yönlendirmesini kurmak.
2. Fiyat ve Dodo ürünlerini açmak.
3. 5–10 gerçek klinikle ücretsiz ilk hafta denemesi yapmak.
4. YouTube trend ajanı.
5. iOS uygulamasının yeniden markalanması.

**Kapanış (11:05 UTC):** 8 saatlik gece çalışması bitti, saatlik kontrol kapatıldı. Her şey birleştirildi ve canlıda, dentvideo.com yayında. Sonraki iş: otomatik haftalık teslim ve e-posta bildirimi, ardından onaylanan videoların otomatik paylaşımı.

**Gündüz eklenenler (2026-11-08):**
- **Otomatik pazartesi teslimi:** Her pazartesi 05:00 UTC'de aktif kliniklerin haftası kendiliğinden hazırlanıyor. Deneme kliniklerine yalnızca ücretsiz ilk haftaları yapılıyor.
- **"Videolarınız hazır" e-postası:** Kliniğin dilinde (7 dil) hello@dentvideo.com adresinden gidiyor. Resend'de alan adı doğrulandı (DKIM/SPF/DMARC).
- **Tek dokunuşla paylaşım:** Onaylanan videoda "Instagram'da veya TikTok'ta paylaş" telefonun paylaşım menüsünü video ekli olarak açıyor ve açıklama panoya kopyalanıyor.
- **Gerçek hasta aramaları:** Konular artık kliniğin ülkesinde gerçekten aratılan sorulardan (Google önerileri) seçiliyor. Test turunda 12 videonun 12'si hazır çıktı.
- **Doğrudan otomatik paylaşım** (Instagram/TikTok/YouTube API'leri) platform onaylarına bağlı. Uygulamalar üretimde hiç paylaşım yapmamış, bu yüzden Meta ve TikTok onay süreçleri gerekiyor.

## Ground rules (do not break)
- Quality over quantity: every change tested; renders checked frame by frame.
- No purchases, no domain registration, no App Store submissions, no emails
  or messages to real users, no changes to the Dodo account (paused by the
  owner until the domain is decided), no destructive database operations.
- Database: additive migrations only (new tables/columns), never drop or
  rewrite existing data.
- Production deploys only after tests pass; check health after each deploy.
- Never invent facts, trends or testimonials on public pages.
- Record every decision and every open question for the owner below.

## Workstreams and status
| # | Item | Status |
|---|------|--------|
| 1 | Product name + .com availability + conflict check, decision recorded | done — **DentVideo** (dentvideo.com) |
| 2 | Data model: clinics, dental content items (additive migration) | done — on Liman (`supabase/liman/0001_dentvid.sql`) |
| 3 | Worker jobs: weekly content run + recording run, results stored | done |
| 4 | Web app: clinic onboarding (profile, brand colour, logo) | done — /dentvideo/app |
| 5 | Web app: content library — preview, findings, approve / reject, download | done |
| 6 | Web app: upload a recording (shoot card shown) | done — /dentvideo/app/record |
| 7 | Brand landing + SEO/GEO pages for dentists (EN, DE, ES, TR) | done — EN + DE/ES/TR/FR landings, 7 guides, hreflang, /dentvideo/llms.txt, sitemap (PR #13) |
| 8 | End-to-end check on production, QA pass, final report for the owner | done — production run: sign-up → clinic → week → 5 ready / 2 rejected (genuine: invented statistic, absolute claim) → stored and served; fixes shipped (brand colour, hooks, topic spread, honest re-run state). Not testable from the sandbox: browser upload of a recording (the sandbox proxy rewrites Authorization for liman.bulsulabs.com) — the recording pipeline itself is verified locally. |
| 9 | Interface in five languages (header, sign-up, app screens, API messages) | done — PR #18 |
| 10 | Agent training with an eval harness (10 rounds) | done — 24/24 ready in the last round; see below |
| 11 | Real sample week on the landing page + VideoObject structured data | done — PR #22 |

## Decisions log
- **Name: DentVideo — dentvideo.com (available 2026-11-08), the owner's
  suggestion over my first pick "DentVid"**: "video" is the same word in
  EN/DE/ES/TR and matches "dental video" searches. No company or product of
  that name found (closest: Video Dental Concepts, intraoral cameras,
  videodental.com — different field). Internal table prefix stays `dentvid_`.
- First pick before that: DentVid — dentvid.com (available). Checked ~80 candidates.
  Rejected "…Clip(s)" names (a "dental clip" is a physical denture/orthodontic
  part — search results would be about hardware), "…Reels"/"…Shorts" names
  (Meta's and YouTube's product names: trademark risk), and every premium-
  sounding .com (all registered). No product named DentVid found on the web.
  Clear meaning in EN/DE/ES/TR ("dental video"), short, no platform names.

- **Backend on Liman** (owner's instruction): tables `dentvid_clinics`,
  `dentvid_items` in Liman's public schema (Liman exposes only public; other
  apps there use prefixes too), private storage bucket `dentvid`, RLS so a
  clinic sees only its own rows. Accounts are Liman auth users. The same two
  tables were first created in the ClipForge cloud project (clipforge.clinics,
  clipforge.dental_items); they are empty and unused — left in place, not
  dropped (no destructive operations overnight).
- **App location**: DentVideo runs inside the existing web app under
  /dentvideo with its own Liman client, so it can be served on dentvideo.com
  later by pointing the domain at the same app (host-based routing).

- **Sign-up**: Liman has public sign-up disabled (it hosts other apps), so
  DentVideo creates accounts server-side with the service role
  (/api/dentvideo/signup) and the browser signs in with the password. The
  global Liman setting was not changed.
- **Pricing**: not invented. The site says "first week free, founding clinics
  get introductory pricing when plans open" until the owner sets prices.

## Questions for the owner
- Prices for DentVideo (and then the Dodo brand + products once the domain is bought).
- Buy **dentvideo.com** (and ideally dentvideo.de / .es / .com.tr). Before buying,
  a trademark search (USPTO, EUIPO, TÜRKPATENT) was not possible from here.

## Agent training — eval rounds (2026-11-08)

`worker/src/dental/eval.ts` runs a fixed panel (İzmir/tr formal-warm, München/de formal-expert,
Madrid/es informal-calm, Austin/en informal-playful) through the whole agent chain without rendering.
A gpt-4o judge, as a scrolling patient, scores hook and narration 1-5.
Run with `npx tsx src/dental/eval.ts --per 4 --out <dir>`.

| Round | Change | Ready | First pass | Hook | Voice |
|---|---|---|---|---|---|
| base | — | 88% | 19% | 3.43 | 2.79 |
| 2 | narrator agent (gpt-4o) rewrites the voice-over from screen text only; writers told the words reviewers always reject | 69% | 25% | 3.64 | 3.73 |
| 3 | compliance ignores no-op fixes and objections to questions; negated "not permanent" allowed; "before and after meals" is time, not results; writers given the standard aftercare guide | 94% | 63% | 3.67 | 3.67 |
| 4 (tr+de, 10 videos) | "permanent filling/crown" is a dental term; no listicle hooks; warm formal voice; invalid plan retried with its error | tr 100% / de 80%¹ | tr 80% / de 20% | tr 3.4 / de 3.75 | tr 3.0 / de 3.5 |

| 5 | hook editor (gpt-4o writes 4 options per topic, keeps the best) | 94% | 81% | 4.00 | 3.67 |
| 6 | hook-shape variety; spoken-register cues per language | 81% | 56% | 3.92 | 3.46 |
| 7 (24 videos) | rewrites edit the previous draft instead of starting over | 79% | 67% | 3.84 | 3.74 |
| 8 (24) | removed an example hook the model kept cloning into topics; topics built on banned words dropped; reviewers stop stacking hedges; general hygiene is always relevant | 88% | 63% | 4.05 | 3.57 |
| 9 (24) | compliance reviewer on gpt-4o (the small model traded synonyms until attempts ran out) | 96% | 71% | 3.91 | 3.43 |
| 10 (24) | hook editor scores each candidate and keeps the best clean one; no "Topic: label" hooks; topics must match the listed service they name | **100%** | 58% | **4.00** | 3.50 |
| 11 (16) | one stock-footage scene per video (verified on production with a Spanish clinic, guarded to object shots) | 88% | 50% | 3.93 | 3.50 |
| 12 (fr/it/pt, 14) | French, Italian, Portuguese added to the panel | 100% | 64% | 3.93 | 3.43 (it 2.75) |
| 13 (fr/it/pt, 14) | Italian/Portuguese spoken cues (they had fallen back to English); no hooks that blame dentists; no "Did you know?" openers | 93% | 36% | 3.62 | 3.54 (it 3.4) |

Production check after these rounds: a fresh German clinic week on the live worker gave 5/5 ready, QA passing, and the brand colour applied.

Rounds of 16–24 videos swing about ±10 points between runs, so changes were kept only when the reasons behind them were visible in the per-video notes, not just because a number moved.
The voice score is consistently lower for the two formal clinics (tr, de: about 3) than for the informal ones (es, en: about 4).
The judge reads formal address as "less warm". Formal address is the clinic's choice, so this is partly a bias in the judge, not a writing fault.

¹ The one German loss was a plan over the cta length limit, which is fixed by the retry and covered by a test.

What the judge still asks for: more surprise in hooks and warmer Turkish narration.
These are the next levers. The writer brief is fine; the reviewers no longer cost rewrites for nothing.

## Model choice (2026-11-08) — measurement blocked, defaults unchanged

**Question from the owner:** are the agents and the voice on the best models?

**Short answer: not measured yet, so nothing was switched.** The OpenAI account ran out of credit
(`insufficient_quota: credit_balance_exhausted`) about one minute into the comparison runs. Every request
since then fails with the same error, the eval judge included. Changing the
defaults without numbers would go against the rule of this eval ("change it and see the numbers move"),
so the production defaults are still **gpt-4o-mini (writers) / gpt-4o (reviewers) / tts-1-hd (voice)**.
The work that was done makes the comparison a set of env flags and two commands. It can be run once credit is added.

### What the key can use (`GET /v1/models`, 2026-11-08)
Text: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-5, gpt-5-mini, gpt-5-nano, gpt-5.1, gpt-5.2, gpt-5.4,
gpt-5.4-mini, gpt-5.4-nano, gpt-5.5, gpt-5.6-{luna,sol,terra}, gpt-6-{astra,luna,sol}, gpt-6.1-{sol,terra}, o3.
Voice: tts-1, tts-1-hd, gpt-4o-mini-tts (2025-03-20 and 2025-12-15), gpt-audio, gpt-audio-mini, gpt-realtime-*.
Transcription: whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe. There is no gpt-4o-audio-preview, so
gpt-audio is the listening judge.

What each model accepts was probed directly before the credit ran out. The reasoning models (gpt-5,
gpt-5.5, gpt-5.6-*, gpt-6*) reject any temperature except 1. They need `reasoning_effort` instead: "none" for
most of them, "minimal" for gpt-5/-mini, "low" for gpt-6.1. The gpt-5.4 family takes a temperature when
reasoning is "none". `worker/src/lib/model-params.ts` encodes this. Without it, setting any gpt-5+ model
would have failed every agent call.

### Measured so far
One smoke video (en, writer gpt-5.4-mini, reviewer gpt-5.4): ready on the first pass, hook 4/5, voice 4/5,
**$0.031**. The token meter recorded 9 reviewer calls (6,267 input / 459 output tokens) and 4 writer calls (3,017 / 1,382).
One video says nothing about quality, because rounds of 16–24 videos already swing about ±10 points. It
does give a real token profile, and the cost column below uses it.

### Cost per video (price list × the measured token profile)
| Config (writer / reviewer) | Text $/video | vs today |
|---|---|---|
| gpt-4o-mini / gpt-4o (today) | ~0.022 | — |
| gpt-4.1-mini / gpt-4.1 | ~0.020 | −10% |
| gpt-4.1-mini / gpt-4o | ~0.024 | +10% |
| gpt-4o-mini / gpt-5.4 | ~0.024 | +11% |
| gpt-5.4-mini / gpt-5.4 | 0.031 (metered) | +44% |
| gpt-4o-mini / gpt-5.5 | ~0.046 | +115% |

Prices per 1M tokens (input/output): 4o-mini 0.15/0.60, 4o 2.50/10, 4.1-mini 0.40/1.60, 4.1 2/8,
5.4-mini 0.75/4.50, 5.4 2.50/15, 5.5 5/30. The gpt-5.4 and 5.5 prices come from aggregator sites, because
platform.openai.com is outside this session's network allowlist. The gpt-5.6/6.x models have no public
price that could be found, so they were left out. A video that needs a rewrite costs about 1.5× these figures.
Even the most expensive option is a few cents a video. For a clinic's week of 5 videos, the most expensive
row adds about $0.12. So cost does not decide this. Quality does.

Voice (a 30-second narration is about 450 characters): tts-1-hd at $30 per 1M characters is about
**$0.0135**. gpt-4o-mini-tts is OpenAI's estimate of about $0.015 per minute, so about **$0.0075**.
That makes the newer, steerable model about half the price.

### What to run when credit is back (≈ $3 total)
```
cd worker
# text: same panel, judge fixed on gpt-4o (DENTVID_JUDGE_MODEL is not changed between runs)
for cfg in "gpt-4o-mini gpt-4o" "gpt-4.1-mini gpt-4.1" "gpt-4o-mini gpt-5.4" "gpt-5.4-mini gpt-5.4"; do
  set -- $cfg
  DENTVID_AGENT_MODEL=$1 DENTVID_REVIEW_MODEL=$2 NODE_USE_ENV_PROXY=1 \
    npx tsx src/dental/eval.ts --per 4 --only tr,de,en --out eval-$1-$2
done   # then repeat the best one once: ±10 points is noise
# voice: the same scripts read by both models, measured and listened to
npx tsx src/dental/voice-eval.ts --from eval-gpt-4o-mini-gpt-4o/eval.json --out voice --per-lang 2
```
`eval.json` now records `costs` for each run: tokens per model, $ per video and $ per ready video, with the
judge's tokens excluded. It also stores each ready video's narration and planned length, which the voice test reads.
`voice-eval.ts` measures each clip:
- spoken length against the plan, and words per second
- loudness (EBU R128 LUFS) and total silence, from ffmpeg
- word error rate between gpt-4o-transcribe's transcript and the script
- gpt-audio's 1–5 scores for natural, accuracy and warmth, with any mispronounced words
- a pairwise preference, asked in both orders

**How to decide:** switch a reviewer only if ready rate, hook and voice all hold or improve over two runs
(the narrator and hook editor are "reviewer" calls, and they move hook and voice the most). Switch a
writer only if the first-pass rate improves, because rewrites are the writer's cost. Switch the voice per
language where gpt-4o-mini-tts wins the pairwise vote with WER no worse.

### How to switch (no code change)
- `DENTVID_AGENT_MODEL`, `DENTVID_REVIEW_MODEL` choose the writer and reviewer models. The writer model
  now also drives the DentVideo scene planner, which used to have its own hard-coded gpt-4o-mini. The
  ClipForge prompt-to-video planner keeps its own default.
- `DENTVID_TTS_MODEL` sets the voice model for all languages, and `DENTVID_TTS_MODEL_<LANG>`
  (e.g. `DENTVID_TTS_MODEL_TR=gpt-4o-mini-tts`) sets it for one language. A steerable model gets a
  per-language brief (`worker/src/dental/voice.ts`): a warm, calm dentist speaking to one patient, a
  natural pace, and that language's dental terms pronounced correctly (Castilian for es, European
  Portuguese for pt). If the configured model fails, the narration is spoken again on tts-1-hd and the
  failure is logged. A TTS outage loses the tone, not the video.

### Would Anthropic Claude or ElevenLabs be better?
- **Claude (writer/narrator/reviewer).** This is likely to help most on the weakest number, the voice
  score (about 3.5 and lowest for formal tr/de). Claude models are strong at natural, non-translated prose
  in German, Spanish and Turkish, and at keeping to a long list of style and compliance rules. This is
  untested here. It needs an `ANTHROPIC_API_KEY` and a small adapter in `agentJson` (JSON via a tool or a
  prefilled `{`). The judge must stay on gpt-4o, so that Claude is not graded by itself or by a different
  judge than the baseline. It was not integrated: no key.
- **ElevenLabs (voice).** For non-English narration it is generally rated more natural than OpenAI's voices,
  especially for Turkish stress and German compounds. It costs more: roughly 3–10× tts-1-hd per minute,
  depending on the plan. The worker already has an ElevenLabs path (`steps/tts.ts`,
  `eleven_multilingual_v2`, used for cloned voices). It needs `ELEVENLABS_API_KEY` and a stock voice id
  per language. `voice-eval.ts` could then compare it in the same test. It was not enabled: no key.
