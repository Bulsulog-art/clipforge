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

## Model choice (2026-11-08)

**Question from the owner:** are the agents and the voice on the best models?

**Answer, measured:**
- **Text:** switched to **gpt-5.4-mini** for the writers and **gpt-5.4** for the reviewers (narrator, hook editor, strategist, accuracy, compliance).
  - Over two runs, ready rate and hook score held.
  - The first-pass rate went from 67% to 88%.
  - The voice score went from 3.48 to 4.09. The biggest gain was Turkish, from 3.0 to 4.0.
  - The cost is about one cent more per video.
- **Voice:** stays on **tts-1-hd** in all four languages tested.
  - gpt-4o-mini-tts, with per-language dentist instructions, transcribed just as accurately.
  - It scored the same or lower in a side-by-side listening test, in every language.
  - It reads 8–12% slower in tr, de and es.
  - It stays available behind a flag.

### Text models: tr, de, en, `--per 4`, judge fixed on gpt-4o

| Writer / reviewer | Runs | Videos | Ready | First pass | Hook | Voice | Voice tr / de / en | $/ready video |
|---|---|---|---|---|---|---|---|---|
| gpt-4o-mini / gpt-4o (before) | 2 | 24 | 96% | 67% | 3.96 | 3.48 | 3.00 / 3.38 / 4.00 | 0.0236 |
| gpt-4.1-mini / gpt-4.1 | 2 | 21¹ | 90% | 48% | 4.16 | 4.05 | 3.86 / 3.80 / 4.43 | 0.0286 |
| gpt-4o-mini / gpt-5.4 | 1 | 12 | 100% | 58% | 4.00 | 4.00 | 4.00 / 4.00 / 4.00 | 0.0337 |
| **gpt-5.4-mini / gpt-5.4 (now)** | 2 | 24 | 96% | **88%** | 3.96 | **4.09** | 4.00 / 4.00 / 4.25 | 0.0340 |

Per run:

| Config | Ready | First pass | Hook | Voice |
|---|---|---|---|---|
| before, run 1 | 100% | 83% | 3.92 | 3.33 |
| before, run 2 | 92% | 50% | 4.00 | 3.64 |
| gpt-4.1-mini/4.1, run 1 | 100% | 60% | 4.20 | 4.00 |
| gpt-4.1-mini/4.1, run 2 | 82% | 36% | 4.11 | 4.11 |
| gpt-5.4-mini/5.4, run 1 | 100% | 83% | 3.92 | 4.08 |
| gpt-5.4-mini/5.4, run 2 | 92% | 92% | 4.00 | 4.09 |

¹ The gpt-4.1 strategist planned fewer topics than asked: German got 2 and then 3 topics instead of 4.

**Why gpt-5.4-mini / gpt-5.4:**
- **The rule was:** change a reviewer only if ready rate, hook and voice all hold or improve over two runs, and change a writer only if the first-pass rate improves. This config is the only one that meets both.
- **The voice gain is real, not noise.** It holds in both runs (+0.75 and +0.45 over the matching baseline run). The per-video notes show why.
  - The gpt-4o narrator wrote Turkish judged "formal and repetitive, lacking warmth", e.g. "Diş taşı temizliği, bu sorunları önlemeye yardımcı olabilir. Diş taşı, diş etlerinizin…".
  - gpt-5.4 opens with the patient's own situation, e.g. "Temizlikten sonra bir şey içerken dişiniz sızladı mı? Bakın, …", and is judged "conversational, like a dentist's natural explanation".
- **The gpt-5.4 reviewer alone gives the voice gain.** The third row shows this, but with the old writer the first-pass rate fell to 58%. The gpt-5.4-mini writer is what lifts first pass.
- **gpt-4.1/4.1 scored a little higher on hook, but failed the ready rule.** It lost ready rate (82% in run 2), had the most rewrites, and its strategist under-planned the week.
- **Not tested:**
  - gpt-5.5. At $5/$30 per million tokens it would cost about twice as much again, and gpt-5.4 already reaches the judge's ceiling of about 4.
  - gpt-5.6 and gpt-6.x. No public price was found for them.
  - Reasoning effort. The reasoning models run at the lowest effort; higher effort was not measured.

**Risk seen:** 1 of 24 videos with the new writer was lost to a scene plan whose text ran over a length limit, even after the retry. The old configuration also lost one video (tr), to a reviewer rejection. The retry hint already names the limit. If this repeats in production, the next step is to have the planner shorten the text instead.

**Cost:** text costs **$0.034 per ready video, up from $0.024** (+$0.010, +44%), with metered tokens and the judge excluded. That is about $0.05 more per clinic per 5-video week, which is negligible against the $39 Starter plan.
- Prices per million tokens (input / output): gpt-4o-mini 0.15/0.60, gpt-4o 2.50/10, gpt-4.1-mini 0.40/1.60, gpt-4.1 2/8, gpt-5.4-mini 0.75/4.50, gpt-5.4 2.50/15.
- The gpt-5.4 prices come from price aggregators, because platform.openai.com is outside this session's allowlist. Check them against the OpenAI invoice.
- To roll back without a deploy: `DENTVID_AGENT_MODEL=gpt-4o-mini DENTVID_REVIEW_MODEL=gpt-4o`.

### Voice: tts-1-hd vs gpt-4o-mini-tts
**Setup:**
- Same scripts, voice "nova".
- gpt-4o-mini-tts gets the per-language brief in `worker/src/dental/voice.ts`: a warm, calm dentist, one patient, natural pace, correct dental terms, Castilian for es.
- Run 2 used 3 new-model narrations each for tr/de/en and 2 for es.
- Run 1 used 2 old-model narrations per language.

**What was measured:**
- **Length:** spoken length against the plan.
- **Words per second.**
- **Loudness and silence:** EBU R128 loudness and total silence (pauses over 0.6 s), from ffmpeg.
- **WER:** gpt-4o-transcribe's transcript compared with the script.
- **Side-by-side score:** gpt-audio scored both clips together for natural, accuracy and warmth, 1–10 each (sum 3–30), in both orders.

| Lang | Model | Length vs plan | Words/s | LUFS | WER | Side-by-side (3–30) |
|---|---|---|---|---|---|---|
| tr | tts-1-hd | 1.32 | 2.04 | −27.1 | 0.01 | **25.0** |
| tr | gpt-4o-mini-tts | 1.43 | 1.87 | −19.6 | 0.01 | 23.0 |
| de | tts-1-hd | 1.16 | 2.62 | −26.1 | 0.03 | 24.5 |
| de | gpt-4o-mini-tts | 1.23 | 2.46 | −19.5 | 0.02 | 24.5 |
| es | tts-1-hd | 1.21 | 2.94 | −25.3 | 0.02 | **25.3** |
| es | gpt-4o-mini-tts | 1.35 | 2.61 | −19.6 | 0.03 | 22.5 |
| en | tts-1-hd | 1.30 | 2.93 | −25.8 | 0.01 | **24.8** |
| en | gpt-4o-mini-tts | 1.31 | 2.91 | −20.2 | 0.01 | 24.5 |

Run 1 had single-clip scores on a 1–5 scale. tts-1-hd scored the same or higher on naturalness in every language (5.0 against 4.0–5.0).

In run 1 the judge flagged two mispronunciations, both from gpt-4o-mini-tts: "meigen" in German and "clínica" in Spanish. tts-1-hd had none.

**Decision:** tts-1-hd stays the default in all four languages. The rule was "switch where gpt-4o-mini-tts wins with WER no worse". It won nowhere: two ties and two losses, with WER equal.
- gpt-4o-mini-tts also speaks 8–12% slower in tr/de/es. That stretches the video, because the plan is fitted to the voice.
- To try it per language: `DENTVID_TTS_MODEL_<LANG>=gpt-4o-mini-tts`. The instructions are applied, and on any error the narration falls back to tts-1-hd.

**Limits of this test:**
- **gpt-audio is a weak judge.**
  - Asked "which do you prefer", it picked whichever clip came second in 15 of 16 pairs (the other gave no answer), so that method was dropped for scoring both clips side by side.
  - It refused or gave no scores in about 30% of the single-clip scorings (11 of 38).
  - Its scores bunch at 8–9 out of 10.
  - Read these as "no evidence that gpt-4o-mini-tts is better", not as "tts-1-hd is clearly better".
- **No human listened.** Samples are in the scratchpad, and an owner's listen to tr and de is the cheapest next check.

**Separate finding:** both voices come out quiet. tts-1-hd measures about −26 LUFS and gpt-4o-mini-tts about −20, while Instagram and TikTok play around −14. The render applies no loudness normalisation; music is mixed at 0.12. A `loudnorm` pass on the voice-over would help whichever model is used.

### How to re-run
```
cd worker
DENTVID_AGENT_MODEL=<writer> DENTVID_REVIEW_MODEL=<reviewer> NODE_USE_ENV_PROXY=1 \
  npx tsx src/dental/eval.ts --per 4 --only tr,de,en --out eval-<name>   # judge stays gpt-4o
npx tsx src/dental/voice-eval.ts --from eval-<name>/eval.json --out voice --per-lang 3
```
- **Text eval:** `eval.json` records `costs` (tokens per model, $ per video and per ready video, judge excluded) and each ready video's narration and planned length.
- **Model settings:** `worker/src/lib/model-params.ts` handles what each model accepts. The gpt-5/6 reasoning models reject any temperature except 1 and take `reasoning_effort` instead. gpt-5.4 accepts a temperature when its reasoning effort is "none".
- **Models the key can use (2026-11-08):** gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-5, gpt-5-mini, gpt-5-nano, gpt-5.1, gpt-5.2, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-5.5, gpt-5.6-*, gpt-6-*, gpt-6.1-*, o3, tts-1, tts-1-hd, gpt-4o-mini-tts, gpt-audio, gpt-4o-transcribe, whisper-1.

### Would Anthropic Claude or ElevenLabs be better?
- **Claude (writer, narrator, reviewer):**
  - The voice score was the weakest number, and it moved most when the narrator model changed. A model that writes more natural non-English prose is the most likely next gain, and Claude models are strong there.
  - This is untested.
  - It needs an `ANTHROPIC_API_KEY` and a small adapter in `agentJson` (JSON via a tool call).
  - The judge must stay on gpt-4o, so the comparison stays fair.
  - Not integrated: no key.
- **ElevenLabs (voice):**
  - Since gpt-4o-mini-tts did not beat tts-1-hd, the next voice candidate is ElevenLabs `eleven_multilingual_v2`. It is generally rated more natural than OpenAI voices for non-English speech, at roughly 3–10× tts-1-hd's price per minute.
  - The worker already has the code path (`steps/tts.ts`, used for cloned voices).
  - It needs `ELEVENLABS_API_KEY` and one stock voice id per language. `voice-eval.ts` can then compare it in the same test, ideally with a human listening as well.
  - Not enabled: no key.
