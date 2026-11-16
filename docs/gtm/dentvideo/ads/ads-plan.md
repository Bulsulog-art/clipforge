# DentVideo — paid acquisition plan, month 1 (launch-ready)

> **Read the dated sections at the end first.** This plan grew in dated rounds and earlier sections keep their original numbers. Current prices (Starter $49 / €49 / 1.490 TL, Practice $79 / €79 / 2.490 TL), the EUR account, conversion values and sitelinks are in "Güncelleme 2026-11-16 (3)", which wins over everything above it. Paths like `google-ads/` and `scratchpad/` refer to the original working folder; the files now live in `docs/gtm/dentvideo/ads/`.

*Prepared 2026-11-15. Site state verified by fetching dentvideo.com (/, /tr, /de, /es, /pl, /start, /de/guides, /tr/ad-checker, /de/ad-checker, /videos/*, /privacy, sitemap.xml) and reading the repo (`web/src/lib/dentvid/attribution.ts`, `events.ts`, `components/dentvid/track.tsx`, `start-form.tsx`, `docs/POSITIONING.md`, `docs/SECURITY.md`). Anything marked **(est.)** is an estimate to be replaced with Keyword Planner and account data in week 0.*

## 0. Bottom line (read this first)

- **Budget: $450 hard cap for 28 days.** $14/day on Google Search ($7 TR + $7 DE) = $392, plus about $58 held back for week 3 reallocation. No Meta, LinkedIn, TikTok or YouTube spend in month 1.
- **Run Turkish and German (DE+AT) Search first.** Exact and phrase match only, manual CPC with caps. Do not run US/UK: "social media marketing for dentists" is quoted at about **$77 CPC** in the US (est., third-party). That is about 100× our break-even CPC.
- **Month 1 is a signal test, not a scale test.** Expected 180–640 clicks, 9–40 signups and 1–6 paid (est.). The real unknown is **signup→paid**: today it is 0 of 5. Ads will answer that faster than waiting for organic traffic, but only if the tracking below is in place.
- **Three blockers must be fixed before the first click.** This is the most important finding from the code and site check:
  1. **Attribution is only captured on the locale homepages** (`LandingView` in `landing.tsx`) and on `/start?utm…`. Visitors who land on `/videos/*`, `/<locale>/ad-checker` or `/guides/*` lose their source, because the CTA goes to `/start?lang=xx` without tags. Until this is fixed, **use only `/tr` and `/de` as final URLs.**
  2. **No click ID (gclid/gbraid/wbraid) is captured anywhere**, so paid conversions cannot be sent back to Google.
  3. **The privacy policy currently says "We use no advertising or third-party analytics cookies"** and that data is not used for advertising. Sending click IDs or conversions to Google contradicts it. Update the policy (all locales) and add a consent prompt for paid visitors before launch.

---

## 1. Channel choice (for this buyer: owner-dentist of a 1–3 chair private clinic)

| Rank | Channel | Verdict for month 1 | Why |
|---|---|---|---|
| 1 | **Google Search** | **Yes, the only paid channel** | It is the only channel that captures active intent ("diş kliniği sosyal medya", "Social Media Zahnarztpraxis", "HWG Zahnarzt"). B2B dental-content volume is tiny but cheap outside US/UK. Negatives keep patient searches out. |
| 2 | Meta (IG/FB) | **Not yet.** Earliest week 3 (rules in §7), more likely month 2 | Dentists live on Instagram, but cold interest targeting ("Dentistry") reaches patients and students more than owners. Since 2025 Meta may classify health-related sites as health & wellness and **restrict mid/lower-funnel event optimisation**, so a dental-content site risks being limited to optimising for clicks or landing views. Meta's personal-attributes policy also bans copy like "Are you a dentist who…?". Retargeting needs a pixel or CAPI plus consent, and ≥1,000 site visitors/30d to be worth it. |
| 3 | Microsoft Ads | Month 2: import the DE campaign | Same keywords, cheaper clicks, small desktop share in DE/AT. You can bid up by LinkedIn profile (industry: medical practice). Costs one import plus negatives. |
| 4 | YouTube | Not before Google retargeting audiences exist | Cold in-stream video for SMB owners burns budget. The demo videos could later work as remarketing creatives. |
| 5 | TikTok | **No** | Buyer mismatch (TikTok is the clinics' patient channel, not where owners buy software). Health ad restrictions. Weak B2B targeting. |
| 6 | LinkedIn | **No** | Few dentists keep active profiles, especially in TR. LinkedIn's $10/day minimum and typical $5–12 CPCs (est.) are above our whole break-even. |

**What NOT to do yet:** Performance Max, Display, Demand Gen, Search Partners, broad match, auto-applied recommendations, AI-generated "automatically created assets", Meta Advantage+ cold campaigns, any US/UK/AU campaign, agency/"lead-gen" offers, discount codes or "limited time" framing (there is no founding offer any more, per `docs/POSITIONING.md`), and remarketing to anyone who read a patient-facing guide.

---

## 2. Unit economics

**Assumptions (stated, conservative):**

| Item | Value | Basis |
|---|---|---|
| Plan mix | 80% Starter $29 / 20% Practice $49 | assumption; Group excluded |
| Blended ARPU | **$33.0/mo** | 0.8×29 + 0.2×49 |
| Payment fees (Dodo MoR) | ~$1.7/mo (est. ~4% + $0.40) | verify in Dodo dashboard |
| COGS (LLM + TTS + render) | $1.2–5.2/mo, use **$2** | `docs/SECURITY.md` spend-guard budget per clinic |
| Gross profit / month | **≈ $29 (≈ 88%)** | |
| Monthly churn | base 8%, pessimistic 12%, optimistic 5% | SMB, monthly, cancel anytime |
| Lifetime | 12.5 / 8.3 / 20 months | 1 ÷ churn |
| **GP-LTV** | **$365 base / $243 pessimistic / $590 optimistic** | |

**Target CAC:** LTV:CAC ≥ 3 on the *pessimistic* LTV gives $81. A ≤3-month payback gives $87. → **Target CAC ≤ $80 per paid clinic; hard ceiling $150** (only once real month-2 churn is <8%).

**Break-even CPC = target CAC × click→paid rate.** Assumed rates: click→signup 3–10% (B2B SaaS self-serve benchmarks), signup→paid 8–25% (unknown, 0/5 so far).

| click→signup | signup→paid | click→paid | Break-even CPC @ $80 CAC | @ $150 CAC |
|---|---|---|---|---|
| 3% | 8% | 0.24% | **$0.19** | $0.36 |
| 5% | 15% | 0.75% | **$0.60** | $1.13 |
| 8% | 20% | 1.6% | **$1.28** | $2.40 |
| 10% | 25% | 2.5% | **$2.00** | $3.75 |

Implications:
- TR B2B clicks are estimated at $0.15–0.60, which is viable even at mediocre conversion.
- DE B2B clicks are estimated at $1–3, so DE only works if the funnel converts in the top two rows. Cap bids hard and lean on cheaper compliance queries.
- US "social media marketing for dentists" (~$77 est.) and "facebook ads for dentists" (~$45 est.) are impossible.

**Kill criteria (hard rules, no debate):**

| Level | Kill when |
|---|---|
| Keyword | Spend ≥ $15 (TR) / $40 (DE) with 0 signups, or any irrelevant search term (→ add as negative the same day) |
| Ad (RSA) | ≥ 500 impressions and CTR < half the ad group's best RSA → replace that angle |
| Ad group | ≥ 300 impressions and CTR < 1.5% (exact/phrase B2B should be 4%+), or ≥ $50 spend and 0 signups |
| Market (campaign) | Spend ≥ $160 (2× target CAC) with 0 paid **and** click→signup < 3% → pause. Spend ≥ $240 with 0 paid regardless → pause. |
| Whole program | $400 spent with 0 paid → stop all ads. If paid-traffic signups ≥ 10, the problem is signup→paid (fix onboarding, preview, plan step, checkout). If < 5, the problem is message or market. |
| Funnel sanity | ≥ 10 paid-traffic signups and 0 `checkout_opened` → pause ads and fix the plan step first |

---

## 3. Country / language priority for the first test

| Priority | Market | Why | Est. B2B CPC | Notes |
|---|---|---|---|---|
| **1** | **Türkiye (tr)** | ~22k private facilities (14,064 practices + 6,467 polyclinics + 1,744 shared practices, TDB figures via Evrensel 2024). The new advertising regulation (Resmî Gazete, 12 Nov 2025) creates a real fear of non-compliant posts. Instagram-heavy. Generic TR social-media agencies run ₺4k–35k/mo (Armut), so $29 is cheap next to them. Not EEA, so Google's EU consent rules on click uploads don't apply (KVKK still does). | $0.15–0.60 | Google adds a TR regulatory surcharge (7% from Jul 2024 per Google's surcharge page) on top of VAT. **Verify a TR card can pay in USD at Dodo checkout** (TRY "adaptive currency" is advertised). |
| **2** | **Germany + Austria (de)** | ~73.5k active dentists, ~30.5k single practices + ~1.5k MVZ. HWG/Berufsordnung Abmahnung fear (BGH I ZR 170/24, 2025, against before/after content). High case values, so $29–49 is trivial. Site has DE content depth (11 guides, HWG checker). | $1.00–3.00 (agency terms higher) | EEA: consent prompt required for click-ID measurement. Add CH in month 2 (CPC higher). |
| 3 (month 2) | Spain (es) | Many private clinics, but agencies are cheap so price sensitivity is higher. Content exists (/es, ES guides, /videos/videos-dentales-con-ia). | $0.40–1.50 | Keywords and RSAs are pre-built below. Launch only if TR or DE produces ≥1 paid. |
| 4 | Poland (pl) | Very cheap clicks (all-industry avg ~€0.17, codedesign), but tiny B2B search volume and lower willingness to pay. | <$0.40 | Test month 2–3 with $3/day if ES works. |
| hold | France, Japan, Gulf (ar) | FR: strict professional code, mid CPC, no proof yet. JA/Gulf: trust and local sales motion needed. | — | Organic and outreach only. |
| no | US, UK, AU | Our break-even CPC is below $2. US B2B dental-marketing CPCs are $19–77 (est.). Many incumbents at $99–199 (e.g. MySocialPractice). | $19–77 | Organic and SEO only. |

---

## 4. Google Search campaign structure

### 4.1 Account settings (both campaigns)
- **Account currency USD** (revenue is USD; this is permanent). Time zone Europe/Istanbul for TR reporting, or UTC if one account. One account, two campaigns.
- Campaign type **Search only**. **Search Partners OFF, Display OFF.** Auto-apply recommendations OFF. Automatically created assets OFF. Broad match OFF. **Auto-tagging ON.**
- **Location: Presence only** ("People in or regularly in"), *not* "presence or interest".
  - `tr-search-core`: Türkiye. Languages: Turkish + English.
  - `de-search-core`: Germany + Austria. Languages: German + English.
- **Ad schedule** (account-local time per campaign): all days 07:00–23:00. Owners search after hours and at lunch. Do not trim hours until there are ≥ 300 clicks.
- **Devices:** all, no adjustments until ≥ 150 clicks per device. Then if mobile click→signup < 50% of desktop, apply −40% on mobile (logo upload on mobile is a known friction point).
- **Assets:** sitelinks (Nasıl çalışır → `/tr#how`, Fiyatlar → `/tr#pricing`, Örnek videolar → `/tr#samples`, Reklam kontrolü → `/tr/ad-checker`; DE equivalents `/de#how`, `/de#pricing`, `/de#samples`, `/de/ad-checker`). Callouts ("Aylık plan", "Taahhüt yok", "Ödemeden önce önizleme" / "Monatlich kündbar", "Vorschau vor dem Kauf", "Mit Ihrem Logo"). Structured snippet "Hizmetler/Leistungen": Videos, Untertitel, Vertonung, Beitragstext. **No price assets with invented discounts.**
- **Final URL suffix:** `utm_source=google&utm_medium=cpc&utm_campaign={_camp}&utm_content={adgroupid}-{creative}`, with custom parameter `{_camp}` = `tr-search-core` / `de-search-core`. These values satisfy the site's slug regex `^[a-z0-9][a-z0-9._-]{0,39}$`. Do **not** pass `{keyword}` as utm_term: spaces and Turkish/German characters fail that regex and are dropped. Use Google's search-term report for keywords.

### 4.2 Campaigns, ad groups, bids, budgets (month 1)

| Campaign | Budget/day | Ad group | Max CPC cap (est.; adjust to Keyword Planner low-range top-of-page bid if lower) | Final URL (month 1) |
|---|---|---|---|---|
| tr-search-core | **$7** | TR-0 Brand | $0.20 | /tr |
| | | TR-1 Sosyal medya | $0.50 | /tr |
| | | TR-2 Video | $0.50 | /tr |
| | | TR-3 Reklam kuralları | $0.30 | /tr/ad-checker *(only after code fix 1; until then /tr)* |
| | | TR-4 Ajans alternatifi | $0.60 | /videos/dentvideo-ajans-canva-chatgpt *(after code fix 1; until then /tr#compare)* |
| de-search-core | **$7** | DE-0 Brand | $0.50 | /de |
| | | DE-1 Social Media | $1.60 | /de |
| | | DE-2 Videos | $1.60 | /de |
| | | DE-3 Werberecht | $1.00 | /de/ad-checker *(after fix 1; until then /de)* |
| | | DE-4 Agentur-Alternative | $2.00 (pause if first-page bid > $3) | /videos/dentvideo-agentur-canva-chatgpt *(after fix 1; until then /de#compare)* |

**Bidding progression**
1. **Weeks 1–4: Manual CPC** with the caps above. Raise a cap by at most +20% once, and only when the ad group has CTR ≥ 4% and search lost IS (rank) > 50%.
2. **When a campaign has ≥ 15 uploaded conversions in 30 days** (signups + paid): switch to **Maximize conversion value** (no target). Values: signup = $5, paid = $100, so the algorithm chases paid clinics.
3. **When it has ≥ 30 conversions/30d including ≥ 5 paid:** add a **tROAS**, set at 80% of the last 30 days' actual ROAS. Never switch strategy and budget in the same week.
- At this budget, step 2 probably won't happen in month 1. That is expected. **Don't let Google talk you into Max Conversions without data.**

**Expected volume (est.):** TR 4–18 clicks/day (volume-limited, not budget-limited); DE 4–6 clicks/day (budget-limited). That is 28 days ≈ 180–640 clicks.

### 4.3 Keywords (`[exact]`, `"phrase"`; no broad match)

**TR — 47 keywords**
```
TR-0 Brand: [dentvideo] [dent video]
TR-1 Sosyal medya:
 "diş kliniği sosyal medya"   [diş kliniği sosyal medya yönetimi]   "diş hekimi sosyal medya"
 [diş hekimi instagram]        "diş kliniği instagram"               "diş hekimi instagram paylaşımları"
 "diş kliniği instagram paylaşım"  "diş hekimi reels"                "diş kliniği reels"
 "diş hekimi tiktok"           "diş kliniği içerik"                  "diş hekimi içerik üretimi"
 "diş kliniği sosyal medya içerik" [diş hekimi sosyal medya paylaşım fikirleri]
 "diş kliniği paylaşım fikirleri"  [diş kliniği sosyal medya takvimi]
TR-2 Video:
 "diş kliniği video"   "diş hekimi video"   "diş hekimi tanıtım videosu"   "hasta bilgilendirme videoları"
 "hasta bilgilendirme videosu"   "diş hekimi video çekimi"   "diş kliniği video çekimi"
 "implant bilgilendirme videosu"   "diş polikliniği sosyal medya"   "diş hekimi yapay zeka video"
 "diş kliniği yapay zeka"   [diş hekimleri için video]
TR-3 Reklam kuralları:
 "diş hekimi reklam yasağı"   "diş hekimi reklam yasağı sosyal medya"   "sağlıkta tanıtım yönetmeliği"
 "tanıtım ve bilgilendirme yönetmeliği"   "diş hekimi instagram yasak"   "diş hekimi sosyal medya yasak"
 "diş hekimi ne paylaşabilir"   "hekim sosyal medya paylaşımı"   "diş hekimi öncesi sonrası paylaşım"
TR-4 Ajans alternatifi:
 "diş kliniği sosyal medya ajansı"   "diş hekimi sosyal medya ajansı"   "diş hekimleri için sosyal medya ajansı"
 "sağlık sosyal medya ajansı"   "diş kliniği dijital pazarlama"   "diş hekimi pazarlama"
 "diş kliniği sosyal medya yönetimi fiyat"   "sosyal medya yönetimi diş"
```

**DE/AT — 42 keywords**
```
DE-0 Brand: [dentvideo] [dent video]
DE-1 Social Media:
 "social media zahnarztpraxis"  "social media zahnarzt"  "social media für zahnärzte"  "instagram zahnarztpraxis"
 "instagram zahnarzt"  "instagram für zahnärzte"  "zahnarzt reels"  "zahnarztpraxis tiktok"
 "content zahnarztpraxis"  "redaktionsplan zahnarztpraxis"  "social media ideen zahnarzt"
 "posts zahnarztpraxis"  "social media beiträge zahnarzt"  [zahnarzt social media marketing]
DE-2 Videos:
 "videos zahnarztpraxis"  "video zahnarztpraxis"  "zahnarzt video erstellen"  "patientenaufklärung video"
 "aufklärungsvideos zahnarzt"  "patientenvideos zahnarzt"  "praxisvideo zahnarzt"  "zahnarzt ki video"
 "ki videos zahnarztpraxis"
DE-3 Werberecht:
 "hwg zahnarzt"  "heilmittelwerbegesetz zahnarzt"  "heilmittelwerbegesetz social media"  "zahnarzt werbung erlaubt"
 "zahnarzt werbung instagram"  "vorher nachher bilder zahnarzt"  "werberecht zahnarzt"
 "berufsordnung zahnarzt werbung"  "abmahnung zahnarzt instagram"
DE-4 Agentur-Alternative:
 "social media agentur zahnarzt"  "social media agentur zahnarztpraxis"  "marketing agentur zahnarzt"
 "praxismarketing zahnarzt"  [zahnarztmarketing]  [zahnarzt marketing]  "social media betreuung zahnarzt"
 "social media management zahnarzt"
```

**ES (pre-built for month 2) — 30 keywords** → `/es` (ES-1), `/es/ad-checker` (ES-2), `/videos/dentvideo-agencia-canva-chatgpt` (agency terms, after fix 1)
```
ES-1: "redes sociales clínica dental" "redes sociales para dentistas" "instagram para dentistas" "instagram clínica dental"
 "contenido para clínicas dentales" "ideas instagram clínica dental" "calendario de contenidos clínica dental"
 "videos para clínicas dentales" "vídeos para clínicas dentales" "videos para dentistas" "videos educativos dentales"
 "vídeos clínica dental" "reels para dentistas" "tiktok dentistas" "vídeos con ia para dentistas"
 "agencia marketing dental" "agencia redes sociales clínica dental" "marketing para clínicas dentales"
 "marketing para dentistas" "community manager clínica dental" "gestión redes sociales clínica dental"
 [dentvideo]
ES-2: "publicidad sanitaria dentistas" "publicidad clínica dental normativa" "publicidad dental ley"
 "real decreto 1907 1996" "publicidad sanitaria redes sociales" "antes y después clínica dental publicidad"
 "puede un dentista hacer publicidad" "código deontológico dentistas publicidad"
```

### 4.4 Negative keywords (shared lists; apply at account level unless noted)

**NEG-ALL (phrase):** job, jobs, career, salary, internship, course, courses, certification, udemy, student, students, thesis, university, school, free download, template, templates, psd, png, logo, near me, emergency, appointment, reviews, wikipedia, pdf, apk, crack, mod, prompt, seo, google ads, website, web design, veterinary, dental lab, dental technician

**NEG-TR (phrase):** iş ilanı, iş ilanları, eleman, eleman arıyor, kariyer, maaş, maaşları, staj, stajyer, asistan, asistan alımı, kurs, kursu, eğitim, eğitimi, sertifika, sertifikalı, seminer, öğrenci, öğrencisi, fakülte, fakültesi, tus, dus, kpss, atama, ödev, tez, sunum, slayt, ücretsiz, bedava, şablon, şablonları, psd, png, indir, logo, yakınımda, en yakın, nöbetçi, acil, randevu, mhrs, sgk, devlet, hastanesi, ağız ve diş sağlığı merkezi, implant fiyatları, implant fiyat, diş fiyatları, tedavi fiyatları, muayene ücreti, diş hekimi ücretleri, tdb asgari ücret, diş çekimi, dolgu, kanal tedavisi fiyat, ağrı, ağrısı, apse, şişlik, yorumlar, şikayet, şikayetvar, komik, şarkı, dizi, veteriner, diş teknisyeni, laboratuvar, google reklam, google ads, reklam ver, web sitesi, web tasarım, seo, prompt
*(Exception: do **not** add "ücretsiz" as a negative to TR-3. "ücretsiz reklam kontrolü" is a legitimate query for the free checker. Add it as an ad-group negative to TR-0/1/2/4 instead.)*

**NEG-DE (phrase):** job, jobs, stellenangebot, stellenangebote, stelle, gehalt, ausbildung, zfa, zmp, zmv, praktikum, minijob, karriere, kurs, seminar, fortbildung, weiterbildung, zertifikat, webinar, student, studium, examen, hausarbeit, bachelorarbeit, masterarbeit, doktorarbeit, vorlage, vorlagen, download, png, logo, in der nähe, notdienst, notfall, termin, öffnungszeiten, bewertungen, schmerzen, kosten implantat, implantat kosten, zahnreinigung, krankenkasse, zahnzusatzversicherung, wartezimmer tv, zahntechniker, dentallabor, tierarzt, website, homepage, seo, google ads, anwalt, rechtsanwalt, kanzlei, urteil, wikipedia, pdf
*(Ad-group negatives: "kostenlos", "gratis" on DE-0/1/2/4 only, not DE-3, where "kostenloser HWG check" is valid.)*

**Search-term pruning cadence:** daily for the first 7 days (5 min), then Mon/Wed/Fri. Rule: any term that is a patient, job seeker, student, lawyer or ad-management buyer → add as a phrase negative at account level that day. Any converting term not yet a keyword → add as exact.

### 4.5 Responsive Search Ads (3 per ad group)

**How they are assembled (same pattern in every ad group):**
- **RSA-A (time angle)** = the ad group's 4 headlines + angle-A 6 headlines; descriptions = ad-group description + 2 angle-A descriptions.
- **RSA-B (compliance angle)** = 4 ad-group headlines + angle-B 6; descriptions = ad-group description + 2 angle-B.
- **RSA-C (preview/price angle)** = 4 ad-group headlines + angle-C 6; descriptions = ad-group description + 2 angle-C.
- **Pinning:** pin ad-group headlines #1 and #2 to position 1, so they rotate there. Nothing else is pinned. Brand ad groups use RSA-C with "DentVideo" as a headline in place of the 4th ad-group headline.
- **Character counts** are in brackets and were validated by script: headlines ≤ 30, descriptions ≤ 90.
- **Compliance by design:** no guarantee of patients or results, no "rechtssicher"/"yasal güvence" (legal certainty), no invented numbers, ratings or testimonials, no urgency or discount. Every claim is on the live page: 5 videos every Monday, $29/$49 monthly, cancel anytime, preview before paying, checked for advertising rules and clinical accuracy, free ad checker, nothing published without approval.

#### TR — angle pools (used by every ad group in TR)

| Angle | Headlines (≤30) | Descriptions (≤90) |
|---|---|---|
| A · Zaman (time) | Her Pazartesi 5 Yeni Video (26)<br>Çekim ve Kurgu Gerekmez (23)<br>Siz Sadece Onaylayın (20)<br>Altyazılı ve Seslendirilmiş (27)<br>Logonuz ve Renklerinizle (24)<br>Haftada Birkaç Dakikanız (24) | Her pazartesi beş kısa hasta bilgilendirme videosu hazır. İzleyin, onaylayın, paylaşın. (87)<br>Metin, seslendirme, altyazı ve klinik renkleriniz hazır gelir; onay her zaman sizde. (84) |
| B · Kurallar (compliance) | Her Metin İki Kez Kontrol (25)<br>Tanıtım Kuralları Kontrolü (26)<br>Klinik Doğruluk Kontrolü (24)<br>Riskli İfadeler İşaretlenir (27)<br>Onayınız Olmadan Yayın Yok (26)<br>2025 Yönetmeliği Gözetilir (26) | Her metin, siz görmeden önce tanıtım kuralları ve klinik doğruluk için kontrol edilir. (86)<br>"Garantili", "ağrısız", fiyat, öncesi-sonrası gibi ifadeler gerekçesiyle işaretlenir. (85) |
| C · Önizleme/Fiyat (preview/price) | Ödemeden Önce Önizleyin (23)<br>Aylık $29'dan Başlayan Fiyat (28)<br>Taahhüt Yok, İstediğinde İptal (30)<br>Hesapsız Canlı Önizleme (23)<br>Logonuzla Hemen Deneyin (23)<br>Türkçe Seslendirme (18) | Klinik adınızı ve logonuzu ekleyin, videolarınızın nasıl görüneceğini ödemeden önce görün. (90)<br>Aylık plan, taahhüt yok, istediğiniz zaman iptal. Starter aylık $29, Practice aylık $49. (88) |

#### TR — ad-group headlines (keyword match; pin H1 = one of the first two)

| Ad group | Headlines | Ad-group description |
|---|---|---|
| TR-1 Sosyal medya | Diş Kliniği Sosyal Medyası (26)<br>Diş Hekimi Instagram İçeriği (28)<br>Kliniğinize Haftalık Reels (26)<br>Diş Kliniği İçin Paylaşımlar (28) | Diş kliniğiniz için Instagram ve TikTok'a hazır kısa videolar, paylaşım metniyle birlikte. (90) |
| TR-2 Video | Diş Kliniği Videoları (21)<br>Hasta Bilgilendirme Videosu (27)<br>Haftada 5 Hazır Video (21)<br>Kliniğinize Özel Videolar (25) | Yalnızca sunduğunuz tedavilerle ilgili, hastaların sık sorduğu sorulara kısa videolar. (86) |
| TR-3 Reklam kuralları | Bu Paylaşım Yasak mı? (21)<br>Ücretsiz Reklam Kontrolü (24)<br>Tanıtım Kurallarına Bakın (25)<br>Paylaşmadan Önce Kontrol (24) | Paylaşım metninizi yapıştırın, riskli ifadeleri görün. Hukuki görüş değildir; karar sizde. (90) |
| TR-4 Ajans alternatifi | Ajansa Bir Alternatif (21)<br>Diş Kliniği Sosyal Medya (24)<br>Toplantısız İçerik Üretimi (26)<br>Ajans, Canva mı, DentVideo mu (29) | Ajans toplantısı yok, sözleşme yok. Her hafta hazır videolar, kontrol edilmiş metinlerle. (89) |

#### DE — angle pools (used by every ad group in DE)

| Angle | Headlines (≤30) | Descriptions (≤90) |
|---|---|---|
| A · Zeit (time) | Jeden Montag 5 neue Videos (26)<br>Ohne Dreh und ohne Schnitt (26)<br>Sie geben nur noch frei (23)<br>Vertont und untertitelt (23)<br>In Ihren Praxisfarben (21)<br>Wenige Minuten pro Woche (24) | Jeden Montag fünf kurze Aufklärungsvideos in Ihren Praxisfarben. Ansehen, freigeben. (84)<br>Skript, Stimme, Untertitel und Logo kommen fertig. Online geht nur, was Sie freigeben. (86) |
| B · Werberecht (compliance) | Auf Werberecht geprüft (22)<br>Fachlich gegengeprüft (21)<br>Riskante Aussagen markiert (26)<br>Nichts ohne Ihre Freigabe (25)<br>HWG und Berufsordnung im Blick (30)<br>Jedes Skript zweifach geprüft (29) | Jedes Skript wird vor Ihrer Freigabe auf Werberecht und fachliche Richtigkeit geprüft. (86)<br>Aussagen wie „schmerzfrei“, Preise oder Vorher-Nachher werden markiert, mit Begründung. (87) |
| C · Vorschau/Preis (preview/price) | Vorschau vor dem Kauf (21)<br>Ab 29 $ im Monat (16)<br>Monatlich kündbar (17)<br>Ohne Konto ausprobieren (23)<br>Mit Ihrem Logo testen (21)<br>Vertont auf Deutsch (19) | Praxisname und Logo eingeben und sehen, wie Ihre Videos aussehen – bevor Sie bezahlen. (86)<br>Monatlich, ohne Vertragsbindung, jederzeit kündbar. Starter 29 $, Practice 49 $ pro Monat. (90) |

#### DE — ad-group headlines (keyword match; pin H1 = one of the first two)

| Ad group | Headlines | Ad-group description |
|---|---|---|
| DE-1 Social Media | Social Media für Zahnärzte (26)<br>Instagram für Ihre Praxis (25)<br>Reels für die Zahnarztpraxis (28)<br>Posts für Ihre Zahnarztpraxis (29) | Kurze Hochformat-Videos für Instagram und TikTok, mit fertigem Beitragstext und Hashtags. (89) |
| DE-2 Videos | Videos für Zahnarztpraxen (25)<br>Aufklärungsvideos für Praxen (28)<br>5 Praxisvideos jeden Montag (27)<br>Patientenvideos mit Ihrem Logo (30) | Nur zu Leistungen, die Sie anbieten, und zu Fragen, die Patienten tatsächlich googeln. (86) |
| DE-3 Werberecht | Ist mein Post erlaubt? (22)<br>Kostenloser Werbe-Check (23)<br>Posts vorab auf HWG prüfen (26)<br>Werberecht im Blick behalten (28) | Text einfügen, riskante Formulierungen sehen. Keine Rechtsberatung, Sie entscheiden. (84) |
| DE-4 Agentur-Alternative | Alternative zur Agentur (23)<br>Praxismarketing ohne Agentur (28)<br>Agentur, Canva oder DentVideo (29)<br>Ohne Briefings und Meetings (27) | Kein Retainer, keine Mindestlaufzeit. Fertige, geprüfte Videos jede Woche für Ihre Praxis. (90) |

#### ES — angle pools (used by every ad group in ES)

| Angle | Headlines (≤30) | Descriptions (≤90) |
|---|---|---|
| A · Tiempo (time) | 5 vídeos nuevos cada lunes (26)<br>Sin grabar ni editar (20)<br>Tú solo apruebas (16)<br>Con voz y subtítulos (20)<br>Con los colores de tu clínica (29)<br>Unos minutos a la semana (24) | Cada lunes, cinco vídeos educativos cortos con los colores de tu clínica. Tú apruebas. (86)<br>Guion, voz, subtítulos y logo llegan listos. Solo se publica lo que tú apruebas. (80) |
| B · Normas (compliance) | Guiones revisados dos veces (27)<br>Precisión clínica revisada (26)<br>Frases de riesgo marcadas (25)<br>Nada sin tu aprobación (22)<br>Normas de publicidad sanitaria (30)<br>Revisión antes de publicar (26) | Cada guion se revisa según las normas de publicidad sanitaria y su exactitud clínica. (85)<br>Se marcan frases como «sin dolor», precios o antes y después, con el motivo. (76) |
| C · Vista previa/Precio | Vista previa antes de pagar (27)<br>Desde 29 $/mes (14)<br>Sin permanencia (15)<br>Pruébalo con tu logo (20)<br>Sin crear cuenta (16)<br>Voz en español (14) | Escribe el nombre de tu clínica, añade tu logo y mira tus vídeos antes de pagar. (80)<br>Plan mensual sin permanencia, cancela cuando quieras. Starter 29 $/mes, Practice 49 $/mes. (90) |

#### ES — ad-group headlines (keyword match; pin H1 = one of the first two)

| Ad group | Headlines | Ad-group description |
|---|---|---|
| ES-1 Redes/vídeos | Vídeos para clínicas dentales (29)<br>Redes sociales para dentistas (29)<br>Instagram para tu clínica (25)<br>Contenido para tu clínica (25) | Vídeos verticales cortos para Instagram y TikTok, con texto y hashtags listos. (78) |
| ES-2 Publicidad sanitaria | ¿Puedo publicar esto? (21)<br>Comprobador gratuito (20)<br>Publicidad sanitaria dental (27)<br>Revisa antes de publicar (24) | Pega tu texto y ve las frases de riesgo. No es asesoría legal; la decisión es tuya. (83) |

---

## 5. Landing page mapping (existing URLs only) and small page changes

| Ad group | Month-1 final URL (works today) | After code fix 1 (attribution on all pages) | Message-match notes |
|---|---|---|---|
| TR-0/1/2 | `https://dentvideo.com/tr` | same | The H1 "Kliniğiniz için her pazartesi beş hasta bilgilendirme videosu" matches. The no-account preview (#try) and pricing (#pricing) are on the page. Best first step for paid traffic. |
| TR-3 | `/tr` | `https://dentvideo.com/tr/ad-checker` ("Bu paylaşım yasak mı?") | Exact match for compliance queries. The checker has its own CTA (`checker_cta_clicked`). |
| TR-4 | `/tr#compare` | `https://dentvideo.com/videos/dentvideo-ajans-canva-chatgpt` | Agency comparison page. |
| DE-0/1/2 | `https://dentvideo.com/de` | same | H1 "Fünf Aufklärungsvideos für Ihre Praxis, jeden Montag." |
| DE-3 | `/de` | `https://dentvideo.com/de/ad-checker` ("Ist mein Post erlaubt? Der kostenlose Werbe-Check…") | |
| DE-4 | `/de#compare` | `https://dentvideo.com/videos/dentvideo-agentur-canva-chatgpt` | |
| ES (m2) | `/es`, `/es/ad-checker`, `/videos/dentvideo-agencia-canva-chatgpt` | | |

**Small page changes (list only, not implemented):**
1. **(Blocking for non-home URLs)** Mount the `LandingView` attribution capture (or a lighter `captureAttribution` call) on `/videos/*`, `/[locale]/ad-checker` and `/guides/*`. Today only `landing.tsx` and `/start` capture, so a paid click on a solution or checker page loses its source at the `/start?lang=xx` CTA.
2. `/videos/*` solution pages: add the price line and "monthly, cancel anytime" next to the hero CTA. Verified: neither the TR nor the DE solution page contains "29". Also add a secondary "preview without an account" link to `/<locale>#try`, because the solution-page CTA goes straight to account creation.
3. Language-count consistency: the EN landing comparison table says "Ten, written natively" and the language strip lists 10 codes (incl. IT/PT), but there are 8 locale sites. Ads avoid a language count, but fix the page so there's no mismatch claim.
4. TR checkout: confirm whether Dodo shows TRY to TR cards. If checkout stays in USD, add one line on the plan step: "Ödeme USD; kartınızın yurt dışı/internet alışverişine açık olması gerekir". This only applies if a test shows TR cards failing.
5. Privacy/cookie page (all 8 locales) + consent prompt: see §6. **Required before launch.**
6. *(Nice-to-have, SEO not ads)* No `hreflang` alternates were found on the locale homepages.

---

## 6. Tracking plan

### 6.1 Conversions to send to Google Ads (create these **before** launch; clicks that happen before a conversion action exists cannot be credited)

| Conversion action | Source | Type in Google Ads | Primary? | Value | Count | Window |
|---|---|---|---|---|---|---|
| **DV – Paid subscription** | Dodo webhook → first `subscription.active` (our `payment_succeeded` with `first=true`) | Offline import ("conversions from clicks", gclid/gbraid/wbraid) | **Primary** | $100 fixed (≈ 3 months GP; keeps bidding pointed at paid) | One | 90 days click |
| **DV – Signup completed** | Server, at `signup_completed` | Offline import, same | Primary (needed for volume when bidding is automated) | $5 | One | 30 days click |
| DV – Preview started | `preview_started` | Offline import | Secondary (observe only) | 0 | One | 30 days |
| DV – Checkout opened | `checkout_opened` | Offline import | Secondary | 0 | One | 30 days |

- **Why server-side/offline, not a gtag:** the site deliberately has no third-party tags, and its privacy policy says so. Click-ID import needs no Google script on the page: we read `gclid` from the landing URL and upload conversions from our server.
- **Month-1 upload method:** a weekly **CSV upload** (Google Ads → Goals → Conversions → Uploads) generated by an admin export. Volume will be under 50 rows. **Month 2:** automate via the Google Ads API `UploadClickConversions`. Google is steering offline imports toward its Data Manager API, so check which API Google recommends at build time. The API needs a developer token the owner applies for.
- **Enhanced conversions for leads** (hashed email) as a fallback for lost gclids: month 2 at the earliest, consented users only, and only after the privacy text covers it.

### 6.2 Consent / GDPR / KVKK
- **EEA, UK and CH (DE campaign):** under Google's EU user consent policy, measurement uploads need `ad_user_data` consent. Missing consent counts as **denied**, and community reports say unconsented EEA click conversions are excluded. Storing a click ID in browser storage also falls under ePrivacy/TTDSG §25 storage consent.
  → **Minimal approach:** show a small two-button prompt ("Allow ad measurement" / "Decline", equal weight, default denied) **only when the landing URL carries `gclid`/`gbraid`/`wbraid`/`fbclid`** (or `utm_medium=cpc|paid-social`). Organic visitors keep today's banner-free site. If declined, don't store the click ID; the visit still counts via UTM in our own first-party admin. Upload rows with `Ad User Data = GRANTED` only for consenting users.
- **TR:** KVKK applies (notice + legal basis; transfer abroad to Google). Use the same prompt for simplicity and confirm the wording with counsel. Google's EEA consent requirement doesn't apply, so expect better match rates in TR.
- **Privacy policy (8 locales) must be updated before launch.** Today it says no advertising cookies and no use of data for advertising. Add: Google Ads (later Meta) as recipients, the click ID, the purpose (measuring ad performance), the legal basis (consent), retention (delete click IDs after 90 days), and withdrawal of consent.

### 6.3 UTM conventions (fit the site's slug rule `^[a-z0-9][a-z0-9._-]{0,39}$`)

| Channel | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| Google Search | google | cpc | `tr-search-core`, `de-search-core`, `es-search-core` | `{adgroupid}-{creative}` |
| Microsoft (m2) | bing | cpc | same names | `{AdGroupId}-{AdId}` |
| Meta (m2+) | meta | paid-social | `tr-rtg-01`, `tr-cold-01` | `{{ad.id}}` |
| Outreach/DM (existing) | instagram / demo | dm | `<locale>-launch` | token |

Never put keyword text in UTMs (non-ASCII and spaces are dropped by the sanitiser).

### 6.4 Code changes needed (listed only; not implemented)
1. `web/src/lib/dentvid/attribution.ts`: capture `gclid`, `gbraid`, `wbraid` (and `fbclid` for later) with a new rule (`[A-Za-z0-9_-]{10,200}`; the current 40-char slug limit would drop them), plus a capture timestamp. Keep first-touch semantics.
2. Mount the capture on all marketing pages (`solution-page.tsx`, `checker-page.tsx`, guide pages), as in §5 change 1.
3. Persist server-side at `signup_completed`/`clinic_saved`: a new table, e.g. `dentvid_ad_clicks(clinic_id, click_id, click_id_type, consent_ad_user_data, landing_path, captured_at)`, with **90-day retention**. Keep click IDs out of the generic events table (`events.ts` allowlist stays as is).
4. Dodo webhook (`web/src/app/api/dodo/webhook/route.ts`): on the first activation, enqueue `{clinic_id, conversion:'paid', value:100, currency:'USD', occurred_at}` into e.g. `dentvid_ad_conversions`. Enqueue signup, preview and checkout from the existing server event route. Make it idempotent on the subscription id; replays must not double count.
5. Admin: an export in Google's offline template (`Parameters:TimeZone=+0000`; `Google Click ID`, `Conversion Name`, `Conversion Time`, `Conversion Value`, `Conversion Currency`, `Ad User Data`) with an "uploaded" mark. Month 2: replace it with an API uploader in the worker.
6. Consent prompt component (paid-click-only), consent stored first-party, plus the privacy, cookie and DPA text in 8 locales.
7. Admin funnel: add a "paid search" filter (utm_medium=cpc) with landing→preview→signup→checkout→paid per campaign. The source attribution exists today; this only adds a view.
8. *(Month 2, only if Meta goes ahead)* Meta Conversions API from the server with **neutral custom event names** (e.g. `dv_start`, `dv_sub`) and the same consent gate. No pixel PageView firing on health-guide pages.

---

## 7. Four-week test plan

| Week | Spend | Actions | Decision rules |
|---|---|---|---|
| **0 (before spend, 3–5 days)** | $0 | Owner creates the accounts (see §8). We ship code changes 1–6 and the privacy update. Run Keyword Planner for all TR/DE keywords and lower caps to Planner's low-range top-of-page bid where it's below ours; drop keywords with "–" volume. Test end-to-end with `?gclid=TEST…`: click ID stored → test signup → row in CSV export. Owner checks a TR card can pay via Dodo. | Don't launch until a test row appears in the export **and** the privacy text is live. |
| **1** | ~$98 | Launch TR + DE (manual CPC, caps). Daily search-term pruning. | Don't change bids. Only fix disapprovals and add negatives. If an ad group has 0 impressions after 3 days, the keywords have no volume: add 5 close exact variants from Planner. |
| **2** | ~$98 | First CSV upload Monday. Day-10 review: apply the keyword/ad/ad-group kill rules (§2). Pause RSAs that are clearly losing. | If CTR ≥ 4% and lost IS (rank) > 50%, raise that ad group's cap +20% once. Pause market rule: ≥ $160 spent, 0 paid, click→signup < 3%. |
| **3** | ~$100–130 | Reallocate: move the losing market's remaining budget to the winner, max $12/day. **Meta gate:** start a TR Meta test ($5/day × 10 days, 2 creatives cut from the demo videos, IG Feed + Reels, TR, interest "Dentistry"/"Dental surgery", landing `/tr`, optimise for landing-page views) **only if** TR Google has ≥ 1 paid **and** click→signup ≥ 5%. **Retargeting** only once ≥ 1,000 consented visitors/30 days. That's unlikely in month 1, so normally skip. | Meta kill: $50 spent and landing→preview_started rate < 50% of Google TR's, or 0 signups. |
| **4** | ~$100 | Upload conversions. Full funnel review per market. Write month-2 budget. | **Scale:** ≥ 3 paid at CAC ≤ $80 → +30% budget per week (never more), launch ES at $5/day, import DE to Microsoft Ads, and move to Max conversion value once there are ≥ 15 conversions per 30 days. **Hold:** 1–2 paid and CAC ≤ $150 → same budget for 4 more weeks. **Stop:** $400 spent and 0 paid → stop ads. If ≥ 10 signups, fix signup→paid (plan step, onboarding emails, preview quality); if fewer, re-test the message on organic and outreach before paying again. |

Cadence summary: search terms daily in week 1, then 3×/week. Bids and RSAs weekly. Budgets every 2 weeks. Strategy only on data thresholds.

---

## 8. Owner tasks vs our tasks

| Owner must do (identity, money, legal) | We can do (no accounts, no spend) |
|---|---|
| Create the Google Ads account (Expert mode; skip the Smart campaign wizard). Choose USD. Add billing. Complete **advertiser verification** (BLS AI Automation DOO documents); ads may be limited until it's done. | Build all campaigns, ad groups, keywords, negatives and RSAs as a Google Ads Editor CSV import (from §4) |
| Turn auto-tagging on; create the 4 conversion actions (§6.1), or give us access to do it | Code changes 1–8 (§6.4) and the page changes (§5) |
| Approve the privacy, cookie and DPA text; get a counsel check for KVKK + TTDSG wording | Draft the privacy and consent texts in 8 locales |
| Apply for a Google Ads API developer token (month 2 automation) | Build the CSV export and later the API uploader |
| Test a real TR card at Dodo checkout (and a DE SEPA/card) | Weekly report: spend, clicks, CTR, CPC, signups, paid, CAC per market, with search-term actions |
| (Month 2+) Create Meta Business Manager + ad account, verify the domain, check **Events Manager → data source categories** for a health & wellness restriction | Meta campaign spec and creative cuts from the existing demo videos |
| Set a card or billing threshold so total spend cannot pass $450 in month 1 | Kill or scale calls against the rules in §2 and §7 |
| Talk to the 5 existing signups about why they didn't pay (cheapest funnel research available) | — |

---

## 9. Policy notes (verify before launch)
- **Google:** this is B2B software advertised to clinics. It isn't in the restricted healthcare categories, which centre on prescription drugs, pharmacies, telemedicine, addiction services, pharma manufacturers and similar (Google Healthcare & medicines policy). I could not open the policy page itself from this environment (support.google.com was blocked), so re-read it during account setup. Keep ads free of patient-facing health claims, before/after language and "guaranteed" wording. Expect advertiser verification. TR ad spend has a regulatory surcharge (7% from Jul 2024; Türkiye's underlying DST falls to 5% in 2026 and 2.5% in 2027 — check the invoice).
- **Meta:** DentVideo isn't a Special Ad Category (housing, employment, credit/financial, social issues/politics). The real risks are (a) the 2025 health & wellness data-source restrictions on lower-funnel events and (b) the personal-attributes policy, so write "For dental clinics", never "Are you a dentist…?". Never use before/after imagery.
- **Local rules apply to us too:** our ads must not claim legal certainty. "Auf Werberecht geprüft" / "Tanıtım kuralları kontrolü" mirror what the site says, and the site's disclaimer ("We are not a law firm…") stays on the landing pages.

---

## 10. Sources
- CPC benchmarks, dental (patient-side): [Netpeak – average dental CPC $7.85 US 2025 (LocalIQ)](https://netpeak.us/blog/the-average-cpc-for-dental-ads-on-google-in-2025-defined/); [WebTonic 2026 dental Google Ads stats](https://www.webtonic.io/blog/dental-google-ads-statistics); [dentalmarketing.com agency CPC data](https://www.dentalmarketing.com/post/expert-insights-on-dental-cpcs-and-campaign-optimization)
- B2B dental-marketing keywords (US, est.; "social media marketing for dentists" ~$77, "facebook ads for dentists" ~$45, "google ads for dentists" ~$19): [Media Search Group – top dental keywords with CPC](https://www.mediasearchgroup.com/industries/top-50-most-searched-seo-keywords-for-dentists.php); [dentalbase.ai keyword list](https://www.dentalbase.ai/blogs/top-10-dental-keywords-you-should-be-ranking-for)
- DE patient-side CPC ranges €2–15 (est.): [Rework – Google Ads für Zahnärzte](https://resources.rework.com/de/libraries/dental-clinic-growth/google-ads-for-dentists)
- Country CPC levels (all-industry, est.): [codedesign – Google Ads cost Europe](https://codedesign.org/google-ads-cost-europe-your-complete-guide/); [clickpatrol – PPC costs Europe](https://clickpatrol.com/ppc-costs-in-europe-2025-how-to-budget-optimize/); [WordStream – CPC by country](https://www.wordstream.com/blog/ws/2015/07/06/average-cost-per-click)
- SaaS conversion benchmarks: [SaaS Hero – B2B SaaS paid metrics](https://www.saashero.net/google-ppc/b2b-saas-paid-campaign-metrics/); [Toolradar – CPL benchmarks](https://toolradar.com/blog/cost-per-lead-benchmarks-b2b-saas); [SaaS Hero – landing page CVR](https://www.saashero.net/content/landing-page-conversion-rate-benchmarks/)
- Competitors/pricing: [MySocialPractice pricing ($99–199/mo)](https://mysocialpractice.com/pricing-packages/); [Boomp ($99/mo done-for-you)](https://boomp.net/blog/cheapest-social-media-scheduler-dentists); [SocialSellinator dental SMM pricing](https://socialsellinator.com/social-selling-blog/dental-social-media-management-pricing); [Armut – TR social media agency prices](https://armut.com/fiyatlari/sosyal-medya-ajansi_1143)
- Market size: [Evrensel 2024 – TDB facility counts](https://www.evrensel.net/haber/534843/dis-hekimligi-gununde-7-hekim-iyi-hal-belgesine-basvurdu); [CED Türkiye profile 2026](https://www.cedentists.eu/wp-content/uploads/2026/02/Turkiye-2026-03.02.2026.pdf); [zm-online – DE practice structure](https://www.zm-online.de/news/detail/schlechte-stimmung-an-der-basis); [ZWP – KZBV Jahrbuch](https://www.zwp-online.info/zwpnews/dental-news/branchenmeldungen/aktuelles-jahrbuch-der-kassenzahnarztlichen-bundesvereinigung-veroffentlicht-1)
- Google policy/consent: [Healthcare & medicines policy](https://support.google.com/adspolicy/answer/176031?hl=en); [EEA consent mode updates](https://support.google.com/google-ads/answer/13695607); [Set up and manage consent](https://support.google.com/google-ads/answer/14009343); [Ads API forum – EEA click conversion consent](https://groups.google.com/g/adwords-api/c/mzNrs1rg6yI); [Jurisdiction-specific surcharges](https://support.google.com/google-ads/answer/9750227?hl=en-GB); [EY – Türkiye DST 2026–27](https://taxnews.ey.com/news/2026-0117-turkiye-revises-digital-service-tax-rate-for-2026-and-2027)
- Meta health & wellness restrictions (third-party summaries; verify in Events Manager): [Search Engine Land](https://searchengineland.com/meta-ads-restrictions-health-wellness-campaigns-453094); [Freshpaint](https://freshpaint.io/blog/meta-data-restrictions); [Triple Whale](https://www.triplewhale.com/blog/meta-health-and-wellness-brands)
- Dodo TR coverage: [Dodo – payments in Turkey](https://dodopayments.com/payments-in/turkey); [Dodo – TRY adaptive currency](https://dodopayments.com/currency/try)

---

## Güncelleme 2026-11-15

*Appended after the price change. Sections above are left as written; where they conflict, this section wins. Sources: `pricing-memo.md` §5, `ads-angles.md`, live dentvideo.com (fetched 2026-11-15), `docs/ADS_TRACKING.md`. The import-ready build is in `scratchpad/google-ads/`.*

### U1. Prices (live now)
- **Starter $79 / €79 / 2.490 TL** per month. **Practice $149 / €149 / 4.490 TL** per month. Monthly, cancel anytime, tax extra where applicable.
- No discounts, codes, yearly deals or free videos. The **free ad checker** (`/<locale>/ad-checker`) is a tool, not a free video, so "ücretsiz/kostenlos" appear only in the checker ad groups (TR-3, DE-3) and the checker sitelink.
- The site shows the currency by visitor geo: TR sees TL, DE/AT see €, others see $.
- Ads therefore quote **TL in TR** and **€ in DE/AT**, never $. Every "$29/$49" line in §4.5 and the §4.1 callouts is retired.

### U2. Unit economics (replaces §2 assumptions; 70/30 Starter/Practice mix)

| | US/RoW | Euro area | Türkiye |
|---|---|---|---|
| Blended ARPU | $100.0 | ≈ $115 (€100) | ≈ $63 (3.090 TL) |
| Gross profit / month | $92.9 | $100.9 | $54.2 |
| **Target CAC** | **$250** | **$280** | **$150** |
| Ceiling (only once month-2 churn < 8%) | $350 | $400 | $200 |

The old figures were ARPU $33, target CAC $80 and ceiling $150.

**Break-even CPC.** The second figure in each cell assumes conversion falls 30% at the higher price.

| click→signup × signup→paid | click→paid | US | DE/AT | TR |
|---|---|---|---|---|
| 3% × 8% | 0.24% | $0.60 / $0.42 | $0.67 / $0.47 | $0.36 / $0.25 |
| 5% × 15% | 0.75% | $1.88 / $1.31 | $2.10 / $1.47 | $1.13 / $0.79 |
| 8% × 20% | 1.6% | $4.00 / $2.80 | $4.48 / $3.14 | $2.40 / $1.68 |
| 10% × 25% | 2.5% | $6.25 / $4.38 | $7.00 / $4.90 | $3.75 / $2.63 |

### U3. Max CPC caps (replace §4.2)

| Ad group | Old cap | **New cap** |
|---|---|---|
| TR-0 Brand | $0.20 | **$0.20** |
| TR-1 Sosyal medya | $0.50 | **$0.70** |
| TR-2 Video | $0.50 | **$0.70** |
| TR-3 Reklam kuralları | $0.30 | **$0.40** |
| TR-4 Ajans alternatifi | $0.60 | **$0.80** |
| DE-0 Brand | $0.50 | **$0.50** |
| DE-1 Social Media | $1.60 | **$1.80** |
| DE-2 Videos | $1.60 | **$1.80** |
| DE-3 Werberecht | $1.00 | **$1.20** |
| DE-4 Agentur-Alternative | $2.00 | **$2.50**. Raise only with signups. |
| US-1/US-2 (gated) | — | **$1.50** |

Still lower any cap to Keyword Planner's low-range top-of-page bid where that is lower.

### U4. Budget decision: keep $450 for month 1, at $7 TR + $7 DE per day

- **Google's monthly ceiling.** Google never charges more than daily budget × 30.4 per campaign per calendar month. That gives $425.60, under the $450 cap.
- **A hard cap is still needed.** Use a $450 prepayment, an account budget, or a 28-day end date (see `google-ads/LAUNCH.md`).
- **Why not more, even though the target CAC tripled:**
  - The unknown is still signup→paid (0 of 5 so far), and the price rise makes it *more* uncertain, not less.
  - Higher CAC targets change the **week-4 scale decision**, not the size of a signal test.
  - TR is expected to be volume-limited ($0.15–0.60 CPC × 4–18 clicks/day), so a bigger TR budget would mostly go unspent.
- **Week 2 reallocation (unchanged in spirit).** If TR averages < $4/day by day 10 while DE is budget-limited (lost IS budget > 30%), move $2/day: TR $5, DE $9. The total stays $14/day.
- **`us-search-test`** is built but paused and labelled `GATED-do-not-enable`: $5/day, exact match only, max CPC $1.50.
  - Gate: TR or DE measured click→paid ≥ 1.5% **and** at least 10 US exact terms with a low-range top-of-page bid ≤ $1.50.
  - Kill: $75 spent with 0 paid.

### U5. Kill and scale rules (amend §2 and §7)

**Kept as absolute learning-budget stops** (pricing memo §5.2):
- keyword $15 TR / $40 DE with 0 signups;
- ad group ≥ $50 with 0 signups;
- market ≥ $160 with 0 paid and click→signup < 3%, or ≥ $240 with 0 paid regardless;
- whole program $400 with 0 paid.

$160 is now ~1× the TR target CAC and ~0.6× DE's. A DE stop at $160 means "no signal yet", not "uneconomic".

**Scale (week 4):**
- ≥ 3 paid at CAC ≤ **$150 TR / $280 DE**: +30% budget per week.
- **Hold:** 1–2 paid at CAC ≤ the market's ceiling ($200 TR / $400 DE).

### U6. Conversion values (replace §6.1 and ADS_TRACKING's 100 USD)

- `dv_signup` = **$5**.
- `dv_paid` = **$150 for TR clicks, $250 for EUR/US clicks**: one action, "different values per conversion", default $250.
- **Code gap:** `web/src/lib/dentvid/ad-conversions.ts` still writes `dv_paid` = 100 USD for every row. It must write the per-market value before the first upload.
- Bidding thresholds in §4.2 are unchanged: Max conversion value at ≥ 15 conversions per 30 days, tROAS later.

### U7. Copy and landing changes now in the build

**Landing pages.** Attribution is captured on every page now (ADS_TRACKING §1), so the §5 "after fix 1" URLs are live:
- TR-3 → `/tr/ad-checker`
- TR-4 → `/videos/dentvideo-ajans-canva-chatgpt`
- DE-3 → `/de/ad-checker`
- DE-4 → `/videos/dentvideo-agentur-canva-chatgpt`
- Sitelinks use `/tr/examples`, `/de/examples` and `/tr|de/guides`, with no `#` fragments.

**Copy:**
- RSAs use the ads-angles positioning: TR-A "Sponsorlu tanıtım kısıtlı → düzenli bilgilendirme", DE-A "Aufklärung statt Werbung", DE-C "keine Zeit", TR-B/DE-B agency alternative, TR-C/DE checker.
- Price lines changed: "Aylık 2.490 TL'den Başlar", "Ab 79 € im Monat", "Starter … Practice … vergiler hariç / zzgl. MwSt.".
- Dropped: every headline naming a law as checked ("2025 Yönetmeliği Gözetilir", "HWG und Berufsordnung im Blick", "Posts vorab auf HWG prüfen"), all "garanti/acısız" mentions, and "Hemen".
- Added keywords: the ads-angles §1.3/§2.3 lists. Left out until the md. 7/1-k warning ships: "kişiden kişiye değişiklik gösterebilir". "§ 35 zäg werbung" became "zäg werbung" because "§" is not a valid keyword character.
- Negatives: plan §4.4 lists become shared lists NEG-ALL/NEG-TR/NEG-DE. The ads-angles negatives are campaign-level. "ücretsiz/bedava" and "kostenlos/gratis" are ad-group negatives everywhere except TR-3/DE-3. "ücretsiz" was removed from shared NEG-TR to keep the checker group open.

---

## Güncelleme 2026-11-15 (2): launch decisions after the red team

*Appended after `ads-redteam.md`. Where this conflicts with anything above (U4 and U5 included), this section wins. The import files in `google-ads/` already carry these settings, and `google-ads/LAUNCH.md` is the owner's checklist.*

### U8. Production state this applies to (verified 2026-11-15, night)
- Prices are live: Starter $79 / €79 / 2.490 TL and Practice $149 / €149 / 4.490 TL. `/tr` shows TL and `/de` shows € to any visitor whose IP is not in a TL/EUR country, Google's reviewer included (red team B2 closed).
- The consent prompt appears only for ad clicks from the EU/EEA, UK or CH, based on the server-side IP country. It names Google Ads (H1/H2 closed). TR ad clicks get no prompt.
- Site copy says the checks are software-assisted. Migration 0019 is applied. The export is at `/admin/ads`, and `dv_paid` is 150 USD for TR clinics and 250 USD for all others.
- TR-4/DE-4 still land on `/tr` and `/de`. The comparison sitelinks point to the price-free guides. Both were interim fixes for B1. `/videos/*` now mounts `PriceRegion` in the repo, so the comparison pages can come back in month 2 after a check that they show TL/€.

### U9. Budget: TR $5 + DE $9 per day from day 1 (replaces U4's 7 + 7 and its week-2 reallocation)
- **Total unchanged.** The total is still $14/day. Google's monthly ceiling stays at 14 × 30.4 = $425.60, under the $450 hard cap.
- **Why.** TR is volume-limited: at $0.20–0.80 caps it is unlikely to spend $7/day, and unspent TR budget buys nothing. DE is the market that can spend.
- **No strong reason against it.** DE may be limited by rank rather than budget (red team M7), and the reversal rule below handles that.
- **Reversal (day 7 or later).** Go back to TR $7 / DE $7 if both of these hold:
  - DE averages < $6/day and its "Search lost IS (budget)" is < 10%, meaning it is rank-limited;
  - TR shows "Search lost IS (budget)" > 30%.
  Never raise the total in month 1.

### U10. Source of truth and reporting
- **Sign-ups, previews, checkouts and payments.** Read them from **`/admin/funnel` → Sources**. Filter to the date range and use the rows `google / cpc / tr-search-core` and `google / cpc / de-search-core`.
- **Spend and clicks.** Read them from Google Ads.
- **What Google's conversion columns are for.** Use them for bidding later, never for kill/scale calls. They lag by the weekly upload, and declined consent in DE/AT drops rows.
- **Brand reported separately.** Report brand ad groups (TR-0, DE-0) separately: subtract their spend and clicks before computing the non-brand rules below. People searching the brand name would mostly have come anyway.

### U11. Month-1 decision rules: leading metrics first (replaces U5's market-level 0-paid stops)

Market-level "0 paid" stops ($160 / $240) are **dropped**. At month-1 volumes they fire on noise: P(0 paid) ≈ 40% in DE even when the funnel works. The following rules decide instead. Check them on days 3, 7, 10, 14, 21 and 28.

| Metric (non-brand, per market) | Data | Rule |
|---|---|---|
| **Cost per sign-up** = non-brand spend ÷ funnel sign-ups | Google spend; `/admin/funnel` Sign-ups | After **≥ 80 non-brand clicks**: **> $40 → pause the market's campaign.** $20–40: hold, prune keywords. ≤ $20: healthy. |
| **Sign-up → preview completed** = Preview done ÷ Sign-ups | `/admin/funnel` | After **≥ 10 sign-ups**: **< 50% → onboarding problem.** Keep the budget flat (no scaling), fix onboarding first, re-check after 5 more sign-ups. |
| **Checkout opened** = Checkouts ÷ Sign-ups | `/admin/funnel` | **≥ 10 sign-ups and 0 Checkouts → pause the market** and fix the plan step or price before spending more. |

Unchanged:
- **Keyword and ad-group stops (U5).** Pause a keyword at $15 (TR) / $40 (DE) with 0 sign-ups. Pause an ad group at ≥ $50 with 0 sign-ups.
- **Program stop.** **$400 spent and 0 paid → stop all ads** (the only 0-paid stop left).
- **Scale (week 4, U5).** ≥ 3 paid at CAC ≤ $150 TR / $280 DE → +30% budget per week. Hold at 1–2 paid with CAC ≤ $200 TR / $400 DE.
- **Bid changes.** Raise a cap +20% only once, and only for an ad group with CTR ≥ 4% and lost IS (rank) > 50% (§7, week 2).

### U12. Conversion settings and upload cadence
- `dv_signup`: 5 USD fixed, Count = One, **click-through window 90 days**. That is 30 → 90 per red team M6, because the site records sign-ups up to 90 days after the click. `ADS_TRACKING.md` §2 still says 30; 90 is the intended setting.
- `dv_paid`: different values per conversion (150 TR / 250 elsewhere, from the CSV), default 250 USD, Count = One, window 90 days.
- **Upload cadence.** Upload from `/admin/ads` every Monday. Also upload **the same day** whenever `/admin/ads` shows a pending `dv_paid`, so a late payment is not lost to the 90-day cut-off.

### U13. Before the first euro is spent
- **Owner's real checkouts.** One TR-card checkout (2.490 TL) and one DE-card checkout (79 € + MwSt) at Dodo, both cancelled and refunded. They prove the currency rules and the `dv_paid` value (red team B3/B4); see LAUNCH.md.
- **Talk to the 5 non-payers (H4a).** This is the cheapest funnel research available, and it can run in parallel with week 1.

### U14. Build changes in this round
- **Red-team fixes.** The 87 red-team CSV fixes (`redteam/fixes-log.txt`) are now in `google-ads/build_csvs.py`. Regenerating reproduced the reviewed CSVs byte for byte. The `*.orig.csv` files were then removed.
- **Budgets.** `1-campaigns.csv`: tr-search-core 7.00 → **5.00**, de-search-core 7.00 → **9.00**.
- **H5 follow-through.** The red team missed six RSA cells that still claimed checking without the software qualifier. They now say so:
  - TR-3 D3 → "…metinleri yazılımla kontrol edilmiş."
  - TR-4 D1 → "Toplantı, brifing ve taahhüt yok. Her pazartesi 5 hazır video, yazılımla kontrol edilmiş."
  - DE-3 H10 → "Videos vorab softwaregeprüft"
  - DE-4 D1 → "Keine Laufzeit, keine Briefings. Jeden Montag fünf fertige, softwaregeprüfte Videos."
  - US-1/US-2 D2 → "Software checks every script for clinical accuracy and risky ad claims before you see it."
- **Validation.** `validate.py` passes: 0 errors, 0 warnings, and all 30 URL checks return 200.

---

## Güncelleme 2026-11-16 (3): new prices, EUR account, sitelinks

*Appended when the package moved to `docs/gtm/dentvideo/ads/`. Where this conflicts with anything above (U1, U2, U6, U8, U11's scale line, U12 and U13 included), this section wins. Sources: `web/src/lib/dentvid/pricing.ts`, `web/src/lib/dentvid/ad-conversions.ts`, `docs/ADS_TRACKING.md`, live dentvideo.com and llms.txt (fetched 2026-11-16), ECB reference rate of 2026-11-16 (1 EUR = 1.1014 USD, 55.502 TRY).*

### U15. Prices (live, from `pricing.ts`)
- **Starter $49 / €49 / 1.490 TL** and **Practice $79 / €79 / 2.490 TL** per month, tax extra, monthly, cancel anytime. Group: priced per location, by contact. No discounts, codes, yearly deals, free plan or trial.
- The ads now say "Aylık 1.490 TL'den Başlar", "Ab 49 € im Monat", "From $49 a Month" and "Starter … Practice …" with the prices above. `build_csvs.py` reads them from `pricing.ts`, and `validate.py` fails on any other price or on a "from" price that is not Starter's.
- The old figures ($79/$149, €79/€149, 2.490/4.490 TL) are retired. Practice now costs what Starter cost on 2026-11-15, so the U2 economics below replace U2.

### U16. Unit economics at the new prices (70/30 Starter/Practice mix, same method as §2/U2)

Gross profit = ARPU − payment fees (4% + $0.40, est.) − COGS $2. Target CAC = pessimistic GP-LTV (12% churn, 8.3 months) ÷ 3. Ceiling = base GP-LTV (8% churn, 12.5 months) ÷ 3, only once month-2 churn < 8%.

| | US/RoW | Euro area | Türkiye |
|---|---|---|---|
| Blended ARPU | $58.0 | €58 ≈ $63.9 | 1.790 TL ≈ $35.5 |
| Gross profit / month | $53.3 | $58.9 | $31.7 |
| **Target CAC** | **$145** | **$160** (≈ €145) | **$85** (≈ €77) |
| Ceiling | $220 | $245 (≈ €222) | $130 (≈ €118) |

Break-even CPC (target CAC × click→paid):

| click→signup × signup→paid | click→paid | US | DE/AT | TR |
|---|---|---|---|---|
| 3% × 8% | 0.24% | $0.36 | $0.39 | $0.21 |
| 5% × 15% | 0.75% | $1.11 | $1.23 | $0.66 |
| 8% × 20% | 1.6% | $2.37 | $2.62 | $1.41 |
| 10% × 25% | 2.5% | $3.70 | $4.10 | $2.20 |

What this changes:
- **TR** caps (€0.18–0.72) sit at or below break-even from the middle row up. Unchanged.
- **DE** caps (€1.08–2.26) are break-even only from the third row (click→paid ≥ 1.6%). They stay as **upper caps**, and LAUNCH.md step 15 still lowers each to Keyword Planner's low-range top-of-page bid. **Owner decision before launch:** keep DE-1/DE-2/DE-4 at €1.63/€1.63/€2.26, or lower them to about €1.10 (the 5% × 15% break-even). Lower caps mean fewer DE clicks in a month that is meant to measure conversion.
- **Scale (week 4, replaces U11's scale line):** ≥ 3 paid at CAC ≤ **$85 TR / $160 DE** → +30% budget per week. **Hold** at 1–2 paid with CAC ≤ **$130 TR / $245 DE**.
- Learning-budget stops (keyword, ad group, program, cost per sign-up) are unchanged in USD and are written in EUR in LAUNCH.md.

### U17. Account currency EUR, time zone Europe/Podgorica
- The business country is Montenegro, so the account is opened in **EUR** with time zone **(GMT+01:00) Podgorica** (or Belgrade/Budapest if Podgorica is not listed). Both cannot be changed later.
- `1-campaigns.csv` budgets: TR **€4.50**, DE **€8.00**, US €4.50 (the $5 / $9 / $5 of U9, converted and rounded down). Google's monthly ceiling: 12.50 × 30.4 = **€380**. Hard cap for month 1: **€400** (≈ $440), by prepayment or account budget.
- `3-adgroups.csv` Max CPCs are the U3 USD caps converted and rounded down (TR €0.18/0.63/0.63/0.36/0.72, DE €0.45/1.63/1.63/1.08/2.26, US €1.36).
- Ad schedules are in account time: TR **05:00–21:00** (Istanbul 07:00–23:00 in winter, 06:00–22:00 in summer), DE **07:00–22:00**.
- U9's reversal rule in EUR: go to TR €6.25 / DE €6.25 if DE averages < €5.50/day with lost IS (budget) < 10% and TR's lost IS (budget) > 30%. The total never exceeds €12.50/day in month 1.

### U18. Conversion values (code, replaces U6, U8 and U12)
- `dv_signup` = **5 USD** fixed. `dv_paid` = **100 USD for clinics in Türkiye, 150 USD elsewhere** (`paidConversionValue()` in `ad-conversions.ts`), one action with "different values per conversion", default **150 USD**. Both: Count = One, click-through window 90 days (ADS_TRACKING §2 says 90 too).
- Conversion currency stays USD; Google converts to the EUR account.
- Note for the code owner: the comment above `paidConversionValue(country)` in `ad-conversions-server.ts` still says "TR 150, elsewhere 250"; the code writes 100 / 150.

### U19. Sitelinks (replace U7's sitelink line and red team B1's interim guides)
- The `/videos/*` comparison pages now render every price as USD/EUR/TRY spans with the regional switch (checked in the HTML on 2026-11-16), so they can be sitelinks again. LAUNCH.md step 16 still asks for a look from a TR and a DE connection before launch.
- Six sitelinks per campaign, every URL 200 (validate.py):
  - **TR:** Örnek Videolar `/tr/examples` · Ücretsiz Reklam Kontrolü `/tr/ad-checker` · Ajans mı, DentVideo mu? `/videos/dentvideo-mu-ajans-mi` · Şablon mu, Hazır mı? `/videos/dentvideo-mu-canva-mi` · Video Hazırlamanın 5 Yolu `/videos/dis-klinigi-hasta-bilgilendirme-videosu-hazirlama-yollari` · Yardım Merkezi `/tr/help`
  - **DE:** Beispielvideos `/de/examples` · Kostenloser Werbe-Check `/de/ad-checker` · DentVideo oder Agentur? `/videos/dentvideo-oder-zahnarzt-marketing-agentur` · Vorlage oder fertig? `/videos/dentvideo-oder-canva-zahnarztpraxis` · Fünf Wege zum Video `/videos/zahnarzt-aufklaerungsvideos-erstellen-wege` · Hilfe-Center `/de/help`
  - **US (gated):** Example Videos · Free Ad Checker · DentVideo vs. an Agency `/videos/dentvideo-vs-dental-marketing-agency` · 5 Ways to Make Videos `/videos/ways-to-make-dental-patient-education-videos` · Guides for Clinics · Help Center `/help`
- No sitelink text names Canva or ChatGPT (red team M1 still applies); the Canva pages are labelled "template or ready-made".
- RSA final URLs are unchanged (TR-4 → `/tr`, DE-4 → `/de`). Moving them to the comparison pages is a month-2 test, not a launch change.

### U20. What was not changed
Keywords, negatives, callouts, snippets, ad-group structure and all non-price ad copy are as reviewed on 2026-11-15. Callouts and snippets carry no price. The "Sabit Aylık Ücret" line (red team M2) stays: at 1.490 TL Starter is under half of the cheapest agency quote cited there, but the ads still make no "fraction of an agency" claim.
