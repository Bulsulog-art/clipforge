# DentVideo — growth log

One entry per growth change: what shipped, why, what to watch. Newest first.

## 2026-11-09 — Owning "DentVideo" and the dental-video searches we can win

**Why.** The owner wants DentVideo first when people type "dent…/dental…". Google Suggest (≈130 seeds, 8 markets)
shows the head terms are patient searches (*dentist near me, dental insurance, dentolo, dentista…*) — not winnable or
useful. "dentvideo" has no suggestions and no strong incumbent, so the brand is ours to take; "dent video" (two words)
is shared with car dent-repair videos. Commercial demand exists for AI/patient/clinic video phrasings in every market.
Full map and outlook: `docs/SEO_PLAN.md` §9.

**What shipped** (branch `claude/seo-own-dental-video`)

- 12 commercial pages at `/videos/<slug>`, one product page per language + a fair comparison (DentVideo vs agency vs
  Canva vs ChatGPT) in en/de/es/tr, each with the three real sample videos, the checks, "what DentVideo does not do",
  FAQ and links to its guides:
  `/videos/ai-dental-video-maker`, `/videos/dentvideo-vs-agency-canva-chatgpt`, `/videos/zahnarztpraxis-videos-ki`,
  `/videos/dentvideo-agentur-canva-chatgpt`, `/videos/videos-dentales-con-ia`, `/videos/dentvideo-agencia-canva-chatgpt`,
  `/videos/dis-klinigi-sosyal-medya-videolari`, `/videos/dentvideo-ajans-canva-chatgpt`,
  `/videos/videos-traitements-cabinet-dentaire`, `/videos/shika-kanja-setsumei-doga`,
  `/videos/fidyohat-iyadat-al-asnan`, `/videos/filmy-marketing-stomatologiczny`.
- Brand entity: WebSite node (name DentVideo, alternateName "Dent Video") and one SoftwareApplication/Organization
  `@id` across landings, About, guides and the new pages; About pages retitled "What is DentVideo? …" in 8 languages
  with brand FAQ (price → pricing, sign-in, mobile app, reviews — honest: none yet); `SAME_AS` ready but empty.
- Internal links: every guide shows a descriptive link to its language's product page (agency/tool guides: the
  comparison, also linked inline); hubs, About pages and the footer link the commercial pages; footer "Sign in" link.
- Sitemap, hreflang (per page kind), llms.txt and llms-full.txt include the new pages. No new client JS: pages are
  server-rendered, videos `preload="none"`, the footer gets only paths and labels.
- Tests: `web/src/content/solutions/solutions.test.ts` (lengths, compliance words, prices, links, hreflang
  reciprocity, sitemap, JSON-LD, llms, header language) + no-free-trial scan of the new copy.

**Watch**

- GSC: position for "DentVideo" (target 1 within weeks of indexing), impressions per `/videos/…` page and query (§9.3).
- Native review before promoting ja/ar/pl pages; refresh the reviews FAQ once G2/Capterra/OMR reviews exist.
- Off-site (owner): `NEXT_PUBLIC_DENTVIDEO_URL`, GSC + Bing, IndexNow, LinkedIn/Crunchbase/Product Hunt/G2 profiles
  (then fill `SAME_AS`), trade-press links to the `/videos/…` pages. No Google Business Profile (not eligible).

## 2026-11-09 — First native guides for Japanese, Arabic and Polish; their guides hubs go live

**What shipped** (branch `claude/growth-ja-ar-pl`)

Six guides written natively (not translated), two per new market: one on the market's health-advertising rules for
clinic social media, one practical "what a dental clinic can post" guide (topics, formats, an approval workflow, a
pre-post checklist). Each has a quotable first paragraph, checklists, an FAQ, dated official sources and links to its
hub, the other guide and the landing/sign-up.

| Lang | Guide | URL |
| --- | --- | --- |
| ja | 医療広告ガイドラインと歯科医院のSNS | `/guides/iryo-kokoku-guideline-shika-sns` |
| ja | 歯科医院はSNSで何を投稿できるか | `/guides/shika-iin-sns-toko-naiyo` |
| ar | ضوابط الإعلان الصحي لعيادات الأسنان في الخليج | `/guides/dawabit-ilan-iyadat-al-asnan-al-khaleej` |
| ar | ماذا تنشر عيادة الأسنان على وسائل التواصل؟ | `/guides/madha-tanshur-iyadat-al-asnan` |
| pl | Reklama gabinetu stomatologicznego a Kodeks Etyki Lekarskiej | `/guides/reklama-gabinetu-stomatologicznego-kodeks-etyki` |
| pl | Co może publikować gabinet stomatologiczny w social mediach | `/guides/co-publikowac-gabinet-stomatologiczny` |

Hubs `/ja/guides`, `/ar/guides`, `/pl/guides` now exist (ja and ar in their own route folders for their web fonts; pl
through `[locale]/guides`). Because hub visibility follows `hasGuides()`, the header/footer "Guides" link, the mobile
menu, the landing's guides block, the sitemap (with hub hreflang across all eight languages), llms.txt and
llms-full.txt picked them up without special cases.

Rendering: guide pages now load Noto Sans JP / IBM Plex Sans Arabic (not preloaded, so other guides pay only for the
@font-face rules), set `dir="rtl"` on Arabic `<main>`, and mirror arrows and paddings. Guide share cards draw Japanese
titles in a Noto Sans JP subset; Arabic cards fall back to the wordless card, as the Arabic landing does (next/og
cannot shape Arabic). Word counts now segment Japanese with `Intl.Segmenter`, so the 900-word and intro-length tests
apply to Japanese too.

**Key regulatory points (verify on each refresh)**

- ja: MHLW 医療広告ガイドライン (last amended 2024-09-13 per MHLW) and the 事例解説書 第6版 (March 2026, with SNS/video
  examples). No article numbers quoted.
- ar: DHA social-media standards v1.1 (2022) + circular CIR-2026-00000144 (17 Aug 2026); DoH circular 26/2023; MOHAP
  social-media advertising licence; UAE Media Council advertiser permit (mandatory from 1 Feb 2026, reported);
  Saudi MOH on Article 10 of the Health Professions Practice Law and a June 2026 licence suspension. The Saudi executive
  regulations and the DoH guideline text were not read directly; the guides say so.
- pl: Kodeks Etyki Lekarskiej in force 1 Jan 2025, art. 71 (via NIL text + NIL commentary); art. 14 ust. 1 of the
  ustawa o działalności leczniczej (Dz.U. 2026 poz. 156) still says information by a healthcare provider may not have
  the features of advertising — the guide tells clinics to treat that as binding.

**Watch**

- GSC by folder `/ja`, `/ar`, `/pl` and the six slugs; request indexing of the three hubs; run `node scripts/indexnow.mjs`.
- Native review: a Japanese 歯科医師 or 医療広告 specialist, a UAE/KSA healthcare-compliance contact, a Polish
  izba-aware lawyer — before promoting these guides.
- Next: per-market topic guides (ja: 自由診療の限定解除; ar: DHA approval workflow; pl: opinie pacjentów / ZnanyLekarz).
