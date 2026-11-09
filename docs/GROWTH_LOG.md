# DentVideo — growth log

One entry per growth change: what shipped, why, what to watch. Newest first.

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
